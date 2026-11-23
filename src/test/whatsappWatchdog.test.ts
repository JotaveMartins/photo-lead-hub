import { describe, expect, it } from "vitest";
import {
  WATCHDOG, decideAction, diagnose, filterWatchedInstances, isSilenceWindowInBusinessHours, nextState,
} from "../../supabase/functions/_shared/whatsapp-watchdog";

// 15:00 em Brasília (UTC-3)
const now = new Date("2026-11-23T18:00:00Z");
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
const msg = (savedMinAgo: number, lagMin: number) => ({
  saved_at: minutesAgo(savedMinAgo), sent_at: minutesAgo(savedMinAgo + lagMin), direction: "inbound",
});

describe("Vigia do WhatsApp — detecção", () => {
  it("3 mensagens chegando mais de 15 min atrasadas na última hora = atrasado", () => {
    const d = diagnose({ providerState: "open", recent: [msg(5, 16), msg(10, 120), msg(20, 600)], inbound7d: null }, now);
    expect(d.status).toBe("delayed");
  });
  it("mensagens com até 15 min de atraso não disparam nada", () => {
    const d = diagnose({ providerState: "open", recent: [msg(5, 15), msg(10, 15), msg(20, 15)], inbound7d: null }, now);
    expect(d.status).toBe("ok");
  });
  it("só 2 mensagens atrasadas não bastam", () => {
    expect(diagnose({ providerState: "open", recent: [msg(5, 60), msg(10, 60)], inbound7d: null }, now).status).toBe("ok");
  });
  it("atrasos de mais de 1 hora atrás não contam", () => {
    expect(diagnose({ providerState: "open", recent: [msg(70, 60), msg(80, 60), msg(90, 60)], inbound7d: null }, now).status).toBe("ok");
  });
  it("conta com média de 30 recebidas/dia e 3 h sem nada no horário comercial = silenciosa", () => {
    expect(diagnose({ providerState: "open", recent: [], inbound7d: 210 }, now).status).toBe("silent");
    expect(diagnose({ providerState: "open", recent: [], inbound7d: 209 }, now).status).toBe("ok");
  });
  it("silêncio só é avaliado entre 12:00 e 22:00 de Brasília (janela de 3 h a partir das 09:00)", () => {
    expect(isSilenceWindowInBusinessHours(new Date("2026-11-23T14:59:00Z"))).toBe(false); // 11:59
    expect(isSilenceWindowInBusinessHours(new Date("2026-11-23T15:00:00Z"))).toBe(true); // 12:00
    expect(isSilenceWindowInBusinessHours(new Date("2026-11-24T01:00:00Z"))).toBe(false); // 22:00
  });
  it("servidor informando sessão diferente de aberta = sessão fechada", () => {
    expect(diagnose({ providerState: "close", recent: [], inbound7d: null }, now).status).toBe("closed");
  });
});

describe("Vigia do WhatsApp — ações", () => {
  const delayed = { status: "delayed" as const, reason: "x", lagSeconds: 3600 };
  it("conta em dia não é reiniciada", () => {
    expect(decideAction({ status: "ok", reason: null, lagSeconds: 1 }, { restarts: [] }, now)).toBe("none");
  });
  it("reinicia no primeiro problema", () => {
    expect(decideAction(delayed, { restarts: [] }, now)).toBe("restart");
  });
  it("espera 45 min entre reinícios da mesma conta", () => {
    expect(WATCHDOG.COOLDOWN_MINUTES).toBe(45);
    expect(decideAction(delayed, { restarts: [minutesAgo(44)] }, now)).toBe("wait");
    expect(decideAction(delayed, { restarts: [minutesAgo(46)] }, now)).toBe("restart");
  });
  it("após 6 reinícios em 24 h marca para reconectar por QR Code", () => {
    const six = [1, 2, 3, 4, 5, 6].map((h) => minutesAgo(h * 60));
    expect(decideAction(delayed, { restarts: six }, now)).toBe("flag");
    const st = nextState(undefined, delayed, "flag", false, now);
    expect(st.needs_reconnect).toBe(true);
  });
  it("reinícios com mais de 24 h são esquecidos e o aviso some quando volta ao normal", () => {
    const prev = { restarts: [minutesAgo(25 * 60)], needs_reconnect: true, status: "delayed" as const, reason: "x", lag_seconds: 1, checked_at: null };
    const st = nextState(prev, { status: "ok", reason: null, lagSeconds: 1 }, "none", false, now);
    expect(st.restarts).toEqual([]);
    expect(st.needs_reconnect).toBe(false);
  });
});

describe("Vigia do WhatsApp — contas inativas", () => {
  it("ignora conexões de contas bloqueadas ou sem acesso ativo", () => {
    const list = [
      { id: "a", user_id: "ativo" },
      { id: "b", user_id: "bloqueado" },
      { id: "c", user_id: null },
    ];
    expect(filterWatchedInstances(list, new Set(["ativo"])).map((i) => i.id)).toEqual(["a"]);
  });
});
