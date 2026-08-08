import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Button from '../components/Button'
import { Bot, Settings, GraduationCap, Printer, FileText, Lightbulb, CheckCircle, MessageSquare, Send, Trash2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

export default function RoadmapDetail({ session }) {
  const { id } = useParams()
  const [roadmap, setRoadmap] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Visibility & settings states
  const [settingsError, setSettingsError] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  // F1: track which milestone is expanded + cached data per milestone
  const [expandedId, setExpandedId] = useState(null)
  const [milestoneData, setMilestoneData] = useState({}) // { [milestoneId]: { subtopics, resources } }
  const [loadingExpand, setLoadingExpand] = useState(null)

  // F1: "Explain this" inline AI replies per subtopic
  const [explanations, setExplanations] = useState({}) // { [subtopicId]: string }
  const [loadingExplain, setLoadingExplain] = useState(null)
  const [expandedExplain, setExpandedExplain] = useState(null)

  // F2: quiz state per milestone
  const [quizData, setQuizData] = useState({}) // { [milestoneId]: { questions, quizId } }
  const [quizAnswers, setQuizAnswers] = useState({}) // { [milestoneId]: [index, ...] }
  const [quizResult, setQuizResult] = useState({}) // { [milestoneId]: { score, total, passed } }
  const [loadingQuiz, setLoadingQuiz] = useState(null)
  const [showQuiz, setShowQuiz] = useState(null)

  // Comments states
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [loadingComments, setLoadingComments] = useState(true)

  useEffect(() => { 
    loadData()
    fetchComments()
  }, [id])

  async function fetchComments() {
    setLoadingComments(true)
    try {
      const res = await fetch(`${API_URL}/api/roadmaps/${id}/comments`)
      const data = await res.json()
      if (res.ok) {
        setComments(data)
      }
    } catch (err) {
      console.error('Error fetching comments:', err)
    } finally {
      setLoadingComments(false)
    }
  }

  async function handleCommentSubmit(e) {
    e.preventDefault()
    if (!newComment.trim() || submittingComment) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`${API_URL}/api/roadmaps/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: newComment })
      })
      const data = await res.json()
      if (res.ok) {
        setComments(prev => [data, ...prev])
        setNewComment('')
        showToast('Comment added!')
      } else {
        showToast(data.error || 'Failed to submit comment')
      }
    } catch (err) {
      console.error('Error adding comment:', err)
      showToast('Error adding comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  async function handleCommentDelete(commentId) {
    if (!window.confirm('Are you sure you want to delete this comment?')) return
    try {
      const res = await fetch(`${API_URL}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId))
        showToast('Comment deleted!')
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to delete comment')
      }
    } catch (err) {
      console.error('Error deleting comment:', err)
      showToast('Error deleting comment')
    }
  }

  async function loadData() {
    const { data: roadmapData } = await supabase.from('roadmaps').select('*').eq('id', id).single()
    const { data: milestoneData } = await supabase
      .from('roadmap_milestones')
      .select('*')
      .eq('roadmap_id', id)
      .order('order_index', { ascending: true })
    setRoadmap(roadmapData)
    setMilestones(milestoneData || [])
    setLoading(false)
  }

  function showToast(msg) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  async function updateSettings(updates) {
    setSettingsError(null)
    try {
      const res = await fetch(`${API_URL}/api/roadmaps/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update settings')
      setRoadmap(data.roadmap)
      showToast('Roadmap settings updated!')
    } catch (err) {
      setSettingsError(err.message)
    }
  }

  async function togglePublicVisibility() {
    setSettingsError(null)
    const nextPublic = !roadmap.is_public
    if (nextPublic) {
      if (!roadmap.category || !roadmap.difficulty) {
        setSettingsError('Please select both a Category and Difficulty before making this roadmap public.')
        return
      }
    }
    
    try {
      const res = await fetch(`${API_URL}/api/roadmaps/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ is_public: nextPublic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update visibility')
      setRoadmap(data.roadmap)
      showToast(nextPublic ? 'Roadmap is now public!' : 'Roadmap is now private!')
    } catch (err) {
      setSettingsError(err.message)
    }
  }

  async function toggleMilestone(m) {
    const newStatus = m.status === 'completed' ? 'not_started' : 'completed'
    // Optimistic UI update
    setMilestones(prev => prev.map(milestone => milestone.id === m.id ? { ...milestone, status: newStatus } : milestone))
    await supabase.from('roadmap_milestones').update({ status: newStatus }).eq('id', m.id)
  }

  // F1: expand/collapse a milestone, fetch subtopics on first open
  async function handleExpand(m) {
    if (expandedId === m.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(m.id)

    // already loaded? skip
    if (milestoneData[m.id]) return

    // check if subtopics already exist in DB (from a previous session)
    const { data: existingSubs } = await supabase
      .from('milestone_subtopics')
      .select('*')
      .eq('milestone_id', m.id)
      .order('order_index', { ascending: true })

    if (existingSubs && existingSubs.length > 0) {
      // also fetch linked resources
      const { data: linkedRes } = await supabase
        .from('milestone_resources')
        .select('resource_id, resources(id, title, url, format)')
        .eq('milestone_id', m.id)
      const resources = (linkedRes || []).map(lr => lr.resources).filter(Boolean)
      setMilestoneData(prev => ({ ...prev, [m.id]: { subtopics: existingSubs, resources } }))
      return
    }

    // first time — call the AI expand endpoint
    setLoadingExpand(m.id)
    try {
      const res = await fetch(`${API_URL}/api/milestones/${m.id}/expand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMilestoneData(prev => ({ ...prev, [m.id]: { subtopics: data.subtopics, resources: data.resources } }))
    } catch (err) {
      console.error('Expand failed:', err)
    } finally {
      setLoadingExpand(null)
    }
  }

  // F1: "Explain this" — ask the AI mentor about a subtopic
  async function handleExplain(subtopic) {
    if (expandedExplain === subtopic.id) {
      setExpandedExplain(null)
      return
    }
    setExpandedExplain(subtopic.id)

    // already explained? show it
    if (explanations[subtopic.id]) return

    setLoadingExplain(subtopic.id)
    try {
      const res = await fetch(`${API_URL}/api/mentor/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: `Explain this topic to me in simple terms: "${subtopic.title}"`,
          roadmapTitle: roadmap?.title,
          currentMilestone: subtopic.title,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setExplanations(prev => ({ ...prev, [subtopic.id]: data.reply }))
    } catch (err) {
      setExplanations(prev => ({ ...prev, [subtopic.id]: `Error: ${err.message}` }))
    } finally {
      setLoadingExplain(null)
    }
  }

  // F2: generate or show quiz for a milestone
  async function handleQuiz(milestoneId) {
    if (showQuiz === milestoneId) {
      setShowQuiz(null)
      return
    }
    setShowQuiz(milestoneId)

    // already have quiz data? show it
    if (quizData[milestoneId]) return

    setLoadingQuiz(milestoneId)
    try {
      const res = await fetch(`${API_URL}/api/milestones/${milestoneId}/quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuizData(prev => ({ ...prev, [milestoneId]: data }))
      setQuizAnswers(prev => ({ ...prev, [milestoneId]: new Array(data.questions.length).fill(null) }))
    } catch (err) {
      console.error('Quiz generation failed:', err)
    } finally {
      setLoadingQuiz(null)
    }
  }

  // F2: submit quiz answers for grading
  async function handleGradeQuiz(milestoneId) {
    setLoadingQuiz(milestoneId)
    try {
      const res = await fetch(`${API_URL}/api/milestones/${milestoneId}/quiz/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ answers: quizAnswers[milestoneId] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuizResult(prev => ({ ...prev, [milestoneId]: data }))

      // auto-complete milestone if score >= 80%
      if (data.passed) {
        const milestone = milestones.find(m => m.id === milestoneId)
        if (milestone && milestone.status !== 'completed') {
          toggleMilestone(milestone)
        }
      }
    } catch (err) {
      console.error('Grading failed:', err)
    } finally {
      setLoadingQuiz(null)
    }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1E1A] text-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const completedCount = milestones.filter((m) => m.status === 'completed').length
  const progressPct = milestones.length ? Math.round((completedCount / milestones.length) * 100) : 0
  const currentMilestone = milestones.find((m) => m.status !== 'completed')?.title || 'All done!'

  // format badge color based on resource format
  function formatBadge(format) {
    const colors = {
      video: 'bg-red-500/20 text-red-300 border-red-500/30',
      article: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      docs: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    }
    return colors[format] || colors.article
  }

  const isOwner = roadmap && session && roadmap.user_id === session.user.id

  return (
    <div className="min-h-screen text-[#F3EFE2] relative overflow-hidden flex flex-col items-center">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl bg-white text-[#0F1E1A] font-extrabold shadow-2xl border border-brand-accent animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Shared Cinematic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none print:hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000")' }} />
        <div className="absolute inset-0 bg-[#0F1E1A]/70 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F1E1A]/95 via-[#0F1E1A]/80 to-[#4FD1C5]/20 backdrop-blur-[4px]" />
      </div>

      <div className="fixed top-0 left-1/4 w-96 h-96 bg-[#4FD1C5]/10 rounded-full blur-[120px] pointer-events-none z-0 print:hidden" />
      <div className="fixed bottom-0 right-1/4 w-[30rem] h-[30rem] bg-[#4FD1C5]/5 rounded-full blur-[150px] pointer-events-none z-0 print:hidden" />

      {/* Floating Premium Navigation Bar */}
      <div className="sticky top-0 z-50 pt-2 sm:pt-6 px-2 sm:px-6 flex justify-center pointer-events-none transition-all w-full print:hidden">
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
                Roadmap
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

      <main className="relative z-10 w-full max-w-4xl px-4 py-8 sm:py-12 pb-24">
        
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white text-white/70 transition-all duration-300 mb-6 sm:mb-8 group text-xs sm:text-sm font-semibold tracking-wide shadow-sm hover:shadow-[0_5px_15px_rgba(0,0,0,0.3)] backdrop-blur-md print:hidden">
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to Dashboard
        </Link>

        {/* Premium Header Box */}
        <div className="relative p-8 sm:p-12 mb-6 rounded-3xl sm:rounded-[3rem] bg-gradient-to-br from-[#142420]/80 to-[#0F1E1A]/95 backdrop-blur-[40px] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden print:shadow-none print:border-black/20 print:bg-white print:rounded-none">
          {/* Subtle Grid */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik00MCAwaC0xdjQwTTAgNDBoNDB2LTEiIHN0cm9rZT0icmdiYSsyNTUsMjU1LDI1NSwwLjAzKSIvPjwvc3ZnPg==')] opacity-40 pointer-events-none print:hidden" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="flex-1 text-left">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="text-3xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight drop-shadow-md print:text-black print:bg-none">{roadmap?.title}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  roadmap?.is_public 
                    ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' 
                    : 'bg-white/10 text-white/50 border border-white/20'
                }`}>
                  {roadmap?.is_public ? 'Public' : 'Private'}
                </span>
              </div>
              <p className="text-white/60 text-sm sm:text-base font-medium max-w-xl print:text-black/60">{roadmap?.goal}</p>
              
              {/* Progress Bar */}
              <div className="mt-8">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-brand-accent/80 print:text-black">Progress</span>
                  <span className="text-xs sm:text-sm font-bold text-white/60 print:text-black/60">{completedCount} / {milestones.length} milestones ({progressPct}%)</span>
                </div>
                <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner relative print:border-black/20 print:bg-gray-200">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-accent/80 to-brand-accent rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(79,209,197,0.5)] print:bg-black" 
                    style={{ width: `${progressPct}%` }} 
                  />
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 w-full md:w-auto flex flex-col sm:flex-row gap-3 print:hidden">
              {/* F4: Export as PDF button */}
              <button
                onClick={() => window.print()}
                className="py-3 sm:py-4 px-5 sm:px-6 text-sm sm:text-base rounded-xl bg-white/10 border border-white/20 text-white/80 hover:bg-white/20 hover:text-white font-bold transition-all duration-300 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Export PDF
              </button>

              <Link to={`/mentor/${id}`} state={{ roadmapTitle: roadmap?.title, currentMilestone }}>
                <Button className="w-full md:w-auto py-4 px-6 sm:px-8 text-sm sm:text-base shadow-[0_10px_30px_rgba(79,209,197,0.2)] hover:shadow-[0_15px_40px_rgba(79,209,197,0.3)] bg-brand-accent text-black font-bold flex items-center justify-center gap-2">
                  <Bot size={20} /> Ask AI Mentor
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Visibility Settings Panel (only for owners) */}
        {isOwner && (
          <div className="relative p-6 mb-10 rounded-3xl bg-[#142420]/60 backdrop-blur-md border border-white/5 shadow-lg text-left print:hidden">
            <h3 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
              <Settings size={18} className="text-white/70" /> Roadmap Settings
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase mb-2">Category</label>
                <select
                  value={roadmap.category || ''}
                  onChange={(e) => updateSettings({ category: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-accent cursor-pointer"
                >
                  <option value="" className="bg-[#0F1E1A]">Select Category</option>
                  <option value="Coding" className="bg-[#0F1E1A]">Coding</option>
                  <option value="Design" className="bg-[#0F1E1A]">Design</option>
                  <option value="Fitness" className="bg-[#0F1E1A]">Fitness</option>
                  <option value="Career" className="bg-[#0F1E1A]">Career</option>
                  <option value="Language" className="bg-[#0F1E1A]">Language</option>
                  <option value="Skincare" className="bg-[#0F1E1A]">Skincare</option>
                  <option value="Other" className="bg-[#0F1E1A]">Other</option>
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase mb-2">Difficulty</label>
                <select
                  value={roadmap.difficulty || ''}
                  onChange={(e) => updateSettings({ difficulty: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-accent cursor-pointer"
                >
                  <option value="" className="bg-[#0F1E1A]">Select Difficulty</option>
                  <option value="beginner" className="bg-[#0F1E1A]">Beginner</option>
                  <option value="intermediate" className="bg-[#0F1E1A]">Intermediate</option>
                  <option value="advanced" className="bg-[#0F1E1A]">Advanced</option>
                </select>
              </div>

              {/* Visibility Toggle Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5 h-[46px]">
                <span className="text-xs font-bold text-white/90">Public Visibility</span>
                <button
                  type="button"
                  onClick={togglePublicVisibility}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${roadmap.is_public ? 'bg-brand-accent' : 'bg-white/10'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-[#0F1E1A] transition-transform ${roadmap.is_public ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* Error Message */}
            {settingsError && (
              <p className="mt-3 text-xs text-red-400 font-semibold">{settingsError}</p>
            )}
          </div>
        )}

        {/* F4: Completion Certificate — only when 100% done */}
        {progressPct === 100 && (
          <div className="relative mb-10 p-8 sm:p-12 rounded-3xl border-2 border-brand-accent/40 bg-gradient-to-br from-[#142420]/90 to-[#0F1E1A]/95 backdrop-blur-[40px] shadow-[0_30px_80px_rgba(79,209,197,0.15),inset_0_1px_0_rgba(255,255,255,0.15)] text-center overflow-hidden print:border-2 print:border-black print:bg-white print:shadow-none print:rounded-none print:p-12">
            {/* decorative corner accents */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-brand-accent/50 rounded-tl-lg print:border-black" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-brand-accent/50 rounded-tr-lg print:border-black" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-brand-accent/50 rounded-bl-lg print:border-black" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-brand-accent/50 rounded-br-lg print:border-black" />

            <div className="flex justify-center mb-4 text-brand-accent print:text-black">
              <GraduationCap size={48} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-white mb-2 print:text-black print:bg-none">
              Roadmap Complete!
            </h2>
            <p className="text-lg font-bold text-white/80 mb-1 print:text-black">{roadmap?.title}</p>
            <p className="text-sm text-white/50 mb-6 print:text-black/50">
              Completed on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-sm text-white/40 mb-6 italic print:text-black/40">
              All {milestones.length} milestones completed • Pathwise Learning Platform
            </p>
            <button
              onClick={() => window.print()}
              className="py-3 px-6 text-sm rounded-xl bg-brand-accent text-[#0F1E1A] font-bold hover:brightness-110 transition-all print:hidden inline-flex items-center gap-2"
            >
              <Printer size={16} /> Print Certificate
            </button>
          </div>
        )}

        {/* Milestones List */}
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 ml-2 tracking-tight print:text-black">Your Milestones</h2>
          
          <div className="grid gap-4">
            {milestones.map((m, idx) => {
              const isExpanded = expandedId === m.id
              const mData = milestoneData[m.id]
              const isLoadingThis = loadingExpand === m.id

              return (
                <div key={m.id} className="group">
                  {/* Milestone Header Card */}
                  <div
                    className={`relative p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border transition-all duration-300 overflow-hidden backdrop-blur-md flex items-center gap-4 sm:gap-6
                      ${m.status === 'completed' 
                        ? 'bg-black/10 border-white/5 opacity-70 hover:opacity-100' 
                        : 'bg-black/30 border-white/10 hover:border-brand-accent/40 hover:bg-black/40 hover:shadow-[0_15px_40px_rgba(0,0,0,0.5)]'}
                      ${isExpanded ? 'rounded-b-none border-b-0' : ''}
                      print:bg-white print:border-black/10 print:opacity-100 print:shadow-none`}
                  >
                    {/* Subtle active glow for non-completed items */}
                    {m.status !== 'completed' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/0 via-brand-accent/0 to-brand-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    )}

                    {/* Number Badge */}
                    <div className={`hidden sm:flex flex-shrink-0 w-10 h-10 rounded-full items-center justify-center font-bold text-sm transition-colors duration-300 ${m.status === 'completed' ? 'bg-white/5 text-white/30' : 'bg-white/10 text-white/70 group-hover:text-white group-hover:bg-brand-accent/20'} print:bg-gray-100 print:text-black`}>
                      {idx + 1}
                    </div>

                    {/* Custom Checkbox — click stops propagation so it doesn't toggle expand */}
                    <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={m.status === 'completed'}
                        onChange={() => toggleMilestone(m)}
                        className="peer sr-only"
                      />
                      <div 
                        onClick={() => toggleMilestone(m)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 cursor-pointer
                        ${m.status === 'completed' 
                          ? 'bg-brand-accent border-brand-accent' 
                          : 'border-white/30 group-hover:border-brand-accent/60 group-hover:bg-brand-accent/10'}
                      `}>
                        <svg className={`w-4 h-4 sm:w-5 sm:h-5 text-[#0F1E1A] transition-all duration-300 ${m.status === 'completed' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                    </div>

                    {/* Content — click this area to expand */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleExpand(m)}>
                      <h3 className={`text-base sm:text-xl font-bold truncate transition-all duration-300 ${m.status === 'completed' ? 'text-white/40 line-through print:text-black/40' : 'text-white/90 group-hover:text-white print:text-black'}`}>
                        {m.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
                        <span className={`text-xs sm:text-sm font-semibold transition-colors duration-300 ${m.status === 'completed' ? 'text-white/20 print:text-black/20' : 'text-brand-accent/80 print:text-black/60'}`}>
                          ~{m.estimated_hours} hrs
                        </span>
                      </div>
                    </div>

                    {/* Expand chevron */}
                    <button onClick={() => handleExpand(m)} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors print:hidden">
                      <svg className={`w-5 h-5 text-white/40 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* F1 + F2: Expanded Content Panel */}
                  {isExpanded && (
                    <div className="p-5 sm:p-8 rounded-b-2xl sm:rounded-b-[2rem] bg-black/20 border border-t-0 border-white/10 backdrop-blur-md animate-fade-in-up print:bg-white print:border-black/10">
                      
                      {isLoadingThis ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="w-8 h-8 border-3 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
                          <span className="ml-3 text-white/50 text-sm font-medium">AI is breaking down this milestone…</span>
                        </div>
                      ) : mData ? (
                        <>
                          {/* Subtopics */}
                          {mData.subtopics?.length > 0 && (
                            <div className="mb-6">
                              <h4 className="text-sm font-bold uppercase tracking-wider text-brand-accent/70 mb-4 print:text-black">Subtopics</h4>
                              <div className="space-y-3">
                                {mData.subtopics.map((sub) => (
                                  <div key={sub.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors print:bg-gray-50 print:border-black/10">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        <h5 className="font-bold text-white/90 text-sm sm:text-base print:text-black">{sub.title}</h5>
                                        <p className="text-white/50 text-xs sm:text-sm mt-1 leading-relaxed print:text-black/50">{sub.summary}</p>
                                      </div>
                                      {/* "Explain this" button */}
                                      <button
                                        onClick={() => handleExplain(sub)}
                                        className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-brand-accent/10 text-brand-accent border border-brand-accent/20 hover:bg-brand-accent/20 transition-colors print:hidden inline-flex items-center gap-1.5"
                                      >
                                        {loadingExplain === sub.id ? (
                                          '...'
                                        ) : expandedExplain === sub.id ? (
                                          'Hide'
                                        ) : (
                                          <>
                                            <Lightbulb size={12} className="text-amber-400 fill-amber-400/20" /> Explain
                                          </>
                                        )}
                                      </button>
                                    </div>

                                    {/* Inline AI explanation */}
                                    {expandedExplain === sub.id && (
                                      <div className="mt-3 p-3 rounded-lg bg-brand-accent/5 border border-brand-accent/10 text-white/70 text-xs sm:text-sm leading-relaxed animate-fade-in-up">
                                        {loadingExplain === sub.id ? (
                                          <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
                                            <span>Thinking...</span>
                                          </div>
                                        ) : (
                                          <div>
                                            <span className="text-brand-accent font-bold text-xs mb-1 flex items-center gap-1.5">
                                              <Bot size={14} /> AI Mentor says:
                                            </span>
                                            {explanations[sub.id]}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Resources */}
                          {mData.resources?.length > 0 && (
                            <div className="mb-6">
                              <h4 className="text-sm font-bold uppercase tracking-wider text-brand-accent/70 mb-4 print:text-black">Resources</h4>
                              <div className="grid gap-2">
                                {mData.resources.map((r) => (
                                  <a
                                    key={r.id}
                                    href={r.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-brand-accent/30 hover:bg-white/10 transition-all group/res print:bg-gray-50 print:border-black/10"
                                  >
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${formatBadge(r.format)}`}>
                                      {r.format || 'article'}
                                    </span>
                                    <span className="flex-1 text-sm font-medium text-white/80 group-hover/res:text-white truncate print:text-black">{r.title}</span>
                                    <svg className="w-4 h-4 text-white/30 group-hover/res:text-brand-accent transition-colors flex-shrink-0 print:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* F2: Take Quiz button + Quiz UI */}
                          <div className="pt-4 border-t border-white/5 print:hidden">
                            <button
                              onClick={() => handleQuiz(m.id)}
                              className="text-sm font-bold px-5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white/80 hover:bg-white/20 hover:text-white transition-all flex items-center gap-2"
                            >
                              <FileText size={16} className="text-teal-400" />
                              {showQuiz === m.id ? 'Hide Quiz' : 'Take Quiz'}
                            </button>

                            {showQuiz === m.id && (
                              <div className="mt-4 animate-fade-in-up">
                                {loadingQuiz === m.id && !quizData[m.id] ? (
                                  <div className="flex items-center gap-2 py-6 justify-center">
                                    <div className="w-6 h-6 border-2 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-white/50 text-sm">Generating quiz…</span>
                                  </div>
                                ) : quizData[m.id] ? (
                                  <div className="space-y-4">
                                    {quizData[m.id].questions.map((q, qi) => (
                                      <div key={qi} className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <p className="text-sm font-bold text-white/90 mb-3">
                                          {qi + 1}. {q.question}
                                        </p>
                                        <div className="grid gap-2">
                                          {q.options.map((opt, oi) => (
                                            <label
                                              key={oi}
                                              className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all text-sm
                                                ${quizAnswers[m.id]?.[qi] === oi
                                                  ? 'bg-brand-accent/15 border-brand-accent/40 text-white'
                                                  : 'bg-white/5 border-white/5 text-white/60 hover:border-white/15 hover:text-white/80'
                                                }`}
                                            >
                                              <input
                                                type="radio"
                                                name={`quiz-${m.id}-q${qi}`}
                                                checked={quizAnswers[m.id]?.[qi] === oi}
                                                onChange={() => {
                                                  setQuizAnswers(prev => {
                                                    const updated = [...(prev[m.id] || [])]
                                                    updated[qi] = oi
                                                    return { ...prev, [m.id]: updated }
                                                  })
                                                }}
                                                className="sr-only"
                                                disabled={!!quizResult[m.id]}
                                              />
                                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                                                ${quizAnswers[m.id]?.[qi] === oi ? 'border-brand-accent bg-brand-accent' : 'border-white/30'}`}>
                                                {quizAnswers[m.id]?.[qi] === oi && (
                                                  <div className="w-1.5 h-1.5 rounded-full bg-[#0F1E1A]" />
                                                )}
                                              </div>
                                              {opt}
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    ))}

                                    {/* Submit / Result */}
                                    {!quizResult[m.id] ? (
                                      <button
                                        onClick={() => handleGradeQuiz(m.id)}
                                        disabled={loadingQuiz === m.id || (quizAnswers[m.id] || []).some(a => a === null)}
                                        className="w-full py-3 rounded-xl bg-brand-accent text-[#0F1E1A] font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        {loadingQuiz === m.id ? 'Grading…' : 'Submit Answers'}
                                      </button>
                                    ) : (
                                      <div className={`p-4 rounded-xl text-center font-bold ${quizResult[m.id].passed ? 'bg-green-500/15 border border-green-500/30 text-green-300' : 'bg-red-500/10 border border-red-500/30 text-red-300'}`}>
                                        <p className="text-lg">
                                          {quizResult[m.id].score} / {quizResult[m.id].total} — {Math.round((quizResult[m.id].score / quizResult[m.id].total) * 100)}%
                                        </p>
                                        <p className="text-xs mt-1 opacity-70">
                                          {quizResult[m.id].passed ? (
                                            <span className="inline-flex items-center gap-1.5">
                                              <CheckCircle size={16} className="text-emerald-400" /> Passed! Milestone marked as complete.
                                            </span>
                                          ) : (
                                            'Need 80% to pass. Review the subtopics and try again!'
                                          )}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Comments Section */}
        {(roadmap?.is_public || isOwner) && (
          <div className="mt-12 pt-12 border-t border-white/10 print:hidden text-left w-full">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <MessageSquare className="text-brand-accent" size={24} /> Comments ({comments.length})
            </h3>

            {/* Comment Form */}
            {session ? (
              <form onSubmit={handleCommentSubmit} className="flex gap-4 mb-8">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-accent to-[#0F1E1A] flex items-center justify-center font-extrabold text-xs uppercase text-white shrink-0 mt-1 shadow-inner">
                  {session.user.email[0]}
                </div>
                <div className="flex-1 flex gap-2">
                  <textarea
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    required
                    placeholder="Write a comment..."
                    className="w-full bg-[#142420]/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent placeholder:text-white/20 resize-none font-medium"
                  />
                  <Button 
                    type="submit" 
                    disabled={submittingComment || !newComment.trim()} 
                    className="py-3 px-5 text-sm font-extrabold flex items-center justify-center gap-1.5 self-end shrink-0"
                  >
                    <Send size={14} /> Send
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mb-8 p-4 rounded-xl bg-white/5 border border-white/5 text-center text-sm text-white/50 font-medium">
                Please <Link to="/login" className="text-brand-accent underline font-bold">log in</Link> to join the discussion.
              </div>
            )}

            {/* Comments List */}
            {loadingComments ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-6">
                {comments.map((comment) => {
                  const isCommentOwner = session && comment.user_id === session.user.id
                  return (
                    <div key={comment.id} className="flex gap-4 group">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-accent to-[#0F1E1A] flex items-center justify-center font-extrabold text-xs uppercase text-white shrink-0 shadow-inner">
                        {comment.profiles?.name?.[0] || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-sm text-white/95 mr-2">
                              {comment.profiles?.name || 'Anonymous'}
                            </span>
                            <span className="text-[10px] text-white/40 font-medium">
                              {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {isCommentOwner && (
                            <button
                              onClick={() => handleCommentDelete(comment.id)}
                              className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-white/70 leading-relaxed font-medium mt-1 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-white/40 italic text-sm">
                No comments yet. Start the conversation!
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
