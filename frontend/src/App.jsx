import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyOtpPage from './pages/auth/VerifyOtpPage';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentSearchPage from './pages/student/StudentSearchPage';
import BorrowedBooksPage from './pages/student/BorrowedBooksPage';
import ReservationsPage from './pages/student/ReservationsPage';
import HistoryPage from './pages/student/HistoryPage';
import DigitalResourcesPage from './pages/student/DigitalResourcesPage';
import ProfilePage from './pages/student/ProfilePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminBranchesPage from './pages/admin/AdminBranchesPage';
import AdminLogsPage from './pages/admin/AdminLogsPage';
import AdminBackupPage from './pages/admin/AdminBackupPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import LibrarianDashboard from './pages/librarian/LibrarianDashboard';
import { AuthProvider } from './context/AuthContext';
import CirculationPage from './pages/librarian/CirculationPage';
import CatalogPage from './pages/librarian/CatalogPage';
import CommunicationsPage from './pages/librarian/CommunicationsPage';
import ReportsPage from './pages/librarian/ReportsPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />

          {/* Student Routes */}
          <Route path="/dashboard/student" element={<StudentDashboard />} />
          <Route path="/dashboard/student/search" element={<StudentSearchPage />} />
          <Route path="/dashboard/student/borrowed-books" element={<BorrowedBooksPage />} />
          <Route path="/dashboard/student/reservations" element={<ReservationsPage />} />
          <Route path="/dashboard/student/history" element={<HistoryPage />} />
          <Route path="/dashboard/student/digital-resources" element={<DigitalResourcesPage />} />
          <Route path="/dashboard/student/profile" element={<ProfilePage />} />
          <Route path="/dashboard/student/settings" element={<ProfilePage />} />

          {/* Admin Routes */}
          <Route path="/dashboard/admin" element={<AdminDashboard />} />
          <Route path="/dashboard/admin/users" element={<AdminUsersPage />} />
          <Route path="/dashboard/admin/branches" element={<AdminBranchesPage />} />
          <Route path="/dashboard/admin/logs" element={<AdminLogsPage />} />
          <Route path="/dashboard/admin/backup" element={<AdminBackupPage />} />
          <Route path="/dashboard/admin/settings" element={<AdminSettingsPage />} />

          {/* Librarian Routes */}
          <Route path="/dashboard/librarian" element={<LibrarianDashboard />} />
          <Route path="/dashboard/librarian/circulation" element={<CirculationPage />} />
          <Route path="/dashboard/librarian/catalog" element={<CatalogPage />} />
          <Route path="/dashboard/librarian/news" element={<CommunicationsPage />} />
          <Route path="/dashboard/librarian/reports" element={<ReportsPage />} />
          <Route path="/dashboard/librarian/settings" element={<ProfilePage />} />

          {/* Redirect root to student dashboard */}
          <Route path="/" element={<Navigate to="/dashboard/student" replace />} />

          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
