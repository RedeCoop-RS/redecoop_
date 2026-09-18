import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Analytics } from '@/components/Analytics'
import { SiteAnalytics } from '@/components/SiteAnalytics'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { AuthProvider } from '@/contexts/AuthContext'
import { ModalProvider } from '@/contexts/ModalContext'
import { ModalManager } from '@/components/modals/ModalManager'
import { HomePage } from '@/pages/HomePage'
import { HistoryPage } from '@/pages/HistoryPage'
import { GovernancePage } from '@/pages/GovernancePage'
import { ServicesPage } from '@/pages/ServicesPage'
import { PlatformPage } from '@/pages/PlatformPage'
import { CooperativesPage } from '@/pages/CooperativesPage'
import { BlogPage } from '@/pages/BlogPage'
import { BlogPostPage } from '@/pages/BlogPostPage'
import { CompleteRegistrationPage } from '@/pages/CompleteRegistrationPage'
import { ContactPage } from '@/pages/ContactPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RequireAuth } from '@/components/auth/RequireAuth'

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <ScrollToTop />
      <Analytics />
      <SiteAnalytics />
      <AuthProvider>
        <ModalProvider>
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
