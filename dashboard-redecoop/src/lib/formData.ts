export function objectToFormData(
  obj: Record<string, unknown>,
  excludeKeys: string[] = [],
): FormData {
  const formData = new FormData()

  Object.entries(obj).forEach(([key, value]) => {
    if (excludeKeys.includes(key) || value === undefined || value === null) return

    if (value instanceof File) {
      formData.append(key, value)
    } else if (value instanceof FileList) {
      Array.from(value).forEach((file) => formData.append(key, file))
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          Object.entries(item).forEach(([subKey, subVal]) => {
            formData.append(`${key}[${index}][${subKey}]`, String(subVal ?? ''))
          })
        } else {
          formData.append(`${key}[${index}]`, String(item))
        }
      })
    } else {
      formData.append(key, String(value))
    }
  })

  return formData
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') search.set(k, String(v))
  })
  const q = search.toString()
  return q ? `?${q}` : ''
}
