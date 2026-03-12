/**
 * SQLite-backed Task Board
 * Kanban board with 6 columns: backlog, sprint, todo, review, correction, done
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const DB_PATH = path.join(process.cwd(), 'data', 'tasks.db');

export type TaskStatus = 'backlog' | 'sprint' | 'todo' | 'review' | 'correction' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    assigned_agent: string | null;
    created_at: string;
    updated_at: string;
    position: number;
    metadata: Record<string, unknown> | null;
    output: string | null;
    comments_count?: number;
}

export const TASK_STATUSES: { value: TaskStatus; label: string; emoji: string; color: string }[] = [
    { value: 'backlog', label: 'Backlog', emoji: '📥', color: '#525252' },
    { value: 'sprint', label: 'Sprint', emoji: '🏃', color: '#0A84FF' },
    { value: 'todo', label: 'To Do', emoji: '📋', color: '#FFD60A' },
    { value: 'review', label: 'In Review', emoji: '🔍', color: '#a78bfa' },
    { value: 'correction', label: 'Correction', emoji: '🔧', color: '#FF453A' },
    { value: 'done', label: 'Done', emoji: '✅', color: '#32D74B' },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: '#8A8A8A' },
    { value: 'medium', label: 'Medium', color: '#0A84FF' },
    { value: 'high', label: 'High', color: '#FF9F0A' },
    { value: 'urgent', label: 'Urgent', color: '#FF453A' },
];

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

    _db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'backlog',
      priority TEXT NOT NULL DEFAULT 'medium',
      assigned_agent TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      metadata TEXT,
      output TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(assigned_agent);
    CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(status, position);
  `);

    // Migration for existing tables
    try {
        _db.exec('ALTER TABLE tasks ADD COLUMN output TEXT;');
    } catch (err: any) {
        // Ignorar erro se a coluna já existir
        if (!err.message.includes('duplicate column name')) {
            console.error('[tasks-db] Error applying migration (output):', err);
        }
    }

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

function parseRow(row: Record<string, unknown>): Task {
    return {
        id: row.id as string,
        title: row.title as string,
        description: row.description as string | null,
        status: row.status as TaskStatus,
        priority: row.priority as TaskPriority,
        assigned_agent: row.assigned_agent as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        position: row.position as number,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
        output: row.output as string | null,
        comments_count: typeof row.comments_count === 'number' ? row.comments_count : 0,
    };
}

export interface CreateTaskData {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigned_agent?: string;
    metadata?: Record<string, unknown>;
    output?: string;
}

export function createTask(data: CreateTaskData): Task {
    const db = getDb();
    const id = randomUUID();
    const now = new Date().toISOString();

    // Get max position in target column
    const maxPos = (db.prepare(
        'SELECT COALESCE(MAX(position), -1) as max_pos FROM tasks WHERE status = ?'
    ).get(data.status || 'backlog') as { max_pos: number }).max_pos;

    db.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, assigned_agent, created_at, updated_at, position, metadata, output)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        id,
        data.title,
        data.description || null,
        data.status || 'backlog',
        data.priority || 'medium',
        data.assigned_agent || null,
        now,
        now,
        maxPos + 1,
        data.metadata ? JSON.stringify(data.metadata) : null,
        data.output || null
    );

    return {
        id,
        title: data.title,
        description: data.description || null,
        status: (data.status || 'backlog') as TaskStatus,
        priority: (data.priority || 'medium') as TaskPriority,
        assigned_agent: data.assigned_agent || null,
        created_at: now,
        updated_at: now,
        position: maxPos + 1,
        metadata: data.metadata || null,
        output: data.output || null,
    };
}

export interface UpdateTaskData {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigned_agent?: string | null;
    position?: number;
    metadata?: Record<string, unknown> | null;
    output?: string | null;
}

export function updateTask(id: string, data: UpdateTaskData): Task | null {
    const db = getDb();
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) return null;

    const updates: string[] = ['updated_at = ?'];
    const params: unknown[] = [now];

    if (data.title !== undefined) {
        updates.push('title = ?');
        params.push(data.title);
    }
    if (data.description !== undefined) {
        updates.push('description = ?');
        params.push(data.description);
    }
    if (data.status !== undefined) {
        // If moving to a new column, put at the end
        if (data.status !== existing.status && data.position === undefined) {
            const maxPos = (db.prepare(
                'SELECT COALESCE(MAX(position), -1) as max_pos FROM tasks WHERE status = ?'
            ).get(data.status) as { max_pos: number }).max_pos;
            updates.push('position = ?');
            params.push(maxPos + 1);
        }
        updates.push('status = ?');
        params.push(data.status);
    }
    if (data.priority !== undefined) {
        updates.push('priority = ?');
        params.push(data.priority);
    }
    if (data.assigned_agent !== undefined) {
        updates.push('assigned_agent = ?');
        params.push(data.assigned_agent);
    }
    if (data.position !== undefined) {
        updates.push('position = ?');
        params.push(data.position);
    }
    if (data.metadata !== undefined) {
        updates.push('metadata = ?');
        params.push(data.metadata ? JSON.stringify(data.metadata) : null);
    }
    if (data.output !== undefined) {
        updates.push('output = ?');
        params.push(data.output);
    }

    params.push(id);
    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown>;
    return parseRow(updated);
}

export function deleteTask(id: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return result.changes > 0;
}

export interface GetTasksOptions {
    status?: TaskStatus;
    priority?: TaskPriority;
    assigned_agent?: string;
}

export function getTasks(opts: GetTasksOptions = {}): Task[] {
    const db = getDb();

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (opts.status) {
        conditions.push('t.status = ?');
        params.push(opts.status);
    }
    if (opts.priority) {
        conditions.push('t.priority = ?');
        params.push(opts.priority);
    }
    if (opts.assigned_agent) {
        conditions.push('t.assigned_agent = ?');
        params.push(opts.assigned_agent);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db.prepare(
        `SELECT t.*, (SELECT COUNT(*) FROM task_comments c WHERE c.task_id = t.id) as comments_count FROM tasks t ${where} ORDER BY t.status, t.position ASC, t.created_at ASC`
    ).all(...params) as Record<string, unknown>[];

    return rows.map(parseRow);
}

export function getTaskStats(): Record<TaskStatus, number> {
    const db = getDb();
    const rows = db.prepare(
        'SELECT status, COUNT(*) as count FROM tasks GROUP BY status'
    ).all() as Array<{ status: TaskStatus; count: number }>;

    const stats: Record<TaskStatus, number> = {
        backlog: 0, sprint: 0, todo: 0, review: 0, correction: 0, done: 0,
    };
    for (const r of rows) {
        stats[r.status] = r.count;
    }
    return stats;
}

export function reorderTasks(status: TaskStatus, taskIds: string[]): void {
    const db = getDb();
    const stmt = db.prepare('UPDATE tasks SET position = ?, status = ?, updated_at = ? WHERE id = ?');
    const now = new Date().toISOString();

    const reorder = db.transaction(() => {
        taskIds.forEach((id, index) => {
            stmt.run(index, status, now, id);
        });
    });

    reorder();
}
