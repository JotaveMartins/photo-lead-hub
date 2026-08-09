import { useState } from "react";
import { Instagram, CheckCircle2, AlertCircle, Loader2, Plug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  useInstagramAccount,
  useConnectInstagram,
  useDisconnectInstagram,
} from "@/hooks/useSocial";

const InstagramCard = () => {
  const { data: account, isLoading } = useInstagramAccount();
  const connect = useConnectInstagram();
  const disconnect = useDisconnectInstagram();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: true; username: string | null; id: string } | { ok: false; message: string } | null
  >(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("test-instagram-connection", {
        body: {},
      });
      if (error || data?.status !== "ok") {
        const message = data?.message ?? "Não foi possível conectar à API do Instagram.";
        setTestResult({ ok: false, message });
        toast.error(message);
        return;
      }
      setTestResult({ ok: true, username: data.username, id: data.instagram_user_id });
      toast.success(`Conexão funcionando — @${data.username}`);
    } catch {
      const message = "Erro ao testar a conexão com o Instagram.";
      setTestResult({ ok: false, message });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  const expired =
    !!account?.token_expires_at && new Date(account.token_expires_at) < new Date();
  const isConnected = !!account && !expired;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center overflow-hidden">
            {account?.profile_picture_url ? (
              <img src={account.profile_picture_url} alt="" className="w-9 h-9 object-cover" />
            ) : (
              <Instagram className="w-5 h-5 text-pink-500" />
            )}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Instagram</p>
            <p className="text-xs text-muted-foreground">
              {isConnected
                ? `@${account?.username ?? account?.instagram_user_id}`
                : "Publique e agende carrosséis direto do Estúdio IA"}
            </p>
          </div>
        </div>
        {isConnected ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <AlertCircle className="w-3.5 h-3.5" />
            {expired ? "Token expirado" : "Não conectado"}
          </span>
        )}
      </div>

      {!isConnected && (
        <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Requisitos:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Conta Profissional (Comercial ou Criador de Conteúdo)</li>
            <li>Permissões de leitura do perfil e publicação de conteúdo</li>
          </ul>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" disabled={testing} onClick={handleTest}>
          {testing ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Plug className="mr-1.5 h-4 w-4" />
          )}
          Testar conexão
        </Button>
        {isConnected && (
          <Button
            variant="outline"
            size="sm"
            disabled={disconnect.isPending}
            onClick={() =>
              disconnect.mutate(undefined, {
                onSuccess: () => toast.success("Instagram desconectado"),
                onError: (e: any) => toast.error(e?.message ?? "Erro ao desconectar"),
              })
            }
          >
            Desconectar
          </Button>
        )}
        <Button
          size="sm"
          disabled={isLoading || connect.isPending}
          onClick={() =>
            connect.mutate(undefined, {
              onError: (e: any) => toast.error(e?.message ?? "Erro ao conectar"),
            })
          }
        >
          {connect.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          {isConnected ? "Reconectar" : "Conectar Instagram"}
        </Button>
      </div>

      {testResult && (
        <div
          className={`rounded-lg border p-3 text-xs ${
            testResult.ok
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {testResult.ok ? (
            <>
              <p className="font-medium">Conexão funcionando</p>
              <p className="text-foreground/80 mt-0.5">
                Conta: @{testResult.username} · ID: {testResult.id}
              </p>
            </>
          ) : (
            <p className="font-medium">{"message" in testResult ? testResult.message : ""}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default InstagramCard;