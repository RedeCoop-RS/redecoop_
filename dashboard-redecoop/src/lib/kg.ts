export function formatKg(weight?: number | null) {
  const value = weight ?? 0
  if (value >= 1000) {
    const toneladas = value / 1000
    return `${toneladas}Ton`
  }
  if (value >= 1) {
    const quilogramas = Math.round(value)
    return quilogramas === 1 ? '1kg' : `${quilogramas}kg`
  }
  if (value > 0) {
    const gramas = Math.round(value * 1000)
    return gramas === 1 ? '1G' : `${gramas}G`
  }
  return '0G'
}

export type CollectiveProduct = { productName?: string; weight?: number }

export function parseCollectiveProducts(products: unknown): CollectiveProduct[] {
  if (!products) return []
  if (typeof products === 'string') {
    try {
      const parsed = JSON.parse(products) as unknown
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return Array.isArray(products) ? products : []
}
