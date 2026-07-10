import { apiFetchData } from '@/lib/api'
import type { ProductCategory, ProductType } from '@/types'

export const productService = {
  async getCategories(): Promise<ProductCategory[]> {
    const data = await apiFetchData<ProductCategory[] | { data: ProductCategory[] }>(
      '/public/product-category/list',
    )
    return Array.isArray(data) ? data : data.data ?? []
  },

  async getTypes(): Promise<ProductType[]> {
    const data = await apiFetchData<ProductType[] | { data: ProductType[] }>(
      '/public/product-type/list',
    )
    return Array.isArray(data) ? data : data.data ?? []
  },
}
