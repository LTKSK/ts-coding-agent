import { tool } from "ai";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { askUserPermission } from "../interaction/ask.js";

export const copyFileTool = tool({
  description: "Copies a file from source path to destination path.",
  inputSchema: z.object({
    sourcePath: z.string().describe("The path of the source file."),
    destinationPath: z.string().describe("The path of the destination file."),
  }),
  outputSchema: z.discriminatedUnion("ok", [
    z.object({
      ok: z.literal(true),
      message: z.string().describe("Success message after copying the file."),
    }),
    z.object({
      ok: z.literal(false),
      error: z.string().describe("The error message if the copy process fails."),
    }),
  ]),
  execute: async ({ sourcePath, destinationPath }) => {
    try {
      // 既存のファイルかどうか確認
      await fs.access(sourcePath);

      // コピー先のファイルが既に存在する場合はエラー
      try {
        await fs.access(destinationPath);
        return {
          ok: false,
          error: `Destination file at ${destinationPath} already exists.`,
        };
      } catch {
        // 存在しない場合は続行
      }

      // ユーザにコピーを許可を求める
      const hasPermission = await askUserPermission(
        `このファイル ${sourcePath} を ${destinationPath} にコピーしますか？ (yes/no): `
      );
      if (!hasPermission) {
        return { ok: false, error: "User denied permission to copy the file." };
      }

      // ディレクトリを作成
      const dir = path.dirname(destinationPath);
      await fs.mkdir(dir, { recursive: true });

      // ファイルをコピー
      const data = await fs.readFile(sourcePath);
      await fs.writeFile(destinationPath, data);

      return {
        ok: true,
        message: `File copied from ${sourcePath} to ${destinationPath} successfully.`,
      };
    } catch (error) {
      return {
        ok: false,
        error: `Failed to copy file: ${(error as Error).message}`,
      };
    }
  },
});