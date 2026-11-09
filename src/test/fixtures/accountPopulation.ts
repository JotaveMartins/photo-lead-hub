import type { AccountAccess } from "@/lib/accountAccess";
import { describeAccount } from "@/lib/accountSegments";

export const accessFixture = (userId: string, mode: AccountAccess["mode"], status: AccountAccess["status"]): AccountAccess => ({
 user_id:userId,mode,status,allowed:["legacy","manual","trial","admin"].includes(status),plan:mode==="manual"?"anual":null,
 trial_started_at:mode==="trial"?"2026-11-01T00:00:00Z":null,expires_at:mode==="legacy"?null:"2027-01-01T00:00:00Z",
 server_now:"2026-11-09T12:00:00Z",days_remaining:53,
});
export const populationFixtures = () => {
 const rows = [
  describeAccount({userId:"client",access:accessFixture("client","manual","manual"),createdAt:"2026-01-01",adAccountId:"123"}),
  describeAccount({userId:"legacy",access:accessFixture("legacy","legacy","legacy"),createdAt:"2026-01-01"}),
  describeAccount({userId:"basic",access:accessFixture("basic","legacy","legacy"),createdAt:"2026-01-01",basic:true}),
  describeAccount({userId:"trial",access:accessFixture("trial","trial","trial"),createdAt:"2026-11-09"}),
  describeAccount({userId:"expired-trial",access:accessFixture("expired-trial","trial","expired"),createdAt:"2026-09-01"}),
  describeAccount({userId:"pending",access:accessFixture("pending","trial","pending_confirmation"),createdAt:"2026-11-02"}),
  describeAccount({userId:"blocked",access:accessFixture("blocked","manual","blocked"),createdAt:"2026-01-01",blocked:true}),
  describeAccount({userId:"blocked-trial",access:accessFixture("blocked-trial","trial","blocked"),createdAt:"2026-01-01",blocked:true}),
  describeAccount({userId:"expired-client",access:accessFixture("expired-client","manual","expired"),createdAt:"2026-01-01"}),
  describeAccount({userId:"admin",access:accessFixture("admin","legacy","admin"),createdAt:"2026-01-01"}),
  describeAccount({userId:"tester",access:accessFixture("tester","trial","trial"),tester:true,createdAt:"2026-01-01"}),
  describeAccount({userId:"unknown",createdAt:"2026-01-01"}),
 ];
 return new Map(rows.map(row=>[row.userId,row]));
};
