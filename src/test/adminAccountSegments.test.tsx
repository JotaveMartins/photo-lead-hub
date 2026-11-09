import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminAccountSegments } from "@/hooks/useAdminAccountSegments";
import { accessFixture } from "./fixtures/accountPopulation";

const state=vi.hoisted(()=>({admin:true,fail:false,enabled:vi.fn(),from:vi.fn()}));
vi.mock("@/hooks/useUserRole",()=>({useUserRole:()=>({isAdmin:state.admin})}));
vi.mock("@/hooks/useAccountAccess",()=>({useAdminAccountAccess:(enabled:boolean)=>{state.enabled(enabled);return {data:[{created_at:"2026-01-01",access:accessFixture("client","legacy","legacy")},{created_at:"2026-01-01",access:accessFixture("trial","trial","trial")},{created_at:"2026-01-01",access:accessFixture("tester","legacy","legacy")}],isSuccess:enabled,isLoading:false,error:null,refetch:vi.fn()};}}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:(table:string)=>{
 state.from(table);const q:any={select:()=>q,eq:()=>q,order:()=>q,range:async()=>state.fail?{data:null,error:new Error("flags unavailable")}:{data:table==="profiles"?[{user_id:"client",bloqueado:false,plano_basico:false,meta_ad_account_id:"123"},{user_id:"trial",bloqueado:false,plano_basico:false,meta_ad_account_id:null},{user_id:"tester",bloqueado:false,plano_basico:false,meta_ad_account_id:null}]:[{user_id:"tester"}],error:null}};return q;
}}}));
let client:QueryClient;
const wrapper=({children}:{children:ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>;
beforeEach(()=>{state.admin=true;state.fail=false;vi.clearAllMocks();client=new QueryClient({defaultOptions:{queries:{retry:false}}});});
afterEach(()=>{cleanup();client.clear();});
describe("Current account population metadata",()=>{
 it("joins existing access modes, profile flags and tester role",async()=>{
  const {result}=renderHook(useAdminAccountSegments,{wrapper});await waitFor(()=>expect(result.current.isReady).toBe(true));
  expect(result.current.customerIds).toEqual(["client"]);expect(result.current.byUser.get("trial")!.segment).toBe("trials");expect(result.current.byUser.get("tester")!.segment).toBe("internal");
  expect(result.current.customerAdAccountIds).toEqual(["123","act_123"]);
 });
 it("fails closed when profile/role metadata cannot be read",async()=>{
  state.fail=true;const {result}=renderHook(useAdminAccountSegments,{wrapper});await waitFor(()=>expect(result.current.error).toBeTruthy());
  expect(result.current.isReady).toBe(false);expect(result.current.customerIds).toEqual([]);expect(result.current.byUser.size).toBe(0);
 });
 it("does not read the admin directory for ordinary users",()=>{
  state.admin=false;const {result}=renderHook(useAdminAccountSegments,{wrapper});
  expect(state.enabled).toHaveBeenCalledWith(false);expect(state.from).not.toHaveBeenCalled();expect(result.current.isReady).toBe(false);
 });
});
