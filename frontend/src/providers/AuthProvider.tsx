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
  getToken: () => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [claims, setClaims] = useState<UserClaims | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setClaims(null)
        setLoading(false)
        return
      }
      const tokenResult = await firebaseUser.getIdTokenResult(true)
      const role = tokenResult.claims.role as Role | undefined
      const campusId = tokenResult.claims.campusId as number | undefined
      setUser(firebaseUser)
      setClaims(role ? { role, campusId: campusId ?? null } : null)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      claims,
      loading,
      async getToken() {
        if (!auth.currentUser) return null
        return auth.currentUser.getIdToken()
      },
      async signOut() {
        await firebaseSignOut(auth)
      }
    }),
    [user, claims, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
