const rawMode = process.env.MODE ?? 'DEV'

if (!['DEV', 'PROD'].includes(rawMode)) {
  console.error(`Invalid MODE="${rawMode}". Allowed: DEV, PROD`)
  process.exit(1)
}

export const config = {
  mode: rawMode as 'DEV' | 'PROD',
  isProd: rawMode === 'PROD',
  isDev: rawMode === 'DEV',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-prod',
  docsUser: process.env.DOCS_USER ?? 'admin',
  docsPassword: process.env.DOCS_PASSWORD ?? 'adminpass',
}
