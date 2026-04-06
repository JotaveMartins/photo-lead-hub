import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import PageTutorial, { type TutorialStep } from "@/components/PageTutorial";

const TUTORIAL_SEEN_KEY = "crm_tutorial_seen";
const YOUTUBE_VIDEO_ID = "U0CQWJsrpWA";

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

interface HelpButtonProps {
  /** Page-specific tutorial steps. If provided, shows step-by-step tutorial instead of video. */
  pageTutorial?: TutorialStep[];
  /** Key for localStorage to track first visit hint */
  pageKey?: string;
}

export const HelpButton = ({ pageTutorial, pageKey }: HelpButtonProps) => {
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const hintKey = pageKey ? `crm_help_hint_${pageKey}` : null;

  useEffect(() => {
    if (hintKey && pageTutorial) {
      const seen = localStorage.getItem(hintKey);
      if (!seen) {
        setShowHint(true);
        localStorage.setItem(hintKey, "true");
        const timer = setTimeout(() => setShowHint(false), 6000);
        return () => clearTimeout(timer);
      }
    }
  }, [hintKey, pageTutorial]);

  const handleClick = () => {
    setShowHint(false);
    setOpen(true);
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
        {/* Hint tooltip */}
        {showHint && (
          <div className="animate-fade-in bg-card border border-border rounded-lg px-3 py-2 shadow-lg max-w-[200px]">
            <p className="text-xs text-foreground font-medium">Precisa de ajuda?</p>
            <p className="text-[11px] text-muted-foreground">Clique aqui para conhecer as funcionalidades desta página.</p>
          </div>
        )}

        <button
          onClick={handleClick}
          className={`flex items-center justify-center w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity ${
            showHint ? "animate-[pulse_1.5s_ease-in-out_infinite]" : ""
          }`}
          title="Ajuda"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {pageTutorial ? (
        <PageTutorial
          open={open}
          onClose={() => setOpen(false)}
          pageName=""
          steps={pageTutorial}
        />
      ) : (
        <TutorialModal forceOpen={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
};
