import { Link } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Seo } from '@/components/Seo'
import { environment } from '@/config/environment'

export function PrivacyPage() {
  return (
    <>
      <Seo
        title="Privacidade"
        description="Política de privacidade da RedeCoop RS: como tratamos dados pessoais no site, no painel e nos canais de contato, em conformidade com a LGPD."
        path="/privacidade"
      />
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-16 lg:px-8 lg:py-20">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-green">Legal</p>
        <h1 className="mb-4 text-3xl font-bold text-ink lg:text-4xl">Política de Privacidade</h1>
        <p className="mb-10 text-sm text-grey">Última atualização: 15 de setembro de 2026</p>

        <div className="space-y-8 text-[15px] leading-relaxed text-grey-dark">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink">1. Quem somos</h2>
            <p>
              A RedeCoop RS (“RedeCoop”, “nós”) opera o site{' '}
              <a href="https://redecooprs.com.br" className="text-green underline">
                redecooprs.com.br
              </a>
              , o painel administrativo e os aplicativos associados à rede de cooperativas da
              agricultura familiar e economia solidária no Rio Grande do Sul.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink">2. Quais dados coletamos</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Contato e orçamento:</strong> nome, e-mail, telefone e mensagem enviados
                pelos formulários do site.
              </li>
              <li>
                <strong>Cadastro e acesso:</strong> dados de usuários, cooperativas e visitantes
                necessários à autenticação e ao uso do painel/plataforma.
              </li>
              <li>
                <strong>Navegação:</strong> identificador anônimo no navegador, páginas visitadas,
                tempo de permanência, profundidade de rolagem e posição aproximada de cliques,
                para entender o uso do site. Não usamos esses dados para identificar você. Também
                podemos usar cookies ou ferramentas de medição de audiência (ex.: Google
                Analytics), se ativadas.
              </li>
              <li>
                <strong>Blog:</strong> conteúdo publicado via Ghost CMS; comentários não são
                oferecidos neste site.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink">3. Para que usamos</h2>
            <p>
              Tratamos dados para responder solicitações, operar a plataforma (negociações,
              logística CoopFrete, catálogo), melhorar o site, cumprir obrigações legais e
              comunicar informações relevantes sobre a RedeCoop, quando houver base legal adequada.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink">4. Compartilhamento</h2>
            <p>
              Não vendemos dados pessoais. Podemos compartilhar informações com prestadores de
              infraestrutura (hospedagem, e-mail, analytics) sob contrato, ou quando exigido por
              lei. Conteúdo público do blog permanece público.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink">5. Cookies e métricas</h2>
            <p>
              Utilizamos cookies essenciais ao funcionamento do site (ex.: sessão). O site também
              registra métricas anônimas de audiência (visitas, telas mais vistas e mapa de calor
              de cliques) no painel da RedeCoop, com base no interesse legítimo de melhorar o
              serviço. Se o Google Analytics (GA4) estiver configurado, cookies de medição extras
              podem ser usados. Você pode bloquear cookies não essenciais nas configurações do
              navegador ou ativar “Não rastrear” (DNT).
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink">6. Seus direitos (LGPD)</h2>
            <p>
              Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode
              solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade,
              eliminação de dados desnecessários e informações sobre compartilhamentos, além de
              revogar consentimento quando aplicável.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink">7. Segurança e retenção</h2>
            <p>
              Adotamos medidas técnicas e organizacionais razoáveis para proteger os dados.
              Mantemos informações pelo tempo necessário às finalidades descritas ou às exigências
              legais.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink">8. Contato do encarregado</h2>
            <p>
              Para exercer direitos ou tirar dúvidas sobre privacidade, fale conosco:{' '}
              <a href={`mailto:${environment.contactEmail}`} className="text-green underline">
                {environment.contactEmail}
              </a>{' '}
              · WhatsApp{' '}
              <a
                href="https://wa.me/5551981310336"
                className="text-green underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                (51) 98131-0336
              </a>{' '}
              · ou pela página de{' '}
              <Link to="/contato" className="text-green underline">
                Contato
              </Link>
              .
            </p>
            <p className="mt-3">
              Endereço: Rua Vítor Valpírio, 795 — Anchieta, Porto Alegre, RS.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </>
  )
}
