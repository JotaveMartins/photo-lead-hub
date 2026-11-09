import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accessFixture, populationFixtures } from "./fixtures/accountPopulation";
import { customerAdAccountIds, describeAccount, directoryMatches, directorySearchMatches, existedInUsageMonth, inUsagePopulation, isActiveCustomer } from "@/lib/accountSegments";
import { useUsageMetrics } from "@/hooks/useUsageMetrics";
import { useReportData } from "@/hooks/useReportData";
import { useMetaAdsReport } from "@/hooks/useMetaAdsReport";

const state=vi.hoisted(()=>({admin:true,ready:true,owner:"admin",directory:null as any,calls:[] as {table:string;method:string;value:any}[]}));
vi.mock("@/hooks/useUserRole",()=>({useUserRole:()=>({isAdmin:state.admin})}));
vi.mock("@/contexts/AuthContext",()=>({useAuth:()=>({user:{id:state.owner}})}));
vi.mock("@/hooks/useEffectiveUserId",()=>({useEffectiveUserId:()=>state.owner}));
vi.mock("@/hooks/useAdminAccountSegments",()=>({useAdminAccountSegments:()=>({...state.directory,isReady:state.ready,isLoading:!state.ready,error:null,refetch:vi.fn()})}));
const metric=(userId:string)=>({user_id:userId,nome:userId,email:`${userId}@example.test`,leads:userId==="trial"?100000:5,pipeline:3,tarefas:1,inbox:2,financeiro:1,agenda:1,clientes:0,entregas:0,contratos:0,estudio:0,dias_ativos:2,acessou_no_mes:true,ultimo_acesso:null});
function builder(table:string){
 let field:string|undefined, ids:string[]|undefined, equality:[string,unknown]|undefined;
 const result=()=>{
  let data:any[];
  if(table==="metrics")data=[...state.directory.byUser.keys()].map(metric);
  else if(table==="meta_daily_ads") data=[{id:"1",client_id:"client",ad_account_id:"123",spend:10},{id:"2",client_id:null,ad_account_id:"act_123",spend:5},{id:"3",client_id:"trial",ad_account_id:"123",spend:999},{id:"4",client_id:"blocked",ad_account_id:"123",spend:999},{id:"5",client_id:null,ad_account_id:"unknown",spend:999}];
  else data=[...state.directory.byUser.keys()].map(id=>({id:`${table}-${id}`,user_id:id,lead_id:`lead-${id}`,nome:id,email:`${id}@example.test`,created_at:"2026-01-01",meta_ad_account_id:null}));
  if(field&&ids)data=data.filter(row=>ids!.includes(row[field!]));
  if(equality)data=data.filter(row=>row[equality![0]]===equality![1]);
  return {data,error:null};
 };
 const q:any={select:()=>q,order:()=>q,range:()=>q,gte:()=>q,lte:()=>q,
  in:(key:string,value:string[])=>{field=key;ids=value;state.calls.push({table,method:"in",value:[key,value]});return q;},
  eq:(key:string,value:unknown)=>{equality=[key,value];state.calls.push({table,method:"eq",value:[key,value]});return q;},
  or:(value:string)=>{state.calls.push({table,method:"or",value});return q;},
  maybeSingle:async()=>({data:{meta_ad_account_id:"123"},error:null}),
  then:(resolve:(v:unknown)=>unknown)=>Promise.resolve(resolve(result())),
 };return q;
}
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:(table:string)=>{state.calls.push({table,method:"from",value:null});return builder(table);},rpc:()=>builder("metrics")}}));
let client:QueryClient;
const wrapper=({children}:{children:ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>;
beforeEach(()=>{state.admin=true;state.ready=true;state.owner="admin";state.calls=[];const byUser=populationFixtures();state.directory={byUser,customerIds:[...byUser.values()].filter(isActiveCustomer).map(a=>a.userId).sort(),customerAdAccountIds:customerAdAccountIds(byUser.values())};client=new QueryClient({defaultOptions:{queries:{retry:false}}});});
afterEach(()=>{cleanup();client.clear();});

describe("Account classification and management",()=>{
 it("keeps customers, free trials, internal accounts and unknowns distinct",()=>{
  const accounts=populationFixtures();
  expect(accounts.get("client")!.segment).toBe("customers");expect(accounts.get("legacy")!.segment).toBe("customers");
  expect(accounts.get("trial")!.segment).toBe("trials");expect(accounts.get("expired-trial")!.segment).toBe("trials");
  expect(accounts.get("admin")!.segment).toBe("internal");expect(accounts.get("tester")!.segment).toBe("internal");
  expect(accounts.get("unknown")!.segment).toBe("unclassified");
 });
 it("converts a trial to customer based on its current mode, not a retained trial start",()=>{
  const access={...accessFixture("converted","manual","manual"),trial_started_at:"2026-10-01"};
  expect(isActiveCustomer(describeAccount({userId:"converted",access}))).toBe(true);
 });
 it("excludes blocked accounts even if another cached source still says active",()=>{
  const account=describeAccount({userId:"stale",blocked:true,access:accessFixture("stale","manual","manual")});
  expect(isActiveCustomer(account)).toBe(false);expect(inUsagePopulation(account,"customers")).toBe(false);
  expect(directoryMatches(account,{segment:"all",status:"blocked"})).toBe(true);
 });
 it("retains expired/pending trials for trial follow-up, never customer adoption",()=>{
  for(const id of ["trial","expired-trial","pending"]){const account=populationFixtures().get(id)!;expect(inUsagePopulation(account,"customers")).toBe(false);expect(inUsagePopulation(account,"trials")).toBe(true);}
  expect(inUsagePopulation(populationFixtures().get("blocked-trial")!,"trials")).toBe(false);
 });
 it("does not count accounts in months before they existed",()=>{
  const account=populationFixtures().get("trial")!;
  expect(existedInUsageMonth(account,new Date(2026,9,1))).toBe(false);
  expect(existedInUsageMonth(account,new Date(2026,10,1))).toBe(true);
 });
 it("searches names without requiring accents and keeps filters explicit",()=>{
  expect(directorySearchMatches({nome:"Ítalo Guedes",email:"italo@example.test"},"italo")).toBe(true);
  const trial=populationFixtures().get("trial")!;
  expect(directoryMatches(trial,{segment:"customers",status:"active"})).toBe(false);
  expect(directoryMatches(trial,{segment:"trials",status:"active"})).toBe(true);
 });
 it("does not attribute unlinked ad spend through ambiguous Meta mappings",()=>{
  const accounts=populationFixtures();accounts.set("trial",{...accounts.get("trial")!,adAccountId:"act_123"});
  expect(customerAdAccountIds(accounts.values())).toEqual([]);
 });
});
describe("Consistent usage populations",()=>{
 it("defaults to active customers, preserving exclusion of basic/internal/test accounts",async()=>{
  const {result}=renderHook(()=>useUsageMetrics(new Date(2026,10,1)),{wrapper});
  await waitFor(()=>expect(result.current.isLoading).toBe(false));
  expect(result.current.accounts.map(a=>a.row.user_id).sort()).toEqual(["client","legacy"]);
  expect([...result.current.previousByUser.keys()].sort()).toEqual(["client","legacy"]);
 });
 it("provides an independent trial cohort including expired/pending but no blocked accounts",async()=>{
  const {result}=renderHook(()=>useUsageMetrics(new Date(2026,10,1),"trials"),{wrapper});
  await waitFor(()=>expect(result.current.isLoading).toBe(false));
  expect(result.current.accounts.map(a=>a.row.user_id).sort()).toEqual(["expired-trial","pending","trial"]);
  expect(result.current.previousByUser.has("trial")).toBe(false);
 });
 it("returns no mixed population while classification is loading",async()=>{
  state.ready=false;const {result}=renderHook(()=>useUsageMetrics(new Date(2026,10,1)),{wrapper});
  await waitFor(()=>expect(client.getQueryData(["usage-metrics","2026-11-01"])).toBeDefined());
  expect(result.current.accounts).toEqual([]);expect(result.current.isLoading).toBe(true);
 });
});
describe("Consolidated reports use positive customer membership",()=>{
 it("filters leads, tasks, stages, stage history and profile choices by the same IDs",async()=>{
  const {result}=renderHook(()=>useReportData({clienteUserId:"__all__"}),{wrapper});
  await waitFor(()=>expect(result.current.isLoading).toBe(false));
  for(const rows of [result.current.leads,result.current.tasks,result.current.stages])expect(rows.map((r:any)=>r.user_id).sort()).toEqual(["basic","client","legacy"]);
  expect(result.current.stageHistory).toHaveLength(3);
  expect(result.current.profiles.map(p=>p.user_id).sort()).toEqual(["basic","client","legacy"]);
  for(const table of ["leads","lead_tasks","pipeline_stages","lead_stage_history"])expect(state.calls).toContainEqual({table,method:"in",value:["user_id",["basic","client","legacy"]]});
 });
 it("does not query consolidated data before classification is ready",()=>{
  state.ready=false;const {result}=renderHook(()=>useReportData({clienteUserId:"__all__"}),{wrapper});
  expect(result.current.leads).toEqual([]);
  expect(state.calls.filter(c=>["leads","lead_tasks","pipeline_stages","lead_stage_history"].includes(c.table))).toEqual([]);
 });
 it("does not fall back to all accounts when the customer cohort is empty",async()=>{
  state.directory.customerIds=[];const {result}=renderHook(()=>useReportData({clienteUserId:"__all__"}),{wrapper});
  await waitFor(()=>expect(result.current.isLoading).toBe(false));expect(result.current.leads).toEqual([]);
  expect(state.calls.filter(c=>c.table==="leads")).toEqual([]);
 });
 it("preserves a normal trial user's own reports without admin directory access",async()=>{
  state.admin=false;state.ready=false;state.owner="trial";
  const {result}=renderHook(()=>useReportData(),{wrapper});
  await waitFor(()=>expect(result.current.isLoading).toBe(false));
  expect(result.current.leads.map(r=>r.user_id)).toEqual(["trial"]);
 });
 it("keeps trial/blocked/unlinked ad spend out of the consolidated totals",async()=>{
  const {result}=renderHook(()=>useMetaAdsReport("2026-11-01","2026-11-30","__all__"),{wrapper});
  await waitFor(()=>expect(result.current.isSuccess).toBe(true));
  expect(result.current.data!.reduce((sum,row)=>sum+row.spend,0)).toBe(15);
  expect(state.calls.find(c=>c.table==="meta_daily_ads"&&c.method==="or")!.value).toContain("client_id.in.(basic,client,legacy)");
 });
});
