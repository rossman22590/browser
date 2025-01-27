"use client";

import { ChatInput } from "@/components/chat-input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { useChat } from "ai/react";
import * as React from "react";

export function Operator() {
  const { messages, input, setInput, handleSubmit, isLoading } = useChat();
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);

  return (
    <main className="h-screen overflow-hidden">
      {!isSubmitted ? (
        <div className="container mx-auto flex h-full flex-col items-center justify-center p-4">
          <h1 className="mb-8 text-balance font-bold text-3xl">
            Ottogrid Operator
          </h1>
          <div className="w-full max-w-2xl">
            <ChatInput
              ref={inputRef}
              placeholder="Type something here..."
              minRows={3}
              className="max-h-[200px] min-h-[100px] text-base"
              value={input}
              onValueChange={setInput}
              onSubmit={() => {
                handleSubmit(new Event("submit"));
                setIsSubmitted(true);
              }}
              disabled={isLoading}
            />
          </div>
        </div>
      ) : (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={30} minSize={20}>
            <div className="flex h-full flex-col p-4">
              <h2 className="mb-4 font-semibold text-xl">Chat Feed</h2>
              <div className="flex-1 space-y-4 overflow-auto rounded-lg border bg-muted/50 p-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "rounded p-3 shadow",
                      message.role === "user"
                        ? "ml-auto max-w-[80%] bg-primary text-primary-foreground"
                        : "max-w-[80%] bg-background"
                    )}
                  >
                    {message.content}
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <ChatInput
                  ref={inputRef}
                  placeholder="Type something here..."
                  minRows={2}
                  className="max-h-[100px] min-h-[60px] text-base"
                  value={input}
                  onValueChange={setInput}
                  onSubmit={() => {
                    handleSubmit(new Event("submit"));
                  }}
                  disabled={isLoading}
                />
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70} minSize={40}>
            <div className="flex h-full flex-col p-4">
              <h2 className="mb-4 font-semibold text-xl">Browser Panel</h2>
              <div className="flex-1 rounded-lg border bg-muted/50 p-4">
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">
                    Browser panel placeholder
                  </p>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </main>
  );
}
