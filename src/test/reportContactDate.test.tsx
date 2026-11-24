import { afterEach, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ReportDrillDown from "@/components/reports/ReportDrillDown";
import type { Tables } from "@/integrations/supabase/types";
afterEach(cleanup);
it("mostra a data de contato como dia de calendário, inclusive no fuso de São Paulo", () => {
  const lead = { id: "fixture", nome: "Lead teste", valor: 0, data_contato: "2026-11-17", origem: "Tráfego Pago" } as Tables<"leads">;
  render(<MemoryRouter><ReportDrillDown open onOpenChange={() => {}} title="Leads criados" leads={[lead]} dateField="data_contato" dateLabel="Contato" /></MemoryRouter>);
  expect(screen.getByText("Contato: 17/11/2026")).toBeInTheDocument();
});
