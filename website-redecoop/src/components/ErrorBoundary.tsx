import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro na aplicação:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-surface text-center">
          <img src="/assets/imgs/logo.png" alt="RedeCoop" className="h-12 mb-6" />
          <h1 className="text-2xl font-bold text-ink">Algo deu errado</h1>
          <p className="mt-3 text-grey-dark max-w-md">
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full bg-green text-white px-6 py-3 text-sm font-semibold hover:bg-green-dark transition-colors"
          >
            Recarregar
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
