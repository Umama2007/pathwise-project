import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Button from '../components/Button'
import { Sparkles, Target, Puzzle, Star, Clock, Sparkle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

export default function Onboarding({ session }) {
  const [goal, setGoal] = useState('')
  const [skillLevel, setSkillLevel] = useState('beginner')
  const [hoursPerWeek, setHoursPerWeek] = useState(5)
  const [category, setCategory] = useState('Coding')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleGenerate(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/roadmaps/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          goal, 
          skillLevel, 
          hoursPerWeek,
          is_public: isPublic,
          category,
          difficulty: skillLevel
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      navigate(`/roadmap/${data.roadmap.id}`)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen text-[#F3EFE2] relative overflow-hidden flex flex-col items-center justify-center">
      
      {/* Shared Dashboard Background Image & Overlays */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000")' }} />
        <div className="absolute inset-0 bg-[#0F1E1A]/70 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F1E1A]/95 via-[#0F1E1A]/80 to-[#4FD1C5]/20 backdrop-blur-[4px]" />
      </div>

      {/* Ambient glow */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-[#4FD1C5]/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/4 w-[30rem] h-[30rem] bg-[#4FD1C5]/5 rounded-full blur-[150px] pointer-events-none z-0" />

      {/* Floating Premium Navigation Bar */}
      <div className="fixed top-0 inset-x-0 z-50 pt-2 sm:pt-6 px-2 sm:px-6 flex justify-center pointer-events-none transition-all">
        <nav className="pointer-events-auto flex w-full max-w-6xl justify-between items-center backdrop-blur-2xl bg-white/90 border border-white/40 px-2 sm:px-3 py-2 sm:py-3 rounded-2xl sm:rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.6)] transition-all">
          
          <div className="flex items-center gap-2 sm:gap-6">
            <Link to="/" className="bg-[#0F1E1A] text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-black text-sm sm:text-lg tracking-wide shadow-[0_5px_15px_rgba(15,30,26,0.2)] hover:scale-105 hover:text-brand-accent transition-all duration-300 cursor-pointer relative z-10 block">
              Pathwise
            </Link>

            {/* Aesthetic Links */}
            <div className="hidden md:flex items-center gap-6 pl-4 border-l border-black/10">
              <Link to="/" className="text-sm font-semibold text-black/40 hover:text-[#0F1E1A] transition-colors cursor-pointer flex items-center gap-2">
                Dashboard
              </Link>
              <Link to="/explore" className="text-sm font-semibold text-black/40 hover:text-[#0F1E1A] transition-colors cursor-pointer flex items-center gap-2">
                Explore
              </Link>
              <span className="text-sm font-extrabold text-[#0F1E1A] cursor-pointer flex items-center gap-2 relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-[3px] after:bg-[#0F1E1A] after:rounded-full">
                Generate
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 pr-1">
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

      {/* Main Generation Form Box */}
      <div className="relative z-10 w-full max-w-2xl px-3 sm:px-4 mt-20 sm:mt-24 mb-12">
        
        {/* The Premium Glassmorphism Box */}
        <div className={`relative p-6 sm:p-14 rounded-3xl sm:rounded-[3rem] bg-gradient-to-b from-[#142420]/80 to-[#0F1E1A]/95 backdrop-blur-[40px] border ${loading ? 'border-brand-accent/60 shadow-[0_0_80px_rgba(79,209,197,0.4)] scale-[1.02]' : 'border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.15)]'} transition-all duration-700 overflow-hidden`}>
          
          {/* Subtle Inner Grid Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik00MCAwaC0xdjQwTTAgNDBoNDB2LTEiIHN0cm9rZT0icmdiYSsyNTUsMjU1LDI1NSwwLjAzKSIvPjwvc3ZnPg==')] opacity-50 pointer-events-none" />

          {/* Scanning Laser Animation during Loading */}
          {loading && (
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-brand-accent to-transparent animate-[laser_2s_ease-in-out_infinite]" />
          )}

          <style>
            {`
              @keyframes laser {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
              @keyframes spin-reverse {
                from { transform: rotate(360deg); }
                to { transform: rotate(0deg); }
              }
            `}
          </style>

          {loading ? (
            /* Stunning Cinematic Loading Screen */
            <div className="flex flex-col items-center justify-center min-h-[450px] sm:min-h-[500px] relative z-10 animate-in fade-in zoom-in-95 duration-700">
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 mb-10">
                {/* Outer Ring */}
                <div className="absolute inset-0 rounded-full border-[3px] border-white/5" />
                {/* Fast Outer Spin */}
                <div className="absolute inset-0 rounded-full border-[3px] border-brand-accent border-t-transparent animate-spin shadow-[0_0_30px_rgba(79,209,197,0.5)]" style={{ animationDuration: '1.2s' }} />
                {/* Slow Inner Spin */}
                <div className="absolute inset-3 rounded-full border-[3px] border-white/20 border-b-transparent" style={{ animation: 'spin-reverse 2s linear infinite' }} />
                {/* Inner Glow */}
                <div className="absolute inset-0 rounded-full bg-brand-accent/20 blur-2xl animate-pulse" />
                {/* Center Icon */}
                <div className="absolute inset-0 flex items-center justify-center text-brand-accent" style={{ animation: 'bounce 2s infinite' }}>
                  <Sparkles size={40} />
                </div>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 mb-4 tracking-tight drop-shadow-md">
                Architecting your path...
              </h2>
              <p className="text-white/50 text-sm sm:text-base text-center max-w-xs leading-relaxed animate-pulse">
                Our AI is analyzing your goals and building a custom step-by-step roadmap.
              </p>
            </div>
          ) : (
            /* Standard Generation Form */
            <form onSubmit={handleGenerate} className="space-y-8 sm:space-y-10 relative z-10 animate-in fade-in duration-500">
              <div className="text-center mb-8 sm:mb-12">
                <h1 className="text-3xl sm:text-5xl font-extrabold mb-4 sm:mb-5 bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent tracking-tight drop-shadow-md">
                  What do you want to learn?
                </h1>
                <p className="text-white/50 text-sm sm:text-lg max-w-md mx-auto leading-relaxed font-medium">
                  Our AI will architect a personalized, step-by-step roadmap specifically for your journey.
                </p>
              </div>

              {error && <p className="text-red-400 text-sm text-center bg-red-400/10 p-4 rounded-xl border border-red-400/20 shadow-inner">{error}</p>}

              <div className="space-y-6 sm:space-y-8">
                {/* Goal Input */}
                <div className="group">
                  <label className="block text-xs sm:text-sm font-bold text-white/80 mb-2 sm:mb-3 ml-2 flex items-center gap-2">
                    <Sparkle size={12} className="text-brand-accent" /> Your Goal
                  </label>
                  <div className="relative">
                    <div className="absolute top-[18px] sm:top-5 left-4 sm:left-5 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 pointer-events-none text-brand-accent">
                      <Target size={24} />
                    </div>
                    <textarea
                      className="w-full pl-12 sm:pl-14 pr-4 sm:pr-6 py-4 sm:py-5 rounded-2xl sm:rounded-3xl bg-black/20 border border-white/10 outline-none focus:bg-black/40 focus:border-brand-accent/60 focus:ring-2 focus:ring-brand-accent/30 hover:border-white/20 transition-all resize-none text-white/90 placeholder:text-white/20 shadow-inner text-base sm:text-lg font-medium"
                      placeholder="e.g. I want to become a backend developer in 4 months"
                      rows={3} value={goal} onChange={(e) => setGoal(e.target.value)} required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                  {/* Category Select */}
                  <div className="group">
                    <label className="block text-xs sm:text-sm font-bold text-white/80 mb-2 sm:mb-3 ml-2 flex items-center gap-2">
                      <Sparkle size={12} className="text-brand-accent" /> Category
                    </label>
                    <div className="relative">
                      <div className="absolute top-1/2 -translate-y-1/2 left-4 sm:left-5 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 pointer-events-none z-10 text-brand-accent">
                        <Puzzle size={22} />
                      </div>
                      <select
                        className="w-full pl-12 sm:pl-14 pr-10 sm:pr-12 py-4 sm:py-5 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 outline-none focus:bg-black/40 focus:border-brand-accent/60 focus:ring-2 focus:ring-brand-accent/30 hover:border-white/20 transition-all appearance-none text-white/90 cursor-pointer shadow-inner text-sm sm:text-base font-medium relative"
                        value={category} onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="Coding" className="bg-[#0F1E1A] text-white">Coding</option>
                        <option value="Design" className="bg-[#0F1E1A] text-white">Design</option>
                        <option value="Fitness" className="bg-[#0F1E1A] text-white">Fitness</option>
                        <option value="Career" className="bg-[#0F1E1A] text-white">Career</option>
                        <option value="Language" className="bg-[#0F1E1A] text-white">Language</option>
                        <option value="Skincare" className="bg-[#0F1E1A] text-white">Skincare</option>
                        <option value="Other" className="bg-[#0F1E1A] text-white">Other</option>
                      </select>
                      <div className="absolute top-1/2 -translate-y-1/2 right-4 sm:right-5 text-white/40 pointer-events-none">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  {/* Difficulty (Skill Level) Select */}
                  <div className="group">
                    <label className="block text-xs sm:text-sm font-bold text-white/80 mb-2 sm:mb-3 ml-2 flex items-center gap-2">
                      <Sparkle size={12} className="text-brand-accent" /> Difficulty
                    </label>
                    <div className="relative">
                      <div className="absolute top-1/2 -translate-y-1/2 left-4 sm:left-5 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 pointer-events-none z-10 text-brand-accent">
                        <Star size={22} />
                      </div>
                      <select
                        className="w-full pl-12 sm:pl-14 pr-10 sm:pr-12 py-4 sm:py-5 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 outline-none focus:bg-black/40 focus:border-brand-accent/60 focus:ring-2 focus:ring-brand-accent/30 hover:border-white/20 transition-all appearance-none text-white/90 cursor-pointer shadow-inner text-sm sm:text-base font-medium relative"
                        value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)}
                      >
                        <option value="beginner" className="bg-[#0F1E1A] text-white">Beginner</option>
                        <option value="intermediate" className="bg-[#0F1E1A] text-white">Intermediate</option>
                        <option value="advanced" className="bg-[#0F1E1A] text-white">Advanced</option>
                      </select>
                      <div className="absolute top-1/2 -translate-y-1/2 right-4 sm:right-5 text-white/40 pointer-events-none">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  {/* Hours / Week Input */}
                  <div className="group">
                    <label className="block text-xs sm:text-sm font-bold text-white/80 mb-2 sm:mb-3 ml-2 flex items-center gap-2">
                      <Sparkle size={12} className="text-brand-accent" /> Hours / Week
                    </label>
                    <div className="relative">
                      <div className="absolute top-1/2 -translate-y-1/2 left-4 sm:left-5 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 pointer-events-none text-brand-accent">
                        <Clock size={22} />
                      </div>
                      <input
                        className="w-full pl-12 sm:pl-14 pr-16 sm:pr-20 py-4 sm:py-5 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 outline-none focus:bg-black/40 focus:border-brand-accent/60 focus:ring-2 focus:ring-brand-accent/30 hover:border-white/20 transition-all text-white/90 shadow-inner text-sm sm:text-base font-medium"
                        type="number" min={1} max={100}
                        value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)}
                        required
                      />
                      <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-white/40 font-bold text-[10px] sm:text-xs uppercase tracking-wider pointer-events-none bg-white/5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg backdrop-blur-md border border-white/10">
                        hrs
                      </div>
                    </div>
                  </div>

                  {/* Public Toggle Switch */}
                  <div className="flex items-center justify-between p-4 rounded-xl sm:rounded-2xl bg-black/20 border border-white/10 hover:border-white/20 transition-all h-[56px] sm:h-[68px] mt-[26px] sm:mt-[38px]">
                    <div className="flex-1 pr-4">
                      <label className="block text-xs sm:text-sm font-bold text-white/90">Make this roadmap public</label>
                      <span className="block text-[10px] sm:text-xs text-white/50 leading-tight">Other users can discover and clone it</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPublic(!isPublic)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${isPublic ? 'bg-brand-accent' : 'bg-white/10'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-[#0F1E1A] transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6 sm:pt-8">
                <Button className="w-full py-4 sm:py-5 text-lg sm:text-xl font-black tracking-wide shadow-[0_10px_40px_rgba(255,255,255,0.15)] transition-all duration-500 rounded-xl sm:rounded-2xl hover:shadow-[0_20px_50px_rgba(255,255,255,0.25)] hover:-translate-y-1.5 flex items-center justify-center gap-2">
                  Generate My Roadmap <Sparkles size={20} />
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
