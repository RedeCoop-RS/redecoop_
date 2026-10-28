import { expect, test, type Page } from '@playwright/test'
import { API, RUN, sleep } from '../helpers'
import { PNG_1PX } from '../fixtures'
import { apiLogin, blogApi, ghostUrl, openBlog } from './helpers'

function futureLocal() {
  const when = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}T09:30`
}

async function article(page: Page, title: string) {
  const row = page.getByRole('article', { name: title })
  await expect(row).toBeVisible()
  return row
}

test.describe('Gestão do blog no Ghost', () => {
  test('salva a conexão sem devolver a chave', async ({ page }) => {
    const key = process.env.GHOST_ADMIN_API_KEY
    expect(key, 'GHOST_ADMIN_API_KEY da integração de teste').toBeTruthy()
    await openBlog(page)
    await expect(page.getByText(/Conectado/)).toBeVisible()
    await page.getByRole('button', { name: 'Conexão' }).click()
    await page.getByLabel('URL do Ghost').fill(ghostUrl())
    await page.getByLabel('Admin API key').fill(key!)
    await page.getByRole('button', { name: 'Testar conexão' }).click()
    await expect(page.getByText(/Conectado a /)).toBeVisible()
    await page.getByRole('button', { name: 'Salvar conexão' }).click()
    await expect(page.getByText('Conexão salva.')).toBeVisible()
    const token = await apiLogin()
    const saved = await blogApi(token, 'GET', '/connection')
    expect(saved.status).toBe(200)
    expect(saved.data.source).toBe('saved')
    expect(saved.data.connected).toBe(true)
    expect(JSON.stringify(saved.data)).not.toContain(key!.split(':')[1])
  })

  test('cria, publica, derruba, agenda, duplica e exclui', async ({ page }) => {
    const title = `Safra de primavera ${RUN}`
    const tag = `Colheita ${RUN}`
    await openBlog(page)

    await page.getByRole('button', { name: 'Tags' }).click()
    await page.getByLabel('Nome da tag').fill(tag)
    await page.getByRole('button', { name: 'Criar tag' }).click()
    await expect(page.getByRole('dialog', { name: 'Tags' }).getByText(tag)).toBeVisible()
    await page.getByRole('button', { name: 'Fechar' }).click()

    await page.getByRole('button', { name: 'Novo post' }).click()
    await page.getByRole('textbox', { name: 'Título', exact: true }).fill(title)
    const editor = page.getByRole('textbox', { name: 'Conteúdo' })
    await editor.click()
    await page.keyboard.type('Texto da colheita cooperativa com palavras suficientes para a contagem.')
    await page.getByRole('button', { name: 'H2' }).click()
    await page.keyboard.type('Um subtítulo')
    await page.getByLabel('Enviar imagem do conteúdo').setInputFiles({ name: 'ponto.png', mimeType: 'image/png', buffer: PNG_1PX })
    await expect(page.locator('.blog-editor img')).toBeVisible()
    await page.getByLabel('Resumo').fill('Resumo da safra de teste')
    await page.getByLabel('Slug').fill(`safra-${RUN}`)
    await page.getByLabel('Visibilidade').selectOption('members')
    await page.getByLabel('Marcar como destaque').check()
    await page.getByRole('checkbox', { name: tag, exact: true }).check()
    await page.getByText('SEO e redes').click()
    await page.getByLabel('Título para o Google').fill('Safra SEO')
    await page.getByLabel('Descrição para o Google').fill('Descrição SEO da safra')
    await page.getByLabel('Título Open Graph').fill('OG Safra')
    await page.getByLabel('Descrição Open Graph').fill('OG descrição')
    await page.getByLabel('Título do Twitter').fill('Twitter Safra')
    await page.getByLabel('URL canônica').fill(`https://example.com/safra-${RUN}`)
    await expect(page.locator('.blog-count')).toContainText('palavra')

    await page.getByRole('button', { name: 'Pré-visualizar' }).click()
    await expect(page.frameLocator('iframe[title="Pré-visualização"]').getByText(/Texto da colheita/)).toBeVisible()
    await page.getByRole('button', { name: 'Fechar pré-visualização' }).click()

    await page.getByRole('button', { name: 'Salvar rascunho' }).click()
    await expect(page.locator('.blog-save-state')).toHaveText('Salvo')

    await page.getByRole('button', { name: 'Voltar' }).click()
    await page.getByLabel('Buscar no blog').fill(title)
    await page.getByLabel('Status').selectOption('draft')
    const row = await article(page, title)
    await expect(row.getByText('Rascunho')).toBeVisible()
    await page.getByLabel('Status').selectOption('all')
    await row.getByRole('button', { name: 'Subir' }).click()
    await expect(row.getByText('Publicado')).toBeVisible()
    await row.getByRole('button', { name: 'Derrubar' }).click()
    await expect(row.getByText('Rascunho')).toBeVisible()

    await row.getByRole('button', { name: 'Editar' }).click()
    await page.getByLabel('Data de publicação').fill(futureLocal())
    await page.getByRole('button', { name: 'Agendar' }).click()
    await expect(page.locator('.blog-status--scheduled')).toBeVisible()

    await page.getByRole('button', { name: 'Duplicar' }).click()
    await expect(page.getByRole('textbox', { name: 'Título', exact: true })).toHaveValue(/cópia|copy/i)
    await page.getByRole('button', { name: 'Excluir' }).click()
    await page.getByRole('button', { name: 'Confirmar exclusão' }).click()
    await expect(page.getByRole('region', { name: 'Posts' })).toBeVisible()

    const pageTitle = `Página institucional ${RUN}`
    await page.getByRole('button', { name: 'Nova página' }).click()
    await page.getByRole('textbox', { name: 'Título', exact: true }).fill(pageTitle)
    await page.getByRole('textbox', { name: 'Conteúdo' }).click()
    await page.keyboard.type('Conteúdo da página.')
    await page.getByRole('button', { name: 'Salvar rascunho' }).click()
    await expect(page.locator('.blog-save-state')).toHaveText('Salvo')
    await page.getByRole('button', { name: 'Voltar' }).click()
    await page.getByLabel('Buscar no blog').fill(pageTitle)
    await expect(await article(page, pageTitle)).toBeVisible()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByLabel('Selecionar todos').check()
    await page.getByRole('toolbar', { name: 'Ações em massa' }).getByRole('button', { name: 'Excluir' }).click()
    await expect(page.getByRole('article', { name: pageTitle })).toHaveCount(0)
  })

  test('conflito de updated_at volta 409', async () => {
    const token = await apiLogin()
    const created = await blogApi<any>(token, 'POST', '/posts', {
      resource: 'post',
      title: `Conflito ${RUN}`,
      html: '<p>versão inicial</p>',
      status: 'draft',
    })
    expect(created.status).toBeLessThan(300)
    const id = created.data.id as string
    const updatedAt = created.data.updatedAt as string
    await sleep(1500)
    const first = await blogApi(token, 'PUT', `/posts/${id}`, { resource: 'post', title: 'Conflito A', html: '<p>b</p>', updatedAt })
    expect(first.status).toBeLessThan(300)
    const second = await blogApi(token, 'PUT', `/posts/${id}`, { resource: 'post', title: 'Conflito B', updatedAt })
    expect(second.status).toBe(409)
    await blogApi(token, 'DELETE', `/posts/${id}?resource=post`)
  })

  test('upload de imagem pela API', async () => {
    const token = await apiLogin()
    const body = new FormData()
    body.append('file', new Blob([PNG_1PX], { type: 'image/png' }), 'ponto.png')
    const response = await fetch(`${API}/root/blog/images`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body,
    })
    expect(response.status).toBeLessThan(300)
    const json = (await response.json()) as { data: { url: string } }
    expect(json.data.url).toContain('/content/images/')
  })
})

test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('cria um rascunho na tela estreita', async ({ page }) => {
    await openBlog(page)
    await page.getByRole('button', { name: 'Novo post' }).click()
    await page.getByRole('textbox', { name: 'Título', exact: true }).fill(`Post no celular ${RUN}`)
    await page.getByRole('textbox', { name: 'Conteúdo' }).click()
    await page.keyboard.type('Escrito no celular.')
    await page.getByRole('button', { name: 'Salvar rascunho' }).click()
    await expect(page.locator('.blog-save-state')).toHaveText('Salvo')
    await expect(page.getByRole('button', { name: 'Subir' })).toBeVisible()
  })
})
