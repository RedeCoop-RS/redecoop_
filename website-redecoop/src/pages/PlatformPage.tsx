import { motion } from 'framer-motion'
import { Handshake, Truck, ShoppingCart } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { useModal } from '@/contexts/ModalContext'
import '@/styles/platform.css'

const services = [
  {
    icon: Handshake,
    title: 'Balcão de Negócios',
    text: 'Oferta de produtos excedentes entre as cooperativas com objetivo de potencializar a comercialização de alimentos entre as Cooperativas e facilitar o fluxo de comunicação.',
    wide: false,
  },
  {
    icon: Truck,
    title: 'Coopfrete',
    text: 'Otimize a logística dos alimentos da agricultura familiar através do serviço de compartilhamento de carga. No app, é possível encontrar a viagem ideal para gerar viabilidade logística e fomentar a intercooperação.',
    wide: false,
  },
  {
    icon: ShoppingCart,
    title: 'Compras Coletivas',
    text: 'Serviço de organização conjunta para compra de insumos, embalagens e outros materiais de interesse das cooperativas, com objetivo de maximizar a operação e reduzir preços com fornecedores.',
    wide: true,
  },
]

const steps = [
  {
    num: '01',
    title: 'Nos contate!',
    text: (
      <>
        Basta <strong>chamar a gente!</strong> Este é o primeiro passo para você participar do ecossistema da RedeCoop.
      </>
    ),
  },
  {
    num: '02',
    title: 'Aguarde aprovação',
    text: (
      <>
        Assim que trocarmos informações e estiver tudo acertado, <strong>liberaremos o acesso</strong> para você utilizar as ferramentas internas da RedeCoop!
      </>
    ),
  },
  {
    num: '03',
    title: 'Aproveite a plataforma!',
    text: (
      <>
        Com a plataforma liberada, você tem acesso a toda a infraestrutura, conexões e sistemas digitais disponibilizados pela RedeCoop. <strong>Conte conosco!</strong>
      </>
    ),
  },
]

const hoverEase = { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }

export function PlatformPage() {
  const { openModal } = useModal()

  return (
    <>
      <Navbar />

      <div className="plat-page">
        <section className="plat-hero">
          <div className="plat-inner">
            <div className="plat-hero__content">
              <div className="plat-hero__kicker">
                <span className="plat-hero__kicker-dot" />
                RedeCoop RS
              </div>
              <h1 className="plat-hero__title">
                Cooperativismo<br />de Plataforma
              </h1>
              <p className="plat-hero__subtitle">
                Soluções e ferramentas para melhorar a viabilidade e conectar a oferta e demanda de produtos
                e serviços entre as cooperativas.
              </p>
            </div>
          </div>
        </section>

        <section className="plat-services" id="servicos">
          <div className="plat-inner">
            <div className="plat-services__grid">
              {services.map((service, i) => (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -10, scale: 1.02, transition: hoverEase }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.55, ease: hoverEase.ease }}
                  className={`plat-service${service.wide ? ' plat-service--wide' : ''}`}
                >
                  <div className="plat-service__head">
                    <div className="plat-service__icon">
                      <service.icon size={24} />
                    </div>
                    <h3 className="plat-service__name">{service.title}</h3>
                  </div>
                  <p className="plat-service__text">{service.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="plat-join" id="take-part">
          <img
            src="/assets/imgs/brand-grey.svg"
            alt=""
            aria-hidden="true"
            className="plat-join__watermark"
          />

          <div className="plat-inner">
            <div className="plat-join__intro">
              <p className="plat-join__intro-label">Ainda não faz parte?</p>
              <h2 className="plat-join__intro-title">
                Comece <span>agora mesmo ↓</span>
              </h2>
            </div>

            <div className="plat-join__steps">
              {steps.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.55, ease: hoverEase.ease }}
                >
                  <div className="plat-step">
                    <p className="plat-step__num">{step.num}</p>
                    <h3 className="plat-step__title">{step.title}</h3>
                    <p className="plat-step__text">{step.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="plat-join__cta">
              <p className="plat-join__slogan">Mais cooperação, menos competição.</p>
              <motion.div whileHover={{ scale: 1.04, y: -3 }} transition={hoverEase} className="inline-block">
                <Button variant="yellow" onClick={() => openModal('take-part')} className="text-lg px-8">
                  Quero fazer parte!
                </Button>
              </motion.div>
            </div>
          </div>
        </section>
      </div>

      <Footer withMarginTop={false} />
    </>
  )
}
