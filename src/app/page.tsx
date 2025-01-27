"use client";

import { ChatInput } from "@/components/chat-input";
import { useState } from "react";

export default function IndexPage() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(value: string) {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Submitted:", value);
    setIsLoading(false);
  }

  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center p-4">
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
    </main>
  );
}
