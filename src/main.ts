import dotenv from "dotenv";
import { generateText, ModelMessage, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import * as readline from "node:readline/promises";
import { readFileTool } from "./tools/readFile.js";

dotenv.config();

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
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
      tools: { readFile: readFileTool },
      onStepFinish: ({ text, toolCalls, toolResults }) => {
        // console.log("\n[Step] Text:", text);
        // console.log("[Step] Tool calls:", toolCalls);
        // console.log("[Step] Tool results:", toolResults);
      },
      stopWhen: stepCountIs(5),
    });
    messages.push(...response.messages);
    // response.
    console.log("\n[AI Response]:", text);
    // console.log("\n[AI Response]:", response.messages);
  }
  console.log("Goodbye!");
}

console.log("Starting the AI coding agent...");
await main();
