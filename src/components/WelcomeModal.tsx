import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const WelcomeModal = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [welcomeUserId, setWelcomeUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setWelcomeUserId(null);
      return;
    }
    const seenKey = `crm_welcome_seen_${userId}`;
    try {
      setWelcomeUserId(localStorage.getItem(seenKey) ? null : userId);
    } catch {
      setWelcomeUserId(userId);
    }
  }, [userId]);

  const handleClose = () => {
    if (user) {
      try {
        localStorage.setItem(`crm_welcome_seen_${user.id}`, "true");
      } catch {
        // The welcome can still be dismissed when browser storage is unavailable.
      }
    }
    setWelcomeUserId(null);
  };

  return (
    <Dialog open={!!user && welcomeUserId === user.id} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl">Boas-vindas ao seu CRM!</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Que bom ter você por aqui! Organize seus atendimentos, clientes e compromissos em um só lugar.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Se precisar de ajuda, entre em contato com a nossa equipe de suporte.
          Estamos à disposição para te ajudar!
        </p>
        <Button className="mt-2 w-full" onClick={handleClose}>Começar</Button>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeModal;
