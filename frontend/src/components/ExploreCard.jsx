import React from 'react'
import { Star } from 'lucide-react'

export default function ExploreCard({ 
  roadmap, 
  onClone, 
  onTagClick, 
  isCloning 
}) {
  const {
    id,
    title,
    goal,
    category,
    difficulty = 'beginner',
    tags = [],
    clone_count = 0,
    view_count = 0,
    is_curated = false,
    milestone_count = 0,
    estimated_duration = 0,
    user_id
  } = roadmap

  // Format creator name
  const creator = is_curated ? 'Pathwise Team' : 'User'

  // Format difficulty label
  const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1)

  // Format duration into readable text (e.g., hours or days)
  const formatDuration = (hours) => {
    if (hours >= 24) {
      const days = Math.round(hours / 24)
      return `${days} ${days === 1 ? 'day' : 'days'}`
    }
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }

  return (
    <div className="group relative p-6 rounded-3xl bg-[#142420]/80 backdrop-blur-xl border border-white/5 hover:border-brand-accent/40 hover:shadow-[0_15px_40px_rgba(79,209,197,0.15)] hover:-translate-y-1 transition-all duration-500 flex flex-col min-h-[300px]">
      
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
          difficulty === 'advanced' 
            ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
            : difficulty === 'intermediate'
            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            : 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20'
        }`}>
          {diffLabel}
        </span>
        
        {is_curated && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
            <Star size={11} className="fill-current text-white" /> Curator Choice
          </span>
        )}
        
        {category && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-white/60">
            {category}
          </span>
        )}
      </div>

      {/* Title & Creator */}
      <div className="mb-2">
        <h3 className="text-xl font-black text-white line-clamp-2 group-hover:text-brand-accent transition-colors">
          {title}
        </h3>
        <p className="text-xs text-white/40 mt-1">
          Created by <span className="text-white/60 font-semibold">{creator}</span>
        </p>
      </div>

      {/* Goal / Description */}
      <p className="text-white/60 text-sm line-clamp-3 mb-6 leading-relaxed flex-grow">
        {goal}
      </p>

      {/* Metadata Indicators */}
      <div className="grid grid-cols-2 gap-2 mb-6 p-3 rounded-xl bg-black/20 border border-white/5 text-xs text-white/50">
        <div>
          Milestones: <span className="text-white font-bold">{milestone_count}</span>
        </div>
        <div>
          Duration: <span className="text-white font-bold">{formatDuration(estimated_duration)}</span>
        </div>
        <div>
          Clones: <span className="text-white font-bold">{clone_count}</span>
        </div>
        <div>
          Views: <span className="text-white font-bold">{view_count}</span>
        </div>
      </div>

      {/* Tag Chips */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onTagClick?.(tag)
              }}
              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-brand-accent/20 hover:text-brand-accent text-[11px] text-white/60 transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
        <button
          onClick={(e) => {
            e.preventDefault()
            onClone(id)
          }}
          disabled={isCloning}
          className="w-full py-2.5 rounded-xl font-extrabold text-sm text-[#0F1E1A] bg-white hover:bg-brand-accent hover:shadow-[0_0_15px_rgba(79,209,197,0.4)] disabled:opacity-50 transition-all duration-300 flex items-center justify-center gap-1.5"
        >
          {isCloning ? (
            <>
              <svg className="animate-spin h-4 w-4 text-[#0F1E1A]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Cloning...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              Clone Roadmap
            </>
          )}
        </button>
      </div>

    </div>
  )
}
