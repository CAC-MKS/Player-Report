import { useState, useEffect } from 'react'
import { supabase, hasCredentials } from '../lib/supabase.js'
import { calcPlayerStats } from '../utils/stats.js'

// This report site is scoped to a single-club database (CAC-input no longer
// has multi-academy support — every match in the DB belongs to MKS Podlasie
// vs. an opponent). TEAM_ID identifies which side is "us" so getOpponent()/
// isHomeTeam() can tell us apart from whoever MKS played.
const TEAM_ID = import.meta.env.VITE_TEAM_ID
export const TEAM_IDS = TEAM_ID ? [TEAM_ID] : []

function parseCoords(ev) {
  return {
    ...ev,
    start_x: ev.start_x != null ? parseFloat(ev.start_x) : null,
    start_y: ev.start_y != null ? parseFloat(ev.start_y) : null,
    end_x:   ev.end_x   != null ? parseFloat(ev.end_x)   : null,
    end_y:   ev.end_y   != null ? parseFloat(ev.end_y)   : null,
  }
}

function flipEvent(ev) {
  return {
    ...ev,
    start_x: ev.start_x != null ? 120 - ev.start_x : ev.start_x,
    start_y: ev.start_y != null ? 80  - ev.start_y : ev.start_y,
    end_x:   ev.end_x   != null ? 120 - ev.end_x   : ev.end_x,
    end_y:   ev.end_y   != null ? 80  - ev.end_y   : ev.end_y,
  }
}

/**
 * team_direction field → should we flip to L2R?
 * Flips only when the field clearly means "team is going right-to-left on screen".
 * 'right' / 'l2r' / 'left_to_right' all mean the team IS going left→right, so no flip.
 */
function isR2L(dir) {
  if (!dir) return false
  const d = String(dir).toUpperCase().replace(/[\s_\-]/g, '')
  return d === 'R2L' || d === 'RTL' || d === 'RIGHTTOLEFT'
  // NOTE: 'RIGHT'/'LEFT' are intentionally excluded — 'right' typically means
  // "team attacks to the right" = L2R, which should NOT be flipped.
}

// Retry a Supabase query up to `attempts` times with 1s delay between tries
async function withRetry(fn, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    const result = await fn()
    if (result.data && result.data.length > 0) return result
    if (result.error) {
      console.warn(`[useMatchData] query error (attempt ${i + 1}):`, result.error.message)
    }
    if (i < attempts - 1) await new Promise(r => setTimeout(r, 1000))
  }
  return await fn() // final attempt, return whatever we get
}

export function useMatchData() {
  const [matches, setMatches]               = useState([])
  const [allLineups, setAllLineups]         = useState([])
  const [lineupsByMatch, setLineupsByMatch] = useState({})
  const [aggregatedStats, setAggregatedStats] = useState({})
  const [statsByMatch, setStatsByMatch]     = useState({})
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(null)

  useEffect(() => {
    if (!hasCredentials) { setLoading(false); return }
    if (!TEAM_ID) { setError('VITE_TEAM_ID is not set'); setLoading(false); return }

    async function load() {
      try {
        // 0. Resolve all tagged matches dynamically — this replaces what
        // used to be a hardcoded MATCH_IDS allowlist. No filter needed:
        // every match in this single-club database is one MKS played.
        const { data: allMatches, error: matchesErr } = await supabase
          .from('matches').select('match_id')
        if (matchesErr) throw matchesErr
        const MATCH_IDS = (allMatches || []).map(m => m.match_id)
        if (MATCH_IDS.length === 0) {
          throw new Error('No matches tagged yet')
        }

        // 1. Fetch all match info in parallel
        const matchResults = await Promise.all(
          MATCH_IDS.map(mid =>
            supabase.from('matches').select('*').eq('match_id', mid).single()
          )
        )

        // 2. Resolve team names
        const allTeamIds = [...new Set(
          matchResults.flatMap(r => [r.data?.home_team_id, r.data?.away_team_id].filter(Boolean))
        )]
        const { data: teamsData } = await supabase
          .from('teams').select('team_id,team_name').in('team_id', allTeamIds)
        const teamsMap = {}
        for (const t of (teamsData || [])) teamsMap[t.team_id] = t

        const matchesData = matchResults
          .map(r => r.data)
          .filter(Boolean)
          .map(m => ({
            ...m,
            home_team: teamsMap[m.home_team_id] || null,
            away_team: teamsMap[m.away_team_id] || null,
          }))

        // 3. Fetch lineups per match individually
        const lineupResults = await Promise.all(
          MATCH_IDS.map(mid =>
            supabase.from('lineups').select('*').in('team_id', TEAM_IDS).eq('match_id', mid).order('starting_xi', { ascending: false })
          )
        )
        for (const { error } of lineupResults) {
          if (error) throw error
        }
        const lineupData = lineupResults.flatMap(r => r.data ?? [])

        // 4. Build player lookup
        const playerIds = [...new Set((lineupData || []).map(l => l.player_id).filter(Boolean))]
        const playerMap = {}
        if (playerIds.length > 0) {
          const { data: ps } = await supabase
            .from('players')
            .select('player_id,player_name,position,team_id')
            .in('player_id', playerIds)
          for (const p of (ps || [])) playerMap[p.player_id] = p
        }

        const enrichedLineups = (lineupData || []).map(l => ({
          ...l,
          player: playerMap[l.player_id] || null,
        }))

        // ── Build canonical player identity: same name = same player ──
        // A player can have different player_id values or jersey numbers across
        // matches if re-registered. We use normalised player_name as the sole
        // stable key so all their matches are aggregated together.
        const playerKey = (l) => {
          return (l.player?.player_name ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
        }
        const keyToCanonicalId = {}   // key → canonical player_id
        const idToCanonicalId  = {}   // any player_id → canonical player_id
        for (const l of enrichedLineups) {
          const k = playerKey(l)
          if (!keyToCanonicalId[k]) keyToCanonicalId[k] = l.player_id
          idToCanonicalId[l.player_id] = keyToCanonicalId[k]
        }

        // Re-map each lineup entry's player_id to canonical
        const canonicalLineups = enrichedLineups.map(l => ({
          ...l,
          player_id: idToCanonicalId[l.player_id] ?? l.player_id,
        }))

        // Group lineups by match_id (using canonical IDs)
        const lByMatch = {}
        for (const l of canonicalLineups) {
          if (!lByMatch[l.match_id]) lByMatch[l.match_id] = []
          lByMatch[l.match_id].push(l)
        }

        // Union lineup — dedupe by canonical player_id, prefer starting_xi=true
        const seenPlayers = new Map()
        for (const l of canonicalLineups) {
          if (!seenPlayers.has(l.player_id) || l.starting_xi) {
            seenPlayers.set(l.player_id, l)
          }
        }
        const unionLineups = [...seenPlayers.values()]
          .sort((a, b) => (b.starting_xi ? 1 : 0) - (a.starting_xi ? 1 : 0))

        // 5. Fetch events for all matches — with retry on failure/empty
        const teamPlayerIdSet = new Set(playerIds)  // original IDs for filtering

        // Fetch events per match individually (avoids .in() issues with UUID arrays)
        const eventResults = await Promise.all(
          MATCH_IDS.map(mid =>
            supabase.from('match_events').select('*').eq('match_id', mid).order('match_time_seconds')
          )
        )
        for (const { error } of eventResults) {
          if (error) throw new Error(`match_events query failed: ${error.message}`)
        }
        const eventData = eventResults.flatMap(r => r.data ?? [])

        if (eventData.length === 0) throw new Error('match_events returned 0 rows — check Supabase RLS policies')

        console.log('[useMatchData] events loaded:', eventData.length)

        // 6. Group events by match_id then canonical player_id, normalise L→R
        const eventsByMatchByPlayer = {}
        for (const ev of eventData) {
          if (!teamPlayerIdSet.has(ev.player_id)) continue
          const mid      = ev.match_id
          const canonPid = idToCanonicalId[ev.player_id] ?? ev.player_id
          const parsed   = parseCoords(ev)
          const normEv   = { ...(isR2L(parsed.team_direction) ? flipEvent(parsed) : parsed), player_id: canonPid }
          if (!eventsByMatchByPlayer[mid]) eventsByMatchByPlayer[mid] = {}
          if (!eventsByMatchByPlayer[mid][canonPid]) eventsByMatchByPlayer[mid][canonPid] = []
          eventsByMatchByPlayer[mid][canonPid].push(normEv)
        }

        // 7. Stats per match
        const sByMatch = {}
        for (const [mid, byPlayer] of Object.entries(eventsByMatchByPlayer)) {
          sByMatch[mid] = {}
          for (const [pid, evs] of Object.entries(byPlayer)) {
            sByMatch[mid][pid] = calcPlayerStats(evs)
          }
        }

        // 8. Aggregated stats — combine events across all matches per player
        const allEventsByPlayer = {}
        const matchesPlayedByPlayer = {}   // canonicalId → number of matches with events
        for (const [mid, byPlayer] of Object.entries(eventsByMatchByPlayer)) {
          for (const [pid, evs] of Object.entries(byPlayer)) {
            if (!allEventsByPlayer[pid]) allEventsByPlayer[pid] = []
            allEventsByPlayer[pid].push(...evs)
            matchesPlayedByPlayer[pid] = (matchesPlayedByPlayer[pid] ?? 0) + 1
          }
        }
        const aggStats = {}
        for (const [pid, evs] of Object.entries(allEventsByPlayer)) {
          aggStats[pid] = { ...calcPlayerStats(evs), matchesPlayed: matchesPlayedByPlayer[pid] ?? 1 }
        }

        setMatches(matchesData)
        setAllLineups(unionLineups)
        setLineupsByMatch(lByMatch)
        setStatsByMatch(sByMatch)
        setAggregatedStats(aggStats)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { matches, allLineups, lineupsByMatch, aggregatedStats, statsByMatch, loading, error }
}
