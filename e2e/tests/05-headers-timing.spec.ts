import { expect, test } from '@playwright/test'
import {
  addr,
  api,
  apiLogin,
  composer,
  countOnServer,
  ensureAccount,
  findOnServer,
  openMailbox,
  openRow,
  reader,
  row,
  RUN,
  sendAs,
  shot,
  sleep,
  typeBody,
  waitForRow,
  waitOnServer,
} from './helpers'

test.describe.serial('Cabeçalhos, confirmação de leitura, desfazer e agendar', () => {
  const URGENT = `Urgente: entrega atrasada ${RUN}`
  const RECEIPT = `Confirme a leitura ${RUN}`
  const NEWSLETTER = `Boletim da cooperativa ${RUN}`

  test.beforeAll(async () => {
    await ensureAccount()
    await sendAs('ana', { to: addr('admin'), subject: URGENT, text: 'Caminhão parado.', priority: 'high' })
    await sendAs('bruno', {
      to: addr('admin'),
      subject: RECEIPT,
      text: 'Por favor confirme.',
      headers: { 'Disposition-Notification-To': addr('bruno') },
    })
    await sendAs('carla', {
      to: addr('admin'),
      subject: NEWSLETTER,
      html: '<p>Novidades do mês.</p>',
      list: { unsubscribe: [{ url: 'https://lista.example.com/sair?id=1', comment: 'Sair' }, 'sair@lista.example.com'] },
    })
    await waitOnServer('admin', 'INBOX', NEWSLETTER)
  })

  test('prioridade alta aparece na lista e na leitura', async ({ page }) => {
    await openMailbox(page)
    await waitForRow(page, URGENT)
    await expect(row(page, URGENT).getByLabel('Prioridade alta')).toBeVisible()
    await openRow(page, URGENT)
    await expect(reader(page).locator('.mailbox-tag--high')).toHaveText('Prioridade alta')
  })

  test('confirmação de leitura: enviar gera "Lida:" ao remetente e não pergunta de novo', async ({ page }) => {
    await openMailbox(page)
    await openRow(page, RECEIPT)
    const banner = reader(page).getByRole('status').filter({ hasText: 'pediu confirmação de leitura' })
    await expect(banner).toContainText('bruno@redecoop.test')
    await shot(page, '08-confirmacao-de-leitura')
    await banner.getByRole('button', { name: 'Enviar confirmação' }).click()
    await expect(banner).toBeHidden()
    const mdn = await waitOnServer('bruno', 'INBOX', `Lida: ${RECEIPT}`)
    expect(mdn.parsed.to && 'value' in mdn.parsed.to ? mdn.parsed.to.value[0].address : '').toBe(addr('bruno'))
    await expect.poll(async () => (await findOnServer('admin', 'INBOX', RECEIPT))!.flags.has('$MDNSent')).toBe(true)
    await page.reload()
    await openRow(page, RECEIPT)
    await expect(reader(page).getByText('pediu confirmação de leitura')).toHaveCount(0)
  })

  test('lista de e-mails mostra "Cancelar inscrição" com o link https', async ({ page, context }) => {
    await openMailbox(page)
    await context.route('https://lista.example.com/**', (route) => route.fulfill({ body: 'ok', contentType: 'text/plain' }))
    await openRow(page, NEWSLETTER)
    const popup = context.waitForEvent('page')
    await reader(page).getByRole('button', { name: 'Cancelar inscrição' }).click()
    const opened = await popup
    expect(opened.url()).toContain('https://lista.example.com/sair?id=1')
    await opened.close()
  })

  test('ver original (.eml) e imprimir', async ({ page }) => {
    await openMailbox(page)
    await openRow(page, URGENT)
    await reader(page).getByRole('button', { name: 'Mais ações' }).click()
    await page.getByRole('menuitem', { name: 'Ver original' }).click()
    const source = page.getByRole('dialog', { name: 'Original da mensagem' })
    await expect(source.locator('pre')).toContainText('Subject:')
    await expect(source.locator('pre')).toContainText(/X-Priority: 1/i)
    await expect(source.getByRole('link', { name: 'Baixar .eml' })).toHaveAttribute('download', /\.eml$/)
    await shot(page, '09-ver-original')
    await page.keyboard.press('Escape')
    await expect(source).toBeHidden()

    await reader(page).getByRole('button', { name: 'Mais ações' }).click()
    await page.getByRole('menuitem', { name: 'Imprimir' }).click()
    const frame = page.locator('iframe[aria-hidden="true"]').last()
    await expect(frame).toHaveAttribute('sandbox', /allow-modals/)
    await expect(page.frameLocator('iframe[aria-hidden="true"]').last().locator('body')).toContainText(URGENT)
    await expect(page.frameLocator('iframe[aria-hidden="true"]').last().locator('body')).toContainText('ana@redecoop.test')
  })

  test('desfazer envio: a mensagem volta ao editor e não chega ao destinatário', async ({ page }) => {
    const subject = `Envio desfeito ${RUN}`
    await openMailbox(page)
    await page.getByRole('button', { name: 'Escrever' }).click()
    await composer(page).locator('label.mailbox-address').first().getByRole('combobox').fill(addr('ana'))
    await composer(page).getByLabel('Assunto').fill(subject)
    await typeBody(page, 'Opa, mandei sem querer.')
    await composer(page).getByRole('button', { name: 'Enviar', exact: true }).click()
    const undo = page.locator('.mailbox-undo')
    await expect(undo).toContainText(`Enviando “${subject}” em`)
    await shot(page, '10-desfazer-envio')
    await undo.getByRole('button', { name: 'Desfazer' }).click()
    await expect(composer(page).getByLabel('Assunto')).toHaveValue(subject)
    await sleep(9000)
    expect(await countOnServer('ana', 'INBOX', subject)).toBe(0)
    page.once('dialog', (dialog) => void dialog.accept())
    await composer(page).getByRole('button', { name: 'Descartar' }).click()
  })

  test('agendar pelo menu, ver em "Agendados" e cancelar', async ({ page }) => {
    const subject = `Agendado para amanhã ${RUN}`
    await openMailbox(page)
    await page.getByRole('button', { name: 'Escrever' }).click()
    await composer(page).locator('label.mailbox-address').first().getByRole('combobox').fill(addr('bruno'))
    await composer(page).getByLabel('Assunto').fill(subject)
    await typeBody(page, 'Lembrete da reunião.')
    await composer(page).getByRole('button', { name: 'Agendar envio' }).click()
    await shot(page, '11-agendar-envio')
    await page.getByRole('dialog', { name: 'Agendar envio' }).getByRole('button', { name: /Amanhã de manhã/ }).click()
    await expect(composer(page)).toBeHidden()
    await page.getByRole('navigation', { name: 'Pastas' }).getByRole('button', { name: /Agendados/ }).click()
    const scheduled = page.getByRole('region', { name: 'Envios agendados' })
    await expect(scheduled).toContainText(subject)
    await expect(scheduled).toContainText('Envio em')
    await shot(page, '12-agendados')
    await scheduled.locator('article').filter({ hasText: subject }).getByRole('button', { name: 'Cancelar' }).click()
    await expect(scheduled).not.toContainText(subject)
    const drafts = (await api(await apiLogin(), 'GET', '/drafts')).data as Array<{ id: number; subject: string; scheduledAt: string | null }>
    const draft = drafts.find((item) => item.subject === subject)
    expect(draft?.scheduledAt ?? null).toBeNull()
    await api(await apiLogin(), 'DELETE', `/drafts/${draft!.id}`)
  })

  test('envio agendado é disparado no horário pelo servidor', async () => {
    const subject = `Agendado em 35 s ${RUN}`
    const token = await apiLogin()
    const sendAt = new Date(Date.now() + 35_000).toISOString()
    const result = await api(token, 'POST', '/send', { to: addr('carla'), subject, html: '<p>Chegou na hora.</p>', sendAt })
    expect(result.status).toBe(201)
    expect(result.data).toMatchObject({ scheduled: true, undoable: false })
    await sleep(15_000)
    expect(await countOnServer('carla', 'INBOX', subject)).toBe(0)
    const delivered = await waitOnServer('carla', 'INBOX', subject, 60_000)
    expect(new Date(delivered.parsed.date!).getTime()).toBeGreaterThanOrEqual(new Date(sendAt).getTime() - 2000)
    await waitOnServer('admin', 'Sent', subject)
    const drafts = (await api(token, 'GET', '/drafts')).data as Array<{ subject: string }>
    expect(drafts.some((item) => item.subject === subject)).toBe(false)
  })

  test('atalhos: ? abre a ajuda, c escreve, Ctrl+C não dispara atalho', async ({ page }) => {
    await openMailbox(page)
    await page.keyboard.press('?')
    const help = page.getByRole('dialog', { name: 'Atalhos de teclado' })
    await expect(help).toContainText('responder a todos')
    await shot(page, '13-atalhos')
    await page.keyboard.press('Escape')
    await expect(help).toBeHidden()
    await page.keyboard.press('Control+c')
    await expect(composer(page)).toBeHidden()
    await page.keyboard.press('c')
    await expect(composer(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(composer(page)).toBeHidden()
  })
})
