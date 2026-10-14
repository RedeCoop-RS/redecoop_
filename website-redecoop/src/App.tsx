import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Analytics } from '@/components/Analytics'
import { SiteAnalytics } from '@/components/SiteAnalytics'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { AuthProvider } from '@/contexts/AuthContext'
import { ModalProvider } from '@/contexts/ModalContext'
import { ModalManager } from '@/components/modals/ModalManager'
import { HomePage } from '@/pages/HomePage'
import { RequireAuth } from '@/components/auth/RequireAuth'

const HistoryPage = lazy(() => import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })))
const GovernancePage = lazy(() => import('@/pages/GovernancePage').then((m) => ({ default: m.GovernancePage })))
const ServicesPage = lazy(() => import('@/pages/ServicesPage').then((m) => ({ default: m.ServicesPage })))
const PlatformPage = lazy(() => import('@/pages/PlatformPage').then((m) => ({ default: m.PlatformPage })))
const CooperativesPage = lazy(() => import('@/pages/CooperativesPage').then((m) => ({ default: m.CooperativesPage })))
const BlogPage = lazy(() => import('@/pages/BlogPage').then((m) => ({ default: m.BlogPage })))
const BlogPostPage = lazy(() => import('@/pages/BlogPostPage').then((m) => ({ default: m.BlogPostPage })))
const CompleteRegistrationPage = lazy(() =>
  import('@/pages/CompleteRegistrationPage').then((m) => ({ default: m.CompleteRegistrationPage })),
)
const ContactPage = lazy(() => import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

function PageEnter({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <ScrollToTop />
      <Analytics />
      <SiteAnalytics />
      <AuthProvider>
        <ModalProvider>
          <Suspense fallback={<div className="min-h-screen" />}>
          <PageEnter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/historia" element={<HistoryPage />} />
            <Route path="/governanca" element={<GovernancePage />} />
            <Route path="/servicos" element={<ServicesPage />} />
            <Route path="/cooperativismo-de-plataforma" element={<PlatformPage />} />
            <Route
              path="/cooperativas"
              element={
                <RequireAuth>
                  <CooperativesPage />
                </RequireAuth>
              }
            />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/contato" element={<ContactPage />} />
            <Route path="/privacidade" element={<PrivacyPage />} />
            <Route path="/completar-cadastro/:token" element={<CompleteRegistrationPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </PageEnter>
          </Suspense>
          <ModalManager />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: '12px',
                background: '#1a1a2e',
                color: '#fff',
              },
            }}
          />
        </ModalProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
