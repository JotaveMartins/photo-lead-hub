import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { InstagramAccount } from "@/hooks/useSocial";
import { canPublishToInstagram, selectedInstagramAccount } from "@/lib/instagramAccounts";
import ScheduleModal from "@/components/studio/ScheduleModal";

vi.mock("@/components/DatePickerField", () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) =>
    <input aria-label="Data" value={value} onChange={(event) => onChange(event.target.value)} />,
}));
vi.mock("@/components/TimePickerField", () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) =>
    <input aria-label="Horário" value={value} onChange={(event) => onChange(event.target.value)} />,
}));

const profile = (id: string, extra: Partial<InstagramAccount> = {}): InstagramAccount => ({
  id, username: id, instagram_user_id: `ig-${id}`, profile_picture_url: null,
  token_expires_at: null, status: "connected", created_at: "2026-01-01", ...extra,
});
const accounts = [profile("studio"), profile("pessoal")];

afterEach(cleanup);

function Publication({ profiles = accounts, onConfirm = vi.fn(), busyLabel = null, accountsError = false }: {
  profiles?: InstagramAccount[];
  onConfirm?: ReturnType<typeof vi.fn>;
  busyLabel?: string | null;
  accountsError?: boolean;
}) {
  const [selectedAccountId, setSelectedAccountId] = useState("");
  return <ScheduleModal open onClose={vi.fn()} accounts={profiles} selectedAccountId={selectedAccountId}
    onAccountChange={setSelectedAccountId} onConfirm={onConfirm} slideCount={3} caption="Minha publicação"
    initialDate="2099-12-25" initialTime="10:30" busyLabel={busyLabel} accountsError={accountsError} />;
}

describe("Instagram profile selection", () => {
  it("keeps the single-profile workflow, but requires a choice with multiple profiles", () => {
    expect(selectedInstagramAccount([accounts[0]], "")?.id).toBe("studio");
    expect(selectedInstagramAccount(accounts, "")).toBeNull();
    expect(selectedInstagramAccount(accounts, "pessoal")?.id).toBe("pessoal");
  });

  it("does not switch destinations when a selected profile is disconnected", () => {
    expect(selectedInstagramAccount([accounts[0]], "pessoal")).toBeNull();
  });

  it("rejects expired, invalid and disconnected tokens", () => {
    expect(canPublishToInstagram(profile("expired", { token_expires_at: "2000-01-01" }))).toBe(false);
    expect(canPublishToInstagram(profile("invalid", { token_expires_at: "invalid" }))).toBe(false);
    expect(canPublishToInstagram(profile("offline", { status: "disconnected" }))).toBe(false);
  });

  it("publishes immediately to the chosen profile and can switch to another", () => {
    const onConfirm = vi.fn();
    render(<Publication onConfirm={onConfirm} />);
    const publish = screen.getByRole("button", { name: "Publicar no Instagram" });
    expect(publish).toBeDisabled();
    expect(screen.getByRole("button", { name: "Agendar publicação" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Perfil do Instagram"), { target: { value: "pessoal" } });
    fireEvent.click(publish);
    expect(onConfirm).toHaveBeenLastCalledWith("now", null, "pessoal");
    fireEvent.change(screen.getByLabelText("Perfil do Instagram"), { target: { value: "studio" } });
    fireEvent.click(publish);
    expect(onConfirm).toHaveBeenLastCalledWith("now", null, "studio");
  });

  it("passes the chosen profile and date when scheduling", () => {
    const onConfirm = vi.fn();
    render(<Publication onConfirm={onConfirm} />);
    fireEvent.change(screen.getByLabelText("Perfil do Instagram"), { target: { value: "pessoal" } });
    fireEvent.click(screen.getByRole("button", { name: "Agendar publicação" }));
    expect(onConfirm).toHaveBeenCalledWith("schedule", new Date("2099-12-25T10:30:00").toISOString(), "pessoal");
  });

  it("keeps publication blocked when no profile exists", () => {
    render(<Publication profiles={[]} />);
    expect(screen.getByLabelText("Perfil do Instagram")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Publicar no Instagram" })).toBeDisabled();
  });

  it("disables expired profiles and defaults to the only usable profile", () => {
    render(<Publication profiles={[accounts[0], profile("expired", { token_expires_at: "2000-01-01" })]} />);
    expect(screen.getByLabelText("Perfil do Instagram")).toHaveValue("studio");
    expect(screen.getByRole("option", { name: /@expired/ })).toBeDisabled();
  });

  it("locks the destination while publishing and blocks stale data after query errors", () => {
    const { rerender } = render(<Publication profiles={[accounts[0]]} busyLabel="publicando" />);
    expect(screen.getByLabelText("Perfil do Instagram")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Publicar no Instagram" })).toBeDisabled();
    rerender(<Publication profiles={[accounts[0]]} accountsError />);
    expect(screen.getByRole("button", { name: "Publicar no Instagram" })).toBeDisabled();
  });
});
