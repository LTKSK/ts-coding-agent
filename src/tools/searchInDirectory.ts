import { tool } from "ai";
import { z } from "zod";
import fs from "node:fs/promises";

export const searchInDirectoryTool = tool({
  description:
    "Searches for files containing a specific keyword within a given directory.",
  inputSchema: z.object({
    directoryPath: z
      .string()
      .describe("The path to the directory to search in."),
    keyword: z.string().describe("The keyword to search for in files."),
  }),
  outputSchema: z.discriminatedUnion("ok", [
    z.object({
      ok: z.literal(true),
      files: z
        .array(z.string())
        .describe("List of file paths that contain the keyword."),
    }),
    z.object({
      ok: z.literal(false),
      error: z
        .string()
        .describe("The error message if the search could not be completed."),
    }),
  ]),
  execute: async ({ directoryPath, keyword }) => {
    try {
      const files = await fs.readdir(directoryPath);
      const matchingFiles: string[] = [];

      for (const file of files) {
        const filePath = `${directoryPath}/${file}`;
        const content = await fs.readFile(filePath, "utf-8");
        if (content.includes(keyword)) {
          matchingFiles.push(filePath);
        }
      }

      return { ok: true, files: matchingFiles };
    } catch (error) {
      return {
        ok: false,
        error: `Error searching in directory at ${directoryPath}: ${
          (error as Error).message
        }`,
      };
    }
  },
});
