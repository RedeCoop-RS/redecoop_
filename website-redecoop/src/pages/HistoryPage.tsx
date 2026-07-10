import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
import { slideInView } from '@/lib/motion'
import '@/styles/history.css'

const timeline = [
  {
    year: '2012',
    text: 'Chamada pública Mais Gestão MDA e Emater-RS',
    position: 'up' as const,
  },
  {
    year: '2015',
    text: 'Em agosto no seminário de avaliação Mais Gestão, nasce a ideia da formação de uma rede de cooperativas e em dezembro acontece a primeira reunião oficial do grupo de cooperativas para formação da RedeCoop em Osório-RS',
    position: 'down' as const,
  },
  {
    year: '2016',
    text: 'Rodada de encontros com as cooperativas em 2015 e 2016 totalizaram 30 reuniões em todo o Estado.',
    position: 'up' as const,
  },
  {
    year: '2017',
    text: 'Em junho a Redecoop é fundada com 39 cooperativas de 30 municípios.',
    position: 'down' as const,
  },
  {
    year: '2020',
    text: 'Criação da Cesta de produtos da agricultura familiar, operacionalizada através da Redecoop e que totalizaram mais de 25 mil cestas entregues no período da pandemia.',
    position: 'up' as const,
  },
  {
    year: '2024',
    text: 'Desenvolvimento e lançamento da plataforma do cooperativismo em rede.',
    position: 'down' as const,
  },
]

const stats = [
  { value: '2017', label: 'Fundação' },
  { value: '50+', label: 'Cooperativas' },
  { value: '25 mil', label: 'Cestas na pandemia' },
  { value: '30', label: 'Reuniões no RS' },
]

const hoverEase = { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }

export function HistoryPage() {
  return (
    <>
      <Navbar />

      <div className="history-page">
        <section className="history-hero">
          <div className="history-inner">
            <div className="history-hero__content">
              <div className="history-hero__kicker">
                <span className="history-hero__kicker-dot" />
                RedeCoop RS
              </div>
              <h1 className="history-hero__title">Nossa História</h1>
              <p className="history-hero__subtitle">
                Cooperativismo · Agricultura familiar · Rio Grande do Sul
              </p>
            </div>
          </div>
        </section>

        <section className="history-intro">
          <div className="history-inner">
            <div className="history-intro__card">
              <p className="history-intro__lead">
                A <strong>Associação da Rede de Cooperativas da Agricultura Familiar e da Economia Solidária</strong> (RedeCoop)
                promove a intercooperação ao conectar cooperativas da agricultura familiar, de assentamento da
                reforma agrária e empreendimentos da economia solidária do Rio Grande do Sul para abastecer
                mercados institucionais públicos e privados com alimentos de qualidade.
              </p>
              <p className="history-intro__lead mt-6">
                A Rede atua na integração da produção dos seus associados e organiza a distribuição de alimentos
                aos mercados consumidores, o que amplia a capacidade para atender as demandas e otimiza o
                processo de logística das cooperativas envolvidas. Isso significa investir em cadeias curtas
                de comercialização, na venda direta do agricultor familiar ao mercado consumidor final,
                incentivando o desenvolvimento local e assegurando a qualidade nutricional dos produtos.
              </p>
            </div>
          </div>
        </section>

        <section className="history-logistics">
          <div className="history-inner">
            <div className="history-logistics__grid">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <span className="history-logistics__label">Pilar da rede</span>
                <h2 className="history-logistics__title">Logística compartilhada</h2>
                <p className="history-logistics__text">
                  A integração da logística e comercialização é o pilar do sucesso da parceria. A RedeCoop vai
                  manter um método próprio de rastreabilidade sobre alimentos, entregas, logística reversa,
                  produtos (tipo, quantidade, peso, sazonalidade), valores (produtos, fretes), mercados e conexões.
                </p>
              </motion.div>

              <motion.div
                {...slideInView}
                className="history-logistics__frame"
              >
                <OptimizedImage
                  src="/assets/imgs/history_1.jpg"
                  alt="Logística compartilhada — RedeCoop RS"
                  loading="lazy"
                  placeholder
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </div>
          </div>
        </section>

        <section className="history-timeline-section">
          <div className="history-inner">
            <div className="history-timeline__header">
              <p className="history-timeline__kicker">Marcos importantes</p>
              <h2 className="history-timeline__title">Linha do Tempo</h2>
            </div>

            <div className="history-timeline">
              {timeline.map((item, i) => (
                <div
                  key={item.year}
                  className={`history-timeline__item history-timeline__item--${item.position}`}
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="history-timeline__bubble">
                    <span className="history-timeline__bubble-year">{item.year}</span>
                    <p className="history-timeline__bubble-text">{item.text}</p>
                  </div>
                  <span className="history-timeline__dot" aria-hidden="true" />
                </div>
              ))}
            </div>

            <div className="history-stats">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="history-stat"
                >
                  <p className="history-stat__value">{stat.value}</p>
                  <p className="history-stat__label">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-14">
              <motion.div whileHover={{ scale: 1.03, y: -3 }} transition={hoverEase} className="inline-block">
                <Link to="/governanca">
                  <Button arrow className="text-base px-8">
                    Conheça nossa governança
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
