import type { Database } from 'bun:sqlite'
import { getDb, type DBUser } from '../database'

export type Role = 'admin' | 'user' | 'guest'
export const VALID_ROLES: Role[] = ['admin', 'user', 'guest']

export type PublicUser = {
  id: number
  username: string
  role: Role
  created_at: string
}

function toPublic(row: DBUser): PublicUser {
  return { id: row.id, username: row.username, role: row.role as Role, created_at: row.created_at }
}

export async function registerUser(
  username: string,
  password: string,
  role: Role,
  db: Database = getDb(),
): Promise<PublicUser> {
  const hashed_password = await Bun.password.hash(password, { algorithm: 'bcrypt' })
  const row = db
    .query<DBUser, [string, string, string]>(
      'INSERT INTO users (username, hashed_password, role) VALUES (?, ?, ?) RETURNING *',
    )
    .get(username, hashed_password, role)

  if (!row) throw new Error('Failed to insert user')
  return toPublic(row)
}

export function findUserByUsername(username: string, db: Database = getDb()): DBUser | null {
  return db.query<DBUser, [string]>('SELECT * FROM users WHERE username = ?').get(username) ?? null
}

export function findUserById(id: number, db: Database = getDb()): PublicUser | null {
  const row = db.query<DBUser, [number]>('SELECT * FROM users WHERE id = ?').get(id)
  return row ? toPublic(row) : null
}

export function getAllUsers(db: Database = getDb()): PublicUser[] {
  return db.query<DBUser, []>('SELECT * FROM users ORDER BY id').all().map(toPublic)
}

export function deleteUser(id: number, db: Database = getDb()): boolean {
  const info = db.query('DELETE FROM users WHERE id = ?').run(id)
  return info.changes > 0
}

export function updateUserRole(id: number, role: Role, db: Database = getDb()): PublicUser | null {
  const row = db
    .query<DBUser, [string, number]>('UPDATE users SET role = ? WHERE id = ? RETURNING *')
    .get(role, id)
  return row ? toPublic(row) : null
}

export async function verifyLogin(
  username: string,
  password: string,
  db: Database = getDb(),
): Promise<PublicUser | null> {
  const user = findUserByUsername(username, db)
  if (!user) return null
  const valid = await Bun.password.verify(password, user.hashed_password)
  return valid ? toPublic(user) : null
}

export async function changePassword(
  id: number,
  oldPassword: string,
  newPassword: string,
  db: Database = getDb(),
): Promise<boolean> {
  const row = db.query<DBUser, [number]>('SELECT * FROM users WHERE id = ?').get(id)
  if (!row) return false
  const valid = await Bun.password.verify(oldPassword, row.hashed_password)
  if (!valid) return false
  const hashed = await Bun.password.hash(newPassword, { algorithm: 'bcrypt' })
  db.query('UPDATE users SET hashed_password = ? WHERE id = ?').run(hashed, id)
  return true
}

export function countUsers(db: Database = getDb()): number {
  const row = db.query<{ n: number }, []>('SELECT COUNT(*) as n FROM users').get()
  return row?.n ?? 0
}
