import { useReviewLocale } from "@/i18n/ReviewLocale";
import { useState } from "react";
import { Instagram, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useInstagramAccounts, useConnectInstagram, useDisconnectInstagram } from "@/hooks/useSocial";
import { canPublishToInstagram } from "@/lib/instagramAccounts";

const InstagramCard = () => {
  const { t } = useReviewLocale();
  const { data: accounts = [], isLoading, isError, refetch } = useInstagramAccounts();
  const connect = useConnectInstagram();
  const disconnect = useDisconnectInstagram();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string; username?: string | null; instagramId?: string | null; accountType?: string | null }>>({});
  const queryClient = useQueryClient();
  const userId = useEffectiveUserId();

  const handleTest = async (accountId: string) => {
    setTestingId(accountId);
    setTestResults((results) => {
      const next = { ...results };
      delete next[accountId];
      return next;
    });
    try {
      const { data, error } = await supabase.functions.invoke("test-instagram-connection", {
        body: { target_user_id: userId, social_account_id: accountId },
      });
      if (error || data?.status !== "ok") throw new Error(data?.message ?? t("Não foi possível testar este perfil. Tente reconectá-lo."));
      const message = data.username ? t("Conexão funcionando — @{0}", [data.username]) : t("Conexão verificada");
      setTestResults((results) => ({ ...results, [accountId]: { ok: true, message, username: data.username, instagramId: data.instagram_user_id, accountType: data.account_type } }));
      queryClient.invalidateQueries({ queryKey: ["instagram-accounts"] });
      toast.success(message);
    } catch (error) {
      const message = error instanceof Error ? t(error.message) : t("Erro ao testar a conexão com o Instagram.");
      setTestResults((results) => ({ ...results, [accountId]: { ok: false, message } }));
      toast.error(message);
    } finally {
      setTestingId(null);
    }
  };

  const handleConnect = () => connect.mutate(undefined, {
    onSuccess: (ok) => ok && toast.success(t("Perfil do Instagram conectado com sucesso")),
    onError: (error) => toast.error(error.message ?? t("Erro ao conectar")),
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Instagram className="h-5 w-5 text-pink-500" />
        <div>
          <p className="text-sm font-semibold text-foreground">Instagram</p>
          <p className="text-xs text-muted-foreground">{t("Conecte seus perfis e escolha em qual publicar no Estúdio IA.")}</p>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{t("Carregando perfis...")}</p>}
      {isError && (
        <div role="alert" className="text-sm text-destructive">{t("Não foi possível carregar os perfis.")}  <Button variant="ghost" size="sm" onClick={() => refetch()}>{t("Tentar novamente")}</Button>
        </div>
      )}
      {!isLoading && !isError && !accounts.length && (
        <p className="text-xs text-muted-foreground">{t("Conecte uma conta Profissional (Comercial ou Criador de Conteúdo) com permissão de publicação.")}</p>
      )}

      {accounts.map((account) => {
        const connected = canPublishToInstagram(account);
        const result = testResults[account.id];
        const username = result?.ok ? result.username || account.username : account.username;
        const instagramId = result?.ok ? result.instagramId || account.instagram_user_id : account.instagram_user_id;
        const accountType = result?.ok ? result.accountType : null;
        const typeLabel = accountType === "BUSINESS" ? t("Profissional: Comercial")
          : accountType === "MEDIA_CREATOR" || accountType === "CREATOR" ? t("Profissional: Criador de Conteúdo")
          : accountType === "PERSONAL" ? t("Pessoal") : accountType || t("Não informado pelo Instagram");
        return (
          <div key={account.id} className="rounded-lg border border-border p-3 space-y-3">
            <div className="flex items-center gap-3">
              {account.profile_picture_url && <img src={account.profile_picture_url} alt="" className="h-9 w-9 rounded-full object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{username ? `@${username}` : t("Nome de usuário indisponível")}</p>
                <p className={`text-xs ${connected ? "text-emerald-500" : "text-amber-500"}`}>
                  {t("Status da conexão")}: {connected ? t("Conectado") : t("Reconexão necessária")}
                </p>
              </div>
            </div>
            <dl className="grid gap-1 text-xs text-muted-foreground">
              <div><dt className="inline font-medium">{t("Nome de usuário")}: </dt><dd className="inline">{username ? `@${username}` : t("Nome de usuário indisponível")}</dd></div>
              <div><dt className="inline font-medium">{t("Instagram Account ID")}: </dt><dd className="inline break-all font-mono">{instagramId || t("Não informado pelo Instagram")}</dd></div>
              <div><dt className="inline font-medium">{t("Tipo de conta")}: </dt><dd className="inline">{typeLabel}</dd></div>
            </dl>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" disabled={!!testingId || disconnect.isPending} onClick={() => handleTest(account.id)}>
                {testingId === account.id && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}{t("Testar conexão")}</Button>
              <Button variant="outline" size="sm" disabled={disconnect.isPending || !!testingId} onClick={() => disconnect.mutate(account.id, {
                onSuccess: () => toast.success(t("Perfil desconectado")),
                onError: (error) => toast.error(error.message ?? t("Erro ao desconectar")),
              })}>{t("Desconectar")}</Button>
              <Button variant="outline" size="sm" disabled={connect.isPending} onClick={handleConnect}>{t("Reconectar")}</Button>
            </div>
            {result && <p role="status" className={`text-xs ${result.ok ? "text-emerald-500" : "text-destructive"}`}>{result.message}</p>}
          </div>
        );
      })}

      <div className="space-y-1.5 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{t("Como usamos os dados do Instagram")}</p>
        <p>{t("Usamos o nome de usuário, o ID e a foto do perfil para identificar a conta conectada e permitir sua seleção no Studio IA.")}</p>
        <p>{t("Ao escolher Publicar, enviamos as imagens aprovadas, a legenda e as hashtags para o feed do perfil selecionado.")}</p>
        <p>{t("A conexão não publica nada automaticamente. Você escolhe o conteúdo e confirma a publicação ou o agendamento.")}</p>
      </div>
      <p className="text-xs text-muted-foreground">{t("Ao conectar novamente o mesmo perfil, sua conexão será atualizada. Para adicionar outro, autorize com o perfil desejado no Instagram.")}</p>
      <div className="flex justify-end">
        <Button size="sm" disabled={isLoading || connect.isPending} onClick={handleConnect}>
          {connect.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          {accounts.length ? t("Conectar outro Instagram") : t("Conectar Instagram")}
        </Button>
      </div>
    </div>
  );
};

export default InstagramCard;
