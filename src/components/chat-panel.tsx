"use client";

import React from "react";
import { useChat } from "ai/react";
import { useInView } from "react-intersection-observer";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useIsMobile } from "@/lib/use-mobile";

interface ChatPanelProps {
  sessionId: string | null;
  sessionUrl: string | null;
  initialMessage: string | null;
  onEndSession: () => void;
  isEnding: boolean;
  isInitializing: boolean;
}

export function ChatPanel({
  sessionId,
  sessionUrl,
  initialMessage,
  onEndSession,
  isEnding,
  isInitializing,
}: ChatPanelProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const chatInputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true);

  const { messages, input, setInput, handleSubmit, isLoading, data, append } =
    useChat({
      body: { sessionId },
      id: sessionId || undefined,
    });

  const [inViewRef, inView] = useInView({ threshold: 0 });

  const composedScrollRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node;
      inViewRef(node);
    },
    [inViewRef]
  );

  const isMobile = useIsMobile();

  // Merge `data` into the last assistant message as a status, if any
  const messagesWithStatus = React.useMemo(() => {
    if (!data || !messages) return messages;

    const lastData = data[data.length - 1];
    if (!lastData) return messages;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return messages;

    return messages.map((message, index) => {
      if (index === messages.length - 1 && message.role === "assistant") {
        return { ...message, status: lastData };
      }
      return message;
    });
  }, [messages, data]);

  // Send initial message when component mounts
  React.useEffect(() => {
    if (initialMessage && sessionId) {
      append({
        content: initialMessage,
        role: "user",
      });
    }
  }, [sessionId, initialMessage, append]);

  React.useEffect(() => {
    setShouldAutoScroll(inView);
  }, [inView]);

  React.useEffect(() => {
    if (shouldAutoScroll) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll]);

  return (
    <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"}>
      <ResizablePanel
        defaultSize={30}
        minSize={20}
        className={`${isMobile ? "order-2 flex-1" : "h-auto"}`}
      >
        <div className="flex h-full flex-col p-4">
          <h2 className="mb-4 text-xl font-semibold">Chat Feed</h2>
          <div className="flex-1 space-y-4 overflow-auto rounded-lg border bg-muted/50 p-4 text-sm">
            {isInitializing ? (
              <div className="rounded-lg border bg-muted px-3 py-2 text-muted-foreground">
                Initializing browser session...
              </div>
            ) : (
              <>
                {messagesWithStatus?.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                <div ref={composedScrollRef} />
              </>
            )}
          </div>

          <div className="mt-4">
            <ChatInput
              ref={chatInputRef}
              placeholder="Type something here..."
              minRows={3}
              className="max-h-[100px] min-h-[60px] text-base"
              value={input}
              onValueChange={setInput}
              onSubmit={() => handleSubmit(new Event("submit"))}
              disabled={isLoading || isInitializing || !sessionId}
            />
          </div>
        </div>
      </ResizablePanel>

      <ResizablePanel
        defaultSize={70}
        minSize={40}
        className={`${isMobile ? "order-1" : "h-auto"}`}
      >
        <div className={`flex flex-col p-4 ${isMobile ? "" : "h-full"}`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-xl">Browser Panel</h2>
            <button
              onClick={onEndSession}
              disabled={isEnding}
              className="inline-flex h-10 items-center justify-center rounded-md px-4 py-2 font-medium text-sm ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {isEnding ? "Ending Session..." : "End Session"}
            </button>
          </div>
          <div
            className={`${
              isMobile ? "aspect-square w-full" : "flex-1"
            } rounded-lg border bg-muted/50`}
          >
            {isInitializing ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">Loading browser...</p>
              </div>
            ) : !sessionUrl ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">Initializing</p>
              </div>
            ) : (
              <iframe
                src={sessionUrl}
                className="h-full w-full"
                sandbox="allow-same-origin allow-scripts allow-forms"
                loading="lazy"
                referrerPolicy="no-referrer"
                title="Browser Session"
              />
            )}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
