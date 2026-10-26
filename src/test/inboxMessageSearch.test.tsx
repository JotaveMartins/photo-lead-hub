import { cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { buildInboxMessageMatches } from "@/lib/inboxMessageSearch";
import InboxConversationDate from "@/components/chat/InboxConversationDate";
import { useInboxMessageSearch } from "@/hooks/useInbox";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/hooks/useEffectiveUserId", () => ({ useEffectiveUserId: () => "owner" }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const date = (day: number, hour = 14) => new Date(2026, 9, day, hour, 35).toISOString();
const message = (extra = {}) => ({
  conversation_id: "chat", body: "Olá, vim pelo anúncio", timestamp: date(23), created_at: date(26), ...extra,
});

describe("Inbox search message dates", () => {
  it("shows the original message date even if the conversation was updated later", () => {
    const matches = buildInboxMessageMatches([message()]);
    render(<InboxConversationDate updatedAt={date(26)} match={matches.get("chat")} />);
    const time = screen.getByText("23/10/2026 14:35");
    expect(time).toHaveAttribute("datetime", date(23));
    expect(time).toHaveAttribute("title", "Mensagem encontrada em 23/10/2026 14:35");
  });

  it("keeps the snippet paired with the most recently sent matching message", () => {
    // An old WhatsApp message imported today must not replace yesterday's match.
    const matches = buildInboxMessageMatches([
      message({ timestamp: date(20), created_at: date(26), body: "Olá, vim pelo anúncio antigo" }),
      message({ timestamp: date(25), created_at: date(25), body: "Olá, vim pelo anúncio novo" }),
      message({ timestamp: date(22), created_at: date(24) }),
    ]);
    expect(matches.size).toBe(1);
    expect(matches.get("chat")).toEqual({ sentAt: date(25), body: "Olá, vim pelo anúncio novo" });
  });

  it("uses message creation time when the original timestamp is missing", () => {
    const matches = buildInboxMessageMatches([message({ timestamp: null, created_at: date(24, 9) })]);
    render(<InboxConversationDate updatedAt={date(26)} match={matches.get("chat")} />);
    expect(screen.getByText("24/10/2026 09:35")).toHaveAttribute("datetime", date(24, 9));
  });

  it("retains the ordinary conversation date when there is no matching message", () => {
    const timestamp = new Date(2001, 0, 2, 10, 30).toISOString();
    render(<InboxConversationDate updatedAt={timestamp} />);
    expect(screen.getByText("02/01")).toHaveAttribute("title", "Última atividade em 02/01/2001 10:30");
  });

  it("keeps separate matches for distinct chats and ignores rows without content", () => {
    const matches = buildInboxMessageMatches([
      message(), message({ conversation_id: "other", timestamp: date(25) }),
      message({ conversation_id: null }), message({ conversation_id: "empty", body: null }),
    ]);
    expect([...matches.keys()]).toEqual(["chat", "other"]);
    expect(matches.get("other")?.sentAt).toBe(date(25));
  });

  it("loads timestamps and bodies together, scoped to the current account", async () => {
    const query = {
      select: vi.fn(() => query), eq: vi.fn(() => query), ilike: vi.fn(() => query), order: vi.fn(() => query),
      limit: vi.fn().mockResolvedValue({ data: [message()], error: null }),
    };
    mocks.from.mockReturnValue(query);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useInboxMessageSearch("Olá, vim pelo anúncio"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(query.select).toHaveBeenCalledWith("conversation_id, body, timestamp, created_at");
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(query.ilike).toHaveBeenCalledWith("body", "%Olá, vim pelo anúncio%");
    expect(result.current.data?.get("chat")).toEqual({ body: "Olá, vim pelo anúncio", sentAt: date(23) });
    client.clear();
  });
});
