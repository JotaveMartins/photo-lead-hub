import { renderHook, act, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ReactNode } from "react";
import { useCreateProject, useSaveCarousel, useUploadPhotos } from "@/hooks/useStudio";
import { useSchedulePost } from "@/hooks/useSocial";

const state = vi.hoisted(() => ({ owner: "renato" as string | null, inserts: [] as { table: string; value: any }[], filters: [] as [string,string,unknown][], invalidParent: false, paths: [] as string[] }));
vi.mock("@/hooks/useEffectiveUserId", () => ({ useEffectiveUserId: () => state.owner }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "avanzo" } }) }));
vi.mock("@/lib/imageOptimize", () => ({ optimizeImageFile: async (file: File) => ({ file, width: 100, height: 150 }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const q: any = {
      select: () => q, eq: (column: string, value: unknown) => { state.filters.push([table,column,value]); return q; },
      insert: (value: any) => { state.inserts.push({ table, value }); return q; }, update: () => q, delete: () => q,
      single: async () => state.invalidParent && ["projects","carousels","social_accounts"].includes(table)
        ? { data: null, error: { message: "not found" } } : { data: { id: table === "carousels" ? "carousel" : table === "carousel_slides" ? "slide" : "project" }, error: null },
      then: (resolve: (value: unknown) => void) => Promise.resolve(resolve({ error: null })),
    }; return q;
  },
  storage: { from: () => ({ upload: async (path: string) => { state.paths.push(path); return { error: null }; } }) },
} }));
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{children}</QueryClientProvider>;
beforeEach(() => { state.owner = "renato"; state.inserts = []; state.filters = []; state.invalidParent = false; state.paths = []; });
afterEach(cleanup);
describe("Studio uses the selected client's ownership", () => {
  it("creates a project for Renato while Avanzo is logged in", async () => {
    const { result } = renderHook(useCreateProject, { wrapper });
    await act(async () => { await result.current.mutateAsync({ nome: "Ensaio", tipo_ensaio: "Casamento", descricao: "" }); });
    expect(state.inserts[0].value.user_id).toBe("renato");
  });
  it("keeps direct account access working", async () => {
    state.owner = "avanzo";
    const { result } = renderHook(useCreateProject, { wrapper });
    await act(async () => { await result.current.mutateAsync({ nome: "Próprio", tipo_ensaio: "Outro", descricao: "" }); });
    expect(state.inserts[0].value.user_id).toBe("avanzo");
  });
  it("does not silently fall back to the logged-in admin if there is no selected owner", async () => {
    state.owner = null;
    const { result } = renderHook(useCreateProject, { wrapper });
    await act(async () => { await expect(result.current.mutateAsync({ nome: "Ensaio", tipo_ensaio: "Outro", descricao: "" })).rejects.toThrow("Conta não identificada"); });
    expect(state.inserts).toHaveLength(0);
  });
  it("stores carousel, slides and photo links under the client", async () => {
    const { result } = renderHook(() => useSaveCarousel("project"), { wrapper });
    await act(async () => { await result.current.mutateAsync({ legenda: "Legenda", status: "aprovado", slides: [{ key: "one", layout: "single_full", photoIds: ["photo"] }] }); });
    expect(state.inserts.map(r => r.table)).toEqual(["carousels","carousel_slides","slide_photos"]);
    expect(state.inserts.every(r => (Array.isArray(r.value) ? r.value : [r.value]).every((v: any) => v.user_id === "renato"))).toBe(true);
    expect(state.filters).toContainEqual(["projects","user_id","renato"]);
  });
  it("rejects saving against a project outside the selected account", async () => {
    state.invalidParent = true;
    const { result } = renderHook(() => useSaveCarousel("wrong-project"), { wrapper });
    await act(async () => { await expect(result.current.mutateAsync({ legenda: "", status: "rascunho", slides: [] })).rejects.toThrow("não pertence"); });
    expect(state.inserts).toHaveLength(0);
  });
  it("uploads files into the client folder and saves matching photo ownership", async () => {
    const { result } = renderHook(() => useUploadPhotos("project"), { wrapper });
    await act(async () => { await result.current.mutateAsync({ files: [new File(["synthetic"], "foto.jpg", { type: "image/jpeg" })] }); });
    expect(state.paths[0]).toMatch(/^renato\/project\//);
    expect(state.inserts.find(r => r.table === "photos")?.value.user_id).toBe("renato");
  });
  it("does not upload before confirming project ownership", async () => {
    state.invalidParent = true;
    const { result } = renderHook(() => useUploadPhotos("wrong-project"), { wrapper });
    await act(async () => { await expect(result.current.mutateAsync({ files: [new File(["synthetic"], "foto.jpg")] })).rejects.toThrow("não pertence"); });
    expect(state.paths).toHaveLength(0);
  });
  it("refuses to schedule mismatched carousel/account ownership", async () => {
    state.invalidParent = true;
    const { result } = renderHook(useSchedulePost, { wrapper });
    await act(async () => { await expect(result.current.mutateAsync({ carouselId: "carousel", socialAccountId: "instagram", scheduledAt: "2026-12-01T10:00:00Z" })).rejects.toThrow("precisam pertencer"); });
    expect(state.inserts).toHaveLength(0);
  });
});
