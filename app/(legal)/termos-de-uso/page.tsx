import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termos de Uso — F5 Recompra',
  description: 'Termos e condições de uso da plataforma F5 Recompra.',
}

const VERSAO = '1.0'
const DATA_VIGENCIA = '1º de julho de 2025'

export default function TermosDeUsoPage() {
  return (
    <article className="prose prose-zinc max-w-none">
      <h1 className="text-2xl font-bold mb-1">Termos de Uso</h1>
      <p className="text-sm text-zinc-400 mb-8">Versão {VERSAO} — Vigência a partir de {DATA_VIGENCIA}</p>

      <Section titulo="1. O que é o F5 Recompra">
        <p>O F5 Recompra é uma plataforma de software (SaaS) que auxilia lojas e comércios a recuperar vendas recorrentes de clientes, gerenciar relacionamento pós-venda, acompanhar a fila de recompra e registrar oportunidades de lista de espera.</p>
        <p>O F5 Recompra atua como fornecedor de ferramenta tecnológica. A loja é responsável por como utiliza a plataforma e pela relação com seus clientes finais.</p>
      </Section>

      <Section titulo="2. Quem pode usar">
        <p>Podem usar o F5 Recompra:</p>
        <ul>
          <li>Pessoas jurídicas ou físicas que representem estabelecimentos comerciais legalmente constituídos;</li>
          <li>Usuários com 18 anos ou mais;</li>
          <li>Usuários com acesso autorizado pela loja titular da conta.</li>
        </ul>
        <p>O uso é pessoal e intransferível. Cada usuário responde pelos atos praticados com suas credenciais.</p>
      </Section>

      <Section titulo="3. Responsabilidade da loja">
        <p>A loja é responsável por:</p>
        <ul>
          <li>Ter base legal adequada para cadastrar e contatar seus clientes finais (ex.: relação comercial preexistente, legítimo interesse, consentimento);</li>
          <li>Informar seus clientes sobre o uso de seus dados quando exigido pela legislação aplicável;</li>
          <li>Garantir que apenas usuários autorizados acessem a plataforma;</li>
          <li>Respeitar pedidos de opt-out, não contato ou exclusão de dados dos clientes;</li>
          <li>Não inserir dados sensíveis ou desnecessários nos campos da plataforma;</li>
          <li>Utilizar as mensagens sugeridas de forma manual e responsável, sem envio automatizado não autorizado.</li>
        </ul>
      </Section>

      <Section titulo="4. Uso permitido">
        <p>É permitido:</p>
        <ul>
          <li>Registrar vendas e clientes reais da loja;</li>
          <li>Gerenciar a fila de recompra e relacionamento com clientes;</li>
          <li>Usar as mensagens sugeridas como modelo para contato manual via WhatsApp;</li>
          <li>Compartilhar acesso internamente com membros autorizados da equipe da loja;</li>
          <li>Exportar ou visualizar dados de sua própria loja para uso operacional.</li>
        </ul>
      </Section>

      <Section titulo="5. Uso proibido">
        <p>É expressamente proibido:</p>
        <ul>
          <li>Usar a plataforma para envio automatizado em massa sem autorização dos destinatários;</li>
          <li>Cadastrar clientes de terceiros ou de lojas não autorizadas;</li>
          <li>Inserir dados sensíveis como diagnósticos médicos, informações de saúde, dados financeiros detalhados ou qualquer dado desnecessário para a operação;</li>
          <li>Tentar acessar dados de outras lojas;</li>
          <li>Fazer engenharia reversa, scraping ou uso automatizado não autorizado;</li>
          <li>Compartilhar credenciais de acesso com pessoas não autorizadas;</li>
          <li>Usar a plataforma para fins ilícitos ou em violação à LGPD e demais legislações aplicáveis.</li>
        </ul>
      </Section>

      <Section titulo="6. Cadastro de clientes e vendas">
        <p>Os dados de clientes e vendas inseridos na plataforma são de responsabilidade da loja. O F5 Recompra armazena esses dados para viabilizar o funcionamento da ferramenta e não os utiliza para fins comerciais próprios.</p>
        <p>A loja deve garantir que possui base legal para o tratamento dos dados dos clientes cadastrados.</p>
      </Section>

      <Section titulo="7. Mensagens sugeridas e envio manual pelo usuário">
        <p>O F5 Recompra gera sugestões de mensagens para facilitar o contato da loja com seus clientes. O envio dessas mensagens é sempre manual e de responsabilidade exclusiva do usuário da loja.</p>
        <p>O F5 Recompra não envia mensagens automaticamente para clientes finais sem ação explícita do usuário da loja.</p>
      </Section>

      <Section titulo="8. Planos, pagamentos e cancelamento">
        <p>O acesso ao F5 Recompra está condicionado à contratação de um plano vigente. Os preços, condições e formas de pagamento são informados no momento da contratação.</p>
        <p>O cancelamento pode ser solicitado a qualquer momento. Os dados da loja ficam disponíveis por até 30 dias após o cancelamento, salvo solicitação expressa de exclusão antecipada.</p>
        <p>O F5 Recompra reserva-se o direito de suspender o acesso em caso de inadimplência após notificação.</p>
      </Section>

      <Section titulo="9. Disponibilidade do serviço">
        <p>O F5 Recompra emprega esforços razoáveis para garantir a disponibilidade da plataforma, mas não garante disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência quando possível.</p>
      </Section>

      <Section titulo="10. Limitação de responsabilidade">
        <p>O F5 Recompra não se responsabiliza por:</p>
        <ul>
          <li>Dados incorretos inseridos pela loja;</li>
          <li>Uso indevido das mensagens sugeridas;</li>
          <li>Decisões comerciais tomadas com base nos dados da plataforma;</li>
          <li>Danos indiretos decorrentes de interrupções de serviço fora do controle razoável da plataforma.</li>
        </ul>
      </Section>

      <Section titulo="11. Proteção de dados">
        <p>O tratamento de dados pessoais no F5 Recompra é regido pela nossa <a href="/politica-de-privacidade" className="text-blue-600 hover:underline">Política de Privacidade</a> e pelo nosso <a href="/contrato-lgpd" className="text-blue-600 hover:underline">Acordo de Tratamento de Dados</a>, disponíveis neste site.</p>
      </Section>

      <Section titulo="12. Alterações dos termos">
        <p>O F5 Recompra pode atualizar estes termos periodicamente. Alterações relevantes serão comunicadas com pelo menos 15 dias de antecedência. O uso continuado da plataforma após a vigência das alterações implica aceitação dos novos termos.</p>
      </Section>

      <Section titulo="13. Contato">
        <p>Dúvidas sobre estes Termos de Uso podem ser enviadas para:</p>
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
