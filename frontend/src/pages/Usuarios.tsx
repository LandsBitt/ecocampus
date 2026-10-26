import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'

import { UsuarioDialog } from '@/components/UsuarioDialog'
import { Page } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { SkeletonTable } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useCampusList, useUsuarios } from '@/hooks/queries'
import { api, detalheDoErro } from '@/lib/api'
import { useAuth } from '@/providers/AuthProvider'
import type { Usuario, UsuarioInput } from '@/lib/types'

function formatData(ms: number | null): string {
  return ms ? new Date(ms).toLocaleDateString('pt-BR') : '—'
}

export default function Usuarios() {
  const { getToken, user } = useAuth()
  const queryClient = useQueryClient()
  const usuarios = useUsuarios()
  const campi = useCampusList()

  const [dialogAberto, setDialogAberto] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)

  const nomeDoCampus = (id: number | null) => campi.data?.find((c) => c.id === id)?.nome ?? `Campus ${id}`
  const atualizarLista = () => queryClient.invalidateQueries({ queryKey: ['usuarios'] })

  const criar = useMutation({
    mutationFn: async (dados: UsuarioInput) => api.post<Usuario>('/usuarios', dados, await getToken()),
    onSuccess: (novo) => {
      toast.success('Usuário criado.', { description: `${novo.email} já pode entrar no sistema.` })
      atualizarLista()
    }
  })

  const alterar = useMutation({
    mutationFn: async ({ uid, ...dados }: { uid: string; role?: string; campusId?: number | null; desativado?: boolean }) =>
      api.patch<Usuario>(`/usuarios/${uid}`, dados, await getToken()),
    onSuccess: () => atualizarLista(),
    onError: (error) => toast.error(detalheDoErro(error) ?? 'Não foi possível alterar o usuário.')
  })

  async function salvar(dados: UsuarioInput) {
    try {
      if (editando) {
        await alterar.mutateAsync({ uid: editando.uid, role: dados.role, campusId: dados.campusId })
        toast.success('Acesso atualizado.')
      } else {
        await criar.mutateAsync(dados)
      }
      setDialogAberto(false)
    } catch (error) {
      // Mantém o diálogo aberto para corrigir (ex.: e-mail já cadastrado).
      if (!editando) toast.error(detalheDoErro(error) ?? 'Não foi possível criar o usuário.')
    }
  }

  function abrir(usuario: Usuario | null) {
    setEditando(usuario)
    setDialogAberto(true)
  }

  return (
    <Page
      title="Usuários"
      description="Quem acessa o EcoCampus e o que cada pessoa pode ver."
      actions={
        <Button onClick={() => abrir(null)}>
          <UserPlus />
          Novo usuário
        </Button>
      }
    >
      {usuarios.isError ? (
        <ErrorState
          action={
            <Button variant="secondary" size="sm" onClick={() => usuarios.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : usuarios.isLoading ? (
        <SkeletonTable rows={4} cols={5} />
      ) : (usuarios.data ?? []).length === 0 ? (
        <EmptyState title="Nenhum usuário cadastrado" description="Crie o primeiro acesso pelo botão acima." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>E-mail</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead className="hidden md:table-cell">Último acesso</TableHead>
                <TableHead className="w-48 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(usuarios.data ?? []).map((usuario) => {
                const souEu = usuario.uid === user?.uid
                return (
                  <TableRow key={usuario.uid} className={usuario.desativado ? 'opacity-60' : undefined}>
                    <TableCell className="max-w-[16rem] truncate font-medium">
                      {usuario.email ?? usuario.uid}
                      {souEu && <span className="ml-2 text-2xs text-muted-foreground">(você)</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {usuario.role === 'super' ? (
                          <Badge variant="brand" size="sm">Administração central</Badge>
                        ) : usuario.role === 'campus' ? (
                          <Badge size="sm">{nomeDoCampus(usuario.campusId)}</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">Sem acesso definido</Badge>
                        )}
                        {usuario.desativado && (
                          <Badge variant="destructive" size="sm">Desativado</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap tabular-nums text-muted-foreground md:table-cell">
                      {formatData(usuario.ultimoAcesso)}
                    </TableCell>
                    <TableCell className="text-right">
                      {!souEu && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => abrir(usuario)}>
                            {usuario.role ? 'Alterar' : 'Liberar'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              alterar.mutate({ uid: usuario.uid, desativado: !usuario.desativado })
                            }
                          >
                            {usuario.desativado ? 'Reativar' : 'Desativar'}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <UsuarioDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        onSubmit={salvar}
        editing={editando}
        campusOptions={campi.data ?? []}
      />
    </Page>
  )
}
