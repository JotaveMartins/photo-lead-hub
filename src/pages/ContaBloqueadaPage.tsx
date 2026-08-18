import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";


const ContaBloqueadaPage = () => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <img src={logo} alt="Avanzo Digital" className="w-12 h-12 object-contain mx-auto mb-6" />

        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-amber-500" />
        </div>

        <h1 className="font-display text-xl font-semibold text-foreground">
          Acesso temporariamente bloqueado
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sua assinatura do CRM está inativa no momento, por isso o acesso à conta foi suspenso.
          Seus dados continuam salvos e são restaurados assim que a assinatura for reativada.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Para voltar a usar o sistema, fale com a nossa equipe e reative seu plano.
        </p>

        <div className="mt-6">
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={signOut}>
            Sair
          </Button>
        </div>

      </div>
    </div>
  );
};

export default ContaBloqueadaPage;
