import { useState, type FormEvent } from 'react'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth'
import { Loader2, ShieldCheck, UserCircle2 } from 'lucide-react'

import { PageLayout } from '@/components/layout/PageLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/sonner'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/providers/AuthProvider'

export default function Profile() {
  const { user, claims } = useAuth()
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [loading, setLoading] = useState(false)

  const submitPasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (newPwd !== confirmPwd) {
      toast.error('A confirmação não bate com a nova senha.')
      return
    }
    if (newPwd.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (!auth.currentUser?.email) return

    setLoading(true)
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPwd)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await updatePassword(auth.currentUser, newPwd)
      toast.success('Senha atualizada com sucesso.')
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } catch {
      toast.error('Não foi possível alterar a senha. Verifique a senha atual.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageLayout
      title="Perfil"
      description="Dados da conta e configurações de segurança."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <UserCircle2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Informações da conta</CardTitle>
                <CardDescription>Dados sincronizados com o Firebase Auth.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Email</p>
              <p className="text-sm">{user?.email ?? '—'}</p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Cargo</p>
                <p className="mt-1 text-sm">
                  {claims?.role === 'super' ? 'Administração central' : 'Administrador de campus'}
                </p>
              </div>
              <Badge variant={claims?.role === 'super' ? 'default' : 'outline'}>
                {claims?.role === 'super' ? 'super' : 'campus'}
              </Badge>
            </div>
            {claims?.role === 'campus' && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Campus</p>
                  <p className="text-sm">#{claims?.campusId}</p>
                </div>
              </>
            )}
            <Separator />
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">UID</p>
              <p className="text-xs font-mono text-muted-foreground">{user?.uid}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-warning/10 p-2 text-warning">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Alterar senha</CardTitle>
                <CardDescription>
                  Você precisará da sua senha atual para confirmar.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitPasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current">Senha atual</Label>
                <Input
                  id="current"
                  type="password"
                  autoComplete="current-password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new">Nova senha</Label>
                <Input
                  id="new"
                  type="password"
                  autoComplete="new-password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar nova senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Salvando…' : 'Atualizar senha'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
