import dotenv from "dotenv";
import { generateText, ModelMessage, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import * as readline from "node:readline/promises";
import { readFileTool } from "./tools/readFile.js";
import { listFilesTool } from "./tools/listFiles.js";
import { writeFileTool } from "./tools/writeFile.js";
import { searchInDirectoryTool } from "./tools/searchInDirectory.js";
import { editFileTool } from "./tools/editFile.js";
import { copyFileTool } from "./tools/copyFile.js";
import { initReadline } from "./interaction/input.js";
import { systemPrompt } from "./prompts/system.js";

dotenv.config();

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // グローバルreadlineインターフェースを初期化
  initReadline(rl);

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
    messages.push({ role: "user", content: prompt });
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
        // console.log("-----\n");
      },
      // ぐるぐる回すには結構なstep数が必要なので暫定30に設定
      // この設定がないとtool呼び出しした後に解答まで進まなくなってしまう
      stopWhen: stepCountIs(30),
    });
    messages.push(...response.messages);
    console.log(`Answer: ${text}`);
  }
  console.log("Goodbye!");
}

console.log("Starting the AI coding agent...");
await main();
