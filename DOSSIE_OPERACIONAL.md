# Dossiê Operacional — Verdelimp ERP v2.3

## Objetivo

Transformar edital, termo de referência, e-mail ou escopo manual em uma decisão comercial rastreável: equipe, horas-homem, duração, custos, impostos, retenções, capital de giro, riscos, preço e proposta.

O princípio central é a separação de responsabilidades:

- a IA extrai fatos, premissas e trechos de evidência;
- uma pessoa valida a extração;
- o motor determinístico calcula operação e preço;
- cada alçada aprova a versão exata da proposta;
- documentos e disponibilidade bloqueiam a mobilização;
- a execução real retroalimenta produtividade e margem.

## Fluxo

1. **Importar** PDF ou TXT, ou colar o escopo manualmente.
2. **Extrair** objeto, local, prazo, quantidades, serviços, requisitos e riscos, mantendo a evidência de origem.
3. **Validar** os fatos e corrigir omissões antes de qualquer aprovação.
4. **Compor** cada atividade com quantidade, unidade, produtividade, equipe mínima, jornada e custos.
5. **Dimensionar** HH, trabalhadores e duração conforme prazo e eficiência.
6. **Reservar recursos** provisoriamente, bloqueando conflito de funcionário ou equipamento no mesmo período.
7. **Precificar** custos diretos, mobilização, administração, risco, capital de giro, impostos e margem.
8. **Comparar cenários** otimista, base e adverso.
9. **Criar proposta versionada** e colher aprovações técnica, financeira e da diretoria.
10. **Converter em contrato**, gerando matriz documental, cronograma e confirmação de reservas em uma transação.
11. **Mobilizar** somente recursos disponíveis e documentalmente liberados.
12. **Executar** com diário de obras, produção, HH, custos e aceite do cliente.
13. **Controlar desvios** por solicitação formal de alteração de escopo.

## Dimensionamento

Para cada composição:

```text
produtividade efetiva = produtividade por HH × fator de eficiência
HH de produção = quantidade ÷ produtividade efetiva
HH planejadas = HH de produção + (horas de preparação × equipe mínima)
dias úteis disponíveis = prazo em dias × dias trabalhados por semana ÷ 7
trabalhadores = máximo(equipe mínima, teto(HH ÷ dias úteis ÷ horas por dia))
duração = HH ÷ trabalhadores ÷ horas por dia
```

A produtividade é expressa por trabalhador-hora. O fator de eficiência absorve deslocamentos, interferências, pausas e condições locais e deve ser documentado. A função-base pode ser vinculada à folha; nesse caso o dossiê usa o custo completo por hora paga (salário, encargos, provisões e benefícios). A eficiência fica apenas na produtividade, evitando contar a improdutividade duas vezes.

## Custos e preço

```text
mão de obra = HH × custo pleno da hora
insumos = quantidade × custo unitário
equipamentos = duração × custo diário
custo operacional = custos diretos + mobilização + desmobilização
custo de capital = [(operacional + administração + risco) × máximo(1, prazo de pagamento ÷ 30)] × taxa financeira
custo precificável = operacional + administração + risco + custo do capital
preço mínimo = custo precificável ÷ (1 − carga tributária definitiva)
preço recomendado = custo precificável ÷ (1 − carga tributária definitiva − margem alvo)
preço comercial = arredondamento do preço recomendado para a centena seguinte
limite de desconto = preço comercial − preço mínimo
```

Margem e impostos são calculados “por dentro”, sobre a receita. O custo pleno da mão de obra vem da folha e inclui adicionais, FGTS, parcela patronal aplicável e provisões.

## Tributos e retenções

Cada perfil tributário é versionado. Um orçamento sempre referencia a versão usada.

- ISS marcado como já incluído na alíquota efetiva não é somado novamente.
- Retenção é tratada primeiro como impacto de caixa, não automaticamente como custo.
- INSS retido só aumenta a carga definitiva quando o perfil informa que não é recuperável.
- IRRF e retenções federais ficam destacadas no fluxo de caixa.
- Alterar alíquotas cria uma nova versão; a versão histórica permanece reproduzível.

As regras são apoio gerencial e devem ser confirmadas pelo contador para o município, serviço, regime e competência aplicáveis.

## Cenários e riscos

O motor gera:

| Cenário | Produtividade | Fator de custo |
|---|---:|---:|
| Otimista | 110% | 95% |
| Base | 100% | 100% |
| Adverso | 80% | 115% |

Cada risco recebe probabilidade e impacto de 1 a 5. O resultado mostra nível, mitigação, qualidade do dossiê e escore de decisão. Falta de validação, composição inválida, custo zero ou divisor de preço inviável gera bloqueio, não apenas aviso.

## Governança da proposta

- Toda proposta possui versões imutáveis com snapshot do cálculo e preço.
- Uma alteração de preço cria nova versão e reinicia as aprovações.
- Aprovação técnica valida método, produtividade, equipe e prazo.
- Aprovação financeira valida custos, tributos, caixa, mínimo e margem.
- Diretoria valida risco e decisão comercial.
- Somente a versão atual aprovada nas três alçadas pode virar contrato.
- Preço inferior ao mínimo do dossiê é rejeitado pelo backend.

## Documentos e mobilização

Perfis documentais por cliente são versionados. Quando o cliente possui perfis ativos, o usuário precisa escolher explicitamente no dossiê qual versão vale para aquele serviço; o sistema não escolhe uma matriz arbitrariamente. Os requisitos podem ser restringidos por:

- empresa;
- funcionário e função;
- atividade;
- equipamento e tipo;
- validade, antecedência e caráter bloqueante.

ASO, treinamento e EPI podem ser comprovados por fonte automática. Documento manual nasce pendente, exige arquivo comprobatório e só libera recurso após revisão por perfil autorizado. Documentos de equipamentos aparecem no mesmo monitor conforme o tipo reservado. Ausência, validade insuficiente para a antecedência exigida, rejeição ou conflito de agenda cria mobilização suspensa com motivo explícito; após a correção, a ação **Reavaliar** executa novamente todas as regras antes da liberação.

## Execução e aprendizado

O diário registra composição, quantidade, unidade, equipe, horários, HH, insumos, equipamentos, transporte, ocorrências e aceite. O painel compara produtividade planejada e realizada e estima o custo real. Serviço fora do previsto deve abrir alteração de escopo com impacto de prazo e valor antes de ser incorporado.

## Migração e operação

Aplicar em produção:

```bash
npx prisma migrate deploy
npx prisma generate
npm run build
```

Migração: `20260721210000_dossie_operacional`.

A migração preserva como aprovados os registros documentais e as mobilizações ativas que já existiam, cria uma versão-base pendente para propostas legadas e limpa referências órfãs do diário antes de aplicar a nova chave estrangeira. Propostas antigas precisam passar pelas três novas alçadas antes da conversão.

Antes de ativar para usuários, cadastrar ao menos um perfil tributário ativo e revisar os perfis documentais dos clientes recorrentes.
