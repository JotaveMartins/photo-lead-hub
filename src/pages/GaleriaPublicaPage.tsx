import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Images } from "lucide-react";

/** Página pública da galeria (estrutura inicial: as fotos aparecem após o envio real). */
const GaleriaPublicaPage = () => {
  const { slug } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["gallery-public", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await supabase
        .from("galleries")
        .select("name, event_date, status, media_count")
        .eq("slug", slug!)
        .eq("status", "published")
        .is("deleted_at", null)
        .maybeSingle();
      return data as any;
    },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      {isLoading ? (
        <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Esta galeria não está disponível.</p>
      ) : (
        <>
          <Images className="mb-4 h-10 w-10 text-primary" />
          <h1 className="font-display text-3xl font-bold text-foreground">{data.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.media_count} fotos · as fotos aparecerão aqui em breve.
          </p>
        </>
      )}
    </div>
  );
};

export default GaleriaPublicaPage;
