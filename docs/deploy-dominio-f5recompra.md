# Guia de Configuração de Domínio — f5recompra.com.br

Este documento descreve os passos manuais necessários para migrar/configurar o F5 Recompra para funcionar no novo domínio `f5recompra.com.br`.

## 1. Configurações no Provedor de DNS (ex: Registro.br)
Adicione as seguintes entradas DNS apontando para o seu provedor de hospedagem (Vercel):

- **Tipo A (apex)**:
  - Nome: `@` (ou vazio)
  - Destino: `76.76.21.21` (IP da Vercel)
- **Tipo CNAME (subdomínio www)**:
  - Nome: `www`
  - Destino: `cname.vercel-dns.com.`

## 2. Configurações no Painel da Hospedagem (Vercel)
1. Vá nas configurações do projeto na Vercel: **Settings > Domains**.
2. Adicione `f5recompra.com.br`.
3. Adicione `www.f5recompra.com.br` e configure-o como redirecionamento automático (Redirect to) para `f5recompra.com.br`.
4. Defina `f5recompra.com.br` como o **Domínio Principal** (Canonical).

## 3. Configurações no Painel do Supabase (Autenticação)
Para permitir que o login e redefinição de senha funcionem sem erros de callback de segurança:

1. Acesse o console do **Supabase > Authentication > URL Configuration**.
2. Atualize o **Site URL** para:
   `https://f5recompra.com.br`
3. Atualize ou adicione na lista de **Redirect URLs**:
   - `https://f5recompra.com.br/**`
   - `https://www.f5recompra.com.br/**`
   - *(Mantenha `http://localhost:3000/**` para desenvolvimento local)*

## 4. Variáveis de Ambiente (.env)
- `NEXT_PUBLIC_APP_URL=https://f5recompra.com.br`

## 5. Webhooks e Callbacks de Integração (ex: Asaas)
Se houver alguma integração de gateway de pagamento ou envio de WhatsApp que necessite de callback de webhook:
1. Vá no painel do gateway (ex: Asaas) em **Configurações > Integrações > Webhooks**.
2. Atualize a URL do webhook de recebimento de eventos de vendas para:
   `https://f5recompra.com.br/api/webhooks/asaas`
3. Teste a fila de entrega de eventos para garantir o retorno HTTP 200.

## 6. Links Públicos de Política de Privacidade
Verifique e atualize qualquer link externo ou termos que necessitem apontar para o novo domínio principal:
- Política de Privacidade: `https://f5recompra.com.br/politica-privacidade`

---

## Checklist Pós-Deploy e Validação Final
- [ ] O domínio `f5recompra.com.br` carrega a página de login com certificado SSL válido (HTTPS).
- [ ] Acessar `www.f5recompra.com.br` redireciona corretamente para `f5recompra.com.br`.
- [ ] O fluxo de login e logout funciona normalmente.
- [ ] O link enviado por e-mail de redefinição de senha redireciona para `https://f5recompra.com.br/atualizar-senha`.
- [ ] Os webhooks do Asaas estão disparando contra o novo domínio e processando vendas com sucesso.
- [ ] Os links de envio de WhatsApp geram a URL da API do WhatsApp Web (`https://web.whatsapp.com/send...`) apontando para os dados corretos.
- [ ] Monitoramento de erros (Sentry ou logs Vercel) está limpo após os primeiros acessos no domínio novo.
