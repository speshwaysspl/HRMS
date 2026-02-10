import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import AuthContext from './context/AuthContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthContext>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </AuthContext>
  </StrictMode>
)
