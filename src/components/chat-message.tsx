"use client";

import { cn } from "@/lib/utils";
import type { Message } from "ai";
import {
  CheckCircle2,
  Loader2,
  Mouse,
  Navigation,
  ScrollText,
  Search,
} from "lucide-react";
import { motion } from "motion/react";

function getToolIcon(toolName: string) {
  switch (toolName) {
    case "searchGoogle":
      return <Search className="size-4" />;
    case "navigate":
      return <Navigation className="size-4" />;
    case "browserAction":
      return <Mouse className="size-4" />;
    case "viewAllClickableElements":
      return <ScrollText className="size-4" />;
    default:
      return null;
  }
}

interface ChatMessageProps {
  message: Message & {
    status?: {
      type: string;
      content: string;
      step: number;
    };
  };
}

function getStatusIcon(type: string) {
  switch (type) {
    case "status":
      return <Loader2 className="size-4 animate-spin" />;
    case "step":
      return <CheckCircle2 className="size-4" />;
    default:
      return null;
  }
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full",
        message.role === "user" ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "rounded-lg w-full px-3 py-2 shadow-sm",
          message.role === "user"
            ? "max-w-[80%] bg-primary text-primary-foreground"
            : "bg-background",
        )}
      >
        <div className="prose break-words dark:prose-invert">
          {message.content}
        </div>
        {message.role === "assistant" && message.status && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex w-full flex-col gap-2"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm"
            >
              {getStatusIcon(message.status.type)}
              <span className="text-muted-foreground">
                {message.status.content === "initialized"
                  ? "Initializing..."
                  : message.status.content === "step_complete"
                    ? `Step ${message.status.step} completed`
                    : message.status.content === "finished"
                      ? "Finished"
                      : message.status.content}
              </span>
            </motion.div>
          </motion.div>
        )}
        {message.role === "assistant" &&
          message.toolInvocations &&
          message.toolInvocations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex w-full flex-col gap-2"
            >
              {message.toolInvocations.map((toolInvocation) => {
                const { toolName, toolCallId, args, state } = toolInvocation;

                return (
                  <motion.div
                    key={toolCallId}
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="flex flex-col w-full gap-2 rounded-md border bg-muted/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-full p-1.5 border gap-2">
                        {getToolIcon(toolName)}
                      </div>
                      <span className="font-medium">
                        {toolName
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (str) => str.toUpperCase())}
                      </span>
                      {state === "partial-call" && (
                        <Loader2 className="h-3 w-3 animate-spin ml-auto" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
      </div>
    </motion.div>
  );
}
