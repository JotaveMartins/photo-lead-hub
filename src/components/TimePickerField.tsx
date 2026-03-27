import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <select
        aria-label={`${placeholder} - hora`}
        value={h}
        onChange={(e) => handleHourChange(e.target.value)}
        disabled={disabled}
        className="w-[70px] h-8 rounded-md border border-border bg-muted px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">--</option>
        {hours.map((hour) => (
          <option key={hour} value={hour}>
            {hour}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground font-medium">:</span>
      <select
        aria-label={`${placeholder} - minutos`}
        value={m}
        onChange={(e) => handleMinuteChange(e.target.value)}
        disabled={disabled}
        className="w-[70px] h-8 rounded-md border border-border bg-muted px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">--</option>
        {minutes.map((min) => (
          <option key={min} value={min}>
            {min}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TimePickerField;
