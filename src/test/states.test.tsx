import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

describe("ErrorState", () => {
  it("mostra título e chama retry", () => {
    const onRetry = vi.fn();
    render(<ErrorState title="Não foi possível carregar os clientes" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar os clientes");
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
  it("sem onRetry não mostra botão", () => {
    render(<ErrorState compact title="Erro" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("EmptyState", () => {
  it("não se apresenta como erro", () => {
    render(<EmptyState title="Nenhum cliente" />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Nenhum cliente")).toBeInTheDocument();
  });
});
