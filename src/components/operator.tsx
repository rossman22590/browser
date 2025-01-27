"use client";

import { ChatInput } from "@/components/chat-input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useState } from "react";

export function Operator() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function onSubmit(value: string) {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setIsSubmitted(true);
  }

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
              className="min-h-[100px] text-base"
              value={message}
              onValueChange={(value) => setMessage(value)}
              onSubmit={onSubmit}
              disabled={isLoading}
            />
          </div>
        </div>
      ) : (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={30} minSize={20}>
            <div className="flex h-full flex-col p-4">
              <h2 className="mb-4 text-xl font-semibold">Chat Feed</h2>
              <div className="flex-1 overflow-auto rounded-lg border bg-muted/50 p-4">
                <div className="rounded bg-background p-3 shadow">
                  {message}
                </div>
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
