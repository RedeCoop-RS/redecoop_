import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
import { useModal } from '@/contexts/ModalContext'
import { fadeInView, slideInViewDelayed } from '@/lib/motion'

const paths = [
  {
    accent: 'yellow' as const,
    icon: Users,
    title: 'Para Você',
    audience: 'Consumidores e empresas',
    hook: 'Quer conhecer produtos da agricultura familiar?',
    points: ['Veja cooperativas e alimentos de qualidade', 'Cadastro simples, pessoa física ou jurídica'],
    image: '/assets/imgs/for_you_1.jpg',
    imageAlt: 'Para você',
    imagePosition: 'object-top',
    cta: 'Cadastrar',
    action: 'register' as const,
    buttonVariant: 'yellow' as const,
  },
  {
    accent: 'green' as const,
    icon: Building2,
    title: 'Para Cooperativas',
    audience: 'Cooperativas da agricultura familiar',
    hook: 'Sua cooperativa quer entrar na rede?',
    points: ['Articule-se com 50+ cooperativas no RS', 'Serviços, ferramentas e mercados em rede'],
    image: '/assets/imgs/coop.jpg',
    imageAlt: 'Para cooperativas',
    imagePosition: 'object-[center_35%]',
    cta: 'Contatar',
    href: '/contato',
    action: 'link' as const,
    buttonVariant: 'primary' as const,
  },
]

const hoverEase = { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }

export function HomeJoinSection() {
  const { openModal } = useModal()

  return (
    <section className="bg-section-cream pt-5 lg:pt-6 pb-10 lg:pb-12 px-4" id="be-part">
      <div className="mx-auto max-w-6xl">
        <motion.div
          {...fadeInView}
          className="text-center max-w-2xl mx-auto mb-5"
        >
          <span className="home-kicker">Vem fazer parte!</span>
          <h2 className="mt-2 font-display text-2xl md:text-3xl font-bold text-ink leading-tight">
            Para você ou para sua cooperativa?
          </h2>
          <p className="mt-2 text-sm text-grey-dark leading-relaxed">
            <strong className="text-green">50+ cooperativas</strong> em todo o RS — Faça seu cadastro.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {paths.map((path, i) => (
            <motion.article
              key={path.title}
              {...slideInViewDelayed(i * 0.08)}
              whileHover={{ y: -4 }}
              className={`home-join-card home-join-card--${path.accent} group flex flex-col overflow-hidden`}
            >
              <div className="relative w-full h-[220px] sm:h-[240px] lg:h-[250px] overflow-hidden shrink-0 bg-gray-100">
                <div className={`absolute top-0 left-0 right-0 z-10 h-1.5 home-join-card__bar--${path.accent}`} />
                <OptimizedImage
                  src={path.image}
                  alt={path.imageAlt}
                  loading="lazy"
                  placeholder
                  className={`w-full h-full object-cover ${path.imagePosition} transition-transform duration-500 group-hover:scale-[1.03]`}
                />
              </div>

              <div className="flex flex-col flex-1 p-6">
                <div className="flex items-center gap-3">
                  <div className={`home-join-card__icon home-join-card__icon--${path.accent}`}>
                    <path.icon size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-grey">{path.audience}</p>
                    <h3 className="text-xl font-bold text-ink">{path.title}</h3>
                  </div>
                </div>

                <p className="mt-4 text-base font-semibold text-ink leading-snug">{path.hook}</p>

                <ul className="mt-4 space-y-2 flex-1">
                  {path.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-grey-dark">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full home-join-card__dot--${path.accent}`} />
                      {point}
                    </li>
                  ))}
                </ul>

                <motion.div whileHover={{ scale: 1.02 }} transition={hoverEase} className="mt-5">
                  {path.action === 'link' && path.href ? (
                    <Link to={path.href} className="block">
                      <Button variant={path.buttonVariant} arrow className="w-full">
                        {path.cta}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant={path.buttonVariant}
                      arrow
                      className="w-full"
                      onClick={() => openModal('register')}
                    >
                      {path.cta}
                    </Button>
                  )}
                </motion.div>
              </div>
            </motion.article>
          ))}
        </div>

      </div>
    </section>
  )
}
