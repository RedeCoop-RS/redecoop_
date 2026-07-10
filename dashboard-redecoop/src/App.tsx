import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { PendingRequestsProvider } from '@/contexts/PendingRequestsContext'
import { SocketProvider } from '@/contexts/SocketContext'
import { ModalProvider } from '@/contexts/ModalContext'
import { BusinessViewProvider } from '@/contexts/BusinessViewContext'
import { RoleGuard } from '@/components/guards/RoleGuard'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'
import { UserRole } from '@/types'

const AuthenticatePage = lazy(() =>
  import('@/pages/AuthenticatePage').then((m) => ({ default: m.AuthenticatePage })),
)
const RedirectPage = lazy(() =>
  import('@/pages/RedirectPage').then((m) => ({ default: m.RedirectPage })),
)
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const ProductsPage = lazy(() =>
  import('@/pages/ProductsPage').then((m) => ({ default: m.ProductsPage })),
)
const CatalogProductsPage = lazy(() =>
  import('@/pages/CatalogProductsPage').then((m) => ({ default: m.CatalogProductsPage })),
)
const CooperativesPage = lazy(() =>
  import('@/pages/CooperativesPage').then((m) => ({ default: m.CooperativesPage })),
)
const BusinessPage = lazy(() =>
  import('@/pages/BusinessPage').then((m) => ({ default: m.BusinessPage })),
)
const BusinessCooperativePage = lazy(() =>
  import('@/pages/BusinessPage').then((m) => ({ default: m.BusinessCooperativePage })),
)
const CollectivePurchasePage = lazy(() =>
  import('@/pages/CollectivePurchasePage').then((m) => ({ default: m.CollectivePurchasePage })),
)
const TravelsPage = lazy(() =>
  import('@/pages/TravelsPage').then((m) => ({ default: m.TravelsPage })),
)
const MyTravelsPage = lazy(() =>
  import('@/pages/TravelsPage').then((m) => ({ default: m.MyTravelsPage })),
)
const MessagesPage = lazy(() =>
  import('@/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })),
)
const VisitorsPage = lazy(() =>
  import('@/pages/VisitorsPage').then((m) => ({ default: m.VisitorsPage })),
)
const BusinessDeskPage = lazy(() =>
  import('@/pages/BusinessDeskPage').then((m) => ({ default: m.BusinessDeskPage })),
)
const SettingsPanelPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPanelPage })),
)
const SettingsCooperativePage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsCooperativePage })),
)
const FaqPage = lazy(() => import('@/pages/FaqPage').then((m) => ({ default: m.FaqPage })))
const ReportsPage = lazy(() =>
  import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
)
const CafPanelPage = lazy(() =>
  import('@/pages/CafPanelPage').then((m) => ({ default: m.CafPanelPage })),
)

function PageLoader() {
  return <LoadingOverlay visible message="Carregando página..." />
}

export default function App() {
  return (
    <AuthProvider>
      <PendingRequestsProvider>
      <SocketProvider>
        <ModalProvider>
          <BrowserRouter>
            <BusinessViewProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/autenticar/:token" element={<AuthenticatePage />} />
                <Route path="/redirect" element={<RedirectPage />} />
                <Route path="/" element={<Navigate to="/redirect" replace />} />

                <Route path="/admin" element={<RoleGuard role={UserRole.ADMIN} />}>
                  <Route element={<DashboardLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="caf" element={<CafPanelPage />} />
                    <Route path="produtos" element={<ProductsPage />} />
                    <Route path="cooperativas" element={<CooperativesPage />} />
                    <Route path="negocios" element={<BusinessPage />} />
                    <Route path="compras-coletivas" element={<CollectivePurchasePage />} />
                    <Route path="viagens-disponiveis" element={<TravelsPage />} />
                    <Route path="mensagens" element={<MessagesPage />} />
                    <Route path="visitantes-e-solicitacoes" element={<VisitorsPage />} />
                    <Route path="balcao-de-negocios" element={<BusinessDeskPage />} />
                    <Route path="relatorio" element={<ReportsPage />} />
                    <Route path="configuracoes-painel" element={<SettingsPanelPage />} />
                    <Route path="faq" element={<FaqPage />} />
                  </Route>
                </Route>

                <Route path="/cooperativa" element={<RoleGuard role={UserRole.COOPERATIVE} />}>
                  <Route element={<DashboardLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="caf" element={<CafPanelPage />} />
                    <Route path="produtos" element={<CatalogProductsPage />} />
                    <Route path="cooperativas" element={<CooperativesPage />} />
                    <Route path="negocios" element={<BusinessCooperativePage />} />
                    <Route path="compras-coletivas" element={<CollectivePurchasePage />} />
                    <Route path="viagens-disponiveis" element={<TravelsPage />} />
                    <Route path="minhas-viagens" element={<MyTravelsPage />} />
                    <Route path="mensagens" element={<MessagesPage />} />
                    <Route path="balcao-de-negocios" element={<BusinessDeskPage />} />
                    <Route path="configuracoes-cooperativa" element={<SettingsCooperativePage />} />
                    <Route path="faq" element={<FaqPage />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/redirect" replace />} />
              </Routes>
            </Suspense>
            </BusinessViewProvider>
          </BrowserRouter>

          <Toaster
            position="top-right"
            containerClassName="redecoop-toaster"
            toastOptions={{
              className: 'redecoop-toast',
              style: {
                background: '#1a1a2e',
                color: '#ffffff',
                borderRadius: '999px',
                padding: '0.75rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                boxShadow: '0 10px 28px rgba(0, 0, 0, 0.22)',
                maxWidth: 'min(420px, calc(100vw - 2rem))',
              },
              success: {
                className: 'redecoop-toast redecoop-toast--success',
                iconTheme: {
                  primary: '#009640',
                  secondary: '#ffffff',
                },
              },
              error: {
                className: 'redecoop-toast redecoop-toast--error',
                iconTheme: {
                  primary: '#e30613',
                  secondary: '#ffffff',
                },
              },
              loading: {
                className: 'redecoop-toast redecoop-toast--loading',
                iconTheme: {
                  primary: '#009640',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </ModalProvider>
      </SocketProvider>
      </PendingRequestsProvider>
    </AuthProvider>
  )
}
