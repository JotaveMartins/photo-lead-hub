import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, X } from "lucide-react";

const TUTORIAL_SEEN_KEY = "crm_tutorial_seen";
const YOUTUBE_VIDEO_ID = "SEU_VIDEO_ID_AQUI"; // Substitua pelo ID do vídeo do YouTube

interface TutorialModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const TutorialModal = ({ forceOpen, onClose }: TutorialModalProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen !== undefined) {
      setOpen(forceOpen);
      return;
    }
    const seen = localStorage.getItem(TUTORIAL_SEEN_KEY);
    if (!seen) {
      setOpen(true);
    }
  }, [forceOpen]);

  const handleClose = () => {
    localStorage.setItem(TUTORIAL_SEEN_KEY, "true");
    setOpen(false);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[720px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-lg">Tutorial do CRM</DialogTitle>
          <DialogDescription>Assista ao vídeo abaixo para aprender a usar o sistema.</DialogDescription>
        </DialogHeader>
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0`}
            title="Tutorial do CRM"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="p-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleClose}>Entendi</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const HelpButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
        title="Ajuda"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
      <TutorialModal forceOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};
