export function formatCpf(value?: string) {
  const digits = (value ?? '').replace(/\D/g, '')
  if (digits.length !== 11) return value?.trim() || '—'
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

export function formatPhone(value?: string) {
  const digits = (value ?? '').replace(/\D/g, '')
  if (digits.length === 11) return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  if (digits.length === 10) return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  return value?.trim() || '—'
}

export function formatBloodType(value?: string) {
  const map: Record<string, string> = {
    A_POS: 'A+',
    A_NEG: 'A-',
    B_POS: 'B+',
    B_NEG: 'B-',
    AB_POS: 'AB+',
    AB_NEG: 'AB-',
    O_POS: 'O+',
    O_NEG: 'O-',
  }
  if (!value) return '—'
  return map[value] ?? value
}

export function formatDateBr(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('pt-BR')
}

export function driverImage(driver: { img?: string; picture?: string }) {
  return driver.img ?? driver.picture
}

export function vehicleImage(vehicle: { img?: string; picture?: string }) {
  return vehicle.img ?? vehicle.picture
}
