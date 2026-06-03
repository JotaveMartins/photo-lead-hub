## O que será feito

### 1. Aumentar o popup "Adicionar/Editar Despesa"
Arquivo: `src/components/financeiro/NovaDespesaModal.tsx`

- Trocar `max-w-md` por `max-w-2xl` (modal mais largo e confortável).
- Reorganizar campos em grid de 2 colunas onde fizer sentido (Valor + Data já estão em grid; aplicar mesmo padrão para Categoria + Forma de Pagamento, e Status + Evento), reduzindo a altura total e o "aperto" visual visto no print.
- Manter `max-h-[90vh] overflow-y-auto` para telas menores.

### 2. Recorrência: mensal, anual ou personalizada
Hoje `recorrente` é apenas um booleano sem efeito (nenhum job gera as repetições). Vamos adicionar a configuração da frequência para ficar pronto para uso futuro e já refletir na UI.

**Banco** (migração nova):
- Adicionar à tabela `despesas`:
  - `recorrencia_frequencia` text (`'mensal' | 'anual' | 'personalizada'`, nullable)
  - `recorrencia_intervalo_dias` integer (nullable, usado só quando `personalizada`)
- Sem mudanças em RLS/GRANTs (tabela já configurada).

**Frontend** (`NovaDespesaModal.tsx` + `useDespesas.ts`):
- Quando o switch "Despesa Recorrente" estiver ligado, mostrar:
  - `SearchSelect` "Frequência" com opções: Mensal, Anual, Personalizada.
  - Se "Personalizada": input numérico "A cada X dias".
- Default ao ligar: `mensal`.
- Persistir `recorrencia_frequencia` e `recorrencia_intervalo_dias` ao criar/editar. Ao desligar recorrente, limpar ambos os campos.
- Atualizar tipos em `useDespesas.ts` (`Despesa`, `DespesaInsert`).

### Observação
A geração automática das próximas ocorrências (mensal/anual) não está implementada hoje e continua fora do escopo — esta entrega cobre só o popup e o registro da preferência de recorrência.