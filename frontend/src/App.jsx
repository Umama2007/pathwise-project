import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Onboarding from './pages/Onboarding'
import RoadmapDetail from './pages/RoadmapDetail'
import Mentor from './pages/Mentor'
import Explore from './pages/Explore'
import Community from './pages/Community'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // check if a user is already logged in when the app loads
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // keep session in sync when user logs in/out
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return <div className="min-h-screen bg-[#0F1E1A] text-white flex items-center justify-center">Loading...</div>

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" /> : <Login />} />
      <Route path="/signup" element={session ? <Navigate to="/" /> : <Signup />} />
      <Route path="/" element={session ? <Dashboard session={session} /> : <Navigate to="/login" />} />
      <Route path="/onboarding" element={session ? <Onboarding session={session} /> : <Navigate to="/login" />} />
      <Route path="/roadmap/:id" element={session ? <RoadmapDetail session={session} /> : <Navigate to="/login" />} />
      <Route path="/mentor/:id" element={session ? <Mentor session={session} /> : <Navigate to="/login" />} />
      <Route path="/explore" element={<Explore session={session} />} />
      <Route path="/community" element={<Community session={session} />} />
    </Routes>
  )
}
