import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ExploreCard from '../components/ExploreCard'
import Button from '../components/Button'
import { 
  Globe, 
  Code, 
  Palette, 
  Dumbbell, 
  Briefcase, 
  Languages, 
  Sparkles, 
  Puzzle, 
  Search, 
  Flame, 
  GraduationCap 
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const CATEGORIES = [
  { name: 'All', icon: Globe },
  { name: 'Coding', icon: Code },
  { name: 'Design', icon: Palette },
  { name: 'Fitness', icon: Dumbbell },
  { name: 'Career', icon: Briefcase },
  { name: 'Language', icon: Languages },
  { name: 'Skincare', icon: Sparkles },
  { name: 'Other', icon: Puzzle },
]

export default function Explore({ session }) {
  const navigate = useNavigate()

  // State for Lists
  const [featured, setFeatured] = useState([])
  const [trending, setTrending] = useState([])
  const [curated, setCurated] = useState([])
  const [allRoadmaps, setAllRoadmaps] = useState([])

  // Search & Filter States
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [difficulty, setDifficulty] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Autocomplete Suggestions
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionsRef = useRef(null)

  // Loading & Action States
  const [loadingFeatured, setLoadingFeatured] = useState(true)
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [loadingCurated, setLoadingCurated] = useState(true)
  const [loadingAll, setLoadingAll] = useState(true)
  const [cloningId, setCloningId] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  // Handle outside click to close suggestions
  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch Featured, Trending, Curated
  useEffect(() => {
    fetchFeatured()
    fetchTrending()
    fetchCurated()
  }, [])

  // Debounce Search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  // Fetch All Roadmaps on filter changes
  useEffect(() => {
    setPage(1)
    fetchAllRoadmaps(1, true)
  }, [category, difficulty, selectedTags, sort, debouncedSearch])

  // Autocomplete fetch
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSuggestions([])
      return
    }
    fetchSuggestions(debouncedSearch)
  }, [debouncedSearch])

  async function fetchFeatured() {
    try {
      const res = await fetch(`${API_URL}/api/explore/featured`)
      const data = await res.json()
      if (res.ok) setFeatured(data || [])
    } catch (err) {
      console.error('Error fetching featured:', err)
    } finally {
      setLoadingFeatured(false)
    }
  }

  async function fetchTrending() {
    try {
      const res = await fetch(`${API_URL}/api/explore/trending`)
      const data = await res.json()
      if (res.ok) setTrending(data || [])
    } catch (err) {
      console.error('Error fetching trending:', err)
    } finally {
      setLoadingTrending(false)
    }
  }

  async function fetchCurated() {
    try {
      const res = await fetch(`${API_URL}/api/explore/curated`)
      const data = await res.json()
      if (res.ok) setCurated(data || [])
    } catch (err) {
      console.error('Error fetching curated:', err)
    } finally {
      setLoadingCurated(false)
    }
  }

  async function fetchAllRoadmaps(currentPage = 1, shouldReset = false) {
    setLoadingAll(true)
    try {
      const params = new URLSearchParams()
      if (category && category !== 'All') params.append('category', category)
      if (difficulty) params.append('difficulty', difficulty)
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','))
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (sort) params.append('sort', sort)
      params.append('page', currentPage)

      const res = await fetch(`${API_URL}/api/explore/roadmaps?${params.toString()}`)
      const data = await res.json()
      if (res.ok) {
        if (shouldReset) {
          setAllRoadmaps(data || [])
        } else {
          setAllRoadmaps(prev => [...prev, ...(data || [])])
        }
        // If we got fewer than 12, there are no more pages
        if (!data || data.length < 12) {
          setHasMore(false)
        } else {
          setHasMore(true)
        }
      }
    } catch (err) {
      console.error('Error fetching all roadmaps:', err)
    } finally {
      setLoadingAll(false)
    }
  }

  async function fetchSuggestions(query) {
    try {
      const res = await fetch(`${API_URL}/api/explore/suggestions?query=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (res.ok) {
        setSuggestions(data || [])
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err)
    }
  }

  async function handleClone(roadmapId) {
    if (!session) {
      navigate('/login')
      return
    }

    setCloningId(roadmapId)
    try {
      const res = await fetch(`${API_URL}/api/roadmaps/${roadmapId}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Roadmap cloned successfully! Redirecting to Dashboard...')
        // Increment clone counts locally
        const updater = list => list.map(r => r.id === roadmapId ? { ...r, clone_count: (r.clone_count || 0) + 1 } : r)
        setFeatured(updater)
        setTrending(updater)
        setCurated(updater)
        setAllRoadmaps(updater)
        
        setTimeout(() => {
          navigate('/')
        }, 1500)
      } else {
        showToast(data.error || 'Failed to clone roadmap.')
      }
    } catch (err) {
      showToast('Error cloning roadmap.')
      console.error(err)
    } finally {
      setCloningId(null)
    }
  }

  function showToast(message) {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleTagClick = (tag) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const removeTag = (tagToRemove) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove))
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchAllRoadmaps(nextPage, false)
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  // Cards Skeleton Loader
  const SkeletonGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
      {[1, 2, 3].map(i => (
        <div key={i} className="animate-pulse p-6 rounded-3xl bg-[#142420]/40 border border-white/5 flex flex-col min-h-[300px]">
          <div className="flex gap-2 mb-4">
            <div className="h-6 w-16 bg-white/10 rounded-full"></div>
            <div className="h-6 w-24 bg-white/10 rounded-full"></div>
          </div>
          <div className="h-6 bg-white/10 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-white/10 rounded w-1/2 mb-6"></div>
          <div className="space-y-2 mb-6">
            <div className="h-3 bg-white/5 rounded"></div>
            <div className="h-3 bg-white/5 rounded w-5/6"></div>
            <div className="h-3 bg-white/5 rounded w-4/6"></div>
          </div>
          <div className="mt-auto h-10 bg-white/10 rounded-xl w-full"></div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen text-[#F3EFE2] relative overflow-hidden pb-20">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl bg-white text-[#0F1E1A] font-extrabold shadow-2xl animate-bounce border border-brand-accent">
          {toastMessage}
        </div>
      )}

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
            <Link to="/" className="bg-[#0F1E1A] text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-black text-sm sm:text-lg tracking-wide shadow-[0_5px_15px_rgba(15,30,26,0.2)] hover:scale-105 hover:text-brand-accent transition-all duration-300 cursor-pointer relative z-10">
              Pathwise
            </Link>

            {/* Links */}
            <div className="flex items-center gap-3 sm:gap-6 pl-2 sm:pl-4 border-l border-black/10 text-xs sm:text-sm">
              <Link to="/" className="font-semibold text-black/40 hover:text-[#0F1E1A] transition-colors cursor-pointer flex items-center gap-2">
                Dashboard
              </Link>
              <span className="font-extrabold text-[#0F1E1A] cursor-pointer flex items-center gap-1 relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-[2px] sm:after:h-[3px] after:bg-[#0F1E1A] after:rounded-full">
                Explore
              </span>
              <Link to="/community" className="font-semibold text-black/40 hover:text-[#0F1E1A] transition-colors cursor-pointer flex items-center gap-2">
                Community
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 pr-1">
            {session ? (
              <>
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
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login"
                  className="text-xs sm:text-sm font-bold px-4 py-2 rounded-full text-[#0F1E1A] hover:text-brand-accent transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  to="/signup"
                  className="text-xs sm:text-sm font-bold px-5 py-2.5 rounded-full bg-[#0F1E1A] text-white hover:bg-[#142420] transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        
        {/* 1. Hero Header & Search Bar Section */}
        <div className="relative mb-12 p-8 sm:p-12 rounded-[2rem] bg-gradient-to-br from-[#142420]/95 to-[#0F1E1A]/95 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center">
          <div className="absolute top-0 right-0 w-72 h-72 bg-brand-accent/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/3 translate-x-1/3" />
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight">Explore Roadmaps</h1>
          <p className="text-white/70 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Discover community-curated learning journeys, copy starter templates, and instantly build pathways to master any skill.
          </p>

          {/* Search bar wrapper */}
          <div className="relative max-w-xl mx-auto" ref={suggestionsRef}>
            <div className="flex items-center bg-white/5 border border-white/10 focus-within:border-brand-accent/60 rounded-2xl px-4 py-3.5 transition-all">
              <svg className="w-5 h-5 text-white/40 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search roadmaps, skills, tags..."
                className="bg-transparent text-white placeholder-white/40 focus:outline-none w-full text-base"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-white/40 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Autocomplete Suggestions Box */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#142420] border border-white/10 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.5)] overflow-hidden z-50 text-left">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearch(suggestion)
                      setShowSuggestions(false)
                    }}
                    className="w-full px-5 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 block"
                  >
                    <div className="flex items-center gap-2">
                      <Search size={14} className="text-white/40" />
                      <span>{suggestion}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Categories Grid */}
        <div className="mb-12">
          <h2 className="text-xl font-extrabold text-white/60 mb-4 px-2 tracking-wider uppercase">Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {CATEGORIES.map((cat) => {
              const isActive = category === cat.name
              const IconComponent = cat.icon
              return (
                <button
                  key={cat.name}
                  onClick={() => setCategory(cat.name)}
                  className={`p-4 rounded-2xl border text-center transition-all duration-300 hover:scale-[1.03] flex flex-col items-center justify-center gap-2 ${
                    isActive 
                      ? 'bg-brand-accent/10 border-brand-accent text-brand-accent shadow-[0_0_20px_rgba(79,209,197,0.2)]'
                      : 'bg-[#142420]/80 border-white/5 hover:border-white/20 text-white/70'
                  }`}
                >
                  <IconComponent size={22} className="opacity-80" />
                  <span className="text-sm font-bold">{cat.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. Featured / Editor's Pick Row */}
        {!search && category === 'All' && selectedTags.length === 0 && !difficulty && (
          <div className="mb-12">
            <h2 className="text-2xl font-black text-white mb-6 px-2 flex items-center gap-2">
              <Sparkles className="text-teal-400 w-6 h-6" strokeWidth={1.5} /> Editor's Picks
            </h2>
            {loadingFeatured ? (
              <SkeletonGrid />
            ) : featured.length > 0 ? (
              <div className="flex overflow-x-auto gap-6 pb-4 scrollbar-thin scrollbar-thumb-white/10">
                {featured.map((roadmap) => (
                  <div key={roadmap.id} className="min-w-[280px] sm:min-w-[350px] max-w-[380px]">
                    <ExploreCard
                      roadmap={roadmap}
                      onClone={handleClone}
                      onTagClick={handleTagClick}
                      isCloning={cloningId === roadmap.id}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/40 px-2 italic">No featured roadmaps available.</p>
            )}
          </div>
        )}

        {/* 4. Trending This Week */}
        {!search && category === 'All' && selectedTags.length === 0 && !difficulty && (
          <div className="mb-12">
            <h2 className="text-2xl font-black text-white mb-6 px-2 flex items-center gap-2">
              <Flame className="text-amber-500 w-6 h-6" strokeWidth={1.5} /> Trending This Week
            </h2>
            {loadingTrending ? (
              <SkeletonGrid />
            ) : trending.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {trending.map((roadmap) => (
                  <ExploreCard
                    key={roadmap.id}
                    roadmap={roadmap}
                    onClone={handleClone}
                    onTagClick={handleTagClick}
                    isCloning={cloningId === roadmap.id}
                  />
                ))}
              </div>
            ) : (
              <p className="text-white/40 px-2 italic">No trending roadmaps available.</p>
            )}
          </div>
        )}

        {/* 5. Curated Starter Roadmaps */}
        {!search && category === 'All' && selectedTags.length === 0 && !difficulty && (
          <div className="mb-16">
            <h2 className="text-2xl font-black text-white mb-6 px-2 flex items-center gap-2">
              <GraduationCap className="text-teal-400 w-6 h-6" strokeWidth={1.5} /> Curated Starter Roadmaps
            </h2>
            {loadingCurated ? (
              <SkeletonGrid />
            ) : curated.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {curated.map((roadmap) => (
                  <ExploreCard
                    key={roadmap.id}
                    roadmap={roadmap}
                    onClone={handleClone}
                    onTagClick={handleTagClick}
                    isCloning={cloningId === roadmap.id}
                  />
                ))}
              </div>
            ) : (
              <p className="text-white/40 px-2 italic">No curated roadmaps available.</p>
            )}
          </div>
        )}

        {/* 6. All Roadmaps Grid & Sidebar Filter */}
        <div className="border-t border-white/10 pt-12">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Filter Sidebar */}
            <div className="w-full lg:w-64 bg-[#142420]/80 backdrop-blur-xl border border-white/5 p-6 rounded-3xl shrink-0">
              <h3 className="text-lg font-black text-white mb-6">Filters</h3>

              {/* Difficulty Filter */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-white/50 uppercase mb-3">Difficulty</label>
                <div className="space-y-2">
                  {['', 'beginner', 'intermediate', 'advanced'].map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`w-full text-left px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                        difficulty === diff
                          ? 'bg-brand-accent/15 text-brand-accent border border-brand-accent/20'
                          : 'bg-white/5 hover:bg-white/10 text-white/70 border border-transparent'
                      }`}
                    >
                      {diff ? diff.charAt(0).toUpperCase() + diff.slice(1) : 'Any Difficulty'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Tags list */}
              {selectedTags.length > 0 && (
                <div className="mb-6">
                  <label className="block text-xs font-bold text-white/50 uppercase mb-3">Active Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map(tag => (
                      <span 
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-accent/10 text-brand-accent text-xs font-bold"
                      >
                        #{tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-red-400 font-black">×</button>
                      </span>
                    ))}
                    <button 
                      onClick={() => setSelectedTags([])}
                      className="text-[11px] text-white/40 hover:text-white underline w-full text-left mt-1"
                    >
                      Clear all tags
                    </button>
                  </div>
                </div>
              )}

              {/* Sort By Dropdown */}
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase mb-3">Sort By</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
                >
                  <option value="newest" className="bg-[#142420]">Newest</option>
                  <option value="popular" className="bg-[#142420]">Most Popular (Views)</option>
                  <option value="cloned" className="bg-[#142420]">Most Cloned</option>
                  <option value="shortest" className="bg-[#142420]">Shortest Duration</option>
                </select>
              </div>
            </div>

            {/* Results Grid */}
            <div className="flex-1 w-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white">All Public Roadmaps</h2>
                <span className="text-sm text-white/40 font-bold">{allRoadmaps.length} results</span>
              </div>

              {loadingAll && allRoadmaps.length === 0 ? (
                <SkeletonGrid />
              ) : allRoadmaps.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {allRoadmaps.map((roadmap) => (
                      <ExploreCard
                        key={roadmap.id}
                        roadmap={roadmap}
                        onClone={handleClone}
                        onTagClick={handleTagClick}
                        isCloning={cloningId === roadmap.id}
                      />
                    ))}
                  </div>

                  {/* Load More Button */}
                  {hasMore && (
                    <div className="text-center mt-8">
                      <Button onClick={loadMore} className="px-8 py-3 bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:shadow-none">
                        Load More Roadmaps
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                /* 7. Empty State Fallback (curated starter roadmaps) */
                <div className="py-12 px-6 text-center rounded-3xl bg-[#142420]/40 border border-white/5 border-dashed">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-accent/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No matching public roadmaps</h3>
                  <p className="text-white/50 mb-8 max-w-sm mx-auto text-sm">
                    We couldn't find any public roadmaps with those filters. Check out these popular starters instead!
                  </p>
                  
                  {/* Curated starters list inside empty state */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    {curated.slice(0, 2).map((roadmap) => (
                      <ExploreCard
                        key={roadmap.id}
                        roadmap={roadmap}
                        onClone={handleClone}
                        onTagClick={handleTagClick}
                        isCloning={cloningId === roadmap.id}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </main>
    </div>
  )
}
