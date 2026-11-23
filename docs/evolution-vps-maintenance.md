# Manutenção do servidor do WhatsApp (Evolution na VPS)

O CRM guarda todo o histórico de conversas no próprio banco. O banco da Evolution só precisa
das mensagens recentes (o "Sincronizar" do Inbox usa os últimos dias). Manter centenas de milhares
de mensagens lá deixa cada mensagem nova mais lenta de processar.

## 1. Limpeza única (agora)

No terminal da VPS, descubra o container do banco da Evolution (`docker ps | grep -i postgres`)
e rode, trocando `CONTAINER`, `USUARIO` e `BANCO` pelos valores do seu `.env`:

```bash
# Backup antes de tudo
docker exec CONTAINER pg_dump -U USUARIO -d BANCO -t '"Message"' | gzip > /root/evolution-message-$(date +%F).sql.gz

# Apaga mensagens com mais de 30 dias, em lotes de 20 mil (repete até não sobrar nada)
docker exec CONTAINER psql -U USUARIO -d BANCO -c '
DO $$
DECLARE n int;
BEGIN
  LOOP
    DELETE FROM "Message" WHERE id IN (
      SELECT id FROM "Message"
      WHERE "messageTimestamp" < extract(epoch FROM now() - interval '\''30 days'\'')::int
      LIMIT 20000);
    GET DIAGNOSTICS n = ROW_COUNT;
    EXIT WHEN n = 0;
    COMMIT;
  END LOOP;
END $$;'

docker exec CONTAINER psql -U USUARIO -d BANCO -c 'VACUUM ANALYZE "Message";'
```

## 2. Limpeza automática (toda madrugada, 04:00)

```bash
crontab -e
# adicione a linha abaixo (uma linha só):
0 4 * * * docker exec CONTAINER psql -U USUARIO -d BANCO -c "DELETE FROM \"Message\" WHERE \"messageTimestamp\" < extract(epoch FROM now() - interval '30 days')::int;" && docker exec CONTAINER psql -U USUARIO -d BANCO -c 'VACUUM ANALYZE "Message";'
```

O nome do container muda a cada deploy no Easypanel? Use o nome do serviço
(`docker ps --format '{{.Names}}' | grep -i evolution`) em vez do ID.

## 3. Reconexão limpa de uma conta marcada "Reconectar QR"

1. No celular do cliente: WhatsApp → Aparelhos conectados → remover todos os aparelhos antigos.
2. No CRM (WhatsApp do cliente): **Desconectar** (não Excluir).
3. **Conectar** e ler o QR Code novo.

O vigia automático (Admin → Configurações → Vigia do WhatsApp) mostra quais contas precisam disso.

## Causa raiz dos atrasos (23/11/2026)

Evolution 2.3.7 usa Baileys 7.0.0-rc.9, que não confirma o novo aviso de status/stories que o WhatsApp
passou a enviar para algumas contas. O WhatsApp derruba a conexão 50 min depois e, em cada reconexão,
só libera algumas mensagens antigas antes de travar de novo — a conta fica "open", sem receber, e o atraso cresce.
Evidência no CRM: conexões do Igor reabrem a cada 50 min e só 1–4 mensagens de ~30 h antes chegam ~30 s depois.
Correção oficial: imagem `evoapicloud/evolution-api:v2.3.8` (patch no Baileys; mensagens retidas são entregues
sem novo QR). Referências: Baileys #2858, Evolution #2778 e PR #2804.
Confirmação nos logs: `docker logs --since 3h <container> 2>&1 | grep -i "stream errored" | tail -20`
(procurar `class":"status"`).
