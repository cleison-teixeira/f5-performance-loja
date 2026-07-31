# Checklist de Deploy

## Antes

- [ ] Branch e commit corretos?
- [ ] Pull request revisada?
- [ ] Testes e build aprovados?
- [ ] Migration revisada e testada?
- [ ] Variáveis de ambiente confirmadas?
- [ ] Backup ou estratégia de recuperação definida?
- [ ] Plano de rollback definido?
- [ ] Homologação aprovada?

## Migrations

- [ ] A alteração de schema existe como migration versionada no repositório?
- [ ] Não há alteração manual de schema sem migration correspondente (ver Constituição Técnica — Soberania do Schema)?
- [ ] A migration foi aplicada e validada primeiro em staging?
- [ ] A migration é idempotente, quando aplicável?
- [ ] A paridade de schema entre staging e produção foi validada?
- [ ] O schema resultante é compatível com a versão do código sendo promovida?
- [ ] A migration foi validada em ambiente limpo (quando aplicável) para garantir que o banco possa ser reconstruído apenas a partir do repositório?
- [ ] Existe plano de rollback ou recuperação específico para esta migration?
- [ ] O histórico oficial de migrations representa corretamente o schema que será promovido para produção?
- [ ] Não há divergência de schema conhecida que impeça a promoção deste release?

## Durante

- [ ] Deploy acompanhado?
- [ ] Logs monitorados?
- [ ] Migration aplicada na ordem correta?
- [ ] Nenhuma credencial foi exposta?

## Depois

- [ ] Rotas críticas validadas?
- [ ] Login e permissões validados?
- [ ] Venda e módulos afetados validados?
- [ ] Erros e performance monitorados?
- [ ] Registro da versão e decisão atualizado?
