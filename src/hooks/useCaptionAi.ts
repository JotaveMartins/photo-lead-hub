import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CaptionPreferences {
  tone?: string;
  length?: "CURTA" | "MEDIA" | "LONGA" | "AUTO";
  emojis?: "Nunca" | "Pouco" | "Moderado";
  cta?: "Nunca" | "Às vezes" | "Frequentemente";
  style_examples?: string[];
}

export interface CaptionProjectContext {
  event_type?: string;
  people_names?: string;
  location?: string;
  story?: string;
  additional_information?: string;
}

export interface CaptionAnalysis {
  category: string;
  confidence?: number;
  narrative_angles?: string[];
  visible_elements?: string[];
  suggested_caption_length?: string;
  commercial_cta?: boolean;
}

/**
 * Gera a legenda em duas etapas (análise editorial + escrita) a partir das
 * fotografias efetivamente usadas nos slides do carrossel.
 */
export const useGenerateCaption = () =>
  useMutation({
    mutationFn: async (input: {
      projectId: string;
      photoIds: string[];
      projectContext?: CaptionProjectContext;
      preferences?: CaptionPreferences;
    }): Promise<{ caption: string; analysis: CaptionAnalysis }> => {
      const { data, error } = await supabase.functions.invoke("generate-carousel-caption", {
        body: {
          project_id: input.projectId,
          photo_ids: input.photoIds,
          project_context: input.projectContext,
          preferences: input.preferences,
        },
      });
      if (error) throw new Error((data as any)?.error ?? error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    },
  });