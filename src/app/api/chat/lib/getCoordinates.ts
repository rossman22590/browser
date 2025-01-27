import { google } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import z from "zod";

/**
 * Gets coordinates for a target object in an image using Moondream
 */
export async function getTargetCoordinates(
  imageBuffer: Buffer,
  targetDescription: string
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
