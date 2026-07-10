export const environment = {
  production: import.meta.env.PROD,
  api: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  ws: import.meta.env.VITE_WS_URL ?? 'http://localhost:3000',
  storageUrl: import.meta.env.VITE_STORAGE_URL ?? 'http://localhost:3000/storage/',
  websiteUrl: import.meta.env.VITE_WEBSITE_URL ?? 'http://localhost:5173',
  dashboardUrl: import.meta.env.VITE_DASHBOARD_URL ?? 'http://localhost:5174',
}
