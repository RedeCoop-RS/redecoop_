import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Seo, seoDefaults } from '@/components/Seo'
import { Button } from '@/components/ui/Button'
import { CooperativesMapSection } from '@/components/map/CooperativesMapSection'
import { HomeGovernanceSection } from '@/components/home/HomeGovernanceSection'
import { HomeJoinSection } from '@/components/home/HomeJoinSection'
import { HomeBlogSection } from '@/components/home/HomeBlogSection'
import { useModal } from '@/contexts/ModalContext'
import { environment } from '@/config/environment'
import { ghostService } from '@/services/ghost.service'
import { fadeIn } from '@/lib/motion'
import type { GhostPost } from '@/types'

export function HomePage() {
  const { openModal } = useModal()
  const [posts, setPosts] = useState<GhostPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [blogError, setBlogError] = useState(false)

  useEffect(() => {
    ghostService
      .getRecentPosts(3)
      .then((data) => {
        setPosts(data)
        setBlogError(false)
      })
      .catch(() => {
        setPosts([])
        setBlogError(true)
      })
      .finally(() => setLoadingPosts(false))
  }, [])

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  const siteUrl = environment.siteUrl.replace(/\/$/, '')

  return (
    <>
      <Seo
        path="/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: seoDefaults.siteName,
            url: siteUrl,
            description: seoDefaults.description,
            publisher: {
              '@type': 'Organization',
              name: seoDefaults.siteName,
              url: siteUrl,
            },
            inLanguage: 'pt-BR',
          },
        ]}
      />
      <Navbar />

      <main>
      <section className="hero-home relative overflow-hidden pt-20 pb-12 lg:pt-24 lg:pb-14">
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeIn}>
              <span className="inline-block rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white/90 mb-6">
                Agricultura familiar · Economia solidária · RS
              </span>
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
                Organizar a <em className="not-italic text-red">oferta,</em>
                <br />
                conectar <em className="not-italic text-red">famílias</em>
              </h1>
              <p className="mt-4 text-base text-white/85 leading-relaxed max-w-xl">
                A <strong>RedeCoop</strong> articula cooperativas da agricultura familiar no Rio Grande do Sul.
                Através da governança da cooperação solidária, otimizamos a relação de oferta e demanda
                entre as cooperativas que se articulam em rede.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <motion.div whileHover={{ y: -3, scale: 1.03 }} transition={{ duration: 0.3 }}>
                  <Button
                    variant="yellow"
                    arrow
                    onClick={() => openModal('choose-login')}
                    className="text-base"
                  >
                    Acessar
                  </Button>
                </motion.div>
                <motion.div whileHover={{ y: -3, scale: 1.03 }} transition={{ duration: 0.3 }}>
                  <Link to="/historia">
                    <Button
                      variant="secondary"
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:shadow-lg hover:shadow-black/20"
                    >
                      Nossa história
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </motion.div>

            <div className="flex justify-center">
              <img
                src="/assets/imgs/banner-content.png"
                alt="Ilustração RedeCoop RS"
                width={448}
                height={448}
                decoding="async"
                fetchPriority="high"
                className="w-full max-w-sm lg:max-w-md h-auto drop-shadow-2xl"
              />
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 leading-[0] pointer-events-none" aria-hidden="true">
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="w-full block h-12">
            <rect width="1440" height="48" fill="#ffffff" />
            <path d="M0 24C240 48 480 0 720 24C960 48 1200 0 1440 24V48H0V24Z" fill="#ffffff" />
          </svg>
        </div>
      </section>

      <CooperativesMapSection />

      <HomeGovernanceSection />
      <HomeJoinSection />
      <HomeBlogSection
        posts={posts}
        loading={loadingPosts}
        formatDate={formatDate}
        error={blogError}
      />
      </main>

      <Footer withMarginTop={false} />
    </>
  )
}
