import { tool } from "ai";
import { z } from "zod";
import fs from "node:fs/promises";
import { askUserPermission } from "../interaction/ask.js";

export const editFileTool = tool({
  description: "Edits the content of an existing file at the specified path.",
  inputSchema: z.object({
    path: z.string().describe("The path to the file to edit."),
    newContent: z.string().describe("The new content to write to the file."),
  }),
  outputSchema: z.discriminatedUnion("ok", [
    z.object({
      ok: z.literal(true),
      message: z.string().describe("Success message after editing the file."),
    }),
    z.object({
      ok: z.literal(false),
      error: z
        .string()
        .describe("The error message if the file could not be edited."),
    }),
  ]),
  execute: async ({ path: filePath, newContent }) => {
    try {
      // ファイルが存在するかチェック
      const fileExists = await fs
        .stat(filePath)
        .then(() => true)
        .catch(() => false);
      if (!fileExists) {
        return {
          ok: false,
          error: `File at ${filePath} does not exist. You should use "writeFile" tool instead.`,
        };
      }

      // ユーザーに許可を求める
      const hasPermission = await askUserPermission(
        `ファイルを変更しますか？ ${filePath} (yes/no): `
      );
      if (!hasPermission) {
        return {
          ok: false,
          error: `User denied permission to create file at ${filePath}`,
        };
      }

      await fs.writeFile(filePath, newContent, "utf-8");
      return { ok: true, message: `File at ${filePath} edited successfully.` };
    } catch (error) {
      return {
        ok: false,
        error: `Error editing file at ${filePath}: ${(error as Error).message}`,
      };
    }
  },
});
