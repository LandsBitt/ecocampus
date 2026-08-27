import { useState, type FormEvent } from 'react'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { Check, KeyRound, Mail, ShieldCheck, UserCircle2, X } from 'lucide-react'

import { Page } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/sonner'
import { useCampusList } from '@/hooks/queries'
import { auth } from '@/lib/firebase'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'

const MIN_SENHA = 6

export default function Profile() {
  const { user, claims } = useAuth()
  const campi = useCampusList()

  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const campusNome = campi.data?.find((campus) => campus.id === claims?.campusId)?.nome

  const regras = [
    { ok: nova.length >= MIN_SENHA, texto: `Pelo menos ${MIN_SENHA} caracteres` },
    { ok: nova.length > 0 && nova === confirmacao, texto: 'As duas senhas são iguais' },
    { ok: nova.length > 0 && nova !== atual, texto: 'Diferente da senha atual' }
  ]
  const podeSalvar = regras.every((regra) => regra.ok) && atual.length > 0

  const alterarSenha = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!auth.currentUser?.email || !podeSalvar) return

    setSalvando(true)
    try {
      const credencial = EmailAuthProvider.credential(auth.currentUser.email, atual)
      await reauthenticateWithCredential(auth.currentUser, credencial)
      await updatePassword(auth.currentUser, nova)
      toast.success('Senha atualizada com sucesso.')
      setAtual('')
      setNova('')
      setConfirmacao('')
    } catch (error) {
      const code = (error as { code?: string }).code
      toast.error(
        code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'A senha atual está incorreta.'
          : 'Não foi possível alterar a senha. Tente novamente.'
      )
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Page
      title="Perfil"
      description="Dados da sua conta e alteração de senha."
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardToolbar bordered title="Sua conta" description="Informações vinculadas ao acesso." />
          <CardContent className="pt-5">
            <div className="flex items-center gap-4">
              <Avatar name={user?.email} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {user?.email?.split('@')[0] ?? 'Usuário'}
                </p>
                <p className="truncate text-[0.8125rem] text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <Separator className="my-5" />

            <dl className="space-y-4">
              <Linha
                icone={ShieldCheck}
                rotulo="Nível de acesso"
                valor={
                  <Badge variant={claims?.role === 'super' ? 'brand' : 'default'} size="sm">
                    {claims?.role === 'super'
                      ? 'Administração central'
                      : 'Administrador de campus'}
                  </Badge>
                }
                ajuda={
                  claims?.role === 'super'
                    ? 'Você enxerga e edita os dados de todos os campi.'
                    : 'Você enxerga e edita apenas os dados do seu campus.'
                }
              />
              <Linha
                icone={UserCircle2}
                rotulo="Escopo"
                valor={
                  <span className="text-[0.8125rem] text-foreground">
                    {claims?.role === 'super'
                      ? 'Todos os campi da universidade'
                      : campusNome ?? `Campus #${claims?.campusId ?? '—'}`}
                  </span>
                }
              />
              <Linha
                icone={Mail}
                rotulo="Identificador"
                valor={
                  <span className="break-all font-mono text-2xs text-muted-foreground">
                    {user?.uid}
                  </span>
                }
                ajuda="Código interno da conta. Pode ser pedido pelo suporte."
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardToolbar
            bordered
            title="Alterar senha"
            description="Por segurança, confirme a senha atual antes de definir a nova."
          />
          <CardContent className="pt-5">
            <form onSubmit={alterarSenha} className="space-y-4">
              <Field label="Senha atual" htmlFor="atual">
                <Input
                  id="atual"
                  type="password"
                  autoComplete="current-password"
                  required
                  icon={<KeyRound />}
                  value={atual}
                  onChange={(event) => setAtual(event.target.value)}
                />
              </Field>

              <Field label="Nova senha" htmlFor="nova">
                <Input
                  id="nova"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={MIN_SENHA}
                  value={nova}
                  onChange={(event) => setNova(event.target.value)}
                />
              </Field>

              <Field label="Repita a nova senha" htmlFor="confirmacao">
                <Input
                  id="confirmacao"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={MIN_SENHA}
                  value={confirmacao}
                  onChange={(event) => setConfirmacao(event.target.value)}
                  invalid={confirmacao.length > 0 && confirmacao !== nova}
                />
              </Field>

              {/* Validação visível enquanto digita, em vez de erro só ao enviar. */}
              <ul className="space-y-1.5 rounded-lg border border-border bg-surface-sunken px-4 py-3">
                {regras.map((regra) => (
                  <li
                    key={regra.texto}
                    className={cn(
                      'flex items-center gap-2 text-xs',
                      regra.ok ? 'text-success' : 'text-muted-foreground'
                    )}
                  >
                    {regra.ok ? <Check className="size-3.5" /> : <X className="size-3.5 opacity-40" />}
                    {regra.texto}
                  </li>
                ))}
              </ul>

              <Button type="submit" disabled={!podeSalvar} loading={salvando}>
                Atualizar senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}

function Linha({
  icone: Icone,
  rotulo,
  valor,
  ajuda
}: {
  icone: typeof Mail
  rotulo: string
  valor: React.ReactNode
  ajuda?: string
}) {
  return (
    <div className="flex gap-3">
      <Icone className="mt-0.5 size-4 shrink-0 text-subtle" />
      <div className="min-w-0 flex-1">
        <dt className="text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {rotulo}
        </dt>
        <dd className="mt-1">{valor}</dd>
        {ajuda && <p className="mt-1 text-2xs leading-relaxed text-subtle">{ajuda}</p>}
      </div>
    </div>
  )
}
