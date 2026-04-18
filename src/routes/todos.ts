import { Elysia, t } from 'elysia'
import { jwtPlugin } from '../jwt'
import { guardAuth } from '../middleware/auth'
import {
  createTodo,
  findTodoById,
  getTodosByOwner,
  getAllTodos,
  updateTodo,
  deleteTodo,
} from '../services/todo.service'
import { getDb } from '../database'

export const todosRoutes = new Elysia({ prefix: '/todos' })
  .use(jwtPlugin)

  // GET /todos
  .get(
    '/',
    async ({ jwt, headers, status }) => {
      const auth = await guardAuth(jwt.verify.bind(jwt), headers.authorization, ['admin', 'user'])
      if (!auth.ok) return status(auth.status, { detail: auth.detail })

      try {
        const todos =
          auth.user.role === 'admin'
            ? getAllTodos(getDb())
            : getTodosByOwner(auth.user.userId, getDb())
        return todos
      } catch (err) {
        console.error('[getAllTodos]', err)
        return status(500, { detail: 'Internal server error' })
      }
    },
    { detail: { summary: 'List todos (own or all for admin)', tags: ['Todos'] } },
  )

  // POST /todos
  .post(
    '/',
    async ({ jwt, headers, body, status }) => {
      const auth = await guardAuth(jwt.verify.bind(jwt), headers.authorization, ['admin', 'user'])
      if (!auth.ok) return status(auth.status, { detail: auth.detail })

      try {
        const todo = createTodo(auth.user.userId, body.title, body.description ?? null, getDb())
        return status(201, todo)
      } catch (err) {
        console.error('[createTodo]', err)
        return status(500, { detail: 'Internal server error' })
      }
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 255 }),
        description: t.Optional(t.String({ maxLength: 2000 })),
      }),
      detail: { summary: 'Create a new todo', tags: ['Todos'] },
    },
  )

  // GET /todos/:id
  .get(
    '/:id',
    async ({ jwt, headers, params, status }) => {
      const auth = await guardAuth(jwt.verify.bind(jwt), headers.authorization, ['admin', 'user'])
      if (!auth.ok) return status(auth.status, { detail: auth.detail })

      const id = Number(params.id)
      if (!Number.isInteger(id) || id < 1) return status(400, { detail: 'Invalid todo ID' })

      try {
        const todo = findTodoById(id, getDb())
        if (!todo) return status(404, { detail: `Todo #${id} not found` })

        if (auth.user.role !== 'admin' && todo.owner_id !== auth.user.userId) {
          return status(403, { detail: 'You do not have access to this todo' })
        }

        return todo
      } catch (err) {
        console.error('[findTodoById]', err)
        return status(500, { detail: 'Internal server error' })
      }
    },
    { detail: { summary: 'Get todo by ID', tags: ['Todos'] } },
  )

  // PUT /todos/:id
  .put(
    '/:id',
    async ({ jwt, headers, params, body, status }) => {
      const auth = await guardAuth(jwt.verify.bind(jwt), headers.authorization, ['admin', 'user'])
      if (!auth.ok) return status(auth.status, { detail: auth.detail })

      const id = Number(params.id)
      if (!Number.isInteger(id) || id < 1) return status(400, { detail: 'Invalid todo ID' })

      try {
        const existing = findTodoById(id, getDb())
        if (!existing) return status(404, { detail: `Todo #${id} not found` })
        if (auth.user.role !== 'admin' && existing.owner_id !== auth.user.userId) {
          return status(403, { detail: 'You do not have permission to update this todo' })
        }
      } catch (err) {
        console.error('[findTodoById]', err)
        return status(500, { detail: 'Internal server error' })
      }

      try {
        const updated = updateTodo(id, body, getDb())
        return updated!
      } catch (err) {
        console.error('[updateTodo]', err)
        return status(500, { detail: 'Internal server error' })
      }
    },
    {
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
        description: t.Optional(t.String({ maxLength: 2000 })),
        completed: t.Optional(t.Boolean()),
      }),
      detail: { summary: 'Update a todo (owner or admin)', tags: ['Todos'] },
    },
  )

  // DELETE /todos/:id
  .delete(
    '/:id',
    async ({ jwt, headers, params, status }) => {
      const auth = await guardAuth(jwt.verify.bind(jwt), headers.authorization, ['admin', 'user'])
      if (!auth.ok) return status(auth.status, { detail: auth.detail })

      const id = Number(params.id)
      if (!Number.isInteger(id) || id < 1) return status(400, { detail: 'Invalid todo ID' })

      try {
        const existing = findTodoById(id, getDb())
        if (!existing) return status(404, { detail: `Todo #${id} not found` })
        if (auth.user.role !== 'admin' && existing.owner_id !== auth.user.userId) {
          return status(403, { detail: 'You do not have permission to delete this todo' })
        }
      } catch (err) {
        console.error('[findTodoById]', err)
        return status(500, { detail: 'Internal server error' })
      }

      try {
        deleteTodo(id, getDb())
        return { message: `Todo #${id} deleted` }
      } catch (err) {
        console.error('[deleteTodo]', err)
        return status(500, { detail: 'Internal server error' })
      }
    },
    { detail: { summary: 'Delete a todo (owner or admin)', tags: ['Todos'] } },
  )
