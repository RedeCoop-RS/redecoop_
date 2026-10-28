// Smoke test manual na caixa REAL (preset Hostinger). Não roda no CI.
//
//   REAL_MAILBOX_USER=contato@dominio REAL_MAILBOX_PASSWORD=... npm run smoke:real
//
// A senha vem só do ambiente e é mascarada em toda saída. Só envia para a própria caixa,
// mexe apenas nas mensagens com a etiqueta RC-SMOKE-<id>, apaga tudo no fim e confere
// que as mensagens pré-existentes continuam com as mesmas flags.
import { chromium } from '@playwright/test'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { API, api, apiLogin, loginUi, sleep } from '../tests/helpers'

const USER = process.env.REAL_MAILBOX_USER || ''
const PASS = process.env.REAL_MAILBOX_PASSWORD || ''
if (!USER || !PASS) throw new Error('REAL_MAILBOX_USER/REAL_MAILBOX_PASSWORD ausentes')
// O script apaga e recria a conta configurada no painel: só contra uma API local.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(API)) throw new Error(`API_URL precisa ser local (atual: ${API})`)
const TAG = `RC-SMOKE-${Date.now().toString(36)}`
const SHOTS = process.env.SCREENSHOT_DIR || 'screenshots'
const DASHBOARD = process.env.DASHBOARD_URL || 'http://127.0.0.1:5174'

const mask = (value: unknown) => String(value ?? '').split(PASS).join('********')
const log = (...parts: unknown[]) => console.log(parts.map(mask).join(' '))
const results: Array<{ step: string; ok: boolean; detail: string }> = []

async function step<T>(name: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    const value = await fn()
    results.push({ step: name, ok: true, detail: typeof value === 'string' ? value : '' })
    log('PASS', name, typeof value === 'string' ? `— ${value}` : '')
    return value
  } catch (error) {
    const message = mask(error instanceof Error ? error.message : error).slice(0, 300)
    results.push({ step: name, ok: false, detail: message })
    log('FAIL', name, '—', message)
    return null
  }
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

async function imap<T>(fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = new ImapFlow({
    host: 'imap.hostinger.com',
    port: 993,
    secure: true,
    auth: { user: USER, pass: PASS },
    logger: false,
  })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.logout().catch(() => client.close())
  }
}

type Snapshot = Map<string, string>

/** Flags de todas as mensagens de todas as pastas, em modo somente leitura (EXAMINE). */
async function snapshot(): Promise<Snapshot> {
  return imap(async (client) => {
    const result: Snapshot = new Map()
    for (const folder of await client.list()) {
      if (folder.flags.has('\\Noselect')) continue
      const lock = await client.getMailboxLock(folder.path, { readOnly: true })
      try {
        if (!client.mailbox || !client.mailbox.exists) continue
        for await (const message of client.fetch('1:*', { uid: true, flags: true, envelope: true })) {
          if (message.envelope?.subject?.includes(TAG)) continue
          result.set(`${folder.path}#${message.uid}`, [...(message.flags || [])].filter((flag) => flag !== '\\Recent').sort().join(' '))
        }
      } finally {
        lock.release()
      }
    }
    return result
  })
}

interface Found {
  folder: string
  uid: number
  flags: Set<string>
  raw: string
}

async function findTagged(folder: string, subjectPart: string): Promise<Found[]> {
  return imap(async (client) => {
    const exists = (await client.list()).some((item) => item.path === folder)
    if (!exists) return []
    const lock = await client.getMailboxLock(folder, { readOnly: true })
    const found: Found[] = []
    try {
      if (!client.mailbox || !client.mailbox.exists) return []
      for await (const message of client.fetch('1:*', { uid: true, flags: true, envelope: true })) {
        const subject = message.envelope?.subject || ''
        if (subject.includes(TAG) && subject.includes(subjectPart)) {
          found.push({ folder, uid: message.uid, flags: message.flags || new Set(), raw: '' })
        }
      }
      for (const item of found) {
        const full = await client.fetchOne(String(item.uid), { source: true }, { uid: true })
        item.raw = full && full.source ? full.source.toString('utf8') : ''
      }
    } finally {
      lock.release()
    }
    return found
  })
}

async function waitTagged(folder: string, subjectPart: string, timeout = 120_000, count = 1) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    const found = await findTagged(folder, subjectPart)
    if (found.length >= count) return found
    await sleep(4000)
  }
  throw new Error(`não chegou em ${folder}: "${subjectPart}" (${TAG})`)
}

async function apiUid(token: string, folder: string, subjectPart: string) {
  await api(token, 'POST', '/sync', { folder })
  const list = await api(token, 'GET', `/messages?folder=${encodeURIComponent(folder)}&q=${encodeURIComponent(TAG)}&limit=50`)
  const item = (list.data.data as Array<{ uid: number; subject: string }>).find((entry) => entry.subject.includes(subjectPart))
  assert(item, `mensagem "${subjectPart}" não apareceu na lista da API em ${folder}`)
  return item!.uid
}

function okStatus(response: { status: number; data: unknown }, label: string) {
  assert(response.status >= 200 && response.status < 300, `${label}: HTTP ${response.status} ${mask(JSON.stringify(response.data)).slice(0, 200)}`)
}

const HOSTINGER = {
  imapHost: 'imap.hostinger.com',
  imapPort: 993,
  imapSecure: true,
  smtpHost: 'smtp.hostinger.com',
  smtpPort: 465,
  smtpSecure: true,
}

async function main() {
  log('Caixa:', USER, '| etiqueta dos testes:', TAG)
  const before = await snapshot()
  log('Mensagens pré-existentes (todas as pastas):', before.size)
  const foldersBefore = await imap(async (client) => (await client.list()).map((item) => item.path))

  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
  const context = await browser.newContext({ baseURL: DASHBOARD, viewport: { width: 1440, height: 900 }, locale: 'pt-BR' })
  const page = await context.newPage()
  const token = await apiLogin()

  await step('Configurar no painel (preset Hostinger) + Testar conexão + Salvar', async () => {
    await api(token, 'DELETE', '/account')
    await loginUi(page)
    await page.goto('/admin/email')
    const settings = page.getByRole('region', { name: 'Configuração da caixa de e-mail' })
    await settings.waitFor()
    assert((await settings.getByRole('radio', { name: /Hostinger/ }).getAttribute('aria-checked')) === 'true', 'Hostinger não é o padrão')
    await settings.getByLabel('E-mail da caixa').fill(USER)
    await settings.getByLabel('Nome de exibição').fill('RedeCoop RS')
    assert((await settings.getByLabel('Usuário').inputValue()) === USER, 'usuário deveria ser o e-mail completo')
    assert((await settings.getByLabel('Servidor IMAP').inputValue()) === 'imap.hostinger.com', 'IMAP host')
    assert((await settings.getByLabel('Servidor SMTP').inputValue()) === 'smtp.hostinger.com', 'SMTP host')
    await settings.getByLabel('Senha').fill(PASS)
    await settings.getByLabel('Tempo para desfazer o envio').selectOption('0')
    await settings.getByRole('button', { name: 'Testar conexão' }).click()
    const status = settings.getByRole('status')
    await status.waitFor({ timeout: 60_000 })
    await page.waitForFunction(() => {
      const element = document.querySelector('.mailbox-settings__status')
      return element && !/Testando/i.test(element.textContent || '')
    }, null, { timeout: 60_000 })
    const text = (await status.textContent()) || ''
    assert(/IMAP e SMTP conectaram com sucesso/.test(text), `Testar conexão: ${text}`)
    await settings.getByRole('button', { name: 'Salvar' }).click()
    await page.getByRole('navigation', { name: 'Pastas' }).getByRole('button', { name: /Caixa de entrada/ }).waitFor({ timeout: 90_000 })
    const view = await api(token, 'GET', '/account')
    assert(view.data.configured && view.data.imapHost === 'imap.hostinger.com' && view.data.smtpPort === 465, 'conta não salva')
    assert(!JSON.stringify(view.data).includes(PASS), 'senha devolvida pela API')
    return text.trim()
  })

  const folders = await step('Listar pastas', async () => {
    const list = await api(token, 'GET', '/folders')
    okStatus(list, 'folders')
    const items = list.data.folders as Array<{ path: string; specialUse: string; totalCount: number }>
    assert(items.some((item) => item.specialUse === 'inbox'), 'sem INBOX')
    return items.map((item) => `${item.path} (${item.specialUse})`).join(', ')
  })

  await step('Abrir 3 mensagens existentes somente leitura (peek)', async () => {
    const list = await api(token, 'GET', '/messages?folder=INBOX&limit=10')
    okStatus(list, 'list')
    const items = (list.data.data as Array<{ uid: number; subject: string; seen: boolean }>).filter((item) => !item.subject.includes(TAG)).slice(0, 3)
    assert(items.length > 0, 'INBOX sem mensagens para abrir')
    for (const item of items) {
      const read = await api(token, 'GET', `/messages/read?folder=INBOX&uid=${item.uid}&peek=true`)
      okStatus(read, `read ${item.uid}`)
      assert(read.data.html || read.data.text || (read.data.attachments || []).length, `mensagem ${item.uid} sem corpo nem anexos`)
      assert(read.data.seen === item.seen, `estado de lida mudou na mensagem ${item.uid}`)
    }
    return `${items.length} abertas (${items.filter((item) => !item.seen).length} não lidas continuaram não lidas)`
  })

  const SUBJECT = `[${TAG}] Envio e recebimento — teste automatizado (ação/coração)`
  await step('Enviar para si mesma (Para/Cc/Cco = própria caixa) e receber', async () => {
    const sent = await api(token, 'POST', '/send', {
      to: USER,
      cc: USER,
      bcc: USER,
      subject: SUBJECT,
      html: '<p>Mensagem de teste automatizado do painel RedeCoop. Pode ser ignorada; será apagada em seguida.</p><p>Acentuação: ação, coração, pão.</p>',
      includeSignature: false,
      delaySeconds: 0,
    })
    okStatus(sent, 'send')
    const received = await waitTagged('INBOX', 'Envio e recebimento')
    const parsed = await simpleParser(received[0].raw)
    assert(parsed.subject === SUBJECT, 'assunto com acento chegou diferente')
    assert(!/^Bcc:/im.test(received[0].raw), 'cabeçalho Bcc vazou na mensagem recebida')
    const sentCopy = await waitTagged(folderPath(folders, 'sent'), 'Envio e recebimento', 60_000)
    return `${received.length} cópia(s) na INBOX, cópia em ${sentCopy[0].folder}, sem cabeçalho Bcc`
  })

  let uid = 0
  let messageId = ''
  await step('Responder (In-Reply-To + \\Answered)', async () => {
    uid = await apiUid(token, 'INBOX', 'Envio e recebimento')
    const read = await api(token, 'GET', `/messages/read?folder=INBOX&uid=${uid}&peek=true`)
    messageId = read.data.messageId
    const sent = await api(token, 'POST', '/send', {
      mode: 'reply',
      to: USER,
      subject: `Re: ${SUBJECT}`,
      html: '<p>Resposta do teste automatizado.</p>',
      sourceFolder: 'INBOX',
      sourceUid: uid,
      inReplyTo: messageId,
      references: messageId,
      includeSignature: false,
      delaySeconds: 0,
    })
    okStatus(sent, 'reply')
    const reply = await waitTagged('INBOX', 'Re: ')
    const parsed = await simpleParser(reply[0].raw)
    assert(parsed.inReplyTo === messageId, 'In-Reply-To incorreto')
    const original = (await findTagged('INBOX', 'Envio e recebimento')).find((item) => item.uid === uid)
    assert(original?.flags.has('\\Answered'), 'original sem \\Answered')
    return 'resposta recebida, encadeada e original marcada como respondida'
  })

  await step('Encaminhar (original como anexo .eml + $Forwarded)', async () => {
    const draft = await api(token, 'POST', '/drafts', {
      mode: 'forward',
      to: USER,
      subject: `Fwd: ${SUBJECT}`,
      html: '<p>Encaminhamento do teste automatizado.</p>',
      sourceFolder: 'INBOX',
      sourceUid: uid,
      includeSignature: false,
    })
    okStatus(draft, 'draft')
    const attached = await api(token, 'POST', `/drafts/${draft.data.id}/original`, { folder: 'INBOX', uid, asAttachment: true })
    okStatus(attached, 'attach original')
    const sent = await api(token, 'POST', '/send', {
      draftId: draft.data.id,
      mode: 'forward',
      to: USER,
      subject: `Fwd: ${SUBJECT}`,
      html: '<p>Encaminhamento do teste automatizado.</p>',
      sourceFolder: 'INBOX',
      sourceUid: uid,
      includeSignature: false,
      delaySeconds: 0,
    })
    okStatus(sent, 'forward')
    const forwarded = await waitTagged('INBOX', 'Fwd: ')
    const parsed = await simpleParser(forwarded[0].raw)
    assert(parsed.attachments.some((item) => item.contentType === 'message/rfc822' || item.filename?.endsWith('.eml')), 'sem .eml anexado')
    const original = (await findTagged('INBOX', 'Envio e recebimento')).find((item) => item.uid === uid)
    assert([...(original?.flags || [])].some((flag) => flag.toLowerCase() === '$forwarded'), 'original sem $Forwarded')
    return 'encaminhada com o original anexado'
  })

  await step('Estrela (marcar e desmarcar)', async () => {
    okStatus(await api(token, 'POST', '/messages/star', { folder: 'INBOX', uids: [uid], flagged: true }), 'star')
    let item = (await findTagged('INBOX', 'Envio e recebimento')).find((entry) => entry.uid === uid)
    assert(item?.flags.has('\\Flagged'), 'sem \\Flagged no servidor')
    okStatus(await api(token, 'POST', '/messages/star', { folder: 'INBOX', uids: [uid], flagged: false }), 'unstar')
    item = (await findTagged('INBOX', 'Envio e recebimento')).find((entry) => entry.uid === uid)
    assert(!item?.flags.has('\\Flagged'), '\\Flagged não saiu')
    return '\\Flagged conferido no servidor'
  })

  await step('Marcar como lida e como não lida', async () => {
    okStatus(await api(token, 'POST', '/messages/seen', { folder: 'INBOX', uids: [uid], seen: true }), 'seen')
    let item = (await findTagged('INBOX', 'Envio e recebimento')).find((entry) => entry.uid === uid)
    assert(item?.flags.has('\\Seen'), 'sem \\Seen')
    okStatus(await api(token, 'POST', '/messages/seen', { folder: 'INBOX', uids: [uid], seen: false }), 'unseen')
    item = (await findTagged('INBOX', 'Envio e recebimento')).find((entry) => entry.uid === uid)
    assert(!item?.flags.has('\\Seen'), '\\Seen não saiu')
    return '\\Seen removido no servidor'
  })

  await page.goto('/admin/email')
  await page.getByRole('navigation', { name: 'Pastas' }).waitFor({ timeout: 90_000 })
  await page.getByLabel('Buscar e-mails').fill(TAG)
  await page.locator('article').filter({ hasText: TAG }).first().waitFor({ timeout: 90_000 }).catch(() => undefined)
  await page.screenshot({ path: `${SHOTS}/20-caixa-real-mensagens-de-teste.png` })

  let archiveCreated = false
  await step('Arquivar', async () => {
    archiveCreated = !foldersBefore.some((path) => /(^|[./])Archive$/i.test(path))
    const reUid = await apiUid(token, 'INBOX', 'Re: ')
    okStatus(await api(token, 'POST', '/messages/archive', { folder: 'INBOX', uids: [reUid] }), 'archive')
    const list = (await api(token, 'GET', '/folders')).data.folders as Array<{ path: string; specialUse: string }>
    const archive = list.find((item) => item.specialUse === 'archive')
    assert(archive, 'pasta de arquivo não encontrada')
    await waitTagged(archive!.path, 'Re: ', 30_000)
    assert((await findTagged('INBOX', 'Re: ')).length === 0, 'continuou na INBOX')
    return `movida para ${archive!.path}${archiveCreated ? ' (pasta criada pelo teste)' : ''}`
  })

  let tempPath = ''
  await step('Mover para pasta temporária e de volta', async () => {
    const created = await api(token, 'POST', '/folders', { name: `RedeCoop teste ${TAG}` })
    okStatus(created, 'create folder')
    tempPath = created.data.path
    const fwdUid = await apiUid(token, 'INBOX', 'Fwd: ')
    okStatus(await api(token, 'POST', '/messages/move', { folder: 'INBOX', uids: [fwdUid], targetFolder: tempPath }), 'move')
    await waitTagged(tempPath, 'Fwd: ', 30_000)
    const backUid = await apiUid(token, tempPath, 'Fwd: ')
    okStatus(await api(token, 'POST', '/messages/move', { folder: tempPath, uids: [backUid], targetFolder: 'INBOX' }), 'move back')
    await waitTagged('INBOX', 'Fwd: ', 30_000)
    return `ida e volta por ${tempPath}`
  })

  await step('Excluir (Lixeira) e restaurar', async () => {
    const fwdUid = await apiUid(token, 'INBOX', 'Fwd: ')
    const removed = await api(token, 'POST', '/messages/delete', { folder: 'INBOX', uids: [fwdUid] })
    okStatus(removed, 'delete')
    assert(removed.data.permanent === false, 'exclusão deveria ir para a Lixeira')
    const trash = folderPath(folders, 'trash')
    await waitTagged(trash, 'Fwd: ', 30_000)
    const trashUid = await apiUid(token, trash, 'Fwd: ')
    okStatus(await api(token, 'POST', '/messages/restore', { folder: trash, uids: [trashUid] }), 'restore')
    await waitTagged('INBOX', 'Fwd: ', 30_000)
    assert((await findTagged(trash, 'Fwd: ')).length === 0, 'continuou na Lixeira')
    return `ida e volta por ${trash}`
  })

  await step('Limpeza: apagar só as mensagens de teste e as pastas criadas pelo teste', async () => {
    let removed = 0
    await imap(async (client) => {
      for (const folder of await client.list()) {
        if (folder.flags.has('\\Noselect')) continue
        const lock = await client.getMailboxLock(folder.path)
        try {
          if (!client.mailbox || !client.mailbox.exists) continue
          const uids: number[] = []
          for await (const message of client.fetch('1:*', { uid: true, envelope: true })) {
            if (message.envelope?.subject?.includes(TAG)) uids.push(message.uid)
          }
          if (uids.length) {
            await client.messageDelete(uids, { uid: true })
            removed += uids.length
          }
        } finally {
          lock.release()
        }
      }
      if (tempPath) {
        const status = await client.status(tempPath, { messages: true }).catch(() => null)
        if (status && status.messages === 0) await client.mailboxDelete(tempPath)
      }
      if (archiveCreated) {
        const archive = (await client.list()).find((item) => /(^|[./])Archive$/i.test(item.path) && !foldersBefore.includes(item.path))
        if (archive) {
          const status = await client.status(archive.path, { messages: true })
          if (status.messages === 0) await client.mailboxDelete(archive.path)
        }
      }
    })
    const foldersAfter = await imap(async (client) => (await client.list()).map((item) => item.path))
    assert(JSON.stringify([...foldersAfter].sort()) === JSON.stringify([...foldersBefore].sort()), `pastas diferentes: ${foldersAfter.join(', ')}`)
    return `${removed} mensagens de teste apagadas; pastas iguais às de antes (${foldersAfter.length})`
  })

  await step('Mensagens pré-existentes intactas (mesmas mensagens e flags)', async () => {
    const after = await snapshot()
    const changed: string[] = []
    for (const [key, flags] of before) {
      if (!after.has(key)) changed.push(`${key} sumiu`)
      else if (after.get(key) !== flags) changed.push(`${key}: ${flags} -> ${after.get(key)}`)
    }
    assert(changed.length === 0, `alteradas: ${changed.slice(0, 5).join('; ')}`)
    return `${before.size} mensagens conferidas, nenhuma alterada`
  })

  await api(token, 'DELETE', '/account')
  await browser.close()

  log('\nRESUMO')
  for (const item of results) log(item.ok ? '  OK  ' : '  FALHA', item.step, item.detail ? `— ${item.detail}` : '')
  process.exitCode = results.every((item) => item.ok) ? 0 : 1
}

function folderPath(folders: string | null, use: string) {
  const match = (folders || '').split(', ').find((item) => item.endsWith(`(${use})`))
  return match ? match.replace(/ \([a-z]+\)$/, '') : use === 'sent' ? 'INBOX.Sent' : 'INBOX.Trash'
}

main().catch((error) => {
  log('ERRO', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
