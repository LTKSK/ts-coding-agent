import { Tool } from "ai";

export type ToolDefinition = {
  schema: Tool;
  execute: (...args: unknown[]) => Promise<string>;
};

export type ToolResult = {
  success: boolean;
  content: string;
  files: string[];
  error: string | null;
};
