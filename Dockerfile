# ── Imagem única REDECOOP: API + 3 frontends (4 containers no compose) ──

# ── API (NestJS) ──
FROM node:20-alpine AS api-builder
# bcrypt is a native addon: if GitHub prebuilds are unreachable, node-gyp
# compiles from source (needs python3/make/g++).
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY api-redecoop/package.json api-redecoop/package-lock.json ./
RUN npm ci
COPY api-redecoop/ .
RUN npm run build
RUN npm prune --omit=dev

# ── Website ──
# URLs HTTPS entram no bundle no build — sem HTTP/IP (Mixed Content no browser)
FROM node:20-alpine AS website-builder
WORKDIR /app
ARG VITE_API_URL=https://api.redecooprs.com.br/api
ARG VITE_STORAGE_URL=https://api.redecooprs.com.br/storage/
ARG VITE_SITE_URL=https://redecooprs.com.br
ARG VITE_DASHBOARD_URL=https://dashboard.redecooprs.com.br
ARG VITE_GHOST_URL=https://redecooprs.com.br
ARG VITE_GHOST_API_KEY=0cd73f92f827f0cfa64be9919d
ARG VITE_GA_MEASUREMENT_ID=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_STORAGE_URL=$VITE_STORAGE_URL \
    VITE_SITE_URL=$VITE_SITE_URL \
    VITE_DASHBOARD_URL=$VITE_DASHBOARD_URL \
    VITE_GHOST_URL=$VITE_GHOST_URL \
    VITE_GHOST_API_KEY=$VITE_GHOST_API_KEY \
    VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID
COPY website-redecoop/package.json website-redecoop/package-lock.json ./
RUN npm ci
COPY website-redecoop/ .
RUN npm run build

# ── Dashboard ──
FROM node:20-alpine AS dashboard-builder
WORKDIR /app
ARG VITE_API_URL=https://api.redecooprs.com.br/api
ARG VITE_WS_URL=https://api.redecooprs.com.br
ARG VITE_STORAGE_URL=https://api.redecooprs.com.br/storage/
ARG VITE_WEBSITE_URL=https://redecooprs.com.br
ARG VITE_DASHBOARD_URL=https://dashboard.redecooprs.com.br
ENV VITE_API_URL=$VITE_API_URL \
    VITE_WS_URL=$VITE_WS_URL \
    VITE_STORAGE_URL=$VITE_STORAGE_URL \
    VITE_WEBSITE_URL=$VITE_WEBSITE_URL \
    VITE_DASHBOARD_URL=$VITE_DASHBOARD_URL
COPY dashboard-redecoop/package.json dashboard-redecoop/package-lock.json ./
RUN npm ci
COPY dashboard-redecoop/ .
RUN npm run build

# ── App Motorista ──
FROM node:20-alpine AS app-motorista-builder
WORKDIR /app
ARG VITE_API_URL=https://api.redecooprs.com.br/api
ARG VITE_WS_URL=https://api.redecooprs.com.br
ARG VITE_STORAGE_URL=https://api.redecooprs.com.br/storage/
ARG VITE_WEBSITE_URL=https://redecooprs.com.br
ARG VITE_DASHBOARD_URL=https://dashboard.redecooprs.com.br
ENV VITE_API_URL=$VITE_API_URL \
    VITE_WS_URL=$VITE_WS_URL \
    VITE_STORAGE_URL=$VITE_STORAGE_URL \
    VITE_WEBSITE_URL=$VITE_WEBSITE_URL \
    VITE_DASHBOARD_URL=$VITE_DASHBOARD_URL
COPY app-motorista-redecoop/package.json app-motorista-redecoop/package-lock.json ./
RUN npm ci
COPY app-motorista-redecoop/ .
RUN npm run build

# ── Produção (Node + Nginx + artefatos dos 4 apps) ──
FROM node:20-alpine AS production

RUN apk add --no-cache nginx wget \
    && mkdir -p /var/lib/nginx/tmp/client_body /var/lib/nginx/logs /tmp/client_body

WORKDIR /app/api
COPY --from=api-builder /app/package.json /app/package-lock.json ./
COPY --from=api-builder /app/node_modules ./node_modules
COPY --from=api-builder /app/dist ./dist
RUN mkdir -p upload logs

COPY --from=website-builder /app/dist /var/www/website
COPY --from=dashboard-builder /app/dist /var/www/dashboard
COPY --from=app-motorista-builder /app/dist /var/www/app-motorista

COPY docker/nginx/ /etc/nginx/frontends/
COPY docker/nginx-entrypoint.sh /docker-entrypoint-nginx.sh
RUN sed -i 's/\r$//' /docker-entrypoint-nginx.sh && chmod +x /docker-entrypoint-nginx.sh

ENV NODE_ENV=production
