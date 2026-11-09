import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountDirectoryFilters from "@/components/admin/AccountDirectoryFilters";
import UsageTab from "@/components/admin/UsageTab";
import { populationFixtures } from "./fixtures/accountPopulation";
import { directoryMatches, directorySearchMatches, type DirectorySegment, type DirectoryStatus } from "@/lib/accountSegments";
import { scoreAccounts, type UsageRow } from "@/lib/usageScore";

const data=vi.hoisted(()=>({calls:[] as string[]}));
vi.mock("@/hooks/usePrivacyMode",()=>({usePrivacyMode:()=>({enabled:false}),maskName:(i:number)=>`Conta ${i}`}));
vi.mock("@/hooks/useUsageMetrics",()=>({useUsageMetrics:(_month:Date,population:string)=>{data.calls.push(population);const id=population==="trials"?"trial":"client";return {accounts:scoreAccounts([{user_id:id,nome:id==="trial"?"Ítalo Guedes":"Cliente real",email:"example@example.test",leads:1,pipeline:1,tarefas:0,inbox:0,financeiro:0,agenda:0,clientes:0,entregas:0,contratos:0,estudio:0,dias_ativos:1,acessou_no_mes:true,ultimo_acesso:null} as UsageRow]),accountDetails:populationFixtures(),previousByUser:new Map(),isLoading:false,error:null,refetch:vi.fn()};}}));
afterEach(()=>{cleanup();data.calls=[];});
function Directory(){
 const [segment,setSegment]=useState<DirectorySegment>("customers");const [status,setStatus]=useState<DirectoryStatus>("active");const [search,setSearch]=useState("");
 const accounts=populationFixtures();const names=[{id:"client",nome:"Cliente real"},{id:"trial",nome:"Ítalo Guedes"},{id:"blocked",nome:"Cliente bloqueado"}];
 return <><AccountDirectoryFilters segment={segment} status={status} search={search} onSegment={setSegment} onStatus={setStatus} onSearch={setSearch} counts={{customers:1,trials:1,expiredTrials:1,blocked:1}} ready/>
 <ul aria-label="Contas filtradas">{names.filter(row=>directoryMatches(accounts.get(row.id)!,{segment,status})&&directorySearchMatches(row,search)).map(row=><li key={row.id}>{row.nome}</li>)}</ul></>;
}
describe("Account directory and separate trial usage",()=>{
 it("defaults to active customers and lets the admin switch to trials or blocked accounts",()=>{
  render(<Directory/>);const list=screen.getByRole("list",{name:"Contas filtradas"});
  expect(within(list).getByText("Cliente real")).toBeVisible();expect(within(list).queryByText("Ítalo Guedes")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:/Em teste grátis/}));expect(within(list).getByText("Ítalo Guedes")).toBeVisible();expect(within(list).queryByText("Cliente real")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Buscar conta"),{target:{value:"italo"}});expect(within(list).getByText("Ítalo Guedes")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Buscar conta"),{target:{value:""}});
  fireEvent.click(screen.getByRole("button",{name:/Contas bloqueadas/}));expect(within(list).getByText("Cliente bloqueado")).toBeVisible();expect(within(list).queryByText("Ítalo Guedes")).not.toBeInTheDocument();
 });
 it("switches usage population without mixing client and trial names",()=>{
  render(<UsageTab/>);expect(screen.getByRole("heading",{name:"Uso dos clientes"})).toBeVisible();expect(screen.queryByText("Ítalo Guedes")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Testes grátis"}));expect(screen.getByRole("heading",{name:"Uso dos testes grátis"})).toBeVisible();expect(screen.getAllByText("Ítalo Guedes").length).toBeGreaterThan(0);expect(screen.queryByText("Cliente real")).not.toBeInTheDocument();
  expect(data.calls.at(-1)).toBe("trials");
 });
 it("exports only the selected trial population and identifies it in the filename",async()=>{
  const oldCreate=Object.getOwnPropertyDescriptor(URL,"createObjectURL");const oldRevoke=Object.getOwnPropertyDescriptor(URL,"revokeObjectURL");
  let exported:Blob|undefined;let filename="";
  Object.defineProperty(URL,"createObjectURL",{configurable:true,value:(blob:Blob)=>{exported=blob;return "blob:synthetic";}});
  Object.defineProperty(URL,"revokeObjectURL",{configurable:true,value:vi.fn()});
  const click=vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(function(this:HTMLAnchorElement){filename=this.download;});
  try{
   render(<UsageTab/>);fireEvent.click(screen.getByRole("button",{name:"Testes grátis"}));fireEvent.click(screen.getByRole("button",{name:"CSV"}));
   const text=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsText(exported!);});
   expect(filename).toMatch(/^uso-crm-testes-/);expect(text).toContain("Ítalo Guedes");expect(text).not.toContain("Cliente real");
  }finally{click.mockRestore();if(oldCreate)Object.defineProperty(URL,"createObjectURL",oldCreate);else Reflect.deleteProperty(URL,"createObjectURL");if(oldRevoke)Object.defineProperty(URL,"revokeObjectURL",oldRevoke);else Reflect.deleteProperty(URL,"revokeObjectURL");}
 });

});
