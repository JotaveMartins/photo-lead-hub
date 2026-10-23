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

const InstagramAccountSelect = ({ accounts, value, onChange, disabled, loading, error, id = "instagram-profile" }: Props) => (
  <div className="space-y-1.5">
    <SearchSelect
      id={id}
      label="Perfil do Instagram"
      value={accounts.some((account) => account.id === value) ? value : ""}
      onChange={onChange}
      disabled={disabled || loading || error || !accounts.length}
      allowEmpty={false}
      placeholder={loading ? "Carregando perfis..." : error ? "Não foi possível carregar os perfis" : accounts.length ? "Escolha o perfil para publicar" : "Nenhum perfil conectado"}
      searchPlaceholder="Buscar perfil..."
      options={accounts.map((account) => ({
        value: account.id,
        label: `@${account.username ?? account.instagram_user_id}`,
        hint: !canPublishToInstagram(account) ? "Reconecte este perfil" : null,
        disabled: !canPublishToInstagram(account),
      }))}
    />
    {!loading && !error && !accounts.length && (
      <p className="text-xs text-muted-foreground">Conecte um perfil profissional em Configurações → Integrações.</p>
    )}
  </div>
);

export default InstagramAccountSelect;
