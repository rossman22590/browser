"use client";

import { closeSession, createAndGetSessionUrl } from "@/actions/session";
import { ChatInput } from "@/components/chat-input";
import { ChatMessage } from "@/components/chat-message";
import { Button } from "@/components/ui/button";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useChat } from "ai/react";
import * as React from "react";
import { useInView } from "react-intersection-observer";

export function Browser() {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const initialInputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const chatInputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const hasInitializedRef = React.useRef(false);
  const [sessionUrl, setSessionUrl] = React.useState<string | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true);

  const { messages, input, setInput, handleSubmit, isLoading, data } = useChat({
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
    [inViewRef],
  );

  // Transform messages to include status
  const messagesWithStatus = React.useMemo(() => {
    if (!data || !messages) return messages;

    const lastData = data[data.length - 1];
    if (!lastData) return messages;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return messages;

    return messages.map((message, index) => {
      if (index === messages.length - 1 && message.role === "assistant") {
        return {
          ...message,
          status: lastData,
        };
      }
      return message;
    });
  }, [messages, data]);

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
    <main className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center">
          <div className="flex items-center gap-2 px-4">
            <Button
              variant="ghost"
              className="h-auto p-0 text-lg hover:bg-transparent hover:text-foreground/90"
              onClick={handleEndSession}
            >
              Browser
            </Button>
          </div>
        </div>
      </header>
      <div className="h-[calc(100vh-57px)] container">
        {messagesWithStatus.length === 0 ? (
          <div className="container mx-auto flex h-full flex-col items-center justify-center gap-6 p-4">
            <h1 className="text-balance font-bold text-3xl">
              Ottogrid Browser
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
                  {messagesWithStatus.map((message) => (
                    <ChatMessage key={message.id} message={message} />
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
      </div>
    </main>
  );
}
