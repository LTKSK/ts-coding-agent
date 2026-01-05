import { createInterface } from "node:readline/promises";

/**
 * ユーザーにファイル作成の許可を求める
 */
export async function askUserPermission(question: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(question);
    return (
      answer.toLowerCase().trim() === "yes" ||
      answer.toLowerCase().trim() === "y"
    );
  } finally {
    rl.close();
  }
}
