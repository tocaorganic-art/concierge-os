# Open Book — transparência de custos no Portal do Cliente

Pesquisa e recomendação de design para a aba **Financeiro** do Portal do Cliente
do Concierge OS. `WebSearch` estava indisponível no momento desta pesquisa
(erro de modelo); o conteúdo abaixo vem de conhecimento consolidado do domínio
(software de gestão de construção civil e property management) mais análise do
schema já existente no repositório (`base44/entities/Expense.jsonc`,
`Billing.jsonc`).

## 1. O que é "Open Book"

"Open Book" (ou "cost-plus transparency") é um modelo em que o prestador de
serviço mostra ao cliente final, em tempo real, **cada custo real** que pagou a
terceiros — fornecedor, valor, data, comprovante — em vez de apresentar só um
preço fechado. A remuneração do prestador (taxa de gestão, comissão, markup)
fica separada e clara, nunca escondida dentro dos custos repassados.

É o padrão dominante em dois mercados maduros:

- **Construção civil residencial** — Buildertrend e CoConstruct (líderes de
  mercado nos EUA) dão ao cliente final um "Client Portal" onde cada nota
  fiscal de material/mão-de-obra aparece categorizada, com o comprovante
  anexado, à medida que a obra avança. A taxa do construtor (fixa ou % sobre o
  custo) fica em uma linha separada e visível.
- **Property management** — AppFolio e Buildium mostram ao proprietário do
  imóvel cada despesa de manutenção (categoria, fornecedor, nota fiscal),
  separada da taxa de administração do gestor.

O motivo de negócio é o mesmo nos dois casos e se aplica diretamente a um
concierge de viagens: o cliente está pagando por um serviço de curadoria/
gestão, não só pelos itens em si — mostrar os custos reais constrói confiança
e justifica a taxa de serviço, em vez de deixá-la implícita e questionável.

## 2. Estrutura de ledger — campos mínimos

Do que é padrão nesses sistemas (e já existe quase todo no schema do
Concierge OS):

| Campo | Já existe? | Onde |
|---|---|---|
| Categoria | ✓ | `Expense.categoria` |
| Fornecedor / prestador | ✓ | `Expense.fornecedor` |
| Descrição | ✓ | `Expense.descricao` |
| Valor pago (custo real) | ✓ | `Expense.valor` |
| Valor repassado ao cliente (se houver markup) | ✓ | `Expense.valor_cobrado_cliente` |
| Data | ✓ | `Expense.data_despesa` |
| Comprovante/nota fiscal anexado | ✓ | `Expense.comprovante_url` |
| Taxa de gestão / margem do prestador | ✓ (mas **nunca** exposta ao cliente) | `Expense.margem_admin` |
| Status de aprovação do custo | ✗ ausente | — |

O único campo que os sistemas de referência têm e o Concierge OS não tem
ainda é um **status de aprovação** por item (ex.: "aguardando aprovação do
cliente" / "aprovado"), usado quando o prestador quer validação do cliente
antes de comprometer um gasto maior. Fica como recomendação futura, não
bloqueia o que já foi pedido.

## 3. Fluxo — quem cria, quem vê, quem aprova

- **Cria**: equipe/admin, ao lançar a despesa (já existente em
  `Despesas.jsx` + `ExpenseFormDialog.jsx`).
- **Vê**: equipe/admin (tudo, incluindo margem) e o cliente vinculado (tudo
  **exceto** `margem_admin` — é a única linha vermelha nos sistemas de
  referência: o cliente nunca vê a margem do prestador, só o custo real e,
  quando houver, o valor com markup).
- **Aprova**: nos sistemas de referência, o cliente pode "aprovar" um gasto
  antes dele ser comprometido (change order approval). O Concierge OS hoje
  lança a despesa já paga/comprometida — aprovação prévia é uma evolução
  futura, não faz parte desta entrega.

## 4. UI — como exibir

Padrão observado em Buildertrend/CoConstruct/AppFolio, adaptado ao layout
mobile-first do Concierge OS:

- Lista agrupada por categoria (não uma tabela densa — o cliente final não é
  um contador), com o **ícone da categoria** já usado no painel interno
  (`Despesas.jsx` → `CATEGORY_META`) para consistência visual imediata entre
  o que o admin vê e o que o cliente vê.
- Cada linha: ícone + categoria, fornecedor, valor, comprovante (ícone de
  clipe clicável, abre em nova aba — mesmo padrão já usado em `Billing`/
  `Despesas` no admin).
- Totalizador no topo: soma de tudo o que já foi gasto na categoria/no total.
- Sem filtros complexos na primeira versão (o volume por cliente é baixo —
  uma dúzia de itens por reserva, não centenas); busca/filtro fica como
  melhoria futura se o volume crescer.

## 5. Segurança — o que o cliente vê vs. dado interno

| Dado | Cliente vê? |
|---|---|
| Categoria, fornecedor, descrição, data | Sim |
| `valor` (custo real pago pelo prestador) | **Sim** — é o próprio pedido desta tarefa: transparência total |
| `valor_cobrado_cliente` (quando há markup) | Sim |
| `comprovante_url` | Sim |
| `margem_admin` (comissão/lucro do prestador) | **Não, nunca** |

Implementado via **RLS de campo** em `base44/entities/Expense.jsonc`
(restringe leitura de `margem_admin` a `role: admin`) combinado com RLS de
entidade (leitura liberada para `data.client_id == user.data.client_id`) —
não depende só da UI esconder a coluna, o backend já nega o campo mesmo que
alguém acesse a API diretamente.

## 6. Wireframe textual — aba Financeiro do Portal

```
┌─────────────────────────────────────┐
│ Financeiro                           │
├─────────────────────────────────────┤
│ PAGAMENTOS                           │
│ ▓▓▓▓▓▓░░░░░░░░░░░  38% pago          │
│ Saldo pendente        R$ 66.323,44   │
│                                       │
│ Parcela 1/2 — Confirmação    Pago    │
│ R$ 41.500                            │
│                                       │
│ Cobrança adicional...     Pendente   │
│ R$ 2.800    [Anexar comprovante]     │
│ ...                                  │
├─────────────────────────────────────┤
│ EXTRATO DE CUSTOS (Open Book)        │
│ Total gasto até agora: R$ XX.XXX     │
│                                       │
│ 🏠 Imóvel                             │
│   Aluguel casa — Casa Amores  R$ Y   │
│   📎 comprovante                      │
│                                       │
│ 🚗 Transporte                         │
│   Aluguel de carro (9 diárias) R$ Z  │
│   📎 comprovante                      │
│ ...                                  │
├─────────────────────────────────────┤
│ COMO PAGAR (Pix)                     │
└─────────────────────────────────────┘
```

## 7. Recomendação para o Concierge OS

Implementar a aba `/portal/financeiro` com duas seções, nessa ordem:

1. **Pagamentos** (`Billing`) — já implementado: saldo pendente, barra de
   progresso, lista de cobranças/parcelas, upload de comprovante de
   pagamento pelo cliente.
2. **Extrato de Custos** (`Expense`, novo) — ledger open-book: uma linha por
   despesa, agrupada por categoria, mostrando fornecedor + valor + data +
   comprovante, excluindo sempre `margem_admin`.

RLS já ajustado nesta sessão (`Expense.jsonc`): leitura liberada por
`client_id`, `margem_admin` restrito por RLS de campo a `role: admin`.

Próximo passo: implementar `src/pages/ClientFinanceiro.jsx` seguindo este
wireframe.
