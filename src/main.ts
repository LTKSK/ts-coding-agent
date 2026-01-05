import dotenv from "dotenv";
import { generateText, ModelMessage, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import * as readline from "node:readline/promises";
import { readFileTool } from "./tools/readFile.js";
import { listFilesTool } from "./tools/listFiles.js";
import { writeFileTool } from "./tools/writeFile.js";
import { searchInDirectoryTool } from "./tools/searchInDirectory.js";
import { editFileTool } from "./tools/editFile.js";
import { initReadline } from "./interaction/input.js";

dotenv.config();

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // グローバルreadlineインターフェースを初期化
  initReadline(rl);

  const messages: ModelMessage[] = [];
  while (true) {
    const prompt = await rl.question("Enter your prompt: ");
    if (prompt.toLowerCase() === "exit") {
      console.log("Exiting...");
      break;
    }
    messages.push({ role: "user", content: prompt });
    const { response, text } = await generateText({
      model: openai("gpt-4.1-nano"),
      messages,
      tools: {
        readFile: readFileTool,
        listFiles: listFilesTool,
        writeFile: writeFileTool,
        editFile: editFileTool,
        searchInDirectory: searchInDirectoryTool,
      },
      onStepFinish: ({ text, toolCalls, toolResults }) => {
        console.log("\n", text);
        console.log("[Step] Tool calls:", toolCalls);
        console.log("[Step] Tool results:", toolResults);
        // console.log("-----\n");
      },
      stopWhen: stepCountIs(10),
    });
    messages.push(...response.messages);
    console.log(`Answer: ${text}`);
  }
  console.log("Goodbye!");
}

console.log("Starting the AI coding agent...");
await main();
