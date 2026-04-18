import { Elysia, t } from 'elysia'
import { jwtPlugin } from '../jwt'
import { guardAuth } from '../middleware/auth'
import { checkRateLimit, getRateLimitKey } from '../middleware/rateLimit'
import {
  registerUser,
  verifyLogin,
  findUserById,
  changePassword,
  VALID_ROLES,
  type Role,
} from '../services/user.service'
import { safeEqual } from '../utils'
import { getDb } from '../database'

const usernameSchema = t.String({ minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9_]+$' })
const passwordSchema = t.String({ minLength: 8, maxLength: 128 })

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(jwtPlugin)

  // POST /auth/register
  .post(
    '/register',
    async ({ jwt, body, request, status, set, server }) => {
      if (!checkRateLimit(getRateLimitKey('register', request, server), 3, 60_000)) {
        set.headers['Retry-After'] = '60'
        return status(429, { detail: 'Too many registration attempts. Try again in 1 minute.' })
      }

      const role: Role = VALID_ROLES.includes(body.role as Role) ? (body.role as Role) : 'user'

      try {
        const user = await registerUser(body.username, body.password, role, getDb())
        const access_token = await jwt.sign({ sub: user.username, role: user.role, userId: user.id })
        return status(201, { message: 'Registered successfully', user, access_token, token_type: 'bearer' })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('UNIQUE constraint')) {
          return status(409, { detail: `Username "${body.username}" is already taken` })
        }
        console.error('[register]', err)
        return status(500, { detail: 'Internal server error' })
      }
    },
    {
      body: t.Object({
        username: usernameSchema,
        password: passwordSchema,
        role: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Register a new user',
        tags: ['Auth'],
      },
    },
  )

  // POST /auth/login
  .post(
    '/login',
    async ({ jwt, body, request, status, set, server }) => {
      if (!checkRateLimit(getRateLimitKey('login', request, server), 5, 60_000)) {
        set.headers['Retry-After'] = '60'
        return status(429, { detail: 'Too many login attempts. Try again in 1 minute.' })
      }

      try {
        const dbUser = await verifyLogin(body.username, body.password, getDb())
        if (!dbUser || !safeEqual(dbUser.username, body.username)) {
          return status(401, { detail: 'Invalid username or password' })
        }

        const access_token = await jwt.sign({ sub: dbUser.username, role: dbUser.role, userId: dbUser.id })
        return { access_token, token_type: 'bearer', user: dbUser }
      } catch (err) {
        console.error('[verifyLogin]', err)
        return status(500, { detail: 'Internal server error' })
      }
    },
    {
      body: t.Object({ username: t.String(), password: t.String() }),
      detail: {
        summary: 'Login and receive JWT',
        tags: ['Auth'],
      },
    },
  )

  // GET /auth/me
  .get(
    '/me',
    async ({ jwt, headers, status }) => {
      const auth = await guardAuth(jwt.verify.bind(jwt), headers.authorization)
      if (!auth.ok) return status(auth.status, { detail: auth.detail })

      try {
        const user = findUserById(auth.user.userId, getDb())
        if (!user) return status(404, { detail: 'User not found' })
        return user
      } catch (err) {
        console.error('[findUserById]', err)
        return status(500, { detail: 'Internal server error' })
      }
    },
    { detail: { summary: 'Get current user profile', tags: ['Auth'] } },
  )

  // PATCH /auth/me/password
  .patch(
    '/me/password',
    async ({ jwt, headers, body, status }) => {
      const auth = await guardAuth(jwt.verify.bind(jwt), headers.authorization)
      if (!auth.ok) return status(auth.status, { detail: auth.detail })

      if (body.new_password === body.old_password) {
        return status(422, { detail: 'New password must differ from the current one' })
      }

      try {
        const changed = await changePassword(auth.user.userId, body.old_password, body.new_password, getDb())
        if (!changed) return status(401, { detail: 'Current password is incorrect' })
        return { message: 'Password updated successfully' }
      } catch (err) {
        console.error('[changePassword]', err)
        return status(500, { detail: 'Internal server error' })
      }
    },
    {
      body: t.Object({ old_password: t.String(), new_password: passwordSchema }),
      detail: { summary: 'Change current user password', tags: ['Auth'] },
    },
  )
