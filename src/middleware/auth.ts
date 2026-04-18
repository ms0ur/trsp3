import type { JwtPayload } from '../jwt'

type VerifyFn = (token: string) => Promise<Record<string, unknown> | false>

type AuthSuccess = { ok: true; user: JwtPayload }
type AuthFailure = { ok: false; status: 401 | 403; detail: string }
export type AuthResult = AuthSuccess | AuthFailure

export async function guardAuth(
  verify: VerifyFn,
  authHeader: string | null | undefined,
  allowedRoles: string[] = [],
): Promise<AuthResult> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, detail: 'Authorization header required (Bearer <token>)' }
  }

  const payload = await verify(authHeader.slice(7))
  if (!payload) {
    return { ok: false, status: 401, detail: 'Invalid or expired token' }
  }

  const user = payload as JwtPayload
  if (!user.sub || !user.role || !user.userId) {
    return { ok: false, status: 401, detail: 'Malformed token payload' }
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return { ok: false, status: 403, detail: `Forbidden — required role: ${allowedRoles.join(' or ')}` }
  }

  return { ok: true, user }
}
