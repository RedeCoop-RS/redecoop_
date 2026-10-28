export type MailPresetId = 'hostinger' | 'gmail' | 'zoho' | 'custom'

export interface MailPreset {
  id: Exclude<MailPresetId, 'custom'>
  label: string
  hint: string
  imapHost: string
  imapPort: number
  imapSecure: boolean
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  usernameIsEmail: boolean
}

export const MAIL_PRESETS: MailPreset[] = [
  {
    id: 'hostinger',
    label: 'Hostinger',
    hint: 'Padrão da RedeCoop. O usuário é o e-mail completo da caixa.',
    imapHost: 'imap.hostinger.com',
    imapPort: 993,
    imapSecure: true,
    smtpHost: 'smtp.hostinger.com',
    smtpPort: 465,
    smtpSecure: true,
    usernameIsEmail: true,
  },
  {
    id: 'gmail',
    label: 'Gmail',
    hint: 'Ative o IMAP e use uma senha de app do Google.',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapSecure: true,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpSecure: true,
    usernameIsEmail: true,
  },
  {
    id: 'zoho',
    label: 'Zoho',
    hint: 'Em contas com verificação em duas etapas, use uma senha de aplicativo.',
    imapHost: 'imap.zoho.com',
    imapPort: 993,
    imapSecure: true,
    smtpHost: 'smtp.zoho.com',
    smtpPort: 465,
    smtpSecure: true,
    usernameIsEmail: true,
  },
]

export const DEFAULT_MAIL_PRESET: MailPresetId = 'hostinger'

export function presetById(id: MailPresetId) {
  return MAIL_PRESETS.find((preset) => preset.id === id) ?? null
}

export function detectPreset(input: {
  imapHost?: string
  imapPort?: number
  imapSecure?: boolean
  smtpHost?: string
  smtpPort?: number
  smtpSecure?: boolean
}): MailPresetId {
  const match = MAIL_PRESETS.find(
    (preset) =>
      preset.imapHost === input.imapHost &&
      preset.imapPort === input.imapPort &&
      preset.imapSecure === input.imapSecure &&
      preset.smtpHost === input.smtpHost &&
      preset.smtpPort === input.smtpPort &&
      preset.smtpSecure === input.smtpSecure,
  )
  return match?.id ?? 'custom'
}
