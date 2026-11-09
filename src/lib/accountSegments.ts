import type { AccountAccess } from "@/lib/accountAccess";

export type AccountSegment = "customers" | "trials" | "internal" | "unclassified";
export type UsagePopulation = "customers" | "trials";
export interface AccountDescriptor {
  userId: string;
  segment: AccountSegment;
  access: AccountAccess | null;
  blocked: boolean;
  basic: boolean;
  createdAt: string | null;
  adAccountId?: string | null;
}
export const accountSegmentLabel = (segment: AccountSegment) => ({ customers: "Cliente", trials: "Teste grátis", internal: "Conta interna", unclassified: "Não classificada" })[segment];

/** Membership is explicit, never inferred from names, email or usage volume. */
export const describeAccount = (input: {
  userId: string; access?: AccountAccess | null; blocked?: boolean | null;
  basic?: boolean | null; tester?: boolean; createdAt?: string | null; adAccountId?: string | null;
}): AccountDescriptor => {
  const access = input.access ?? null;
  const segment: AccountSegment = access?.status === "admin" || input.tester ? "internal"
    : access?.mode === "trial" ? "trials"
    : access?.mode === "legacy" || access?.mode === "manual" ? "customers" : "unclassified";
  return { userId: input.userId, access, segment, blocked: input.blocked === true || access?.status === "blocked",
    basic: input.basic === true, createdAt: input.createdAt ?? null, adAccountId: input.adAccountId ?? null };
};
export const isActiveCustomer = (account: AccountDescriptor) => account.segment === "customers" && !account.blocked && account.access?.allowed === true;
/** Trial analysis includes expired/pending trials for follow-up, never blocked ones. */
export const inUsagePopulation = (account: AccountDescriptor, population: UsagePopulation) =>
  !account.blocked && !account.basic && (population === "customers" ? isActiveCustomer(account) : account.segment === "trials");
export const existedInUsageMonth = (account: AccountDescriptor, month: Date) =>
  !!account.createdAt && Date.parse(account.createdAt) < Date.UTC(month.getFullYear(), month.getMonth() + 1, 1);

export type DirectorySegment = AccountSegment | "all";
export type DirectoryStatus = "active" | "all" | "blocked" | "expired" | "pending_confirmation";
export const directoryMatches = (account: AccountDescriptor, filter: { segment: DirectorySegment; status: DirectoryStatus }) => {
  if (filter.segment !== "all" && account.segment !== filter.segment) return false;
  if (filter.status === "all") return true;
  if (filter.status === "blocked") return account.blocked;
  if (account.blocked) return false;
  if (filter.status === "active") return account.access?.allowed === true;
  return account.access?.status === filter.status;
};
export const directorySearchMatches = (row: { nome?: string | null; email?: string | null }, term: string) => {
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return normalize(`${row.nome ?? ""} ${row.email ?? ""}`).includes(normalize(term));
};

/** Unlinked ad rows can be attributed only through an unambiguous profile mapping. */
export const customerAdAccountIds = (accounts: Iterable<AccountDescriptor>): string[] => {
  const owners = new Map<string, Set<string>>();
  const active = new Set<string>();
  for (const account of accounts) {
    if (isActiveCustomer(account)) active.add(account.userId);
    const id = account.adAccountId?.trim().replace(/^act_/, "");
    if (!id) continue;
    const users = owners.get(id) ?? new Set<string>(); users.add(account.userId); owners.set(id, users);
  }
  return [...owners].filter(([, users]) => users.size === 1 && active.has([...users][0])).flatMap(([id]) => [id, `act_${id}`]).sort();
};
