import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import DatePickerField from "@/components/DatePickerField";
import { CalendarCheck, ArrowRight } from "lucide-react";

interface FollowUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "activate" | "next";
  nextNumber: number;
  leadName: string;
  onConfirm: (date: string) => void;
  onDecline: () => void;
}

const FollowUpModal = ({
  open, onOpenChange, mode, nextNumber, leadName, onConfirm, onDecline,
}: FollowUpModalProps) => {
  const defaultDays = 3;
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + defaultDays);
  const defaultDateStr = `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, "0")}-${String(defaultDate.getDate()).padStart(2, "0")}`;

  const [dueDate, setDueDate] = useState(defaultDateStr);

  useEffect(() => {
    if (open) {
      const d = new Date();
      d.setDate(d.getDate() + defaultDays);
      setDueDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
  }, [open, defaultDays]);

  const handleDecline = () => {
    onDecline();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm(dueDate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <CalendarCheck className="w-5 h-5 text-primary" />
            {mode === "activate" ? "Sequência de Follow-up" : "Próximo Follow-up"}
          </DialogTitle>
          <DialogDescription>
            {mode === "activate" ? (
              <>
                O lead <span className="font-semibold text-foreground">{leadName}</span> foi movido para Follow-up.
                Deseja ativar a sequência recomendada de follow-up?
              </>
            ) : (
              <>
                Deseja criar o próximo follow-up para <span className="font-semibold text-foreground">{leadName}</span>?
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Follow-up {nextNumber}
              </span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Data sugerida (editável)</Label>
              <DatePickerField value={dueDate} onChange={setDueDate} placeholder="Selecione a data" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleDecline}>
              {mode === "activate" ? "Não, gerenciar manualmente" : "Não"}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!dueDate}
              className="bg-gradient-primary hover:opacity-90"
            >
              {mode === "activate" ? "Sim, ativar sequência" : "Sim, criar follow-up"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FollowUpModal;
