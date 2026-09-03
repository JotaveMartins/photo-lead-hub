import { useMemo } from "react";
import type { MetaAdsRow } from "@/hooks/useMetaAdsReport";

export interface RoasProfile {
  user_id: string;
  nome: string | null;
  created_at?: string | null;
  meta_ad_account_id?: string | null;
}

export interface RoasWonLead {
  user_id: string;
  valor: number | null;
  origem: string | null;
}

export interface ClientRoas {
  userId: string;
  nome: string;
  spend: number;
  receita: number;
  roas: number;
}

export interface PortfolioRoas {
  clientes: ClientRoas[];
  median: number | null;
  emImplantacao: number;
  semInvestimento: number;
}

export const isTrafegoPago = (origem: string | null | undefined) => {
  const o = (origem || "").toLowerCase();
  return o === "tráfego pago" || o === "trafego pago";
};

const bareAccount = (acc: string) => (acc.startsWith("act_") ? acc.slice(4) : acc);

const IMPLANTACAO_DAYS = 30;

export function computePortfolioRoas(
  rows: MetaAdsRow[],
  wonLeads: RoasWonLead[],
  profiles: RoasProfile[],
): PortfolioRoas {
  // ad_account_id (normalizado) -> user_id
  const accountToUser = new Map<string, string>();
  const profileById = new Map<string, RoasProfile>();
  for (const p of profiles) {
    profileById.set(p.user_id, p);
    const acc = p.meta_ad_account_id;
    if (acc) accountToUser.set(bareAccount(acc), p.user_id);
  }

  const spendByUser = new Map<string, number>();
  for (const r of rows) {
    const userId = r.client_id || (r.ad_account_id ? accountToUser.get(bareAccount(r.ad_account_id)) : undefined);
    if (!userId) continue;
    spendByUser.set(userId, (spendByUser.get(userId) || 0) + Number(r.spend || 0));
  }

  const receitaByUser = new Map<string, number>();
  for (const l of wonLeads) {
    if (!isTrafegoPago(l.origem)) continue;
    if (!l.user_id) continue;
    receitaByUser.set(l.user_id, (receitaByUser.get(l.user_id) || 0) + (l.valor || 0));
  }

  const now = Date.now();
  const clientes: ClientRoas[] = [];
  let emImplantacao = 0;
  let semInvestimento = 0;

  for (const [userId, spend] of spendByUser) {
    if (spend <= 0) {
      semInvestimento++;
      continue;
    }
    const prof = profileById.get(userId);
    const createdAt = prof?.created_at ? new Date(prof.created_at).getTime() : null;
    if (createdAt && (now - createdAt) / 86400000 < IMPLANTACAO_DAYS) {
      emImplantacao++;
      continue;
    }
    const receita = receitaByUser.get(userId) || 0;
    clientes.push({
      userId,
      nome: prof?.nome || "Cliente sem nome",
      spend,
      receita,
      roas: receita / spend,
    });
  }

  clientes.sort((a, b) => b.roas - a.roas);

  let median: number | null = null;
  if (clientes.length > 0) {
    const sorted = clientes.map((c) => c.roas).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return { clientes, median, emImplantacao, semInvestimento };
}

export function usePortfolioRoas(
  rows: MetaAdsRow[],
  wonLeads: RoasWonLead[],
  profiles: RoasProfile[],
): PortfolioRoas {
  return useMemo(() => computePortfolioRoas(rows, wonLeads, profiles), [rows, wonLeads, profiles]);
}
