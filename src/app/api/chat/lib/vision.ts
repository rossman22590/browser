import { takeScreenshot } from "@/lib/operator/actions";
import {
  clearDomHighlights,
  clickElementByHighlightIndex,
  getDomState,
  highlightDomElements,
} from "@/lib/operator/dom";
import { google } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import type { Page } from "playwright-core";
import z from "zod";

/**
 * Gets coordinates for a target object in an image using vlm, doesn't work well atm.
 */
export async function getTargetCoordinates(
  imageBuffer: Buffer,
  targetDescription: string,
) {
  const model = google("gemini-1.5-flash-latest");

  const data = await generateObject({
    model,
    schema: z.object({
      coordinates: z.array(z.number().min(0).max(1000)).length(4),
    }),
    system: `You are a vision model that locates objects in images. The user will give you an image and a description of the object you need to find.
     You will need to return the bounding box coordinates of the object in the image as an array of 4 numbers: [xmin, xmax, ymin, ymax]. Use coordinates between 0 and 1000.`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Find the bounding box coordinates of this object: ${targetDescription}. Return the coordinates as an array [xmin, xmax, ymin, ymax]. All values should be between 0 and 1000.`,
          },
          {
            type: "image",
            image: imageBuffer,
          },
        ],
      },
    ],
  });

  if (!data) {
    throw new Error("No coordinates returned from vision model");
  }

  const [xmin, xmax, ymin, ymax] = data.object.coordinates;

  const centerPointX = (xmin + xmax) / 2;
  const centerPointY = (ymin + ymax) / 2;

  const centerPoint = {
    x: centerPointX / 1000,
    y: centerPointY / 1000,
  };

  return {
    xmin: xmin / 1000,
    xmax: xmax / 1000,
    ymin: ymin / 1000,
    ymax: ymax / 1000,
    centerPoint,
  };
}

export async function viewAllClickableElements(page: Page) {
  const { domState, rawDom } = await getDomState(page, true);
  await highlightDomElements(page, rawDom);
  const { screenshot } = await takeScreenshot(page);
  await clearDomHighlights(page);
  return {
    screenshot,
    domState,
  };
}
export async function clickElementByIndex(page: Page, index: number) {
  const { domState, rawDom } = await getDomState(page, true);
  const result = await clickElementByHighlightIndex(page, domState, index);
  return result;
}

/**
 * Gets the element to click based on a natural language instruction
 */
export async function clickElementByVision(page: Page, instruction: string) {
  // First highlight all interactive elements
  const { domState, rawDom } = await getDomState(page, true);
  // 2) Actually draw the highlight overlays so the screenshot has numbered boxes
  await highlightDomElements(page, rawDom);
  const { screenshot } = await takeScreenshot(page);

  const model = google("gemini-1.5-flash-latest");

  const data = await generateObject({
    model,
    schema: z.object({
      reasoning: z.string(),
      clickIndex: z.number(),
    }),
    system: `You are a vision model that helps users interact with web pages. 
The image will show a webpage with numbered highlights on clickable elements.
Your task is to identify which highlighted element best matches the user's instruction.
Start with your reasoning and then return the index of the element to click.
Sometimes there will be no clickable element that matches the instruction. In that case, return -1, but explain why.
`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Looking at the numbered highlights in this screenshot, which element best matches this instruction: "${instruction}"?`,
          },
          {
            type: "image",
            image: screenshot.data,
            mimeType: screenshot.mimeType,
          },
        ],
      },
    ],
  });

  if (!data) {
    return {
      reasoning: "No element selection returned from vision model",
      clickIndex: -1,
    };
  }
  await clearDomHighlights(page);

  if (data.object.clickIndex === -1) {
    return {
      reasoning: data.object.reasoning,
      clickIndex: -1,
    };
  }

  const success = await clickElementByHighlightIndex(
    page,
    domState,
    data.object.clickIndex,
  );

  if (!success) {
    return {
      reasoning: `Failed to click element ${data.object.clickIndex}`,
      clickIndex: -1,
    };
  }
  console.log("success", data.object);

  return {
    reasoning: data.object.reasoning,
    clickIndex: data.object.clickIndex,
  };
}
