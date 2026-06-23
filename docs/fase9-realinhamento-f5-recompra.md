# Fase 9.0A — Volta à Origem: F5 Recompra
## Realinhamento Estratégico do Produto

“F5 Recompra — o sistema que mostra quanto dinheiro sua loja está deixando na mesa e ajuda sua equipe a vender de novo para quem já comprou.”

---

### 1. Decisão Estratégica

A evolução do produto como um sistema de vendas geral ou ERP/PDV (outrora sob o nome temporário de Recway) está pausada. A partir desta fase, o produto retoma integralmente a sua tese original. O foco absoluto e exclusivo é:

* **Recompra:** Foco total no retorno de clientes para compras subsequentes.
* **Dinheiro na Mesa:** Mostrar visual e quantitativamente o valor em aberto que a loja deixa de faturar por falta de ações de recompra.
* **Fila de Clientes para Retornar:** Organização dos contatos que precisam ser feitos de acordo com o vencimento do ciclo de cada produto recorrente.
* **Recuperação de Vendas Recorrentes:** Estimular a compra periódica de produtos de consumo regular.
* **Upsell dentro da Recompra:** Aproveitar o momento do contato de recompra para oferecer e registrar produtos adicionais.
* **Agendamento de Retorno:** Permitir que o vendedor agende uma nova data de contato caso o cliente solicite.

---

### 2. O que o F5 Recompra é

* **Micro SaaS de Recompra:** Um software enxuto, focado em resolver a dor específica da falta de recompra.
* **Camada Complementar ao ERP/PDV:** Não substitui o sistema de retaguarda da loja; opera integrado ou alimentado por ele.
* **Ferramenta Operacional para Equipe:** Interface pensada para que as vendedoras visualizem quem devem contactar no WhatsApp e executem a abordagem de forma ágil.
* **Painel de Oportunidades de Recompra:** Um local para monitorar o potencial de faturamento adormecido na base de clientes.

---

### 3. O que o F5 Recompra NÃO é

* **Não é ERP:** Não faz controle de estoque complexo, emissão de notas fiscais, contas a pagar, etc.
* **Não é PDV:** Não é o caixa da loja para venda rápida geral.
* **Não é Sistema Financeiro:** Não substitui o fluxo de caixa, conciliação bancária ou controle de DRE global.
* **Não é sistema para registrar todas as vendas da loja:** Não serve de repositório para todo e qualquer cupom fiscal ou transação que não faça parte do fluxo de recorrência.
* **Não deve exigir implantação pesada:** A ativação deve ser simples e rápida.
* **Não deve competir com sistemas já existentes:** Evita atritos com softwares de gestão legados que o cliente já utilize.

---

### 4. Motivo da Mudança

A tentativa de registrar todas as vendas da loja gerou gargalos e barreiras de entrada comerciais, tais como:
* **Conflito com ERP:** Lojas resistem a cadastrar vendas em duas ferramentas diferentes.
* **Carga operacional para vendedoras:** Exigir que a vendedora lance cada venda manual gera resistência e erros.
* **Complexidade de comissão/meta:** Gerenciar regras de metas e comissões gerais concorre com o ERP que já possui essa inteligência.
* **Risco de implantação pesada:** Processos longos de onboarding inviabilizam o modelo de autoatendimento (PLG) ou venda rápida.
* **Dificuldade de venda comercial:** Vender um ERP/sistema de vendas geral enfrenta um oceano vermelho altamente competitivo.

**Nova lógica:** O foco passa a ser registrar apenas compras/produtos com potencial real de recompra ou importar esses dados no futuro por integrações, minimizando o trabalho operacional.

---

### 5. Nova Lógica Central (Fluxo de Trabalho)

1. **Compra de Produto Recorrente:** O cliente realiza uma compra de um produto que necessita de reposição periódica (ex: suplementos, cosméticos, ração).
2. **Registro Base:** A vendedora registra essa compra inicial no F5 Recompra (ou, futuramente, os dados são importados via integração).
3. **Criação de Oportunidade:** O sistema calcula o ciclo de consumo do produto e gera uma oportunidade de recompra.
4. **Fila de Retorno:** No dia exato em que o produto está previsto para acabar, o cliente surge na Fila de Recompra.
5. **Abordagem WhatsApp:** A vendedora inicia o contato com template personalizado direto pelo WhatsApp.
6. **Resultado do Contato:** A vendedora marca o resultado da interação com uma das opções:
   * Recompra confirmada
   * Recompra + upsell
   * Agendar retorno (mudar data de contato)
   * Sem resposta
   * Não quer agora
   * Perdido
7. **Dashboard em Tempo Real:** O gestor acompanha o valor financeiro efetivamente recuperado versus o dinheiro que ainda está em aberto ("deixado na mesa").

---

### 6. Módulos Core do MVP

* **Dashboard Dinheiro na Mesa:** Visão clara de oportunidades ativas, atrasadas e recuperadas.
* **Fila de Recompra:** Listagem diária e segmentada dos contatos pendentes.
* **Registrar compra para recompra:** Formulário simplificado focado em coletar cliente, produto recorrente e data da compra.
* **Produtos recorrentes:** Cadastro de produtos com definição de preço médio, ciclo de dias para retorno e templates de mensagens.
* **Clientes de recompra:** Histórico de compras recorrentes e interações com cada cliente.
* **Recompras recuperadas:** Registro de sucessos para cálculo de ROI do SaaS.
* **Agendamentos de retorno:** Lógica para reprogramar contatos específicos.
* **Upsell/cross-sell na recompra:** Registro de vendas extras feitas no mesmo contato.

---

### 7. Telas que saem do Centro (Apoio / Backlog)

Estas telas e lógicas perdem o foco prioritário no MVP (embora possam existir tecnicamente para apoio, não guiam a evolução do produto):
* Extrato de vendas geral;
* Total vendido geral;
* Comissão geral de venda;
* Meta geral de venda;
* Ranking por venda geral;
* Registrar todas as vendas da loja;
* Diferenciação de tipos de venda (simples, mista, recorrente) como lógica central de navegação ou cálculo global.

---

### 8. Nova Navegação Sugerida

Propõe-se uma estrutura de menus simples, direta e focada na operação:

```
[ Início ] ─── [ Fila ] ─── [ Registrar ] ─── [ Produtos ] ─── [ Mais ]
```

#### Detalhamento das Telas:

* **Início:**
  * Dinheiro na mesa (total estimado de recompras pendentes).
  * Recuperado no mês (recompras com sucesso).
  * Oportunidades para Hoje, Atrasados e Agendados.
  * Taxa de recuperação (conversão de contatos em vendas).
  * Top produtos de recompra.
* **Fila:**
  * Abas/Filtros: Atrasados, Hoje, Próximos 7 dias, Agendados, Sem resposta, Perdidos, Confirmados.
* **Registrar:**
  * Cadastro rápido focado em criar a oportunidade: Cliente, WhatsApp, Produto recorrente, Data da compra, Valor aproximado, Ciclo de retorno (gerado automaticamente ou customizado), Vendedora responsável.
* **Produtos:**
  * Listagem de itens recorrentes: Nome do produto, Preço médio, Ciclo padrão em dias, Mensagens template vinculadas, Status (ativo/inativo).
* **Mais:**
  * Atalhos para subpáginas: Clientes, Recompras recuperadas, Agendamentos ativos, Equipe, Configurações gerais, Academy (treinamentos), Perfil.

---

### 9. Métricas Canônicas

#### Visão Dono/Gerente:
* **Dinheiro na Mesa:** Valor estimado das recompras que já venceram ou estão pendentes hoje e não foram convertidas.
* **Recuperado no mês:** Valor total das recompras dadas como "confirmadas" dentro do mês atual.
* **Upsell recuperado:** Valor de produtos adicionais vendidos no mesmo ato da recompra.
* **Total gerado pelo F5:** Recompra confirmada + Upsell.
* **Atrasados:** Oportunidades cujo ciclo venceu e ainda não tiveram contato/desfecho.
* **Hoje:** Oportunidades prontas para contato no dia atual.
* **Agendados:** Contatos que foram reagendados para datas futuras a pedido do cliente.
* **Taxa de recuperação:** Recompras confirmadas dividido pelo total de oportunidades trabalhadas.

#### Visão Vendedora:
* **Minha fila hoje:** Tarefas pendentes designadas à vendedora.
* **Minhas recompras recuperadas:** Volume financeiro e quantidade que a vendedora recuperou.
* **Minha comissão de recompra:** Caso a loja mantenha regras específicas para este canal.
* **Meus agendamentos:** Retornos agendados sob responsabilidade da vendedora.
* **Meu dinheiro em aberto:** Oportunidades pendentes sob sua carteira.

---

### 10. Upsell dentro da Recompra (Futuro)

* **Cenário:** O cliente comprou Whey Protein. No contato de recompra de 30 dias, a vendedora oferece um produto complementar e o cliente decide levar Whey Protein + Creatina.
* **Fluxo no Sistema:**
  * O sistema deverá permitir discriminar o que é o valor da **Recompra do Produto Base** e o que é o **Upsell** (Creatina).
  * Armazenar os valores de forma separada para gerar inteligência de vendas.
  * *Nota: Este comportamento será apenas documentado e modelado na interface futuramente, sem implementação técnica de banco nesta fase.*

---

### 11. Agendamento de Retorno (Futuro)

* **Cenário:** A vendedora entra em contato pelo WhatsApp e o cliente responde: *"Estou viajando, pode me chamar no dia 10?"*.
* **Fluxo no Sistema:**
  * O sistema deve permitir que a vendedora clique em "Agendar Retorno", selecione a nova data, insira observações/motivos e salve.
  * O cliente sai da fila ativa de "Hoje/Atrasados" e é agendado, retornando automaticamente à fila ativa na data programada.
  * *Nota: Este fluxo será implementado em fases futuras.*

---

### 12. Plano de Fases Pequenas

* **9.0A — Documento de realinhamento estratégico** (Esta fase)
* **9.0B — Rebranding visual para F5 Recompra, sem mexer em banco**
* **9.0C — Simplificar navegação e tirar telas ERP-like do centro**
* **9.0D — Reposicionar Dashboard para recompra**
* **9.0E — Transformar Venda Rápida em Registrar Compra para Recompra**
* **9.0F — Melhorar Fila de Recompra com status de resultado**
* **9.0G — Criar Agendamento de Retorno**
* **9.0H — Registrar Recompra + Upsell**
* **9.0I — Smoke test completo do fluxo de recompra**

---

### 13. Riscos

* **Mudar demais e quebrar o que já funciona:** Alterações nas telas de vendas ou lógica do dashboard atual podem impactar o uso atual se não forem feitas de forma modular.
* **Apagar valor técnico já construído:** Descartar telas e fluxos legados de comissão/vendas gerais de forma destrutiva. O ideal é apenas desviar o foco na interface de navegação (esconder/priorizar de outra forma), mantendo o código subjacente seguro.
* **Confundir usuários na transição:** A mudança abrupta do nome e identidade (ex: Recway para F5 Recompra) necessita de uma transição visual e textual muito clara e polida.
* **Mexer no banco de dados antes da hora:** Alterar esquemas de tabelas ou criar migrações complexas antes do fluxo visual estar consolidado pode gerar retrabalho.
* **Misturar venda geral com recompra novamente:** Voltar a ceder à tentação de adicionar campos de venda geral na tela de "Registrar", inflacionando o formulário.

---

### 14. Recomendação Final

Recomenda-se avançar imediatamente para a **Fase 9.0B — Rebranding visual e linguagem F5 Recompra, sem mexer em banco**, garantindo que a marca, os títulos, logos e cores reflitam a nova tese de micro SaaS de recompra, mantendo a estabilidade estrutural do banco de dados intacta.
