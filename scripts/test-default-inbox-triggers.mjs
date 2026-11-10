// Local, disposable PostgreSQL only. No network, real users or WhatsApp requests.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
const renato='00000000-0000-0000-0000-000000000001';
const other='00000000-0000-0000-0000-000000000002';
const fresh='00000000-0000-0000-0000-000000000003';
let checks=0;
const check=(value,expected)=>{assert.deepEqual(value,expected);checks++;};
const maintenance=readFileSync('maintenance/renato-add-google-inbox-trigger.sql','utf8');
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
 CREATE TABLE inbox_triggers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,keyword text NOT NULL,active boolean DEFAULT true,created_at timestamptz DEFAULT now());
 INSERT INTO auth.users VALUES('${renato}','renatosoaresvenda@hotmail.com'),('${other}','other@example.test');
 INSERT INTO inbox_triggers(user_id,keyword,active) VALUES('${renato}','Minha frase personalizada',true),('${renato}','vim pelo Instagram',false),('${other}','Somente minha conta',true);`);
 const original=(await db.query('SELECT * FROM inbox_triggers ORDER BY id')).rows;
 await db.exec(readFileSync('supabase/migrations/20261110140000_default_inbox_triggers.sql','utf8'));
 check((await db.query('SELECT * FROM inbox_triggers ORDER BY id')).rows,original);
 await db.query('INSERT INTO auth.users VALUES($1,$2)',[fresh,'new@example.test']);
 const rows=(await db.query('SELECT keyword,active FROM inbox_triggers WHERE user_id=$1 ORDER BY keyword',[fresh])).rows;
 check(rows.length,4);check(rows.every(r=>r.active),true);
 check(rows.map(r=>r.keyword).sort(),['vim pelo anúncio','informações sobre','vim pelo Instagram','vim pelo Google'].sort());
 // Execute the real webhook matching expression, without invoking the webhook.
 const source=readFileSync('supabase/functions/evolution-webhook/index.ts','utf8');
 const expression=source.split('\n').find(line=>line.includes('const hasTrigger = triggers?.some'));
 assert.ok(expression);const matches=new Function('triggers','content',`${expression}\nreturn hasTrigger;`);
 for(const message of ['Olá! Vim pelo anúncio e quero saber mais','Quero informações sobre o ensaio','Olá, vim pelo Instagram, gostaria de mais informações','Olá, vim pelo Google, gostaria de mais informações','OLÁ! VIM PELO GOOGLE E GOSTARIA DE MAIS INFORMAÇÕES']) check(matches(rows,message),true);
 check(matches(rows,'Bom dia'),false);
 await db.query("DELETE FROM inbox_triggers WHERE user_id=$1 AND keyword='vim pelo Google'",[fresh]);
 await db.query('UPDATE auth.users SET email=$1 WHERE id=$2',['edited@example.test',fresh]);
 check((await db.query('SELECT * FROM inbox_triggers WHERE user_id=$1',[fresh])).rows.length,3);
 for(const role of ['anon','authenticated']) {
  await db.exec(`SET ROLE ${role}`);
  check((await db.query("SELECT has_function_privilege(current_user, 'public.initialize_default_inbox_triggers()', 'EXECUTE') AS allowed")).rows[0].allowed,false);
  await db.exec('RESET ROLE');
 }
 await db.exec(maintenance);
 check((await db.query("SELECT count(*)::int AS n FROM inbox_triggers WHERE user_id=$1 AND keyword='vim pelo Google'",[renato])).rows[0].n,1);
 await db.exec(maintenance);
 check((await db.query('SELECT count(*)::int AS n FROM inbox_triggers WHERE user_id=$1',[renato])).rows[0].n,3);
 for(const row of original) check((await db.query('SELECT * FROM inbox_triggers WHERE id=$1',[row.id])).rows[0],row);
 await db.query("UPDATE inbox_triggers SET keyword='Olá! Vim pelo Google',active=false WHERE user_id=$1 AND keyword='vim pelo Google'",[renato]);
 await db.exec(maintenance);
 check((await db.query('SELECT count(*)::int AS n FROM inbox_triggers WHERE user_id=$1',[renato])).rows[0].n,3);
 check((await db.query("SELECT active FROM inbox_triggers WHERE user_id=$1 AND keyword='Olá! Vim pelo Google'",[renato])).rows[0].active,false);
 await db.query('DELETE FROM auth.users WHERE id=$1',[fresh]);
 check((await db.query('SELECT * FROM inbox_triggers WHERE user_id=$1',[fresh])).rows.length,0);
 console.log(`${checks} default Inbox trigger checks passed.`);
} finally {await db.close();}
