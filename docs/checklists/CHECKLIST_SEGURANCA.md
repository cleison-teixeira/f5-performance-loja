# Checklist de Segurança

## Autorização e isolamento

- [ ] A operação valida usuário autenticado?
- [ ] Organização, empresa, rede e loja estão explicitamente filtradas?
- [ ] O usuário possui a função necessária?
- [ ] Service Role é usada apenas no servidor e quando indispensável?
- [ ] RLS e políticas foram revisadas quando aplicável?

## Entrada e saída

- [ ] Entradas foram validadas no servidor?
- [ ] SQL injection foi impedida?
- [ ] XSS foi considerado?
- [ ] Uploads possuem tipo, tamanho e destino controlados?
- [ ] Mensagens de erro não expõem segredos ou estrutura interna?

## Dados

- [ ] Dados pessoais foram minimizados?
- [ ] Não há exposição entre lojas ou organizações?
- [ ] Não há logs com tokens, senhas ou dados sensíveis?
- [ ] Exclusões críticas são bloqueadas ou auditadas?
- [ ] Alterações importantes possuem trilha de auditoria?

## Banco e transações

- [ ] Operação crítica é atômica?
- [ ] Existe rollback seguro?
- [ ] Constraints e chaves estrangeiras foram consideradas?
- [ ] Operação é idempotente quando necessário?
- [ ] Concorrência e duplicidade foram avaliadas?

## Dependências e deploy

- [ ] Dependências novas foram verificadas?
- [ ] Segredos estão em variáveis de ambiente?
- [ ] Ambientes de staging e produção estão separados?
- [ ] Contas reais não foram usadas em testes?
- [ ] Plano de resposta a incidente existe para a mudança?
