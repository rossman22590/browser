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
import { clickElementByVision } from "@/app/api/chat/lib/vision";
import { ratelimit } from "@/lib/upstash/upstash";
import { systemPrompt } from "@/app/api/chat/lib/prompts";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, sessionId } = await req.json();

  // Check if the last message is from the user
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === "user" && process.env.NODE_ENV !== "development") {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return new Response(
        JSON.stringify({
          error: "Daily message limit exceeded",
          limit,
          reset,
          remaining,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      );
    }
  }

  const model = anthropic("claude-3-5-sonnet-latest");

  setSessionId(sessionId);

  const result = streamText({
    model,
    messages,
    system: systemPrompt,
    maxSteps: 25,
    tools: {
      searchGoogle: {
        name: "searchGoogle",
        description:
          'Navigate to Google and search for a query, i.e. "searchGoogle(query=...)"',
        parameters: z.object({ query: z.string() }),
        execute: async ({ query }: { query: string }) => {
          try {
            const { page } = await getOrCreateBrowser();
            await searchGooglePage(page, query);
            const { screenshot } = await takeScreenshot(page);
            return {
              data: screenshot.data,
              mimeType: screenshot.mimeType,
            };
          } catch (error) {
            return `Error searching Google: ${
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
      navigate: {
        name: "navigate",
        description: `Navigate in the browser. Available actions:
          - url: Navigate to a specific URL (requires url parameter)
          - back: Go back one page in history
          - forward: Go forward one page in history`,
        parameters: z.object({
          action: z.enum(["url", "back", "forward"]),
          url: z
            .string()
            .optional()
            .describe("URL to navigate to (required for url action)"),
        }),
        execute: async ({
          action,
          url,
        }: {
          action: "url" | "back" | "forward";
          url?: string;
        }) => {
          try {
            const { page } = await getOrCreateBrowser();
            let text = "";

            if (action === "url") {
              if (!url) {
                throw new Error("URL parameter required for url action");
              }
              const urlToGoTo = url.startsWith("http") ? url : `https://${url}`;
              await page.goto(urlToGoTo);
              text = `Navigated to ${urlToGoTo}`;
            } else if (action === "back") {
              await page.goBack();
              text = "Navigated back one page";
            } else if (action === "forward") {
              await page.goForward();
              text = "Navigated forward one page";
            } else {
              throw new Error(`Unknown navigation action: ${action}`);
            }

            const { screenshot } = await takeScreenshot(page);
            return {
              data: screenshot.data,
              mimeType: screenshot.mimeType,
            };
          } catch (error) {
            return `Error navigating: ${
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
      browserAction: {
        name: "browserAction",
        description: `Perform browser actions like keyboard input, clicking, scrolling, and screenshots.
      Available actions:
      - type: Type text (requires text parameter)
      - key: Press a specific key (requires text parameter, e.g. "Enter", "Tab", "ArrowDown")
      - scroll: Scroll the page (optional amount parameter, use -1 to scroll to bottom)
      - screenshot: Take a screenshot of the current page
      - click: Click on elements using natural language description`,
        parameters: z.object({
          action: z.enum(["type", "key", "scroll", "screenshot", "click"]),
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
              'Amount to scroll in pixels. Use -1 to scroll to bottom of page (optional for "scroll" action)'
            ),
          clickObject: z
            .string()
            .optional()
            .describe(
              'The object to click. Use natural language and be as specific as possible, e.g. "the blue Submit button", "the link that says Learn More", "the search icon in the top right"'
            ),
        }),
        execute: async ({ action, text, amount, clickObject }) => {
          try {
            const { page } = await getOrCreateBrowser();

            if (action === "type") {
              if (!text)
                throw new Error("Text parameter required for type action");
              const TYPING_DELAY = 5;
              await page.keyboard.type(text, { delay: TYPING_DELAY });
              await page.waitForTimeout(50);
              await page.keyboard.press("Enter");
              // return `Successfully typed text: ${text} and submitted`;
              const { screenshot } = await takeScreenshot(page);
              return {
                data: screenshot.data,
                mimeType: screenshot.mimeType,
              };
            }

            if (action === "key") {
              if (!text) return "Text parameter required for key action";
              await page.keyboard.press(text);
              const { screenshot } = await takeScreenshot(page);
              return {
                data: screenshot.data,
                mimeType: screenshot.mimeType,
              };
            }

            if (action === "click") {
              if (!clickObject)
                return "Click object parameter required for click action";
              await clickElementByVision(page, clickObject);
              // return `Successfully clicked element: ${clickObject}`;
              const { screenshot } = await takeScreenshot(page);
              return {
                data: screenshot.data,
                mimeType: screenshot.mimeType,
              };
            }

            if (action === "scroll") {
              await scrollDownPage(page, amount);
              const { screenshot } = await takeScreenshot(page);
              return {
                data: screenshot.data,
                mimeType: screenshot.mimeType,
              };
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
