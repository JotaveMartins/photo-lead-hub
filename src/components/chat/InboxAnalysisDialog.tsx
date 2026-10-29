import { useRef, useState } from "react";
import { FileSearch, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { downloadInboxAnalysisPdf } from "@/lib/inboxAnalysisPdf";
import type { InboxAnalysisResult } from "@/lib/inboxAnalysis";

const InboxAnalysisDialog = ({ initialMessage = "" }: { initialMessage?: string }) => {
  const userId = useEffectiveUserId();
  const currentUserId = useRef(userId);
  currentUserId.current = userId;
  const [open, setOpen] = useState(false);
  const [entryMessage, setEntryMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<{ userId: string; data: InboxAnalysisResult } | null>(null);
  const report = result?.userId === userId ? result.data : null;
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!userId || busy || entryMessage.trim().length < 3) return;
    const requestedUserId = userId;
    setBusy(true); setError(null); setResult(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("analyze-inbox-service", {
        body: { entry_message: entryMessage.trim(), target_user_id: requestedUserId },
      });
      if (invokeError) {
        let message = "Não foi possível gerar a análise. Verifique se a função está publicada e tente novamente.";
        try {
          const response = (invokeError as { context?: Response }).context;
          const details = await response?.json();
          if (typeof details?.error === "string") message = details.error;
        } catch { /* Keep the actionable default for network and non-JSON errors. */ }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.report || !data?.sample) throw new Error("O relatório retornou incompleto. Tente novamente.");
      if (currentUserId.current === requestedUserId) setResult({ userId: requestedUserId, data });
    } catch (failure) {
      if (currentUserId.current === requestedUserId) setError(failure instanceof Error ? failure.message : "Erro ao gerar análise.");
    } finally { setBusy(false); }
  };

  const download = async () => {
    if (!report) return;
    setDownloading(true);
    try { await downloadInboxAnalysisPdf(report); }
    catch { toast.error("Não foi possível baixar o PDF. Tente novamente."); }
    finally { setDownloading(false); }
  };

  return <>
    <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => {
      if (busy) return;
      setEntryMessage(initialMessage); setResult(null); setError(null); setOpen(true);
    }}><FileSearch className="mr-2 h-4 w-4" />Análise de atendimento</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!busy && !downloading) setOpen(value); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Análise de atendimento</DialogTitle>
          <DialogDescription>Informe a mensagem de entrada para analisar até 20 atendimentos recentes da conta atual.</DialogDescription>
        </DialogHeader>
        {!report ? <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="analysis-entry-message">Primeira mensagem recebida</Label>
            <Textarea id="analysis-entry-message" value={entryMessage} maxLength={1000} disabled={busy}
              placeholder="Olá! Vim pelo anúncio e quero saber mais sobre o ensaio de natal."
              onChange={(event) => setEntryMessage(event.target.value)} rows={4} />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">A busca compara a mensagem inicial completa, ignorando maiúsculas e espaços repetidos. Inclui conversas abertas e encerradas. Se houver menos de 20, usa as disponíveis.</p>
          <p className="text-xs leading-relaxed text-muted-foreground">A análise utiliza a IA configurada no CRM e pode consumir créditos do provedor. O relatório mantém nomes e telefones. Áudios e anexos não serão transcritos.</p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button onClick={generate} disabled={busy || !userId || entryMessage.trim().length < 3} className="w-full">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busy ? "Analisando atendimentos..." : "Gerar análise"}
          </Button>
          {busy && <p role="status" className="text-xs text-muted-foreground">Aguarde a conclusão. Nenhuma mensagem será enviada aos contatos.</p>}
        </div> : <div className="space-y-5">
          <p className="text-xs text-muted-foreground">{report.sample.conversationCount} atendimentos e {report.sample.messageCount} mensagens analisados. Revise o conteúdo antes de baixar e compartilhar.</p>
          <section><h3 className="mb-2 font-semibold">Síntese</h3><p className="whitespace-pre-wrap text-sm text-muted-foreground">{report.report.summary}</p></section>
          <section className="space-y-4"><h3 className="font-semibold">Roteiro sugerido</h3>{report.report.stages.map((stage, index) => <div key={index} className="rounded-lg border border-border p-3 space-y-2">
            <h4 className="text-sm font-medium">{index + 1}. {stage.title}</h4>
            <p className="text-xs text-muted-foreground">{stage.observed}</p>
            <p className="whitespace-pre-wrap text-sm">{stage.suggestedMessage}</p>
          </div>)}</section>
          {([['Pontos fortes', report.report.strengths], ['Melhorias sugeridas', report.report.improvements], ['Limites da análise', report.report.limitations]] as const).map(([title, items]) => <section key={title}>
            <h3 className="mb-2 font-semibold">{title}</h3><ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </section>)}
          <section className="space-y-3"><h3 className="font-semibold">Atendimentos analisados</h3>{report.sample.contacts.map((contact) => {
            const analysis = report.report.cases.find((item) => item.conversation === contact.conversation);
            return <div key={contact.conversation} className="rounded-lg border border-border p-3 space-y-1">
              <p className="text-sm font-medium">{contact.conversation}: {contact.name}</p><p className="text-xs text-muted-foreground">{contact.phone}</p>
              <p className="text-sm">{analysis?.observed}</p><p className="text-sm text-muted-foreground">Próximo passo sugerido: {analysis?.nextStep}</p>
            </div>;
          })}</section>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={downloading} onClick={() => setResult(null)}>Outra mensagem</Button>
            <Button disabled={downloading} onClick={download}>{downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Baixar PDF</Button>
          </div>
        </div>}
      </DialogContent>
    </Dialog>
  </>;
};

export default InboxAnalysisDialog;
