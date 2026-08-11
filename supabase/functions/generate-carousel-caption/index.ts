import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  CATEGORIES,
  CATEGORY_GUIDE,
  NARRATIVE_ANGLES,
  REFERENCE_CAPTIONS,
  STYLE_RULES,
} from "./knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";
const MAX_IMAGES = 12;

type Preferences = {
  tone?: string; // Emocional | Editorial | Leve | Direto | Poético | Descontraído | Automático
  length?: string; // CURTA | MEDIA | LONGA | AUTO
  emojis?: string; // Nunca | Pouco | Moderado
  cta?: string; // Nunca | As vezes | Frequentemente
  style_examples?: string[]; // legendas do próprio fotógrafo (evolução futura)
};

type ProjectContext = {
  event_type?: string;
  people_names?: string;
  location?: string;
  story?: string;
  additional_information?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function callGateway(messages: unknown[], apiKey: string, jsonMode: boolean) {
  const resp = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    if (resp.status === 429) throw new Error("Limite de requisições da IA atingido. Tente novamente em instantes.");
    if (resp.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos para continuar.");
    throw new Error(`Falha na IA (${resp.status}): ${text.slice(0, 300)}`);
  }
  const data = await resp.json();
  return (data?.choices?.[0]?.message?.content ?? "").toString();
}

function parseJsonLoose(raw: string): any {
  return parseJsonLooseImpl(raw);
}

function parseJsonLooseImpl(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch { /* ignore */ }
    }
    return null;
  }
}

/**
 * Rede de segurança: remove travessões (U+2014 / U+2013 / U+2015) da legenda,
 * convertendo a pausa em vírgula ou ponto conforme o contexto.
 */
function stripEmDashes(text: string): string {
  let out = text
    // " — palavra" no meio da frase vira vírgula
    .replace(/\s*[\u2014\u2013\u2015]\s*/g, ", ")
    // limpa pontuação duplicada gerada pela troca
    .replace(/,\s*,/g, ",")
    .replace(/([.,;:!?])\s*,\s*/g, "$1 ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*$/gm, ".")
    .replace(/[ \t]{2,}/g, " ");
  // capitaliza depois de ponto quando a troca gerou frase nova
  out = out.replace(/([.!?])\s+([a-zà-ú])/g, (_m, p, c) => `${p} ${c.toUpperCase()}`);
  return out.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY não configurada" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Não autenticado" }, 401);

    const body = await req.json().catch(() => ({}));
    const projectId: string | undefined = body.project_id;
    const photoIds: string[] = Array.isArray(body.photo_ids) ? body.photo_ids : [];
    const preferences: Preferences = body.preferences ?? {};
    if (!projectId || photoIds.length === 0) {
      return json({ error: "project_id e photo_ids são obrigatórios" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: project } = await admin
      .from("projects")
      .select("id, user_id, nome, tipo_ensaio, descricao")
      .eq("id", projectId)
      .maybeSingle();
    if (!project) return json({ error: "Projeto não encontrado" }, 404);

    const { data: photoRows } = await admin
      .from("photos")
      .select("id, storage_path, image_url")
      .in("id", photoIds.slice(0, 60));

    const byId: Record<string, any> = {};
    (photoRows ?? []).forEach((p: any) => (byId[p.id] = p));

    // Mantém a ordem dos slides do carrossel e limita a quantidade enviada ao modelo.
    const ordered = photoIds.map((id) => byId[id]).filter(Boolean);
    const step = Math.max(1, Math.ceil(ordered.length / MAX_IMAGES));
    const selected = ordered.filter((_, i) => i % step === 0).slice(0, MAX_IMAGES);

    const paths = selected.map((p) => p.storage_path).filter(Boolean);
    const signedMap: Record<string, string> = {};
    const plainMap: Record<string, string> = {};
    if (paths.length) {
      // Versão reduzida (transformação de imagem) para caber no limite do modelo.
      const { data: signed } = await admin.storage
        .from("project-photos")
        .createSignedUrls(paths, 60 * 30, {
          transform: { width: 768, height: 768, resize: "contain", quality: 65 },
        } as any);
      (signed ?? []).forEach((s: any) => {
        if (s?.path && s?.signedUrl) signedMap[s.path] = s.signedUrl;
      });
      const { data: plain } = await admin.storage
        .from("project-photos")
        .createSignedUrls(paths, 60 * 30);
      (plain ?? []).forEach((s: any) => {
        if (s?.path && s?.signedUrl) plainMap[s.path] = s.signedUrl;
      });
    }
    const candidates = selected.map((p) => ({
      small: (p.storage_path ? signedMap[p.storage_path] : null) ?? null,
      full: (p.storage_path ? plainMap[p.storage_path] : null) ?? p.image_url ?? null,
    }));

    // Inline em base64 (garante tamanho pequeno e evita o fetch remoto do provedor).
    const imageUrls: string[] = [];
    for (const c of candidates) {
      for (const url of [c.small, c.full]) {
        if (!url) continue;
        try {
          const r = await fetch(url);
          if (!r.ok) {
            console.error("image fetch status", r.status, url.slice(0, 120));
            continue;
          }
          const buf = new Uint8Array(await r.arrayBuffer());
          if (buf.byteLength > 4_000_000) {
            console.error("image too large", buf.byteLength);
            continue;
          }
          const mime = r.headers.get("content-type") ?? "image/jpeg";
          let bin = "";
          for (let i = 0; i < buf.length; i += 8192) {
            bin += String.fromCharCode(...buf.subarray(i, i + 8192));
          }
          imageUrls.push(`data:${mime};base64,${btoa(bin)}`);
          break;
        } catch (e) {
          console.error("image fetch failed", e);
        }
      }
    }

    if (!imageUrls.length) return json({ error: "Nenhuma imagem disponível para análise" }, 400);

    const projectContext: ProjectContext = {
      event_type: body.project_context?.event_type ?? project.tipo_ensaio ?? "",
      people_names: body.project_context?.people_names ?? "",
      location: body.project_context?.location ?? "",
      story: body.project_context?.story ?? project.descricao ?? "",
      additional_information:
        body.project_context?.additional_information ?? project.nome ?? "",
    };

    const imageParts = imageUrls.map((url, i) => [
      { type: "text", text: `Slide/foto ${i + 1}:` },
      { type: "image_url", image_url: { url } },
    ]).flat();

    // ===== ETAPA 1 — ANÁLISE EDITORIAL =====
    const analysisSystem = `Você é um diretor editorial de fotografia de casamentos.
Sua tarefa é analisar o CONJUNTO de fotografias de um carrossel do Instagram (não apenas a primeira) e produzir uma análise editorial.

Observe: o que está acontecendo, qual momento do evento é retratado, quem aparece, ambiente, atmosfera,
elementos recorrentes (vestido, terno, alianças, buquê, maquiagem, cabelo, sapatos, acessórios, convites, decoração,
cartório, igreja, altar, praia, campo, salão, quarto, hotel, convidados, familiares, abraços, beijos, dança, lágrimas,
risadas, poses), quantidade de pessoas, interação entre elas e a sequência das imagens.

Nunca classifique por uma única fotografia isolada — interprete o conjunto.

Categorias possíveis: ${CATEGORIES.join(", ")}.
Ângulos narrativos possíveis (1 a 3): ${NARRATIVE_ANGLES.join(", ")}.

Responda SOMENTE com JSON no formato:
{"content_analysis":{"category":"","confidence":0.0,"narrative_angles":[],"visible_elements":[],
"scene_summary":"","people_observed":"","environment":"","mood":"","suggested_caption_length":"CURTA|MEDIA|LONGA","commercial_cta":false}}

"scene_summary" deve descrever objetivamente o que é visível, sem inventar fatos sobre as pessoas.
"suggested_caption_length": quanto menos contexto real do fotógrafo houver, menor deve ser a legenda.`;

    const analysisRaw = await callGateway(
      [
        { role: "system", content: analysisSystem },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Contexto informado pelo fotógrafo (pode estar incompleto — não invente o que faltar):\n${JSON.stringify(
                { project_context: projectContext },
                null,
                2,
              )}\n\nAnalise as ${imageUrls.length} fotografias abaixo, na ordem do carrossel.`,
            },
            ...imageParts,
          ],
        },
      ],
      apiKey,
      true,
    );

    const analysisJson = parseJsonLoose(analysisRaw);
    const analysis = analysisJson?.content_analysis ?? {
      category: "GENERICO",
      confidence: 0.3,
      narrative_angles: [],
      visible_elements: [],
      scene_summary: "",
      suggested_caption_length: "CURTA",
      commercial_cta: false,
    };

    const category = CATEGORIES.includes(analysis.category)
      ? analysis.category
      : "GENERICO";

    const hasRealContext = [
      projectContext.people_names,
      projectContext.location,
      projectContext.story,
    ].some((v) => (v ?? "").toString().trim().length > 3);

    const desiredLength =
      preferences.length && preferences.length !== "AUTO"
        ? preferences.length
        : hasRealContext
          ? analysis.suggested_caption_length || "MEDIA"
          : "CURTA";

    // ===== ETAPA 2 — GERAÇÃO DA LEGENDA =====
    const captionSystem = `Você escreve legendas de Instagram como o próprio fotógrafo que esteve presente no momento.

${STYLE_RULES}

ORIENTAÇÃO PARA A CATEGORIA ${category}:
${CATEGORY_GUIDE[category]}

PREFERÊNCIAS DO FOTÓGRAFO:
- Tom de voz: ${preferences.tone ?? "Automático (escolha o mais adequado às imagens)"}
- Tamanho alvo: ${desiredLength}
- Uso de emojis: ${preferences.emojis ?? "Pouco"}
- Uso de CTA comercial: ${preferences.cta ?? (analysis.commercial_cta ? "Às vezes" : "Nunca")}

REFERÊNCIAS DE ESCRITA (apenas tom e ritmo — NUNCA copie frases):
${REFERENCE_CAPTIONS}
${
  preferences.style_examples?.length
    ? `\nEXEMPLOS DO PRÓPRIO FOTÓGRAFO (prioridade máxima de estilo):\n${preferences.style_examples
        .slice(0, 5)
        .join("\n---\n")}`
    : ""
}

Responda SOMENTE com JSON: {"caption":"texto completo da legenda com quebras de linha"}`;

    const captionRaw = await callGateway(
      [
        { role: "system", content: captionSystem },
        {
          role: "user",
          content: JSON.stringify(
            {
              content_analysis: { ...analysis, category },
              project_context: projectContext,
              instrucao:
                "Escreva a legenda usando o contexto visual identificado e apenas os dados reais informados pelo fotógrafo. Nunca invente nomes, locais ou histórias.",
            },
            null,
            2,
          ),
        },
      ],
      apiKey,
      true,
    );

    const captionJson = parseJsonLoose(captionRaw);
    const caption = stripEmDashes((captionJson?.caption ?? "").toString().trim());
    if (!caption) return json({ error: "A IA não retornou uma legenda" }, 502);

    return json({
      caption,
      analysis: { ...analysis, category, suggested_caption_length: desiredLength },
      images_analyzed: imageUrls.length,
    });
  } catch (err) {
    console.error("generate-carousel-caption error:", err);
    return json({ error: (err as Error)?.message ?? "Erro inesperado" }, 500);
  }
});