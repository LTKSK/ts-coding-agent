import dotenv from "dotenv";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import * as readline from "node:readline/promises";

dotenv.config();

async function main() {
  while (true) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const prompt = await rl.question("Enter your prompt: ");
    const response = await generateText({
      model: openai("gpt-4.1-nano"),
      prompt: [{ role: "user", content: prompt }],
    });
    console.log("Response:", response.text);
  }
}

console.log("Starting the AI coding agent...");
await main();

// console.log(process.env.OPENAI_API_KEY);
