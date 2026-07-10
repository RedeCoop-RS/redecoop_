export enum UserRole {
  ADMIN = 'ADMIN',
  COOPERATIVE = 'COOPERATIVE',
  DRIVER = 'DRIVER',
  VISITANT = 'VISITANT',
}

export enum MessageStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

export enum BusinessStatus {
  Negotiating = 'negotiating',
  Confirmed = 'confirmed',
  Done = 'done',
  Canceled = 'canceled',
}

export enum BusinessType {
  CC = 'CC',
  BN = 'BN',
  V = 'V',
}

export enum CooperativeType {
  CENTRAL = 'CENTRAL',
  SINGULAR = 'SINGULAR',
}

export interface Cooperative {
  id: number
  name?: string
  companyName?: string
  fantasyName?: string
  email?: string
  phone?: string
  picture?: string
  img?: string
  active?: boolean
  description?: string
  cnpj?: string
  website?: string
  street?: string
  cep?: string
  number?: string
  neighborhood?: string
  complement?: string
  instagram?: string
  facebook?: string
  cityId?: number
  city?: {
    id?: number
    name: string
    stateId?: number
    corede?: string
    functional_region?: string
    state?: { id?: number; name?: string; abbreviation?: string }
  }
  user?: { username?: string }
  maleAssociates?: number
  femaleAssociates?: number
  youngAssociates?: number
  totalAssociates?: number
  type?: CooperativeType
  DAP?: string
  cooperativeDeliveryCities?: {
    id: number
    name: string
    stateId?: number
    corede?: string
    functional_region?: string
  }[]
  totalDebits?: number
}

export interface User {
  id: number
  username: string
  role: UserRole
  cooperative?: Cooperative
}

export interface AuthResponse {
  user: User
  token: string
}

export interface GraphData {
  categories: string[]
  data: number[] | { name: string; y: number }[]
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page?: number
  limit?: number
}

export interface SelectOption {
  id: number
  name: string
}

export interface Notification {
  id: number
  message: string
  read: boolean
  createdAt: string
  type?: 'new_message' | 'business_desk' | 'collective_purchase' | 'travel_offer' | string
}

export interface Product {
  id: number
  name: string
  img?: string
  productTypeId?: number
  productCategoryId?: number
  category?: { id: number; name: string }
  type?: { id: number; name: string }
  productCategory?: { id: number; name: string }
  productType?: { id: number; name: string }
}

export type SeasonalityLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'

export interface CatalogSeasonality {
  id?: number
  month: number
  seasonality: SeasonalityLevel
}

export interface CatalogPackagingDetails {
  id?: number
  info?: string
  packagingId?: number
  weight?: number
}

export interface CatalogProduct {
  id: number
  name?: string
  img?: string
  customImage?: string | null
  productId?: number
  product?: Product & {
    productType?: { name?: string }
    productCategory?: { name?: string }
  }
  type?: { name?: string }
  category?: { name?: string }
  hasSeasonality?: boolean
  seasonalities?: CatalogSeasonality[]
  highEstimate?: number
  mediumEstimate?: number
  lowEstimate?: number
  hasPrimaryPackaging?: boolean
  hasSecondaryPackaging?: boolean
  primaryPackagingDetails?: CatalogPackagingDetails
  secondaryPackagingDetails?: CatalogPackagingDetails
}

export interface Driver {
  id: number
  name: string
  phone?: string
  cpf?: string
  cnhCategory?: string
  numberCnh?: string
  bloodType?: string
  securityContact?: string
  dateBirth?: string
  active?: boolean
  img?: string
  picture?: string
  cooperative?: Cooperative
  cooperativeId?: number
}

export interface Vehicle {
  id: number
  model: string
  licensePlate?: string
  typeId?: number
  type?: { id: number; name: string }
  volume?: number
  maximumWeight?: number
  travelsFinishedCount?: number
  active?: boolean
  img?: string
  picture?: string
  cooperative?: Cooperative
  cooperativeId?: number
}

export interface Travel {
  id: number
  origin?: string
  destination?: string
  status?: string
  completedAt?: string
  date?: string
  hour?: string
  startDateTime?: string
  cooperativeId?: number
  driverId?: number
  vehicleId?: number
  cooperative?: Cooperative
  driver?: Driver
  vehicle?: Vehicle & { type?: { id?: number; name?: string } }
  routes?: TravelRoute[]
  travelRoutes?: TravelRoute[]
  offerCount?: number
  isOffer?: boolean
  offers?: TravelOffer[]
  totalDistance?: number
}

export interface TravelRoute {
  id?: number
  address?: string
  load?: number | boolean
  unload?: number | boolean
  order?: number
  distance?: number
  loadingWeight?: number
  unloadingWeight?: number
  remainingCapacity?: number
  latitude?: number
  longitude?: number
  offer?: TravelOffer
  routeProduct?: {
    product?: { id?: number; name?: string }
    loadedWeight?: number
    unloadedWeight?: number
  }[]
  coopAttachment?: string
}

export interface TravelOffer {
  id: number
  travelId?: number
  status?: string
  cooperativeId?: number
  totalDistance?: number
  message?: string
  estimatedPrice?: number
  cooperative?: Cooperative
  travel?: Travel & {
    travelRoutes?: TravelRoute[]
    startDateTime?: string
  }
  routes?: TravelRoute[]
  business?: Business
  changelogs?: { title?: string; content?: string; createdAt?: string }[]
}

export interface Business {
  id: number
  type?: BusinessType | string
  status?: BusinessStatus | string
  fee?: number | string
  createdAt?: string
  offeringCooperative?: Cooperative
  requestingCooperative?: Cooperative
  offeringCooperativeId?: number
  requestingCooperativeId?: number
  travelOffer?: {
    id?: number
    travel?: { id?: number }
    routes?: { id?: number; address: string; order: number }[]
  }
  conversation?: {
    id?: number
    messageCount?: number
    totalMessagesNotSeenByMe?: number
    awaitingMediation?: boolean
  }
  businessDesk?: { id?: number }
  collectivePurchase?: { id?: number }
  /** @deprecated use fee */
  value?: number
  /** @deprecated use offeringCooperative/requestingCooperative */
  cooperative?: Cooperative
}

export interface BusinessDeskItem {
  id: number
  title?: string
  description?: string
  status?: string
  active?: boolean
  cooperativeId?: number
  deletedAt?: string | null
  cooperative?: {
    id?: number
    companyName?: string
    fantasyName?: string
    img?: string
    city?: { name?: string }
  }
  businessDeskProducts?: {
    id?: number
    weight?: number
    product?: { id?: number; name?: string }
  }[]
}

export interface CollectivePurchaseProduct {
  productName: string
  weight: number
}

export interface CollectivePurchase {
  id: number
  cityId?: number
  title?: string
  description?: string
  status?: string
  active?: boolean
  deadline?: string
  products?: CollectivePurchaseProduct[] | unknown
  city?: { id?: number; name: string; state?: { abbreviation?: string } }
}

export interface Conversation {
  id: number
  title?: string
  lastMessage?: string
  updatedAt?: string
  unread?: number
  messageCount?: number
  totalMessagesNotSeenByMe?: number
  totalMyMessagesNotSeen?: number
  initiatorCooperative?: { id?: number; companyName?: string; fantasyName?: string }
  participantCooperative?: { id?: number; companyName?: string; fantasyName?: string }
  participants?: { cooperative?: { id?: number; companyName?: string; fantasyName?: string } }[]
  messages?: ConversationMessage[]
  business?: { status: BusinessStatus }
}

export interface ConversationMessage {
  id: number
  content: string
  cooperativeId: number
  cooperative?: Cooperative
  sender: boolean
  seen: boolean
  createdAt: string
  isSender?: boolean
  status: MessageStatus
  revisedAt?: string
}

export interface FaqItem {
  id: number
  question: string
  answer: string
  title?: string
  content?: string
}

export interface Visitant {
  id: number
  name?: string
  email?: string
  phone?: string
  address?: string
  active?: boolean
  city?: { name: string }
  createdAt?: string
}

export interface RegistrationRequest {
  id: number
  name: string
  cnpj: string
  address: string
  email: string
  phone: string
  createdAt?: string
  updatedAt?: string
}

export interface PanelConfig {
  serviceTax?: number
  minimumServiceTax?: number
  loadTypes?: ConfigMpyItem[]
  vehicleTypes?: ConfigMpyItem[]
  productCategories?: ConfigNamedItem[]
  packaging?: ConfigNamedItem[]
  distanceRanges?: ConfigRange[]
  weightRanges?: ConfigRange[]
  valueRanges?: ConfigValueRange[]
}

export type ConfigRange = { id?: number; from: number; to: number }
export type ConfigNamedItem = { id?: number | null; name: string }
export type ConfigMpyItem = ConfigNamedItem & { mpy: number }
export type ConfigValueRange = {
  id?: number
  value: number
  distanceRangeId?: number
  weightRangeId?: number
}

export enum ReportTypes {
  PRODUCTS_COOPERATIVE = 'PRODUCTS_COOPERATIVE',
  TRAVELS_MADE_COOPERATIVE = 'TRAVELS_MADE_COOPERATIVE',
  PRODUCTS_TRANSPORTED_BY_COOPERATIVE = 'PRODUCTS_TRANSPORTED_BY_COOPERATIVE',
  TRAVELS_PRICE_FINISHED = 'TRAVELS_PRICE_FINISHED',
}

export enum ReportFilters {
  COOPERATIVEID = 'COOPERATIVEID',
  PRODUCTCATEGORYID = 'PRODUCTCATEGORYID',
  PERIOD = 'PERIOD',
}

export interface ReportDefinition {
  type: ReportTypes
  name: string
  filters: { type: ReportFilters; required: boolean }[]
}

export interface CafCategoria {
  categoria: string
  quantidade: number
  participacao: number
}

export interface CafMunicipio {
  municipio: string
  quantidade: number
}

export interface CafCooperativa {
  id: number
  cooperativeId: number
  cnpj: string
  cafUuid: string | null
  numeroCaf: string | null
  fantasyName: string | null
  razaoSocial: string | null
  situacao: string | null
  tipoPessoaJuridica: string | null
  municipio: string | null
  uf: string | null
  dataInscricao: string | null
  dataValidade: string | null
  ultimaAtualizacao: string | null
  representanteLegal: string | null
  totalComCaf: number
  totalSemCaf: number
  percentualComCaf: number
  masculino: number
  feminino: number
  dataEnvioComposicao: string | null
  categorias: CafCategoria[]
  atividades: CafCategoria[]
  municipiosSocios: CafMunicipio[]
  consultedAt: string
}

export interface CafPanelData {
  totalMasculino?: number
  totalFeminino?: number
  totalComCaf?: number
  totalSemCaf?: number
  cooperativasAtivas?: number
  cooperativasInativas?: number
  totalNaListaRedecoop?: number
  comExtratoNoBanco?: number
  semExtratoNaLista?: number
  cnpjsSemExtrato?: string[]
  lastUpdate?: string | null
  cooperativas?: CafCooperativa[]
  maioresPorTotalSocios?: { label: string; total: number }[]
  sociosPorMunicipioAgregado?: { municipio: string; quantidade: number }[]
  sociosPorPublicoEAtividadeAgregado?: {
    nome: string
    origem: 'categoria' | 'atividade'
    quantidade: number
  }[]
}

export interface MapPlace {
  description: string
  placeId?: string
  lat?: number
  lng?: number
}

export interface State {
  id: number
  name: string
  uf?: string
}

export interface City {
  id: number
  name: string
}
