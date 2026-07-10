# App Motorista RedeCoop (React)

App mobile do motorista — login, viagens ativas/concluídas e registro de paradas.

## Stack

- React 19 + Vite + TypeScript
- React Router 7
- Mesma identidade visual do `app-motorista-redecoop` (Angular)

## Desenvolvimento local

```bash
npm install
npm run dev
```

Abre em **http://localhost:5175**

### Pré-requisitos

1. API rodando em `http://localhost:3000` (`api-redecoop`)
2. MySQL local com as credenciais do `.env` (ver `api-redecoop/.env.example`)
3. Usuário com role **DRIVER** para login (CPF + senha)

## Variáveis de ambiente

Copie `.env.example` para `.env` (mesmo padrão do `dashboard-redecoop-new`). Para stack local, descomente o bloco `localhost` e comente o de produção.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (porta 5175) |
| `npm run dev:fresh` | Mata processo na 5175 e inicia de novo |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
