import { expect, test } from '@playwright/test'
import { COOP, RUN, loginUi } from '../helpers'
import { PNG_1PX } from '../fixtures'
import { apiLogin, blogApi, openBlog } from './helpers'

test.describe('Acesso restrito ao super admin', () => {
  test('API: sem token 401, cooperativa 403, admin 200', async () => {
    expect((await blogApi(null, 'GET', '/connection')).status).toBe(401)
    const coop = await apiLogin(COOP)
    for (const [method, path] of [
      ['GET', '/connection'],
      ['GET', '/posts'],
      ['GET', '/tags'],
      ['POST', '/posts'],
      ['POST', '/images'],
    ] as const) {
      expect((await blogApi(coop, method, path, method === 'POST' ? { resource: 'post', title: 'x' } : undefined)).status, `${method} ${path}`).toBe(403)
    }
    const admin = await blogApi(await apiLogin(), 'GET', '/connection')
    expect(admin.status).toBe(200)
    expect(JSON.stringify(admin.data)).not.toContain(process.env.GHOST_ADMIN_API_KEY || 'id:secret-que-nao-existe')
  })

  test('UI: cooperativa não vê o blog', async ({ page }) => {
    await loginUi(page, COOP)
    await expect(page).toHaveURL(/\/cooperativa/)
    await expect(page.getByRole('link', { name: 'Blog' })).toHaveCount(0)
    await page.goto('/admin/blog')
    await expect(page).not.toHaveURL(/\/admin\/blog/)
    await expect(page.getByRole('heading', { name: 'Blog' })).toHaveCount(0)
  })
})
