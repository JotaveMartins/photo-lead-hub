import { Construction } from "lucide-react";

const EntregasPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
        <Construction className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground mb-2">Em construção</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        O Funil de Entregas está sendo desenvolvido e estará disponível em breve.
      </p>
    </div>
  );
};

export default EntregasPage;
