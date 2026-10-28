import { expect, type Page } from '@playwright/test'
import { ImapFlow, type FetchMessageObject } from 'imapflow'
import nodemailer from 'nodemailer'
import { simpleParser, type ParsedMail } from 'mailparser'
import type Mail from 'nodemailer/lib/mailer'

export const API = process.env.API_URL || 'http://127.0.0.1:3000/api'
export const DOMAIN = process.env.MAIL_DOMAIN || 'redecoop.test'
export const MAIL_HOST = process.env.E2E_MAIL_HOST || `mail.${DOMAIN}`
export const MAIL_PASSWORD = process.env.E2E_MAIL_PASSWORD || 'Senha-teste-123'
export const ADMIN = { username: 'admin.e2e', password: 'Admin-e2e-123' }
export const COOP = { username: 'coop.e2e', password: 'Coop-e2e-123' }
export const SHOTS = process.env.SCREENSHOT_DIR || 'screenshots'

export type MailUser = 'admin' | 'ana' | 'bruno' | 'carla'
export const addr = (user: MailUser) => `${user}@${DOMAIN}`

/** Etiqueta única desta execução, usada nos assuntos para isolar as mensagens. */
export const RUN = Date.now().toString(36).slice(-5)

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export async function poll<T>(fn: () => Promise<T | null | undefined | false>, timeout = 30_000, label = 'condição') {
  const end = Date.now() + timeout
  let last: unknown
  while (Date.now() < end) {
    try {
      const value = await fn()
      if (value) return value as T
    } catch (error) {
      last = error
    }
    await sleep(500)
  }
  throw new Error(`Tempo esgotado esperando ${label}${last ? `: ${String(last)}` : ''}`)
}

export async function withImap<T>(user: MailUser, fn: (client: ImapFlow) => Promise<T>) {
  const client = new ImapFlow({
    host: MAIL_HOST,
    port: 993,
    secure: true,
    auth: { user: addr(user), pass: MAIL_PASSWORD },
    tls: { rejectUnauthorized: false },
    logger: false,
  })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.logout().catch(() => client.close())
  }
}

export async function sendAs(user: MailUser, mail: Mail.Options) {
  const transport = nodemailer.createTransport({
    host: MAIL_HOST,
    port: 465,
    secure: true,
    auth: { user: addr(user), pass: MAIL_PASSWORD },
    tls: { rejectUnauthorized: false },
  })
  const info = await transport.sendMail({ from: addr(user), ...mail })
  transport.close()
  return info
}

export interface ServerMessage {
  uid: number
  flags: Set<string>
  raw: string
  parsed: ParsedMail
}

/** Procura no servidor (IMAP) uma mensagem cujo assunto contenha `subject`. */
export async function findOnServer(user: MailUser, folder: string, subject: string): Promise<ServerMessage | null> {
  return withImap(user, async (client) => {
    const exists = (await client.list()).some((item) => item.path === folder)
    if (!exists) return null
    const lock = await client.getMailboxLock(folder)
    try {
      if (!client.mailbox || !client.mailbox.exists) return null
      let match: FetchMessageObject | null = null
      for await (const message of client.fetch('1:*', { uid: true, envelope: true, flags: true })) {
        if (message.envelope?.subject?.includes(subject)) match = message
      }
      if (!match) return null
      const download = await client.fetchOne(String(match.uid), { source: true }, { uid: true })
      const raw = download && download.source ? download.source.toString('utf8') : ''
      return { uid: match.uid, flags: match.flags || new Set<string>(), raw, parsed: await simpleParser(raw) }
    } finally {
      lock.release()
    }
  })
}

export async function waitOnServer(user: MailUser, folder: string, subject: string, timeout = 30_000) {
  return poll(() => findOnServer(user, folder, subject), timeout, `"${subject}" em ${user}/${folder}`)
}

export async function countOnServer(user: MailUser, folder: string, subject: string) {
  return withImap(user, async (client) => {
    const exists = (await client.list()).some((item) => item.path === folder)
    if (!exists) return 0
    const lock = await client.getMailboxLock(folder)
    try {
      if (!client.mailbox || !client.mailbox.exists) return 0
      let count = 0
      for await (const message of client.fetch('1:*', { envelope: true })) {
        if (message.envelope?.subject?.includes(subject)) count += 1
      }
      return count
    } finally {
      lock.release()
    }
  })
}

export async function folderPaths(user: MailUser) {
  return withImap(user, async (client) => (await client.list()).map((item) => item.path))
}

/** Esvazia todas as pastas e remove as pastas criadas por testes anteriores. */
export async function resetMailServer(users: MailUser[] = ['admin', 'ana', 'bruno', 'carla']) {
  const standard = new Set(['INBOX', 'Sent', 'Drafts', 'Archive', 'Junk', 'Trash'])
  for (const user of users) {
    await withImap(user, async (client) => {
      const list = await client.list()
      for (const folder of list.sort((a, b) => b.path.length - a.path.length)) {
        if (!standard.has(folder.path)) {
          await client.mailboxDelete(folder.path).catch(() => undefined)
          continue
        }
        const lock = await client.getMailboxLock(folder.path)
        try {
          if (client.mailbox && client.mailbox.exists) await client.messageDelete('1:*')
        } finally {
          lock.release()
        }
      }
    })
  }
}

export async function apiLogin(user = ADMIN) {
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(user),
  })
  const temp = (await login.json()) as { data: { token: string } }
  const exchange = await fetch(`${API}/auth/exchange-token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: temp.data.token }),
  })
  const body = (await exchange.json()) as { data: { token: string } }
  return body.data.token
}

export async function api<T = any>(token: string | null, method: string, path: string, body?: unknown) {
  const response = await fetch(`${API}/root/mailbox${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let json: any = null
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }
  return { status: response.status, data: (json?.data ?? json) as T, raw: response }
}

export function localAccount(extra: Record<string, unknown> = {}) {
  return {
    email: addr('admin'),
    displayName: 'Admin RedeCoop',
    imapHost: MAIL_HOST,
    imapPort: 993,
    imapSecure: true,
    smtpHost: MAIL_HOST,
    smtpPort: 465,
    smtpSecure: true,
    username: addr('admin'),
    password: MAIL_PASSWORD,
    ...extra,
  }
}

/** Garante a conta local configurada (para rodar um arquivo de teste isolado). */
export async function ensureAccount() {
  const token = await apiLogin()
  const current = await api(token, 'GET', '/account')
  if (current.data?.configured && current.data.email === addr('admin')) return
  const saved = await api(
    token,
    'PUT',
    '/account',
    localAccount({
      undoSendSeconds: 5,
      signatures: [
        { id: 'principal', name: 'Principal', html: 'Atenciosamente,<br>Equipe RedeCoop · Cooperação' },
        { id: 'curta', name: 'Curta', html: '— Admin (versão curta)' },
      ],
      defaultSignatureId: 'principal',
    }),
  )
  if (saved.status !== 200) throw new Error(`Falha ao configurar a conta: ${JSON.stringify(saved.data)}`)
}

export async function loginUi(page: Page, user = ADMIN) {
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(user),
  })
  const temp = (await login.json()) as { data: { token: string } }
  await page.goto(`/autenticar/${temp.data.token}`)
  await page.waitForURL(/\/(admin|cooperativa)/)
}

export async function openMailbox(page: Page) {
  await loginUi(page)
  await page.goto('/admin/email')
  await expect(page.getByRole('navigation', { name: 'Pastas' })).toBeVisible()
}

export function folderButton(page: Page, label: string) {
  return page.getByRole('navigation', { name: 'Pastas' }).getByRole('button', { name: label, exact: false }).first()
}

export async function openFolder(page: Page, label: string) {
  await folderButton(page, label).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(label)
}

export function row(page: Page, subject: string) {
  return page.getByRole('region', { name: 'Mensagens' }).locator('article').filter({ hasText: subject }).first()
}

/** Clica em Atualizar até a mensagem aparecer na lista. */
export async function waitForRow(page: Page, subject: string, timeout = 30_000) {
  await poll(
    async () => {
      if (await row(page, subject).isVisible()) return true
      await page.getByRole('button', { name: 'Atualizar' }).click()
      await sleep(1200)
      return row(page, subject).isVisible()
    },
    timeout,
    `"${subject}" na lista`,
  )
}

export async function openRow(page: Page, subject: string) {
  await waitForRow(page, subject)
  await row(page, subject).locator('.mailbox-row__main').click()
  await expect(page.getByRole('region', { name: 'Mensagem' }).getByRole('heading', { level: 2 })).toContainText(subject)
}

export function reader(page: Page) {
  return page.getByRole('region', { name: 'Mensagem' })
}

export function composer(page: Page) {
  return page.locator('form.mailbox-composer')
}

export async function typeBody(page: Page, text: string) {
  const area = composer(page).getByRole('textbox', { name: 'Corpo da mensagem' })
  await area.click()
  await page.keyboard.press('Control+Home')
  await page.keyboard.type(text)
}

/** Clica em Enviar e espera o envio terminar (incluindo a janela de desfazer). */
export async function sendAndWait(page: Page) {
  await composer(page).getByRole('button', { name: 'Enviar', exact: true }).click()
  await expect(composer(page)).toBeHidden()
  await expect(page.locator('.mailbox-undo')).toBeHidden({ timeout: 45_000 })
}

export async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false })
}
