import { getReadline } from "./input.js";

/**
 * ユーザーにファイル作成・編集の許可を求める
 */
export async function askUserPermission(question: string): Promise<boolean> {
  const rl = getReadline();
  const answer = await rl.question(question);
  return (
    answer.toLowerCase().trim() === "yes" ||
    answer.toLowerCase().trim() === "y"
  );
}
