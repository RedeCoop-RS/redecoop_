#!/usr/bin/env node
// Sobe a integração do Ghost de teste e imprime a Admin API key para o processo seguinte.
// O segredo não vai para o log: só o id, e a chave completa fica em GITHUB_ENV / stdout controlado.
import { appendFileSync, writeFileSync } from 'fs'

const base = (process.env.GHOST_ADMIN_URL || 'http://127.0.0.1:2368').replace(/\/+$/, '')
const email = process.env.GHOST_E2E_EMAIL || 'ghost-owner@redecoop.test'
const password = process.env.GHOST_E2E_PASSWORD || 'RedeCoop-E2E-Blog-2026'
const version = process.env.GHOST_API_VERSION || 'v6.0'
const headers = {
  'content-type': 'application/json',
  accept: 'application/json',
  'accept-version': version,
  origin: base,
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function errorText(response) {
  const text = await response.text()
  try {
    const body = JSON.parse(text)
    const message = (body.errors || []).map((item) => item.message || item.type).filter(Boolean).join(' ')
    return message || text.slice(0, 200)
  } catch {
    return text.slice(0, 200)
  }
}

async function waitReady() {
  const deadline = Date.now() + 180_000
  let last = 'sem resposta'
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/ghost/api/admin/site/`, { headers: { 'accept-version': version } })
      if (response.status < 500) return
      last = `HTTP ${response.status}`
    } catch (error) {
      last = error instanceof Error ? error.message : String(error)
    }
    await sleep(2000)
  }
  throw new Error(`Ghost não ficou pronto (${last}).`)
}

async function setupOwner() {
  const response = await fetch(`${base}/ghost/api/admin/authentication/setup/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      setup: [{ name: 'RedeCoop E2E', email, password, blogTitle: 'Blog RedeCoop E2E' }],
    }),
  })
  if (response.ok) return
  const message = await errorText(response)
  if (response.status === 403 || response.status === 422 || /already been completed|already setup/i.test(message)) return
  throw new Error(`Falha ao criar o owner do Ghost (${response.status}): ${message}`)
}

function cookieHeader(response) {
  const list = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []
  const fallback = response.headers.get('set-cookie')
  const cookies = list.length ? list : fallback ? [fallback] : []
  return cookies.map((item) => item.split(';')[0]).filter(Boolean).join('; ')
}

async function login() {
  let last = 'sem resposta'
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(`${base}/ghost/api/admin/session/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ username: email, password }),
    })
    if (response.ok) {
      const cookie = cookieHeader(response)
      if (!cookie) throw new Error('O Ghost não devolveu o cookie de sessão.')
      return cookie
    }
    last = `${response.status} ${await errorText(response)}`
    await sleep(1500)
  }
  throw new Error(`Falha ao entrar no Ghost: ${last}`)
}

function findAdminKey(value) {
  if (!value || typeof value !== 'object') return '';
  if (value.type === 'admin' && value.secret) {
    const secret = String(value.secret);
    if (value.id && secret.startsWith(`${value.id}:`)) return secret;
    if (value.id && !secret.includes(':')) return `${value.id}:${secret}`;
    if (/^[a-f0-9]{8,128}:[a-f0-9]{16,256}$/i.test(secret)) return secret;
  }
  const children = Array.isArray(value) ? value : Object.values(value);
  for (const child of children) {
    const found = findAdminKey(child);
    if (found) return found;
  }
  return '';
}

async function createIntegration(cookie) {
  const response = await fetch(`${base}/ghost/api/admin/integrations/`, {
    method: 'POST',
    headers: { ...headers, cookie },
    body: JSON.stringify({ integrations: [{ name: `RedeCoop Painel ${Date.now()}` }] }),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`Falha ao criar a integração (${response.status}): ${text.slice(0, 200)}`)
  const key = findAdminKey(JSON.parse(text))
  if (!key) throw new Error('A integração foi criada sem Admin API key.')
  return key
}

async function main() {
  await waitReady()
  await setupOwner()
  const cookie = await login()
  const key = await createIntegration(cookie)
  const id = key.split(':')[0]
  const line = `GHOST_ADMIN_URL=${base}\nGHOST_ADMIN_API_KEY=${key}\n`
  writeFileSync('/tmp/ghost-e2e.env', line)
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, line)
  console.log(`Integração pronta (id ${id}). Chave em /tmp/ghost-e2e.env`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
