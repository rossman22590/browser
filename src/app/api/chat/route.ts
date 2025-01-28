import { clickableElementsPrompt } from "@/app/api/chat/lib/prompts";
import {
  clickElementByIndex,
  viewAllClickableElements,
} from "@/app/api/chat/lib/vision";
import {
  scrollDownPage,
  searchGooglePage,
  takeScreenshot,
} from "@/lib/operator/actions";
import { getOrCreateBrowser, setSessionId } from "@/lib/operator/browser";
import { ratelimit } from "@/lib/upstash/upstash";
import { sleep } from "@/lib/utils";
import { anthropic } from "@ai-sdk/anthropic";
import { createDataStreamResponse, streamText } from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 120;

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
        },
      );
    }
  }

  const model = anthropic("claude-3-5-sonnet-latest");

  setSessionId(sessionId);

  return createDataStreamResponse({
    execute: async (dataStream) => {
      // Write initial state
      let stepCount = 0;
      dataStream.writeData({
        type: "status",
        content: "initialized",
        step: stepCount,
      });

      const result = streamText({
        model,
        messages,
        system: clickableElementsPrompt,
        maxSteps: 25,
        onStepFinish: async (stepResult) => {
          stepCount++;
          dataStream.writeData({
            type: "step",
            content: "step_complete",
            step: stepCount,
          });
        },
        onFinish: async (result) => {
          if (result.finishReason === "stop") {
            dataStream.writeData({
              type: "status",
              content: "finished",
              step: -1,
            });
          }
        },
        tools: {
          searchGoogle: {
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
                : [
                    {
                      type: "image",
                      data: result.data,
                      mimeType: result.mimeType,
                    },
                  ];
            },
          },
          navigate: {
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
                  const urlToGoTo = url.startsWith("http")
                    ? url
                    : `https://${url}`;
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
                : [
                    {
                      type: "image",
                      data: result.data,
                      mimeType: result.mimeType,
                    },
                  ];
            },
          },
          viewAllClickableElements: {
            description:
              "Highlight all clickable elements on the page with indexs and bounding boxes. Use this to see what you can click on the page, then select the index of the element you want to click.",
            parameters: z.object({}),
            execute: async () => {
              const { page } = await getOrCreateBrowser();
              const elements = await viewAllClickableElements(page);
              return {
                data: elements.screenshot.data,
                mimeType: elements.screenshot.mimeType,
              };
            },
            experimental_toToolResultContent(result) {
              return [
                { type: "image", data: result.data, mimeType: result.mimeType },
              ];
            },
          },
          browserAction: {
            description: `Perform browser actions like keyboard input, clicking, scrolling, and screenshots.
                            Available actions:
                            - type: Type text (requires text parameter)
                            - key: Press a specific key (requires text parameter, e.g. "Enter", "Tab", "ArrowDown")
                            - scroll: Scroll the page (optional amount parameter, use -1 to scroll to bottom)
                            - screenshot: Take a screenshot of the current page
                            - click: Click on elements using natural language description`,
            parameters: z.object({
              action: z.enum([
                "type",
                "key",
                "scroll",
                "screenshot",
                "click",
                "wait",
              ]),
              text: z
                .string()
                .optional()
                .describe(
                  'Text to type or key to press (required for "type" and "key" actions)',
                ),
              amount: z
                .number()
                .optional()
                .describe(
                  'Amount to scroll in pixels. Use -1 to scroll to bottom of page (optional for "scroll" action)',
                ),
              clickIndex: z
                .number()
                .optional()
                .describe(
                  "The index of the element to click. Use this when you have a list of clickable elements and you want to click a specific one.",
                ),
              wait: z
                .number()
                .optional()
                .describe(
                  "The amount of time to wait in milliseconds (optional for 'wait' action). Max 10,000ms (10 seconds)",
                ),
              // clickObject: z
              //   .string()
              //   .optional()
              //   .describe(
              //     'The object to click. Use natural language and be as specific as possible, e.g. "the blue Submit button", "the link that says Learn More", "the search icon in the top right"'
              //   ),
            }),
            execute: async ({ action, text, amount, clickIndex, wait }) => {
              try {
                const { page } = await getOrCreateBrowser();

                if (action === "type") {
                  if (!text)
                    throw new Error("Text parameter required for type action");
                  const TYPING_DELAY = 5;
                  await page.keyboard.type(text, { delay: TYPING_DELAY });
                  await page.waitForTimeout(50);
                  await page.keyboard.press("Enter");

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
                if (action === "wait") {
                  if (!wait) return "Wait parameter required for wait action";
                  await sleep(wait);
                  const { screenshot } = await takeScreenshot(page);
                  return {
                    data: screenshot.data,
                    mimeType: screenshot.mimeType,
                  };
                }

                if (action === "click") {
                  if (!clickIndex)
                    return "Click index parameter required for click action";
                  const result = await clickElementByIndex(page, clickIndex);
                  if (typeof result === "string") return result;
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
                  return {
                    data: screenshot.data,
                    mimeType: screenshot.mimeType,
                  };
                }

                throw new Error(`Unknown action: ${action}`);
              } catch (error) {
                return `Error performing browser action: ${
                  error instanceof Error ? error.message : String(error)
                }`;
              }
            },
            experimental_toToolResultContent(result) {
              if (typeof result === "string") {
                return [{ type: "text", text: result }];
              }
              if (result.text) {
                return [
                  { type: "text", text: result.text },
                  {
                    type: "image",
                    data: result.data,
                    mimeType: result.mimeType,
                  },
                ];
              }
              return [
                { type: "image", data: result.data, mimeType: result.mimeType },
              ];
            },
          },
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (error) => {
      // Return error message as string since that's what the type expects
      return error instanceof Error ? error.message : String(error);
    },
  });
}
