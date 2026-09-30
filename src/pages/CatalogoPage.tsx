import { useSearchParams } from "react-router-dom";
import ServicosPage from "./ServicosPage";
import PacotesPage from "./PacotesPage";

type CatalogoTab = "servicos" | "pacotes";

const CatalogoPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: CatalogoTab = searchParams.get("tab") === "pacotes" ? "pacotes" : "servicos";

  const selectTab = (t: CatalogoTab) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", t);
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <div role="tablist" aria-label="Catálogo" className="inline-flex items-center gap-1 p-1 mb-6 rounded-lg bg-muted/50 border border-border">
        {(["servicos", "pacotes"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => selectTab(t)}
            className={`min-h-10 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? "bg-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "servicos" ? "Serviços" : "Pacotes"}
          </button>
        ))}
      </div>
      {tab === "servicos" ? <ServicosPage /> : <PacotesPage />}
    </>
  );
};

export default CatalogoPage;
