import type { Database } from 'bun:sqlite'
import { getDb, type DBTodo } from '../database'

export type Todo = {
  id: number
  title: string
  description: string | null
  completed: boolean
  owner_id: number
  created_at: string
  updated_at: string
}

function toTodo(row: DBTodo): Todo {
  return { ...row, completed: row.completed === 1 }
}

export function createTodo(
  ownerId: number,
  title: string,
  description: string | null = null,
  db: Database = getDb(),
): Todo {
  const row = db
    .query<DBTodo, [string, string | null, number]>(
      'INSERT INTO todos (title, description, owner_id) VALUES (?, ?, ?) RETURNING *',
    )
    .get(title, description, ownerId)
  if (!row) throw new Error('Failed to insert todo')
  return toTodo(row)
}

export function findTodoById(id: number, db: Database = getDb()): Todo | null {
  const row = db.query<DBTodo, [number]>('SELECT * FROM todos WHERE id = ?').get(id)
  return row ? toTodo(row) : null
}

export function getTodosByOwner(ownerId: number, db: Database = getDb()): Todo[] {
  return db
    .query<DBTodo, [number]>('SELECT * FROM todos WHERE owner_id = ? ORDER BY id')
    .all(ownerId)
    .map(toTodo)
}

export function getAllTodos(db: Database = getDb()): Todo[] {
  return db.query<DBTodo, []>('SELECT * FROM todos ORDER BY id').all().map(toTodo)
}

export function updateTodo(
  id: number,
  patch: { title?: string; description?: string | null; completed?: boolean },
  db: Database = getDb(),
): Todo | null {
  const existing = db.query<DBTodo, [number]>('SELECT * FROM todos WHERE id = ?').get(id)
  if (!existing) return null

  const title = patch.title ?? existing.title
  const description = patch.description !== undefined ? patch.description : existing.description
  const completed = patch.completed !== undefined ? (patch.completed ? 1 : 0) : existing.completed

  const row = db
    .query<DBTodo, [string, string | null, number, number]>(
      `UPDATE todos
       SET title = ?, description = ?, completed = ?, updated_at = datetime('now')
       WHERE id = ?
       RETURNING *`,
    )
    .get(title, description, completed, id)
  return row ? toTodo(row) : null
}

export function deleteTodo(id: number, db: Database = getDb()): boolean {
  const info = db.query('DELETE FROM todos WHERE id = ?').run(id)
  return info.changes > 0
}

export function countTodos(db: Database = getDb()): number {
  const row = db.query<{ n: number }, []>('SELECT COUNT(*) as n FROM todos').get()
  return row?.n ?? 0
}
