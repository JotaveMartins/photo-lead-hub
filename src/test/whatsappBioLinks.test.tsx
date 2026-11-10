import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WhatsAppBioLinkCard from "@/components/whatsapp/WhatsAppBioLinkCard";
import { DEFAULT_WHATSAPP_BIO_MESSAGE, normalizeBioPhone, validBioSlug, whatsappBioTarget } from "@/lib/whatsappBioLink";
const mocks=vi.hoisted(()=>({read:vi.fn(),write:vi.fn(),eq:vi.fn(),success:vi.fn(),error:vi.fn()}));
vi.mock("@/hooks/useEffectiveUserId",()=>({useEffectiveUserId:()=>"effective-client"}));
vi.mock("sonner",()=>({toast:{success:mocks.success,error:mocks.error}}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:()=>({select:()=>({eq:mocks.eq}),upsert:mocks.write})}}));
beforeEach(()=>{vi.clearAllMocks();mocks.eq.mockReturnValue({maybeSingle:mocks.read});mocks.read.mockResolvedValue({data:null,error:null});mocks.write.mockResolvedValue({error:null});});
afterEach(cleanup);

describe("WhatsApp bio links",()=>{
 it("keeps the exact message and safely encodes accents, hashtags and query-like text",()=>{
  const message=DEFAULT_WHATSAPP_BIO_MESSAGE+" & assunto=#foto? olá";
  const url=new URL(whatsappBioTarget("5561999999999",message));
  expect(url.origin).toBe("https://wa.me");expect(url.searchParams.get("text")).toBe(message);expect(url.hash).toBe("");
 });
 it("normalizes Brazilian local numbers without changing explicit international DDI",()=>{
  expect(normalizeBioPhone("(61) 99999-9999")).toBe("5561999999999");
  expect(normalizeBioPhone("+1 202 555 0123")).toBe("12025550123");
  expect(normalizeBioPhone("5561999999999")).toBe("5561999999999");
 });
 it("rejects unsafe redirect targets and path-like slugs",()=>{
  for(const value of ["https://evil.com","123?text=x","", "00000000"]) expect(()=>whatsappBioTarget(value,"Oi")).toThrow();
  for(const value of ["../auth","a/b","Abc","ab","-abc","abc-", "a".repeat(51)]) expect(validBioSlug(value)).toBe(false);
  expect(validBioSlug("renato-foto")).toBe(true);
 });
 it("creates a link without a connected instance, under the effective account",async()=>{
  render(<WhatsAppBioLinkCard instances={[]}/>);
  await screen.findByLabelText("WhatsApp com DDD");
  expect(screen.getByLabelText("Mensagem de entrada")).toHaveValue(DEFAULT_WHATSAPP_BIO_MESSAGE);
  fireEvent.change(screen.getByLabelText("WhatsApp com DDD"),{target:{value:"61999999999"}});
  fireEvent.change(screen.getByLabelText("Nome no link"),{target:{value:"renato"}});
  fireEvent.click(screen.getByRole("button",{name:"Criar link"}));
  await waitFor(()=>expect(mocks.write).toHaveBeenCalledWith({user_id:"effective-client",slug:"renato",phone:"5561999999999",message:DEFAULT_WHATSAPP_BIO_MESSAGE},{onConflict:"user_id"}));
  expect(await screen.findByRole("link",{name:"Testar link"})).toHaveAttribute("href","https://crm.avanzodigital.com.br/w/renato");
 });
 it("does not show a generated link when the name is already taken",async()=>{
  mocks.write.mockResolvedValue({error:{code:"23505"}});
  render(<WhatsAppBioLinkCard instances={[]}/>);await screen.findByLabelText("WhatsApp com DDD");
  fireEvent.change(screen.getByLabelText("WhatsApp com DDD"),{target:{value:"61999999999"}});
  fireEvent.change(screen.getByLabelText("Nome no link"),{target:{value:"renato"}});
  fireEvent.click(screen.getByRole("button",{name:"Criar link"}));
  await waitFor(()=>expect(mocks.error).toHaveBeenCalledWith("Esse nome já está em uso. Escolha outro."));
  expect(screen.queryByRole("link",{name:"Testar link"})).not.toBeInTheDocument();
 });
 it("loads the saved link and preserves its URL while the user edits",async()=>{
  mocks.read.mockResolvedValue({data:{slug:"renato",phone:"5561999999999",message:"Oi"},error:null});
  render(<WhatsAppBioLinkCard instances={[]}/>);
  expect(await screen.findByRole("link",{name:"Testar link"})).toHaveAttribute("href","https://crm.avanzodigital.com.br/w/renato");
  fireEvent.change(screen.getByLabelText("Nome no link"),{target:{value:"renato-foto"}});
  expect(screen.getByRole("link",{name:"Testar link"})).toHaveAttribute("href","https://crm.avanzodigital.com.br/w/renato");
  expect(mocks.write).not.toHaveBeenCalled();
 });
 it("fails closed when loading fails instead of overwriting an existing link",async()=>{
  mocks.read.mockResolvedValue({error:{code:"42P01"}});
  render(<WhatsAppBioLinkCard instances={[]}/>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar");
  expect(screen.queryByRole("button",{name:"Criar link"})).not.toBeInTheDocument();
 });
});
