export const environment = {
  production: import.meta.env.PROD,
  api: import.meta.env.VITE_API_URL ?? 'https://api.redecooprs.com.br/api',
  storageUrl: import.meta.env.VITE_STORAGE_URL ?? 'https://api.redecooprs.com.br/storage/',
  siteUrl: import.meta.env.VITE_SITE_URL ?? 'https://redecooprs.com.br',
  dashboardUrl: import.meta.env.VITE_DASHBOARD_URL ?? '',
  ghostUrl: import.meta.env.VITE_GHOST_URL ?? 'https://redecooprs.com.br',
  ghostApiKey: import.meta.env.VITE_GHOST_API_KEY ?? '0cd73f92f827f0cfa64be9919d',
}
