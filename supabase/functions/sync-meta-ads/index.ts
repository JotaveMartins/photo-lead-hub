import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const META_API_VERSION = "v21.0";

function objectiveToResultType(objective: string | null | undefined): string | null {
  if (!objective) return null;
  const o = objective.toUpperCase();
  if (o.includes("ENGAGEMENT") || o.includes("MESSAGE")) return "messages";
  if (o.includes("LEAD")) return "leads";
  if (o.includes("SALES") || o.includes("PURCHASE") || o.includes("CONVERSION")) return "purchases";
  if (o.includes("TRAFFIC")) return "traffic";
  if (o.includes("AWARENESS") || o.includes("REACH")) return "awareness";
  return null;
}

function extractResults(actions: any[] | undefined, resultType: string | null): { results: number; cpr: number | null } {
  if (!actions || !Array.isArray(actions) || !resultType) return { results: 0, cpr: null };
  let count = 0;
  for (const a of actions) {
    const t = (a.action_type || "").toLowerCase();
    if (resultType === "messages" && (t.includes("messaging_conversation_started") || t === "onsite_conversion.messaging_conversation_started_7d")) {
      count += Number(a.value || 0);
    } else if (resultType === "leads" && (t === "lead" || t.includes("leadgen") || t.includes("onsite_conversion.lead_grouped"))) {
      count += Number(a.value || 0);
    } else if (resultType === "purchases" && (t === "purchase" || t.includes("offsite_conversion.fb_pixel_purchase"))) {
      count += Number(a.value || 0);
    } else if (resultType === "traffic" && (t === "link_click" || t === "landing_page_view")) {
      count += Number(a.value || 0);
    }
  }
  return { results: count, cpr: null };
}

async function fetchAllPages(url: string): Promise<any[]> {
  const out: any[] = [];
  let next: string | null = url;
  while (next) {
    const r = await fetch(next);
    const j = await r.json();
    if (!r.ok) {
      throw new Error(`Meta API error ${j?.error?.code ?? r.status}: ${j?.error?.message ?? r.statusText}`);
    }
    if (Array.isArray(j.data)) out.push(...j.data);
    next = j?.paging?.next ?? null;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const META_TOKEN = Deno.env.get("META_ACCESS_TOKEN");
    if (!META_TOKEN) {
      return new Response(JSON.stringify({ error: "META_ACCESS_TOKEN not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86400000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const since: string = body.since || fmt(yesterday);
    const until: string = body.until || fmt(today);

    // Build accounts list
    let accounts: { ad_account_id: string; client_id: string | null }[] = [];
    if (body.ad_account_id) {
      const acc = String(body.ad_account_id);
      accounts = [{ ad_account_id: acc.startsWith("act_") ? acc : `act_${acc}`, client_id: null }];
    } else {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, meta_ad_account_id")
        .not("meta_ad_account_id", "is", null);
      if (error) throw error;
      accounts = (profiles || []).map((p: any) => ({
        ad_account_id: p.meta_ad_account_id.startsWith("act_") ? p.meta_ad_account_id : `act_${p.meta_ad_account_id}`,
        client_id: p.user_id,
      }));
    }

    let totalFetched = 0;
    let totalUpserted = 0;
    const perAccount: any[] = [];

    for (const { ad_account_id, client_id } of accounts) {
      try {
        // 1. Get campaign objectives
        const campaignsUrl = `https://graph.facebook.com/${META_API_VERSION}/${ad_account_id}/campaigns?fields=id,objective&limit=200&access_token=${META_TOKEN}`;
        const campaigns = await fetchAllPages(campaignsUrl);
        const objectiveMap = new Map<string, string>();
        for (const c of campaigns) objectiveMap.set(c.id, c.objective);

        // 2. Get insights
        const fields = "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,clicks,ctr,cpm,actions";
        const timeRange = encodeURIComponent(JSON.stringify({ since, until }));
        const insightsUrl = `https://graph.facebook.com/${META_API_VERSION}/${ad_account_id}/insights?level=ad&time_increment=1&time_range=${timeRange}&fields=${fields}&limit=500&access_token=${META_TOKEN}`;
        const insights = await fetchAllPages(insightsUrl);

        const rows = insights.map((row: any) => {
          const objective = objectiveMap.get(row.campaign_id) || null;
          const result_type = objectiveToResultType(objective);
          const { results } = extractResults(row.actions, result_type);
          const spend = Number(row.spend || 0);
          const cpr = results > 0 ? spend / results : null;
          // messaging conversations
          let msgConvs = 0;
          if (Array.isArray(row.actions)) {
            for (const a of row.actions) {
              const t = (a.action_type || "").toLowerCase();
              if (t.includes("messaging_conversation_started")) msgConvs += Number(a.value || 0);
            }
          }
          const cpmc = msgConvs > 0 ? spend / msgConvs : null;
          return {
            tenant_id: null,
            client_id,
            date: row.date_start,
            ad_account_id,
            campaign_id: row.campaign_id || null,
            campaign_name: row.campaign_name || "(sem nome)",
            adset_id: row.adset_id || null,
            adset_name: row.adset_name || "(sem nome)",
            ad_id: row.ad_id || null,
            ad_name: row.ad_name || "(sem nome)",
            spend,
            impressions: Number(row.impressions || 0),
            reach: Number(row.reach || 0),
            clicks: Number(row.clicks || 0),
            ctr: row.ctr != null ? Number(row.ctr) : null,
            cpm: row.cpm != null ? Number(row.cpm) : null,
            messaging_conversations_started: msgConvs,
            cost_per_messaging_conversation: cpmc,
            campaign_objective: objective,
            result_type,
            results,
            cost_per_result: cpr,
          };
        });

        totalFetched += rows.length;

        // Dedupe by conflict key (date, ad_account_id, campaign_name, adset_name, ad_name)
        // Meta may return multiple rows for the same ad in a day (different action breakdowns),
        // and ads with the same display name but different IDs collide on the unique index.
        const dedupMap = new Map<string, any>();
        for (const r of rows) {
          const key = `${r.date}|${r.ad_account_id}|${r.campaign_name}|${r.adset_name}|${r.ad_name}`;
          const prev = dedupMap.get(key);
          if (!prev) { dedupMap.set(key, r); continue; }
          prev.spend += r.spend;
          prev.impressions += r.impressions;
          prev.reach += r.reach;
          prev.clicks += r.clicks;
          prev.messaging_conversations_started += r.messaging_conversations_started;
          prev.results += r.results;
          prev.cost_per_messaging_conversation = prev.messaging_conversations_started > 0 ? prev.spend / prev.messaging_conversations_started : null;
          prev.cost_per_result = prev.results > 0 ? prev.spend / prev.results : null;
        }
        const dedupedRows = Array.from(dedupMap.values());

        // Upsert in batches of 50
        let upserted = 0;
        for (let i = 0; i < dedupedRows.length; i += 50) {
          const batch = dedupedRows.slice(i, i + 50);
          const { error } = await supabase
            .from("meta_daily_ads")
            .upsert(batch, { onConflict: "date,ad_account_id,campaign_name,adset_name,ad_name" });
          if (error) throw error;
          upserted += batch.length;
        }
        totalUpserted += upserted;
        perAccount.push({ account: ad_account_id, fetched: rows.length, deduped: dedupedRows.length, upserted });
      } catch (err: any) {
        perAccount.push({ account: ad_account_id, fetched: 0, upserted: 0, error: err.message });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      period: { since, until },
      accounts_processed: accounts.length,
      total_fetched: totalFetched,
      total_upserted: totalUpserted,
      per_account: perAccount,
      synced_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});