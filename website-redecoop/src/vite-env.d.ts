/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_STORAGE_URL?: string
  readonly VITE_SITE_URL?: string
  readonly VITE_DASHBOARD_URL?: string
  readonly VITE_GHOST_URL?: string
  readonly VITE_GHOST_API_KEY?: string
  readonly VITE_GA_MEASUREMENT_ID?: string
  readonly VITE_SITE_ANALYTICS?: string
  readonly VITE_CONTACT_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
