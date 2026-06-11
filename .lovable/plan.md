## Problema

O Kanban usa colunas com largura fixa (`w-72` = 288px) e `flex-shrink-0`. Com 6 etapas já estava no limite; adicionando "Triagem Feita" (7ª etapa) passou a estourar a largura disponível em telas grandes, forçando scroll horizontal mesmo quando dava pra caber tudo.

## Solução

Em `src/components/KanbanBoard.tsx`, tornar a largura das colunas responsiva:

- **Em telas grandes (xl+, ≥1280px)**: colunas dividem o espaço igualmente com `flex-1` e `min-w-0`, garantindo que todas as 7 etapas caibam sem scroll.
- **Em telas menores**: mantém comportamento atual (`w-72 flex-shrink-0`) com scroll horizontal — não dá pra encaixar 7 colunas legíveis em telas pequenas.

Mudança pontual na classe do container da coluna:

```diff
- className="flex-shrink-0 w-72 bg-card border rounded-xl ..."
+ className="flex-shrink-0 w-72 xl:flex-1 xl:w-auto xl:min-w-0 bg-card border rounded-xl ..."
```

## O que NÃO muda

- Nada de lógica/dados.
- Nenhuma alteração no card do lead, header da coluna ou drop zones.
- Comportamento mobile/tablet permanece igual.
