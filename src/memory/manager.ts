// memory/manager.ts

import * as process from "node:process";
import { DatabaseManager } from "./database.js";
import { Repository } from "./repository.js";
import { Session as SessionClass } from "./memory.js";
import type { Session, SessionSummary, Message } from "./memory.js";

/**
 * Manager handles memory operations
 */
export class Manager {
  private dbManager: DatabaseManager;
  private repository: Repository;
  private currentSession: Session | null = null;

  private constructor(dbManager: DatabaseManager, repository: Repository) {
    this.dbManager = dbManager;
    this.repository = repository;
  }

  /**
   * Creates a new memory manager
   */
  static create(dbPath: string): Manager {
    const dbManager = DatabaseManager.create(dbPath);
    const repository = new Repository(dbManager.getDB());

    return new Manager(dbManager, repository);
  }

  /**
   * Closes the memory manager
   * Note: Does not end the current session - it remains active for next startup
   */
  close(): void {
    this.dbManager.close();
  }

  /**
   * Creates a new session
   */
  startSession(projectPath: string, modelUsed: string): Session {
    // Generate session ID based on timestamp
    const now = new Date();
    const sessionID = `session_${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(
      now.getHours()
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
      now.getSeconds()
    ).padStart(2, "0")}`;

    const session = new SessionClass(sessionID, now, projectPath, modelUsed);

    this.repository.createSession(session);

    this.currentSession = session;
    return session;
  }

  /**
   * Restores an existing session
   */
  restoreSession(sessionID: string): Session {
    const session = this.repository.getSession(sessionID);

    if (!session) {
      throw new Error(`Session not found: ${sessionID}`);
    }

    this.currentSession = session;
    return session;
  }

  /**
   * Ends the current session
   */
  endSession(): void {
    if (!this.currentSession) {
      return;
    }

    const now = new Date();
    this.repository.endSession(this.currentSession.id, now);

    // Update local session
    this.currentSession.endedAt = now;
    this.currentSession = null;
  }

  /**
   * Returns the current session
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Saves a message to the current session
   */
  saveMessage(
    role: "user" | "assistant" | "tool",
    content: string,
    toolCalls?: string | null,
    toolResults?: string | null
  ): number | null {
    if (!this.currentSession) {
      return null;
    }

    const message: Omit<Message, "id"> = {
      sessionId: this.currentSession.id,
      timestamp: new Date(),
      role,
      content,
      toolCalls: toolCalls ?? undefined,
      toolResults: toolResults ?? undefined,
    };

    return this.repository.addMessage(message);
  }

  /**
   * Gets active session for a project path
   */
  getActiveSession(projectPath: string): Session | null {
    return this.repository.getActiveSession(projectPath);
  }

  /**
   * Returns sessions for a specific project
   */
  getSessionsByProject(projectPath: string, limit?: number): SessionSummary[] {
    return this.repository.getSessionSummaries(projectPath, limit);
  }

  /**
   * Returns sessions for the current working directory
   */
  getCurrentProjectSessions(limit?: number): SessionSummary[] {
    const currentDir = process.cwd();
    return this.getSessionsByProject(currentDir, limit);
  }

  /**
   * Returns all messages for a session
   */
  getSessionMessages(sessionID: string): Message[] {
    return this.repository.getMessages(sessionID);
  }

  /**
   * Returns recent sessions across all projects
   */
  getRecentSessions(limit: number): SessionSummary[] {
    return this.repository.getRecentSessions(limit);
  }

  /**
   * Deletes a session and all its messages
   */
  deleteSession(sessionID: string): void {
    // If deleting current session, clear it
    if (this.currentSession?.id === sessionID) {
      this.currentSession = null;
    }

    this.repository.deleteSession(sessionID);
  }
}
