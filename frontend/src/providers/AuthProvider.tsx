import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User
} from 'firebase/auth'

import { auth } from '@/lib/firebase'
import type { Role, UserClaims } from '@/lib/types'

interface AuthContextValue {
  user: User | null
  claims: UserClaims | null
  loading: boolean
  /** Falha ao ler o token (ex.: sem rede). Com erro, `claims` fica nulo. */
  error: Error | null
  /**
   * Lê o token de novo direto do Firebase. Serve para tentar outra vez depois
   * de um erro e para quem acabou de receber um papel sem precisar sair e entrar.
   */
  recarregarAcesso: () => Promise<void>
  getToken: () => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function lerClaims(firebaseUser: User, forcar: boolean): Promise<UserClaims | null> {
  const tokenResult = await firebaseUser.getIdTokenResult(forcar)
  const role = tokenResult.claims.role as Role | undefined
  const campusId = tokenResult.claims.campusId as number | undefined
  return role ? { role, campusId: campusId ?? null } : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [claims, setClaims] = useState<UserClaims | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  async function carregar(firebaseUser: User, forcar: boolean) {
    setUser(firebaseUser)
    try {
      setClaims(await lerClaims(firebaseUser, forcar))
      setError(null)
    } catch (e) {
      setClaims(null)
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Na carga usa o token em cache: o Firebase só vai à rede quando ele expirou.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setClaims(null)
        setError(null)
        setLoading(false)
        return
      }
      await carregar(firebaseUser, false)
    })
    return () => unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      claims,
      loading,
      error,
      async recarregarAcesso() {
        if (!auth.currentUser) return
        setLoading(true)
        await carregar(auth.currentUser, true)
      },
      async getToken() {
        if (!auth.currentUser) return null
        return auth.currentUser.getIdToken()
      },
      async signOut() {
        await firebaseSignOut(auth)
      }
    }),
    [user, claims, loading, error]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
