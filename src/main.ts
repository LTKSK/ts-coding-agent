import dotenv from "dotenv";
import { generateText, ModelMessage, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import * as readline from "node:readline/promises";
import * as process from "node:process";
import { readFileTool } from "./tools/readFile.js";
import { listFilesTool } from "./tools/listFiles.js";
import { writeFileTool } from "./tools/writeFile.js";
import { searchInDirectoryTool } from "./tools/searchInDirectory.js";
import { editFileTool } from "./tools/editFile.js";
import { copyFileTool } from "./tools/copyFile.js";
import { initReadline } from "./interaction/input.js";
import { systemPrompt } from "./prompts/system.js";
import { Manager } from "./memory/index.js";

dotenv.config();

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // グローバルreadlineインターフェースを初期化
  initReadline(rl);

  // メモリマネージャーを初期化
  const memoryManager = Manager.create("./data/memory.db");
  const currentProject = process.cwd();
  const modelName = "gpt-4.1-mini";

  // 前回のアクティブセッションを確認
  let session = memoryManager.getActiveSession(currentProject);

  // 会話履歴を保持する配列
  const messages: ModelMessage[] = [
    {
      role: "system",
      content: systemPrompt,
    },
  ];

  if (session) {
    // 既存セッションを復元
    memoryManager.restoreSession(session.id);
    console.log(`📂 Restored session: ${session.id}`);
    console.log(`   Started at: ${session.startedAt.toLocaleString()}`);

    // 過去のメッセージを読み込み
    const savedMessages = memoryManager.getSessionMessages(session.id);
    console.log(`   Loaded ${savedMessages.length} messages from history`);

    // メッセージ履歴をAIのコンテキストに追加
    for (const msg of savedMessages) {
      // システムメッセージはスキップ（既に追加済み）
      if (msg.role === "tool") {
        // ツールメッセージは特別な形式で追加する必要がある場合はここで処理
        // 現時点ではスキップ
        continue;
      }

      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // 最後の5件を表示
    if (savedMessages.length > 0) {
      const displayCount = Math.min(5, savedMessages.length);
      const recentMessages = savedMessages.slice(-displayCount);

      console.log(`\n--- Last ${displayCount} messages ---`);
      for (const msg of recentMessages) {
        if (msg.role === "tool") {
          // ツールメッセージはスキップ
          continue;
        }

        // メッセージを切り詰め（長すぎる場合）
        const maxLength = 100;
        let displayContent = msg.content;
        if (displayContent.length > maxLength) {
          displayContent = displayContent.substring(0, maxLength) + "...";
        }

        console.log(`[${msg.role.padEnd(9)}] ${displayContent}`);
      }
      console.log("-".repeat(50) + "\n");
    }
  } else {
    // 新規セッション作成
    session = memoryManager.startSession(currentProject, modelName);
    console.log(`✨ New session started: ${session.id}`);
  }

  console.log(`   Type 'new-session' to start a new session`);
  console.log(`   Type 'exit' to quit\n`);
  while (true) {
    const prompt = await rl.question("Enter your prompt: ");

    // exitコマンド
    if (prompt.toLowerCase() === "exit") {
      console.log("Exiting...");
      break;
    }

    // new-sessionコマンド
    if (prompt.toLowerCase() === "new-session") {
      // 現在のセッションを終了
      memoryManager.endSession();
      console.log(`\n✅ Session ended: ${session.id}`);

      // 新しいセッション作成
      session = memoryManager.startSession(currentProject, modelName);
      console.log(`✨ New session started: ${session.id}\n`);

      // メッセージ履歴をリセット（システムプロンプトのみ残す）
      messages.length = 0;
      messages.push({
        role: "system",
        content: systemPrompt,
      });

      continue;
    }

    // ユーザーメッセージを配列とDBに保存
    messages.push({ role: "user", content: prompt });
    memoryManager.saveMessage("user", prompt);
    const { response, text } = await generateText({
      model: openai("gpt-4.1-mini"),
      messages,
      tools: {
        readFile: readFileTool,
        listFiles: listFilesTool,
        writeFile: writeFileTool,
        editFile: editFileTool,
        searchInDirectory: searchInDirectoryTool,
        copyFile: copyFileTool,
      },
      onStepFinish: ({ text, toolCalls, toolResults }) => {
        // デバッグ用というかわかりやすさのため。不要ならコメントアウトして良い
        // console.log("\n", text);

        // ツール呼び出しとツール結果をDBに保存
        if (toolCalls && toolCalls.length > 0) {
          console.log("[Step] Tool calls:", toolCalls);
          const toolCallsJSON = JSON.stringify(toolCalls);
          memoryManager.saveMessage("assistant", text || "", toolCallsJSON);
        }
        if (toolResults && toolResults.length > 0) {
          console.log("[Step] Tool results:", toolResults);
          const toolResultsJSON = JSON.stringify(toolResults);
          memoryManager.saveMessage("tool", "", null, toolResultsJSON);
        }
      },
      // ぐるぐる回すには結構なstep数が必要なので暫定50に設定
      // この設定がないとtool呼び出しした後に解答まで進まなくなってしまう
      stopWhen: stepCountIs(50),
    });

    // レスポンスメッセージを配列に追加
    messages.push(...response.messages);

    // アシスタントの最終回答をDBに保存
    memoryManager.saveMessage("assistant", text);
    console.log(`Answer: ${text}`);
  }

  // クリーンアップ（セッションは終了せずアクティブなまま残す）
  console.log("Goodbye!");
  memoryManager.close();
  console.log(`Session paused: ${session.id} (will resume on next start)`);
  rl.close();
}

console.log("Starting the AI coding agent...");
await main();
