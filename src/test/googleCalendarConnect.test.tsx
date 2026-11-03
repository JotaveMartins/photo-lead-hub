import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useConnectGoogleCalendar } from "@/hooks/useGoogleCalendar";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@/hooks/useEffectiveUserId", () => ({ useEffectiveUserId: () => "owner" }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
let client: QueryClient;
const oldClosed = Object.getOwnPropertyDescriptor(window, "closed");
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  mocks.invoke.mockResolvedValue({ data: { authUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=test" }, error: null });
  vi.spyOn(window, "open").mockReturnValue(window);
  Object.defineProperty(window, "closed", { configurable: true, value: false });
});
afterEach(() => {
  cleanup(); client.clear(); vi.useRealTimers(); vi.restoreAllMocks();
  if (oldClosed) Object.defineProperty(window, "closed", oldClosed); else Reflect.deleteProperty(window, "closed");
});
const message = (origin: string, source: Window | null, success: unknown, reason?: string) => window.dispatchEvent(new MessageEvent("message", {
  origin, source, data: { type: "google-calendar-auth", success, reason },
}));

describe("Google Calendar popup result", () => {
  it("accepts only the opened popup on the CRM origin with a boolean result", async () => {
    const { result } = renderHook(() => useConnectGoogleCalendar(), { wrapper });
    await act(async () => { result.current.mutate(); });
    expect(window.open).toHaveBeenCalledOnce();
    await act(async () => {
      message("https://untrusted.example.test", window, true);
      message(window.location.origin, null, true);
      message(window.location.origin, window, "true");
    });
    expect(mocks.success).not.toHaveBeenCalled();
    await act(async () => { message(window.location.origin, window, true); });
    expect(mocks.success).toHaveBeenCalledWith("Google Agenda conectado!");
  });
  it("does not claim a connection succeeded when the user merely closes the popup", async () => {
    const { result } = renderHook(() => useConnectGoogleCalendar(), { wrapper });
    await act(async () => { result.current.mutate(); });
    Object.defineProperty(window, "closed", { configurable: true, value: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(result.current.data).toBe(false);
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled();
  });
  it("shows a readable failure from the completion page", async () => {
    const { result } = renderHook(() => useConnectGoogleCalendar(), { wrapper });
    await act(async () => { result.current.mutate(); });
    await act(async () => { message(window.location.origin, window, false, "denied"); });
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("autorização foi cancelada ou recusada"));
    expect(mocks.success).not.toHaveBeenCalled();
  });
});
