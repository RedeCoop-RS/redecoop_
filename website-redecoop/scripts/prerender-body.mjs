/**
 * Texto visível gravado no HTML de cada rota pública.
 * O React remove #prerendered ao iniciar; o arquivo continua com o conteúdo para buscadores.
 */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function stripUnsafe(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
}

export function bodyForRoute(path, { posts = [], email = 'contato@redecooprs.com.br' } = {}) {
  const pages = {
    '/': `
      <h1>Organizar a oferta, conectar famílias</h1>
      <p>A RedeCoop articula cooperativas da agricultura familiar no Rio Grande do Sul. Através da governança da cooperação solidária, otimizamos a relação de oferta e demanda entre as cooperativas que se articulam em rede.</p>
      <h2>Onde estamos</h2>
      <p>Navegue sobre o mapa e conheça mais sobre nossas cooperativas e centrais.</p>
      <h2>Governança da Cooperação Solidária</h2>
      <p>Mais cooperação, menos competição. A Governança da Cooperação Solidária criou uma lógica baseada na união e coletividade. O resultado é o distensionamento de relações comerciais e sociais, gerando receita e distribuição de renda para as famílias do campo.</p>
      <h2>Para você</h2>
      <p>Quer conhecer produtos da agricultura familiar? Veja cooperativas e alimentos de qualidade. Cadastro simples, pessoa física ou jurídica.</p>
      <h2>Para cooperativas</h2>
      <p>Sua cooperativa quer entrar na rede? Articule-se com cooperativas no RS e acesse serviços, ferramentas e mercados em rede.</p>
    `,
    '/historia': `
      <h1>Nossa História</h1>
      <p>Cooperativismo, agricultura familiar e Rio Grande do Sul.</p>
      <p>A Associação da Rede de Cooperativas da Agricultura Familiar e da Economia Solidária (RedeCoop) promove a intercooperação ao conectar cooperativas da agricultura familiar, de assentamento da reforma agrária e empreendimentos da economia solidária do Rio Grande do Sul para abastecer mercados institucionais públicos e privados com alimentos de qualidade.</p>
      <p>A Rede atua na integração da produção dos seus associados e organiza a distribuição de alimentos aos mercados consumidores, o que amplia a capacidade para atender as demandas e otimiza o processo de logística das cooperativas envolvidas. Isso significa investir em cadeias curtas de comercialização, na venda direta do agricultor familiar ao mercado consumidor final, incentivando o desenvolvimento local e assegurando a qualidade nutricional dos produtos.</p>
      <h2>Linha do tempo</h2>
      <ul>
        <li>2012 — Chamada pública Mais Gestão MDA e Emater-RS.</li>
        <li>2015 — No seminário de avaliação Mais Gestão nasce a ideia da rede; em dezembro, a primeira reunião oficial em Osório-RS.</li>
        <li>2016 — Rodada de encontros com as cooperativas, 30 reuniões em todo o Estado.</li>
        <li>2017 — Em junho a RedeCoop é fundada com 39 cooperativas de 30 municípios.</li>
        <li>2020 — Cesta de produtos da agricultura familiar, com mais de 25 mil cestas na pandemia.</li>
        <li>2024 — Desenvolvimento e lançamento da plataforma do cooperativismo em rede.</li>
      </ul>
    `,
    '/governanca': `
      <h1>Governança da Cooperação Solidária</h1>
      <p>Cooperação, união e coletividade.</p>
      <p>A Governança da Cooperação Solidária criou uma lógica baseada na cooperação e não mais na competição. O resultado disso é o distensionamento de relações comerciais e sociais e uma aposta na união e coletividade, gerando receita e distribuição de renda.</p>
      <h2>Cooperação em rede</h2>
      <p>Articulação entre cooperativas sem competição destrutiva — união e coletividade como base.</p>
      <h2>Agricultura familiar</h2>
      <p>Fortalecimento da produção local, cadeias curtas e qualidade nutricional dos alimentos.</p>
      <h2>Renda distribuída</h2>
      <p>Distensionamento de relações comerciais e sociais, gerando receita compartilhada entre associados.</p>
    `,
    '/servicos': `
      <h1>Serviços</h1>
      <p>Serviços otimizados e disponibilizados às cooperativas associadas. Contratação por adesão.</p>
      <h2>Representação Comercial</h2>
      <p>Serviço por adesão para facilitar e viabilizar o ingresso das cooperativas em novos mercados e ampliar a comercialização. O serviço também agrega solução de logística para atendimento destes mercados.</p>
      <h2>Assessoria Jurídica</h2>
      <p>Serviço de assessoria jurídica por adesão para atendimento das cooperativas, de forma facilitada e custo otimizado.</p>
      <h2>Assessoria de Comunicação</h2>
      <p>Serviço de assessoria por adesão para orientações e soluções visando a profissionalização do serviço de comunicação e a qualificação dos produtos da agricultura familiar.</p>
      <h2>Rastreabilidade</h2>
      <p>Sistemas de rastreabilidade e contratação mediante adesão, para melhoria do processo de organização da produção e garantia de qualidade do alimento.</p>
      <h2>Sistemas de Gestão</h2>
      <p>Sistemas disponíveis e contratação mediante adesão, para qualificação dos processos de gestão das cooperativas.</p>
    `,
    '/cooperativismo-de-plataforma': `
      <h1>Cooperativismo de Plataforma</h1>
      <p>Soluções e ferramentas para melhorar a viabilidade e conectar a oferta e demanda de produtos e serviços entre as cooperativas.</p>
      <h2>Balcão de Negócios</h2>
      <p>Oferta de produtos excedentes entre as cooperativas com objetivo de potencializar a comercialização de alimentos entre as cooperativas e facilitar o fluxo de comunicação.</p>
      <h2>Coopfrete</h2>
      <p>Otimize a logística dos alimentos da agricultura familiar através do serviço de compartilhamento de carga. No app, é possível encontrar a viagem ideal para gerar viabilidade logística e fomentar a intercooperação.</p>
      <h2>Compras Coletivas</h2>
      <p>Serviço de organização conjunta para compra de insumos, embalagens e outros materiais de interesse das cooperativas, com objetivo de maximizar a operação e reduzir preços com fornecedores.</p>
      <h2>Como participar</h2>
      <ol>
        <li>Nos contate. Este é o primeiro passo para participar do ecossistema da RedeCoop.</li>
        <li>Aguarde aprovação. Com tudo acertado, o acesso às ferramentas internas é liberado.</li>
        <li>Aproveite a plataforma: infraestrutura, conexões e sistemas digitais da RedeCoop.</li>
      </ol>
    `,
    '/contato': `
      <h1>Contato</h1>
      <p>Tem dúvida, sugestão ou quer fazer parte da rede? Estamos prontos para ouvir você.</p>
      <p>Suas dúvidas serão esclarecidas e sua opinião é fundamental para o nosso aperfeiçoamento.</p>
      <ul>
        <li>E-mail: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></li>
        <li>WhatsApp: <a href="https://wa.me/5551981310336">(51) 98131-0336</a></li>
        <li>Endereço: Rua Vítor Valpírio, 795 — Anchieta, Porto Alegre, RS</li>
      </ul>
    `,
    '/privacidade': `
      <h1>Política de Privacidade</h1>
      <p>Última atualização: 15 de setembro de 2026.</p>
      <h2>1. Quem somos</h2>
      <p>A RedeCoop RS opera o site redecooprs.com.br, o painel administrativo e os aplicativos associados à rede de cooperativas da agricultura familiar e economia solidária no Rio Grande do Sul.</p>
      <h2>2. Quais dados coletamos</h2>
      <p>Contato e orçamento: nome, e-mail, telefone e mensagem enviados pelos formulários do site. Cadastro e acesso: dados de usuários, cooperativas e visitantes necessários à autenticação e ao uso do painel. Navegação: identificador anônimo, páginas visitadas, tempo de permanência, rolagem e cliques, sem identificar a pessoa. Blog: conteúdo publicado via Ghost CMS.</p>
      <h2>3. Para que usamos</h2>
      <p>Tratamos dados para responder solicitações, operar a plataforma (negociações, logística CoopFrete, catálogo), melhorar o site, cumprir obrigações legais e comunicar informações relevantes sobre a RedeCoop, quando houver base legal adequada.</p>
      <h2>4. Compartilhamento</h2>
      <p>Não vendemos dados pessoais. Podemos compartilhar informações com prestadores de infraestrutura sob contrato, ou quando exigido por lei. Conteúdo público do blog permanece público.</p>
      <h2>5. Cookies e métricas</h2>
      <p>Utilizamos cookies essenciais ao funcionamento do site. O site também registra métricas anônimas de audiência no painel da RedeCoop. Se o Google Analytics estiver configurado, cookies de medição extras podem ser usados.</p>
      <h2>6. Seus direitos (LGPD)</h2>
      <p>Nos termos da Lei nº 13.709/2018, você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação de dados desnecessários e informações sobre compartilhamentos, além de revogar consentimento quando aplicável.</p>
      <h2>7. Segurança e retenção</h2>
      <p>Adotamos medidas técnicas e organizacionais razoáveis para proteger os dados. Mantemos informações pelo tempo necessário às finalidades descritas ou às exigências legais.</p>
      <h2>8. Contato do encarregado</h2>
      <p>Para exercer direitos ou tirar dúvidas: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>, WhatsApp (51) 98131-0336, ou a página de contato. Endereço: Rua Vítor Valpírio, 795 — Anchieta, Porto Alegre, RS.</p>
    `,
    '/blog': `
      <h1>Blog RedeCoop</h1>
      <p>Notícias e artigos sobre cooperativismo, agricultura familiar e economia solidária no Rio Grande do Sul.</p>
      <ul>
        ${posts
          .map((post) => {
            const title = escapeHtml(post.title || post.slug)
            const slug = escapeHtml(post.slug)
            const excerpt = escapeHtml(
              (post.custom_excerpt || post.excerpt || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
            )
            return `<li><a href="/blog/${slug}">${title}</a>${excerpt ? ` — ${excerpt}` : ''}</li>`
          })
          .join('\n')}
      </ul>
    `,
    '/404': `
      <h1>Página não encontrada</h1>
      <p>A página que você procura não existe ou foi movida.</p>
      <p><a href="/">Voltar ao início</a></p>
    `,
  }

  return pages[path] || ''
}

export function bodyForPost(post) {
  const title = escapeHtml(post.title || '')
  const html = stripUnsafe(post.html || '')
  if (html.trim()) {
    return `<article><h1>${title}</h1>${html}</article>`
  }
  const excerpt = escapeHtml(
    (post.custom_excerpt || post.excerpt || post.meta_description || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
  return `<article><h1>${title}</h1>${excerpt ? `<p>${excerpt}</p>` : ''}</article>`
}
