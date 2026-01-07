// memory/memory.ts

/**
 * Session represents a conversation session
 */
export class Session {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  projectPath: string;
  modelUsed: string;

  constructor(
    id: string,
    startedAt: Date,
    projectPath: string,
    modelUsed: string,
    endedAt: Date | null = null
  ) {
    this.id = id;
    this.startedAt = startedAt;
    this.endedAt = endedAt;
    this.projectPath = projectPath;
    this.modelUsed = modelUsed;
  }

  /**
   * Returns true if the session is still active (not ended)
   */
  isActive(): boolean {
    return this.endedAt === null;
  }

  /**
   * Returns the duration of the session in milliseconds
   */
  duration(): number {
    if (this.endedAt === null) {
      return Date.now() - this.startedAt.getTime();
    }
    return this.endedAt.getTime() - this.startedAt.getTime();
  }
}

/**
 * Message represents a single message in the conversation
 */
export interface Message {
  id: number;
  sessionId: string;
  timestamp: Date;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: string | null;   // JSON string
  toolResults?: string | null; // JSON string
}

/**
 * SessionSummary represents a brief summary of a session for listing
 */
export interface SessionSummary {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  projectPath: string;
  modelUsed: string;
  messageCount: number;
  lastMessage: string;
}
