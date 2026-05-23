import { useState, useEffect } from "react";
import { Eye, EyeOff, Plug, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIntegrationSettings, useSaveIntegrationSettings } from "@/hooks/useIntegrationSettings";

const MaskedInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-muted border-border pr-10 font-mono text-sm"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

const StatusBadge = ({ configured }: { configured: boolean }) =>
  configured ? (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
      <CheckCircle2 className="w-3.5 h-3.5" /> Configurado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <AlertCircle className="w-3.5 h-3.5" /> Não configurado
    </span>
  );

const IntegracoesPage = () => {
  const { data: settings, isLoading } = useIntegrationSettings();
  const save = useSaveIntegrationSettings();

  const [asaasKey, setAsaasKey] = useState("");
  const [autentiqueToken, setAutentiqueToken] = useState("");

  useEffect(() => {
    if (settings) {
      setAsaasKey(settings.asaas_api_key ?? "");
      setAutentiqueToken(settings.autentique_token ?? "");
    }
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate({
      asaas_api_key: asaasKey.trim() || null,
      autentique_token: autentiqueToken.trim() || null,
    });
  };

  if (isLoading) return <div className="text-muted-foreground py-12 text-center">Carregando...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Plug className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Integrações</h1>
          <p className="text-sm text-muted-foreground">Conecte suas ferramentas externas</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Asaas */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <span className="text-blue-500 font-bold text-sm">A$</span>
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Asaas</p>
                <p className="text-xs text-muted-foreground">Cobranças automáticas, PIX, boleto e cartão</p>
              </div>
            </div>
            <StatusBadge configured={!!settings?.asaas_api_key} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">API Key (Token)</Label>
            <MaskedInput
              value={asaasKey}
              onChange={setAsaasKey}
              placeholder="$aact_YourAsaasApiKey..."
            />
            <p className="text-[11px] text-muted-foreground">
              Encontre em:{" "}
              <a
                href="https://www.asaas.com/userConfig/index"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Asaas → Configurações → Integrações <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1.5 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">O que é integrado:</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Criar cobrança no Asaas ao adicionar uma cobrança no CRM</li>
              <li>Gerar link de pagamento (PIX, boleto, cartão)</li>
              <li>Atualizar status automaticamente quando o cliente pagar</li>
            </ul>
          </div>
        </div>

        {/* Autentique */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <span className="text-emerald-500 font-bold text-sm">Au</span>
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Autentique</p>
                <p className="text-xs text-muted-foreground">Assinatura digital de contratos</p>
              </div>
            </div>
            <StatusBadge configured={!!settings?.autentique_token} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Token de API</Label>
            <MaskedInput
              value={autentiqueToken}
              onChange={setAutentiqueToken}
              placeholder="seu-token-autentique..."
            />
            <p className="text-[11px] text-muted-foreground">
              Encontre em:{" "}
              <a
                href="https://autentique.com.br/app/perfil/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Autentique → Perfil → Tokens de API <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1.5 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">O que é integrado:</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Vincular contratos do Autentique aos contratos do CRM</li>
              <li>Atualizar status para "Assinado" automaticamente via webhook</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="bg-gradient-primary hover:opacity-90"
            disabled={save.isPending}
          >
            {save.isPending ? "Salvando..." : "Salvar integrações"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default IntegracoesPage;
