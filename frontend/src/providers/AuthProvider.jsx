import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'

import { auth } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [claims, setClaims] = useState(null)
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
      setUser(firebaseUser)
      setClaims({
        role: tokenResult.claims.role,
        campusId: tokenResult.claims.campusId
      })
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const value = useMemo(
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
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}