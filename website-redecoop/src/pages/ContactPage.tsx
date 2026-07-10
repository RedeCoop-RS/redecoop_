import { motion } from 'framer-motion'
import { Mail, MapPin, Phone } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ContactForm } from '@/components/forms/ContactForm'
import '@/styles/contact.css'

const channels = [
  {
    icon: Mail,
    label: 'E-mail',
    value: 'redecoop.rs@gmail.com.br',
    href: 'mailto:redecoop.rs@gmail.com.br',
  },
  {
    icon: Phone,
    label: 'WhatsApp',
    value: '(51) 98131-0336',
    href: 'https://wa.me/5551981310336',
    external: true,
  },
  {
    icon: MapPin,
    label: 'Endereço',
    value: 'Rua Vítor Valpírio, 795 — Anchieta, Porto Alegre, RS',
    static: true,
  },
]

const socials = [
  { href: 'https://instagram.com/redecooprs', icon: '/assets/imgs/icons/instagram.svg', label: 'Instagram redecooprs' },
  { href: 'https://facebook.com/RedeCoop-RS', icon: '/assets/imgs/icons/facebook.svg', label: 'Facebook RedeCoop-RS' },
]

const scrollEase = [0.22, 1, 0.36, 1] as const

export function ContactPage() {
  return (
    <>
      <Navbar />

      <div className="contact-page">
        <section className="contact-hero">
          <div className="contact-inner">
            <div className="contact-hero__content">
              <div className="contact-hero__kicker">
                <span className="contact-hero__kicker-dot" />
                RedeCoop RS
              </div>
              <h1 className="contact-hero__title">Contato</h1>
              <p className="contact-hero__subtitle">
                Tem dúvida, sugestão ou quer fazer parte da rede? Estamos prontos para ouvir você.
              </p>
            </div>
          </div>
        </section>

        <section className="contact-body">
          <div className="contact-inner">
            <div className="contact-body__grid">
              <motion.aside
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, ease: scrollEase }}
              >
                <p className="contact-aside__intro">
                  Suas dúvidas serão esclarecidas e sua opinião é fundamental para o nosso
                  aperfeiçoamento. Use o formulário ou um dos canais abaixo.
                </p>

                <div className="contact-channels">
                  {channels.map((channel) => {
                    const Icon = channel.icon
                    const content = (
                      <>
                        <div className="contact-channel__icon">
                          <Icon size={20} />
                        </div>
                        <div>
                          <p className="contact-channel__label">{channel.label}</p>
                          <p className="contact-channel__value">{channel.value}</p>
                        </div>
                      </>
                    )

                    if (channel.static) {
                      return (
                        <div key={channel.label} className="contact-channel contact-channel--static">
                          {content}
                        </div>
                      )
                    }

                    return (
                      <a
                        key={channel.label}
                        href={channel.href}
                        className="contact-channel"
                        target={channel.external ? '_blank' : undefined}
                        rel={channel.external ? 'noopener noreferrer' : undefined}
                      >
                        {content}
                      </a>
                    )
                  })}
                </div>

                <div className="contact-social">
                  <span className="contact-social__label">Redes sociais</span>
                  {socials.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contact-social__link"
                      aria-label={social.label}
                    >
                      <img src={social.icon} alt="" />
                    </a>
                  ))}
                </div>
              </motion.aside>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, ease: scrollEase }}
                className="contact-form-card"
              >
                <h2 className="contact-form-card__title">Envie sua mensagem</h2>
                <p className="contact-form-card__note">
                  Preencha o formulário e retornaremos o mais breve possível.
                </p>
                <ContactForm showHeader={false} />
              </motion.div>
            </div>
          </div>
        </section>
      </div>

      <Footer withMarginTop={false} />
    </>
  )
}
