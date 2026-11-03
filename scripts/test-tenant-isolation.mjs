// Executes only against a fresh in-memory PostgreSQL database. No network,
// production connection strings, real accounts, files or credentials are used.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
const A = '00000000-0000-0000-0000-000000000001';
const B = '00000000-0000-0000-0000-000000000002';
const ADMIN = '00000000-0000-0000-0000-000000000003';
const leadA = '10000000-0000-0000-0000-000000000001';
const leadB = '10000000-0000-0000-0000-000000000002';
let assertions = 0;
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); assertions++; };
const denied = async (fn) => { await assert.rejects(fn, (error) => error.code === '42501'); assertions++; };
const actor = async (uid, role = 'authenticated') => {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('test.uid', $1, false)", [uid]);
  await db.exec(`SET ROLE ${role}`);
};
const root = () => db.exec('RESET ROLE');

try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    CREATE TABLE public.fixture_access(user_id uuid primary key, enabled boolean);
    INSERT INTO fixture_access VALUES ('${A}',true),('${B}',true),('${ADMIN}',true);
    CREATE FUNCTION public.has_role(_user_id uuid, _role text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
      AS $$ SELECT _user_id = '${ADMIN}'::uuid AND _role = 'admin' $$;
    CREATE FUNCTION public.has_active_crm_access(uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
      AS $$ SELECT coalesce((SELECT enabled FROM fixture_access WHERE user_id=uid),false) $$;
    CREATE TABLE public.leads(id uuid primary key, user_id uuid);
    INSERT INTO leads VALUES ('${leadA}','${A}'),('${leadB}','${B}');
    ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
    CREATE POLICY leads_owner ON leads FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
    GRANT SELECT ON leads TO authenticated, anon;
    GRANT ALL ON leads TO service_role;
    CREATE TABLE public.messages(id uuid primary key default gen_random_uuid(),user_id uuid,lead_id uuid references leads(id),content text);
    CREATE TABLE storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text,metadata jsonb);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT ALL ON storage.objects TO anon, authenticated, service_role;
    CREATE POLICY "inbox-media public read" ON storage.objects FOR SELECT USING(bucket_id='inbox-media');
    CREATE POLICY "inbox-media service update" ON storage.objects FOR UPDATE USING(bucket_id='inbox-media') WITH CHECK(bucket_id='inbox-media');
    CREATE POLICY fixture_storage_own ON storage.objects FOR ALL TO authenticated USING(owner_id=auth.uid()::text) WITH CHECK(owner_id=auth.uid()::text);
    CREATE POLICY fixture_storage_insert ON storage.objects FOR INSERT WITH CHECK(bucket_id='inbox-media');
    CREATE POLICY fixture_storage_delete ON storage.objects FOR DELETE USING(bucket_id='inbox-media');
    INSERT INTO storage.objects(bucket_id,name,owner_id,metadata) VALUES
      ('inbox-media','${A}/received.jpg',NULL,'{"version":1}'),
      ('inbox-media','${B}/received.jpg',NULL,'{"version":1}'),
      ('ai-files','chat/own.pdf','${A}','{"version":1}');
  `);
  for (const table of ['ai_config','ai_files','whatsapp_instances']) {
    await db.exec(`CREATE TABLE public.${table}(id uuid primary key default gen_random_uuid(),user_id uuid default auth.uid(),value text);
      ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON public.${table} TO anon, authenticated, service_role;
      CREATE POLICY fixture_own ON public.${table} FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
      CREATE POLICY fixture_admin ON public.${table} FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
      CREATE POLICY crm_active_access ON public.${table} AS RESTRICTIVE FOR ALL TO authenticated USING(public.has_active_crm_access(auth.uid())) WITH CHECK(public.has_active_crm_access(auth.uid()));
      INSERT INTO public.${table}(user_id,value) VALUES('${A}','A'),('${B}','B'),(NULL,'orphan');`);
  }
  await db.exec(`
    CREATE POLICY "Users can view AI config" ON ai_config FOR SELECT USING(true);
    CREATE POLICY "Users can insert AI config" ON ai_config FOR INSERT WITH CHECK(true);
    CREATE POLICY "Users can update AI config" ON ai_config FOR UPDATE USING(true);
    CREATE POLICY "Users can view AI files" ON ai_files FOR SELECT USING(true);
    CREATE POLICY "Users can insert AI files" ON ai_files FOR INSERT WITH CHECK(true);
    CREATE POLICY "Users can delete AI files" ON ai_files FOR DELETE USING(true);
    CREATE POLICY "Users can view their own WhatsApp instances" ON whatsapp_instances FOR SELECT USING(true);
    CREATE POLICY "Users can insert WhatsApp instances" ON whatsapp_instances FOR INSERT WITH CHECK(true);
    CREATE POLICY "Users can update WhatsApp instances" ON whatsapp_instances FOR UPDATE USING(true);
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    GRANT ALL ON messages TO anon, authenticated, service_role;
    CREATE POLICY fixture_message_owner ON messages FOR SELECT TO authenticated USING(user_id=auth.uid());
    CREATE POLICY fixture_message_insert ON messages FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
    CREATE POLICY crm_active_access ON messages AS RESTRICTIVE FOR ALL TO authenticated USING(public.has_active_crm_access(auth.uid())) WITH CHECK(public.has_active_crm_access(auth.uid()));
    CREATE POLICY "Users can view messages for their leads" ON messages FOR SELECT USING(true);
    CREATE POLICY "Users can insert messages" ON messages FOR INSERT WITH CHECK(true);
    INSERT INTO messages(user_id,lead_id,content) VALUES('${A}','${leadA}','A'),('${B}','${leadB}','B'),('${A}','${leadB}','mismatched legacy row');
  `);
  await actor(A);
  check((await db.query('SELECT value FROM ai_config')).rows.length,3,'reproduce exposed AI config');
  check((await db.query('SELECT * FROM messages')).rows.length,3,'reproduce cross-tenant messages');
  check((await db.query("UPDATE storage.objects SET metadata='{\"version\":0}' WHERE bucket_id='inbox-media' AND name=$1 RETURNING id",[`${B}/received.jpg`])).rows.length,1,'reproduce media overwrite');
  await root();
  const sql = readFileSync(new URL('../supabase/migrations/20261103210000_fix_reported_tenant_isolation.sql', import.meta.url),'utf8');
  await db.exec(sql);
  // Reapplying is safe and preserves existing data/permissions.
  await db.exec(sql);

  for (const table of ['ai_config','ai_files','whatsapp_instances']) {
    await actor(A);
    check((await db.query(`SELECT value FROM public.${table}`)).rows.map(r=>r.value),['A'],`${table}: only own record`);
    await denied(()=>db.query(`INSERT INTO public.${table}(user_id,value) VALUES($1,'foreign')`,[B]));
    await denied(()=>db.query(`INSERT INTO public.${table}(user_id,value) VALUES(NULL,'ownerless')`));
    await db.query(`INSERT INTO public.${table}(value) VALUES('own-new')`);
    check((await db.query(`UPDATE public.${table} SET value='foreign-update' WHERE user_id=$1 RETURNING id`,[B])).rows.length,0,`${table}: foreign update denied`);
    await denied(()=>db.query(`UPDATE public.${table} SET user_id=$1 WHERE value='own-new'`,[B]));
    check((await db.query(`UPDATE public.${table} SET value='own-edited' WHERE value='own-new' RETURNING id`)).rows.length,1,`${table}: own update preserved`);
    check((await db.query(`DELETE FROM public.${table} WHERE user_id=$1 RETURNING id`,[B])).rows.length,0,`${table}: foreign delete denied`);
    check((await db.query(`DELETE FROM public.${table} WHERE value='own-edited' RETURNING id`)).rows.length,1,`${table}: existing own delete preserved`);
    await actor('', 'anon');
    check((await db.query(`SELECT * FROM public.${table}`)).rows.length,0,`${table}: anonymous read denied`);
    await denied(()=>db.query(`INSERT INTO public.${table}(user_id,value) VALUES($1,'anonymous')`,[A]));
    await actor(ADMIN);
    check((await db.query(`SELECT * FROM public.${table}`)).rows.length,3,`${table}: admin sees accounts and orphan`);
    check((await db.query(`UPDATE public.${table} SET value='B' WHERE user_id=$1 RETURNING id`,[B])).rows.length,1,`${table}: admin management preserved`);
    await root();
    await db.exec(`CREATE POLICY fixture_unknown_permissive ON public.${table} FOR ALL USING(true) WITH CHECK(true)`);
    await actor(A);
    check((await db.query(`SELECT * FROM public.${table}`)).rows.length,1,`${table}: restrictive boundary survives other permissive rules`);
  }

  await actor(A);
  check((await db.query('SELECT content FROM messages')).rows.map(r=>r.content),['A'],'messages: validate both tenant and lead ownership');
  await denied(()=>db.query('INSERT INTO messages(user_id,lead_id,content) VALUES($1,$2,$3)',[A,leadB,'foreign lead']));
  await denied(()=>db.query('INSERT INTO messages(user_id,lead_id,content) VALUES($1,$2,$3)',[B,leadA,'forged owner']));
  await db.query('INSERT INTO messages(user_id,lead_id,content) VALUES($1,$2,$3)',[A,leadA,'legitimate']);
  await actor(ADMIN);
  await db.query('INSERT INTO messages(user_id,lead_id,content) VALUES($1,$2,$3)',[B,leadB,'admin support']);
  check((await db.query('SELECT * FROM messages')).rows.length,5,'messages: admin read/insert preserved');
  await actor('', 'anon');
  check((await db.query('SELECT * FROM messages')).rows.length,0,'messages: anonymous read denied');
  await denied(()=>db.query('INSERT INTO messages(user_id,lead_id,content) VALUES($1,$2,$3)',[A,leadA,'anonymous']));

  for (const [uid, role] of [[A,'authenticated'],[B,'authenticated'],[ADMIN,'authenticated'],['','anon']]) {
    await actor(uid,role);
    check((await db.query("UPDATE storage.objects SET metadata='{}' WHERE bucket_id='inbox-media' RETURNING id")).rows.length,0,'inbox-media: client overwrite denied');
    check((await db.query("DELETE FROM storage.objects WHERE bucket_id='inbox-media' RETURNING id")).rows.length,0,'inbox-media: client delete denied');
    await denied(()=>db.query("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('inbox-media',$1,$2)",[`${uid}/attempt.jpg`,uid||null]));
    check((await db.query("SELECT * FROM storage.objects WHERE bucket_id='inbox-media'")).rows.length,2,'inbox-media: existing public read preserved');
  }
  await actor(A);
  check((await db.query("UPDATE storage.objects SET metadata='{\"version\":2}' WHERE bucket_id='ai-files' RETURNING id")).rows.length,1,'other buckets: own update preserved');
  await denied(()=>db.query("UPDATE storage.objects SET bucket_id='inbox-media' WHERE bucket_id='ai-files'"));
  await actor('', 'service_role');
  check((await db.query("UPDATE storage.objects SET metadata='{\"version\":3}' WHERE bucket_id='inbox-media' RETURNING id")).rows.length,2,'service-role media overwrite preserved');
  await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('inbox-media','service/upload.jpg')");
  await db.query("INSERT INTO ai_config(user_id,value) VALUES($1,'service insert')",[B]);
  await root();
  await db.query('UPDATE fixture_access SET enabled=false WHERE user_id=$1',[A]);
  await actor(A);
  check((await db.query('SELECT * FROM ai_config')).rows.length,0,'existing trial-expiry restriction remains enforced');
  await denied(()=>db.query("INSERT INTO ai_config(user_id,value) VALUES($1,'expired insert')",[A]));
  await actor(ADMIN);
  check((await db.query('SELECT * FROM ai_config')).rows.length,4,'no configuration rows removed');
  console.log(`PASS: ${assertions} PostgreSQL checks; tenant isolation, forged-owner denial, anonymous denial, admin support, service-role ingestion, media integrity, reapplication and trial restrictions.`);
} finally {
  await db.close();
}
