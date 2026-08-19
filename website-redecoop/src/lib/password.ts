/** Mesma regra da API (register / password-reset). */
export const PASSWORD_REGEX =
  /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/

export type PasswordChecks = {
  minLength: boolean
  maxLength: boolean
  lower: boolean
  upper: boolean
  numberOrSymbol: boolean
}

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: password.length >= 6,
    maxLength: password.length > 0 && password.length <= 20,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    numberOrSymbol: /\d/.test(password) || /\W/.test(password),
  }
}

export function isPasswordValid(password: string): boolean {
  if (password.length < 6 || password.length > 20) return false
  return PASSWORD_REGEX.test(password)
}

export function getPasswordStrength(password: string): {
  score: number
  label: 'Fraca' | 'Média' | 'Forte' | ''
} {
  if (!password) return { score: 0, label: '' }

  const checks = getPasswordChecks(password)
  const met = [
    checks.minLength,
    checks.lower,
    checks.upper,
    checks.numberOrSymbol,
    password.length >= 10,
    /\d/.test(password) && /\W/.test(password),
  ].filter(Boolean).length

  if (met <= 2) return { score: 1, label: 'Fraca' }
  if (met <= 4) return { score: 2, label: 'Média' }
  return { score: 3, label: 'Forte' }
}
