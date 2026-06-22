import { useState } from "react";
import { Smile } from "lucide-react";
import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
  variant?: "ghost" | "outline";
}

export const EmojiPickerButton = ({ onSelect, disabled, className, variant = "ghost" }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size="icon"
          className={className ?? "h-9 w-9 shrink-0 text-muted-foreground hover:text-primary"}
          disabled={disabled}
          title="Inserir emoji"
        >
          <Smile className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="p-0 border-none bg-transparent shadow-none w-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest(".EmojiPickerReact")) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest(".EmojiPickerReact")) e.preventDefault();
        }}
      >
        <EmojiPicker
          theme={Theme.DARK}
          emojiStyle={EmojiStyle.NATIVE}
          lazyLoadEmojis
          width={320}
          height={380}
          searchPlaceHolder="Buscar emoji..."
          onEmojiClick={(e) => {
            onSelect(e.emoji);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPickerButton;