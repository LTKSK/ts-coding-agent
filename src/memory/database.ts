// memory/database.ts

import Database from "better-sqlite3";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Database handles SQLite database operations
 */
export class DatabaseManager {
  private db: Database.Database;

  private constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Creates a new database instance
   */
  static create(dbPath: string): DatabaseManager {
    // Create directory if it doesn't exist
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    }

    // Open database connection
    const db = new Database(dbPath);

    const manager = new DatabaseManager(db);

    // Initialize tables
    manager.initTables();

    return manager;
  }

  /**
   * Closes the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Creates the necessary tables if they don't exist
   */
  private initTables(): void {
    // Create sessions table
    const sessionTableSQL = `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        project_path TEXT NOT NULL,
        model_used TEXT NOT NULL
      );
    `;

    this.db.exec(sessionTableSQL);

    // Create messages table
    const messageTableSQL = `
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT REFERENCES sessions(id),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        role TEXT NOT NULL,
        content TEXT,
        tool_calls TEXT,
        tool_results TEXT
      );
    `;

    this.db.exec(messageTableSQL);

    // Create indexes for better performance
    const indexSQL = [
      "CREATE INDEX IF NOT EXISTS idx_sessions_project_path ON sessions(project_path);",
      "CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);",
      "CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);",
    ];

    for (const sql of indexSQL) {
      this.db.exec(sql);
    }
  }

  /**
   * Returns the underlying database connection
   */
  getDB(): Database.Database {
    return this.db;
  }
}
