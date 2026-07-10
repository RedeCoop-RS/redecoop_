import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
import { slideInViewDelayed } from '@/lib/motion'
import '@/styles/services.css'

const services = [
  {
    img: '/assets/imgs/services/representante_comercial.jpg',
    title: 'Representação Comercial',
    text: 'Serviço por adesão para facilitar e viabilizar o ingresso das cooperativas em novos mercados e ampliar a comercialização. O serviço também agrega solução de logística para atendimento destes mercados.',
  },
  {
    img: '/assets/imgs/services/acessoria_juridica.jpg',
    title: 'Assessoria Jurídica',
    text: 'Serviço de assessoria jurídica por adesão para atendimento das cooperativas, de forma facilitada e custo otimizado.',
  },
  {
    img: '/assets/imgs/services/acessoria_comunicacao.jpg',
    title: 'Assessoria de Comunicação',
    text: 'Serviço de assessoria por adesão para orientações e soluções visando a profissionalização do serviço de comunicação e a qualificação dos produtos da agricultura familiar.',
  },
  {
    img: '/assets/imgs/services/rastreabilidade.jpg',
    title: 'Rastreabilidade',
    text: 'Sistemas de rastreabilidade e contratação mediante adesão, para melhoria do processo de organização da produção e garantia de qualidade do alimento.',
  },
  {
    img: '/assets/imgs/services/sistema_gestao.jpg',
    title: 'Sistemas de Gestão',
    text: 'Sistemas disponíveis e contratação mediante adesão, para qualificação dos processos de gestão das cooperativas.',
  },
]

const qualities = [
  { icon: '/assets/imgs/icons/savings.svg', title: 'Organização', content: 'Estruturação da oferta' },
  { icon: '/assets/imgs/icons/mdi_badge.svg', title: 'Geração de renda', content: 'Distribuição de renda' },
  { icon: '/assets/imgs/icons/local_shipping.svg', title: 'Carga compartilhada', content: 'Logística otimizada' },
  { icon: '/assets/imgs/icons/medal.svg', title: 'Capacidade', content: 'Ampliar mercados' },
]

const testimonials = [
  { logo: '/assets/imgs/testimonial/logo_unicafes_word.png', org: 'Unicafes RS', name: 'Gervásio Plucinski', role: 'Presidente', text: 'A Redecoop é fundamental na logística dos produtos da Agricultura Familiar.' },
  { logo: '/assets/imgs/testimonial/prefeitura_itati.png', org: 'Prefeitura Municipal de Itati', name: 'Samanta Sparremberger', role: 'Nutricionista', text: 'A Redecoop é fundamental para organização das cooperativas, garantindo que os alimentos saudáveis cheguem a um preço justo até os consumidores.' },
  { logo: '/assets/imgs/testimonial/emater.jpg', org: 'ASCAR/EMATER-RS', name: 'Marcelo Souza Cotrim', role: 'Coordenador da Unidade de Cooperativismo de Porto Alegre', text: 'O trabalho da RedeCoop representa a maior forma de organização e intercooperação das cooperativas da Agricultura familiar no Rio Grande do Sul na atualidade.' },
  { logo: '/assets/imgs/testimonial/terra_livre.png', org: 'Cooperativa Terra Livre', name: 'Djones Zucolotto', role: 'Comercial', text: 'A Redecoop é uma ferramenta que vem sendo construída com varias mãos ao longo dos últimos anos e tem cumprido um papel fundamental.' },
  { logo: '/assets/imgs/testimonial/GHC_Logo.png', org: 'Grupo Hospitalar Conceição', name: 'Alex Borba dos Santos', role: 'Chefe de Gabinete da Presidência', text: 'Para nós do Grupo Hospitalar Conceição, a organização da Rede Coop tem sido essencial para garantir o abastecimento da agricultura familiar aos nossos hospitais.' },
]

const scrollEase = [0.22, 1, 0.36, 1] as const
const hoverEase = { duration: 0.35, ease: scrollEase }

export function ServicesPage() {
  return (
    <>
      <Navbar />

      <div className="svc-page">
        <section className="svc-hero">
          <div className="svc-inner">
            <div className="svc-hero__content">
              <div className="svc-hero__kicker">
                <span className="svc-hero__kicker-dot" />
                RedeCoop RS
              </div>
              <h1 className="svc-hero__title">Serviços</h1>
              <p className="svc-hero__subtitle">
                Serviços otimizados e disponibilizados às cooperativas associadas. Contratação por adesão.
              </p>
            </div>
          </div>
        </section>

        <section className="svc-list">
          <div className="svc-inner">
            <div className="svc-list__grid">
              {services.map((service, i) => (
                <motion.div
                  key={service.title}
                  {...slideInViewDelayed(i * 0.08)}
                >
                  <article className="svc-card">
                    <div className="svc-card__img-wrap">
                      <OptimizedImage src={service.img} alt={service.title} loading="lazy" placeholder className="w-full h-full object-cover" />
                    </div>
                    <div className="svc-card__body">
                      <h3 className="svc-card__title">{service.title}</h3>
                      <p className="svc-card__text">{service.text}</p>
                    </div>
                  </article>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="svc-qualities">
          <img
            src="/assets/imgs/brand-grey.svg"
            alt=""
            aria-hidden="true"
            className="svc-qualities__watermark svc-qualities__watermark--tr"
          />
          <img
            src="/assets/imgs/brand-grey.svg"
            alt=""
            aria-hidden="true"
            className="svc-qualities__watermark svc-qualities__watermark--bl"
          />

          <div className="svc-inner">
            <div className="svc-qualities__grid">
              {qualities.map((quality, i) => (
                <motion.div
                  key={quality.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.55, ease: scrollEase }}
                  className="svc-quality"
                >
                  <img src={quality.icon} alt="" className="svc-quality__icon" />
                  <p className="svc-quality__title">{quality.title}</p>
                  <p className="svc-quality__text">{quality.content}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="svc-voices">
          <div className="svc-inner">
            <div className="svc-voices__header">
              <p className="svc-voices__kicker">Depoimentos</p>
              <h2 className="svc-voices__title">Quem já aprovou a RedeCoop</h2>
              <p className="svc-voices__subtitle">
                Parceiros, instituições e cooperativas que reconhecem o trabalho da rede
              </p>
            </div>

            <div className="svc-voices__grid">
              {testimonials.map((item, i) => (
                <motion.div
                  key={item.org}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.55, ease: scrollEase }}
                >
                  <blockquote className="svc-voice">
                    <span className="svc-voice__mark" aria-hidden="true">&ldquo;</span>
                    <p className="svc-voice__text">{item.text}</p>
                    <footer className="svc-voice__footer">
                      <div className="svc-voice__logo-wrap">
                        <img src={item.logo} alt="" className="svc-voice__logo" />
                      </div>
                      <div className="svc-voice__meta">
                        <p className="svc-voice__name">{item.name}</p>
                        <p className="svc-voice__role">{item.role}</p>
                        <p className="svc-voice__org">{item.org}</p>
                      </div>
                    </footer>
                  </blockquote>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-14">
              <motion.div whileHover={{ scale: 1.03, y: -3 }} transition={hoverEase} className="inline-block">
                <Link to="/cooperativas">
                  <Button arrow className="text-base px-8">
                    Conheça as cooperativas
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>
      </div>

      <Footer withMarginTop={false} />
    </>
  )
}
