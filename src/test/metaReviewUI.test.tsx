import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewLocaleProvider, reviewLocaleFor, reviewText } from "@/i18n/ReviewLocale";
import InstagramCard from "@/components/integracoes/InstagramCard";
import ScheduleModal from "@/components/studio/ScheduleModal";
import PostPreviewModal from "@/components/studio/PostPreviewModal";
import PublishedInstagramPost from "@/components/studio/PublishedInstagramPost";
import { safeInstagramPermalink } from "@/lib/instagramPublication";
import { buildDemoCarousel, aiJsonToSlides } from "@/lib/carouselSchema";
import type { InstagramAccount } from "@/hooks/useSocial";

const mock = vi.hoisted(() => ({ invoke: vi.fn(), expired: false, username: "real_review_account" as string | null, accountType: null as string | null }));
vi.mock("@/hooks/useEffectiveUserId", () => ({ useEffectiveUserId: () => "owner" }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mock.invoke } } }));
vi.mock("@/hooks/useSocial", () => ({
 useInstagramAccounts: () => ({ data: [{id:"profile",username:mock.username,instagram_user_id:"178900000000001",status:"connected",account_type:mock.accountType,token_expires_at:mock.expired?"2000-01-01T00:00:00Z":null}],isLoading:false,isError:false,refetch:vi.fn() }),
 useConnectInstagram: () => ({ mutate:vi.fn(),isPending:false }),useDisconnectInstagram: () => ({ mutate:vi.fn(),isPending:false }),
}));
const account: InstagramAccount={id:"profile",username:"real_review_account",instagram_user_id:"178900000000001",status:"connected",token_expires_at:null,created_at:"2026-01-01",profile_picture_url:null};
const photo={id:"photo",project_id:"project",image_url:"original.jpg",storage_path:"original.jpg",filename:"photo.jpg",width:1080,height:1350,orientation:"portrait",upload_order:0,url:"https://images.test/original.jpg",thumbUrl:"https://images.test/thumbnail.jpg"};
const caption="Ensaio real em família. #fotografia #familia";
beforeEach(()=>{mock.expired=false;mock.accountType=null;mock.username="real_review_account";mock.invoke.mockReset();});
afterEach(cleanup);
const renderCard=(admin:boolean)=>render(<QueryClientProvider client={new QueryClient()}><ReviewLocaleProvider locale={reviewLocaleFor(admin,"/integracoes")}><InstagramCard /></ReviewLocaleProvider></QueryClientProvider>);

describe("Isolated administrator review locale",()=>{
 it("enables English only for admins in the two requested areas",()=>{
  for(const path of ["/integracoes","/estudio","/estudio/novo","/estudio/project","/estudio/calendario"]){expect(reviewLocaleFor(true,path)).toBe("en");expect(reviewLocaleFor(false,path)).toBe("pt-BR");}
  for(const path of ["/leads","/admin","/estudio-other","/integracoes/other"]){expect(reviewLocaleFor(true,path)).toBe("pt-BR");}
 });
 it("preserves Portuguese and unknown user/provider content",()=>{
  expect(reviewText("pt-BR","Publicar no Instagram")).toBe("Publicar no Instagram");
  expect(reviewText("en",caption)).toBe(caption);
 });
 it("shows English connection details from actual account data without asserting account type",()=>{
  renderCard(true);
  expect(screen.getByRole("button",{name:"Test connection"})).toBeVisible();
  expect(screen.getByText("178900000000001")).toBeVisible();
  expect(screen.getAllByText("@real_review_account")).toHaveLength(2);
  expect(screen.getByText("Not provided by Instagram")).toBeVisible();
  expect(screen.queryByText("Professional: Business")).not.toBeInTheDocument();
  expect(screen.getByText(/We use the username, account ID/)).toBeVisible();
 });
 it("shows professional type only after the existing API returns it",async()=>{
  mock.invoke.mockResolvedValue({data:{status:"ok",username:"verified_account",instagram_user_id:"178900000000002",account_type:"BUSINESS"},error:null});
  renderCard(true);fireEvent.click(screen.getByRole("button",{name:"Test connection"}));
  expect(await screen.findByText("Professional: Business")).toBeVisible();
  expect(screen.getByText("178900000000002")).toBeVisible();
  expect(mock.invoke).toHaveBeenCalledWith("test-instagram-connection",{body:{target_user_id:"owner",social_account_id:"profile"}});
 });
 it("shows the saved account type right after connecting, without a test",()=>{
  mock.accountType="MEDIA_CREATOR";renderCard(true);
  expect(screen.getByText("Professional: Creator")).toBeVisible();
  expect(mock.invoke).not.toHaveBeenCalled();
 });
 it("keeps ordinary users in Portuguese",()=>{
  renderCard(false);expect(screen.getByRole("button",{name:"Testar conexão"})).toBeVisible();
  expect(screen.queryByRole("button",{name:"Test connection"})).not.toBeInTheDocument();
 });
 it("does not invent a username or display an expired account as connected",()=>{
  mock.expired=true;mock.username=null;renderCard(true);
  expect(screen.getByText(/Connection status: Reconnect required/)).toBeVisible();
  expect(screen.queryByText("@178900000000001")).not.toBeInTheDocument();
 });
});
describe("Photo feed publishing UI",()=>{
 it("supports one photo and one slide without changing generated data",()=>{
  const result=buildDemoCarousel([{id:"photo",shape:"portrait"}],{nome:"Ensaio",tipo_ensaio:"Família",descricao:"Contexto real"},{slideCount:1,photoCount:1});
  const slides=aiJsonToSlides(result);expect(slides).toHaveLength(1);expect(slides[0].photoIds).toEqual(["photo"]);
 });
 it("previews a single photo with the real account and unchanged caption/hashtags",()=>{
  render(<ReviewLocaleProvider locale="en"><PostPreviewModal open onClose={vi.fn()} slides={[{key:"one",layout:"single_full",photoIds:["photo"]}]} caption={caption} photos={[photo]} account={account}/></ReviewLocaleProvider>);
  expect(screen.getByText("Photo feed post")).toBeVisible();expect(screen.getByText(/#fotografia #familia/)).toBeVisible();
  expect(screen.getByRole("img").getAttribute("src")).toBe(photo.thumbUrl);
 });
 it("keeps account IDs and publication callbacks unchanged while translating labels",()=>{
  const confirm=vi.fn();render(<ReviewLocaleProvider locale="en"><ScheduleModal open onClose={vi.fn()} accounts={[account]} selectedAccountId="profile" onAccountChange={vi.fn()} onConfirm={confirm} slideCount={1} caption={caption} imageUrls={[photo.thumbUrl]} initialDate="2099-12-01" initialTime="10:30"/></ReviewLocaleProvider>);
  expect(screen.getByText("Hashtags")).toBeVisible();expect(screen.getByText("#fotografia #familia")).toBeVisible();
  fireEvent.click(screen.getByRole("button",{name:"Publish to Instagram"}));expect(confirm).toHaveBeenCalledWith("now",null,"profile");
 });
 it("never shows success for a failed/unconfirmed publication",()=>{
  render(<ReviewLocaleProvider locale="en"><PublishedInstagramPost post={{status:"falhou",instagram_media_id:null}}/></ReviewLocaleProvider>);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
 });
 it("opens only a real Instagram permalink and never constructs one from the Graph ID",()=>{
  const {rerender}=render(<ReviewLocaleProvider locale="en"><PublishedInstagramPost post={{status:"publicado",instagram_media_id:"published-id",instagram_permalink:"https://www.instagram.com/p/RealPost123/",accountUsername:"real_review_account"}}/></ReviewLocaleProvider>);
  expect(screen.getByRole("link",{name:"Open post on Instagram"})).toHaveAttribute("href","https://www.instagram.com/p/RealPost123/");
  rerender(<ReviewLocaleProvider locale="en"><PublishedInstagramPost post={{status:"publicado",instagram_media_id:"published-id",instagram_permalink:null}}/></ReviewLocaleProvider>);
  expect(screen.getByText("Post link unavailable")).toBeVisible();expect(screen.queryByRole("link")).not.toBeInTheDocument();
 });
 it("rejects non-Instagram, script, profile and credential-bearing URLs",()=>{
  for(const url of ["javascript:alert(1)","https://instagram.com.evil.test/p/x/","https://www.instagram.com/user/","https://secret@www.instagram.com/p/x/"])expect(safeInstagramPermalink(url)).toBeNull();
 });
});
