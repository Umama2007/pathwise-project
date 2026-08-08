
// Pathwise backend — small Express server.
// Handles AI roadmap generation and the AI mentor chat.
// Uses Groq's free API (OpenAI-compatible) — get a free key at console.groq.com

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'

dotenv.config()

const app = express()

// Use Helmet for basic security headers (hiding X-Powered-By, framing prevention, etc.)
app.use(helmet())

// Limit CORS to allowed origins to prevent unauthorized domain requests
const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['http://localhost:5173']
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS policy'))
  },
  credentials: true
}))

app.use(express.json())

// --- RATE LIMITERS ---
// AI operations limit (mentor chat & roadmap generation)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 15,
  message: { error: 'Too many requests to AI service. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Database writes limit (comments, stories, clones)
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many updates. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Global limiter for general read routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(globalLimiter)

// --- INPUT VALIDATION SCHEMAS ---
const roadmapGenerateSchema = z.object({
  goal: z.string().min(3).max(200),
  skillLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  hoursPerWeek: z.union([z.number().min(1).max(168), z.string()]).transform(val => {
    const num = Number(val)
    if (isNaN(num)) throw new Error('hoursPerWeek must be a valid number')
    return num
  }),
  is_public: z.boolean().default(false),
  category: z.string().max(50).nullable().optional(),
  difficulty: z.string().max(50).nullable().optional(),
})

const roadmapPatchSchema = z.object({
  is_public: z.boolean().optional(),
  category: z.string().max(50).nullable().optional(),
  difficulty: z.string().max(50).nullable().optional(),
})

const commentCreateSchema = z.object({
  content: z.string().min(1).max(1000),
})

const successStoryCreateSchema = z.object({
  content: z.string().min(5).max(5000),
  roadmap_id: z.string().uuid().nullable().optional(),
})

const mentorChatSchema = z.object({
  message: z.string().min(1).max(2000),
  roadmapTitle: z.string().max(200).optional(),
  currentMilestone: z.string().max(200).optional(),
  roadmapId: z.string().uuid().nullable().optional(),
})


// creates a Supabase client that acts AS the logged-in user (not as anon)
// this makes Row Level Security work correctly for inserts/updates
function getUserClient(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

// Public client for no-login-required queries
const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

function getToken(req) {
  return req.headers.authorization?.replace('Bearer ', '')
}

// sends messages to Groq's AI and returns the reply text
async function callAI(messages) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.4 }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'AI request failed — check your AI_API_KEY')
  return data.choices[0].message.content
}

// quick check that the server is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// verifies the logged-in user's token sent from the frontend
app.get('/api/me', async (req, res) => {
  const token = getToken(req)
  if (!token) return res.status(401).json({ error: 'No token provided' })
  const userClient = getUserClient(token)
  const { data, error } = await userClient.auth.getUser(token)
  if (error) return res.status(401).json({ error: error.message })
  res.json({ user: data.user })
})

// generates a real AI roadmap and saves it to the database
app.post('/api/roadmaps/generate', aiLimiter, async (req, res) => {
  try {
    const token = getToken(req)
    if (!token) return res.status(401).json({ error: 'Not logged in' })
    const userClient = getUserClient(token)
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr) return res.status(401).json({ error: userErr.message })
    const userId = userData.user.id

    // Validate body payload
    const parsedBody = roadmapGenerateSchema.safeParse(req.body)
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') })
    }
    const { goal, skillLevel, hoursPerWeek, is_public, category, difficulty } = parsedBody.data

    const promptSkill = difficulty || skillLevel || 'beginner'

    // ask the AI to return the roadmap as clean JSON we can save directly
    const prompt = `Create a learning roadmap for this goal: "${goal}".
Current skill level: ${promptSkill}. Hours available per week: ${hoursPerWeek || 5}.
Return ONLY valid JSON, no extra text, in this exact shape:
{"title": "short roadmap title", "milestones": [{"title": "milestone name", "estimatedHours": 10}]}
Include 5 to 7 milestones, ordered from first to last.`

    const aiReply = await callAI([{ role: 'user', content: prompt }])
    const parsed = JSON.parse(aiReply.replace(/```json|```/g, '').trim())

    // save the roadmap itself
    const { data: roadmap, error: rErr } = await userClient
      .from('roadmaps')
      .insert({ 
        title: parsed.title, 
        goal, 
        user_id: userId,
        is_public,
        category,
        difficulty: promptSkill
      })
      .select()
      .single()
    if (rErr) throw rErr

    // save each milestone in order
    const milestoneRows = parsed.milestones.map((m, i) => ({
      roadmap_id: roadmap.id,
      title: m.title,
      order_index: i + 1,
      estimated_hours: m.estimatedHours || 5,
    }))
    const { data: milestones, error: mErr } = await userClient
      .from('roadmap_milestones')
      .insert(milestoneRows)
      .select()
    if (mErr) throw mErr

    res.json({ roadmap, milestones })
  } catch (err) {
    console.error('Roadmap generation error:', err)
    res.status(500).json({ error: 'Failed to generate roadmap. Please try again.' })
  }
})

// ─── Streak helper ───────────────────────────────────────────
// Compares last_active_date to today and updates the streak columns
async function updateStreak(userClient, userId) {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  const { data: profile } = await userClient
    .from('profiles')
    .select('current_streak, longest_streak, last_active_date')
    .eq('id', userId)
    .single()

  if (!profile) return { currentStreak: 0, longestStreak: 0 }

  // already pinged today — skip
  if (profile.last_active_date === today) {
    return { currentStreak: profile.current_streak, longestStreak: profile.longest_streak }
  }

  let newStreak = 1
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (profile.last_active_date === yesterday) {
    newStreak = (profile.current_streak || 0) + 1
  }

  const newLongest = Math.max(newStreak, profile.longest_streak || 0)

  await userClient
    .from('profiles')
    .update({ current_streak: newStreak, longest_streak: newLongest, last_active_date: today })
    .eq('id', userId)

  return { currentStreak: newStreak, longestStreak: newLongest }
}

// AI mentor chat — knows which roadmap + milestone the student is on
app.post('/api/mentor/chat', aiLimiter, async (req, res) => {
  try {
    const token = getToken(req)
    if (!token) return res.status(401).json({ error: 'Not logged in' })
    const userClient = getUserClient(token)
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr) return res.status(401).json({ error: userErr.message })
    const userId = userData.user.id

    // Validate body payload
    const parsedBody = mentorChatSchema.safeParse(req.body)
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') })
    }
    const { message, roadmapTitle, currentMilestone, roadmapId } = parsedBody.data

    const systemPrompt = `You are a friendly, encouraging learning mentor inside an app called Pathwise.
The student is working on the roadmap "${roadmapTitle || 'their roadmap'}", currently on "${currentMilestone || 'an early step'}".
Keep answers short, practical, and specific to where they are in their journey.`

    const aiReply = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ])

    // save both sides of the conversation so the chat has history
    await userClient.from('ai_chat_messages').insert([
      { user_id: userId, roadmap_id: roadmapId || null, sender: 'user', content: message },
      { user_id: userId, roadmap_id: roadmapId || null, sender: 'ai', content: aiReply },
    ])

    // chatting counts as daily activity for the streak
    await updateStreak(userClient, userId)

    res.json({ reply: aiReply })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Feature 1: Milestone deep-dive (subtopics + resources) ──
app.post('/api/milestones/:id/expand', async (req, res) => {
  try {
    const token = getToken(req)
    if (!token) return res.status(401).json({ error: 'Not logged in' })
    const userClient = getUserClient(token)
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr) return res.status(401).json({ error: userErr.message })

    const milestoneId = req.params.id

    // fetch the milestone + its parent roadmap for AI context
    const { data: milestone, error: mErr } = await userClient
      .from('roadmap_milestones')
      .select('*, roadmaps(goal)')
      .eq('id', milestoneId)
      .single()
    if (mErr || !milestone) return res.status(404).json({ error: 'Milestone not found' })

    const roadmapGoal = milestone.roadmaps?.goal || ''

    const prompt = `The student is learning "${roadmapGoal}" and is on the milestone "${milestone.title}".
Break this milestone into subtopics and suggest resources.
Return ONLY valid JSON, no extra text, in this exact shape:
{"subtopics": [{"title": "subtopic name", "summary": "2-3 sentence plain-English explanation of what this covers and why it matters"}], "resources": [{"title": "resource name", "url": "https://...", "format": "video|article|docs"}]}
Include 4-6 subtopics and 3-5 resources. Use ONLY free resources (e.g., free guides from Google, MDN Web Docs, freeCodeCamp, YouTube free courses, official open-source documentation, etc.). Ensure all URLs are valid and link directly to free educational content.`

    const aiReply = await callAI([{ role: 'user', content: prompt }])
    const parsed = JSON.parse(aiReply.replace(/```json|```/g, '').trim())

    // insert subtopics
    const subtopicRows = (parsed.subtopics || []).map((s, i) => ({
      milestone_id: milestoneId,
      title: s.title,
      summary: s.summary,
      order_index: i + 1,
    }))
    const { data: subtopics, error: sErr } = await userClient
      .from('milestone_subtopics')
      .insert(subtopicRows)
      .select()
    if (sErr) throw sErr

    // insert resources and link them to this milestone
    let resources = []
    for (const r of parsed.resources || []) {
      const { data: res_row, error: rErr } = await userClient
        .from('resources')
        .insert({ title: r.title, url: r.url, format: r.format || 'article' })
        .select()
        .single()
      if (rErr) continue
      resources.push(res_row)
      // link resource to this milestone
      await userClient
        .from('milestone_resources')
        .insert({ milestone_id: milestoneId, resource_id: res_row.id })
    }

    res.json({ subtopics: subtopics || [], resources })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Feature 2: Quiz generation ──────────────────────────────
app.post('/api/milestones/:id/quiz', async (req, res) => {
  try {
    const token = getToken(req)
    if (!token) return res.status(401).json({ error: 'Not logged in' })
    const userClient = getUserClient(token)
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr) return res.status(401).json({ error: userErr.message })

    const milestoneId = req.params.id

    // check if a quiz already exists
    const { data: existing } = await userClient
      .from('milestone_quizzes')
      .select('*')
      .eq('milestone_id', milestoneId)
      .single()

    if (existing) {
      // return existing quiz with correctIndex stripped
      const safeQs = existing.questions.map(({ correctIndex, ...rest }) => rest)
      return res.json({ quizId: existing.id, questions: safeQs })
    }

    // fetch milestone title for context
    const { data: milestone } = await userClient
      .from('roadmap_milestones')
      .select('title')
      .eq('id', milestoneId)
      .single()
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' })

    const prompt = `Create a quiz about "${milestone.title}".
Return ONLY valid JSON, no extra text, in this exact shape:
{"questions": [{"question": "question text", "options": ["a","b","c","d"], "correctIndex": 0}]}
Include exactly 5 multiple-choice questions. Make them educational but fair for a student who just studied this topic.`

    const aiReply = await callAI([{ role: 'user', content: prompt }])
    const parsed = JSON.parse(aiReply.replace(/```json|```/g, '').trim())

    // save full quiz (with correctIndex) to the database
    const { data: quiz, error: qErr } = await userClient
      .from('milestone_quizzes')
      .insert({ milestone_id: milestoneId, questions: parsed.questions })
      .select()
      .single()
    if (qErr) throw qErr

    // strip correctIndex before sending to the client
    const safeQuestions = parsed.questions.map(({ correctIndex, ...rest }) => rest)
    res.json({ quizId: quiz.id, questions: safeQuestions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Feature 2: Quiz grading (server-side) ───────────────────
app.post('/api/milestones/:id/quiz/grade', async (req, res) => {
  try {
    const token = getToken(req)
    if (!token) return res.status(401).json({ error: 'Not logged in' })
    const userClient = getUserClient(token)
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr) return res.status(401).json({ error: userErr.message })

    const milestoneId = req.params.id
    const { answers } = req.body // array of selected indices, e.g. [0, 2, 1, 3, 0]
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers array is required' })
    }

    // fetch the stored quiz with the correct answers
    const { data: quiz } = await userClient
      .from('milestone_quizzes')
      .select('questions')
      .eq('milestone_id', milestoneId)
      .single()
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' })

    let score = 0
    const total = quiz.questions.length
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) score++
    })

    const passed = score / total >= 0.8
    res.json({ score, total, passed })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Feature 3: Streak ping ─────────────────────────────────
app.post('/api/streak/ping', async (req, res) => {
  try {
    const token = getToken(req)
    if (!token) return res.status(401).json({ error: 'Not logged in' })
    const userClient = getUserClient(token)
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr) return res.status(401).json({ error: userErr.message })

    const streak = await updateStreak(userClient, userData.user.id)
    res.json(streak)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Explore Feature Endpoints ────────────────────────────────
// GET /api/explore/suggestions - Auto-complete search suggestions
app.get('/api/explore/suggestions', async (req, res) => {
  try {
    const { query } = req.query
    if (!query) return res.json([])
    
    const { data, error } = await anonClient
      .from('roadmaps')
      .select('title, category, tags')
      .eq('is_public', true)
      .or(`title.ilike.%${query}%,category.ilike.%${query}%`)
      .limit(20)
      
    if (error) throw error

    const suggestions = new Set()
    data.forEach(r => {
      if (r.title && r.title.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(r.title)
      }
      if (r.category && r.category.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(r.category)
      }
      if (r.tags) {
        r.tags.forEach(t => {
          if (t.toLowerCase().includes(query.toLowerCase())) {
            suggestions.add(t)
          }
        })
      }
    })

    res.json(Array.from(suggestions).slice(0, 8))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/explore/roadmaps - Get all public roadmaps with sorting, pagination, filtering
app.get('/api/explore/roadmaps', async (req, res) => {
  try {
    const { category, tags, difficulty, search, sort, page = 1 } = req.query
    const limit = 12
    
    let query = anonClient
      .from('roadmaps')
      .select('*, roadmap_milestones(estimated_hours)')
      .eq('is_public', true)

    if (category && category !== 'All') {
      query = query.eq('category', category)
    }
    
    if (difficulty) {
      query = query.eq('difficulty', difficulty.toLowerCase())
    }
    
    if (tags) {
      const tagList = Array.isArray(tags) ? tags : tags.split(',')
      query = query.contains('tags', tagList)
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,goal.ilike.%${search}%`)
    }

    // Sorting
    if (sort === 'popular') {
      query = query.order('view_count', { ascending: false })
    } else if (sort === 'cloned') {
      query = query.order('clone_count', { ascending: false })
    } else {
      // default: newest
      query = query.order('created_at', { ascending: false })
    }

    // Pagination
    const from = (parseInt(page) - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: roadmaps, error } = await query
    if (error) throw error

    // Process duration and milestones count
    const processed = (roadmaps || []).map(r => {
      const milestones = r.roadmap_milestones || []
      const totalHours = milestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)
      return {
        ...r,
        milestone_count: milestones.length,
        estimated_duration: totalHours
      }
    })

    if (sort === 'shortest') {
      processed.sort((a, b) => a.estimated_duration - b.estimated_duration)
    }

    res.json(processed)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/explore/featured - Get editor's pick roadmaps
app.get('/api/explore/featured', async (req, res) => {
  try {
    const { data: roadmaps, error } = await anonClient
      .from('roadmaps')
      .select('*, roadmap_milestones(estimated_hours)')
      .eq('is_public', true)
      .eq('is_featured', true)
      .limit(5)
      
    if (error) throw error

    const processed = (roadmaps || []).map(r => {
      const milestones = r.roadmap_milestones || []
      const totalHours = milestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)
      return {
        ...r,
        milestone_count: milestones.length,
        estimated_duration: totalHours
      }
    })

    res.json(processed)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/explore/trending - Get trending roadmaps
app.get('/api/explore/trending', async (req, res) => {
  try {
    const { data: roadmaps, error } = await anonClient
      .from('roadmaps')
      .select('*, roadmap_milestones(estimated_hours)')
      .eq('is_public', true)
      .order('clone_count', { ascending: false })
      .order('view_count', { ascending: false })
      .limit(6)
      
    if (error) throw error

    const processed = (roadmaps || []).map(r => {
      const milestones = r.roadmap_milestones || []
      const totalHours = milestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)
      return {
        ...r,
        milestone_count: milestones.length,
        estimated_duration: totalHours
      }
    })

    res.json(processed)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/explore/curated - Get curated starter roadmaps
app.get('/api/explore/curated', async (req, res) => {
  try {
    const { data: roadmaps, error } = await anonClient
      .from('roadmaps')
      .select('*, roadmap_milestones(estimated_hours)')
      .eq('is_public', true)
      .eq('is_curated', true)
      .limit(6)
      
    if (error) throw error

    const processed = (roadmaps || []).map(r => {
      const milestones = r.roadmap_milestones || []
      const totalHours = milestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)
      return {
        ...r,
        milestone_count: milestones.length,
        estimated_duration: totalHours
      }
    })

    res.json(processed)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/roadmaps/:id/view - Increment view count
app.post('/api/roadmaps/:id/view', async (req, res) => {
  try {
    const roadmapId = req.params.id
    const { data: roadmap, error: fetchErr } = await anonClient
      .from('roadmaps')
      .select('view_count')
      .eq('id', roadmapId)
      .single()
      
    if (!fetchErr && roadmap) {
      await anonClient
        .from('roadmaps')
        .update({ view_count: (roadmap.view_count || 0) + 1 })
        .eq('id', roadmapId)
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/roadmaps/:id/clone - Clone a public roadmap
app.post('/api/roadmaps/:id/clone', async (req, res) => {
  try {
    const token = getToken(req)
    if (!token) return res.status(401).json({ error: 'Not logged in' })
    const userClient = getUserClient(token)
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr) return res.status(401).json({ error: userErr.message })
    const userId = userData.user.id

    const roadmapId = req.params.id

    // Fetch the source roadmap + its milestones
    const { data: sourceRoadmap, error: srErr } = await anonClient
      .from('roadmaps')
      .select('*, roadmap_milestones(*)')
      .eq('id', roadmapId)
      .eq('is_public', true)
      .single()

    if (srErr || !sourceRoadmap) {
      return res.status(404).json({ error: 'Public roadmap not found' })
    }

    // Insert cloned roadmap for current user
    const { data: newRoadmap, error: nrErr } = await userClient
      .from('roadmaps')
      .insert({
        title: sourceRoadmap.title,
        goal: sourceRoadmap.goal,
        user_id: userId,
        category: sourceRoadmap.category,
        tags: sourceRoadmap.tags,
        difficulty: sourceRoadmap.difficulty,
        is_public: false,
        is_curated: false,
        is_featured: false,
        clone_count: 0,
        view_count: 0
      })
      .select()
      .single()

    if (nrErr) throw nrErr

    // Insert cloned milestones
    const milestones = sourceRoadmap.roadmap_milestones || []
    if (milestones.length > 0) {
      const milestoneRows = milestones.map(m => ({
        roadmap_id: newRoadmap.id,
        title: m.title,
        order_index: m.order_index,
        estimated_hours: m.estimated_hours,
        is_completed: false
      }))
      const { error: msErr } = await userClient
        .from('roadmap_milestones')
        .insert(milestoneRows)
      if (msErr) throw msErr
    }

    // Update clone count on original roadmap
    await anonClient
      .from('roadmaps')
      .update({ clone_count: (sourceRoadmap.clone_count || 0) + 1 })
      .eq('id', roadmapId)

    // Log the clone action
    await userClient
      .from('roadmap_clones')
      .insert({
        user_id: userId,
        source_roadmap_id: roadmapId,
        cloned_roadmap_id: newRoadmap.id
      })

    res.json({ roadmap: newRoadmap })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/roadmaps/:id - Update roadmap settings (is_public, category, difficulty)
app.patch('/api/roadmaps/:id', async (req, res) => {
  try {
    const token = getToken(req)
    if (!token) return res.status(401).json({ error: 'Not logged in' })
    const userClient = getUserClient(token)
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr) return res.status(401).json({ error: userErr.message })
    const userId = userData.user.id

    const roadmapId = req.params.id
    const { is_public, category, difficulty } = req.body

    // Build update payload
    const updates = {}
    if (is_public !== undefined) updates.is_public = is_public
    if (category !== undefined) updates.category = category
    if (difficulty !== undefined) updates.difficulty = difficulty

    // Single-query secure update verifying ownership using user_id
    const { data, error } = await userClient
      .from('roadmaps')
      .update(updates)
      .eq('id', roadmapId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }
    if (!data) {
      return res.status(404).json({ error: 'Roadmap not found or unauthorized' })
    }

    res.json({ roadmap: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Community Comments ───────────────────────────────────────
app.get('/api/roadmaps/:id/comments', async (req, res) => {
  try {
    const { data, error } = await anonClient
      .from('roadmap_comments')
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles (
          name,
          avatar_url
        )
      `)
      .eq('roadmap_id', req.params.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    console.error('Error fetching comments:', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/roadmaps/:id/comments', writeLimiter, async (req, res) => {
  try {
    const token = getToken(req)
    if (!token) return res.status(401).json({ error: 'Not logged in' })
    const userClient = getUserClient(token)
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr) return res.status(401).json({ error: userErr.message })
    const userId = userData.user.id

    // Validate body payload
    const parsedBody = commentCreateSchema.safeParse(req.body)
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') })
    }
    const { content } = parsedBody.data

    const { data, error } = await userClient
      .from('roadmap_comments')
      .insert({
        roadmap_id: req.params.id,
        user_id: userId,
        content
      })
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles (
          name,
          avatar_url
        )
      `)
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    console.error('Error creating comment:', err)
    res.status(500).json({ error: 'Failed to add comment. Please try again.' })
  }
})

app.delete('/api/comments/:id', writeLimiter, async (req, res) => {
  try {
    const token = getToken(req)
    if (!token) return res.status(401).json({ error: 'Not logged in' })
    const userClient = getUserClient(token)
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr) return res.status(401).json({ error: userErr.message })
    const userId = userData.user.id

    const { data, error } = await userClient
      .from('roadmap_comments')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .select()

    if (error) throw error
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Comment not found or unauthorized' })
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Error deleting comment:', err)
    res.status(500).json({ error: 'Failed to delete comment. Please try again.' })
  }
})

// ─── Leaderboard ──────────────────────────────────────────────
app.get('/api/community/leaderboard', async (req, res) => {
  try {
    const sort = req.query.sort || 'streak'
    let orderColumn = 'current_streak'
    if (sort === 'completed') orderColumn = 'roadmaps_completed'
    if (sort === 'cloned') orderColumn = 'clones_received'

    const { data, error } = await anonClient
      .from('user_community_stats')
      .select('*')
      .order(orderColumn, { ascending: false })
      .limit(20)

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    console.error('Error fetching leaderboard:', err)
    res.status(500).json({ error: 'Failed to fetch leaderboard data.' })
  }
})

// ─── Success Stories ──────────────────────────────────────────
app.get('/api/community/stories', async (req, res) => {
  try {
    const { data, error } = await anonClient
      .from('success_stories')
      .select(`
        id,
        content,
        created_at,
        user_id,
        roadmap_id,
        profiles (
          name,
          avatar_url
        ),
        roadmaps (
          title
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    console.error('Error fetching stories:', err)
    res.status(500).json({ error: 'Failed to fetch success stories.' })
  }
})

app.post('/api/community/stories', writeLimiter, async (req, res) => {
  try {
    const token = getToken(req)
    if (!token) return res.status(401).json({ error: 'Not logged in' })
    const userClient = getUserClient(token)
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr) return res.status(401).json({ error: userErr.message })
    const userId = userData.user.id

    // Validate body payload
    const parsedBody = successStoryCreateSchema.safeParse(req.body)
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') })
    }
    const { content, roadmap_id } = parsedBody.data

    const { data, error } = await userClient
      .from('success_stories')
      .insert({
        user_id: userId,
        roadmap_id: roadmap_id || null,
        content
      })
      .select(`
        id,
        content,
        created_at,
        user_id,
        roadmap_id,
        profiles (
          name,
          avatar_url
        ),
        roadmaps (
          title
        )
      `)
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    console.error('Error creating story:', err)
    res.status(500).json({ error: 'Failed to post success story. Please try again.' })
  }
})

app.delete('/api/community/stories/:id', writeLimiter, async (req, res) => {
  try {
    const token = getToken(req)
    if (!token) return res.status(401).json({ error: 'Not logged in' })
    const userClient = getUserClient(token)
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr) return res.status(401).json({ error: userErr.message })
    const userId = userData.user.id

    const { data, error } = await userClient
      .from('success_stories')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .select()

    if (error) throw error
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Story not found or unauthorized' })
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Error deleting story:', err)
    res.status(500).json({ error: 'Failed to delete story. Please try again.' })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Pathwise backend running on http://localhost:${PORT}`))
