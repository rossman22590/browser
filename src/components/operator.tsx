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
import { useInView } from "react-intersection-observer";

export function Operator() {
  const { messages, input, setInput, handleSubmit, isLoading } = useChat();
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [inViewRef, inView] = useInView({
    threshold: 0,
  });

  const composedScrollRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node;
      inViewRef(node);
    },
    [inViewRef],
  );

  const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true);

  // Update auto-scroll based on whether the user is viewing the bottom
  React.useEffect(() => {
    setShouldAutoScroll(inView);
  }, [inView]);

  // Scroll to bottom when new messages arrive and auto-scroll is enabled
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  React.useEffect(() => {
    if (shouldAutoScroll) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll]);

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
              autoFocus
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
                      "flex w-full",
                      message.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-lg p-3 shadow-sm",
                        message.role === "user"
                          ? "max-w-[80%] bg-primary text-primary-foreground"
                          : "max-w-[80%] bg-background",
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                <div ref={composedScrollRef} />
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
                  autoFocus
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
