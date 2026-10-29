# Blog no painel (Ghost)

O super administrador gerencia o blog da RedeCoop em `/admin/blog`. O Ghost continua sendo o CMS: o painel cria, edita, publica, derruba, agenda, duplica e apaga posts e páginas pela **Admin API**. O navegador nunca recebe a Admin API key.

Cooperativa, motorista e visitante recebem 403. Sem sessão, a API responde 401.

## Variáveis

| Variável | Obrigatória | Função |
| --- | --- | --- |
| `GHOST_ADMIN_URL` | Para usar o Ghost sem preencher o painel | Origem do site, por exemplo `https://blog.redecooprs.com.br`. Sem barra no final e sem `/ghost`. |
| `GHOST_ADMIN_API_KEY` | Idem | Chave `id:secret` da Custom Integration. |
| `GHOST_ENCRYPTION_KEY` | Só para gravar a chave pelo painel | Segredo AES-256-GCM, mínimo de 16 caracteres. Se omitida, vale `MAILBOX_ENCRYPTION_KEY`. |
| `GHOST_API_VERSION` | Não | `Accept-Version` enviado ao Ghost. Padrão `v6.0` (o Ghost 5 ainda aceita). |
| `GHOST_TIMEOUT_MS` | Não | Timeout de cada request. Padrão `20000`. |

A URL salva no painel tem prioridade sobre `GHOST_ADMIN_URL`. A chave salva (cifrada) tem prioridade sobre `GHOST_ADMIN_API_KEY`. Dá para combinar: URL no banco e chave no ambiente, ou o contrário.

## Custom Integration no Ghost

1. Acesse o Ghost Admin com um usuário Owner ou Administrator: `https://seu-blog/ghost/`.
2. Abra **Settings** (ícone de engrenagem).
3. Procure **Integrations** (na busca das configurações, digite “integrations”).
4. Clique em **Add custom integration**.
5. Nome sugerido: `RedeCoop`. Confirme.
6. Na tela da integração, copie **Admin API key**. Ela tem a forma `64caracteresdeid:64caracteresdesegredo`, os dois lados em hexadecimal.
7. Não copie a **Content API key**. Ela só lê conteúdo público e não serve para publicar.
8. Copie também a **API URL** (a origem do site). É o valor de `GHOST_ADMIN_URL`.

Se a chave vazar, volte na mesma tela e gere outra. Atualize a variável ou o campo no painel.

## No painel

1. Rode a migration: `npm run migration:run` (tabela `ghost_connection`).
2. Entre como `ADMIN` e abra **Blog** (também há um atalho no topo, ao lado do e-mail).
3. Em **Conexão**, cole a URL e a Admin API key. **Testar conexão** chama o Ghost sem gravar. **Salvar conexão** só grava depois que o Ghost responde. A chave é cifrada; a API devolve no máximo `••••` e os 4 últimos caracteres.
4. **Remover conexão salva** apaga a linha do banco. Se `GHOST_ADMIN_URL` e `GHOST_ADMIN_API_KEY` existirem, o blog continua funcionando por elas.

## O que dá para fazer

- Posts e páginas: criar, editar, duplicar, excluir.
- **Subir** publica. Se a data de publicação estiver no futuro, o mesmo botão vira **Agendar** e o Ghost recebe `status: scheduled`.
- **Derrubar** volta o conteúdo para rascunho.
- Lista com busca (título, slug ou resumo), filtro por status, tag e autor, ordenação e paginação.
- Ações em massa: subir, derrubar, excluir.
- Tags: criar, renomear, excluir.
- Autores vindos dos usuários do Ghost.
- Resumo, slug, visibilidade (público, membros, pagantes), destaque, data, imagem de destaque.
- SEO: meta title, meta description, URL canônica, Open Graph e Twitter.
- Editor com títulos, listas, citação, código, link, imagem (enviada ao Ghost), vídeo (YouTube/Vimeo), callout, tabela, negrito, itálico, sublinhado e riscado.
- O Ghost 5 e 6 guardam o corpo em **Lexical**. O painel só manda HTML (`source=html`) quando o texto do editor muda; salvar título, SEO, tags ou status não reconverte o post e não perde callouts, galerias, bookmarks e outros cartões.
- Tags e autores são listados página a página (Ghost 6 removeu `?limit=all`, teto 100).
- Rascunho com autosave. Contagem de palavras e tempo de leitura. Pré-visualização local do HTML.
- O painel é em português e a barra de ações permanece acessível no celular.

## Conflito de versão

Toda alteração manda o `updated_at` que o Ghost devolveu. Se alguém (ou outro autosave) mudou o post nesse meio tempo, o Ghost responde 409. A API traduz isso para uma mensagem em português e **não** sobrescreve. No editor aparece o aviso **Recarregar**, que busca a versão atual e descarta o texto local que ainda não foi aceito.

Um 401 do Ghost (chave recusada) vira erro 400 da nossa API. Assim o painel não trata o problema como sessão expirada.

## Testes

```bash
cd api-redecoop && npx jest src/blog
```

O workflow `.github/workflows/blog.yml` sobe `ghost:5-alpine` e `ghost:6-alpine` (matriz) com SQLite (`NODE_ENV=development`, exigência do Ghost para não usar MySQL), desliga a verificação de dispositivo por e-mail (`security__staffDeviceVerification=false`, senão o login do teste quebra sem SMTP) e roda o Playwright em `e2e/tests/blog`. O script `e2e/scripts/ghost-setup.mjs` completa o setup do owner e cria a Custom Integration. A suíte inclui um post Lexical rico (callout, código, bookmark, HTML, markdown) e confirma que salvar só o título não destrói esses cartões. A suíte de e-mail ignora esses testes; a do blog não sobe o servidor de e-mail.
