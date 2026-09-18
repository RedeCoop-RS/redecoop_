export const environment = {
  production: import.meta.env.PROD,
  api:
    import.meta.env.VITE_API_URL ??
    (import.meta.env.DEV ? 'http://localhost:3000/api' : 'https://api.redecooprs.com.br/api'),
  storageUrl:
    import.meta.env.VITE_STORAGE_URL ??
    (import.meta.env.DEV ? 'http://localhost:3000/storage/' : 'https://api.redecooprs.com.br/storage/'),
  siteUrl: import.meta.env.VITE_SITE_URL ?? 'https://redecooprs.com.br',
  dashboardUrl: import.meta.env.VITE_DASHBOARD_URL ?? '',
  ghostUrl: import.meta.env.VITE_GHOST_URL ?? 'https://redecooprs.com.br',
  ghostApiKey: import.meta.env.VITE_GHOST_API_KEY || '0cd73f92f827f0cfa64be9919d',
  /** GA4 Measurement ID (G-…). Vazio = analytics desligado. */
  gaMeasurementId: import.meta.env.VITE_GA_MEASUREMENT_ID ?? '',
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL ?? 'contato@redecooprs.com.br',
}
