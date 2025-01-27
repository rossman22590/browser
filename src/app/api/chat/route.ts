import {
  goToUrlPage,
  scrollDownPage,
  searchGooglePage,
  takeScreenshot,
} from "@/lib/operator/actions";
import { getOrCreateBrowser, setSessionId } from "@/lib/operator/browser";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, sessionId } = await req.json();
  const model = anthropic("claude-3-5-sonnet-latest");

  setSessionId(sessionId);

  const result = streamText({
    model,
    messages,
    system: "You are a helpful assistant.",
    maxSteps: 10,
    tools: {
      searchGoogle: {
        name: "searchGoogle",
        description:
          'Navigate to Google and search for a query, i.e. "searchGoogle(query=...)"',
        parameters: z.object({ query: z.string() }),
        execute: async ({ query }: { query: string }) => {
          try {
            const { page } = await getOrCreateBrowser();
            const msg = await searchGooglePage(page, query);
            return msg;
          } catch (error) {
            return `Error searching Google: ${
              error instanceof Error ? error.message : String(error)
            }`;
          }
        },
      },
      goToUrl: {
        name: "goToUrl",
        description:
          'Navigate the current page to a specified URL, i.e. "goToUrl(url=...)"',
        parameters: z.object({ url: z.string() }),
        execute: async ({ url }: { url: string }) => {
          try {
            const { page } = await getOrCreateBrowser();
            const msg = await goToUrlPage(page, url);
            return msg;
          } catch (error) {
            return `Error navigating to URL: ${
              error instanceof Error ? error.message : String(error)
            }`;
          }
        },
      },
      browserAction: {
        name: "browserAction",
        description: `Perform browser actions like keyboard input, clicking, scrolling, and screenshots.
      Available actions:
      - type: Type text (requires text parameter)
      - key: Press a specific key (requires text parameter, e.g. "Enter", "Tab", "ArrowDown")
      - scroll: Scroll the page (optional amount parameter)
      - screenshot: Take a screenshot of the current page`,
        parameters: z.object({
          action: z.enum(["type", "key", "scroll", "screenshot"]),
          text: z
            .string()
            .optional()
            .describe(
              'Text to type or key to press (required for "type" and "key" actions)'
            ),
          amount: z
            .number()
            .optional()
            .describe(
              'Amount to scroll in pixels (optional for "scroll" action)'
            ),
        }),
        execute: async ({
          action,
          text,
          amount,
        }: {
          action: "type" | "key" | "scroll" | "screenshot";
          text?: string;
          amount?: number;
        }) => {
          try {
            const { page } = await getOrCreateBrowser();

            if (action === "type") {
              if (!text)
                throw new Error("Text parameter required for type action");
              const TYPING_DELAY = 5;
              await page.keyboard.type(text, { delay: TYPING_DELAY });
              await page.waitForTimeout(50);
              await page.keyboard.press("Enter");
              return `Successfully typed text: ${text} and submitted`;
            }

            if (action === "key") {
              if (!text)
                throw new Error("Text parameter required for key action");
              await page.keyboard.press(text);
              return `Successfully pressed key: ${text}`;
            }

            if (action === "scroll") {
              await scrollDownPage(page, amount);
              return `Successfully scrolled ${
                amount ? `${amount}px` : "one page"
              }`;
            }

            if (action === "screenshot") {
              const { screenshot } = await takeScreenshot(page);
              return { data: screenshot.data, mimeType: screenshot.mimeType };
            }

            throw new Error(`Unknown action: ${action}`);
          } catch (error) {
            return `Error performing browser action: ${
              error instanceof Error ? error.message : String(error)
            }`;
          }
        },
        experimental_toToolResultContent(result) {
          return typeof result === "string"
            ? [{ type: "text", text: result }]
            : [{ type: "image", data: result.data, mimeType: result.mimeType }];
        },
      },
    },
  });

  return result.toDataStreamResponse();
}
