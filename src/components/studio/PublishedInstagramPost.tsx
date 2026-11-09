import { CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReviewLocale } from "@/i18n/ReviewLocale";
import { safeInstagramPermalink } from "@/lib/instagramPublication";

export interface PublishedInstagramResult {
  status: string;
  instagram_media_id: string | null;
  instagram_permalink?: string | null;
  accountUsername?: string | null;
}
/** Visible only for a confirmed publication; no fake accounts or success states. */
const PublishedInstagramPost = ({ post }: { post: PublishedInstagramResult | null | undefined }) => {
  const { t } = useReviewLocale();
  if (post?.status !== "publicado" || !post.instagram_media_id) return null;
  const permalink = safeInstagramPermalink(post.instagram_permalink);
  return <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
    <div className="space-y-1">
      <p className="flex items-center gap-2 text-sm font-medium text-emerald-500"><CheckCircle2 className="h-4 w-4" />{t("Publicado com sucesso no Instagram")}{post.accountUsername && ` (@${post.accountUsername})`}</p>
      <p className="break-all text-xs text-muted-foreground">{t("Instagram Media ID")}: {post.instagram_media_id}</p>
      {!permalink && <p className="text-xs text-muted-foreground">{t("Link da publicação indisponível")}</p>}
    </div>
    {permalink && <Button asChild variant="outline" size="sm"><a href={permalink} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1.5 h-4 w-4" />{t("Abrir publicação no Instagram")}</a></Button>}
  </div>;
};
export default PublishedInstagramPost;
