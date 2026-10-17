import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import Feed from './pages/Feed'
import Members from './pages/Members'
import Opportunities from './pages/Opportunities'
import Profile from './pages/Profile'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<VerifyEmail />} />
          <Route element={<Layout />}>
            <Route index element={<Feed />} />
            <Route path="/members" element={<Members />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
