import { Button } from '@/components/ui/Button'
import { useModal } from '@/contexts/ModalContext'
import '@/styles/blog.css'

interface JoinRedeCoopCtaProps {
  className?: string
}

export function JoinRedeCoopCta({ className = '' }: JoinRedeCoopCtaProps) {
  const { openModal } = useModal()

  return (
    <aside className={`join-cta ${className}`.trim()} aria-label="Faça parte da RedeCoop">
      <p className="join-cta__lead">
        Toda grande rede começa com uma decisão simples: crescer junto.
      </p>
      <p className="join-cta__body">
        A RedeCoop existe porque produtores e cooperativas do RS acreditaram que juntos vão mais
        longe — e o próximo capítulo pode ser o seu.
      </p>
      <p className="join-cta__split">
        Se você é produtor, tenha uma cooperativa que trabalha por você.
        <br />
        Se representa uma cooperativa, some forças com quem já entende o campo.
      </p>
      <Button
        type="button"
        variant="primary"
        arrow
        className="join-cta__btn"
        onClick={() => openModal('take-part')}
      >
        Quero fazer parte da RedeCoop
      </Button>
    </aside>
  )
}
