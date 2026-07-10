import { Link } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <>
      <Navbar />
      <section className="min-h-[60vh] flex flex-col items-center justify-center px-4 bg-section-cream">
        <img src="/assets/imgs/404.svg" alt="Erro 404" className="w-64 mb-8" />
        <h1 className="text-4xl font-bold text-ink">Erro 404!</h1>
        <p className="mt-4 text-grey-dark">A página que você procura não foi encontrada.</p>
        <Link to="/" className="mt-8">
          <Button arrow>Voltar ao início</Button>
        </Link>
      </section>
      <Footer withMarginTop={false} />
    </>
  )
}
