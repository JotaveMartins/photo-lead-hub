import { cleanup, renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useDisconnectInstagram, useInstagramAccounts, useSchedulePost, useScheduledPosts } from "@/hooks/useSocial";

const mocks = vi.hoisted(() => ({ from: vi.fn(), effectiveUserId: vi.fn(() => "owner") }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/hooks/useEffectiveUserId", () => ({ useEffectiveUserId: mocks.effectiveUserId }));

let query: Record<string, ReturnType<typeof vi.fn>>;
let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  query = {};
  for (const method of ["select", "delete", "insert", "eq"]) query[method] = vi.fn(() => query);
  query.order = vi.fn().mockResolvedValue({ data: [], error: null });
  query.single = vi.fn().mockResolvedValue({ data: { id: "post" }, error: null });
  query.then = vi.fn((resolve) => Promise.resolve({ error: null }).then(resolve));
  mocks.from.mockReturnValue(query);
});
afterEach(() => { cleanup(); client.clear(); });

describe("social account persistence", () => {
  it("loads all profiles scoped to the effective user", async () => {
    query.order.mockResolvedValue({ data: [{ id: "a" }, { id: "b" }], error: null });
    const { result } = renderHook(() => useInstagramAccounts(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(mocks.from).toHaveBeenCalledWith("social_accounts");
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(query.eq).toHaveBeenCalledWith("provider", "instagram");
    expect(query.select.mock.calls[0][0]).not.toContain("access_token");
  });

  it("disconnects only the chosen profile, scoped to its owner and provider", async () => {
    const { result } = renderHook(() => useDisconnectInstagram(), { wrapper });
    await act(async () => { await result.current.mutateAsync("profile-b"); });
    expect(query.delete).toHaveBeenCalledOnce();
    expect(query.eq.mock.calls).toEqual([["id", "profile-b"], ["user_id", "owner"], ["provider", "instagram"]]);
  });

  it("persists the chosen destination with the scheduled post", async () => {
    const { result } = renderHook(() => useSchedulePost(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ carouselId: "carousel", socialAccountId: "profile-b", scheduledAt: "2099-12-25T13:30:00Z" });
    });
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "owner", carousel_id: "carousel", social_account_id: "profile-b" }));
  });

  it("loads the destination per post instead of labeling all posts with one profile", async () => {
    query.order.mockResolvedValue({ data: [{ id: "post", social_account_id: "profile-b", social_accounts: { username: "second" }, carousels: null }], error: null });
    const { result } = renderHook(() => useScheduledPosts(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]).toMatchObject({ social_account_id: "profile-b", accountUsername: "second" });
  });
});
