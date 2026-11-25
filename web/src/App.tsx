import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { TenantProvider } from './context/TenantContext'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import PropertiesPage from './pages/PropertiesPage'
import AccessPage from './pages/AccessPage'
import MembersPage from './pages/MembersPage'
import PropertyGatesPage from './pages/PropertyGatesPage'
import GateAuditPage from './pages/GateAuditPage'
import PropertyAccessReportPage from './pages/PropertyAccessReportPage'
import UsageReportPage from './pages/UsageReportPage'
import AccessNowPage from './pages/AccessNowPage'
import PermitsPage from './pages/PermitsPage'
import PermitInvitePage from './pages/PermitInvitePage'

export default function App() {
  return (
    <ThemeProvider>
      <TenantProvider>
        <AuthProvider>
          <DataProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<PublicRoute />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot" element={<ForgotPasswordPage />} />
              </Route>
              {/* Reset logs the user in itself, so it is reachable regardless of auth state. */}
              <Route path="/reset" element={<ResetPasswordPage />} />
              {/* Public entry point for gate QR codes: AccessPage sends signed-out visitors to register first. */}
              <Route element={<AppLayout />}>
                <Route path="/access/:token" element={<AccessPage />} />
                <Route path="/access/:token/in" element={<AccessPage direction="in" />} />
                <Route path="/access/:token/out" element={<AccessPage direction="out" />} />
                {/* Permit invite links: public to view, sign-in needed to submit. */}
                <Route path="/permit/:token" element={<PermitInvitePage />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/properties" element={<PropertiesPage />} />
                  <Route path="/properties/:id" element={<PropertyGatesPage />} />
                  <Route path="/members" element={<MembersPage />} />
                  <Route path="/permits" element={<PermitsPage />} />
                  <Route path="/audit" element={<GateAuditPage />} />
                  <Route path="/reports/property-access" element={<PropertyAccessReportPage />} />
                  <Route path="/reports/access-now" element={<AccessNowPage />} />
                  <Route path="/reports/usage" element={<UsageReportPage />} />
                </Route>
              </Route>
              <Route path="*" element={<LandingPage />} />
            </Routes>
          </BrowserRouter>
          </DataProvider>
        </AuthProvider>
      </TenantProvider>
    </ThemeProvider>
  )
}
