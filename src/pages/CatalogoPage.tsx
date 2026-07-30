import { useState } from "react";
import ServicosPage from "./ServicosPage";
import PacotesPage from "./PacotesPage";

const CatalogoPage = () => {
  const [tab, setTab] = useState<"servicos" | "pacotes">("servicos");

  return (
    <>
      <div className="inline-flex items-center gap-1 p-1 mb-6 rounded-lg bg-muted/50 border border-border">
        {(["servicos", "pacotes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
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
