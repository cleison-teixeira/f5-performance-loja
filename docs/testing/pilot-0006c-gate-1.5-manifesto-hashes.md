# PILOT-0006C-RUN-001 — Manifesto de Hashes das Fixtures

Calculado antes de qualquer execução (leitura local, sem staging). Deve ser
recalculado ao final da execução — qualquer divergência interrompe o
encerramento do Gate 1.5 (nenhuma fixture pode ser corrigida/regravada
durante a execução; se precisar mudar, abre-se mini-gate próprio).

Nenhum UUID ou segredo consta neste manifesto — só nome de arquivo, hash e
tamanho.

## Hashes iniciais (`__tests__/fixtures/pilot-0006c/`)

| Arquivo | SHA-256 | Tamanho (bytes) |
|---|---|---|
| README.md | `819da9ff9e3be8dcb9674c4cd1774c0d24031f111193b9a1f05f2d6c45f7c397` | 11980 |
| cliente-existente.json | `69f77ce54f72528da91d5accbb364ecfb5ed7fd57afffc5e63e9574f6866023f` | 886 |
| cliente-nome-ausente.json | `d79ddb24ba521f8331c935bee32a9142647f155f45d43e3f08c51e8b88a874f8` | 849 |
| cliente-sem-telefone.json | `be2b5448ea30c90599d5602e6457e74c8ee22748f7359a72062f6f2b56504103` | 955 |
| contrato-nao-suportado.json | `16758274c9f66fc0f10809f5493fce111f9fa5ee18dc06fadfda9e64e23def1b` | 871 |
| data-ano-zero.json | `5791ad64c1f9e7f7ec903ed7c13444773162374d4276a310634d0e5d45323855` | 871 |
| data-inexistente.json | `9898e20c5edcbe1c5357726a33a99a78e86f88787b53a0e4cdd4c9984473a679` | 871 |
| data-invalida-formato.json | `50f4002db99526a99e3fbe1773cacfc092072979381d0bd523a2c9b4e565e705` | 880 |
| data-venda-ausente.json | `98074f1d34b820f594fea81e4c5e50b4b9fe820f6ee7e6c60d133c1f7bea576b` | 863 |
| data-venda-round-trip-invalido.json | `d333ca9cc9fdb0acddf2bc4ed373b50057cf099d7e776800d9a2082b665330e1` | 871 |
| itens-nao-array.json | `d162cbb9f6feb0bfda52c394a89b16f59b7221fe7f375e1732354916536705ba` | 853 |
| itens-vazio.json | `61a29f904238f115a5e5a04c577e682adc597e8277ec81fd932d6d69efd80a03` | 732 |
| json-vazio.json | `ca3d163bab055381827226140568f3bef7eaac187cebd76878e0b63e9e442356` | 3 |
| loja-externa-id-ausente.json | `6431cf117b291bc91969a30f3cd0fd41ed63fedca4597a793cf1499c7211ba1a` | 852 |
| loja-nao-mapeada.json | `f0bacf606557c8c437c46546fa7119ebc89e0ac1e411d0468d604feeaf72b49a` | 886 |
| mesma-venda-evento-diferente.json | `72f5ed20a517a71e07e04f1f16b46c363d36e7d835120f69cac84b67f438d6b1` | 871 |
| primeira-compra-observada.json | `d31a88766e4b894b6dcc0943f9e1f31de98367ed8ff67af1c075651a25c7ca80` | 877 |
| produto-ambiguo.json | `9a9011663f22cca7ba0b805521499f113e69c5029795895dc66b448525421b2a` | 877 |
| produto-nao-resolvido.json | `0028b411c0ef3a14e891fc17317bf2bab89abe66ca102011ae9370bc8d6b4f4c` | 888 |
| produto-nome-origem-ausente.json | `acd064cc98ff9111dd2e590effdd5b903f99ea24aa67512a73ca556c8a948397` | 846 |
| produto-recorrente-sem-ciclo.json | `d40807f07e70616508d74a5f87c88e1e78ffbd69437e325ad9ffb14cad916800` | 878 |
| quantidade-invalida-negativa.json | `f9941ba791cfd3ed4c4f777f5df9e43044e13dd55c09ce5eaa194f94b217fb33` | 873 |
| quantidade-invalida-string.json | `3e66dc0f40e0f27bd28f064c2be696e12c8676040b2387271e99558f2e983703` | 874 |
| quantidade-invalida-zero.json | `f905f443eebf1b444512d7b99db3a861ef515c569441b21a7bd6a7512c5b9626` | 867 |
| segunda-compra-observada.json | `66ef1e3ebbdbbcbeaa1c8c18b44667b0299e7ed559d852619276c7258abcf9f6` | 877 |
| tipo-evento-nao-suportado.json | `7aaeefaf7253a6ba7ea45c9c910c4ce08daf28704b3c7dbf246fae5f29700de1` | 942 |
| valor-unitario-invalido-negativo.json | `148d135e6f2000b328c481c6b506bab57871cb5a92c8255b540007fd7960fdf7` | 867 |
| valor-unitario-invalido-string.json | `9f3c7e1dc9906eb1d17251cf635f5628ae592267ac49252ca1048c317f7543f9` | 867 |
| valor-unitario-invalido-zero.json | `bc9bbb920d445d1e5c02e4b9942dc36f6833b7b7d5058978dd25810117f927d9` | 863 |
| varios-itens-um-invalido.json | `368452c4f29b8e8313d7d0cd3fc427bdecab1472329d721fb9858555d10fe99a` | 1004 |
| varios-itens-valido.json | `68297bafc64506da27e519eec4b2eaf48832844b129573e24f0656dd1a51db22` | 1002 |
| venda-externa-id-ausente.json | `cb8218ba9974c8318eeabfbf76dbbb7474f145596cf83d9405df0bb00d50c1bc` | 846 |
| venda-valida.json | `8ccab7f9b85b06c7d78adc20712f876217d900c3732276fac010d9c20017588b` | 871 |
| vendedor-ausente.json | `fd4a3cf6787ecae667d157c79bf2a62d97f578bc65cbd0aac63bafb7d3d8a8a4` | 813 |
| vendedor-invalido.json | `92f9a658c291a2446d65bdcc35bb3d5dea066f73d57f7cd497689037eefb18d0` | 864 |

## Hash da migration 071 (referência)

`6da4cf96506da4645aa42bd1e30de7acae1ac954f5d59c85e24ff2a476d15109` (já
calculado no Gate 1.5 anterior, reconfirmar antes da execução real).

## Nota de auditoria — atualização do hash do README (Mini-Gate 1.5.H1)

- **execution_id:** `PILOT-0006C-RUN-001`
- **Arquivo alterado:** `__tests__/fixtures/pilot-0006c/README.md`
- **Hash anterior:** `051cf799340fa79c986b8b3ce3b8564b8f0b281278be2efd08b7111fe7ea2593` (11389 bytes)
- **Hash novo:** `819da9ff9e3be8dcb9674c4cd1774c0d24031f111193b9a1f05f2d6c45f7c397` (11980 bytes)
- **Motivo da atualização:** correção documental da semântica de "Evento Bruto imutável" (item 1 do mini-gate de correções documentais anterior a este) — a frase "Nunca alteram o evento original" foi substituída por uma precisão distinguindo payload/identidade imutáveis de metadados de processamento mutáveis.
- **Referência:** mini-gate de correções documentais ("PILOT-0006C — GATE 1.5 — ÚLTIMAS CORREÇÕES DOCUMENTAIS E APROVAÇÃO FINAL DO PLANO", item 1), seguido deste mini-gate corretivo (1.5.H1) para realinhar o manifesto.
- **Confirmação temporal:** a edição do README ocorreu antes da criação de qualquer branch e antes de qualquer execução no banco — não houve execução em andamento no momento da mudança.
- **Data/horário da atualização deste manifesto:** ver horário de verificação registrado na seção de verificação abaixo.
- **Confirmação:** nenhuma das 34 fixtures JSON foi modificada; a migration 071 permanece com o mesmo SHA-256 já aprovado.

> O hash de referência foi atualizado porque o artefato documental foi
> legitimamente modificado antes da criação da branch e antes de qualquer
> execução. Não se trata de alteração silenciosa durante os testes.

## Hashes finais (preencher após a execução)

*(em branco até a execução — comparação obrigatória antes de encerrar o Gate)*
