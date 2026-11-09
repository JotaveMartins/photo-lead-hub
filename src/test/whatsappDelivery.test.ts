import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { whatsappSentAt } from "../../supabase/functions/_shared/whatsapp-time";
import * as inspection from "../../supabase/functions/diagnose-whatsapp-delivery/inspect";
import { sortInboxMessages } from "@/lib/inboxMessageOrder";

beforeAll(() => vi.stubGlobal("AbortSignal", { timeout: () => new AbortController().signal }));
afterAll(() => vi.unstubAllGlobals());

const instanceId="00000000-0000-0000-0000-000000000001";
const now=Date.parse("2026-11-09T15:00:00Z");
const epoch=Date.parse("2026-11-07T17:00:00Z")/1000;
const requestOptions={ from:"2026-11-07T12:00:00-03:00", to:"2026-11-07T16:00:00-03:00", jids:[] as string[], maxPages:1 };
const response=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status});

describe("WhatsApp original times",()=>{
 it("understands seconds, numeric strings, milliseconds and protobuf Long",()=>{
  for(const value of [epoch,String(epoch),epoch*1000,{low:epoch,high:0,unsigned:true}])
   expect(whatsappSentAt(value,now)).toBe("2026-11-07T17:00:00.000Z");
 });
 it("rejects missing, invalid, implausible and far-future values",()=>{
  for(const value of [null,undefined,"",0,-1,"not a time",{low:"bad",high:0},{},now+3600000,Infinity])
   expect(whatsappSentAt(value,now)).toBeNull();
 });
 it("sorts delayed messages by original time and preserves legacy fallback",()=>{
  const rows=[{id:"recent",timestamp:"2026-11-09T10:00:00Z",created_at:"2026-11-09T10:00:01Z"},{id:"delayed",timestamp:"2026-11-07T17:00:00Z",created_at:"2026-11-09T12:00:00Z"},{id:"legacy",timestamp:null,created_at:"2026-11-08T10:00:00Z"}];
  expect(sortInboxMessages(rows).map(m=>m.id)).toEqual(["delayed","legacy","recent"]);
  expect(rows[0].id).toBe("recent");
 });
});
describe("Provider read-only inspection",()=>{
 it("uses only connectionState and findMessages, returning metadata without message bodies",async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(response({instance:{state:"open"},apikey:"never-return"}))
   .mockResolvedValueOnce(response({messages:{records:[{key:{id:"m1",remoteJid:"123@s.whatsapp.net"},messageTimestamp:epoch,message:{conversation:"private-text"}}]}}));
  const result=await inspection.inspectProvider("https://provider.test","secret","instance/test",requestOptions,fetcher);
  expect(result.state).toBe("open"); expect(result.messages[0].sent_at).toBe("2026-11-07T17:00:00.000Z");
  expect(fetcher.mock.calls.map(c=>[c[0],c[1].method])).toEqual([["https://provider.test/instance/connectionState/instance%2Ftest","GET"],["https://provider.test/chat/findMessages/instance%2Ftest","POST"]]);
  expect(JSON.stringify(result)).not.toMatch(/private-text|secret|never-return/);
 });
 it("marks a full bounded page as incomplete evidence",async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(response({state:"open"})).mockResolvedValueOnce(response(Array.from({length:50},(_,i)=>({key:{id:String(i)},messageTimestamp:epoch}))));
  expect((await inspection.inspectProvider("https://p.test","secret","instance",requestOptions,fetcher)).sample_limited).toBe(true);
 });
 it("treats unexpected response and HTTP failures as errors, not an empty history",async()=>{
  const bad=vi.fn().mockResolvedValueOnce(response({state:"open"})).mockResolvedValueOnce(response({error:"not a collection"}));
  await expect(inspection.inspectProvider("https://p.test","secret","instance",requestOptions,bad)).rejects.toThrow("PROVIDER_UNEXPECTED_RESPONSE");
  await expect(inspection.inspectProvider("https://p.test","secret","instance",requestOptions,vi.fn().mockResolvedValue(response({token:"private"},503)))).rejects.toThrow("PROVIDER_HTTP_503");
 });
});

function endpoint({admin=true,authenticated=true}={}){
 let handler:(req:Request)=>Promise<Response>;
 const inspect=vi.fn(async()=>({state:"open",messages:[{message_id:"m1",sent_at:"2026-11-07T17:00:00.000Z",from_me:false,is_group:false}],sample_limited:false}));
 const from=vi.fn((table:string)=>{
  const data=table==="whatsapp_instances"?[{id:instanceId,user_id:"owner",name:"test",status:"connected"}]:table==="webhook_logs"?[{created_at:"2026-11-08T10:00:00Z",payload:{api_key:"never-return",data:{key:{id:"m1",fromMe:false},messageTimestamp:epoch}}}]:table==="inbox_messages"?[]:null;
  const q:any={select:()=>q,eq:()=>q,in:()=>q,gte:()=>q,lt:()=>q,order:()=>q,limit:()=>q,
   maybeSingle:async()=>({data:{value:{base_url:"https://provider.test",api_key:"never-return"}},error:null}),
   then:(resolve:(value:unknown)=>unknown)=>Promise.resolve(resolve({data,error:null})),
  };return q;
 });
 const client={auth:{getUser:async()=>({data:{user:authenticated?{id:"admin"}:null},error:null})},rpc:vi.fn(async()=>({data:admin,error:null})),from};
 const source=ts.transpileModule(readFileSync("supabase/functions/diagnose-whatsapp-delivery/index.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 runInNewContext(source,{exports:{},require:(name:string)=>name.includes("inspect.ts")?{...inspection,inspectProvider:inspect}:{createClient:()=>client},Deno:{env:{get:()=>"test"},serve:(fn:typeof handler)=>{handler=fn}},Response});
 const call=(body:unknown={instance_ids:[instanceId],from:requestOptions.from,to:requestOptions.to},auth=true)=>handler(new Request("https://example.test",{method:"POST",headers:auth?{Authorization:"Bearer synthetic"}:{},body:JSON.stringify(body)}));
 return {call,inspect,from};
}
describe("Admin diagnostic permissions and sanitized result",()=>{
 it("rejects missing or invalid sessions before any database or provider reads",async()=>{
  const missing=endpoint();expect((await missing.call(undefined,false)).status).toBe(401);expect(missing.from).not.toHaveBeenCalled();
  const invalid=endpoint({authenticated:false});expect((await invalid.call()).status).toBe(401);expect(invalid.inspect).not.toHaveBeenCalled();
 });
 it("rejects ordinary users before reading configurations or instances",async()=>{
  const app=endpoint({admin:false});expect((await app.call()).status).toBe(403);expect(app.from).not.toHaveBeenCalled();expect(app.inspect).not.toHaveBeenCalled();
 });
 it("returns arrival delay and provider IDs without credentials or importing missing messages",async()=>{
  const app=endpoint();const res=await app.call();expect(res.status).toBe(200);const data=await res.json();
  expect(data.read_only).toBe(true);expect(data.results[0].crm_received_sample[0].delay_seconds).toBe(61200);
  expect(data.results[0].provider_messages[0].present_in_inbox).toBe(false);
  expect(data.results[0].queue_status).toBe("not_observed");expect(JSON.stringify(data)).not.toContain("never-return");
 });
 it("rejects unbounded, ambiguous-date and arbitrary-route requests before contacting the provider",async()=>{
  const app=endpoint();
  for(const body of [{instance_ids:[],...requestOptions},{instance_ids:[instanceId],from:"2026-11-07T12:00:00",to:requestOptions.to},{instance_ids:[instanceId],...requestOptions,jids:["../../instance/logout"]}])
   expect((await app.call(body)).status).toBe(400);
  expect(app.inspect).not.toHaveBeenCalled();
 });
});

describe("Real webhook persistence", () => {
 it("saves the original send time separately from receipt time without importing history", async () => {
  let handler: (req: Request) => Promise<Response>;
  let inserted: any;
  const conversation = { id: "conversation", user_id: "owner", lead_id: "existing-lead", status: "open", contact_number: "5585000000000", unread_count: 0 };
  const from = (table: string) => {
   const q: any = {
    select: () => q, eq: () => q, or: () => q, order: () => q, limit: () => q,
    update: () => q,
    insert: (row: unknown) => { if (table === "inbox_messages") inserted = row; return q; },
    maybeSingle: async () => ({ data: table === "whatsapp_instances" ? { id: instanceId, user_id: "owner" } : table === "inbox_conversations" ? conversation : null, error: null }),
    single: async () => ({ data: { id: "message" }, error: null }),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolve({ data: [], error: null })),
   }; return q;
  };
  const source=ts.transpileModule(readFileSync("supabase/functions/evolution-webhook/index.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  runInNewContext(source, { exports: {}, require: (name: string) => name.includes("whatsapp-time") ? { whatsappSentAt } : name.includes("qrcode") ? {} : { createClient: () => ({ from }) }, Deno: { env: { get: () => "synthetic" }, serve: (fn: typeof handler) => { handler=fn; } }, Response, console: { log: vi.fn(), error: vi.fn() } });
  const result=await handler(new Request("https://example.test", { method: "POST", body: JSON.stringify({ event: "MESSAGES_UPSERT", instance: "synthetic", data: { key: { id: "message", remoteJid: "5585000000000@s.whatsapp.net", fromMe: false }, message: { conversation: "Synthetic message" }, messageTimestamp: epoch } }) }));
  expect(result.status).toBe(200);
  expect(inserted.timestamp).toBe("2026-11-07T17:00:00.000Z");
  expect(Date.parse(inserted.created_at)).toBeGreaterThan(Date.parse(inserted.timestamp));
 });
});
