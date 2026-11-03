import { Lock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { supportUrl } from "@/lib/accountAccess";
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
          O acesso à sua conta foi suspenso. Seus dados continuam salvos.
          Fale com a nossa equipe para verificar a situação e voltar a usar o CRM.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Para voltar a usar o sistema, fale com a nossa equipe e reative seu plano.
        </p>

        <div className="mt-6 space-y-2">
          <Button asChild className="w-full"><a href={supportUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Falar com a equipe</a></Button>
          <Button asChild variant="outline" className="w-full"><Link to="/assinatura">Ver planos</Link></Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={signOut}>
            Sair
          </Button>
        </div>

      </div>
    </div>
  );
};

export default ContaBloqueadaPage;
