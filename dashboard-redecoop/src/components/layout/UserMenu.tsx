import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useModal } from '@/contexts/ModalContext'
import { redirectToWebsite } from '@/lib/redirect'
import { UserRole } from '@/types'

function roleLabel(role: UserRole) {
  if (role === UserRole.ADMIN) return 'Administrador'
  if (role === UserRole.COOPERATIVE) return 'Cooperativa'
  return role
}

export function displayUserName(username: string, role: UserRole, cooperativeName?: string) {
  if (role === UserRole.ADMIN) return 'Administrador'
  return cooperativeName ?? username
}

export function UserMenu() {
  const { user, logout } = useAuth()
  const { confirm } = useModal()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!user) return null

  const name = displayUserName(
    user.username,
    user.role,
    user.cooperative?.fantasyName ?? user.cooperative?.name,
  )
  const initial = name[0]?.toUpperCase() ?? 'U'

  const handleLogout = () => {
    logout()
    redirectToWebsite()
  }

  const askLogout = async () => {
    setOpen(false)
    const ok = await confirm({
      title: 'Sair',
      message: 'Você deseja sair do painel?',
      confirmLabel: 'Sair',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    })
    if (ok) handleLogout()
  }

  return (
    <div className="user-menu" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="user-menu__trigger"
          aria-expanded={open}
          aria-haspopup="true"
        >
          <div className="user-menu__avatar">{initial}</div>
          <div className="user-menu__info hidden sm:block">
            <span className="user-menu__name">{name}</span>
            <span className="user-menu__email">{user.username}</span>
          </div>
          <ChevronDown
            size={16}
            className={`user-menu__chevron text-grey transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div className="user-menu__dropdown">
            <div className="user-menu__dropdown-header">
              <div className="user-menu__avatar user-menu__avatar--lg">{initial}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{name}</p>
                <p className="truncate text-xs text-grey">{user.username}</p>
              </div>
            </div>
            <div className="user-menu__dropdown-badge">
              <Shield size={14} />
              {roleLabel(user.role)}
            </div>
            <button
              type="button"
              className="user-menu__logout"
              onClick={() => void askLogout()}
            >
              <LogOut size={16} />
              Sair do painel
            </button>
          </div>
        )}
    </div>
  )
}
