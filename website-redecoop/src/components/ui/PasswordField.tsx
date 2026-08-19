import { Check, Circle } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import {
  getPasswordChecks,
  getPasswordStrength,
  type PasswordChecks,
} from '@/lib/password'

const REQUIREMENTS: { key: keyof PasswordChecks; label: string }[] = [
  { key: 'minLength', label: 'Pelo menos 6 caracteres' },
  { key: 'upper', label: 'Uma letra maiúscula' },
  { key: 'lower', label: 'Uma letra minúscula' },
  { key: 'numberOrSymbol', label: 'Um número ou símbolo (!@#…)' },
]

type PasswordFieldProps = {
  label?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  id?: string
  autoComplete?: string
  showHints?: boolean
}

export function PasswordField({
  label = 'Senha',
  value,
  onChange,
  required,
  id,
  autoComplete = 'new-password',
  showHints = true,
}: PasswordFieldProps) {
  const checks = getPasswordChecks(value)
  const { score, label: strengthLabel } = getPasswordStrength(value)
  const active = value.length > 0

  const barColor =
    score <= 1 ? 'bg-red' : score === 2 ? 'bg-amber-500' : 'bg-green'
  const textColor =
    score <= 1 ? 'text-red' : score === 2 ? 'text-amber-600' : 'text-green'

  return (
    <div className="space-y-2.5">
      <Input
        id={id}
        label={label}
        type="password"
        required={required}
        minLength={6}
        maxLength={20}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      {showHints && active && (
        <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 py-3 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-grey-dark">
                Força da senha
              </span>
              <span className={`text-xs font-semibold ${textColor}`}>
                {strengthLabel}
              </span>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    score >= step ? barColor : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <ul className="space-y-1.5">
            {REQUIREMENTS.map(({ key, label: reqLabel }) => {
              const ok = checks[key]
              return (
                <li
                  key={key}
                  className={`flex items-center gap-2 text-xs transition-colors ${
                    ok ? 'text-green' : 'text-grey'
                  }`}
                >
                  {ok ? (
                    <Check size={14} className="shrink-0" strokeWidth={2.5} />
                  ) : (
                    <Circle size={14} className="shrink-0 opacity-50" strokeWidth={2} />
                  )}
                  <span>{reqLabel}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
