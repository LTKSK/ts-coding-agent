import type { Interface as ReadlineInterface } from "node:readline/promises";

/**
 * グローバルなreadlineインターフェース
 */
let globalReadline: ReadlineInterface | null = null;

/**
 * readlineインターフェースを初期化する（mainから呼ばれる）
 */
export function initReadline(rl: ReadlineInterface) {
  globalReadline = rl;
}

/**
 * readlineインターフェースを取得する
 */
export function getReadline(): ReadlineInterface {
  if (!globalReadline) {
    throw new Error(
      "Readline interface not initialized. Call initReadline() first."
    );
  }
  return globalReadline;
}
