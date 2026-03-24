import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

import Home from './pages/Home'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'

import Dashboard from './pages/dashboard/Dashboard'
import Settings from './pages/settings/Settings'
import Profile from './pages/student/Profile'

import StudyPlanner from './pages/study-planner/StudyPlanner'
import StudyPlanDetail from './pages/study-planner/StudyPlanDetail'

import Webinars from './pages/content/Webinars'
import EducatorWebinars from './pages/educator/Webinars'

import ChatBot from './pages/chatbot/ChatBot'
import Mentors from './pages/chatbot/Mentors'
import Requests from './pages/educator/Requests'

function WebinarsEntry() {
  const { user } = useAuth()

  if (user?.role === 'educator' || user?.role === 'mentor') {
    return <Navigate to="/educator/webinars" replace />
  }

  return <Webinars />
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected - Dashboard */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />

          {/* Protected - Settings */}
          <Route path="/settings" element={
            <ProtectedRoute><Settings /></ProtectedRoute>
          } />

          {/* Protected - Student Profile */}
          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={['student']}><Profile /></ProtectedRoute>
          } />

          {/* Protected - Study Planner (M3 Live) */}
          <Route path="/study-planner" element={
            <ProtectedRoute><StudyPlanner /></ProtectedRoute>
          } />
          <Route path="/study-planner/:id" element={
            <ProtectedRoute><StudyPlanDetail /></ProtectedRoute>
          } />

          {/* Protected - Webinars */}
          <Route path="/webinars" element={
            <ProtectedRoute><WebinarsEntry /></ProtectedRoute>
          } />

          {/* Protected - Chatbot & Mentors */}
          <Route path="/chat" element={
            <ProtectedRoute allowedRoles={['student']}><ChatBot /></ProtectedRoute>
          } />
          <Route path="/mentors" element={
            <ProtectedRoute allowedRoles={['student']}><Mentors /></ProtectedRoute>
          } />

          {/* Protected - Educator Requests */}
          <Route path="/requests" element={
            <ProtectedRoute allowedRoles={['educator', 'mentor']}><Navigate to="/educator/requests" replace /></ProtectedRoute>
          } />
          <Route path="/educator/requests" element={
            <ProtectedRoute allowedRoles={['educator', 'mentor']}><Requests /></ProtectedRoute>
          } />
          <Route path="/educator/webinars" element={
            <ProtectedRoute allowedRoles={['educator', 'mentor']}><EducatorWebinars /></ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}
