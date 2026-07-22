/**
 * Metadados SEO das rotas publicas — usados por prerender e sitemap.
 */
export const SITE_NAME = 'RedeCoop RS'
export const DEFAULT_TITLE =
  'RedeCoop RS \u2014 Agricultura familiar e cooperativas no RS'
export const DEFAULT_DESCRIPTION =
  'RedeCoop RS conecta cooperativas da agricultura familiar e economia solid\u00e1ria no Rio Grande do Sul.'
export const DEFAULT_IMAGE = '/assets/imgs/og-default.jpg'
export const OG_IMAGE_WIDTH = '1200'
export const OG_IMAGE_HEIGHT = '630'

/** Rotas estaticas indexaveis (caminho \u2192 meta). */
export const staticRoutes = [
  {
    path: '/',
    title: null,
    description: DEFAULT_DESCRIPTION,
    image: DEFAULT_IMAGE,
    priority: '1.0',
    changefreq: 'weekly',
  },
  {
    path: '/blog',
    title: 'Blog',
    description:
      'Not\u00edcias e artigos da RedeCoop RS sobre cooperativismo, agricultura familiar e economia solid\u00e1ria no Rio Grande do Sul.',
    image: DEFAULT_IMAGE,
    priority: '0.9',
    changefreq: 'daily',
  },
  {
    path: '/historia',
    title: 'Nossa Hist\u00f3ria',
    description:
      'Conhe\u00e7a a trajet\u00f3ria da RedeCoop RS: da chamada p\u00fablica Mais Gest\u00e3o em 2012 \u00e0 funda\u00e7\u00e3o em 2017 com 39 cooperativas e \u00e0 plataforma do cooperativismo em rede.',
    image: '/assets/imgs/history_1.jpg',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/governanca',
    title: 'Governan\u00e7a',
    description:
      'Como funciona a governan\u00e7a da RedeCoop RS: coopera\u00e7\u00e3o em rede, fortalecimento da agricultura familiar e renda distribu\u00edda entre os associados.',
    image: '/assets/imgs/home_governance.jpg',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/servicos',
    title: 'Servi\u00e7os',
    description:
      'Servi\u00e7os da RedeCoop RS para cooperativas da agricultura familiar: representa\u00e7\u00e3o comercial, log\u00edstica e apoio \u00e0 comercializa\u00e7\u00e3o em novos mercados.',
    image: DEFAULT_IMAGE,
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/cooperativismo-de-plataforma',
    title: 'Cooperativismo de plataforma',
    description:
      'Plataforma do cooperativismo em rede da RedeCoop RS: Balc\u00e3o de Neg\u00f3cios, CoopFrete e Compras Coletivas para conectar cooperativas da agricultura familiar.',
    image: DEFAULT_IMAGE,
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/contato',
    title: 'Contato',
    description:
      'Fale com a RedeCoop RS por e-mail, WhatsApp (51) 98131-0336 ou visite-nos em Porto Alegre. Atendemos cooperativas de todo o Rio Grande do Sul.',
    image: DEFAULT_IMAGE,
    priority: '0.6',
    changefreq: 'monthly',
  },
  {
    path: '/privacidade',
    title: 'Privacidade',
    description:
      'Pol\u00edtica de privacidade da RedeCoop RS: como tratamos dados pessoais no site, no painel e nos canais de contato, em conformidade com a LGPD.',
    image: DEFAULT_IMAGE,
    priority: '0.3',
    changefreq: 'yearly',
  },
]

/** Shells SPA com noindex (rotas autenticadas / dinamicas). */
export const spaShellRoutes = [
  { path: '/cooperativas', title: 'Cooperativas', noindex: true },
  { path: '/completar-cadastro', title: 'Completar Cadastro', noindex: true },
]

export function fullTitle(title) {
  return title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE
}
