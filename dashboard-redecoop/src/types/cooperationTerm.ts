export type CooperationTermModel = 'GHC' | 'STANDARD'
export type CooperationTermStatus = 'DRAFT' | 'SIGNED'
export type TermScope = 'full' | 'division'

export interface CooperationTermSummary {
  id: number
  familyId: string
  version: number
  name: string
  processNumber: string
  buyerInstitution: string
  model: CooperationTermModel
  status: CooperationTermStatus
  divisionReleased: boolean
  signedAt: string | null
  updatedAt: string
  itemCount: number
  scope: 'full' | 'division'
}

export interface CooperationTermAllocation {
  cooperativeId: number
  cooperativeName: string
  quantity: number
  maxCapacity: number | null
  months: number[]
  monthlyQuantities: { month: number; quantity: number }[]
}

export interface CooperationTermItem {
  id: number
  position: number
  itemNumber: number
  description: string
  unit: string
  estimatedQuantity: number
  unitPrice: number | null
  totalPrice: number | null
  hospitalQuantities: { hospitalUnitId: number; quantity: number }[]
  interests: { cooperativeId: number; cooperativeName: string }[]
  allocations: CooperationTermAllocation[]
}

export interface CalendarAlert {
  code: string
  message: string
  itemId: number
  months?: number[]
  cooperativeId?: number
}

export interface CooperationTermRecipient {
  name: string
  email: string | null
  kind: 'cooperative' | 'buyer'
}

export interface CooperationTermDetail {
  id: number
  familyId: string
  version: number
  name: string
  processNumber: string
  buyerInstitution: string
  buyerEmail: string | null
  model: CooperationTermModel
  status: CooperationTermStatus
  divisionReleased: boolean
  signedAt: string | null
  createdAt: string
  updatedAt: string
  scope: TermScope
  canEdit: boolean
  canDownload: boolean
  canSend: boolean
  monthLabels: string[]
  hospitalUnits: { id: number; name: string; position: number }[]
  items: CooperationTermItem[]
  alerts: CalendarAlert[]
  versions: {
    id: number
    version: number
    status: CooperationTermStatus
    signedAt: string | null
    divisionReleased: boolean
  }[]
  recipientsPreview: CooperationTermRecipient[]
  emailLogs: {
    id: number
    kind: 'TERM' | 'DIVISION'
    status: string
    detail: string | null
    createdAt: string
    recipients: { email: string; name: string; kind: string }[]
  }[]
}

export interface CooperationTermInput {
  name: string
  processNumber: string
  buyerInstitution: string
  buyerEmail?: string | null
  model: CooperationTermModel
}

export interface CooperationTermImportPreview {
  fileName: string
  items: {
    itemNumber: number | null
    description: string
    unit: string
    estimatedQuantity: number | null
    unitPrice: number | null
    totalPrice: number | null
    hospitalQuantities: { hospitalUnitName: string; quantity: number }[]
  }[]
  hospitalUnits: string[]
  missingQuantity: string[]
}

export interface CooperationTermItemInput {
  itemNumber?: number | null
  description: string
  unit: string
  estimatedQuantity?: number
  unitPrice?: number | null
  totalPrice?: number | null
  hospitalQuantities?: { hospitalUnitId: number; quantity: number }[]
}
