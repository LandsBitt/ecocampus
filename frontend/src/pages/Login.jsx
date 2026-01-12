import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'

import { auth } from '../lib/firebase'
import { useAuth } from '../providers/AuthProvider'

export default function Login() {
  const { user } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    const redirectTo = location.state?.from?.pathname || '/dashboard'
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError('Credenciais inválidas ou usuário não encontrado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-10 shadow-card animate-rise">
        <img
          src="/image/unitau-logo.png"
          alt="Unitau logo"
          className="mx-auto mb-6 h-20 w-20 rounded-2xl bg-white/5 p-3 object-contain"
        />
        <p className="text-xs uppercase tracking-[0.2em] text-cyan/70">ECOCAMPUS</p>
        <h1 className="mt-3 font-display text-3xl text-pearl">Entrar no painel</h1>
        <p className="mt-2 text-sm text-slate/70">
          Use o email institucional habilitado no Firebase Auth.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-xs uppercase tracking-[0.2em] text-slate/60">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-navy/80 px-3 py-3 text-sm"
              required
            />
          </label>
          <label className="block text-xs uppercase tracking-[0.2em] text-slate/60">
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-navy/80 px-3 py-3 text-sm"
              required
            />
          </label>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan/80 px-4 py-3 text-sm font-semibold text-navy transition hover:bg-cyan"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
