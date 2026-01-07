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

  // セッション開始
  const session = memoryManager.startSession(currentProject, modelName);
  console.log(`Session started: ${session.id}`);

  // 会話履歴を保持する配列
  const messages: ModelMessage[] = [
    {
      role: "system",
      content: systemPrompt,
    },
  ];
  while (true) {
    const prompt = await rl.question("Enter your prompt: ");
    if (prompt.toLowerCase() === "exit") {
      console.log("Exiting...");
      break;
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
        console.log("\n", text);
        console.log("[Step] Tool calls:", toolCalls);
        console.log("[Step] Tool results:", toolResults);

        // ツール呼び出しとツール結果をDBに保存
        if (toolCalls && toolCalls.length > 0) {
          const toolCallsJSON = JSON.stringify(toolCalls);
          memoryManager.saveMessage("assistant", text || "", toolCallsJSON);
        }
        if (toolResults && toolResults.length > 0) {
          const toolResultsJSON = JSON.stringify(toolResults);
          memoryManager.saveMessage("tool", "", null, toolResultsJSON);
        }
      },
      // ぐるぐる回すには結構なstep数が必要なので暫定30に設定
      // この設定がないとtool呼び出しした後に解答まで進まなくなってしまう
      stopWhen: stepCountIs(30),
    });

    // レスポンスメッセージを配列に追加
    messages.push(...response.messages);

    // アシスタントの最終回答をDBに保存
    memoryManager.saveMessage("assistant", text);
    console.log(`Answer: ${text}`);
  }

  // セッション終了とクリーンアップ
  console.log("Goodbye!");
  memoryManager.endSession();
  memoryManager.close();
  console.log(`Session ended: ${session.id}`);
  rl.close();
}

console.log("Starting the AI coding agent...");
await main();
