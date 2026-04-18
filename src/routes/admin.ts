import { Elysia, t } from 'elysia'
import { jwtPlugin } from '../jwt'
import { guardAuth } from '../middleware/auth'
import {
  getAllUsers,
  findUserById,
  deleteUser,
  updateUserRole,
  countUsers,
  VALID_ROLES,
  type Role,
} from '../services/user.service'
import { countTodos, getAllTodos } from '../services/todo.service'
import { getDb } from '../database'

export const adminRoutes = new Elysia({ prefix: '/admin' })
  .use(jwtPlugin)

  // GET /admin/users
  .get(
    '/users',
    async ({ jwt, headers, status }) => {
      const auth = await guardAuth(jwt.verify.bind(jwt), headers.authorization, ['admin'])
      if (!auth.ok) return status(auth.status, { detail: auth.detail })
      try {
        return getAllUsers(getDb())
      } catch (err) {
        console.error('[getAllUsers]', err)
        return status(500, { detail: 'Internal server error' })
      }
    },
    { detail: { summary: 'List all users (admin only)', tags: ['Admin'] } },
  )

  // GET /admin/users/:id
  .get(
    '/users/:id',
    async ({ jwt, headers, params, status }) => {
      const auth = await guardAuth(jwt.verify.bind(jwt), headers.authorization, ['admin'])
      if (!auth.ok) return status(auth.status, { detail: auth.detail })

      const id = Number(params.id)
      if (!Number.isInteger(id) || id < 1) return status(400, { detail: 'Invalid user ID' })

      try {
        const user = findUserById(id, getDb())
        if (!user) return status(404, { detail: `User #${id} not found` })
        return user
      } catch (err) {
        console.error('[findUserById]', err)
        return status(500, { detail: 'Internal server error' })
      }
    },
    { detail: { summary: 'Get user by ID (admin only)', tags: ['Admin'] } },
  )

  // DELETE /admin/users/:id
  .delete(
    '/users/:id',
    async ({ jwt, headers, params, status }) => {
      const auth = await guardAuth(jwt.verify.bind(jwt), headers.authorization, ['admin'])
      if (!auth.ok) return status(auth.status, { detail: auth.detail })

      const id = Number(params.id)
      if (!Number.isInteger(id) || id < 1) return status(400, { detail: 'Invalid user ID' })

      if (id === auth.user.userId) {
        return status(422, { detail: 'You cannot delete your own account' })
      }

      try {
        const deleted = deleteUser(id, getDb())
        if (!deleted) return status(404, { detail: `User #${id} not found` })
        return { message: `User #${id} deleted` }
      } catch (err) {
        console.error('[deleteUser]', err)
        return status(500, { detail: 'Internal server error' })
      }
    },
    { detail: { summary: 'Delete user (admin only, cannot delete self)', tags: ['Admin'] } },
  )

  // PATCH /admin/users/:id/role
  .patch(
    '/users/:id/role',
    async ({ jwt, headers, params, body, status }) => {
      const auth = await guardAuth(jwt.verify.bind(jwt), headers.authorization, ['admin'])
      if (!auth.ok) return status(auth.status, { detail: auth.detail })

      const id = Number(params.id)
      if (!Number.isInteger(id) || id < 1) return status(400, { detail: 'Invalid user ID' })

      if (id === auth.user.userId) {
        return status(422, { detail: 'Admins cannot change their own role' })
      }

      if (!VALID_ROLES.includes(body.role as Role)) {
        return status(400, { detail: `Invalid role. Allowed: ${VALID_ROLES.join(', ')}` })
      }

      try {
        const user = updateUserRole(id, body.role as Role, getDb())
        if (!user) return status(404, { detail: `User #${id} not found` })
        return { message: `Role updated to "${body.role}"`, user }
      } catch (err) {
        console.error('[updateUserRole]', err)
        return status(500, { detail: 'Internal server error' })
      }
    },
    {
      body: t.Object({ role: t.String() }),
      detail: { summary: 'Change user role (admin only)', tags: ['Admin'] },
    },
  )

  // GET /admin/stats
  .get(
    '/stats',
    async ({ jwt, headers, status }) => {
      const auth = await guardAuth(jwt.verify.bind(jwt), headers.authorization, ['admin'])
      if (!auth.ok) return status(auth.status, { detail: auth.detail })

      try {
        const db = getDb()
        const users = getAllUsers(db)
        return {
          total_users: countUsers(db),
          total_todos: countTodos(db),
          users_by_role: {
            admin: users.filter((u) => u.role === 'admin').length,
            user: users.filter((u) => u.role === 'user').length,
            guest: users.filter((u) => u.role === 'guest').length,
          },
          todos_completed: getAllTodos(db).filter((t) => t.completed).length,
        }
      } catch (err) {
        console.error('[getStats]', err)
        return status(500, { detail: 'Internal server error' })
      }
    },
    { detail: { summary: 'System statistics (admin only)', tags: ['Admin'] } },
  )
