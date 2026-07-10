import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppLayout } from '@/components/AppLayout'
import { GuestRoute, ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthProvider } from '@/contexts/AuthContext'
import { LoadingProvider } from '@/contexts/LoadingContext'
import { AwaitingPage } from '@/pages/AwaitingPage'
import { CompletedPage } from '@/pages/CompletedPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { TravelInProgressPage } from '@/pages/TravelInProgressPage'

export default function App() {
  return (
    <AuthProvider>
      <LoadingProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/aguardando" element={<AwaitingPage />} />
                <Route path="/finalizadas" element={<CompletedPage />} />
                <Route path="/viagem-em-andamento/:travelId" element={<TravelInProgressPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>

        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'Inter, sans-serif',
              maxWidth: '100%',
              borderRadius: '12px',
              padding: '12px 16px',
              background: '#fff',
              color: '#1a1a2e',
              boxShadow: '0 8px 24px rgba(0, 150, 64, 0.12)',
            },
            success: {
              iconTheme: { primary: '#009640', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#e30613', secondary: '#fff' },
            },
          }}
        />
      </LoadingProvider>
    </AuthProvider>
  )
}
