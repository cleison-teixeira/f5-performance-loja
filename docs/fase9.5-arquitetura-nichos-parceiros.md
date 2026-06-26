# F5 Recompra — Arquitetura futura de nichos, parceiros, bibliotecas e 
templates

## 1. Princípio central

O F5 Recompra deve continuar sendo um único produto.

Não duplicar o app por nicho.

A evolução correta é permitir que cada rede/loja opere com configurações 
específicas de nicho, parceiros, categorias, produtos, mensagens e 
treinamentos.

Exemplo de nichos futuros:

* Produtos naturais / suplementos
* Agropecuária
* Petshop
* Farmácia
* Cosméticos
* Manipulados
* Alimentos saudáveis
* Conveniência
* Outros nichos com recompra recorrente

## 2. Hierarquia conceitual

A arquitetura futura deve seguir esta lógica:

Nicho
→ Categoria do nicho
→ Parceiro
→ Biblioteca de produtos do parceiro
→ Templates de mensagem
→ Biblioteca de treinamentos do parceiro

Exemplo real do MVP:

Nicho: Produtos naturais / suplementos
Parceiro: PiuVita
Rede/cliente: Cia da Saúde
Lojas: Angeloni, Komprão São João, Komprão Centro

## 3. Biblioteca de produtos do parceiro

A biblioteca de produtos do parceiro é um catálogo modelo/global.

Ela não substitui diretamente a tabela operacional `produtos` da loja.

A regra correta é:

1. O produto existe na biblioteca do parceiro.
2. A loja escolhe importar esse produto.
3. Ao importar, o sistema copia o produto para a tabela `produtos` da 
loja.
4. Depois de importado, o produto passa a ser operacional daquela loja.
5. A loja pode ajustar preço, ciclo de recompra, mensagens e status 
localmente.

Exemplo:

Biblioteca PiuVita:

* Piufort Antiox
* Piufort Slim
* Piufort Woman
* Piufort Imune

Produto operacional da loja:

* Piufort Slim importado para CIA CIDADE AZUL - ANGELONI
* Piufort Slim importado para CIA CIDADE AZUL - KOMPRÃO SÃO JOÃO
* Piufort Slim importado para CIA CIDADE AZUL - KOMPRÃO CENTRO

Cada loja pode ter o mesmo produto com configurações locais.

## 4. Biblioteca de treinamentos do parceiro

Cada parceiro pode ter uma biblioteca própria de treinamentos.

Essa biblioteca deve alimentar a Academia F5 Recompra.

Exemplo:

Parceiro: PiuVita

Treinamentos:

* Como vender Piufort Antiox
* Como vender Piufort Slim
* Como vender Piufort Woman
* Como vender Piufort Imune
* Argumentos de venda PiuVita
* Objeções comuns PiuVita
* Como abordar recompra de suplementos
* Como recuperar cliente parado
* Como transformar lista de espera em venda

A Academia F5 deve futuramente permitir filtros por:

* Plataforma
* Vendas
* Parceiro
* Produto
* Nicho
* Categoria

## 5. Categorias por nicho

Cada nicho deve ter suas próprias categorias.

Exemplo para Produtos naturais / suplementos:

* Emagrecimento
* Energia e disposição
* Imunidade
* Saúde intestinal
* Beleza, pele e cabelo
* Sono e relaxamento
* Performance e treino
* Alimentos saudáveis
* Produtos perecíveis
* Produtos sob demanda
* Produtos de lista de espera

Exemplo para Petshop:

* Ração
* Petiscos
* Higiene
* Antipulgas
* Suplementos pet
* Medicamentos não controlados
* Areia sanitária
* Produtos recorrentes de banho/tosa

Exemplo para Agropecuária:

* Ração animal
* Suplementação animal
* Defensivos permitidos
* Sementes
* Ferramentas
* Produtos sazonais
* Produtos de reposição

## 6. Templates de mensagem por nicho e categoria

O sistema deve evoluir para ter templates de mensagem por:

* Nicho
* Categoria
* Parceiro
* Produto
* Etapa do relacionamento

Etapas principais:

* Agradecimento
* Relacionamento
* Recompra
* Oferta
* Lista de espera
* Cliente avisado
* Reativação
* Produto voltou ao estoque

## 7. Estilos de mensagem

Cada template pode ter variações de tom.

### 7.1 Clean

Mensagem simples, direta, consultiva e sem pressão.

Uso ideal:

* Loja mais premium
* Cliente sensível a venda agressiva
* Relacionamento inicial
* Produtos de saúde/bem-estar
* Mensagens de agradecimento e relacionamento

Exemplo:
"Oi {{cliente}}, tudo bem? Aqui é {{vendedora}} da {{loja}}. Estou 
passando para saber como foi sua experiência com {{produto}}. Se precisar 
de algo, posso te ajudar por aqui."

### 7.2 Persuasiva

Mensagem com incentivo comercial, urgência leve, cupom ou benefício.

Uso ideal:

* Recompra
* Produto acabando
* Campanha da loja
* Produto com alta recorrência
* Oferta com prazo

Exemplo:
"Oi {{cliente}}, tudo bem? Aqui é {{vendedora}} da {{loja}}. Pelo prazo da 
sua última compra, o {{produto}} pode estar perto de acabar. Hoje consigo 
separar para você com uma condição especial de recompra. Quer que eu 
reserve?"

### 7.3 Relacionamento

Mensagem focada em cuidado, acompanhamento e presença.

Uso ideal:

* Meio do ciclo de recompra
* Produtos de saúde
* Suplementos
* Produtos naturais
* Clientes novos

Exemplo:
"Oi {{cliente}}, tudo bem? Aqui é {{vendedora}} da {{loja}}. Passando para 
saber se você já começou a usar o {{produto}} e se está tudo certo. 
Qualquer dúvida, me chama por aqui."

### 7.4 Lista de espera

Mensagem usada quando o produto solicitado chegou ou foi separado.

Uso ideal:

* Produto que voltou ao estoque
* Produto sob demanda
* Produto encomendado
* Produto perecível
* Produto de alta procura

Exemplo:
"Oi {{cliente}}, tudo bem? Aqui é {{vendedora}} da {{loja}}. O produto que 
você tinha pedido chegou: {{produto}}. Consegui separar para você. Quer 
que eu deixe reservado até o fim do dia?"

## 8. Regra obrigatória para mensagens

Mensagens oficiais não devem ter emoji.

Motivo:
Evitar erro em envio, cópia, simulação, encoding ou integração com 
WhatsApp.

Regras:

* Sem emoji.
* Sem caracteres especiais desnecessários.
* Texto simples.
* Compatível com WhatsApp.
* Variáveis claras.
* Mensagens curtas.
* Tom natural de vendedor.
* Evitar promessa médica ou terapêutica.
* Evitar afirmações sensíveis sem base.
* Evitar exageros.

## 9. Variáveis padrão dos templates

Os templates devem suportar variáveis como:

* {{cliente}}
* {{primeiro_nome}}
* {{vendedora}}
* {{loja}}
* {{produto}}
* {{categoria}}
* {{parceiro}}
* {{dias_recompra}}
* {{data_compra}}
* {{cupom}}
* {{beneficio}}
* {{validade_oferta}}
* {{observacao}}

## 10. MVP Cia da Saúde / PiuVita

Para o MVP atual, o foco deve ser:

Nicho:
Produtos naturais / suplementos

Parceiro principal:
PiuVita

Rede:
Cia da Saúde

Objetivo:
Preparar uma biblioteca inicial de produtos, categorias, mensagens e 
treinamentos para a operação real das lojas.

Importante:
Não usar produtos fake de beleza/higiene como base do MVP real.

Produtos fake usados nos testes serviram para validar o motor, mas a 
apresentação comercial deve usar produtos reais ou compatíveis com Cia da 
Saúde/PiuVita.

## 11. Recuperação de material antigo

Antes de criar qualquer coisa nova, recuperar arquivos antigos do projeto 
relacionados a:

* Cia da Saúde
* Rede Cia da Saúde
* PiuVita
* PiuVitta
* ngpiuvita
* Piufort
* suplementos
* produtos naturais
* categorias
* templates
* mensagens
* biblioteca
* parceiro
* catálogo parceiro
* treinamento parceiro

Não recriar do zero se já existir material levantado.

## 12. Importação futura

A futura importação de biblioteca deve permitir:

* Escolher nicho
* Escolher parceiro
* Ver produtos disponíveis
* Importar produto para uma loja específica
* Importar produto para várias lojas da rede
* Importar mensagens padrão
* Importar ciclo de recompra sugerido
* Importar treinamentos do parceiro para a Academia F5

## 13. Lista de espera e biblioteca

A Lista de Espera deve conversar com a tabela de produtos da loja.

Se o produto ainda não existe na loja:

* o sistema deve criar ou vincular o produto de forma controlada;
* evitar duplicidade por variação de nome;
* usar normalização de nome;
* permitir editar item;
* permitir converter em venda;
* venda convertida deve aparecer no Extrato com origem "Lista de espera".

## 14. Direção comercial

A biblioteca de parceiros é um diferencial comercial do F5 Recompra.

A promessa para a loja/rede pode ser:

"Além do sistema de recompra, sua loja recebe uma biblioteca pronta de 
produtos, mensagens e treinamentos para começar a vender mais rápido."

Isso reduz esforço de implantação e aumenta percepção de valor.

## 15. O que não fazer agora

Não codar multi-nicho completo antes da apresentação.

Não criar telas grandes sem validar.

Não duplicar app por nicho.

Não alterar RLS sem necessidade.

Não criar migration sem revisar impacto.

Não importar produtos antes de recuperar e auditar material antigo.

Não misturar produtos fake de teste com a operação real da Cia da Saúde.

## 16. Sequência recomendada

Fase 9.5A — Recuperar arquivos antigos Cia da Saúde / PiuVita
Fase 9.5B — Normalizar biblioteca PiuVita
Fase 9.5C — Definir categorias do nicho Produtos naturais / suplementos
Fase 9.5D — Criar templates sem emoji por categoria/produto
Fase 9.5E — Preparar treinamentos PiuVita na Academia
Fase 9.5F — Importar produtos reais para as 3 lojas da Cia da Saúde
Fase 9.5G — Validar apresentação comercial do MVP

