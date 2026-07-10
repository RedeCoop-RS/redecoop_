interface LoadingOverlayProps {
  visible: boolean
  message?: string
  inline?: boolean
}

export function LoadingOverlay({ visible, message = 'Carregando...', inline = false }: LoadingOverlayProps) {
  if (!visible) return null

  if (inline) {
    return (
      <div className="loading-inline">
        <div className="flex flex-col items-center gap-3">
          <div className="loading-spinner" />
          {message && <p className="text-sm text-grey-dark">{message}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="loading-overlay">
      <div className="flex flex-col items-center gap-4">
        <div className="loading-spinner" />
        <p className="text-sm font-medium text-grey-dark">{message}</p>
      </div>
    </div>
  )
}
