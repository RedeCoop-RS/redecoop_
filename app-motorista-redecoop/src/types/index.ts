export type CNHCategory = 'ACC' | 'A' | 'B' | 'C' | 'D' | 'E' | 'AB' | 'AC' | 'AD' | 'AE'

export type BloodType =
  | 'A_POS'
  | 'A_NEG'
  | 'B_POS'
  | 'B_NEG'
  | 'AB_POS'
  | 'AB_NEG'
  | 'O_POS'
  | 'O_NEG'

export interface CooperativeSummary {
  id: number
  name: string
}

export interface Driver {
  id: number
  userid: number
  cooperativeId: number
  name: string
  phone: string
  cpf: string
  cnhCategory: CNHCategory
  numberCnh: string
  bloodType: BloodType
  securityContact: string
  dateBirth: string
  img?: string
  active: boolean
  cooperative?: CooperativeSummary
}

export type UserRole = 'ADMIN' | 'COOPERATIVE' | 'DRIVER' | 'VISITANT'

export interface User {
  cooperative: number | null
  id: number
  username: string
  visitant: boolean
  driver: Driver
  role: UserRole
}

export interface VehicleType {
  id: number
  name: string
}

export interface Vehicle {
  id: number
  model: string
  licensePlate: string
  maximumWeight: number
  type: VehicleType
}

export interface RouteProduct {
  id: number
  loadedWeight: number
  unloadedWeight: number
  product: { id: number; name: string }
}

export interface TravelRouteOffer {
  id: number
  status: string
  cooperative: { name: string }
}

export interface TravelRoute {
  id: number
  address: string
  loadingWeight: number
  order: number
  routeProduct: RouteProduct[]
  unloadingWeight: number
  arrivedAt: string | null
  attachment: string | null
  currentRoute?: boolean
  lastRoute?: boolean
  offer?: TravelRouteOffer | null
}

export type TravelStatus = 'in_progress' | 'awaiting' | 'completed' | 'canceled'

export interface Travel {
  id: number
  vehicle: Vehicle
  cooperative: CooperativeSummary
  driver: Driver
  travelRoutes: TravelRoute[]
  startDateTime: string
  status: TravelStatus
  offerCount: number
  isOffer: boolean
  isParticipant: boolean
  totalDistance: number
  readyToStart: boolean
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  data: {
    token: string
    role: UserRole
    userData: User
  }
}
