import { expect, test } from '@playwright/test'
import { RUN } from '../helpers'
import { apiLogin, blogApi, openBlog } from './helpers'
import { ghostAdmin, lexicalTypes, seedLexicalPost } from './ghost-direct'

test.describe('Lexical do Ghost', () => {
  test('abre e salva um post rico sem perder cartões nativos', async ({ page }) => {
    const title = `Lexical rico ${RUN}`
    const seeded = await seedLexicalPost(title)
    const before = lexicalTypes(seeded.lexical)
    expect(before).toEqual(expect.arrayContaining([
      'callout',
      'codeblock',
      'bookmark',
      'html',
      'markdown',
      'toggle',
      'horizontalrule',
    ]))

    await openBlog(page)
    await page.getByLabel('Buscar no blog').fill(title)
    await page.getByRole('article', { name: title }).getByRole('button', { name: 'Editar' }).click()
    await expect(page.getByRole('textbox', { name: 'Título', exact: true })).toHaveValue(title)
    await expect(page.getByText(/guarda o texto em Lexical/)).toBeVisible()
    await page.getByRole('textbox', { name: 'Título', exact: true }).fill(`${title} (meta)`)
    await page.getByLabel('Resumo').fill('Resumo sem tocar no corpo Lexical')
    await page.getByRole('button', { name: 'Salvar rascunho' }).click()
    await expect(page.locator('.blog-save-state')).toHaveText('Salvo')

    const stored = await ghostAdmin<any>('GET', `posts/${seeded.id}/`, undefined, {
      formats: 'html,plaintext,lexical',
    })
    expect(stored.status).toBeLessThan(300)
    const post = stored.data?.posts?.[0]
    expect(post.title).toBe(`${title} (meta)`)
    expect(post.custom_excerpt).toBe('Resumo sem tocar no corpo Lexical')
    const after = lexicalTypes(post.lexical)
    for (const type of ['callout', 'codeblock', 'bookmark', 'html', 'markdown', 'toggle', 'horizontalrule']) {
      expect(after, `cartão ${type} deveria permanecer`).toContain(type)
    }
    expect(JSON.stringify(post.lexical)).toContain('Intercooperação na prática')
    expect(JSON.stringify(post.lexical)).toContain('const leite = true;')
    expect(JSON.stringify(post.lexical)).toContain('redecoop-html-card')

    const token = await apiLogin()
    const viaApi = await blogApi<any>(token, 'PUT', `/posts/${seeded.id}`, {
      resource: 'post',
      title: `${title} (api)`,
      updatedAt: post.updated_at,
    })
    expect(viaApi.status).toBeLessThan(300)
    const again = await ghostAdmin<any>('GET', `posts/${seeded.id}/`)
    expect(lexicalTypes(again.data?.posts?.[0]?.lexical)).toEqual(expect.arrayContaining(after))

    await blogApi(token, 'DELETE', `/posts/${seeded.id}?resource=post`)
  })
})
