// Isolated PostgreSQL fixture only. Does not connect to production.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
const a='00000000-0000-0000-0000-000000000001', b='00000000-0000-0000-0000-000000000002', admin='00000000-0000-0000-0000-000000000003';
let checks=0;
const check=(value,expected)=>{assert.deepEqual(value,expected);checks++;};
const denied=async(fn,code='42501')=>{await assert.rejects(fn,e=>e.code===code);checks++;};
const actor=async(uid,role='authenticated')=>{await db.exec('RESET ROLE');await db.query("SELECT set_config('test.uid',$1,false)",[uid]);await db.exec(`SET ROLE ${role}`);};
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
 CREATE TABLE auth.users(id uuid primary key);
 INSERT INTO auth.users VALUES('${a}'),('${b}'),('${admin}');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE FUNCTION public.has_role(uid uuid,role_name text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT uid='${admin}'::uuid AND role_name='admin' $$;
 CREATE TABLE profiles(user_id uuid primary key,bloqueado boolean);
 INSERT INTO profiles VALUES('${a}',false),('${b}',false);
 CREATE TABLE crm_account_access(user_id uuid primary key,mode text,trial_ends_at timestamptz,valid_until timestamptz);
 INSERT INTO crm_account_access VALUES('${a}','legacy',null,null),('${b}','trial',now()+interval '60 days',null);
 CREATE FUNCTION public.has_active_crm_access(uid uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT NOT EXISTS(SELECT 1 FROM profiles WHERE user_id=uid AND bloqueado) AND EXISTS(SELECT 1 FROM crm_account_access WHERE user_id=uid AND (mode='legacy' OR (mode='trial' AND trial_ends_at>now()) OR (mode='manual' AND valid_until>now()))) $$;`);
 await db.exec(readFileSync('supabase/migrations/20261110120000_whatsapp_bio_links.sql','utf8'));
 await actor(a);
 await db.query('INSERT INTO whatsapp_bio_links VALUES($1,$2,$3,$4)',[a,'cliente-a','5561999999999','Olá! Vim pelo Instagram e gostaria de mais informações']); checks++;
 await denied(()=>db.query('INSERT INTO whatsapp_bio_links VALUES($1,$2,$3,$4)',[b,'forged','5561999999999','test']));
 await actor(b);
 check((await db.query('SELECT * FROM whatsapp_bio_links')).rows.length,0);
 check((await db.query("UPDATE whatsapp_bio_links SET message='foreign' WHERE user_id=$1 RETURNING *",[a])).rows.length,0);
 await denied(()=>db.query('INSERT INTO whatsapp_bio_links VALUES($1,$2,$3,$4)',[b,'cliente-a','5561999999999','test']),'23505');
 await db.query('INSERT INTO whatsapp_bio_links VALUES($1,$2,$3,$4)',[b,'cliente-b','5561888888888','Oi']);checks++;
 await actor(admin);
 check((await db.query('SELECT * FROM whatsapp_bio_links')).rows.length,2);
 await db.query("UPDATE whatsapp_bio_links SET message='Admin edit' WHERE user_id=$1",[b]);checks++;
 await actor('', 'anon');
 await denied(()=>db.query('SELECT * FROM whatsapp_bio_links'));
 const resolved=(await db.query("SELECT * FROM resolve_whatsapp_bio_link('cliente-a')")).rows;
 check(resolved.length,1);check(Object.keys(resolved[0]).sort(),['message','phone']);
 check((await db.query("SELECT * FROM resolve_whatsapp_bio_link('missing')")).rows.length,0);
 check((await db.query("SELECT * FROM resolve_whatsapp_bio_link('%')")).rows.length,0);
 await db.exec('RESET ROLE');await db.query('UPDATE profiles SET bloqueado=true WHERE user_id=$1',[a]);
 await actor('', 'anon');check((await db.query("SELECT * FROM resolve_whatsapp_bio_link('cliente-a')")).rows.length,0);
 await db.exec('RESET ROLE');await db.query("UPDATE crm_account_access SET trial_ends_at=now()-interval '1 day' WHERE user_id=$1",[b]);
 await actor('', 'anon');check((await db.query("SELECT * FROM resolve_whatsapp_bio_link('cliente-b')")).rows.length,0);
 await actor(b);check((await db.query('SELECT * FROM whatsapp_bio_links')).rows.length,0);
 check((await db.query("UPDATE whatsapp_bio_links SET user_id=$1 WHERE user_id=$2 RETURNING *",[a,b])).rows.length,0);
} catch (error) {
 // An invisible row UPDATE is permitted with zero affected rows; assert separately below.
 if(error.code==='ERR_ASSERTION') throw error;
 throw error;
} finally {await db.close();}
console.log(`${checks} WhatsApp bio-link security checks passed.`);
