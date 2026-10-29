import { API, apiLogin, loginUi } from '../helpers'

export async function blogApi<T = any>(token: string | null, method: string, path: string, body?: unknown) {
  const response = await fetch(`${API}/root/blog${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { status: response.status, data: (json?.data ?? json) as T }
}

export async function openBlog(page: Parameters<typeof loginUi>[0]) {
  await loginUi(page)
  await page.goto('/admin/blog')
  await page.getByRole('heading', { name: 'Blog', level: 1 }).waitFor()
}

export function ghostUrl() {
  return (process.env.GHOST_ADMIN_URL || 'http://127.0.0.1:2368').replace(/\/+$/, '')
}

export { apiLogin }
