import type { InstagramAccount } from "@/hooks/useSocial";
import { canPublishToInstagram } from "@/lib/instagramAccounts";

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
    <label htmlFor={id} className="text-xs font-medium text-foreground">Perfil do Instagram</label>
    <select
      id={id}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
      value={accounts.some((account) => account.id === value) ? value : ""}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled || loading || error || !accounts.length}
    >
      <option value="" disabled>
        {loading ? "Carregando perfis..." : error ? "Não foi possível carregar os perfis" : accounts.length ? "Escolha o perfil para publicar" : "Nenhum perfil conectado"}
      </option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id} disabled={!canPublishToInstagram(account)}>
          @{account.username ?? account.instagram_user_id}{!canPublishToInstagram(account) && " — reconecte este perfil"}
        </option>
      ))}
    </select>
    {!loading && !error && !accounts.length && (
      <p className="text-xs text-muted-foreground">Conecte um perfil profissional em Configurações → Integrações.</p>
    )}
  </div>
);

export default InstagramAccountSelect;
