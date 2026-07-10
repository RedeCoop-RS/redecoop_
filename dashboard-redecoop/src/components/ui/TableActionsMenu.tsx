import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'
import {
  FLOATING_MENU_WIDTH,
  computeFloatingMenuPosition,
  estimateFloatingMenuHeight,
} from '@/lib/floatingMenu'

export interface TableAction<T> {
  label: string
  icon?: ReactNode
  onClick: (row: T) => void
  variant?: 'default' | 'danger' | 'success'
  hidden?: (row: T) => boolean
}

export function TableActionsMenu<T>({
  row,
  actions,
  quickAction,
}: {
  row: T
  actions: TableAction<T>[]
  quickAction?: TableAction<T>
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  const visible = actions.filter((action) => !action.hidden?.(row))

  const reposition = useCallback(
    (measuredHeight?: number) => {
      if (!triggerRef.current) return null
      const rect = triggerRef.current.getBoundingClientRect()
      const height = measuredHeight ?? estimateFloatingMenuHeight(visible.length)
      return computeFloatingMenuPosition(rect, FLOATING_MENU_WIDTH, height)
    },
    [visible.length],
  )

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return
    const height = menuRef.current.getBoundingClientRect().height
    const next = reposition(height)
    if (next) setPosition(next)
  }, [open, visible.length, reposition])

  useEffect(() => {
    if (!open) return

    const onReposition = () => {
      const height = menuRef.current?.getBoundingClientRect().height
      const next = reposition(height)
      if (next) setPosition(next)
    }

    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)

    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, reposition])

  useEffect(() => {
    if (!open) return

    const close = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        wrapRef.current?.contains(target) ||
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
      setPosition(null)
    }

    const timer = window.setTimeout(() => {
      document.addEventListener('click', close, true)
    }, 0)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('click', close, true)
    }
  }, [open])

  const toggleMenu = () => {
    if (open) {
      setOpen(false)
      setPosition(null)
      return
    }
    const next = reposition()
    if (!next) return
    setPosition(next)
    setOpen(true)
  }

  const run = (action: TableAction<T>) => {
    setOpen(false)
    setPosition(null)
    action.onClick(row)
  }

  if (visible.length === 0 && !quickAction) return null

  return (
    <>
      <div className="coops-actions" ref={wrapRef}>
        {quickAction && !quickAction.hidden?.(row) && (
          <button
            type="button"
            className={`coops-actions__trigger ${quickAction.variant === 'success' ? 'coops-actions__trigger--success' : ''} ${quickAction.variant === 'danger' ? 'coops-actions__trigger--danger' : ''}`}
            aria-label={quickAction.label}
            title={quickAction.label}
            onClick={() => run(quickAction)}
          >
            {quickAction.icon}
          </button>
        )}
        {visible.length > 0 && (
          <button
            ref={triggerRef}
            type="button"
            className="coops-actions__trigger"
            aria-label="Mais ações"
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation()
              toggleMenu()
            }}
          >
            <MoreHorizontal size={18} />
          </button>
        )}
      </div>
      {open &&
        position &&
        visible.length > 0 &&
        createPortal(
          <div
            ref={menuRef}
            className="coops-actions__menu coops-actions__menu--portal"
            style={{ top: position.top, left: position.left, width: FLOATING_MENU_WIDTH }}
            role="menu"
          >
            {visible.map((action) => (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                className={action.variant === 'danger' ? 'text-red' : undefined}
                onClick={() => run(action)}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
