import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReviewLocaleProvider } from "@/i18n/ReviewLocale";
import ProjetoPage from "@/pages/estudio/ProjetoPage";

const mocks=vi.hoisted(()=>({ save:vi.fn(async()=>"carousel"), update:vi.fn(async()=>undefined) }));
vi.mock("@/hooks/useEffectiveUserId",()=>({useEffectiveUserId:()=>"owner"}));
vi.mock("@/hooks/useStudio",()=>({
 MAX_PHOTOS_PER_PROJECT:30,
 useProject:()=>({data:{id:"project",nome:"Casamento",tipo_ensaio:"Família",status:"Rascunho",descricao:"Texto do usuário"},isLoading:false}),
 useProjectPhotos:()=>({data:[]}),useCarousel:()=>({data:{id:"carousel",legenda:"Texto original #ensaio",slides:[{key:"one",layout:"single_full",photoIds:["photo"]}]}}),
 useSaveCarousel:()=>({mutateAsync:mocks.save,isPending:false}),useUpdateProjectStatus:()=>({mutateAsync:mocks.update}),
 useUploadPhotos:()=>({isPending:false,mutate:vi.fn()}),useDeletePhoto:()=>({mutate:vi.fn()}),
}));
vi.mock("@/hooks/useSocial",()=>({useScheduledPosts:()=>({data:[]}),useInstagramAccounts:()=>({data:[],isLoading:false,isError:false}),useCarouselScheduledPost:()=>null,useSchedulePost:()=>({}),usePublishPost:()=>({})}));
vi.mock("@/hooks/useCaptionAi",()=>({useGenerateCaption:()=>({isPending:false})}));
vi.mock("@/components/studio/CarouselEditor",()=>({default:({onApprove,caption,status}:any)=><div><p>{caption}</p><p data-testid="raw-status">{status}</p><button onClick={onApprove}>Approve content</button></div>}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe("Review translation does not change stored Studio data",()=>{
 it("keeps user content and approval payloads in their original form",async()=>{
  render(<MemoryRouter initialEntries={["/estudio/project"]}><ReviewLocaleProvider locale="en"><Routes><Route path="/estudio/:id" element={<ProjetoPage/>}/></Routes></ReviewLocaleProvider></MemoryRouter>);
  await screen.findByText("Texto original #ensaio");
  expect(screen.getByRole("heading",{name:"Casamento"})).toBeVisible();
  expect(screen.getByText("Texto do usuário")).toBeVisible();
  expect(screen.getByTestId("raw-status")).toHaveTextContent("Rascunho");
  fireEvent.click(screen.getByRole("button",{name:"Approve content"}));
  await waitFor(()=>expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({status:"Aprovado",legenda:"Texto original #ensaio"})));
  expect(mocks.update).toHaveBeenCalledWith({id:"project",status:"Aprovado"});
 });
});
