import { createApp } from './app'
import { config } from './config'

const port = Number(process.env.PORT ?? 3000)
const app = createApp().listen(port)

console.log(`🦊 Elysia running at http://${app.server?.hostname}:${app.server?.port}`)
console.log(`MODE=${config.mode}`)
if (config.isDev) {
  console.log(`Docs: http://localhost:3000/openapi`)
}
