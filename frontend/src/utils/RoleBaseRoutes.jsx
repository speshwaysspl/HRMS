import React from 'react'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

const RoleBaseRoutes = ({children, requiredRole}) => {
    const {user, loading} = useAuth()

    if(loading) {
        return <div>Loading ...</div>
    }

    const userRoles = Array.isArray(user.role) ? user.role : [user.role];
    const hasAccess = requiredRole.some(role => userRoles.includes(role));

    if(!hasAccess) {
        return <Navigate to="/unauthorized" replace />
    }
  
    return user ? children : <Navigate to="/login" />
}

export default RoleBaseRoutes