import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import AuthContext from './context/AuthContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import { Provider } from 'react-redux'
import store from './redux/store'
import { ThemeProvider, CssBaseline } from '@mui/material'
import muiTheme from './muiTheme'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Provider store={store}>
        <AuthContext>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </AuthContext>
      </Provider>
    </ThemeProvider>
  </StrictMode>
)
