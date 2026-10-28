import { expect, test } from '@playwright/test'
import {
  ensureAccount,
  api,
  apiLogin,
  addr,
  findOnServer,
  openMailbox,
  openRow,
  reader,
  row,
  RUN,
  sendAs,
  shot,
  waitForRow,
  waitOnServer,
} from './helpers'
import { PNG_RED_8PX, tinyPdf } from './fixtures'

const SUBJECT = `Reunião de cooperação nº ${RUN} — ação çãõ`

test.describe.serial('Leitura, anexos e marcações', () => {
  test.beforeAll(async () => {
    await ensureAccount()
    await sendAs('ana', {
      to: addr('admin'),
      subject: SUBJECT,
      text: 'Olá! Pauta da cooperação: ações de março, orçamento e logística.',
      html: `<p>Olá! Pauta da <b>cooperação</b>: ações de março, orçamento e logística.</p>
        <p><img src="https://rastreador.example.com/pixel.gif" alt="pixel"></p>
        <script>alert(1)</script><a href="javascript:alert(2)">clique</a>`,
      attachments: [
        { filename: 'relatório-ação.pdf', content: tinyPdf('Relatorio RedeCoop'), contentType: 'application/pdf' },
        { filename: 'foto.png', content: PNG_RED_8PX, contentType: 'image/png' },
        { filename: 'pagina.html', content: '<script>alert(document.cookie)</script>', contentType: 'text/html' },
      ],
    })
    await waitOnServer('admin', 'INBOX', SUBJECT)
  })

  test('lista mostra remetente, assunto com acentos, prévia e anexo; ler marca como lida no servidor', async ({ page }) => {
    await openMailbox(page)
    await waitForRow(page, SUBJECT)
    const item = row(page, SUBJECT)
    await expect(item).toHaveClass(/mailbox-row--unread/)
    await expect(item).toContainText('ana@redecoop.test')
    await expect(item).toContainText('Pauta da cooperação')
    await expect(item.getByLabel('Possui anexo')).toBeVisible()
    expect((await findOnServer('admin', 'INBOX', SUBJECT))!.flags.has('\\Seen')).toBe(false)

    await openRow(page, SUBJECT)
    const message = reader(page)
    await expect(message.locator('.mailbox-reader__from')).toContainText('ana@redecoop.test')
    const body = page.frameLocator('iframe[title="Conteúdo do e-mail"]')
    await expect(body.locator('body')).toContainText('ações de março, orçamento e logística')
    await expect(body.locator('script')).toHaveCount(0)
    await expect(body.locator('a[href^="javascript"]')).toHaveCount(0)
    await expect(message.getByText('Imagens remotas bloqueadas (1).')).toBeVisible()
    await expect.poll(async () => (await findOnServer('admin', 'INBOX', SUBJECT))!.flags.has('\\Seen')).toBe(true)
    await shot(page, '03-leitura-com-anexos')
  })

  test('pré-visualiza imagem e PDF; HTML só baixa como arquivo', async ({ page }) => {
    await openMailbox(page)
    await openRow(page, SUBJECT)
    const files = reader(page).getByRole('list', { name: 'Anexos' })
    await expect(files).toContainText('relatório-ação.pdf')
    const png = files.getByRole('listitem').filter({ hasText: 'foto.png' })
    await png.getByRole('button', { name: 'Ver' }).click()
    const preview = page.getByRole('dialog', { name: 'Pré-visualização' })
    await expect(preview.locator('img')).toBeVisible()
    await expect.poll(() => preview.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(8)
    await preview.getByRole('button', { name: 'Fechar' }).click()

    await files.getByRole('listitem').filter({ hasText: 'relatório-ação.pdf' }).getByRole('button', { name: 'Ver' }).click()
    await expect(preview.locator('object[type="application/pdf"]')).toBeVisible()
    await shot(page, '04-preview-pdf')
    await page.keyboard.press('Escape')

    const html = files.getByRole('listitem').filter({ hasText: 'pagina.html' })
    await expect(html.getByRole('button', { name: 'Ver' })).toHaveCount(0)
    const download = page.waitForEvent('download')
    await html.getByRole('button', { name: 'Baixar' }).click()
    expect((await download).suggestedFilename()).toBe('pagina.html')

    const token = await apiLogin()
    const uid = (await findOnServer('admin', 'INBOX', SUBJECT))!.uid
    for (const preview of [true, false]) {
      const response = await api(token, 'GET', `/messages/attachment?folder=INBOX&uid=${uid}&index=2&preview=${preview}`)
      expect(response.raw.headers.get('content-type')).toContain('application/octet-stream')
      expect(response.raw.headers.get('content-disposition')).toContain('attachment')
      expect(response.raw.headers.get('content-security-policy')).toContain("default-src 'none'")
    }
  })

  test('não lida, estrela e filtros refletem no servidor', async ({ page }) => {
    await openMailbox(page)
    await openRow(page, SUBJECT)
    await reader(page).getByRole('button', { name: 'Não lida' }).click()
    await expect.poll(async () => (await findOnServer('admin', 'INBOX', SUBJECT))!.flags.has('\\Seen')).toBe(false)
    await page.waitForTimeout(1500)
    await expect(row(page, SUBJECT)).toHaveClass(/mailbox-row--unread/)
    expect((await findOnServer('admin', 'INBOX', SUBJECT))!.flags.has('\\Seen')).toBe(false)

    await row(page, SUBJECT).getByRole('button', { name: 'Marcar com estrela' }).click()
    await expect.poll(async () => (await findOnServer('admin', 'INBOX', SUBJECT))!.flags.has('\\Flagged')).toBe(true)
    await expect(page.getByRole('button', { name: /Com estrela/ })).toContainText('1')
    await expect(page.getByRole('button', { name: /Com anexo/ })).toContainText('1')
    await expect(page.getByRole('button', { name: /Não lidas/ })).toContainText('1')

    await page.getByRole('button', { name: /Com estrela/ }).click()
    await expect(row(page, SUBJECT)).toBeVisible()
    await page.getByRole('button', { name: /Com estrela/ }).click()

    await page.getByLabel('Buscar e-mails').fill('orçamento')
    await expect(row(page, SUBJECT)).toBeVisible()
    await page.getByLabel('Buscar e-mails').fill('inexistente-xyz')
    await expect(row(page, SUBJECT)).toBeHidden()
    await page.getByLabel('Buscar e-mails').fill('')

    await row(page, SUBJECT).getByRole('button', { name: 'Remover estrela' }).click()
    await expect.poll(async () => (await findOnServer('admin', 'INBOX', SUBJECT))!.flags.has('\\Flagged')).toBe(false)
  })
})
