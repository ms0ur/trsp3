import { Database } from 'bun:sqlite'

export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT    NOT NULL UNIQUE,
    hashed_password TEXT    NOT NULL,
    role            TEXT    NOT NULL DEFAULT 'user',
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS todos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT,
    completed   INTEGER NOT NULL DEFAULT 0,
    owner_id    INTEGER NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );
`

export function initSchema(db: Database): void {
  db.run('PRAGMA journal_mode=WAL;')
  db.run('PRAGMA foreign_keys=ON;')
  db.run(SCHEMA)
}

let _db: Database | null = null

export function getDb(): Database {
  if (!_db) {
    _db = new Database(process.env.DB_PATH ?? 'app.db')
    initSchema(_db)
  }
  return _db
}

export function resetDb(db?: Database): Database {
  _db = db ?? new Database(':memory:')
  initSchema(_db)
  return _db
}

export type DBUser = {
  id: number
  username: string
  hashed_password: string
  role: string
  created_at: string
}

export type DBTodo = {
  id: number
  title: string
  description: string | null
  completed: number
  owner_id: number
  created_at: string
  updated_at: string
}
