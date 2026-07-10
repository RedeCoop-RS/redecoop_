import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Handshake, Sprout, Truck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
import { fadeInView, slideInView, slideInViewDelayed } from '@/lib/motion'

const pillars = [
  {
    icon: Handshake,
    title: 'Cooperação em rede',
    text: 'Mais receita, benefícios e serviços compartilhados entre associados.',
  },
  {
    icon: Sprout,
    title: 'Agricultura familiar',
    text: 'Fortalecimento da produção local e cadeias curtas de comercialização.',
  },
  {
    icon: Truck,
    title: 'Logística compartilhada',
    text: 'Melhoria da operação logística através da intercooperação.',
  },
]

const hoverEase = { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }

export function HomeGovernanceSection() {
  return (
    <section className="relative z-10 overflow-hidden -mt-px bg-section-governance">
      <div className="home-stripe-bar" aria-hidden="true">
        <span className="home-stripe-bar__green" />
        <span className="home-stripe-bar__yellow" />
        <span className="home-stripe-bar__mint" />
      </div>

      <div className="pt-8 lg:pt-10 pb-8 lg:pb-10 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div {...slideInView} className="relative order-2 lg:order-1">
              <div className="absolute -inset-3 lg:-inset-5 rounded-[2rem] bg-green/8 -rotate-2" />
              <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-red/20 blur-2xl" />
              <div className="group relative rounded-3xl overflow-hidden shadow-2xl shadow-green/15 ring-1 ring-green/10 transition-shadow duration-300 group-hover:shadow-green/20">
                <OptimizedImage
                  src="/assets/imgs/home_governance.jpg"
                  alt="Governança da cooperação solidária"
                  loading="lazy"
                  placeholder
                  className="w-full aspect-[4/3] max-h-[280px] lg:max-h-[320px] object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-green-dark/50 via-transparent to-transparent pointer-events-none" />
              </div>
            </motion.div>

            <div className="order-1 lg:order-2">
              <motion.span {...fadeInView} className="home-kicker block">
                Governança da Cooperação Solidária
              </motion.span>

              <motion.h2
                {...fadeInView}
                transition={{ ...fadeInView.transition, delay: 0.08 }}
                className="mt-3 font-display text-2xl md:text-3xl lg:text-4xl font-bold text-ink leading-[1.15] text-balance"
              >
                Mais cooperação,{' '}
                <span className="text-green relative">
                  menos competição
                  <span className="absolute -bottom-1 left-0 right-0 h-1 bg-red/70 rounded-full" />
                </span>
                .
              </motion.h2>

              <motion.p
                {...fadeInView}
                transition={{ ...fadeInView.transition, delay: 0.16 }}
                className="mt-4 text-grey-dark text-sm md:text-base leading-relaxed"
              >
                A Governança da Cooperação Solidária criou uma lógica baseada na união e coletividade.
                O resultado é o distensionamento de relações comerciais e sociais, gerando receita e
                distribuição de renda para as famílias do campo.
              </motion.p>

              <ul className="mt-8 space-y-4">
                {pillars.map((item, i) => (
                  <motion.li
                    key={item.title}
                    {...slideInViewDelayed(0.24 + i * 0.1)}
                    whileHover={{ scale: 1.03, y: -4 }}
                    transition={hoverEase}
                    className="flex gap-4 items-start rounded-2xl bg-white/70 backdrop-blur-sm border border-white/80 p-4 shadow-sm hover:shadow-md hover:border-green/20 cursor-default"
                  >
                    <div className="shrink-0 rounded-xl bg-green/10 p-2.5 text-green">
                      <item.icon size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-ink text-sm">{item.title}</p>
                      <p className="text-sm text-grey-dark mt-0.5">{item.text}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>

              <motion.div
                {...slideInViewDelayed(0.54)}
                whileHover={{ scale: 1.04, y: -3 }}
                transition={hoverEase}
                className="mt-10 inline-block"
              >
                <Link to="/governanca">
                  <Button arrow className="text-base px-8 transition-shadow duration-300 hover:shadow-lg hover:shadow-green/25">
                    Explorar governança
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
