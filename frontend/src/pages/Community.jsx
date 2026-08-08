import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Button from '../components/Button'
import { 
  Trophy, 
  Sparkles, 
  MessageCircle, 
  Mail, 
  Flame, 
  CheckCircle, 
  Copy, 
  Trash2, 
  Send 
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

export default function Community({ session }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardTab, setLeaderboardTab] = useState('streak') // streak, completed, cloned
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true)

  const [stories, setStories] = useState([])
  const [loadingStories, setLoadingStories] = useState(true)

  // Share story form states
  const [userRoadmaps, setUserRoadmaps] = useState([])
  const [selectedRoadmapId, setSelectedRoadmapId] = useState('')
  const [storyContent, setStoryContent] = useState('')
  const [sharing, setSharing] = useState(false)

  // General Toast state
  const [toastMessage, setToastMessage] = useState(null)

  useEffect(() => {
    fetchLeaderboard()
  }, [leaderboardTab])

  useEffect(() => {
    fetchStories()
    if (session) {
      fetchUserRoadmaps()
    }
  }, [session])

  function showToast(msg) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  async function fetchLeaderboard() {
    setLoadingLeaderboard(true)
    try {
      const res = await fetch(`${API_URL}/api/community/leaderboard?sort=${leaderboardTab}`)
      const data = await res.json()
      if (res.ok) {
        setLeaderboard(data)
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
    } finally {
      setLoadingLeaderboard(false)
    }
  }

  async function fetchStories() {
    setLoadingStories(true)
    try {
      const res = await fetch(`${API_URL}/api/community/stories`)
      const data = await res.json()
      if (res.ok) {
        setStories(data)
      }
    } catch (err) {
      console.error('Error fetching stories:', err)
    } finally {
      setLoadingStories(false)
    }
  }

  async function fetchUserRoadmaps() {
    try {
      const { data } = await supabase
        .from('roadmaps')
        .select('id, title')
        .eq('user_id', session.user.id)
      setUserRoadmaps(data || [])
    } catch (err) {
      console.error('Error fetching user roadmaps:', err)
    }
  }

  async function handleShareStory(e) {
    e.preventDefault()
    if (!storyContent.trim()) return
    setSharing(true)
    try {
      const res = await fetch(`${API_URL}/api/community/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: storyContent,
          roadmap_id: selectedRoadmapId || null
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setStories(prev => [data, ...prev])
        setStoryContent('')
        setSelectedRoadmapId('')
        showToast('Success story shared!')
      } else {
        showToast(data.error || 'Failed to share story')
      }
    } catch (err) {
      console.error('Error sharing story:', err)
      showToast('Error sharing story')
    } finally {
      setSharing(false)
    }
  }

  async function handleDeleteStory(storyId) {
    if (!window.confirm('Are you sure you want to delete this story?')) return
    try {
      const res = await fetch(`${API_URL}/api/community/stories/${storyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      })
      if (res.ok) {
        setStories(prev => prev.filter(s => s.id !== storyId))
        showToast('Story deleted successfully')
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to delete story')
      }
    } catch (err) {
      console.error('Error deleting story:', err)
      showToast('Error deleting story')
    }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen text-[#F3EFE2] relative overflow-hidden flex flex-col items-center">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl bg-white text-[#0F1E1A] font-extrabold shadow-2xl border border-brand-accent animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Cinematic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000")' }}
        />
        <div className="absolute inset-0 bg-[#0F1E1A]/70 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F1E1A]/95 via-[#0F1E1A]/80 to-[#4FD1C5]/20 backdrop-blur-[4px]" />
      </div>

      <div className="fixed top-0 left-1/4 w-96 h-96 bg-[#4FD1C5]/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/4 w-[30rem] h-[30rem] bg-[#4FD1C5]/5 rounded-full blur-[150px] pointer-events-none z-0" />

      {/* Sticky Navbar */}
      <div className="sticky top-0 z-50 pt-2 sm:pt-6 px-2 sm:px-6 flex justify-center pointer-events-none transition-all w-full">
        <nav className="pointer-events-auto flex w-full max-w-6xl justify-between items-center backdrop-blur-2xl bg-white/90 border border-white/40 px-2 sm:px-3 py-2 sm:py-3 rounded-2xl sm:rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.6)] transition-all">
          <div className="flex items-center gap-2 sm:gap-6">
            <Link to="/" className="bg-[#0F1E1A] text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-black text-sm sm:text-lg tracking-wide shadow-[0_5px_15px_rgba(15,30,26,0.2)] hover:scale-105 hover:text-brand-accent transition-all duration-300 cursor-pointer relative z-10 block">
              Pathwise
            </Link>

            <div className="flex items-center gap-3 sm:gap-6 pl-2 sm:pl-4 border-l border-black/10 text-xs sm:text-sm">
              <Link to="/" className="font-semibold text-black/40 hover:text-[#0F1E1A] transition-colors cursor-pointer">
                Dashboard
              </Link>
              <Link to="/explore" className="font-semibold text-black/40 hover:text-[#0F1E1A] transition-colors cursor-pointer">
                Explore
              </Link>
              <Link to="/community" className="font-extrabold text-[#0F1E1A] cursor-pointer flex items-center gap-1 relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-[2px] sm:after:h-[3px] after:bg-[#0F1E1A] after:rounded-full">
                Community
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 pr-1">
            {session && (
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-black/5 border border-black/5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-accent to-[#0F1E1A] flex items-center justify-center shadow-inner">
                  <span className="text-[11px] font-bold text-white uppercase">{session?.user?.email?.[0] || 'U'}</span>
                </div>
                <span className="text-sm text-black/80 font-bold">{session?.user?.email?.split('@')[0] || 'User'}</span>
              </div>
            )}

            {session ? (
              <button 
                onClick={logout} 
                className="text-xs sm:text-sm font-bold pl-3 sm:pl-5 pr-2 sm:pr-4 py-2 sm:py-2.5 rounded-full border-2 border-[#0F1E1A] text-[#0F1E1A] hover:text-white hover:bg-[#0F1E1A] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,30,26,0.3)] transition-all duration-300 group flex items-center gap-1 sm:gap-2 pointer-events-auto"
              >
                Log out
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            ) : (
              <Link 
                to="/login"
                className="text-xs sm:text-sm font-bold px-5 py-2 rounded-full bg-[#0F1E1A] text-white hover:brightness-110 transition-all pointer-events-auto"
              >
                Log In
              </Link>
            )}
          </div>
        </nav>
      </div>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-5xl px-4 py-8 sm:py-12 pb-24">
        
        {/* Hero Header */}
        <div className="relative mb-12 p-8 sm:p-12 rounded-[2.5rem] bg-gradient-to-br from-[#142420]/95 to-[#0F1E1A]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="absolute top-0 right-0 w-72 h-72 bg-brand-accent/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/3 translate-x-1/3" />
          <div className="relative z-10">
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">Pathwise Community</h1>
            <p className="text-white/70 text-base sm:text-lg max-w-xl leading-relaxed">
              Connect with fellow learners, track daily learning streaks, inspect accomplishments, and share success stories.
            </p>
          </div>
          <div className="flex-shrink-0 relative z-10">
            <Trophy size={64} className="text-brand-accent animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mb-12">
          
          {/* Leaderboard Section (2/3 columns on large screen) */}
          <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-[#142420]/80 backdrop-blur-xl border border-white/5 shadow-xl flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Trophy className="text-brand-accent" size={24} /> Leaderboard
              </h2>
              
              {/* Leaderboard Tabs */}
              <div className="flex rounded-xl bg-black/30 p-1 border border-white/5 w-full sm:w-auto">
                {[
                  { id: 'streak', label: 'Streaks', icon: Flame },
                  { id: 'completed', label: 'Completed', icon: CheckCircle },
                  { id: 'cloned', label: 'Clones', icon: Copy }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setLeaderboardTab(t.id)}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      leaderboardTab === t.id 
                        ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/20'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <t.icon size={14} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingLeaderboard ? (
              <div className="space-y-3 py-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-white/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : leaderboard.length > 0 ? (
              <div className="space-y-2.5">
                {leaderboard.map((user, idx) => {
                  const isCurrentUser = session && user.user_id === session.user.id
                  const valueSuffix = leaderboardTab === 'streak' 
                    ? 'day streak' 
                    : leaderboardTab === 'completed'
                    ? 'completed'
                    : 'clones received'
                  const value = leaderboardTab === 'streak'
                    ? user.current_streak
                    : leaderboardTab === 'completed'
                    ? user.roadmaps_completed
                    : user.clones_received

                  return (
                    <div 
                      key={user.user_id}
                      className={`flex items-center justify-between p-4 rounded-2xl transition-all border ${
                        isCurrentUser 
                          ? 'bg-brand-accent/15 border-brand-accent/30 text-white' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className={`w-6 text-center text-sm font-black ${
                          idx === 0 
                            ? 'text-yellow-400' 
                            : idx === 1 
                            ? 'text-gray-300' 
                            : idx === 2 
                            ? 'text-amber-600' 
                            : 'text-white/30'
                        }`}>
                          #{idx + 1}
                        </span>
                        
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-accent to-[#0F1E1A] flex items-center justify-center shadow-inner font-extrabold text-xs uppercase text-white">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            user.name?.[0] || 'U'
                          )}
                        </div>

                        <div>
                          <span className="font-bold text-sm block">
                            {user.name || 'Anonymous User'} 
                            {isCurrentUser && <span className="ml-2 text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-brand-accent text-[#0F1E1A]">You</span>}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-black text-sm text-brand-accent flex items-center gap-1">
                        {leaderboardTab === 'streak' && <Flame size={14} className="text-amber-500 fill-amber-500/25" />}
                        {value} <span className="text-[10px] font-normal text-white/50 lowercase ml-1">{valueSuffix}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-white/40 italic">
                No stats recorded on this leaderboard yet. Keep learning to score!
              </div>
            )}
          </div>

          {/* Share Story Card (1/3 columns on large screen) */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#142420]/80 backdrop-blur-xl border border-white/5 shadow-xl">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mb-4">
              <Sparkles className="text-brand-accent" size={24} /> Share Success
            </h2>
            
            {session ? (
              <form onSubmit={handleShareStory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase mb-2">Linked Roadmap (Optional)</label>
                  <select
                    value={selectedRoadmapId}
                    onChange={(e) => setSelectedRoadmapId(e.target.value)}
                    className="w-full bg-[#0F1E1A] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-accent cursor-pointer"
                  >
                    <option value="">No Linked Roadmap</option>
                    {userRoadmaps.map(r => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase mb-2">Your Story</label>
                  <textarea
                    rows={4}
                    value={storyContent}
                    onChange={(e) => setStoryContent(e.target.value)}
                    required
                    placeholder="Describe how you conquered your goals, solved tough milestones, or kept up your streak!"
                    className="w-full bg-[#0F1E1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent placeholder:text-white/20 resize-none"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={sharing || !storyContent.trim()}
                  className="w-full py-3 text-sm font-extrabold flex items-center justify-center gap-2"
                >
                  <Send size={14} /> {sharing ? 'Sharing...' : 'Post success story'}
                </Button>
              </form>
            ) : (
              <div className="py-8 text-center text-white/40 italic flex flex-col items-center gap-4">
                <p className="text-sm">Log in to share your learning milestones and success stories with the community.</p>
                <Link to="/login">
                  <Button className="py-2.5 px-6 text-xs font-extrabold">Log In</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Success Stories Feed */}
        <div className="mb-12">
          <h2 className="text-2xl font-black text-white flex items-center gap-2 mb-6 px-2">
            <Sparkles className="text-brand-accent animate-pulse" size={24} /> Success Stories
          </h2>

          {loadingStories ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-44 bg-white/5 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : stories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stories.map(story => {
                const isAuthor = session && story.user_id === session.user.id
                return (
                  <div 
                    key={story.id}
                    className="relative p-6 sm:p-8 rounded-3xl bg-[#142420]/80 backdrop-blur-xl border border-white/5 hover:border-brand-accent/20 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Author Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-accent to-[#0F1E1A] flex items-center justify-center font-extrabold text-xs uppercase text-white shadow-inner">
                            {story.profiles?.avatar_url ? (
                              <img src={story.profiles?.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              story.profiles?.name?.[0] || 'U'
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-white/90 block">{story.profiles?.name || 'Anonymous User'}</span>
                            <span className="text-[10px] text-white/40">{new Date(story.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>

                        {isAuthor && (
                          <button
                            onClick={() => handleDeleteStory(story.id)}
                            className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {/* Content */}
                      <p className="text-white/70 text-sm leading-relaxed mb-6 font-medium whitespace-pre-wrap">
                        {story.content}
                      </p>
                    </div>

                    {/* Linked Roadmap Chip */}
                    {story.roadmaps?.title && (
                      <div className="mt-auto pt-4 border-t border-white/5 flex">
                        <Link 
                          to={`/roadmap/${story.roadmap_id}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-accent/10 border border-brand-accent/25 text-brand-accent text-xs font-bold hover:bg-brand-accent/20 transition-all"
                        >
                          <CheckCircle size={12} />
                          Roadmap: {story.roadmaps?.title}
                        </Link>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-20 text-center rounded-3xl bg-[#142420]/40 border border-white/5 border-dashed">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-accent/10 flex items-center justify-center">
                <Sparkles className="text-brand-accent" size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No success stories shared yet</h3>
              <p className="text-white/50 text-sm max-w-sm mx-auto">Be the first to share your learning milestones and successes with the community!</p>
            </div>
          )}
        </div>

        {/* Contact Support Section */}
        <div className="p-8 sm:p-10 rounded-3xl bg-[#142420]/80 backdrop-blur-xl border border-white/5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent border border-brand-accent/20">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Get in Touch</h3>
              <p className="text-sm text-white/50">Need assistance or have feedback? Reach out to the Pathwise developer team at <span className="text-brand-accent font-bold">byteum.dev@gmail.com</span>.</p>
            </div>
          </div>
          <div>
            <a 
              href="mailto:byteum.dev@gmail.com"
              onClick={(e) => {
                navigator.clipboard.writeText('byteum.dev@gmail.com');
                showToast('Email copied to clipboard: byteum.dev@gmail.com');
              }}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-brand-accent text-[#0F1E1A] font-extrabold text-sm shadow-[0_5px_15px_rgba(79,209,197,0.3)] hover:brightness-110 hover:-translate-y-0.5 transition-all duration-300"
            >
              <Mail size={16} /> Contact Us
            </a>
          </div>
        </div>

      </main>
    </div>
  )
}
