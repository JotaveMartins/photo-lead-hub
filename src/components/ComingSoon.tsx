import { Construction } from "lucide-react";

interface ComingSoonProps {
  title: string;
  icon: React.ReactNode;
}

const ComingSoon = ({ title, icon }: ComingSoonProps) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
    <div className="bg-card border border-border rounded-2xl p-12 text-center max-w-md">
      <div className="flex justify-center mb-4 text-primary">{icon}</div>
      <h1 className="text-2xl font-display font-bold text-foreground mb-2">{title}</h1>
      <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
        <Construction className="w-5 h-5 text-amber-400" />
        <span className="text-sm font-medium">Em construção</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Estamos preparando essa funcionalidade para você. Em breve ela estará disponível!
      </p>
    </div>
  </div>
);

export default ComingSoon;
