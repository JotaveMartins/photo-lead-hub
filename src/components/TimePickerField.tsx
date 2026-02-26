import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimePickerFieldProps {
  value: string; // HH:mm
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const minutes = ["00", "15", "30", "45"];

const TimePickerField = ({ value, onChange, placeholder = "Hora", className, disabled }: TimePickerFieldProps) => {
  const [h, m] = value ? value.split(":") : ["", ""];

  const handleHourChange = (newH: string) => {
    onChange(`${newH}:${m || "00"}`);
  };

  const handleMinuteChange = (newM: string) => {
    onChange(`${h || "08"}:${newM}`);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Select value={h} onValueChange={handleHourChange} disabled={disabled}>
        <SelectTrigger className="w-[70px] h-8 bg-muted border-border text-sm px-2">
          <SelectValue placeholder="--" />
        </SelectTrigger>
        <SelectContent>
          {hours.map((hour) => (
            <SelectItem key={hour} value={hour}>{hour}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground font-medium">:</span>
      <Select value={m} onValueChange={handleMinuteChange} disabled={disabled}>
        <SelectTrigger className="w-[70px] h-8 bg-muted border-border text-sm px-2">
          <SelectValue placeholder="--" />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((min) => (
            <SelectItem key={min} value={min}>{min}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TimePickerField;
