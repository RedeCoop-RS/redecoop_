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

## Instalação

```bash
npm install
```

## Configuração

Crie um arquivo `.env` baseado no `.env.example` com as variáveis de ambiente necessárias, como conexão com banco de dados, tokens de mapas, e-mail, etc.

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