import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Bell,
  Building2,
  FileText,
  HelpCircle,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Sprout,
  Truck,
  Users,
  Handshake,
} from 'lucide-react'
import { UserRole } from '@/types'

export interface NavSubItem {
  name: string
  url: string
}

export interface NavItem {
  name: string
  url: string
  icon: LucideIcon
  submenu?: NavSubItem[]
  action?: 'notifications'
}

export interface NavDivider {
  type: 'divider'
}

export type SidebarItem = NavItem | NavDivider

export function isDivider(item: SidebarItem): item is NavDivider {
  return 'type' in item && item.type === 'divider'
}

const adminNav: SidebarItem[] = [
  { name: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { name: 'CAF', url: '/admin/caf', icon: Sprout },
  { name: 'Produtos', url: '/admin/produtos', icon: Package },
  { name: 'Cooperativas', url: '/admin/cooperativas', icon: Building2 },
  { name: 'Negócios', url: '/admin/negocios', icon: Handshake },
  { name: 'Compras Coletivas', url: '/admin/compras-coletivas', icon: ShoppingCart },
  {
    name: 'CoopFrete',
    url: '',
    icon: Truck,
    submenu: [{ name: 'Viagens disponíveis', url: '/admin/viagens-disponiveis' }],
  },
  { name: 'Mensagens', url: '/admin/mensagens', icon: MessageSquare },
  { name: 'Visitantes e solicitações', url: '/admin/visitantes-e-solicitacoes', icon: Users },
  { name: 'Balcão de Negócios', url: '/admin/balcao-de-negocios', icon: BarChart3 },
  { name: 'Relatórios', url: '/admin/relatorio', icon: FileText },
  { type: 'divider' },
  { name: 'Notificações', url: '', icon: Bell, action: 'notifications' },
  { name: 'Configurações', url: '/admin/configuracoes-painel', icon: Settings },
  { name: 'FAQ', url: '/admin/faq', icon: HelpCircle },
]

const cooperativeNav: SidebarItem[] = [
  { name: 'Dashboard', url: '/cooperativa', icon: LayoutDashboard },
  { name: 'CAF', url: '/cooperativa/caf', icon: Sprout },
  { name: 'Meus Produtos', url: '/cooperativa/produtos', icon: Package },
  { name: 'Negócios', url: '/cooperativa/negocios', icon: Handshake },
  { name: 'Compras Coletivas', url: '/cooperativa/compras-coletivas', icon: ShoppingCart },
  {
    name: 'CoopFrete',
    url: '',
    icon: Truck,
    submenu: [
      { name: 'Cadastro', url: '/cooperativa/cooperativas' },
      { name: 'Viagens disponíveis', url: '/cooperativa/viagens-disponiveis' },
      { name: 'Minhas Viagens', url: '/cooperativa/minhas-viagens' },
    ],
  },
  { name: 'Mensagens', url: '/cooperativa/mensagens', icon: MessageSquare },
  { name: 'Balcão de Negócios', url: '/cooperativa/balcao-de-negocios', icon: BarChart3 },
  { type: 'divider' },
  { name: 'Notificações', url: '', icon: Bell, action: 'notifications' },
  { name: 'Configurações', url: '/cooperativa/configuracoes-cooperativa', icon: Settings },
  { name: 'FAQ', url: '/cooperativa/faq', icon: HelpCircle },
]

export function getNavigation(role: UserRole): SidebarItem[] {
  if (role === UserRole.ADMIN) return adminNav
  if (role === UserRole.COOPERATIVE) return cooperativeNav
  return []
}

export function getBasePath(role: UserRole): string {
  return role === UserRole.ADMIN ? '/admin' : '/cooperativa'
}
