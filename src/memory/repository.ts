// memory/repository.ts

import type Database from 'better-sqlite3';
import type { Session, Message, SessionSummary } from './memory.js';
import { Session as SessionClass } from './memory.js';

/**
 * Repository handles database operations for sessions and messages
 */
export class Repository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // ========== Session Operations ==========

  /**
   * Creates a new session in the database
   */
  createSession(session: Session): void {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, started_at, ended_at, project_path, model_used)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      session.id,
      session.startedAt.toISOString(),
      session.endedAt ? session.endedAt.toISOString() : null,
      session.projectPath,
      session.modelUsed
    );
  }

  /**
   * Gets a session by ID
   */
  getSession(id: string): Session | null {
    const stmt = this.db.prepare(`
      SELECT id, started_at, ended_at, project_path, model_used
      FROM sessions
      WHERE id = ?
    `);

    const row = stmt.get(id) as {
      id: string;
      started_at: string;
      ended_at: string | null;
      project_path: string;
      model_used: string;
    } | undefined;

    if (!row) {
      return null;
    }

    return new SessionClass(
      row.id,
      new Date(row.started_at),
      row.project_path,
      row.model_used,
      row.ended_at ? new Date(row.ended_at) : null
    );
  }

  /**
   * Gets all sessions for a specific project path
   */
  getSessionsByProjectPath(projectPath: string): Session[] {
    const stmt = this.db.prepare(`
      SELECT id, started_at, ended_at, project_path, model_used
      FROM sessions
      WHERE project_path = ?
      ORDER BY started_at DESC
    `);

    const rows = stmt.all(projectPath) as Array<{
      id: string;
      started_at: string;
      ended_at: string | null;
      project_path: string;
      model_used: string;
    }>;

    return rows.map(
      (row) =>
        new SessionClass(
          row.id,
          new Date(row.started_at),
          row.project_path,
          row.model_used,
          row.ended_at ? new Date(row.ended_at) : null
        )
    );
  }

  /**
   * Gets active session for a project path
   */
  getActiveSession(projectPath: string): Session | null {
    const stmt = this.db.prepare(`
      SELECT id, started_at, ended_at, project_path, model_used
      FROM sessions
      WHERE project_path = ? AND ended_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `);

    const row = stmt.get(projectPath) as {
      id: string;
      started_at: string;
      ended_at: string | null;
      project_path: string;
      model_used: string;
    } | undefined;

    if (!row) {
      return null;
    }

    return new SessionClass(
      row.id,
      new Date(row.started_at),
      row.project_path,
      row.model_used,
      row.ended_at ? new Date(row.ended_at) : null
    );
  }

  /**
   * Updates a session's end time
   */
  endSession(id: string, endedAt: Date): void {
    const stmt = this.db.prepare(`
      UPDATE sessions
      SET ended_at = ?
      WHERE id = ?
    `);

    stmt.run(endedAt.toISOString(), id);
  }

  /**
   * Gets session summaries for a project path
   */
  getSessionSummaries(projectPath: string, limit?: number): SessionSummary[] {
    const sql = `
      SELECT
        s.id,
        s.started_at,
        s.ended_at,
        s.project_path,
        s.model_used,
        COUNT(m.id) as message_count,
        COALESCE(
          (SELECT content FROM messages WHERE session_id = s.id ORDER BY timestamp DESC LIMIT 1),
          ''
        ) as last_message
      FROM sessions s
      LEFT JOIN messages m ON s.id = m.session_id
      WHERE s.project_path = ?
      GROUP BY s.id
      ORDER BY s.started_at DESC
      ${limit ? 'LIMIT ?' : ''}
    `;

    const stmt = this.db.prepare(sql);
    const rows = (limit ? stmt.all(projectPath, limit) : stmt.all(projectPath)) as Array<{
      id: string;
      started_at: string;
      ended_at: string | null;
      project_path: string;
      model_used: string;
      message_count: number;
      last_message: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      startedAt: new Date(row.started_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : null,
      projectPath: row.project_path,
      modelUsed: row.model_used,
      messageCount: row.message_count,
      lastMessage: row.last_message,
    }));
  }

  /**
   * Gets recent session summaries across all projects
   */
  getRecentSessions(limit: number): SessionSummary[] {
    const stmt = this.db.prepare(`
      SELECT
        s.id,
        s.started_at,
        s.ended_at,
        s.project_path,
        s.model_used,
        COUNT(m.id) as message_count,
        COALESCE(
          (SELECT content FROM messages WHERE session_id = s.id ORDER BY timestamp DESC LIMIT 1),
          ''
        ) as last_message
      FROM sessions s
      LEFT JOIN messages m ON s.id = m.session_id
      GROUP BY s.id
      ORDER BY s.started_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as Array<{
      id: string;
      started_at: string;
      ended_at: string | null;
      project_path: string;
      model_used: string;
      message_count: number;
      last_message: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      startedAt: new Date(row.started_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : null,
      projectPath: row.project_path,
      modelUsed: row.model_used,
      messageCount: row.message_count,
      lastMessage: row.last_message,
    }));
  }

  // ========== Message Operations ==========

  /**
   * Adds a message to the database
   */
  addMessage(message: Omit<Message, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO messages (session_id, timestamp, role, content, tool_calls, tool_results)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      message.sessionId,
      message.timestamp.toISOString(),
      message.role,
      message.content,
      message.toolCalls ?? null,
      message.toolResults ?? null
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Gets all messages for a session
   */
  getMessages(sessionId: string): Message[] {
    const stmt = this.db.prepare(`
      SELECT id, session_id, timestamp, role, content, tool_calls, tool_results
      FROM messages
      WHERE session_id = ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(sessionId) as Array<{
      id: number;
      session_id: string;
      timestamp: string;
      role: string;
      content: string;
      tool_calls: string | null;
      tool_results: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      timestamp: new Date(row.timestamp),
      role: row.role as 'user' | 'assistant' | 'tool',
      content: row.content,
      toolCalls: row.tool_calls,
      toolResults: row.tool_results,
    }));
  }

  /**
   * Gets a specific message by ID
   */
  getMessage(id: number): Message | null {
    const stmt = this.db.prepare(`
      SELECT id, session_id, timestamp, role, content, tool_calls, tool_results
      FROM messages
      WHERE id = ?
    `);

    const row = stmt.get(id) as {
      id: number;
      session_id: string;
      timestamp: string;
      role: string;
      content: string;
      tool_calls: string | null;
      tool_results: string | null;
    } | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      sessionId: row.session_id,
      timestamp: new Date(row.timestamp),
      role: row.role as 'user' | 'assistant' | 'tool',
      content: row.content,
      toolCalls: row.tool_calls,
      toolResults: row.tool_results,
    };
  }

  /**
   * Deletes all messages for a session
   */
  deleteMessages(sessionId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM messages
      WHERE session_id = ?
    `);

    stmt.run(sessionId);
  }

  /**
   * Deletes a session and all its messages
   */
  deleteSession(id: string): void {
    // Delete messages first (due to foreign key)
    this.deleteMessages(id);

    // Delete session
    const stmt = this.db.prepare(`
      DELETE FROM sessions
      WHERE id = ?
    `);

    stmt.run(id);
  }
}
