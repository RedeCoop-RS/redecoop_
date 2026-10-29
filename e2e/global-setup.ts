import { execFileSync } from 'child_process'
import { mkdirSync } from 'fs'
import path from 'path'
import { api, apiLogin, resetMailServer, SHOTS } from './tests/helpers'

export default async function globalSetup() {
  execFileSync('node', [path.join(__dirname, 'scripts/seed-users.cjs')], { stdio: 'inherit' })
  mkdirSync(SHOTS, { recursive: true })
  if (process.env.E2E_SUITE === 'blog') return
  await resetMailServer()
  const token = await apiLogin()
  await api(token, 'DELETE', '/account')
}
