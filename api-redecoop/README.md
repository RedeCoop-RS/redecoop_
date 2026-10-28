<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

# Redecoop Backend

Backend desenvolvido em [NestJS](https://nestjs.com/) para gestão de cooperativas, viagens, motoristas, ofertas de transporte, produtos, relatórios e outros recursos voltados ao ecossistema de transporte cooperativo.

## Funcionalidades

- **Gestão de Cooperativas**: Cadastro, autenticação, atualização de dados e gerenciamento de permissões.
- **Gestão de Motoristas e Veículos**: Cadastro, controle de viagens, CNH, tipos sanguíneos, etc.
- **Viagens e Rotas**: Criação, ajuste de rotas, controle de ofertas, cálculo de taxas e acompanhamento.
- **Ofertas de Viagem**: Propostas, aceitação, rejeição e notificações.
- **Produtos e Catálogo**: Cadastro de produtos, sazonalidade, embalagens e categorias.
- **Relatórios**: Geração de relatórios em Excel sobre viagens, produtos transportados, preços, etc.
- **Notificações**: Sistema de mensagens e notificações para usuários.
- **Mapa e Distâncias**: Integração com Mapbox para cálculo de rotas e distâncias.
- **Usuários e Autenticação**: Login, troca de senha, recuperação de acesso, papéis e permissões.
- **Visitantes**: Solicitação de acesso, envio de mensagens e orçamentos.
- **Administração**: Painel para administração geral do sistema.
- **E-mail do super admin**: cliente IMAP/SMTP no painel (`/admin/email`), exclusivo do papel `ADMIN`.
- **Blog do super admin**: gestão do Ghost (posts, páginas, tags e mídia) no painel (`/admin/blog`), exclusivo do papel `ADMIN`. A Admin API key não sai do servidor.

## Instalação

```bash
npm install
```

## Configuração

Crie um arquivo `.env` baseado no `.env.example` com as variáveis de ambiente necessárias, como conexão com banco de dados, tokens de mapas, e-mail, etc.

### E-mail do super admin

O cliente de e-mail fica em `/admin/email` e só responde para o papel `ADMIN` (super administrador do painel). Cooperativa, motorista e visitante recebem 401/403.

A senha IMAP/SMTP é gravada cifrada (AES-256-GCM) e nunca volta na API. Defina no `.env`:

| Variável | Função |
| --- | --- |
| `MAILBOX_ENCRYPTION_KEY` | Chave da senha da caixa. Mínimo de 16 caracteres. Sem ela a caixa não pode ser salva. |
| `MAILBOX_SYNC_INTERVAL_SECONDS` | Intervalo da sincronização e do IDLE (mínimo 30). |
| `MAILBOX_SYNC_MESSAGE_LIMIT` | Quantidade de mensagens recentes por pasta. |
| `MAILBOX_MAX_ATTACHMENT_BYTES` | Tamanho máximo de cada anexo. |
| `MAILBOX_UPLOAD_DIR` | Pasta privada dos anexos de rascunho (fora de `/storage`). |
| `MAILBOX_TLS_REJECT_UNAUTHORIZED` | `false` apenas para certificado rejeitado pelo Node. |

No painel, abra **E-mail** e use o preset **Hostinger** (padrão): IMAP `imap.hostinger.com:993` SSL/TLS e SMTP `smtp.hostinger.com:465` SSL. O usuário é o e-mail completo. **Testar conexão** valida IMAP e SMTP; **Salvar** só grava depois dessa verificação. O preset **Personalizado** libera host, porta e TLS para outros provedores.

Depois de configurar, rode a migration `npm run migration:run` para criar as tabelas `mailbox_*`.

As variáveis `SMTP_*` continuam valendo só para os e-mails transacionais do sistema (recuperação de senha, contato etc.).

### Blog (Ghost) do super admin

O módulo fica em `/admin/blog` e só responde para o papel `ADMIN`. O navegador fala apenas com `/api/root/blog/*`. A Admin API key do Ghost fica no servidor: ou nas variáveis abaixo, ou cifrada na tabela `ghost_connection` (AES-256-GCM, o mesmo formato da senha da caixa de e-mail).

| Variável | Função |
| --- | --- |
| `GHOST_ADMIN_URL` | Origem do Ghost, sem `/ghost` no final. Ex.: `https://blog.seudominio.com`. |
| `GHOST_ADMIN_API_KEY` | Admin API key no formato `id:secret`, da Custom Integration. Não é a Content API key. |
| `GHOST_ENCRYPTION_KEY` | Chave para gravar a API key no painel. Mínimo de 16 caracteres. Se vazia, usa `MAILBOX_ENCRYPTION_KEY`. |
| `GHOST_API_VERSION` | Cabeçalho `Accept-Version`. Padrão `v5.0`. |
| `GHOST_TIMEOUT_MS` | Tempo limite de cada chamada ao Ghost. Padrão 20000. |

#### Como gerar a Admin API key

1. Entre no Ghost Admin (`https://seu-blog/ghost/`) como owner ou administrador.
2. Abra **Settings** (engrenagem) e busque **Integrations**.
3. Em **Add custom integration**, dê um nome (por exemplo `RedeCoop`).
4. Na integração criada, copie a **Admin API key** (`id` hexadecimal, dois-pontos, `secret` hexadecimal). Não use a Content API key.
5. A **API URL** mostrada na mesma tela é a origem do site. Cole em `GHOST_ADMIN_URL` ou no botão **Conexão** do painel.

No painel, **Blog → Conexão** testa e salva a URL e a chave. A resposta da API nunca inclui a chave, só um final mascarado (`••••abcd`). **Remover conexão salva** apaga a linha do banco; as variáveis de ambiente continuam valendo.

Rode `npm run migration:run` para criar a tabela `ghost_connection`.

O passo a passo e o comportamento de publicar, derrubar, agendar e conflitos de `updated_at` estão em [docs/blog-ghost.md](docs/blog-ghost.md).

## Executando o Projeto

```bash
# Desenvolvimento
npm run start

# Modo watch (hot reload)
npm run start:dev

# Produção
npm run start:prod
```

## Gerenciamento com PM2

```bash
# Iniciar com PM2 (produção)
npm run start:pm2

# Iniciar em modo desenvolvimento com PM2
npm run start:pm2:dev

# Parar a aplicação no PM2
npm run stop:pm2

# Reiniciar a aplicação no PM2
npm run restart:pm2

# Deletar a aplicação do PM2
npm run delete:pm2

# Ver logs da aplicação no PM2
npm run logs:pm2
```

## Migrations e Seeds

```bash
# Criar uma nova migration
npm run migration:create

# Gerar migration baseada nas alterações das entidades
npm run migration:generate

# Executar as migrations
npm run migration:run

# Sincronizar o schema do banco de dados
npm run schema:sync

# Limpar cache do TypeORM
npm run typeorm:cache

# Rodar seeds em desenvolvimento
npm run seed:dev

# Rodar seeds em produção
npm run seed:prod
```

## Testes

```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

# Cobertura de testes
npm run test:cov
```

## Estrutura dos Principais Módulos

- `src/app.module.ts`: Módulo principal da aplicação.
- `src/auth/`: Autenticação, login, recuperação de senha.
- `src/cooperative/`: Gestão de cooperativas.
- `src/driver/`: Motoristas e viagens.
- `src/travel/`: Viagens, rotas e controle de status.
- `src/travelOffer/`: Ofertas de viagem e propostas.
- `src/report/`: Relatórios e exportação de dados.
- `src/maps/`: Integração com Mapbox para rotas e distâncias.
- `src/visitant/`: Visitantes, solicitações e contato.
- `src/mailbox/`: E-mail IMAP/SMTP do super admin.
- `src/blog/`: Blog Ghost do super admin (Admin API no servidor).
- `src/_common/`: Utilitários, configurações globais, guards, interceptors, etc.

## Documentação da API

Após rodar o projeto, acesse a documentação Swagger em:

```
http://localhost:3000/docs
```

## Banco de Dados e Seeds

O projeto utiliza TypeORM. Seeds para popular dados iniciais estão em `src/_common/database/seeds/`.

## Docker

O projeto possui suporte a Docker. Utilize o `Dockerfile` e `docker-compose.yml` para facilitar o deploy.


---

© Redecoop - Todos os direitos reservados.