import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'

const depth = (p) => p.split('/').filter(Boolean).length

// Mobile Back / swipe: leaving a top-level dashboard section (e.g.
// /employee-dashboard/attendance) lands on that dashboard's home instead of
// whichever page was visited before. Detail pages still go back one step.
const useBackToHome = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const type = useNavigationType()
  const prev = useRef(location.pathname)

  useEffect(() => {
    const home = '/' + location.pathname.split('/').filter(Boolean)[0]
    if (
      type === 'POP' &&
      window.innerWidth < 768 &&
      depth(prev.current) === 2 &&
      location.pathname !== home
    ) {
      navigate(home, { replace: true })
    }
    prev.current = location.pathname
  }, [location.pathname, type, navigate])
}

export default useBackToHome
