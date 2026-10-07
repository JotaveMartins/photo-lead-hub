import { cn } from "@/lib/utils";
import { DELIVERY_STAGE_COLOR_KEYS, deliveryStageColorClass, type DeliveryStageColorKey } from "@/lib/deliveryStages";

interface Props {
  value: DeliveryStageColorKey;
  onChange: (color: DeliveryStageColorKey) => void;
  disabled?: boolean;
}

/** Seletor visual de cor da etapa (swatches da paleta predefinida). Reutilizável. */
const StageColorPicker = ({ value, onChange, disabled }: Props) => (
  <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Cor da etapa">
    {DELIVERY_STAGE_COLOR_KEYS.map((key) => (
      <button
        key={key}
        type="button"
        role="radio"
        aria-checked={value === key}
        aria-label={`Cor ${key}`}
        disabled={disabled}
        onClick={() => onChange(key)}
        className={cn(
          "w-6 h-6 rounded-full transition-all",
          deliveryStageColorClass(key),
          value === key
            ? "ring-2 ring-offset-2 ring-offset-card ring-foreground/70 scale-110"
            : "opacity-60 hover:opacity-100"
        )}
      />
    ))}
  </div>
);

export default StageColorPicker;
