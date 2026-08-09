import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import mksCrest from '../assets/mks-crest.png'

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError(authError.message)
      } else {
        onLogin()
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font)',
    }}>
      <div style={{
        background: '#fff',
        border: '3px solid #000',
        width: 360,
        boxShadow: '8px 8px 0 #fdc300',
      }}>
        {/* Header */}
        <div style={{
          background: '#006032',
          color: '#fdc300',
          padding: '14px 20px',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 3,
          textTransform: 'uppercase',
          borderBottom: '3px solid #000',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <img src={mksCrest} alt="MKS Podlasie" style={{ height: 28, width: 'auto' }} />
          MKS Podlasie Player Report
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(0,0,0,0.5)', fontWeight: 700 }}>
            Coach Portal — Sign In
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, color: '#000' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              autoComplete="email"
              placeholder="you@example.com"
              style={{
                fontFamily: 'var(--font)',
                fontSize: 12,
                padding: '8px 10px',
                border: '2px solid #000',
                outline: 'none',
                background: '#fff',
                color: '#000',
                letterSpacing: 1,
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, color: '#000' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              autoComplete="current-password"
              style={{
                fontFamily: 'var(--font)',
                fontSize: 12,
                padding: '8px 10px',
                border: '2px solid #000',
                outline: 'none',
                background: '#fff',
                color: '#000',
                letterSpacing: 1,
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#000000',
              color: '#fff',
              padding: '6px 10px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? 'rgba(0,0,0,0.3)' : '#fdc300',
              color: '#000',
              border: '2px solid #000',
              fontFamily: 'var(--font)',
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
              padding: '10px 0',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 4,
            }}
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
