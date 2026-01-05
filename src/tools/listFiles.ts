import { tool } from "ai";
import { z } from "zod";
import fs from "node:fs/promises";

export const listFilesTool = tool({
  description: "Lists all files and directories in a given directory path.",
  inputSchema: z.object({
    path: z.string().describe("The path to the directory to list."),
  }),
  outputSchema: z.discriminatedUnion("ok", [
    z.object({
      ok: z.literal(true),
      entries: z
        .array(z.string())
        .describe("The list of files and directories in the specified path."),
    }),
    z.object({
      ok: z.literal(false),
      error: z
        .string()
        .describe("The error message if the directory could not be listed."),
    }),
  ]),
  execute: async ({ path }) => {
    try {
      const entries = await fs.readdir(path);
      return { ok: true, entries };
    } catch (error) {
      return {
        ok: false,
        error: `Error listing directory at ${path}: ${
          (error as Error).message
        }`,
      };
    }
  },
});
