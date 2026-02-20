

# Criar Leads de Demonstracao na Conta Admin

## Resumo

Criar uma edge function temporaria para inserir 50 leads de demonstracao na conta admin, com dados realistas distribuidos ao longo dos ultimos 45 dias, atingindo as metricas desejadas:

- **50 leads** no total
- **4 ganhos** (taxa de conversao de 8%)
- **Receita total: R$12.800** (ticket medio de R$3.200)
- **12 perdidos** com motivos variados
- **8 propostas enviadas**
- **4 follow-ups**
- **4 contratos enviados**
- **10 contatos iniciados**
- **6 novos leads**
- **Tarefas associadas** (concluidas e pendentes)

## Distribuicao dos Dados

| Status | Quantidade | Detalhes |
|--------|-----------|----------|
| Fechado Ganho | 4 | Valores: R$3.500, R$2.800, R$3.800, R$2.700 |
| Fechado Perdido | 12 | Motivos: Preco (5), Outro fornecedor (3), Evento cancelado (2), Nao respondeu (2) |
| Proposta Enviada | 8 | Em negociacao |
| Follow-up | 4 | Acompanhamento pos-proposta |
| Contrato Enviado | 4 | Quase fechando |
| Contato Iniciado | 10 | Primeiros contatos |
| Novo Lead | 6 | Recentes, sem contato |

Origens: Instagram, Google, Indicacao (distribuidas igualmente)
Interesses: Casamento, Formatura, Corporativo, Aniversario

## Implementacao

1. Criar edge function `seed-demo-leads` que:
   - Insere os 50 leads com todas as datas de entrada em cada etapa preenchidas
   - Cria tarefas associadas (cadencias concluidas para ganhos, pendentes para contatos)
   - Usa service role key para bypassar RLS

2. Executar a function uma vez para popular os dados

3. Deletar a edge function apos uso (codigo temporario)

## Arquivo

| Arquivo | Acao |
|---------|------|
| `supabase/functions/seed-demo-leads/index.ts` | Criar (temporario) |

