import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import ProfilePage from './pages/ProfilePage';
import CancerRegistryPage from './pages/CancerRegistryPage';
import ArthritisRegistryPage from './pages/ArthritisRegistryPage';
import ActivityLogPage from './pages/ActivityLogPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Setup (authenticated but no profile) */}
          <Route
            path="/setup"
            element={
              <ProtectedRoute requireProfile={false}>
                <SetupPage />
              </ProtectedRoute>
            }
          />

          {/* Admin area */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="roles"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                  <RolesPage />
                </ProtectedRoute>
              }
            />
            <Route path="profile" element={<ProfilePage />} />
            <Route
              path="cancer"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'editor', 'user']}>
                  <CancerRegistryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="arthritis"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'editor', 'user']}>
                  <ArthritisRegistryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="activity"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'editor', 'user']}>
                  <ActivityLogPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
