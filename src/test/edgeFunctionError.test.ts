import { describe, expect, it } from "vitest";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { edgeFunctionError } from "@/lib/edgeFunctionError";
const error = (body: unknown, status: number) => new FunctionsHttpError(new Response(JSON.stringify(body), {status}));
describe("Admin account creation errors",()=>{
 it("shows the actual function response instead of the generic SDK message",async()=>{
  expect((await edgeFunctionError(error({error:"A user with this email address has already been registered"},400),"Falha ao criar cliente")).message).toBe("A user with this email address has already been registered");
 });
 it("reads gateway messages and offers a sign-in instruction for expired JWTs",async()=>{
  expect((await edgeFunctionError(error({message:"Invalid JWT"},401),"Falha ao criar cliente")).message).toContain("Entre novamente");
 });
 it("keeps the original response readable for diagnostics",async()=>{
  const response=new Response(JSON.stringify({error:"Database error saving new user"}),{status:400});
  expect((await edgeFunctionError(new FunctionsHttpError(response),"Falha")).message).toBe("Database error saving new user");
  expect(await response.json()).toEqual({error:"Database error saving new user"});
 });
 it("handles non-JSON responses with an actionable fallback and status",async()=>{
  expect((await edgeFunctionError(new FunctionsHttpError(new Response("Bad gateway",{status:502})),"Não foi possível criar o cliente")).message).toContain("HTTP 502");
 });
 it("preserves transport errors without reporting success",async()=>{
  expect((await edgeFunctionError(new Error("Failed to fetch"),"Falha")).message).toBe("Failed to fetch");
 });
});
