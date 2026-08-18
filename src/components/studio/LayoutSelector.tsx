import { LAYOUTS, LayoutType } from "@/lib/carouselLayouts";

interface LayoutSelectorProps {
  value: LayoutType;
  onChange: (layout: LayoutType) => void;
}

const Preview = ({ id }: { id: LayoutType }) => {
  const cell = "rounded-[2px] bg-current";
  if (id === "single_full") return <div className={`h-full w-full ${cell}`} />;
  if (id === "single_frame")
    return (
      <div className="flex h-full w-full items-center justify-center border border-current/40 p-1">
        <div className={`h-full w-full ${cell}`} />
      </div>
    );
  if (id === "grid_2")
    return (
      <div className="grid h-full w-full grid-cols-2 gap-[2px]">
        <div className={cell} />
        <div className={cell} />
      </div>
    );
  if (id === "grid_4")
    return (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-[2px]">
        <div className={cell} />
        <div className={cell} />
        <div className={cell} />
        <div className={cell} />
      </div>
    );
  if (id === "strip_2")
    return (
      <div className="grid h-full w-full grid-rows-2 gap-[2px]">
        <div className={cell} />
        <div className={cell} />
      </div>
    );
  if (id === "strip_3")
    return (
      <div className="grid h-full w-full grid-rows-3 gap-[2px]">
        <div className={cell} />
        <div className={cell} />
        <div className={cell} />
      </div>
    );
  if (id === "strip_plus_2")
    return (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-[2px]">
        <div className={`col-span-2 ${cell}`} />
        <div className={cell} />
        <div className={cell} />
      </div>
    );
  return (
    <div className="grid h-full w-full grid-cols-3 grid-rows-2 gap-[2px]">
      <div className={`col-span-2 row-span-2 ${cell}`} />
      <div className={cell} />
      <div className={cell} />
    </div>
  );
};

const LayoutSelector = ({ value, onChange }: LayoutSelectorProps) => (
  <div className="flex flex-wrap gap-1.5">
    {LAYOUTS.map((l) => {
      const active = l.id === value;
      return (
        <button
          key={l.id}
          type="button"
          title={`${l.label} — ${l.description}`}
          onClick={() => onChange(l.id)}
          className={`h-8 w-8 rounded-md border p-1 transition-colors ${
            active
              ? "border-primary text-primary"
              : "border-border/70 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
          }`}
        >
          <Preview id={l.id} />
        </button>
      );
    })}
  </div>
);

export default LayoutSelector;