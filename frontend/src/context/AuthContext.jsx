import React, { createContext, useContext, useState, useEffect } from 'react'
import { studentAuthAPI, educatorAuthAPI, adminAuthAPI } from '../api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore user from localStorage
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    setLoading(false)
  }, [])

  const login = (userData) => {
    // Token is stored as httpOnly cookie by the backend
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = async () => {
    try {
      if (user?.role === 'student') {
        await studentAuthAPI.logout()
      } else if (user?.role === 'educator') {
        await educatorAuthAPI.logout()
      } else if (user?.role === 'admin') {
        await adminAuthAPI.logout()
      }
    } catch (err) {
      console.error('Logout error:', err)
    }
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = (data) => {
    const updated = { ...user, ...data }
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
