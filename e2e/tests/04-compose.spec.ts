import { expect, test, type Page } from '@playwright/test'
import { simpleParser } from 'mailparser'
import {
  ensureAccount,
  addr,
  composer,
  countOnServer,
  findOnServer,
  openMailbox,
  openRow,
  reader,
  RUN,
  sendAndWait,
  sendAs,
  shot,
  typeBody,
  waitOnServer,
} from './helpers'
import { PNG_RED_8PX, tinyPdf } from './fixtures'

function field(page: Page, name: 'Para' | 'Cc' | 'Cco') {
  const index = { Para: 0, Cc: 1, Cco: 2 }[name]
  return composer(page).locator('label.mailbox-address').nth(index).getByRole('combobox')
}

test.describe.serial('Escrever, responder e encaminhar', () => {
  const ASK = `Pedido de orçamento ${RUN}`
  const GROUP = `Planejamento coletivo ${RUN}`
  const FILES = `Documentos da safra ${RUN}`
  let askId = ''

  test.beforeAll(async () => {
    await ensureAccount()
    askId = (await sendAs('ana', { to: addr('admin'), subject: ASK, text: 'Pode me mandar o orçamento?' })).messageId
    await sendAs('ana', { to: addr('admin'), cc: [addr('bruno'), addr('carla')], subject: GROUP, text: 'Vamos alinhar a colheita.' })
    await sendAs('bruno', {
      to: addr('admin'),
      subject: FILES,
      text: 'Seguem os documentos.',
      attachments: [
        { filename: 'relatório-ação.pdf', content: tinyPdf('Safra 2026'), contentType: 'application/pdf' },
        { filename: 'mapa.png', content: PNG_RED_8PX, contentType: 'image/png' },
      ],
    })
    await waitOnServer('admin', 'INBOX', FILES)
  })

  test('responder: vai só para o remetente, com In-Reply-To, e marca \\Answered', async ({ page }) => {
    await openMailbox(page)
    await openRow(page, ASK)
    await reader(page).getByRole('button', { name: 'Responder', exact: true }).click()
    await expect(composer(page).getByRole('heading')).toHaveText('Responder')
    await expect(field(page, 'Para')).toHaveValue(/ana@redecoop\.test/)
    await expect(composer(page).getByLabel('Assunto')).toHaveValue(`Re: ${ASK}`)
    await typeBody(page, 'Segue o orçamento: R$ 1.200,00 — atenção ao prazo.')
    await shot(page, '05-responder')
    await sendAndWait(page)

    const reply = await waitOnServer('ana', 'INBOX', `Re: ${ASK}`)
    expect(reply.parsed.inReplyTo).toBe(askId)
    expect(reply.parsed.references).toContain(askId)
    expect(reply.parsed.text).toContain('Segue o orçamento: R$ 1.200,00 — atenção ao prazo.')
    expect(reply.parsed.html || '').toContain('Atenciosamente')
    expect(reply.parsed.to && 'value' in reply.parsed.to ? reply.parsed.to.value.map((item) => item.address) : []).toEqual([addr('ana')])
    await expect.poll(async () => (await findOnServer('admin', 'INBOX', ASK))!.flags.has('\\Answered')).toBe(true)
    expect(await countOnServer('admin', 'Sent', `Re: ${ASK}`)).toBe(1)
  })

  test('responder a todos: remetente em Para, demais em Cc, sem a própria caixa', async ({ page }) => {
    await openMailbox(page)
    await openRow(page, GROUP)
    await reader(page).getByRole('button', { name: 'Responder a todos' }).click()
    await expect(field(page, 'Para')).toHaveValue(/ana@redecoop\.test/)
    await expect(field(page, 'Cc')).toHaveValue(/bruno@redecoop\.test/)
    await expect(field(page, 'Cc')).toHaveValue(/carla@redecoop\.test/)
    await expect(field(page, 'Cc')).not.toHaveValue(/admin@redecoop\.test/)
    await typeBody(page, 'Combinado com todos.')
    await sendAndWait(page)
    for (const user of ['ana', 'bruno', 'carla'] as const) await waitOnServer(user, 'INBOX', `Re: ${GROUP}`)
    expect(await countOnServer('admin', 'INBOX', `Re: ${GROUP}`)).toBe(0)
  })

  test('encaminhar leva os anexos originais', async ({ page }) => {
    await openMailbox(page)
    await openRow(page, FILES)
    await reader(page).getByRole('button', { name: 'Encaminhar' }).click()
    await expect(composer(page).getByRole('list', { name: 'Anexos' })).toContainText('relatório-ação.pdf')
    await expect(composer(page).getByRole('list', { name: 'Anexos' })).toContainText('mapa.png')
    await field(page, 'Para').fill(addr('carla'))
    await typeBody(page, 'Carla, veja os documentos abaixo.')
    await sendAndWait(page)
    const forwarded = await waitOnServer('carla', 'INBOX', FILES)
    expect(forwarded.parsed.subject).toMatch(/^(Fwd|Enc|ENC|Fw):/i)
    expect(forwarded.parsed.attachments.map((item) => item.filename).sort()).toEqual(['mapa.png', 'relatório-ação.pdf'])
    expect(forwarded.parsed.attachments.find((item) => item.filename === 'relatório-ação.pdf')!.content.subarray(0, 5).toString()).toBe('%PDF-')
    expect(await findOnServer('admin', 'INBOX', FILES).then((item) => item!.flags.has('$Forwarded'))).toBe(true)
  })

  test('encaminhar como anexo (.eml)', async ({ page }) => {
    await openMailbox(page)
    await openRow(page, FILES)
    await reader(page).getByRole('button', { name: 'Mais ações' }).click()
    await page.getByRole('menuitem', { name: 'Encaminhar como anexo' }).click()
    await expect(composer(page).getByRole('list', { name: 'Anexos' })).toContainText('.eml')
    await field(page, 'Para').fill(addr('bruno'))
    await sendAndWait(page)
    const message = await waitOnServer('bruno', 'INBOX', `${FILES}`)
    const eml = message.parsed.attachments.find((item) => item.contentType === 'message/rfc822' || item.filename?.endsWith('.eml'))
    expect(eml, 'anexo .eml').toBeTruthy()
    expect(eml!.content.toString('utf8')).toContain('relat')
  })

  test('Cco não vaza para os outros destinatários; cópia em Enviados guarda o Cco', async ({ page }) => {
    const subject = `Convocação sigilosa ${RUN}`
    await openMailbox(page)
    await page.getByRole('button', { name: 'Escrever' }).click()
    await field(page, 'Para').fill(addr('ana'))
    await composer(page).getByRole('button', { name: 'Adicionar Cc e Cco' }).click()
    await field(page, 'Cc').fill(addr('bruno'))
    await field(page, 'Cco').fill(addr('carla'))
    await composer(page).getByLabel('Assunto').fill(subject)
    await typeBody(page, 'Assembleia na sexta.')
    await sendAndWait(page)

    const forCarla = await waitOnServer('carla', 'INBOX', subject)
    expect(forCarla.raw).not.toMatch(/^Bcc:/im)
    for (const user of ['ana', 'bruno'] as const) {
      const copy = await waitOnServer(user, 'INBOX', subject)
      expect(copy.raw).not.toContain(addr('carla'))
      expect(copy.raw).not.toMatch(/^Bcc:/im)
    }
    const sent = await waitOnServer('admin', 'Sent', subject)
    expect(sent.raw).toMatch(/^Bcc:.*carla@redecoop\.test/im)
  })

  test('autocompletar contatos, imagem no corpo, prioridade alta, confirmação de leitura e 2ª assinatura', async ({ page }) => {
    const subject = `Imagem e prioridade ${RUN}`
    await openMailbox(page)
    await page.getByRole('button', { name: 'Escrever' }).click()
    await field(page, 'Para').fill('bru')
    const option = composer(page).getByRole('option', { name: /bruno@redecoop\.test/ })
    await expect(option).toBeVisible()
    await expect(composer(page).getByRole('option', { name: /admin@redecoop\.test/ })).toHaveCount(0)
    await shot(page, '06-autocompletar')
    await option.click()
    await expect(field(page, 'Para')).toHaveValue(/bruno@redecoop\.test, $/)
    await field(page, 'Para').pressSequentially('ana')
    await field(page, 'Para').press('Enter')
    await expect(composer(page)).toBeVisible()
    if (!/ana@redecoop\.test/.test(await field(page, 'Para').inputValue())) {
      await expect(composer(page).getByRole('option', { name: /ana@redecoop\.test/ })).toBeVisible()
      await field(page, 'Para').press('Enter')
    }
    await expect(field(page, 'Para')).toHaveValue(/bruno@redecoop\.test, .*ana@redecoop\.test/)

    await composer(page).getByLabel('Assunto').fill(subject)
    await typeBody(page, 'Logo da cooperativa: ')
    await composer(page).getByTestId('inline-image-input').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG_RED_8PX })
    await expect(composer(page).getByRole('textbox', { name: 'Corpo da mensagem' }).locator('img')).toHaveCount(1)
    await composer(page).getByLabel('Prioridade').selectOption('high')
    await composer(page).getByLabel('Pedir confirmação de leitura').check()
    await composer(page).getByLabel('Escolher assinatura').selectOption({ label: 'Curta' })
    await shot(page, '07-editor-imagem-prioridade')
    await composer(page).getByRole('textbox', { name: 'Corpo da mensagem' }).press('Control+Enter')
    await expect(composer(page)).toBeHidden()
    await expect(page.locator('.mailbox-undo')).toBeHidden({ timeout: 45_000 })

    const message = await waitOnServer('ana', 'INBOX', subject)
    expect(message.raw).toMatch(/^X-Priority: 1/im)
    expect(message.raw).toMatch(/^Importance: high/im)
    expect(message.raw).toMatch(/^Disposition-Notification-To: .*admin@redecoop\.test/im)
    const image = message.parsed.attachments.find((item) => item.contentType === 'image/png')
    expect(image?.cid, 'imagem inline com Content-ID').toBeTruthy()
    expect(message.parsed.html || '').toContain('versão curta')
    expect(message.parsed.html || '').not.toContain('Equipe RedeCoop')
    const withCid = await simpleParser(message.raw, { keepCidLinks: true })
    expect(withCid.html || '').toContain(`src="cid:${image!.cid}"`)
    expect(withCid.html || '').not.toContain('data:image')
    expect(withCid.html || '').not.toMatch(/<img[^>]* width height/)
    await waitOnServer('bruno', 'INBOX', subject)
  })

  test('rascunho é salvo automaticamente e reaberto', async ({ page }) => {
    const subject = `Rascunho pendente ${RUN}`
    await openMailbox(page)
    await page.getByRole('button', { name: 'Escrever' }).click()
    await field(page, 'Para').fill(addr('ana'))
    await composer(page).getByLabel('Assunto').fill(subject)
    await typeBody(page, 'Ainda escrevendo…')
    await expect(composer(page).getByText(/Rascunho salvo às/)).toBeVisible({ timeout: 15_000 })
    await composer(page).getByRole('button', { name: 'Fechar editor' }).click()
    await page.reload()
    await page.getByRole('button', { name: new RegExp(`Rascunho: ${subject}`) }).click()
    await expect(composer(page).getByLabel('Assunto')).toHaveValue(subject)
    page.once('dialog', (dialog) => void dialog.accept())
    await composer(page).getByRole('button', { name: 'Descartar' }).click()
    await expect(page.getByRole('button', { name: new RegExp(`Rascunho: ${subject}`) })).toHaveCount(0)
  })
})
