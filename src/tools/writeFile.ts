import { tool } from "ai";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { askUserPermission } from "../interaction/ask.js";

export const writeFileTool = tool({
  description: "Writes content to a file at the specified path.",
  inputSchema: z.object({
    path: z.string().describe("The path to the file to write to."),
    content: z.string().describe("The content to write to the file."),
  }),
  outputSchema: z.discriminatedUnion("ok", [
    z.object({
      ok: z.literal(true),
      message: z.string().describe("Success message after writing the file."),
    }),
    z.object({
      ok: z.literal(false),
      error: z
        .string()
        .describe("The error message if the file could not be written."),
    }),
  ]),
  execute: async ({ path: filePath, content }) => {
    try {
      // ファイルが既に存在するかチェック
      const fileExists = await fs
        .stat(filePath)
        .then(() => true)
        .catch(() => false);
      if (fileExists) {
        return {
          ok: false,
          error: `File at ${filePath} already exists. You should use "editFile" tool instead.`,
        };
      }

      // ユーザーに許可を求める
      const hasPermission = await askUserPermission(
        `ファイルを作成しますか？ ${filePath} (yes/no): `
      );
      if (!hasPermission) {
        return {
          ok: false,
          error: `User denied permission to create file at ${filePath}`,
        };
      }

      // ディレクトリを作成してファイルを書き込む
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, "utf-8");
      return { ok: true, message: `File written successfully to ${filePath}` };
    } catch (error) {
      return {
        ok: false,
        error: `Error writing file at ${filePath}: ${(error as Error).message}`,
      };
    }
  },
});
