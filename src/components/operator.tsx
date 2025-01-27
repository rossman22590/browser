"use client";

import { closeSession, createAndGetSessionUrl } from "@/actions/session";
import { ChatInput } from "@/components/chat-input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { useChat } from "ai/react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useInView } from "react-intersection-observer";

export function Operator() {
  const initialInputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const chatInputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [sessionUrl, setSessionUrl] = React.useState<string | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);

  const router = useRouter();
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const hasInitializedRef = React.useRef(false);

  const { messages, input, setInput, handleSubmit, isLoading } = useChat({
    body: {
      sessionId,
    },
  });

  const [inViewRef, inView] = useInView({
    threshold: 0,
  });

  const composedScrollRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node;
      inViewRef(node);
    },
    [inViewRef]
  );

  const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true);

  // Update session initialization effect
  React.useEffect(() => {
    async function initSession() {
      if (hasInitializedRef.current) return;
      hasInitializedRef.current = true;

      try {
        const { url, sessionId: id } = await createAndGetSessionUrl();
        setSessionUrl(url);
        setSessionId(id);
      } catch (error) {
        console.error("Failed to initialize session:", error);
      }
    }

    initSession();
  }, []);

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

  const handleEndSession = async () => {
    if (sessionId) {
      try {
        await closeSession(sessionId);
        window.location.reload();
      } catch (error) {
        console.error("Failed to end session:", error);
      }
    }
  };

  return (
    <main className="h-screen overflow-hidden">
      {messages.length === 0 ? (
        <div className="container mx-auto flex h-full flex-col items-center justify-center p-4">
          <h1 className="mb-8 text-balance font-bold text-3xl">
            Ottogrid Operator
          </h1>
          <div className="w-full max-w-2xl">
            <ChatInput
              ref={initialInputRef}
              placeholder="Type something here..."
              minRows={3}
              className="max-h-[200px] min-h-[100px] text-base"
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
      ) : (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={30} minSize={20}>
            <div className="flex h-full flex-col p-4">
              <h2 className="mb-4 font-semibold text-xl">Chat Feed</h2>
              <div className="flex-1 space-y-4 overflow-auto rounded-lg border bg-muted/50 p-4 text-sm">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex w-full",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 shadow-sm",
                        message.role === "user"
                          ? "max-w-[80%] bg-primary py-2 text-primary-foreground"
                          : "max-w-[80%] bg-background py-4"
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
                  ref={chatInputRef}
                  placeholder="Type something here..."
                  minRows={3}
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

          <ResizablePanel defaultSize={70} minSize={40}>
            <div className="flex h-full flex-col p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-xl">Browser Panel</h2>
                <button
                  onClick={handleEndSession}
                  className="inline-flex h-10 items-center justify-center rounded-md px-4 py-2 font-medium text-sm ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                >
                  End Session
                </button>
              </div>
              <div className="flex-1 rounded-lg border bg-muted/50 p-4">
                {sessionUrl ? (
                  <iframe
                    src={sessionUrl}
                    className="size-full"
                    sandbox="allow-same-origin allow-scripts allow-forms"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    title="Browser Session"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">
                      Loading browser session...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </main>
  );
}
