import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InboxAnalysisDialog from "@/components/chat/InboxAnalysisDialog";
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), download: vi.fn(), userId: "account-one" }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@/hooks/useEffectiveUserId", () => ({ useEffectiveUserId: () => mocks.userId }));
vi.mock("@/lib/inboxAnalysisPdf", () => ({ downloadInboxAnalysisPdf: mocks.download }));
const result = {
  report: {
    summary: "A cliente recebeu proposta.", stages: [{ title: "Acolhimento", observed: "Houve saudação", suggestedMessage: "Olá, [nome]!" }],
    strengths: ["Tom acolhedor"], improvements: ["Esclarecer valores"], limitations: ["Sem transcrição"],
    cases: [{ conversation: "Conversa 01", observed: "Cliente pediu preço", nextStep: "Esclarecer a proposta" }],
  },
  sample: { conversationCount: 1, messageCount: 5, untranscribedMediaCount: 1, entryMessage: "Olá, anúncio", generatedAt: "2026-10-29T15:00:00Z", contacts: [{ conversation: "Conversa 01", name: "Ana Teste", phone: "5511999990000" }] },
};
beforeEach(() => { vi.clearAllMocks(); mocks.userId = "account-one"; });
afterEach(cleanup);
const open = () => fireEvent.click(screen.getByRole("button", { name: "Análise de atendimento" }));

describe("Inbox analysis popup", () => {
  it("opens with an editable initial message and blocks empty requests", () => {
    render(<InboxAnalysisDialog />); open();
    expect(screen.getByLabelText("Primeira mensagem recebida")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Gerar análise" })).toBeDisabled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("sends the entered phrase and current account, previews identified contacts and downloads the result", async () => {
    mocks.invoke.mockResolvedValue({ data: result, error: null });
    render(<InboxAnalysisDialog initialMessage="Olá, anúncio" />); open();
    fireEvent.change(screen.getByLabelText("Primeira mensagem recebida"), { target: { value: " Mensagem da campanha " } });
    fireEvent.click(screen.getByRole("button", { name: "Gerar análise" }));
    await screen.findByText("Conversa 01: Ana Teste");
    expect(mocks.invoke).toHaveBeenCalledWith("analyze-inbox-service", { body: { entry_message: "Mensagem da campanha", target_user_id: "account-one" } });
    expect(screen.getByText("5511999990000")).toBeInTheDocument();
    expect(screen.getByText(/1 atendimentos e 5 mensagens/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Baixar PDF" }));
    await waitFor(() => expect(mocks.download).toHaveBeenCalledWith(result));
  });
  it("shows empty-sample errors without offering a PDF", async () => {
    mocks.invoke.mockResolvedValue({ error: { context: new Response(JSON.stringify({ error: "Nenhuma conversa começa com essa mensagem." }), { status: 404 }) } });
    render(<InboxAnalysisDialog initialMessage="Olá, anúncio" />); open();
    fireEvent.click(screen.getByRole("button", { name: "Gerar análise" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nenhuma conversa");
    expect(screen.queryByRole("button", { name: "Baixar PDF" })).not.toBeInTheDocument();
  });
  it("never shows a previous account's response after switching the current account", async () => {
    let finish: (value: unknown) => void;
    mocks.invoke.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { rerender } = render(<InboxAnalysisDialog initialMessage="Olá, anúncio" />); open();
    fireEvent.click(screen.getByRole("button", { name: "Gerar análise" }));
    mocks.userId = "account-two";
    rerender(<InboxAnalysisDialog initialMessage="Olá, anúncio" />);
    finish!({ data: result, error: null });
    await waitFor(() => expect(screen.getByRole("button", { name: "Gerar análise" })).toBeEnabled());
    expect(screen.queryByText("Conversa 01: Ana Teste")).not.toBeInTheDocument();
  });
});
