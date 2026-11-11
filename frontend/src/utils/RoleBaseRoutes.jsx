import React from 'react'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import { PageSkeleton } from '../components/common/LoadingState'

// UI routing only; the server enforces roles on every API request.
const RoleBaseRoutes = ({ children, requiredRole }) => {
  const { user, loading } = useAuth()

  if (loading) return <PageSkeleton message="Checking your session…" />
  if (!user) return <Navigate to="/login" />

  const userRoles = Array.isArray(user.role) ? user.role : [user.role]
  const hasAccess = requiredRole.some((role) => userRoles.includes(role))

  return hasAccess ? children : <Navigate to="/unauthorized" replace />
}

export default RoleBaseRoutes
