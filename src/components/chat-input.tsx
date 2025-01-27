"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";
import * as React from "react";
import TextareaAutosize, {
  type TextareaAutosizeProps,
} from "react-textarea-autosize";

interface ChatInputProps
  extends Omit<TextareaAutosizeProps, "onChange" | "onSubmit"> {
  onValueChange?: (value: string) => void;
  onSubmit?: (value: string) => Promise<void> | void;
}

const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
  (props, forwardedRef) => {
    const {
      value,
      onValueChange,
      onSubmit: onSubmitProp,
      disabled,
      className,
      ...chatInputProps
    } = props;

    async function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (event.key === "Enter" && !event.shiftKey && !disabled) {
        event.preventDefault();
        const textarea = event.currentTarget;
        const value = textarea.value.trim();
        if (!value) return;

        if (onSubmitProp) {
          await onSubmitProp(value);
          if (onValueChange) onValueChange("");
        }
      }
    }

    async function onSubmit() {
      if (disabled) return;
      const textValue = typeof value === "string" ? value.trim() : "";
      if (!textValue) return;

      if (onSubmitProp) {
        await onSubmitProp(textValue);
        if (onValueChange) onValueChange("");
      }
    }

    return (
      <div className="relative flex w-full items-center">
        <TextareaAutosize
          ref={forwardedRef}
          className={cn(
            "flex w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          rows={1}
          value={value}
          onChange={(event) => onValueChange?.(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          {...chatInputProps}
        />
        <Button
          size="icon"
          className="absolute top-2 right-2 size-8"
          onClick={onSubmit}
          disabled={disabled}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    );
  },
);

export { ChatInput };
