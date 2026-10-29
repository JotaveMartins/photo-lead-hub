import type { AnalysisReport } from "../../supabase/functions/analyze-inbox-service/report";
export type { AnalysisReport };

export interface InboxAnalysisResult {
  report: AnalysisReport;
  sample: {
    conversationCount: number;
    messageCount: number;
    untranscribedMediaCount: number;
    entryMessage: string;
    generatedAt: string;
    contacts: { conversation: string; name: string; phone: string }[];
  };
}
