import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Button from '../components/Button'
import { Flame, ArrowRight } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

export default function Dashboard({ session }) {
  const [roadmaps, setRoadmaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [streak, setStreak] = useState(0)

  useEffect(() => { 
    loadRoadmaps()
    pingStreak()
  }, [])

  // fetch only this user's roadmaps — RLS on the database makes sure of that automatically
  async function loadRoadmaps() {
    const { data } = await supabase
      .from('roadmaps')
      .select('*')
      .order('created_at', { ascending: false })
    setRoadmaps(data || [])
    setLoading(false)
  }

  // F3: Ping streak on load
  async function pingStreak() {
    try {
      const res = await fetch(`${API_URL}/api/streak/ping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const data = await res.json()
      if (res.ok) {
        setStreak(data.currentStreak || 0)
      }
    } catch (err) {
      console.error('Failed to ping streak:', err)
    }
  }

  async function deleteRoadmap(id) {
    await supabase.from('roadmaps').delete().eq('id', id)
    loadRoadmaps()
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen text-[#F3EFE2] relative overflow-hidden">
      

      {/* Fixed Background Image with Premium Overlays */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000")' }}
        />
        <div className="absolute inset-0 bg-[#0F1E1A]/70 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F1E1A]/95 via-[#0F1E1A]/80 to-[#4FD1C5]/20 backdrop-blur-[4px]" />
      </div>

      {/* Background ambient glow for premium aesthetic */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-[#4FD1C5]/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/4 w-[30rem] h-[30rem] bg-[#4FD1C5]/5 rounded-full blur-[150px] pointer-events-none z-0" />

      {/* Floating Premium Navigation Bar */}
      <div className="sticky top-0 z-50 pt-2 sm:pt-6 px-2 sm:px-6 flex justify-center pointer-events-none transition-all">
        <nav className="pointer-events-auto flex w-full max-w-6xl justify-between items-center backdrop-blur-2xl bg-white/90 border border-white/40 px-2 sm:px-3 py-2 sm:py-3 rounded-2xl sm:rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.6)] transition-all">
          
          <div className="flex items-center gap-2 sm:gap-6">
            <div className="bg-[#0F1E1A] text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-black text-sm sm:text-lg tracking-wide shadow-[0_5px_15px_rgba(15,30,26,0.2)] hover:scale-105 hover:text-brand-accent transition-all duration-300 cursor-pointer relative z-10">
              Pathwise
            </div>

            {/* Aesthetic Links */}
            <div className="flex items-center gap-3 sm:gap-6 pl-2 sm:pl-4 border-l border-black/10 text-xs sm:text-sm">
              <span className="font-extrabold text-[#0F1E1A] cursor-pointer flex items-center gap-1 relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-[2px] sm:after:h-[3px] after:bg-[#0F1E1A] after:rounded-full">
                Dashboard
              </span>
              <Link to="/explore" className="font-semibold text-black/40 hover:text-[#0F1E1A] transition-colors cursor-pointer flex items-center gap-2">
                Explore
              </Link>
              <Link to="/community" className="font-semibold text-black/40 hover:text-[#0F1E1A] transition-colors cursor-pointer flex items-center gap-2">
                Community
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 pr-1">
            {streak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-accent/20 border border-brand-accent/30 text-[#0F1E1A] text-xs sm:text-sm font-black shadow-inner">
                <Flame size={16} className="text-amber-600 fill-amber-500/30" /> {streak} day streak
              </div>
            )}

            <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-black/5 border border-black/5 hover:bg-black/10 transition-colors cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-accent to-[#0F1E1A] flex items-center justify-center shadow-inner">
                <span className="text-[11px] font-bold text-white uppercase">{session.user.email[0]}</span>
              </div>
              <span className="text-sm text-black/80 font-bold">{session.user.email.split('@')[0]}</span>
            </div>

            <button 
              onClick={logout} 
              className="text-xs sm:text-sm font-bold pl-3 sm:pl-5 pr-2 sm:pr-4 py-2 sm:py-2.5 rounded-full border-2 border-[#0F1E1A] text-[#0F1E1A] hover:text-white hover:bg-[#0F1E1A] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,30,26,0.3)] transition-all duration-300 group flex items-center gap-1 sm:gap-2"
            >
              Log out
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        
        {/* Premium Hero Header Box */}
        <div className="relative mb-10 sm:mb-16 p-6 sm:p-10 lg:p-12 rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br from-[#142420]/95 to-[#0F1E1A]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8 group transition-all duration-500 hover:shadow-[0_20px_60px_rgba(0,0,0,0.6)] hover:border-white/20">
          
          {/* Aesthetic background glows inside the box */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-brand-accent/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/3 translate-x-1/3 transition-all duration-700 group-hover:bg-brand-accent/20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-accent/5 rounded-full blur-[60px] pointer-events-none translate-y-1/2 -translate-x-1/4" />


          <div className="relative z-10 text-center md:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 tracking-tight drop-shadow-sm">Your Roadmaps</h1>
            <p className="text-white/70 text-sm sm:text-lg max-w-xl mx-auto md:mx-0 leading-relaxed">
              Track your journey, master new skills, and reach your goals with personalized AI-guided learning paths.
            </p>
          </div>
          
          <div className="relative z-10 flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
            <Link to="/onboarding" className="block w-full md:w-auto">
              <Button className="w-full md:w-auto px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base shadow-[0_10px_30px_rgba(255,255,255,0.15)] hover:shadow-[0_15px_40px_rgba(255,255,255,0.25)]">
                <span className="mr-2 font-bold text-lg">+</span> Generate Roadmap
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-10 w-10 text-brand-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {roadmaps.map((r, i) => (
              <Link 
                to={`/roadmap/${r.id}`}
                key={r.id} 
                className="group relative p-8 rounded-3xl bg-[#142420]/80 backdrop-blur-xl border border-white/5 hover:border-brand-accent/40 hover:shadow-[0_15px_40px_rgba(79,209,197,0.15)] hover:-translate-y-1 transition-all duration-500 flex flex-col min-h-[240px]"
              >

                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                      r.is_public 
                        ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30' 
                        : 'bg-white/5 text-white/40 border-white/10'
                    }`}>
                      {r.is_public ? 'Public' : 'Private'}
                    </span>
                    {r.category && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/5 text-white/50 border border-white/5">
                        {r.category}
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 line-clamp-2 group-hover:text-brand-accent transition-colors pr-6">{r.title}</h3>
                  <p className="text-white/60 text-sm line-clamp-3 mb-6 leading-relaxed">{r.goal}</p>
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10 group-hover:border-brand-accent/20 transition-colors">
                  <span className="text-brand-accent text-sm font-medium flex items-center group-hover:translate-x-1 transition-transform">
                    View roadmap <ArrowRight size={14} className="ml-1" />
                  </span>
                  <button 
                    onClick={(e) => {
                      e.preventDefault(); 
                      e.stopPropagation();
                      deleteRoadmap(r.id);
                    }} 
                    className="px-3 py-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 text-sm transition-colors relative z-30"
                  >
                    Delete
                  </button>
                </div>
              </Link>
            ))}
            
            {roadmaps.length === 0 && (
              <div className="col-span-full py-20 text-center rounded-3xl bg-[#142420]/40 border border-white/5 border-dashed relative">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-brand-accent/10 flex items-center justify-center shadow-[0_0_30px_rgba(79,209,197,0.2)]">
                  <svg className="w-10 h-10 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No roadmaps yet</h3>
                <p className="text-white/50 mb-8 max-w-sm mx-auto">Create your first personalized AI learning path to get started on your journey.</p>
                <Link to="/onboarding">
                  <Button>Generate your first roadmap</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

