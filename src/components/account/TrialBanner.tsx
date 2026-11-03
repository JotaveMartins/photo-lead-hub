import { Link } from "react-router-dom";
import { Clock3 } from "lucide-react";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

const TrialBanner = ({ impersonating = false }: { impersonating?: boolean }) => {
  const userId = useEffectiveUserId();
  const { data } = useAccountAccess(userId);
  if (data?.status !== "trial") return null;
  const days = data.days_remaining;
  return <div role="status" className={`sticky z-30 mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm backdrop-blur ${impersonating ? "top-[97px] lg:top-8" : "top-[65px] lg:top-0"} ${days <= 7 ? "border-amber-500/30 bg-background/95 text-amber-500" : "border-primary/30 bg-background/95 text-primary"}`}>
    <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 shrink-0" /><span>
      Seu teste grátis: <strong>{days} {days === 1 ? "dia restante" : "dias restantes"}</strong>
    </span></span>
    {!impersonating && <Link to="/assinatura" className="font-medium underline underline-offset-4">Ver planos</Link>}
  </div>;
};
export default TrialBanner;
