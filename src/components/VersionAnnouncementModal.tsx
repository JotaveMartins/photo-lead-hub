import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, DollarSign, Wrench, Package, BarChart3 } from "lucide-react";

const VERSION_KEY = "crm_version_2_seen";

const VersionAnnouncementModal = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(VERSION_KEY);
    if (!seen) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(VERSION_KEY, "true");
    setOpen(false);
  };

  const features = [
    { icon: <Calendar className="w-5 h-5" />, label: "Agenda", desc: "Gerencie eventos e entregas" },
    { icon: <Wrench className="w-5 h-5" />, label: "Serviços", desc: "Cadastre e organize serviços" },
    { icon: <Package className="w-5 h-5" />, label: "Pacotes", desc: "Monte pacotes personalizados" },
    { icon: <DollarSign className="w-5 h-5" />, label: "Financeiro", desc: "Cobranças, despesas e resumo" },
    { icon: <BarChart3 className="w-5 h-5" />, label: "Relatório do Cliente", desc: "Visão financeira por cliente" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-foreground mb-1">Versão 2.0 lançada! 🎉</h2>
            <p className="text-sm text-muted-foreground">Novas funcionalidades disponíveis para potencializar seu negócio.</p>
          </div>

          {/* Features grid */}
          <div className="space-y-2 mb-6">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/30">
                <div className="text-primary">{f.icon}</div>
                <div>
                  <p className="text-sm font-medium text-foreground">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground/60 text-center mb-4">
            Use o ícone <span className="text-primary font-semibold">?</span> em cada página para aprender mais sobre as funcionalidades.
          </p>

          <Button className="w-full bg-primary text-primary-foreground" onClick={handleClose}>
            Explorar agora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VersionAnnouncementModal;
