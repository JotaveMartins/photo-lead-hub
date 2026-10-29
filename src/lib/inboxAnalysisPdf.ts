import type { InboxAnalysisResult } from "./inboxAnalysis";
import regularFontUrl from "@/assets/fonts/DejaVuSans-Latin.ttf?url";
import boldFontUrl from "@/assets/fonts/DejaVuSans-Bold-Latin.ttf?url";

async function loadFont(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível carregar a fonte do relatório.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export async function createInboxAnalysisPdf(result: InboxAnalysisResult) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const [regularFont, boldFont] = await Promise.all([loadFont(regularFontUrl), loadFont(boldFontUrl)]);
  doc.addFileToVFS("Report-Regular.ttf", regularFont);
  doc.addFileToVFS("Report-Bold.ttf", boldFont);
  doc.addFont("Report-Regular.ttf", "Report", "normal");
  doc.addFont("Report-Bold.ttf", "Report", "bold");
  doc.setProperties({ title: "Análise de atendimento", author: "CRM | Hub do Fotógrafo" });
  const margin = 18, width = 174, bottom = 274;
  let y = 24;
  const printable = (text: string) => text.normalize("NFC")
    .replace(/[\u2013\u2014\u2015]/g, ", ").replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/\p{Extended_Pictographic}|\u200d|\ufe0f/gu, "");
  const newPage = () => { doc.addPage(); y = 24; };
  const paragraph = (value: string, size = 10, bold = false, color = "#253b49") => {
    doc.setFont("Report", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(color);
    const lines: string[] = doc.splitTextToSize(printable(value), width);
    const lineHeight = size * 0.48;
    for (const line of lines) {
      if (y + lineHeight > bottom) newPage();
      doc.text(line, margin, y); y += lineHeight;
    }
    y += 3;
  };
  const heading = (text: string) => {
    if (y > bottom - 25) newPage();
    y += 4; paragraph(text, 14, true, "#102b3f");
  };
  const label = (text: string) => paragraph(text, 8, true, "#087e8b");
  label("INBOX / GUIA E PROCESSO DE ATENDIMENTO");
  paragraph("Análise de atendimento", 25, true, "#102b3f");
  paragraph(`${result.sample.conversationCount} conversas | ${result.sample.messageCount} mensagens`, 11, true);
  paragraph("Critério: até 20 conversas mais recentes cuja primeira mensagem recebida corresponde ao texto abaixo. Maiúsculas e espaços repetidos são desconsiderados.", 9);
  paragraph(result.sample.entryMessage, 10);
  paragraph(`Gerado em ${new Date(result.sample.generatedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (São Paulo).`, 8);
  heading("Síntese do processo"); paragraph(result.report.summary);
  paragraph("Documento gerado com IA a partir dos históricos disponíveis. Revise as interpretações antes de reutilizar. Os modelos sugeridos são adaptações, não transcrições.", 9);
  paragraph(`${result.sample.untranscribedMediaCount} registros de mídia: somente textos e legendas disponíveis foram analisados. Não houve transcrição de áudio nem leitura de anexos.`, 9);
  newPage(); heading("Roteiro sugerido");
  for (const [index, stage] of result.report.stages.entries()) {
    heading(`${index + 1}. ${stage.title}`);
    label("OBSERVADO NOS ATENDIMENTOS"); paragraph(stage.observed);
    label("MODELO ADAPTADO"); paragraph(stage.suggestedMessage);
  }
  newPage(); heading("Pontos fortes observados");
  for (const item of result.report.strengths) paragraph(`• ${item}`);
  heading("Oportunidades de melhoria");
  for (const item of result.report.improvements) paragraph(`• ${item}`);
  heading("Limites da análise");
  for (const item of result.report.limitations) paragraph(`• ${item}`);
  newPage(); heading("Atendimentos analisados");
  paragraph("As identificações abaixo pertencem aos históricos selecionados. O relatório mantém nomes e telefones para facilitar a consulta no CRM.", 9);
  for (const contact of result.sample.contacts) {
    const analysis = result.report.cases.find((item) => item.conversation === contact.conversation);
    heading(`${contact.conversation} | ${contact.name}`);
    paragraph(`Telefone: ${contact.phone}`, 9);
    if (analysis) {
      label("SITUAÇÃO OBSERVADA"); paragraph(analysis.observed);
      label("PRÓXIMO PASSO SUGERIDO"); paragraph(analysis.nextStep);
    }
  }
  const pages = doc.getNumberOfPages();
  for (let index = 1; index <= pages; index++) {
    doc.setPage(index); doc.setDrawColor("#d6e4e8"); doc.line(margin, 282, 192, 282);
    doc.setFont("Report", "normal"); doc.setFontSize(8); doc.setTextColor("#526774");
    doc.text("CRM | ANÁLISE DE ATENDIMENTO", margin, 288);
    doc.text(`${index} / ${pages}`, 192, 288, { align: "right" });
  }
  return doc;
}

export async function downloadInboxAnalysisPdf(result: InboxAnalysisResult) {
  const doc = await createInboxAnalysisPdf(result);
  doc.save(`analise-atendimento-${result.sample.generatedAt.slice(0, 10)}.pdf`);
}
