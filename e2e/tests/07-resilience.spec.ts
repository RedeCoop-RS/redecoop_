import { execSync } from 'child_process'
import { createHash } from 'crypto'
import { expect, test } from '@playwright/test'
import {
  addr,
  composer,
  ensureAccount,
  openMailbox,
  openRow,
  poll,
  reader,
  row,
  RUN,
  sendAndWait,
  sendAs,
  shot,
  sleep,
  typeBody,
  waitForRow,
  waitOnServer,
  withImap,
} from './helpers'
import { bigBuffer } from './fixtures'

const sha = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex')
const sh = (command: string) => execSync(command, { stdio: 'pipe' }).toString()

async function portOpen(port: number) {
  const net = await import('net')
  return new Promise<boolean>((resolve) => {
    const socket = net.connect(port, '127.0.0.1')
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

function startDovecot() {
  sh('sudo dovecot 2>/dev/null || true')
  return poll(() => portOpen(993), 20_000, 'Dovecot voltar')
}

function startPostfix() {
  sh('sudo postfix start 2>/dev/null || true')
  return poll(() => portOpen(465), 20_000, 'Postfix voltar')
}

async function purge(user: 'admin' | 'ana', subject: string) {
  await withImap(user, async (client) => {
    for (const folder of ['INBOX', 'Sent']) {
      const lock = await client.getMailboxLock(folder)
      try {
        const uids = await client.search({ subject }, { uid: true })
        if (uids && uids.length) await client.messageDelete(uids, { uid: true })
      } finally {
        lock.release()
      }
    }
  })
}

test.describe.serial('Anexos grandes, quedas de conexão e cota', () => {
  test.beforeAll(async () => {
    await ensureAccount()
  })

  test.afterAll(async () => {
    await startDovecot()
    await startPostfix()
  })

  test('enviar anexo de 12 MB e baixar anexo recebido de 14 MB, com integridade', async ({ page }) => {
    test.setTimeout(240_000)
    const outgoing = bigBuffer(12 * 1024 * 1024)
    const subject = `Anexo grande enviado ${RUN}`
    await openMailbox(page)
    await page.getByRole('button', { name: 'Escrever' }).click()
    await composer(page).locator('label.mailbox-address').first().getByRole('combobox').fill(addr('ana'))
    await composer(page).getByLabel('Assunto').fill(subject)
    await typeBody(page, 'Arquivo de safra em anexo.')
    await composer(page).locator('label.mailbox-file input[type=file]').setInputFiles({
      name: 'relatório-safra-grande.zip',
      mimeType: 'application/zip',
      buffer: outgoing,
    })
    await expect(composer(page).getByRole('list', { name: 'Anexos' })).toContainText('relatório-safra-grande.zip', { timeout: 60_000 })
    await expect(composer(page).getByRole('list', { name: 'Anexos' })).toContainText('12')
    await shot(page, '17-anexo-grande')
    await sendAndWait(page)
    const received = await waitOnServer('ana', 'INBOX', subject, 90_000)
    const file = received.parsed.attachments[0]
    expect(file.filename).toBe('relatório-safra-grande.zip')
    expect(file.size).toBe(outgoing.length)
    expect(sha(file.content)).toBe(sha(outgoing))

    const incoming = bigBuffer(14 * 1024 * 1024 + 7)
    const big = `Anexo grande recebido ${RUN}`
    await sendAs('ana', {
      to: addr('admin'),
      subject: big,
      text: 'Planilha completa.',
      attachments: [{ filename: 'planilha-ação.xlsx', content: incoming }],
    })
    await waitOnServer('admin', 'INBOX', big, 90_000)
    await openRow(page, big)
    const item = reader(page).getByRole('list', { name: 'Anexos' }).getByRole('listitem').filter({ hasText: 'planilha-ação.xlsx' })
    const download = page.waitForEvent('download', { timeout: 90_000 })
    await item.getByRole('button', { name: 'Baixar' }).click()
    const saved = await (await download).path()
    const { readFileSync } = await import('fs')
    const content = readFileSync(saved!)
    expect(content.length).toBe(incoming.length)
    expect(sha(content)).toBe(sha(incoming))

    await page.getByRole('button', { name: 'Atualizar' }).click()
    await expect(page.getByRole('navigation', { name: 'Pastas' }).getByLabel('Espaço usado')).toContainText(/\d+(\.\d)? MB de 50/)
    await purge('admin', subject)
    await purge('admin', big)
    await purge('ana', subject)
  })

  test('conexão IMAP derrubada pelo servidor (doveadm kick): a caixa continua funcionando', async ({ page }) => {
    await openMailbox(page)
    sh(`sudo doveadm kick ${addr('admin')} || true`)
    const subject = `Depois da queda ${RUN}`
    await sendAs('bruno', { to: addr('admin'), subject, text: 'Ainda chega?' })
    await openRow(page, subject)
    await expect(reader(page).locator('.mailbox-reader__from')).toContainText('bruno@redecoop.test')
  })

  test('IMAP fora do ar: mensagem clara de erro e recuperação quando volta', async ({ page }) => {
    await openMailbox(page)
    sh('sudo doveadm stop 2>/dev/null || sudo pkill -x dovecot || true')
    await poll(async () => !(await portOpen(993)), 15_000, 'Dovecot parar')
    try {
      await page.getByRole('button', { name: 'Atualizar' }).click()
      await expect(page.getByText(/Não foi possível conectar ao servidor|conexão com o servidor/i).first()).toBeVisible()
      await shot(page, '18-servidor-fora-do-ar')
    } finally {
      await startDovecot()
    }
    const subject = `Servidor voltou ${RUN}`
    await sendAs('carla', { to: addr('admin'), subject, text: 'De volta.' })
    await waitForRow(page, subject, 45_000)
  })

  test('SMTP fora do ar durante o envio: rascunho preservado com o erro e reenvio depois', async ({ page }) => {
    const subject = `Envio com SMTP fora ${RUN}`
    await openMailbox(page)
    sh('sudo postfix stop 2>/dev/null || true')
    await poll(async () => !(await portOpen(465)), 15_000, 'Postfix parar')
    try {
      await page.getByRole('button', { name: 'Escrever' }).click()
      await composer(page).locator('label.mailbox-address').first().getByRole('combobox').fill(addr('ana'))
      await composer(page).getByLabel('Assunto').fill(subject)
      await typeBody(page, 'Tentativa durante a queda.')
      await composer(page).getByRole('button', { name: 'Enviar', exact: true }).click()
      await expect(composer(page)).toBeHidden()
      const draft = page.getByRole('button', { name: new RegExp(`Rascunho: ${subject}`) })
      await poll(async () => {
        if (await draft.isVisible()) return true
        await page.getByRole('button', { name: 'Atualizar' }).click()
        await sleep(1500)
        return false
      }, 45_000, 'rascunho com erro')
      await draft.click()
      await expect(composer(page).locator('.mailbox-banner--bad')).toContainText(/O envio anterior falhou: .*(conectar|conexão)/)
      await shot(page, '19-envio-falhou-rascunho')
    } finally {
      await startPostfix()
    }
    await sendAndWait(page)
    await waitOnServer('ana', 'INBOX', subject, 45_000)
    await expect(page.getByRole('button', { name: new RegExp(`Rascunho: ${subject}`) })).toHaveCount(0)
  })

  test('cota exibida no painel bate com o servidor', async ({ page }) => {
    await openMailbox(page)
    const usage = await withImap('admin', async (client) => {
      const quota = (await client.getQuota('INBOX')) as unknown as { storage?: { usage?: number; used?: number; limit?: number } }
      return quota.storage
    })
    expect(usage?.limit).toBe(50 * 1024 * 1024)
    await expect(page.getByLabel('Espaço usado')).toContainText('de 50')
    await expect(row(page, RUN).or(page.getByText('Nenhuma mensagem nesta pasta.'))).toBeVisible()
  })
})
