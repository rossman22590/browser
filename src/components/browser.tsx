"use client";

import React from "react";
import { useInView } from "react-intersection-observer";
import { createAndGetSessionUrl, closeSession } from "@/actions/session";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/chat-input";
import { ChatPanel } from "@/components/chat-panel";

export function Browser() {
  const initialInputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [sessionUrl, setSessionUrl] = React.useState<string | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [isInitializing, setIsInitializing] = React.useState(false);
  const [initialMessage, setInitialMessage] = React.useState<string | null>(
    null
  );
  const [isEnding, setIsEnding] = React.useState(false);

  const initializeSession = async () => {
    if (sessionId || isInitializing) return;
    setIsInitializing(true);
    try {
      const { url, sessionId: id } = await createAndGetSessionUrl();
      setSessionUrl(url);
      setSessionId(id);
    } catch (error) {
      console.error("Failed to initialize session:", error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleInitialSubmit = async (value: string) => {
    setInitialMessage(value);
    await initializeSession();
  };

  const handleExampleClick = async (prompt: string) => {
    setInitialMessage(prompt);
    await initializeSession();
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    setIsEnding(true);
    try {
      await closeSession(sessionId);
      setSessionId(null);
      setSessionUrl(null);
      window.location.reload();
    } catch (error) {
      console.error("Failed to end session:", error);
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <Button
            variant="ghost"
            className="h-auto p-0 text-lg hover:bg-transparent hover:text-foreground/90"
            onClick={handleEndSession}
          >
            AI Tutor
          </Button>
        </div>
      </header>

      <div className="container h-[calc(100vh-56px)]">
        {!initialMessage ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 p-4">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">AI Tutor Browsing Agent</h1>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                preview
              </span>
            </div>

            <div className="w-full max-w-2xl">
            <ChatInput
  ref={initialInputRef}
  placeholder="Type something here..."
  minRows={3}
  className="max-h-[200px] min-h-[100px] text-base"
  onSubmit={handleInitialSubmit}
  disabled={isInitializing}
  autoFocus
/>


              <div className="mt-8">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <button
                    onClick={() =>
                      handleExampleClick(
                        "Find me the best-rated Italian restaurants in New York City with outdoor seating"
                      )
                    }
                    className="rounded-lg border bg-muted/50 p-4 text-left text-sm transition-colors hover:bg-muted"
                  >
                    🍝 Find top-rated Italian restaurants in NYC with outdoor
                    seating
                  </button>
                  <button
                    onClick={() =>
                      handleExampleClick(
                        "Research and compare the latest iPhone models and their key features"
                      )
                    }
                    className="rounded-lg border bg-muted/50 p-4 text-left text-sm transition-colors hover:bg-muted"
                  >
                    📱 Compare latest iPhone models and features
                  </button>
                  <button
                    onClick={() =>
                      handleExampleClick(
                        "Find the best deals on round-trip flights from London to Tokyo for next month"
                      )
                    }
                    className="rounded-lg border bg-muted/50 p-4 text-left text-sm transition-colors hover:bg-muted"
                  >
                    ✈️ Search for London to Tokyo flight deals
                  </button>
                  <button
                    onClick={() =>
                      handleExampleClick(
                        "Research and summarize recent breakthroughs in renewable energy technology"
                      )
                    }
                    className="rounded-lg border bg-muted/50 p-4 text-left text-sm transition-colors hover:bg-muted"
                  >
                    🌱 Explore recent renewable energy innovations
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ChatPanel
            sessionId={sessionId}
            sessionUrl={sessionUrl}
            initialMessage={initialMessage}
            onEndSession={handleEndSession}
            isEnding={isEnding}
            isInitializing={isInitializing}
          />
        )}
      </div>
    </main>
  );
}
