import { useReviewLocale } from "@/i18n/ReviewLocale";
import type { InstagramAccount } from "@/hooks/useSocial";
import { canPublishToInstagram } from "@/lib/instagramAccounts";
import SearchSelect from "@/components/SearchSelect";

interface Props {
  accounts: InstagramAccount[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  id?: string;
}

const InstagramAccountSelect = ({ accounts, value, onChange, disabled, loading, error, id = "instagram-profile" }: Props) => {
  const { t } = useReviewLocale();
  return (
  <div className="space-y-1.5">
    <SearchSelect
      id={id}
      label={t("Perfil do Instagram")}
      value={accounts.some((account) => account.id === value) ? value : ""}
      onChange={onChange}
      disabled={disabled || loading || error || !accounts.length}
      allowEmpty={false}
      placeholder={loading ? t("Carregando perfis...") : error ? t("Não foi possível carregar os perfis") : accounts.length ? t("Escolha o perfil para publicar") : t("Nenhum perfil conectado")}
      searchPlaceholder={t("Buscar perfil...")}
      options={accounts.map((account) => ({
        value: account.id,
        label: account.username ? `@${account.username}` : `${t("Nome de usuário indisponível")} (${account.instagram_user_id ?? account.id})`,
        hint: !canPublishToInstagram(account) ? t("Reconecte este perfil") : null,
        disabled: !canPublishToInstagram(account),
      }))}
    />
    {!loading && !error && !accounts.length && (
      <p className="text-xs text-muted-foreground">{t("Conecte um perfil profissional em Configurações → Integrações.")}</p>
    )}
  </div>
);
};

export default InstagramAccountSelect;
