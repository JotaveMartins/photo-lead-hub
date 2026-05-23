import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  user_id: string;
  nome: string;
  meta_ad_account_id?: string | null;
  cpl_limite_bom?: number | null;
  cpl_limite_alerta?: number | null;
  asaas_api_key?: string | null;
  autentique_token?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  user: AdminUser | null;
}

const EditAdminUserModal = ({ open, onClose, user }: Props) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [metaAdAccount, setMetaAdAccount] = useState("");
  const [cplBom, setCplBom] = useState("");
  const [cplAlerta, setCplAlerta] = useState("");
  const [asaasKey, setAsaasKey] = useState("");
  const [autentiqueToken, setAutentiqueToken] = useState("");

  useEffect(() => {
    if (user) {
      setMetaAdAccount(user.meta_ad_account_id || "");
      setCplBom(user.cpl_limite_bom != null ? String(user.cpl_limite_bom) : "");
      setCplAlerta(user.cpl_limite_alerta != null ? String(user.cpl_limite_alerta) : "");
      setAsaasKey(user.asaas_api_key || "");
      setAutentiqueToken(user.autentique_token || "");
    }
  }, [user]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({
          meta_ad_account_id: metaAdAccount.trim() || null,
          cpl_limite_bom: cplBom.trim() ? Number(cplBom.replace(",", ".")) : null,
          cpl_limite_alerta: cplAlerta.trim() ? Number(cplAlerta.replace(",", ".")) : null,
          asaas_api_key: asaasKey.trim() || null,
          autentique_token: autentiqueToken.trim() || null,
        } as any)
        .eq("user_id", user.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["profiles-meta"] });
      toast({ title: "Configurações atualizadas" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const bom = Number((cplBom || "").replace(",", "."));
  const alerta = Number((cplAlerta || "").replace(",", "."));
  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Configurações de {user?.nome}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
          className="space-y-4"
        >
          <div>
            <Label>Conta Meta Ads (ad_account_id)</Label>
            <Input
              value={metaAdAccount}
              onChange={(e) => setMetaAdAccount(e.target.value)}
              placeholder="act_123456789 ou apenas 123456789"
            />
            <p className="text-xs text-muted-foreground mt-1">Usado pela aba Anúncios para sincronizar dados desta conta.</p>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">CPL — Custo por Lead</p>
              <p className="text-xs text-muted-foreground">
                Até o Limite Bom = verde. Entre Bom e Alerta = amarelo. Acima do Alerta = vermelho.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Limite Bom (R$)</Label>
                <Input type="number" step="0.01" min="0" value={cplBom} onChange={(e) => setCplBom(e.target.value)} placeholder="3,50" />
              </div>
              <div>
                <Label className="text-xs">Limite Alerta (R$)</Label>
                <Input type="number" step="0.01" min="0" value={cplAlerta} onChange={(e) => setCplAlerta(e.target.value)} placeholder="4,00" />
              </div>
            </div>
            {bom > 0 && alerta > 0 && (
              <div className="flex items-center gap-2 text-[11px] pt-1">
                <span className="px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/30">≤ {fmt(bom)}</span>
                <span className="px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/30">{fmt(bom)} – {fmt(alerta)}</span>
                <span className="px-2 py-0.5 rounded-full border bg-red-500/10 text-red-500 border-red-500/30">&gt; {fmt(alerta)}</span>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border p-3 space-y-3">
            <p className="text-sm font-medium text-foreground">Integrações</p>
            <div>
              <Label className="text-xs">Asaas — API Key</Label>
              <Input
                type="password"
                value={asaasKey}
                onChange={(e) => setAsaasKey(e.target.value)}
                placeholder="$aact_YourAsaasApiKey..."
                className="font-mono text-sm mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Autentique — Token de API</Label>
              <Input
                type="password"
                value={autentiqueToken}
                onChange={(e) => setAutentiqueToken(e.target.value)}
                placeholder="Token do Autentique..."
                className="font-mono text-sm mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAdminUserModal;
