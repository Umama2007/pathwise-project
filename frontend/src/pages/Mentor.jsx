import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Bot } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

export default function Mentor({ session }) {
  const { id } = useParams()
  const location = useLocation()
  const { roadmapTitle, currentMilestone } = location.state || {}

  const [messages, setMessages] = useState([
    { sender: 'ai', content: `Hi! I'm your AI mentor for your journey in "${roadmapTitle || 'this roadmap'}". How can I help you today?` },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(e) {
    e.preventDefault()
    if (!input.trim()) return
    const userMsg = { sender: 'user', content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/mentor/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: userMsg.content, roadmapTitle, currentMilestone, roadmapId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages((prev) => [...prev, { sender: 'ai', content: data.reply }])
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'ai', content: `Error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen text-[#F3EFE2] relative overflow-hidden flex flex-col items-center">
      
      {/* Shared Cinematic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000")' }} />
        <div className="absolute inset-0 bg-[#0F1E1A]/70 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F1E1A]/95 via-[#0F1E1A]/80 to-[#4FD1C5]/20 backdrop-blur-[4px]" />
      </div>

      <div className="fixed top-0 left-1/4 w-96 h-96 bg-[#4FD1C5]/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/4 w-[30rem] h-[30rem] bg-[#4FD1C5]/5 rounded-full blur-[150px] pointer-events-none z-0" />

      {/* Floating Premium Navigation Bar */}
      <div className="fixed top-0 z-50 pt-2 sm:pt-6 px-2 sm:px-6 flex justify-center pointer-events-none transition-all w-full">
        <nav className="pointer-events-auto flex w-full max-w-6xl justify-between items-center backdrop-blur-2xl bg-white/90 border border-white/40 px-2 sm:px-3 py-2 sm:py-3 rounded-2xl sm:rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.6)] transition-all">
          
          <div className="flex items-center gap-2 sm:gap-6">
            <Link to="/" className="bg-[#0F1E1A] text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-black text-sm sm:text-lg tracking-wide shadow-[0_5px_15px_rgba(15,30,26,0.2)] hover:scale-105 hover:text-brand-accent transition-all duration-300 cursor-pointer relative z-10 block">
              Pathwise
            </Link>

            {/* Aesthetic Links */}
            <div className="flex items-center gap-3 sm:gap-6 pl-2 sm:pl-4 border-l border-black/10 text-xs sm:text-sm">
              <Link to="/" className="font-semibold text-black/40 hover:text-[#0F1E1A] transition-colors cursor-pointer flex items-center gap-2">
                Dashboard
              </Link>
              <Link to="/explore" className="font-semibold text-black/40 hover:text-[#0F1E1A] transition-colors cursor-pointer flex items-center gap-2">
                Explore
              </Link>
              <Link to="/community" className="font-semibold text-black/40 hover:text-[#0F1E1A] transition-colors cursor-pointer flex items-center gap-2">
                Community
              </Link>
              <span className="font-extrabold text-[#0F1E1A] cursor-pointer flex items-center gap-1 relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-[2px] sm:after:h-[3px] after:bg-[#0F1E1A] after:rounded-full">
                Mentor
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 pr-1">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-black/5 border border-black/5 hover:bg-black/10 transition-colors cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-accent to-[#0F1E1A] flex items-center justify-center shadow-inner">
                <span className="text-[11px] font-bold text-white uppercase">{session?.user?.email?.[0] || 'U'}</span>
              </div>
              <span className="text-sm text-black/80 font-bold">{session?.user?.email?.split('@')[0] || 'User'}</span>
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

      {/* Main Chat Interface Container */}
      <main className="relative z-10 w-full max-w-4xl px-4 mt-24 sm:mt-28 mb-8 flex-1 flex flex-col h-[calc(100vh-8rem)]">
        
        {/* Header / Back Link */}
        <div className="flex justify-between items-center mb-6">
          <Link to={`/roadmap/${id}`} className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white text-white/70 transition-all duration-300 group text-xs sm:text-sm font-semibold tracking-wide shadow-sm hover:shadow-[0_5px_15px_rgba(0,0,0,0.3)] backdrop-blur-md">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Roadmap
          </Link>
          
          <div className="flex items-center gap-2 bg-brand-accent/10 px-4 py-1.5 rounded-full border border-brand-accent/20">
            <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></span>
            <span className="text-brand-accent text-xs font-bold uppercase tracking-widest">Mentor Online</span>
          </div>
        </div>

        {/* Premium Glassmorphism Chat Box */}
        <div className="flex-1 flex flex-col relative rounded-3xl sm:rounded-[3rem] bg-gradient-to-br from-[#142420]/80 to-[#0F1E1A]/95 backdrop-blur-[40px] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden">
          {/* Subtle Grid */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik00MCAwaC0xdjQwTTAgNDBoNDB2LTEiIHN0cm9rZT0icmdiYSsyNTUsMjU1LDI1NSwwLjAzKSIvPjwvc3ZnPg==')] opacity-30 pointer-events-none" />

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 relative z-10 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex w-full ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.sender === 'ai' && (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-brand-accent to-[#0F1E1A] flex items-center justify-center shadow-[0_0_15px_rgba(79,209,197,0.3)] mr-3 sm:mr-4 flex-shrink-0 border border-brand-accent/30 text-brand-accent">
                    <Bot size={20} className="sm:w-5 sm:h-5 w-4 h-4" />
                  </div>
                )}
                <div 
                  className={`p-4 sm:p-5 max-w-[85%] sm:max-w-[75%] text-sm sm:text-base leading-relaxed ${
                    m.sender === 'user' 
                      ? 'bg-brand-accent text-[#0F1E1A] rounded-2xl rounded-tr-sm shadow-[0_10px_25px_rgba(79,209,197,0.2)] font-medium' 
                      : 'bg-black/40 border border-white/5 text-white/90 rounded-2xl rounded-tl-sm shadow-[0_10px_30px_rgba(0,0,0,0.2)] backdrop-blur-md'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex w-full justify-start animate-in fade-in">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-brand-accent to-[#0F1E1A] flex items-center justify-center shadow-[0_0_15px_rgba(79,209,197,0.3)] mr-3 sm:mr-4 flex-shrink-0 border border-brand-accent/30 text-brand-accent">
                  <Bot size={20} className="sm:w-5 sm:h-5 w-4 h-4 animate-pulse" />
                </div>
                <div className="p-4 sm:p-5 rounded-2xl rounded-tl-sm bg-black/40 border border-white/5 backdrop-blur-md flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-brand-accent/60 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-brand-accent/60 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-brand-accent/60 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="relative z-10 p-4 sm:p-6 bg-[#0F1E1A]/80 backdrop-blur-2xl border-t border-white/5">
            <form onSubmit={sendMessage} className="relative flex items-center">
              <input
                className="w-full pl-6 pr-16 sm:pr-32 py-4 sm:py-5 rounded-xl sm:rounded-2xl bg-black/30 border border-white/10 outline-none focus:bg-black/50 focus:border-brand-accent/60 focus:ring-1 focus:ring-brand-accent/50 hover:border-white/20 transition-all text-white/90 placeholder:text-white/30 shadow-inner text-sm sm:text-base font-medium"
                placeholder="Ask your mentor a question..."
                value={input} onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button 
                disabled={loading || !input.trim()} 
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-brand-accent text-[#0F1E1A] shadow-[0_0_15px_rgba(79,209,197,0.4)] hover:shadow-[0_0_25px_rgba(79,209,197,0.6)] hover:scale-110 transition-all duration-300 disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none disabled:cursor-not-allowed group"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:-translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
              </button>
            </form>
          </div>
          
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  )
}
