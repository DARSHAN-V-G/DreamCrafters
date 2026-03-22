import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

import Home from './pages/Home'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'

import Dashboard from './pages/dashboard/Dashboard'
import Settings from './pages/settings/Settings'

import StudyPlanner from './pages/study-planner/StudyPlanner'
import StudyPlanDetail from './pages/study-planner/StudyPlanDetail'

import ContentLibrary from './pages/content/ContentLibrary'
import Webinars from './pages/content/Webinars'
import CareerPaths from './pages/careers/CareerPaths'

import ChatBot from './pages/chatbot/ChatBot'
import Mentors from './pages/chatbot/Mentors'

import JobBoard from './pages/jobs/JobBoard'

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

          {/* Protected - Study Planner (M3 Live) */}
          <Route path="/study-planner" element={
            <ProtectedRoute><StudyPlanner /></ProtectedRoute>
          } />
          <Route path="/study-planner/:id" element={
            <ProtectedRoute><StudyPlanDetail /></ProtectedRoute>
          } />

          {/* Protected - Content (M2 Dummy) */}
          <Route path="/content" element={
            <ProtectedRoute><ContentLibrary /></ProtectedRoute>
          } />
          <Route path="/webinars" element={
            <ProtectedRoute><Webinars /></ProtectedRoute>
          } />
          <Route path="/careers" element={
            <ProtectedRoute><CareerPaths /></ProtectedRoute>
          } />

          {/* Protected - Chatbot & Mentors (M4 Dummy) */}
          <Route path="/chat" element={
            <ProtectedRoute><ChatBot /></ProtectedRoute>
          } />
          <Route path="/mentors" element={
            <ProtectedRoute><Mentors /></ProtectedRoute>
          } />

          {/* Protected - Jobs (M5 Dummy) */}
          <Route path="/jobs" element={
            <ProtectedRoute><JobBoard /></ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}
