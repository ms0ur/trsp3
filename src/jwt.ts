import { jwt } from '@elysiajs/jwt'
import { config } from './config'

export const jwtPlugin = jwt({
  name: 'jwt',
  secret: config.jwtSecret,
  exp: '2h',
})

export type JwtPayload = {
  sub: string
  role: 'admin' | 'user' | 'guest'
  userId: number
}
