import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Segurança e Proteção de Dados — F5 Recompra',
  description: 'Como o F5 Recompra protege seus dados e os dados de seus clientes.',
}

export default function SegurancaPage() {
  return (
    <article className="prose prose-zinc max-w-none">
      <h1 className="text-2xl font-bold mb-2">Segurança e Proteção de Dados</h1>
      <p className="text-sm text-zinc-500 mb-8">Saiba como o F5 Recompra protege as informações da sua loja e dos seus clientes.</p>

      <Section titulo="1. Controle de acesso por usuário e loja">
        <p>Cada usuário no F5 Recompra possui credenciais próprias e acessa apenas os dados de lojas às quais está vinculado. Não é possível visualizar ou editar dados de outras lojas.</p>
        <p>O acesso é gerenciado via autenticação segura (Supabase Auth) com verificação de sessão a cada operação.</p>
      </Section>

      <Section titulo="2. Perfis e permissões">
        <p>O F5 Recompra utiliza quatro perfis de acesso:</p>
        <ul>
          <li><strong>Admin F5:</strong> acesso administrativo da plataforma, sem acesso operacional às lojas;</li>
          <li><strong>Dono:</strong> acesso completo à loja ou rede de lojas;</li>
          <li><strong>Gerente:</strong> acesso operacional à loja;</li>
          <li><strong>Vendedora:</strong> acesso às operações do dia a dia (fila, vendas, relacionamento).</li>
        </ul>
        <p>Cada perfil acessa apenas as funcionalidades necessárias para sua função.</p>
      </Section>

      <Section titulo="3. Isolamento de dados por loja">
        <p>Os dados de cada loja são estritamente isolados. Isso é garantido em dois níveis:</p>
        <ul>
          <li><strong>Nível de aplicação:</strong> todas as consultas filtram os dados pelo identificador da loja do usuário autenticado;</li>
          <li><strong>Nível de banco de dados:</strong> Row Level Security (RLS) no Supabase garante que, mesmo que haja um erro na aplicação, o banco de dados não retorne dados de outras lojas.</li>
        </ul>
      </Section>

      <Section titulo="4. Segurança em banco de dados (Supabase/RLS)">
        <p>O banco de dados utiliza políticas de segurança em nível de linha (Row Level Security). Isso significa que cada query retorna apenas os dados autorizados para o usuário autenticado.</p>
        <p>A chave de serviço (service role) é usada apenas em operações administrativas no servidor, nunca exposta no frontend.</p>
      </Section>

      <Section titulo="5. Boas práticas da loja">
        <p>Para manter a segurança da sua conta, recomendamos:</p>
        <ul>
          <li>Use senhas fortes e únicas para cada usuário;</li>
          <li>Não compartilhe suas credenciais de acesso com outras pessoas;</li>
          <li>Revogue o acesso de colaboradores que saírem da loja imediatamente;</li>
          <li>Mantenha o cadastro de usuários atualizado — remova usuários inativos;</li>
          <li>Não utilize a plataforma em redes Wi-Fi públicas sem proteção adicional.</li>
        </ul>
      </Section>

      <Section titulo="6. Recomendação de senha forte">
        <p>Use senhas com pelo menos 12 caracteres, combinando letras maiúsculas, minúsculas, números e símbolos. Evite datas de nascimento, nomes ou sequências óbvias.</p>
        <p>Se suspeitar que sua senha foi comprometida, altere imediatamente através das configurações da conta.</p>
      </Section>

      <Section titulo="7. Não compartilhe login">
        <p>Cada usuário deve ter suas próprias credenciais. Compartilhar login compromete a rastreabilidade das ações e cria riscos de segurança.</p>
        <p>Em caso de turnover, crie um novo usuário para o substituto e desative o acesso do colaborador anterior.</p>
      </Section>

      <Section titulo="8. Não insira dados sensíveis desnecessários">
        <p>Os campos de observação e notas devem ser usados apenas para informações relevantes à operação de recompra. Evite inserir:</p>
        <ul>
          <li>Diagnósticos médicos ou informações de saúde;</li>
          <li>Dados financeiros detalhados (número de cartão, conta bancária);</li>
          <li>Informações pessoais além do necessário para o contato comercial;</li>
          <li>Qualquer dado sensível conforme definido pela LGPD.</li>
        </ul>
      </Section>

      <Section titulo="9. Canal de contato para segurança">
        <p>Para reportar vulnerabilidades, incidentes de segurança ou dúvidas sobre proteção de dados:</p>
        <p><strong>E-mail de segurança/privacidade:</strong>{' '}
          <a href="mailto:privacidade@f5recompra.com.br" className="text-blue-600 hover:underline">
            privacidade@f5recompra.com.br
          </a>
        </p>
        <p className="text-xs text-zinc-500">Responderemos o mais rápido possível. Em caso de incidente crítico, indicaremos a gravidade no assunto do e-mail.</p>
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
