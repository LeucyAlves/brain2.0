import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const DB_PATH = path.join(process.cwd(), 'data', 'tasks.db');

export interface Comment {
    id: string;
    task_id: string;
    author: string;
    content: string;
    created_at: string;
}

let _db: Database.Database | null = null;

function getDb(): Database.Database {
    if (_db) return _db;

    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('synchronous = NORMAL');
    _db.pragma('foreign_keys = ON'); // To enable ON DELETE CASCADE

    _db.exec(`
    CREATE TABLE IF NOT EXISTS task_comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_comments_task ON task_comments(task_id);
  `);

    return _db;
}

function parseRow(row: Record<string, unknown>): Comment {
    return {
        id: row.id as string,
        task_id: row.task_id as string,
        author: row.author as string,
        content: row.content as string,
        created_at: row.created_at as string,
    };
}

export function getComments(task_id: string): Comment[] {
    const db = getDb();
    const rows = db.prepare(
        'SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at ASC'
    ).all(task_id) as Record<string, unknown>[];
    
    return rows.map(parseRow);
}

export interface CreateCommentData {
    task_id: string;
    author: string;
    content: string;
}

export function createComment(data: CreateCommentData): Comment {
    const db = getDb();
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
    INSERT INTO task_comments (id, task_id, author, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
        id,
        data.task_id,
        data.author,
        data.content,
        now
    );

    return {
        id,
        task_id: data.task_id,
        author: data.author,
        content: data.content,
        created_at: now,
    };
}

export function deleteComment(id: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM task_comments WHERE id = ?').run(id);
    return result.changes > 0;
}
