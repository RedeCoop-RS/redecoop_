import { expect, test, type Page } from '@playwright/test'
import {
  addr,
  api,
  apiLogin,
  countOnServer,
  ensureAccount,
  findOnServer,
  folderButton,
  folderPaths,
  openFolder,
  openMailbox,
  openRow,
  reader,
  row,
  RUN,
  sendAs,
  shot,
  waitForRow,
  waitOnServer,
  withImap,
} from './helpers'

const LOTE = (letter: string) => `Lote ${letter} ${RUN}`

async function unseenCount(folder: string) {
  return withImap('admin', async (client) => (await client.status(folder, { unseen: true })).unseen ?? -1)
}

async function bulkBar(page: Page) {
  return page.getByRole('toolbar', { name: 'Ações em lote' })
}

test.describe.serial('Pastas e ações nas mensagens', () => {
  const FOLDER = `Projetos Ação ${RUN}`
  const RENAMED = `Safra 2026 – Ações ${RUN}`

  test.beforeAll(async () => {
    await ensureAccount()
    for (const letter of ['A', 'B', 'C', 'D', 'E']) {
      await sendAs('ana', { to: addr('admin'), subject: LOTE(letter), text: `Mensagem do lote ${letter}.` })
    }
    await waitOnServer('admin', 'INBOX', LOTE('E'))
  })

  test('criar pasta com acento, arrastar mensagem, mover pelo menu, renomear e excluir', async ({ page }) => {
    await openMailbox(page)
    await page.getByRole('button', { name: 'Nova pasta' }).click()
    const dialog = page.getByRole('dialog', { name: 'Nova pasta' })
    await dialog.getByLabel('Nome da pasta').fill('a/b')
    await dialog.getByRole('button', { name: 'Criar' }).click()
    await expect(page.getByText(/Nome de pasta inválido/).first()).toBeVisible()
    await dialog.getByLabel('Nome da pasta').fill(FOLDER)
    await dialog.getByRole('button', { name: 'Criar' }).click()
    await expect(dialog).toBeHidden()
    await expect(folderButton(page, FOLDER)).toBeVisible()
    expect(await folderPaths('admin')).toContain(FOLDER)

    const plain = FOLDER.replace('Ação', 'Acao')
    await page.getByRole('button', { name: 'Nova pasta' }).click()
    await dialog.getByLabel('Nome da pasta').fill(plain)
    await dialog.getByRole('button', { name: 'Criar' }).click()
    await expect(folderButton(page, plain)).toBeVisible()
    await page.getByRole('button', { name: 'Atualizar' }).click()
    await expect(page.getByRole('navigation', { name: 'Pastas' }).getByRole('button', { name: FOLDER, exact: true })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Pastas' }).getByRole('button', { name: plain, exact: true })).toBeVisible()
    const token0 = await apiLogin()
    const listed = (await api(token0, 'GET', '/folders')).data.folders.map((item: { path: string }) => item.path)
    expect(listed).toEqual(expect.arrayContaining([FOLDER, plain]))
    expect((await api(token0, 'POST', '/folders/delete', { path: plain })).status).toBe(201)

    await waitForRow(page, LOTE('A'))
    await row(page, LOTE('A')).dragTo(folderButton(page, FOLDER))
    await expect.poll(() => countOnServer('admin', FOLDER, LOTE('A'))).toBe(1)
    expect(await countOnServer('admin', 'INBOX', LOTE('A'))).toBe(0)
    await expect(row(page, LOTE('A'))).toBeHidden()

    await openFolder(page, FOLDER)
    await openRow(page, LOTE('A'))
    await shot(page, '14-pasta-personalizada')
    await reader(page).getByLabel('Mover para a pasta').selectOption({ label: 'Caixa de entrada' })
    await expect.poll(() => countOnServer('admin', 'INBOX', LOTE('A'))).toBe(1)
    expect(await countOnServer('admin', FOLDER, LOTE('A'))).toBe(0)

    await folderButton(page, FOLDER).hover()
    await page.getByRole('button', { name: `Renomear pasta ${FOLDER}` }).click()
    const rename = page.getByRole('dialog', { name: 'Renomear pasta' })
    await rename.getByLabel('Nome da pasta').fill(RENAMED)
    await rename.getByRole('button', { name: 'Renomear' }).click()
    await expect(folderButton(page, RENAMED)).toBeVisible()
    await expect.poll(() => folderPaths('admin')).toContain(RENAMED)
    expect(await folderPaths('admin')).not.toContain(FOLDER)

    page.once('dialog', (confirm) => void confirm.accept())
    await folderButton(page, RENAMED).hover()
    await page.getByRole('button', { name: `Excluir pasta ${RENAMED}` }).click()
    await expect(folderButton(page, RENAMED)).toBeHidden()
    await expect.poll(() => folderPaths('admin')).not.toContain(RENAMED)

    const token = await apiLogin()
    for (const path of ['INBOX', 'Sent', 'Trash']) {
      expect((await api(token, 'POST', '/folders/delete', { path })).status, path).toBe(400)
    }
  })

  test('arquivar, spam / não é spam, lixeira / restaurar, excluir de vez', async ({ page }) => {
    await openMailbox(page)
    await openRow(page, LOTE('B'))
    await reader(page).getByRole('button', { name: 'Arquivar' }).click()
    await expect.poll(() => countOnServer('admin', 'Archive', LOTE('B'))).toBe(1)
    expect(await countOnServer('admin', 'INBOX', LOTE('B'))).toBe(0)

    await openRow(page, LOTE('C'))
    await reader(page).getByRole('button', { name: 'Spam' }).click()
    await expect.poll(() => countOnServer('admin', 'Junk', LOTE('C'))).toBe(1)
    await openFolder(page, 'Spam')
    await openRow(page, LOTE('C'))
    await reader(page).getByRole('button', { name: 'Não é spam' }).click()
    await expect.poll(() => countOnServer('admin', 'INBOX', LOTE('C'))).toBe(1)
    expect(await countOnServer('admin', 'Junk', LOTE('C'))).toBe(0)

    await openFolder(page, 'Caixa de entrada')
    await openRow(page, LOTE('D'))
    await reader(page).getByRole('button', { name: 'Excluir', exact: true }).click()
    await expect.poll(() => countOnServer('admin', 'Trash', LOTE('D'))).toBe(1)
    await openFolder(page, 'Lixeira')
    await openRow(page, LOTE('D'))
    await reader(page).getByRole('button', { name: 'Restaurar' }).click()
    await expect.poll(() => countOnServer('admin', 'INBOX', LOTE('D'))).toBe(1)
    expect(await countOnServer('admin', 'Trash', LOTE('D'))).toBe(0)

    await openFolder(page, 'Caixa de entrada')
    await openRow(page, LOTE('E'))
    await page.keyboard.press('#')
    await expect.poll(() => countOnServer('admin', 'Trash', LOTE('E'))).toBe(1)
    await openFolder(page, 'Lixeira')
    await openRow(page, LOTE('E'))
    page.once('dialog', (confirm) => void confirm.accept())
    await reader(page).getByRole('button', { name: 'Excluir de vez' }).click()
    await expect.poll(() => countOnServer('admin', 'Trash', LOTE('E'))).toBe(0)
    expect(await countOnServer('admin', 'INBOX', LOTE('E'))).toBe(0)
  })

  test('esvaziar Lixeira e Spam', async ({ page }) => {
    const token = await apiLogin()
    const d = await findOnServer('admin', 'INBOX', LOTE('D'))
    const c = await findOnServer('admin', 'INBOX', LOTE('C'))
    await api(token, 'POST', '/sync', { folder: 'INBOX' })
    expect((await api(token, 'POST', '/messages/delete', { folder: 'INBOX', uids: [d!.uid] })).status).toBe(201)
    expect((await api(token, 'POST', '/messages/spam', { folder: 'INBOX', uids: [c!.uid] })).status).toBe(201)

    await openMailbox(page)
    for (const [label, path] of [['Lixeira', 'Trash'], ['Spam', 'Junk']] as const) {
      await openFolder(page, label)
      expect(await countOnServer('admin', path, RUN)).toBeGreaterThan(0)
      page.once('dialog', (confirm) => void confirm.accept())
      await folderButton(page, label).hover()
      await page.getByRole('button', { name: `Esvaziar ${label}` }).click()
      await expect.poll(() => withImap('admin', async (client) => (await client.status(path, { messages: true })).messages)).toBe(0)
    }
    expect((await api(token, 'POST', '/folders/empty', { path: 'INBOX' })).status).toBe(400)
  })

  test('selecionar todas, ações em lote, marcar tudo como lido e agrupar conversas', async ({ page }) => {
    const thread = `Conversa agrupada ${RUN}`
    const first = await sendAs('bruno', { to: addr('admin'), subject: thread, text: 'Primeira.' })
    await sendAs('bruno', {
      to: addr('admin'),
      subject: `Re: ${thread}`,
      text: 'Segunda.',
      inReplyTo: first.messageId,
      references: [first.messageId],
    })
    await waitOnServer('admin', 'INBOX', `Re: ${thread}`)

    await openMailbox(page)
    await waitForRow(page, `Re: ${thread}`)
    expect(await unseenCount('INBOX')).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Marcar tudo como lido' }).click()
    await expect.poll(() => unseenCount('INBOX')).toBe(0)
    await expect(page.getByRole('button', { name: /Não lidas/ })).toContainText('0')

    const rows = page.getByRole('region', { name: 'Mensagens' }).locator('article')
    const total = await rows.count()
    await page.getByLabel('Selecionar todas desta página').check()
    await expect(await bulkBar(page)).toContainText(`${total} selecionada(s)`)
    await shot(page, '15-acoes-em-lote')
    await (await bulkBar(page)).getByRole('button', { name: 'Não lidas' }).click()
    await expect.poll(() => unseenCount('INBOX')).toBe(total)
    await page.keyboard.press('Shift+A')
    await expect(await bulkBar(page)).toBeHidden()

    await page.getByLabel('Agrupar conversas').check()
    const grouped = row(page, thread)
    await expect(grouped.getByLabel('2 mensagens na conversa')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Mensagens' }).locator('article').filter({ hasText: thread })).toHaveCount(1)
    await shot(page, '16-conversas-agrupadas')
    await grouped.locator('.mailbox-row__main').click()
    await expect(reader(page).getByRole('heading', { name: /Conversa \(2\)/ })).toBeVisible()
    await page.getByLabel('Agrupar conversas').uncheck()
    await expect(page.getByRole('region', { name: 'Mensagens' }).locator('article').filter({ hasText: thread })).toHaveCount(2)
  })
})
