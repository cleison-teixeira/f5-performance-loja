const TEST_MODE = process.env.NEXT_PUBLIC_WHATSAPP_TEST_MODE === 'true'
const TEST_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_TEST_PHONE ?? ''

export function gerarLinkWhatsApp(telefone: string, mensagem: string): string {
  // Em desenvolvimento com TEST_MODE=true, redireciona para o número de teste
  // mantendo a mensagem original intacta
  const destino = TEST_MODE && TEST_PHONE
    ? TEST_PHONE.replace(/\D/g, '')
    : `55${telefone.replace(/\D/g, '')}`

  const url = new URL(`https://wa.me/${destino}`)
  url.searchParams.set('text', mensagem)
  // URLSearchParams encodes spaces as '+'; WhatsApp requires '%20' for correct rendering
  return url.href.replace(/\+/g, '%20')
}
