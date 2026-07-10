import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import '@/styles/footer.css'

interface FooterProps {
  withMarginTop?: boolean
}

const footerLinks = [
  { to: '/', label: 'Home' },
  { to: '/historia', label: 'Nossa História' },
  { to: '/governanca', label: 'Governança' },
  { to: '/cooperativismo-de-plataforma', label: 'Cooperativismo de plataforma' },
  { to: '/servicos', label: 'Serviços' },
  { to: '/blog', label: 'Blog' },
  { to: '/contato', label: 'Contato' },
]

const contacts = [
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
  { href: 'https://instagram.com/redecooprs', icon: '/assets/imgs/icons/instagram.svg', handle: 'redecooprs' },
  { href: 'https://facebook.com/RedeCoop-RS', icon: '/assets/imgs/icons/facebook.svg', handle: 'RedeCoop-RS' },
]

export function Footer({ withMarginTop = true }: FooterProps) {
  const { isLoggedIn } = useAuth()
  const navLinks = isLoggedIn
    ? [...footerLinks, { to: '/cooperativas', label: 'Cooperativas' }]
    : footerLinks

  return (
    <footer id="footer" className={`site-footer-wrap ${withMarginTop ? 'mt-10' : ''}`}>
      <div className="site-footer">
        <img
          src="/assets/imgs/brand-grey.svg"
          alt=""
          aria-hidden="true"
          className="site-footer__watermark"
        />

        <div className="site-footer__inner">
          <div className="site-footer__grid">
            <div>
              <img
                src="/assets/imgs/logo-white.png"
                alt="RedeCoop RS"
                className="site-footer__logo"
              />
              <p className="site-footer__tagline">
                Rede de cooperativas da agricultura familiar e economia solidária do RS.
              </p>
            </div>

            <div>
              <h4 className="site-footer__title">Navegação</h4>
              <ul className="site-footer__nav">
                {navLinks.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="site-footer__link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="site-footer__title">Contato</h4>
              <div className="site-footer__contacts">
                {contacts.map((item) => {
                  const Icon = item.icon
                  const inner = (
                    <>
                      <Icon size={17} className="site-footer__contact-icon" />
                      <div>
                        <p className="site-footer__contact-label">{item.label}</p>
                        <p className="site-footer__contact-value">{item.value}</p>
                      </div>
                    </>
                  )

                  if (item.static) {
                    return (
                      <div key={item.label} className="site-footer__contact">
                        {inner}
                      </div>
                    )
                  }

                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      className="site-footer__contact"
                      target={item.external ? '_blank' : undefined}
                      rel={item.external ? 'noopener noreferrer' : undefined}
                    >
                      {inner}
                    </a>
                  )
                })}
              </div>

              <div className="site-footer__socials">
                {socials.map((social) => (
                  <a
                    key={social.handle}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="site-footer__social"
                    aria-label={social.handle}
                  >
                    <img src={social.icon} alt="" />
                    <span>{social.handle}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="site-footer__bottom">
            <p className="site-footer__copy">
              © {new Date().getFullYear()} RedeCoop RS — Todos os direitos reservados
            </p>
            <p className="site-footer__motto">Cooperativismo · Agricultura familiar · RS</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
