"use client";

import { cn } from "@/lib/utils";
import { Message } from "ai";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "rounded-lg px-3 py-2 shadow-sm",
          message.role === "user"
            ? "max-w-[80%] bg-primary text-primary-foreground"
            : "max-w-[80%] bg-background"
        )}
      >
        <div className="prose break-words dark:prose-invert">
          {message.content}
        </div>
        {message.role === "assistant" &&
          message.toolInvocations &&
          message.toolInvocations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex flex-col gap-2 rounded-lg bg-secondary/50 p-4 text-sm"
            >
              {message.toolInvocations.map((toolInvocation) => (
                <motion.div
                  key={toolInvocation.toolCallId}
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2 rounded-md bg-background p-3"
                >
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">
                      {toolInvocation.toolName}
                    </span>
                  </div>
                  <div className="ml-2 text-xs text-muted-foreground">
                    {JSON.stringify(toolInvocation.args)}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
      </div>
    </motion.div>
  );
}
