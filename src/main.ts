import dotenv from "dotenv";
import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import * as readline from "node:readline/promises";
import { readFileTool } from "./tools/readFile.js";

dotenv.config();

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  while (true) {
    const prompt = await rl.question("Enter your prompt: ");
    const response = await generateText({
      model: openai("gpt-4.1-nano"),
      prompt: [{ role: "user", content: prompt }],
      tools: { readFile: readFileTool },
      onStepFinish: ({ text, toolCalls, toolResults }) => {
        // console.log("\n[Step] Text:", text);
        // console.log("[Step] Tool calls:", toolCalls);
        // console.log("[Step] Tool results:", toolResults);
      },
      stopWhen: stepCountIs(5),
    });
    console.log("Response:", response.text);
  }
}

console.log("Starting the AI coding agent...");
await main();
