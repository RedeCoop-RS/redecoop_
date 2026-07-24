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
        A RedeCoop existe porque cooperativas da agricultura familiar e reforma agrária
        acreditaram que juntos vão mais longe.
      </p>
      <p className="join-cta__split">
        Fortaleça sua cooperativa, faça parte da RedeCoop.
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
