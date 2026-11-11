import React from 'react'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import { PageSkeleton } from '../components/common/LoadingState'

const PrivateRoutes = ({ children }) => {
  const { user, loading } = useAuth()

  // Only shown on a first visit with no remembered session; refreshes render instantly.
  if (loading) return <PageSkeleton message="Checking your session…" />

  return user ? children : <Navigate to="/login" />
}

export default PrivateRoutes
