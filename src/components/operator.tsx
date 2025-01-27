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

  return (
    <main className="h-screen overflow-hidden">
      {!isSubmitted ? (
        <div className="container mx-auto flex h-full flex-col items-center justify-center p-4">
          <h1 className="mb-8 text-3xl text-balance font-bold">
            Ottogrid Operator
          </h1>
          <div className="w-full max-w-2xl">
            <ChatInput
              placeholder="Type something here..."
              minRows={3}
              className="min-h-[100px] max-h-[200px] text-base"
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
              <h2 className="mb-4 text-xl font-semibold">Chat Feed</h2>
              <div className="flex-1 overflow-auto rounded-lg border bg-muted/50 p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "rounded p-3 shadow",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground ml-auto max-w-[80%]"
                        : "bg-background max-w-[80%]",
                    )}
                  >
                    {message.content}
                  </div>
                ))}
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70} minSize={40}>
            <div className="flex h-full flex-col p-4">
              <h2 className="mb-4 text-xl font-semibold">Browser Panel</h2>
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
