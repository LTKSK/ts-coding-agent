import { tool } from "ai";
import { z } from "zod";
import fs from "node:fs/promises";

export const readFileTool = tool({
  description: "Reads the content of a file given its path.",
  inputSchema: z.object({
    path: z.string().describe("The path to the file to read."),
  }),
  outputSchema: z.discriminatedUnion("ok", [
    z.object({
      ok: z.literal(true),
      content: z.string().describe("The content of the file."),
    }),
    z.object({
      ok: z.literal(false),
      error: z
        .string()
        .describe("The error message if the file could not be read."),
    }),
  ]),
  execute: async ({ path }) => {
    try {
      const content = await fs.readFile(path, "utf-8");
      return { ok: true, content };
    } catch (error) {
      return {
        ok: false,
        error: `Error reading file at ${path}: ${(error as Error).message}`,
      };
    }
  },
});
