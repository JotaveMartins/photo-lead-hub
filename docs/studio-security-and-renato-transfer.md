# Isolamento do Studio e recuperação dos quatro projetos do Renato

## Falha confirmada no Cloud

Uma conta comum conseguiu inserir carrossel com seu próprio `user_id` dentro de
um projeto do Renato e agendar contra conexão Instagram dele. A regra antiga
verificava o dono da linha, mas não o dono das referências. Os registros sintéticos
foram removidos pelo Lovable e nenhuma publicação foi realizada nesse teste.

A migração `drizzle/migrations/0015_studio_relationship_isolation.sql` acrescenta
limites RLS restritivos a projects, photos, carousels, carousel_slides, slide_photos
e scheduled_posts. Para usuário comum, a linha e seus pais precisam ser da mesma
conta; o vínculo de foto também precisa ser do mesmo projeto do slide. O agendamento
confere carrossel e conexão Instagram. Os limites se aplicam a leitura, inserção,
atualização e exclusão, mesmo se outra regra permissiva antiga estiver aberta.

Administradores conservam suporte/reparo entre contas, e service-role conserva
operações do backend. Uma conexão removida pode deixar `social_account_id = null`:
o histórico continua acessível ao dono quando o carrossel é dele. Não se reescrevem
registros na migração. Não se trocam tokens ou privilégios de usuários comuns.

## Aplicação da segurança

1. Sincronizar main e aplicar a 0015 pelo histórico Drizzle do Lovable. Para CLI
   Supabase, a cópia equivalente é
   `supabase/migrations/20261109160000_studio_relationship_isolation.sql`.
2. Repetir os testes diretos no banco com contas sintéticas A e B: A não insere
   foto/carrossel/slide em pai de B, não agenda no Instagram de B nem altera uma
   relação própria para usar IDs de B. Testar o agendamento legítimo de A e a
   criação administrativa para uma conta sintética.
3. Confirmar funcionamento das regras após excluir os dados sintéticos. Não testar
   exploração usando projetos/conexões reais nem publicar no Instagram para testar.

## Escopo fechado de recuperação

Somente os quatro pares projeto/carrossel identificados e revisados:

| Projeto | ID do projeto | Fotos |
| --- | --- | --- |
| Jucyette e Lucas | a7b92a42-ab25-4909-9878-abbfd8fdab30 | 26 |
| Virginia & Rafael | a5bde9c6-a4e8-43f8-94f8-bc3a23e73c70 | 30 |
| Dara & Guilherme | eb00e80a-a478-48b3-9164-f7a3dea7d461 | 11 |
| Ludy & Renan | 9e8c4052-4bbb-42d8-9d18-9d5763876f06 | 17 |

O destino é derivado dos posts existentes e da conexão `renatosoaresfoto`, exigindo
que post e conexão sejam do mesmo usuário existente. Não inferir destino somente
pelo username: a conexão órfã mencionada pelo Lovable não entra na derivação.
Exigir também que os quatro registros apontem ao mesmo destino e à mesma origem.
Os três rascunhos sem publicações ficam excluídos, assim como outros projetos.

## Cópia e transferência no Cloud

O procedimento é manutenção manual, não uma migração automática do produto.
Executar com acesso administrativo ao banco e Storage do Cloud:

1. Executar `scripts/maintenance/renato-studio-copy-plan.sql`. O manifesto deve
   ter exatamente 84 fotos dos quatro projetos, com origem Avanzo e destino na
   conta Renato já confirmada. Conferir ambos os UUIDs contra os perfis reais.
   Se divergirem, parar. Guardar snapshot das linhas/manifesto para recuperação,
   sem expor credenciais ou adicionar dados reais ao repositório.
2. Copiar os 84 objetos do bucket `project-photos` da origem para o destino do
   manifesto usando a API do Storage, por exemplo `storage.from('project-photos')
   .copy(source_path, destination_path)`. Não inserir/copiar linhas diretamente em
   `storage.objects`: isso não copia os bytes do arquivo. Não usar upsert destrutivo.
3. Conferir sucesso de cada cópia, bytes e conteúdo (checksum dos originais/cópias,
   sem registrar conteúdo dos arquivos). Se o destino já existir, reutilizar somente
   após validar conteúdo idêntico; caso contrário parar. Preservar todos os originais.
4. Somente após as cópias e a validação, executar
   `scripts/maintenance/renato-studio-transfer.sql`. O script trava as tabelas
   durante a transação e recusa contagens, donos, referências, pastas ou cópias
   inesperados. Confere tamanho de bytes positivo/igual nos metadados do Storage;
   isso complementa, sem substituir, a validação de conteúdo do passo anterior.
5. Se qualquer verificação falhar, fazer ROLLBACK e revisar antes de tentar de novo.
   Nenhuma atualização parcial deve ser mantida. Se já transferido, o script recusa
   nova execução, em vez de duplicar cópias ou associar novamente.
6. Entrar diretamente como Renato e conferir quatro projetos, 84 fotos abrindo,
   carrosséis e histórico. Conferir que os três rascunhos da Avanzo permaneceram
   nela. O script não atualiza scheduled_posts ou social_accounts, não altera os
   renders já na pasta Renato e não chama a Meta. Não republique nada.

A alteração de proprietário acontece em projects, photos, carousels,
carousel_slides e slide_photos, com atualização de storage_path/image_url das
fotos. Os arquivos originais permanecem guardados; excluir originais não faz
parte deste procedimento. Não alterar a conexão órfã durante essa tarefa.

## Verificação local

`node scripts/test-studio-client-inserts.mjs`: 36 verificações no PostgreSQL em
memória com contas fictícias, cobrindo ataques diretos, atualizações, políticas
legadas permissivas, suporte administrativo e service-role.

`node scripts/test-renato-studio-transfer.mjs`: simula os mesmos quatro IDs com
fotos fictícias; confere manifesto/84 fotos, recusa cópia ausente, contagem alterada
e tamanho divergente, rollback, preservação dos três rascunhos, arquivos originais,
posts/renders e recusa de segunda transferência.

Nenhum dado real foi lido ou alterado por esses testes. A implantação, cópia e
recuperação reais precisam ser executadas e conferidas no Lovable Cloud.
