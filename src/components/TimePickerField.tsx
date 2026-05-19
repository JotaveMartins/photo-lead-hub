import { useEffect, useRef, useState } from "react";
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

interface TimeDropdownProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel: string;
}

const TimeDropdown = ({ value, options, onChange, disabled, ariaLabel }: TimeDropdownProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && listRef.current) {
      const selected = listRef.current.querySelector<HTMLButtonElement>("[data-selected='true']");
      if (selected) selected.scrollIntoView({ block: "nearest" });
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex w-[70px] h-8 items-center justify-between rounded-md border border-border bg-muted px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{value || "--"}</span>
        <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          <div ref={listRef} className="max-h-48 overflow-y-auto py-1">
            <button
              type="button"
              data-selected={!value}
              onClick={() => { onChange(""); setOpen(false); }}
              className={`w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors ${!value ? "text-primary font-medium" : "text-muted-foreground"}`}
            >
              --
            </button>
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                data-selected={value === opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors ${value === opt ? "text-primary font-medium" : "text-foreground"}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TimePickerField = ({ value, onChange, placeholder = "Hora", className, disabled }: TimePickerFieldProps) => {
  const [h, m] = value ? value.split(":") : ["", ""];

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <TimeDropdown
        ariaLabel={`${placeholder} - hora`}
        value={h}
        options={hours}
        disabled={disabled}
        onChange={(newH) => onChange(newH ? `${newH}:${m || "00"}` : "")}
      />
      <span className="text-muted-foreground font-medium">:</span>
      <TimeDropdown
        ariaLabel={`${placeholder} - minutos`}
        value={m}
        options={minutes}
        disabled={disabled}
        onChange={(newM) => onChange(newM ? `${h || "08"}:${newM}` : "")}
      />
    </div>
  );
};

export default TimePickerField;
