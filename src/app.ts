import { Elysia } from 'elysia'
import { openapi } from '@elysiajs/openapi'
import { config } from './config'
import { parseBasicAuth, safeEqual } from './utils'
import { authRoutes } from './routes/auth'
import { todosRoutes } from './routes/todos'
import { adminRoutes } from './routes/admin'

function checkDocsAuth(header: string | null): boolean {
  const creds = parseBasicAuth(header)
  if (!creds) return false
  return safeEqual(creds.username, config.docsUser) && safeEqual(creds.password, config.docsPassword)
}

export function createApp() {
  const app = new Elysia()
    .onBeforeHandle({ as: 'global' }, ({ path, request, set, status }) => {
      if (!path.startsWith('/openapi')) return
      if (!checkDocsAuth(request.headers.get('authorization'))) {
        set.headers['WWW-Authenticate'] = 'Basic realm="API Documentation"'
        return status(401, { detail: 'Documentation requires authentication' })
      }
    })
    .use(
      openapi({
        enabled: config.isDev,
        documentation: {
          tags: [
            { name: 'Auth', description: 'Registration, login, profile' },
            { name: 'Todos', description: 'CRUD for personal todos' },
            { name: 'Admin', description: 'Admin-only management endpoints' },
          ],
        },
      }),
    )
    .use(authRoutes)
    .use(todosRoutes)
    .use(adminRoutes)
    .onError(({ error, status, code }) => {
      if (code === 'VALIDATION') {
        return status(400, { detail: 'Validation error', errors: (error as Error).message }) // 422?
      }
      if (code === 'NOT_FOUND') {
        return status(404, { detail: 'Route not found' })
      }
      console.error('[unhandled]', error)
      return status(500, { detail: 'Internal server error' })
    })
    .get('/', () => ({
      mode: config.mode,
      docs: config.isDev ? '/openapi' : null,
    }))

  return app
}
