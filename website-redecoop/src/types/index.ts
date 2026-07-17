export type CooperativeType = 'CENTRAL' | 'SINGULAR'

export interface State {
  id: number
  name: string
  abbreviation: string
}

export interface City {
  id: number
  name: string
  stateId: number
  state?: State
  latitude?: number | string
  longitude?: number | string
}

export interface Cooperative {
  id: number
  userId: number
  companyName: string
  fantasyName: string
  email: string
  description?: string
  cnpj?: string
  website?: string
  phone?: string
  instagram?: string
  facebook?: string
  street?: string
  cep?: string
  number?: string
  cityId?: number
  neighborhood?: string
  complement?: string
  img?: string
  active: boolean
  maleAssociates?: number
  femaleAssociates?: number
  city?: City
}

export interface CooperativeSummary {
  id: number
  companyName: string
  fantasyName: string
  selectLabel?: string
  img?: string
  city?: City
  type: CooperativeType
  description?: string
  cnpj?: string
  cooperativeDeliveryCities?: City[]
}

export interface UserData {
  role: 'ADMIN' | 'COOPERATIVE' | 'DRIVER' | 'VISITANT'
  visitant?: { id: number; name: string; email: string }
  cooperative?: Cooperative
  redirectUrl?: string
}

export interface LoginResponse {
  status: boolean
  message: string
  data: {
    token: string
    role: string
    userData: UserData
    redirectUrl?: string
  }
}

export interface RegisterVisitant {
  email: string
  password: string
  name: string
  phone: string
  address: string
  cep: string
  number: string
  cityId: number
  neighborhood: string
  type?: 'PRIVADO' | 'PUBLICO'
}

export interface ProductCategory {
  id: number
  name: string
}

export interface ProductType {
  id: number
  name: string
}

export interface PublicCatalogProduct {
  catalogId: number
  cooperativeId: number
  cooperativeDisplayName: string
  productId: number
  productName: string
  img?: string
  productCategory?: string | ProductCategory
  productType?: string | ProductType
  productCategoryId: number
  productTypeId: number
  hasSeasonality: boolean
  highEstimate?: number
  mediumEstimate?: number
  lowEstimate?: number
  seasonalities: { month: number; seasonality: string }[]
}

export interface CatalogListMeta {
  total?: number
  page?: number
  limit?: number
  totalPages: number
  totalItems?: number
  currentPage?: number
  itemsPerPage?: number
}

export interface GhostTag {
  id: string
  name: string
  slug: string
}

export interface GhostAuthor {
  id: string
  name: string
  slug: string
  profile_image?: string
}

export interface GhostPost {
  id: string
  uuid: string
  title: string
  slug: string
  html: string
  excerpt?: string
  custom_excerpt?: string
  feature_image?: string
  feature_image_alt?: string
  published_at: string
  updated_at: string
  reading_time?: number
  tags?: GhostTag[]
  authors?: GhostAuthor[]
  meta_title?: string
  meta_description?: string
  og_title?: string
  og_description?: string
  og_image?: string
  twitter_title?: string
  twitter_description?: string
  twitter_image?: string
}

export interface TakePartForm {
  name: string
  email: string
  phone: string
  address: string
  cnpj: string
}

export interface ContactForm {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}
