import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { useServices } from "@/hooks/useServices";
import { usePackages } from "@/hooks/usePackages";
import ServiceModal from "@/components/ServiceModal";
import PackageModal from "@/components/PackageModal";
import { Plus } from "lucide-react";

/**
 * Seletor único de Serviço/Pacote usado na criação e edição de cobranças.
 * Retorna tipo + id + nome + preço. A descrição/valor da cobrança são snapshots
 * e não dependem do item após a criação.
 *
 * Componente especializado oficial (ver README-padroes.md): grupos, preço,
 * criação rápida e fallback de item arquivado não cabem no SearchSelect.
 */
export type CobrancaItemType = "service" | "package";
export interface CobrancaItem {
  type: CobrancaItemType;
  id: string;
  name: string;
  price: number;
}

interface CobrancaItemSelectorProps {
  serviceId: string | null;
  packageId: string | null;
  /** Nome exibido caso o item não esteja mais na lista (ex.: arquivado). */
  fallbackName?: string;
  onSelect: (item: CobrancaItem) => void;
  onClear: () => void;
}

const CobrancaItemSelector = ({ serviceId, packageId, fallbackName, onSelect, onClear }: CobrancaItemSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const { data: services = [] } = useServices();
  const { data: packages = [] } = usePackages();
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [packageModalOpen, setPackageModalOpen] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const selectedName = serviceId
    ? services.find((sv) => sv.id === serviceId)?.nome || fallbackName || "Serviço vinculado"
    : packageId
      ? packages.find((p) => p.id === packageId)?.nome || fallbackName || "Pacote vinculado"
      : "";
  const selectedPrefix = serviceId ? "Serviço: " : packageId ? "Pacote: " : "";

  const s = search.toLowerCase();
  const filteredServices = services.filter((sv) => sv.nome.toLowerCase().includes(s));
  const filteredPackages = packages.filter((p) => !p.is_default && p.nome.toLowerCase().includes(s));

  return (
    <div className="space-y-2">
      <Label>Serviço ou Pacote <span className="text-muted-foreground text-xs">opcional</span></Label>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${selectedName ? "text-foreground" : "text-muted-foreground"}`}
        >
          <span className="truncate">{selectedName ? `${selectedPrefix}${selectedName}` : "Vincular serviço ou pacote..."}</span>
          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        {selectedName && (
          <button
            type="button"
            onClick={onClear}
            className="mt-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Remover vínculo
          </button>
        )}

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
            <div className="p-2">
              <div className="relative">
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar serviço ou pacote..."
                  className={`w-full rounded-md border border-input bg-muted px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring ${search ? "pr-8" : ""}`}
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Limpar busca"
                    onClick={() => setSearch("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filteredServices.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/50">Serviços</p>
                  {filteredServices.map((sv) => (
                    <button
                      type="button"
                      key={`s-${sv.id}`}
                      onClick={() => { onSelect({ type: "service", id: sv.id, name: sv.nome, price: sv.valor_base }); setOpen(false); setSearch(""); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center justify-between"
                    >
                      <span className="text-foreground">{sv.nome}</span>
                      <span className="text-xs text-muted-foreground">{formatCurrency(sv.valor_base)}</span>
                    </button>
                  ))}
                </>
              )}
              {filteredPackages.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/50">Pacotes</p>
                  {filteredPackages.map((p) => (
                    <button
                      type="button"
                      key={`p-${p.id}`}
                      onClick={() => { onSelect({ type: "package", id: p.id, name: p.nome, price: p.preco_final || 0 }); setOpen(false); setSearch(""); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center justify-between"
                    >
                      <span className="text-foreground">{p.nome}</span>
                      <span className="text-xs text-muted-foreground">{p.preco_final ? formatCurrency(p.preco_final) : "—"}</span>
                    </button>
                  ))}
                </>
              )}
              {filteredServices.length === 0 && filteredPackages.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground text-center">Nenhum item encontrado</p>
              )}
            </div>
            <div className="border-t border-border p-1.5 flex gap-1.5">
              <button
                type="button"
                onClick={() => { setOpen(false); setServiceModalOpen(true); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md hover:bg-muted text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Novo serviço
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setPackageModalOpen(true); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md hover:bg-muted text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Novo pacote
              </button>
            </div>
          </div>
        )}
      </div>
      <ServiceModal
        open={serviceModalOpen}
        onOpenChange={setServiceModalOpen}
        onCreated={() => { setServiceModalOpen(false); setOpen(true); }}
      />
      <PackageModal
        open={packageModalOpen}
        onOpenChange={setPackageModalOpen}
        onCreated={() => { setPackageModalOpen(false); setOpen(true); }}
      />
    </div>
  );
};

export default CobrancaItemSelector;
