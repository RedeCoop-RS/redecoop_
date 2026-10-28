import { expect, test } from '@playwright/test'
import { api, apiLogin, COOP, loginUi } from './helpers'

test.describe('Acesso restrito ao super admin', () => {
  test('API: sem token 401, cooperativa 403, admin 200', async () => {
    expect((await api(null, 'GET', '/account')).status).toBe(401)
    const coop = await apiLogin(COOP)
    for (const [method, path] of [
      ['GET', '/account'],
      ['GET', '/folders'],
      ['GET', '/messages?folder=INBOX'],
      ['POST', '/send'],
      ['GET', '/contacts'],
    ] as const) {
      expect((await api(coop, method, path, method === 'POST' ? { to: 'x@y.z' } : undefined)).status, `${method} ${path}`).toBe(403)
    }
    expect((await api(await apiLogin(), 'GET', '/account')).status).toBe(200)
  })

  test('UI: cooperativa não vê o menu nem abre /admin/email', async ({ page }) => {
    await loginUi(page, COOP)
    await expect(page).toHaveURL(/\/cooperativa/)
    await expect(page.getByRole('link', { name: /^E-mail/ })).toHaveCount(0)
    await page.goto('/admin/email')
    await expect(page).not.toHaveURL(/\/admin\/email/)
    await expect(page.getByRole('navigation', { name: 'Pastas' })).toHaveCount(0)
  })
})
