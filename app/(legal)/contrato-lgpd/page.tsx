import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Acordo de Tratamento de Dados — F5 Recompra',
  description: 'Acordo de Processamento de Dados conforme LGPD entre a loja e o F5 Recompra.',
}

const VERSAO = '1.0'
const DATA_VIGENCIA = '1º de julho de 2025'

export default function ContratoLgpdPage() {
  return (
    <article className="prose prose-zinc max-w-none">
      <h1 className="text-2xl font-bold mb-1">Acordo de Tratamento de Dados</h1>
      <p className="text-sm text-zinc-400 mb-1">Versão {VERSAO} — Vigência a partir de {DATA_VIGENCIA}</p>
      <p className="text-sm text-zinc-500 mb-8">Este documento complementa os Termos de Uso e a Política de Privacidade do F5 Recompra, nos termos do art. 37 e seguintes da Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).</p>

      <Section titulo="1. Papéis das partes">
        <p><strong>Loja (Controladora):</strong> A empresa ou pessoa física titular da conta no F5 Recompra. Responsável por determinar as finalidades e os meios de tratamento dos dados pessoais de seus clientes finais inseridos na plataforma.</p>
        <p><strong>F5 Recompra (Operador, quando aplicável):</strong> Plataforma tecnológica que processa dados pessoais conforme as instruções e necessidades operacionais da loja, para a prestação do serviço contratado.</p>
        <p className="text-xs text-zinc-500 italic">Nota: para dados dos próprios usuários da plataforma (ex.: nome e e-mail do dono da loja), o F5 Recompra atua como controlador autônomo.</p>
      </Section>

      <Section titulo="2. Instruções de tratamento">
        <p>O F5 Recompra processa dados em nome da loja para viabilizar exclusivamente:</p>
        <ul>
          <li>Gestão da fila de recompra e relacionamento com clientes;</li>
          <li>Registro e consulta de vendas e oportunidades;</li>
          <li>Geração de mensagens sugeridas para contato manual;</li>
          <li>Gestão de lista de espera de produtos;</li>
          <li>Suporte técnico e manutenção da plataforma;</li>
          <li>Relatórios e métricas operacionais da loja.</li>
        </ul>
        <p>O F5 Recompra não utiliza os dados dos clientes da loja para finalidades próprias, marketing ou compartilhamento com terceiros.</p>
      </Section>

      <Section titulo="3. Responsabilidades da loja">
        <p>A loja, como controladora, compromete-se a:</p>
        <ul>
          <li>Possuir base legal adequada (ex.: relação comercial, legítimo interesse, consentimento) para cadastrar e contatar seus clientes finais;</li>
          <li>Informar seus clientes sobre o uso de seus dados quando exigido pela legislação aplicável;</li>
          <li>Não inserir dados pessoais sensíveis (saúde, biometria, origem racial, crença religiosa, orientação sexual, dados genéticos) nos campos da plataforma;</li>
          <li>Manter ativos apenas usuários internos autorizados e revogar acessos de ex-colaboradores;</li>
          <li>Atender pedidos de seus clientes finais relativos aos seus direitos como titulares (exclusão, correção, bloqueio);</li>
          <li>Respeitar e registrar pedidos de opt-out ou não contato de clientes.</li>
        </ul>
      </Section>

      <Section titulo="4. Responsabilidades do F5 Recompra">
        <p>O F5 Recompra, na qualidade de operador e prestador de serviço, compromete-se a:</p>
        <ul>
          <li>Manter controles de acesso para garantir que cada loja visualize apenas seus próprios dados;</li>
          <li>Aplicar medidas técnicas e administrativas razoáveis de segurança para proteção dos dados;</li>
          <li>Tratar dados apenas conforme necessário para a prestação do serviço;</li>
          <li>Auxiliar a loja no atendimento a solicitações de titulares, dentro do que for tecnicamente viável;</li>
          <li>Comunicar incidentes de segurança que possam afetar dados da loja em prazo razoável;</li>
          <li>Manter este acordo atualizado conforme evoluções legais e técnicas.</li>
        </ul>
      </Section>

      <Section titulo="5. Suboperadores e fornecedores">
        <p>O F5 Recompra utiliza os seguintes suboperadores essenciais para o funcionamento da plataforma:</p>
        <ul>
          <li><strong>Supabase Inc.:</strong> banco de dados relacional, autenticação e armazenamento;</li>
          <li><strong>Vercel Inc.:</strong> hospedagem, entrega e processamento da aplicação web.</li>
        </ul>
        <p>Outros fornecedores poderão ser adicionados e comunicados com antecedência razoável. Todos estão sujeitos a obrigações equivalentes de segurança e proteção de dados.</p>
      </Section>

      <Section titulo="6. Exclusão e anonimização ao término">
        <p>Após o encerramento do contrato de uso do F5 Recompra:</p>
        <ul>
          <li>Os dados da loja e seus clientes ficam disponíveis para exportação por até 30 dias;</li>
          <li>Após esse prazo, os dados são excluídos ou anonimizados, salvo obrigação legal de retenção;</li>
          <li>A loja pode solicitar exclusão antecipada via <a href="mailto:privacidade@f5recompra.com.br" className="text-blue-600 hover:underline">privacidade@f5recompra.com.br</a>.</li>
        </ul>
      </Section>

      <Section titulo="7. Incidentes de segurança">
        <p>Em caso de incidente de segurança que possa afetar dados pessoais inseridos na plataforma:</p>
        <ul>
          <li>O F5 Recompra notificará as lojas afetadas em prazo razoável após a identificação do incidente;</li>
          <li>Quando exigido pela LGPD, comunicará a ANPD dentro dos prazos legais;</li>
          <li>Adotará medidas imediatas para contenção e mitigação do incidente.</li>
        </ul>
      </Section>

      <Section titulo="8. Vigência e atualização">
        <p>Este acordo vigora durante todo o período de uso da plataforma. Alterações relevantes serão comunicadas com antecedência e o uso continuado implica concordância com as novas condições.</p>
        <p>Dúvidas: <a href="mailto:privacidade@f5recompra.com.br" className="text-blue-600 hover:underline">privacidade@f5recompra.com.br</a></p>
      </Section>
    </article>
  )
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-zinc-900 border-b border-zinc-100 pb-1">{titulo}</h2>
      <div className="text-sm text-zinc-700 leading-relaxed space-y-2">{children}</div>
    </section>
  )
}
