import { createRequire } from 'module'
import path from 'path'
import { expect, test } from '@playwright/test'
import { addr, api, apiLogin, loginUi, MAIL_HOST, MAIL_PASSWORD, shot } from './helpers'

const apiRequire = createRequire(path.join(__dirname, '../../api-redecoop/package.json'))

async function storedCipher() {
  const mysql = apiRequire('mysql2/promise')
  const db = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    user: process.env.DATABASE_USER || 'redecoop',
    password: process.env.DATABASE_PASSWORD || 'redecoop123',
    database: process.env.DATABASE_NAME || 'redecoopapi',
  })
  const [rows] = await db.query('SELECT password_cipher FROM mailbox_account LIMIT 1')
  await db.end()
  return String(rows[0]?.password_cipher || '')
}

test.describe.serial('Configuração da conta', () => {
  test('Hostinger é o padrão e mostra os servidores', async ({ page }) => {
    await loginUi(page)
    await page.goto('/admin/email')
    const settings = page.getByRole('region', { name: 'Configuração da caixa de e-mail' })
    await expect(settings).toBeVisible()
    await expect(settings.getByRole('radio', { name: /Hostinger/ })).toHaveAttribute('aria-checked', 'true')
    await expect(settings.getByText('IMAP imap.hostinger.com:993 SSL/TLS · SMTP smtp.hostinger.com:465 SSL')).toBeVisible()
    await expect(settings.getByLabel('Servidor IMAP')).toHaveValue('imap.hostinger.com')
    await expect(settings.getByLabel('Porta SMTP')).toHaveValue('465')
    await settings.getByLabel('E-mail da caixa').fill('contato@exemplo.com.br')
    await expect(settings.getByLabel('Usuário')).toHaveValue('contato@exemplo.com.br')
    await shot(page, '01-configuracao-hostinger')
  })

  test('Personalizado: senha errada falha, certa passa, salva e lista as pastas', async ({ page }) => {
    await loginUi(page)
    await page.goto('/admin/email')
    const settings = page.getByRole('region', { name: 'Configuração da caixa de e-mail' })
    await settings.getByRole('radio', { name: /Personalizado/ }).click()
    await settings.getByLabel('E-mail da caixa').fill(addr('admin'))
    await settings.getByLabel('Nome de exibição').fill('Admin RedeCoop')
    await settings.getByLabel('Usuário').fill(addr('admin'))
    await settings.getByLabel('Servidor IMAP').fill(MAIL_HOST)
    await settings.getByLabel('Porta IMAP').fill('993')
    await settings.getByLabel('Servidor SMTP').fill(MAIL_HOST)
    await settings.getByLabel('Porta SMTP').fill('465')
    await settings.getByLabel('Senha').fill('senha-errada')

    await settings.getByRole('button', { name: 'Testar conexão' }).click()
    const status = settings.getByRole('status')
    await expect(status).toContainText(/IMAP/)
    await expect(status).toContainText(/autenticação|usuário e senha/i)
    await expect(status).not.toContainText('senha-errada')

    await settings.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText(/autenticação|usuário e senha/i).first()).toBeVisible()
    expect((await api(await apiLogin(), 'GET', '/account')).data.configured).toBe(false)

    await settings.getByLabel('Senha').fill(MAIL_PASSWORD)
    await settings.getByRole('button', { name: 'Testar conexão' }).click()
    await expect(status).toContainText('IMAP e SMTP conectaram com sucesso')

    await settings.getByRole('button', { name: '+ Adicionar assinatura' }).click()
    await settings.getByLabel('Texto da assinatura Principal').fill('Atenciosamente,\nEquipe RedeCoop · Cooperação')
    await settings.getByRole('button', { name: '+ Adicionar assinatura' }).click()
    await settings.getByLabel('Nome da assinatura 2').fill('Curta')
    await settings.getByLabel('Texto da assinatura Curta').fill('— Admin (versão curta)')
    await settings.getByLabel('Tempo para desfazer o envio').selectOption('5')
    await shot(page, '02-configuracao-teste-ok')
    await settings.getByRole('button', { name: 'Salvar' }).click()

    const folders = page.getByRole('navigation', { name: 'Pastas' })
    await expect(folders.getByRole('button', { name: /Caixa de entrada/ })).toBeVisible()
    for (const label of ['Enviados', 'Rascunhos', 'Arquivo', 'Spam', 'Lixeira', 'Agendados', 'Nova pasta']) {
      await expect(folders.getByRole('button', { name: new RegExp(label) }).first()).toBeVisible()
    }
    await expect(folders.getByLabel('Espaço usado')).toContainText(/de 50([.,]0)? MB/)

    const account = (await api(await apiLogin(), 'GET', '/account')).data
    expect(account).toMatchObject({ configured: true, email: addr('admin'), hasPassword: true, undoSendSeconds: 5 })
    expect(account.signatures).toHaveLength(2)
    expect(JSON.stringify(account)).not.toContain(MAIL_PASSWORD)
    const cipher = await storedCipher()
    expect(cipher.length).toBeGreaterThan(20)
    expect(cipher).not.toContain(MAIL_PASSWORD)
  })
})
