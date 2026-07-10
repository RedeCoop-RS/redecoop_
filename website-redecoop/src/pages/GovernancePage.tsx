import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Handshake, Sprout, TrendingUp, FileText } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
import { slideInView } from '@/lib/motion'
import '@/styles/governance.css'

const pillars = [
  {
    icon: Handshake,
    title: 'Cooperação em rede',
    text: 'Articulação entre cooperativas sem competição destrutiva — união e coletividade como base.',
  },
  {
    icon: Sprout,
    title: 'Agricultura familiar',
    text: 'Fortalecimento da produção local, cadeias curtas e qualidade nutricional dos alimentos.',
  },
  {
    icon: TrendingUp,
    title: 'Renda distribuída',
    text: 'Distensionamento de relações comerciais e sociais, gerando receita compartilhada entre associados.',
  },
]

const images = Array.from({ length: 9 }, (_, i) => ({
  src: `/assets/imgs/governance/${i + 1}.jpg`,
  alt: `Governança da cooperação solidária — cooperativas RedeCoop RS (${i + 1})`,
  span: i + 1,
}))

const hoverEase = { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }

export function GovernancePage() {
  return (
    <>
      <Navbar />

      <div className="gov-page">
        <section className="gov-hero">
          <div className="gov-inner">
            <div className="gov-hero__content">
              <div className="gov-hero__kicker">
                <span className="gov-hero__kicker-dot" />
                RedeCoop RS
              </div>
              <h1 className="gov-hero__title">
                Governança da<br />Cooperação Solidária
              </h1>
              <p className="gov-hero__subtitle">
                Cooperação · União · Coletividade
              </p>
            </div>
          </div>
        </section>

        <section className="gov-intro">
          <div className="gov-inner">
            <div className="gov-intro__grid">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <span className="gov-intro__kicker">Nossa lógica</span>
                <h2 className="gov-intro__heading">
                  Cooperação, <em>não competição</em>
                </h2>
                <p className="gov-intro__text">
                  A Governança da Cooperação Solidária criou uma lógica baseada na cooperação e não mais na
                  competição. O resultado disso é o distensionamento de relações comerciais e sociais e uma aposta
                  na união e coletividade, gerando receita e distribuição de renda.
                </p>
                <p className="gov-intro__text">
                  Isso também se deve por ser aplicado ao identificar oportunidades de melhoria nos processos de
                  gerenciamento de projetos, como a implementação de novas metodologias ou o desenvolvimento de
                  soluções tecnológicas inovadoras.
                </p>
              </motion.div>

              <motion.div
                {...slideInView}
                className="gov-intro__frame"
              >
                <OptimizedImage
                  src="/assets/imgs/home_governance.jpg"
                  alt="Governança da cooperação solidária — RedeCoop RS"
                  loading="lazy"
                  placeholder
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </div>
          </div>
        </section>

        <section className="gov-pillars">
          <div className="gov-inner">
            <div className="gov-pillars__header">
              <p className="gov-pillars__kicker">Princípios</p>
              <h2 className="gov-pillars__title">Pilares da governança</h2>
            </div>

            <div className="gov-pillars__grid">
              {pillars.map((pillar, i) => (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -10, scale: 1.03, transition: hoverEase }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.55, ease: hoverEase.ease }}
                  className="gov-pillar"
                >
                  <div className="gov-pillar__icon">
                    <pillar.icon size={22} />
                  </div>
                  <h3 className="gov-pillar__title">{pillar.title}</h3>
                  <p className="gov-pillar__text">{pillar.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="gov-termo">
          <div className="gov-inner">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="gov-termo__card"
            >
              <div className="gov-termo__badge">
                <FileText size={16} />
                Instrumento central
              </div>
              <h2 className="gov-termo__title">Termo de Cooperação</h2>
              <p className="gov-termo__text">
                O principal instrumento utilizado para garantir esse processo é chamado de &ldquo;Termo de Cooperação&rdquo;,
                documento onde as cooperativas firmam sua intenção de atuação e parceria uma com as outras e
                fortalecem a articulação em Rede. O termo de cooperação se refere principalmente a divisão de
                participação em mercados e ao compartilhamento de carga para operacionalização dos mesmos.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="gov-gallery">
          <div className="gov-inner">
            <div className="gov-gallery__header">
              <p className="gov-gallery__kicker">Na prática</p>
              <h2 className="gov-gallery__title">Cooperação em ação</h2>
            </div>

            <div className="gov-gallery__grid">
              {images.map((img, i) => (
                <motion.div
                  key={img.src}
                  initial={{ opacity: 1, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={`gov-gallery__item gov-gallery__item--${img.span}`}
                >
                  <OptimizedImage src={img.src} alt={img.alt} loading="lazy" placeholder className="w-full h-full object-cover" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <div className="gov-cta">
          <div className="gov-inner">
            <motion.div whileHover={{ scale: 1.03, y: -3 }} transition={hoverEase} className="inline-block">
              <Link to="/historia">
                <Button arrow className="text-base px-8">
                  Conheça nossa história
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer withMarginTop={false} />
    </>
  )
}
