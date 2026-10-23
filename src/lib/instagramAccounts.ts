import type { InstagramAccount } from "@/hooks/useSocial";

export const canPublishToInstagram = (account: InstagramAccount, now = Date.now()) =>
  account.status === "connected" &&
  (!account.token_expires_at || new Date(account.token_expires_at).getTime() > now);

// Auto-select only when there is one usable profile. Never silently replace a
// selected profile that disappeared or expired with a different destination.
export const selectedInstagramAccount = (
  accounts: InstagramAccount[],
  selectedId: string,
) => {
  if (selectedId) return accounts.find((account) => account.id === selectedId) ?? null;
  const usable = accounts.filter((account) => canPublishToInstagram(account));
  return usable.length === 1 ? usable[0] : null;
};
