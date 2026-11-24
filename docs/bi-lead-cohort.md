# Leads CRM comparáveis com a Meta no BI

## Critério de contagem

A função `bi-whatsapp-leads` continua autenticada por `CRM_API_KEY` e retorna os campos anteriores. A contagem agora usa:

- A mesma conta Meta e o mesmo período `from`/`to` enviados pelo BI.
- Somente registros com origem exatamente `Tráfego Pago`, marcador usado pelo trigger. Indicação, orgânico e outras origens manuais não entram.
- `data_contato` quando preenchida; caso contrário, `created_at`. A data de contato tem precedência: não é a união de ambas as datas.
- Cada ID de lead no máximo uma vez; excluídos ficam fora. Os dois caminhos são paginados, sem limite implícito de mil linhas.
- Datas de contato como dias de calendário. Para `created_at`, início inclusivo e fim exclusivo do dia seguinte em São Paulo (UTC-3).

Para evitar somar empresas diferentes, um ID Meta com mais de um cliente vinculado retorna `mapping_ambiguous: true`, `client_url: null` e contador de compatibilidade `leads: 0`. Esse zero não é uma medição: o BI atualizado apresenta “Vínculo ambíguo”, sem calcular CPL ou chegada para essa conta. Corrigir o cadastro antes de comparar.

A resposta confirma a semântica e o período no topo:

```json
{
  "accounts": { "123": { "in_crm": true, "whatsapp_connected": true, "leads": 9, "client_url": "https://crm.avanzodigital.com.br/admin/clientes/UUID" } },
  "date_basis": "contact_or_created",
  "period": { "from": "2026-11-17", "to": "2026-11-23" },
  "timezone": "America/Sao_Paulo"
}
```

O número 9 é apenas ilustrativo: não foi aplicada nenhuma correção fixa ao total do Flávio.

## Relatórios do CRM

- “Últimos 7 dias completos” agora termina ontem, como no BI.
- O relatório exclui leads apagados e interpreta campos DATE sem deslocar o calendário para o dia anterior.
- Para comparar com “Leads CRM” no BI, selecionar a mesma empresa e origem `Tráfego Pago`, sem filtros extras de interesse. O relatório geral continua podendo analisar outras origens quando o usuário assim selecionar.

## Implantação coordenada

1. No Lovable do CRM (`photo-lead-hub`), sincronizar a main, republicar `bi-whatsapp-leads` e publicar o frontend.
2. No Lovable do BI (`biavanzo`), sincronizar a main, republicar o proxy `crm-whatsapp-leads` e publicar o frontend.
3. Não há migração de banco ou nova chave. Preservar a chave existente em ambos os backends; não inseri-la no navegador ou em URLs.
4. O BI atualizado valida `date_basis`, `period` e `timezone`; enquanto a função do CRM ainda for antiga, o BI deve sinalizar indisponibilidade em vez de mostrar uma contagem de outra regra.
5. Atualizar as duas telas, selecionar o mesmo intervalo explícito e origem `Tráfego Pago` no CRM e comparar os IDs dos leads se houver divergência. A validação real do Flávio ainda depende da sessão autenticada no Cloud.

## Testes

Foram exercitados os dois caminhos de datas, prioridade de contato, exclusão de indicação manual/orgânico/lixeira/outra empresa, limites do dia de São Paulo, paginação acima de mil, ambiguidade de conta, autenticação e rejeição de períodos inválidos. Um cenário fictício com doze criações e três contatos fora do intervalo retorna nove, demonstrando a regra, sem representar os dados reais do cliente.
