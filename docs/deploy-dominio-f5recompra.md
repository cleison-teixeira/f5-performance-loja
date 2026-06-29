# Guia de Configuração de Domínio — f5recompra.com.br

Este documento descreve os passos manuais necessários para migrar/configurar o F5 Recompra para funcionar no novo domínio `f5recompra.com.br` e sua arquitetura de subdomínios.

## 1. Arquitetura Final de Domínio
A estrutura de acessos foi aprovada com a seguinte divisão:
*   **Domínio Principal do App**: `https://app.f5recompra.com.br` (onde rodam o login, painel e as ações das vendedoras).
*   **Redirecionamentos**: 
    *   `https://f5recompra.com.br` → Redirecionamento 308 automático para `https://app.f5recompra.com.br`.
    *   `https://www.f5recompra.com.br` → Redirecionamento 308 automático para `https://app.f5recompra.com.br`.
*   **Reservado para Integrações**:
    *   `https://api.f5recompra.com.br` → Subdomínio reservado para receber APIs e webhooks no futuro (não implementar agora).

---

## 2. Configurações no Provedor de DNS (ex: Registro.br)
Adicione as seguintes entradas DNS apontando para o seu provedor de hospedagem (Vercel):

*   **Entrada para o App (app.f5recompra.com.br)**:
    *   Tipo: `CNAME`
    *   Nome: `app`
    *   Destino: `cname.vercel-dns.com.`
*   **Entrada Apex (f5recompra.com.br)**:
    *   Tipo: `A`
    *   Nome: `@` (ou vazio)
    *   Destino: `76.76.21.21` (IP da Vercel)
*   **Entrada CNAME (www.f5recompra.com.br)**:
    *   Tipo: `CNAME`
    *   Nome: `www`
    *   Destino: `cname.vercel-dns.com.`

---

## 3. Configurações no Painel da Hospedagem (Vercel)
1.  Vá nas configurações do projeto na Vercel: **Settings > Domains**. (Certifique-se de que o projeto foi renomeado para `f5-recompra`).
2.  Adicione `app.f5recompra.com.br` e configure-o como o **Domínio Principal** (Canonical).
3.  Adicione `f5recompra.com.br` e configure um redirecionamento automático (Redirect 308) para `app.f5recompra.com.br`.
4.  Adicione `www.f5recompra.com.br` e configure um redirecionamento automático (Redirect 308) para `app.f5recompra.com.br`.

---

## 4. Configurações no Painel do Supabase (Autenticação)
Para permitir que o login e redefinição de senha funcionem sem erros de callback de segurança:

1.  Acesse o console do **Supabase > Authentication > URL Configuration**.
2.  Atualize o **Site URL** para:
    `https://app.f5recompra.com.br`
3.  Atualize ou adicione na lista de **Redirect URLs**:
    *   `https://app.f5recompra.com.br/**`
    *   `https://f5recompra.com.br/**`
    *   `https://www.f5recompra.com.br/**`
    *   `https://recway.com.br/**`
    *   `http://localhost:3000/**`

---

## 5. Variáveis de Ambiente (.env)
A variável `NEXT_PUBLIC_APP_URL` na Vercel e no ambiente local deve apontar para o domínio de execução do app:
```env
NEXT_PUBLIC_APP_URL=https://app.f5recompra.com.br
```

---

## 6. Cobrança e Gateway Asaas (Importante)
*   **Status Atual**: Fora do escopo para a apresentação. Nenhuma solicitação foi criada no Asaas e a cobrança está desativada.
*   **Fase Futura**: A cobrança/Asaas será configurada e ativada somente após a apresentação oficial da rede.
*   **Endpoint Futuro Previsto**: Quando a integração for ativada, o webhook de callback deverá ser configurado para:
    `https://app.f5recompra.com.br/api/webhooks/asaas`

---

## Checklist Pós-Deploy e Validação Final
- [ ] O domínio `app.f5recompra.com.br` carrega a página de login com certificado SSL válido (HTTPS).
- [ ] Acessar `f5recompra.com.br` redireciona via HTTP 308 para `app.f5recompra.com.br`.
- [ ] Acessar `www.f5recompra.com.br` redireciona via HTTP 308 para `app.f5recompra.com.br`.
- [ ] O fluxo de login e logout funciona normalmente no domínio principal.
- [ ] O link enviado por e-mail de redefinição de senha redireciona para `https://app.f5recompra.com.br/atualizar-senha`.
- [ ] Os links de envio de WhatsApp geram a URL da API do WhatsApp Web (`https://web.whatsapp.com/send...`) apontando para os dados corretos.
