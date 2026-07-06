import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade — F5 Recompra',
  description: 'Como o F5 Recompra coleta, trata e protege dados pessoais.',
}

const VERSAO = '1.0'
const DATA_VIGENCIA = '1º de julho de 2025'

export default function PoliticaPrivacidadePage() {
  return (
    <article className="prose prose-zinc max-w-none">
      <h1 className="text-2xl font-bold mb-1">Política de Privacidade</h1>
      <p className="text-sm text-zinc-400 mb-8">Versão {VERSAO} — Vigência a partir de {DATA_VIGENCIA}</p>

      <Section titulo="1. Quais dados coletamos">
        <p>O F5 Recompra coleta e trata dados pessoais em duas categorias principais:</p>
        <ul>
          <li><strong>Dados da loja e de seus usuários:</strong> fornecidos diretamente no cadastro e uso da plataforma;</li>
          <li><strong>Dados dos clientes finais da loja:</strong> inseridos pela loja como controladora de dados.</li>
        </ul>
      </Section>

      <Section titulo="2. Dados da loja">
        <p>Coletamos dados relacionados à loja contratante, incluindo:</p>
        <ul>
          <li>Nome fantasia e razão social;</li>
          <li>CNPJ ou CPF;</li>
          <li>Endereço (quando informado);</li>
          <li>E-mail de contato e WhatsApp;</li>
          <li>Plano contratado, status financeiro e histórico de acesso.</li>
        </ul>
      </Section>

      <Section titulo="3. Dados dos usuários da loja">
        <p>Para cada usuário (dono, gerente, vendedora) que acessa a plataforma, coletamos:</p>
        <ul>
          <li>Nome completo;</li>
          <li>E-mail de cadastro;</li>
          <li>Telefone/WhatsApp (quando informado);</li>
          <li>Função dentro da loja (perfil);</li>
          <li>Data e horário de acesso;</li>
          <li>Registros de aceite de termos.</li>
        </ul>
      </Section>

      <Section titulo="4. Dados dos clientes cadastrados pela loja">
        <p>A loja, como controladora, insere dados de seus clientes finais na plataforma. Esses dados incluem:</p>
        <ul>
          <li>Nome e WhatsApp;</li>
          <li>Produtos comprados, valores e datas de compra;</li>
          <li>Vendedora responsável pelo atendimento;</li>
          <li>Observações livres inseridas pela loja (se houver);</li>
          <li>Registro de interesse em produtos (lista de espera).</li>
        </ul>
        <p className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-800">
          <strong>Atenção:</strong> A loja é responsável por não inserir dados sensíveis (diagnósticos, informações de saúde, dados financeiros detalhados) nos campos de observação. O F5 Recompra não solicita esses dados e recomenda que não sejam inseridos.
        </p>
      </Section>

      <Section titulo="5. Finalidades do tratamento">
        <p>Os dados são tratados para as seguintes finalidades:</p>
        <ul>
          <li>Operação da plataforma de recompra, relacionamento e lista de espera;</li>
          <li>Autenticação e controle de acesso por loja;</li>
          <li>Geração de mensagens sugeridas para contato da loja com seus clientes;</li>
          <li>Suporte técnico e atendimento ao cliente;</li>
          <li>Faturamento e gestão de planos;</li>
          <li>Cumprimento de obrigações legais.</li>
        </ul>
      </Section>

      <Section titulo="6. Compartilhamento com fornecedores essenciais">
        <p>Para operar, o F5 Recompra utiliza fornecedores que podem processar dados pessoais:</p>
        <ul>
          <li><strong>Supabase:</strong> banco de dados e autenticação (infraestrutura em nuvem);</li>
          <li><strong>Vercel:</strong> hospedagem e entrega da aplicação;</li>
          <li>Outros fornecedores de infraestrutura essencial podem ser adicionados e comunicados nesta política.</li>
        </ul>
        <p>Não compartilhamos dados pessoais com terceiros para fins comerciais próprios.</p>
      </Section>

      <Section titulo="7. Armazenamento e segurança">
        <p>Adotamos medidas técnicas e administrativas razoáveis para proteger os dados pessoais contra acesso não autorizado, alteração, divulgação ou destruição, incluindo:</p>
        <ul>
          <li>Controle de acesso por usuário, função e loja (isolamento por loja);</li>
          <li>Autenticação segura via Supabase Auth;</li>
          <li>Row Level Security (RLS) no banco de dados;</li>
          <li>Comunicação criptografada via HTTPS.</li>
        </ul>
        <p>Não garantimos segurança absoluta. Nenhum sistema é completamente imune a incidentes.</p>
      </Section>

      <Section titulo="8. Direitos dos titulares">
        <p>Nos termos da LGPD (Lei 13.709/2018), os titulares de dados têm direito a:</p>
        <ul>
          <li>Confirmar a existência de tratamento;</li>
          <li>Acessar seus dados;</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
          <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>Solicitar a portabilidade dos dados;</li>
          <li>Opor-se ao tratamento em caso de descumprimento da lei;</li>
          <li>Revogar consentimento, quando o tratamento for baseado nele.</li>
        </ul>
        <p>Para dados inseridos pela loja, a solicitação deve ser feita diretamente à loja contratante (controladora). O F5 Recompra auxiliará no atendimento quando possível.</p>
      </Section>

      <Section titulo="9. Como solicitar exclusão, correção ou informações">
        <p>Solicitações relacionadas a dados tratados diretamente pelo F5 Recompra (usuários da plataforma) devem ser enviadas para:</p>
        <p><strong>E-mail:</strong> <a href="mailto:privacidade@f5recompra.com.br" className="text-blue-600 hover:underline">privacidade@f5recompra.com.br</a></p>
        <p>Responderemos em até 15 dias úteis.</p>
      </Section>

      <Section titulo="10. Retenção e exclusão">
        <p>Os dados são retidos pelo período necessário para a prestação do serviço contratado. Após o encerramento do contrato:</p>
        <ul>
          <li>Dados ficam disponíveis por até 30 dias para exportação;</li>
          <li>Após esse período, são excluídos ou anonimizados, salvo obrigação legal de retenção;</li>
          <li>Exclusão antecipada pode ser solicitada pelo e-mail de privacidade.</li>
        </ul>
      </Section>

      <Section titulo="11. Cookies e tecnologias semelhantes">
        <p>O F5 Recompra utiliza cookies de sessão essenciais para autenticação e funcionamento do app. Não utilizamos cookies de rastreamento para fins publicitários.</p>
      </Section>

      <Section titulo="12. Incidentes de segurança">
        <p>Em caso de incidente de segurança que possa afetar dados pessoais, notificaremos os responsáveis das lojas afetadas e, quando exigido pela LGPD, a Autoridade Nacional de Proteção de Dados (ANPD), dentro dos prazos legais aplicáveis.</p>
      </Section>

      <Section titulo="13. Contato de privacidade">
        <p>Nosso encarregado de proteção de dados (DPO) pode ser contatado em:</p>
        <p><strong>E-mail:</strong> <a href="mailto:privacidade@f5recompra.com.br" className="text-blue-600 hover:underline">privacidade@f5recompra.com.br</a></p>
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
