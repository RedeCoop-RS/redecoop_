# Ideias de evolução — RedeCoop

Documento de exploração. Não altera o produto: só descreve o que o sistema já faz e o que valeria construir em seguida.

## O que o projeto é hoje

A RedeCoop RS é a plataforma de uma rede de cooperativas da agricultura familiar no Rio Grande do Sul. O site público explica a rede (história, governança, serviços, cooperativismo de plataforma, blog no Ghost, catálogo e mapa das cooperativas). Quem entra no painel usa três ferramentas de intercooperação:

- **Balcão de Negócios** — oferta de excedentes entre cooperativas, com conversa moderada pela administração.
- **CoopFrete** — frete compartilhado: viagem, rota (Mapbox), proposta, cálculo de preço por peso, distância e tipo de veículo, mais uma taxa de serviço configurável.
- **Compras coletivas** — pedido conjunto de insumos e embalagens.

Em volta disso existem catálogo com sazonalidade e embalagem, painel do **CAF** (Cadastro Nacional da Agricultura Familiar, alimentado por uma sincronização em Python que passa por captcha e VNC), chat e notificações em tempo real, relatórios em Excel só para a administração, visitantes e pedidos de acesso, FAQ e um app web do motorista para iniciar viagem, anexar arquivo na parada e marcar chegada.

A base técnica é um monorepo com quatro apps: API NestJS 10 + TypeORM + MySQL + Socket.IO, site, painel e app do motorista em React 19 + Vite + Tailwind. Papéis: administração, cooperativa, motorista e visitante. O deploy de produção sobe os quatro frontends e a API; o único workflow de CI faz `git pull` da API por SSH ao dar push na `main`, sem lint nem teste.

O dinheiro da rede já está modelado: taxa de serviço e piso mínimo geram um `CooperativeDebit` ligado ao negócio. No painel, o débito aparece com o texto “Gerar guia”, mas não há emissão de cobrança nem baixa de pagamento.

O código está em produção (versão 1.1.x) e cobre o fluxo principal de ponta a ponta. A base de qualidade ainda é fina: um teste unitário que só verifica se o serviço de relatório existe, um e2e herdado do template do Nest, painel e app do motorista sem lint nem teste, CORS liberado, Swagger público, JWT de 7 dias, e a página de audiência do site pronta no código com a rota comentada.

## Como ler a lista

Prioridade de cima para baixo dentro de cada bloco. Esforço é escopo de engenharia, não prazo de calendário:

| Esforço | Significa |
| --- | --- |
| Baixo | Um fluxo ou uma tela, sem integração nova |
| Médio | Fluxo ponta a ponta (API + painel, às vezes site ou app) |
| Alto | Produto novo, integração externa pesada ou mudança de modelo (multi-rede) |

---

## Ganhos rápidos

### 1. Fechar o ciclo do débito, mesmo sem Pix

**Por que importa.** A taxa do CoopFrete já vira débito da cooperativa, e a tabela de cooperativas mostra o valor com “Gerar guia”. Hoje isso é só um rótulo: não existe controller de débito, nem extrato, nem “marcar como pago”. A rede não enxerga o que está em aberto.

**O que fazer.** Tela de extrato (admin e cooperativa), filtro por status `pending` / `paid` / `canceled`, baixa manual com data e observação, e exportação do período. A guia em PDF pode ser um comprovante interno até existir boleto.

**Esforço.** Baixo.

### 2. Ligar de novo a audiência do site e pedir consentimento

**Por que importa.** O módulo de analytics próprio (páginas, série temporal, heatmap) e a página do painel já existem; a rota `/admin/audiencia-do-site` está comentada. Ao mesmo tempo o GA4 entra no site assim que a variável está definida, sem banner. A política de privacidade fala em LGPD, mas o visitante não escolhe.

**O que fazer.** Reabrir a rota para a administração, banner de cookies antes do GA4, e manter a coleta própria como métrica que não depende do Google.

**Esforço.** Baixo.

### 3. CI que impede regressão antes do deploy

**Por que importa.** O único workflow (`api-redecoop/.github/workflows/deploy.yml`) entra na VPS, roda `npm install`, build, migration e `pm2 restart` em todo push na `main`. Não roda teste. A action de SSH está em `@master`. O cálculo da taxa de frete — a parte que mexe em dinheiro — não tem teste.

**O que fazer.** Workflow de pull request com lint da API e do site, `npm test` e o e2e ajustado ao prefixo `/api`. Fixar a versão da action. Testes do `calculateTravelFee` (piso mínimo, comissão, faixa de peso/distância, veículo inexistente) e da transição de status do negócio.

**Esforço.** Baixo a médio. O primeiro corte (CI + taxa de frete) é baixo; cobertura dos fluxos de oferta e chat é médio.

### 4. Encurtar a sessão e restringir a borda da API

**Por que importa.** O login assina JWT com validade de 168 horas. CORS está aberto (`enableCors()` e `cors: true` nos gateways). O Swagger em `/docs` sai no mesmo processo da produção. Login, contato, orçamento e `POST /public/website-analytics/collect` não têm limite de taxa. Uploads são servidos como arquivo estático em `/storage`.

**O que fazer.** Access token curto com refresh guardado no `AuthToken` que já existe; CORS só para os domínios do site, do painel e do app; Swagger desligado ou autenticado em produção; limite de taxa nas rotas públicas; conferir se o prefixo `/storage` não entrega arquivo fora da pasta de upload.

**Esforço.** Baixo a médio.

### 5. README do monorepo e scripts que rodam no Linux

**Por que importa.** Cada app tem o próprio README; a raiz não explica como subir API, MySQL, site (5173), painel (5174) e motorista (5175) juntos. `dev:fresh` do painel e do app chama PowerShell, então não funciona no servidor nem no WSL. O `docker-compose.yml` está no `.gitignore`, então o ambiente local não é reproduzível a partir do git.

**O que fazer.** Um README na raiz com a ordem de subida, portas e papéis. Trocar `dev:fresh` por um script de shell. Versionar um compose de desenvolvimento (MySQL + API), sem segredos.

**Esforço.** Baixo.

### 6. Tirar segredo e dependência morta do repositório

**Por que importa.** O `Dockerfile` tem valor padrão da content key do Ghost e do ID do GA4. A chave de conteúdo do Ghost é pública por desenho, mas não deveria ser o default de quem forkar o repo. `bull` está no `package.json` da API e não há fila nenhuma no código. `moment` segue em uso com fuso fixado de dois jeitos (`America/Sao_Paulo` no exemplo de env e `Etc/Universal` no `main.ts`).

**O que fazer.** Defaults vazios no Docker; documentar as variáveis. Remover `bull` se a fila não for entrar agora. Padronizar datas em `America/Sao_Paulo` na borda (relatório, notificação, validade do CAF).

**Esforço.** Baixo.

### 7. App do motorista instalável no celular

**Por que importa.** O app já é mobile na interface (barra inferior, viagem em andamento, chegada na parada), mas é um site: sem manifest, sem service worker, sem ícone na tela inicial. O motorista no pátio depende de achar a URL e de rede estável para marcar a parada.

**O que fazer.** PWA: manifest, ícones, cache do shell e fila local da “chegada” para reenviar quando a rede voltar. Push pode ficar para a etapa média.

**Esforço.** Baixo a médio.

---

## Funcionalidades médias

### 8. Cobrança de verdade da taxa de serviço

**Por que importa.** É a receita que o modelo já prevê (percentual em `ConfigSystem.serviceTax`, piso `minimumServiceTax`, débito por negócio). Sem Pix ou boleto, a baixa é planilha e conversa.

**O que fazer.** Provedor brasileiro (Asaas, Efí ou similar): gerar cobrança ao confirmar o negócio, webhook de pagamento, status no débito, e o botão “Gerar guia” deixando de ser texto. Mensalidade de adesão da rede pode usar a mesma conta, separada da comissão do frete.

**Esforço.** Médio.

### 9. Aviso no canal que a cooperativa já usa

**Por que importa.** Tem e-mail (SMTP) e notificação dentro do painel. Oferta de frete, mensagem retida para aprovação e viagem atribuída não chegam no WhatsApp nem como push. Quem não está com o painel aberto perde o tempo da carga.

**O que fazer.** E-mail transacional nos marcos que já disparam `NotificationService`, com preferência por cooperativa. Push no PWA do motorista (viagem atribuída, próxima parada). WhatsApp só se houver número oficial e opt-in — não embutir disparo genérico.

**Esforço.** Médio.

### 10. Casa entre carga parada e viagem com espaço

**Por que importa.** O CoopFrete calcula preço e capacidade restante da rota, mas a cooperativa procura viagem na lista. O balcão e a compra coletiva também não sugerem quem tem o produto na safra.

**O que fazer.** Para cada oferta em aberto, sugerir viagens compatíveis (origem/destino, data, peso que ainda cabe, tipo de carga). No balcão, sugerir catálogo com sazonalidade alta no período. Começar com regras explícitas; ranking por histórico fica para depois.

**Esforço.** Médio.

### 11. Relatório na mão da cooperativa

**Por que importa.** Os quatro relatórios (produtos, viagens feitas, produtos transportados, preços de viagens concluídas) são Excel e só a administração gera. A cooperativa não mostra para o conselho quanto frete compartilhou nem quanto pagou de taxa.

**O que fazer.** Os mesmos relatórios filtrados pela cooperativa logada, mais um resumo no dashboard dela: viagens no mês, valor de taxa, negócios em negociação. PDF simples além do Excel, para ata e prestação de contas.

**Esforço.** Médio.

### 12. Vários usuários por cooperativa

**Por que importa.** `Cooperative` tem um `userId`. Na prática o login é da entidade inteira: comercial, quem cuida do CAF e quem lança viagem compartilham a mesma senha. Não dá para saber quem aceitou a proposta.

**O que fazer.** Usuários convidados com papel interno (comercial, logística, leitura). Auditoria mínima: quem mudou status do negócio, taxa e ordem da rota.

**Esforço.** Médio. Muda autenticação, guards e várias telas que assumem “um usuário = uma cooperativa”.

### 13. Fila de moderação com prazo, em vez de travar toda mensagem

**Por que importa.** Mensagem entre cooperativas passa por aprovar/rejeitar na administração (`approve-reject-message` e alerta no socket `admin-chat-alerts`). Isso protege a rede e também segura negócio que poderia fechar no mesmo dia.

**O que fazer.** Fila com tempo de espera visível, liberar automático depois de N mensagens aprovadas da mesma dupla, e manter bloqueio para link, contato externo e primeira conversa. A administração continua vendo o histórico.

**Esforço.** Médio.

### 14. CAF que avisa antes de vencer

**Por que importa.** O painel já mostra sócios com e sem CAF, sexo, município e atividade, e a sincronização roda com navegador remoto por causa de captcha. O dado envelhece em silêncio. Cooperativa com extrato faltando só aparece como aviso para a administração.

**O que fazer.** Alerta de validade (`dataValidade`) para a cooperativa e para a administração, lista do que não sincronizou, e agendamento mensal com log no próprio painel (o modal de sync já existe). Se o governo expuser consulta estável, trocar o robô por essa consulta; enquanto não, tratar o VNC como operação excepcional, não como caminho feliz.

**Esforço.** Médio para alertas e agenda. Alto se a troca do robô depender de acesso que hoje não existe.

### 15. Portal do comprador institucional em cima do catálogo

**Por que importa.** O site já lista cooperativas, produtos, sazonalidade e embalagem, e aceita pedido de orçamento por e-mail. Hospitais, prefeituras e o PNAE aparecem nos depoimentos, mas o comprador não monta uma cesta nem acompanha resposta dentro da plataforma. O visitante é um papel pela metade.

**O que fazer.** Comprador com cadastro aprovado pela administração: busca no catálogo público, cesta, pedido que vira conversa ou negócio do tipo balcão, e status visível. A rede continua intermediando; não é marketplace aberto.

**Esforço.** Médio a alto.

### 16. Compras coletivas com cotação, não só um anúncio

**Por que importa.** O pedido coletivo guarda produtos em JSON, cidade e descrição, e gera negócio. Não há soma de quantidades entre cooperativas, rodada de preço nem divisão do pedido fechado.

**O que fazer.** Consolidar quantidade por item, prazo de adesão, uma cotação (mesmo que a rede lance o preço à mão no começo) e rateio. O fornecedor externo pode entrar depois, como usuário só de cotação.

**Esforço.** Médio.

---

## Apostas maiores

Estas três mudam o que a RedeCoop é, não só o que o painel mostra. As duas primeiras são o caminho mais direto para um produto cobrável fora do RS. A terceira productiza um serviço que o site já anuncia e o software ainda não faz.

### 17. A mesma plataforma para outras redes (SaaS)

**Por que importa.** Quase tudo que é difícil já está feito para uma rede: frete com taxa, balcão, compra coletiva, catálogo, papéis, CAF. Outras centrais da agricultura familiar repetem esse problema em planilha e grupo de mensagem. O código, porém, é de um inquilino só: domínio RedeCoop, uma taxa global, um banco, marca fixa.

**O que fazer.** Entidade Rede (nome, domínio, cores, taxa, módulos ligados). Cooperativa, usuário e configuração passam a pertencer a uma rede. A RedeCoop RS continua sendo a primeira rede, no mesmo banco, sem reescrever o CoopFrete. Cobrança do SaaS: mensalidade por rede + módulos (CAF, compras coletivas, portal do comprador) + a comissão de frete que cada rede define. White-label simples no site público (logo, cores, textos institucionais).

**Esforço.** Alto. É a aposta com mais encaixe no que já existe, e a que mais exige cuidado para não misturar dado de uma rede com outra.

### 18. Torre de controle do frete

**Por que importa.** O motorista marca chegada no aparelho, sem posição, sem prova além do anexo, sem a cooperativa vendo a rota ao vivo. Para carga de alimento e comprador institucional, “saiu / chegou” não basta quando há atraso ou divergência de peso.

**O que fazer.** App nativo (ou o PWA da ideia 7, se a prova de campo for suficiente) com GPS na parada, foto obrigatória, linha do tempo para a cooperativa dona da viagem e desvio simples (parou longe do endereço previsto). A taxa de serviço continua no fechamento; a torre é o que justifica a comissão para quem paga o frete.

**Esforço.** Alto.

### 19. Rastreabilidade do lote, do sítio ao comprador

**Por que importa.** A página de serviços oferece rastreabilidade por adesão, como contratação à parte. No código não há lote, colheita nem QR. É o módulo que um hospital ou uma secretaria de educação pede quando o catálogo deixa de ser vitrine e passa a ser alimento servido.

**O que fazer.** Lote ligado ao item do catálogo e à cooperativa: data, volume, responsável, e um código que o comprador consulta. Na viagem, o lote embarca na parada (o anexo de hoje vira elo da cadeia). Começar com leitura pública do QR e histórico interno; certificado e integração com sistema do comprador ficam fora da primeira entrega. Pode ser add-on da rede no modelo da ideia 17, cobrado por adesão — o mesmo discurso que o site já usa.

**Esforço.** Alto.

---

## O que eu faria primeiro

Se a energia for curta, a sequência que mais devolve clareza operacional e receita, sem abrir frente nova:

1. Extrato e baixa do débito (ideia 1), porque o dinheiro já é calculado e ninguém fecha o mês dentro do sistema.
2. Teste da taxa de frete e CI no pull request (ideia 3), porque essa conta não pode mudar no escuro.
3. Audiência do site com consentimento (ideia 2), porque o código já está escrito.
4. Cobrança Pix/boleto em cima do débito (ideia 8), só depois do extrato existir.
5. Matching de carga com viagem (ideia 10), que é o diferencial do CoopFrete diante de uma planilha de frete.

A aposta de produto, se um dia a rede quiser oferecer isso a outras centrais, é a ideia 17. O restante (torre, rastreio, portal do comprador) encaixa como módulo dessa rede, não como sistema paralelo.
