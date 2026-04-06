import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface TutorialStep {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface PageTutorialProps {
  open: boolean;
  onClose: () => void;
  pageName: string;
  steps: TutorialStep[];
}

const PageTutorial = ({ open, onClose, pageName, steps }: PageTutorialProps) => {
  const [current, setCurrent] = useState(0);

  const handleClose = () => {
    setCurrent(0);
    onClose();
  };

  const next = () => {
    if (current < steps.length - 1) setCurrent(current + 1);
    else handleClose();
  };

  const prev = () => {
    if (current > 0) setCurrent(current - 1);
  };

  const step = steps[current];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <div className="p-6">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          {step.icon && (
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                {step.icon}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
          </div>

          {/* Step counter */}
          <p className="text-xs text-muted-foreground/60 text-center mb-4">
            {current + 1} de {steps.length}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={prev}
              disabled={current === 0}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>

            <Button
              size="sm"
              onClick={next}
              className="gap-1 bg-primary text-primary-foreground"
            >
              {current === steps.length - 1 ? "Concluir" : "Próximo"}
              {current < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PageTutorial;
