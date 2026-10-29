import { describe, expect, it, vi } from "vitest";
import { prepareSample, validateReport, type SampleConversation } from "../../supabase/functions/analyze-inbox-service/report";
import { createInboxAnalysisPdf } from "@/lib/inboxAnalysisPdf";
import { readFileSync, writeFileSync } from "node:fs";

export const fixtureReport = () => ({
  summary: "Apresentação e qualificação observadas. Fechamento não comprovado.",
  stages: [1, 2, 3].map((index) => ({ title: `Etapa ${index}`, observed: "Cliente perguntou valores.", suggestedMessage: "Olá, [nome]! Vou explicar as opções." })),
  strengths: ["Pergunta de qualificação."], improvements: ["Responder valores diretamente."],
  limitations: ["Áudio sem transcrição não foi interpretado."],
  cases: [{ conversation: "Conversa 01", observed: "Contato recebeu proposta e ainda não respondeu.", nextStep: "Perguntar se ficou alguma dúvida." }],
});
const sample: SampleConversation[] = [{
  contact_name: "Cliente de teste", contact_number: "5511999990000", started_at: "2026-10-01T10:00:00Z",
  messages: [
    { body: "Olá, vim pelo anúncio", direction: "inbound", type: "text", sent_at: "2026-10-01T10:00:00Z" },
    { body: null, direction: "outbound", type: "audio", sent_at: "2026-10-02T10:00:00Z" },
    { body: "Segue https://example.test/assinatura/privada", direction: "outbound", type: "text", sent_at: "2026-10-02T10:00:00Z" },
  ],
}];

describe("Inbox service analysis", () => {
  it("preserves requested identities and labels unavailable media without inventing content", () => {
    const data = prepareSample(sample);
    expect(data[0]).toMatchObject({ conversation: "Conversa 01", name: "Cliente de teste", phone: "5511999990000" });
    expect(data[0].messages[1]).toMatchObject({ author: "Atendimento", type: "audio", text: "[audio: conteúdo não transcrito]", day: 2 });
    expect(data[0].messages[2].text).toBe("Segue [link omitido]");
  });
  it("validates complete evidence references and removes em dashes", () => {
    const report = fixtureReport(); report.summary = "Resumo — sem fechamento confirmado";
    expect(validateReport(report, ["Conversa 01"]).summary).toBe("Resumo ,  sem fechamento confirmado");
    expect(() => validateReport({ ...report, cases: [] }, ["Conversa 01"])).toThrow();
    expect(() => validateReport({ ...report, cases: [{ ...report.cases[0], conversation: "Conversa 99" }] }, ["Conversa 01"])).toThrow();
    expect(() => validateReport({ ...report, stages: [] }, ["Conversa 01"])).toThrow();
    expect(() => validateReport({ ...report, cases: [report.cases[0], report.cases[0]] }, ["Conversa 01", "Conversa 02"])).toThrow();
  });
  it("creates a real multi-page PDF, including script and identified cases", async () => {
    const fetchFont = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const face = String(url).includes("Bold") ? "DejaVuSans-Bold-Latin.ttf" : "DejaVuSans-Latin.ttf";
      return new Response(readFileSync(`src/assets/fonts/${face}`));
    });
    const doc = await createInboxAnalysisPdf({ report: fixtureReport(), sample: {
      conversationCount: 1, messageCount: 3, untranscribedMediaCount: 1,
      entryMessage: "Olá! Vim pelo anúncio.", generatedAt: "2026-10-29T15:00:00Z",
      contacts: [{ conversation: "Conversa 01", name: "Cliente de teste", phone: "5511999990000" }],
    } });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(4);
    const bytes = new Uint8Array(doc.output("arraybuffer"));
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    writeFileSync("/tmp/inbox-analysis-test.pdf", bytes);
    fetchFont.mockRestore();
  });
});
