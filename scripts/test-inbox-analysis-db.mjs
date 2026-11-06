import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE inbox_conversations (id uuid PRIMARY KEY, user_id uuid, contact_name text, contact_number text, is_group boolean DEFAULT false);
    CREATE TABLE inbox_messages (id uuid PRIMARY KEY, user_id uuid, conversation_id uuid, body text, direction text, type text DEFAULT 'text', timestamp timestamptz, created_at timestamptz, is_note boolean DEFAULT false);
    GRANT USAGE ON SCHEMA public TO service_role, authenticated, anon;
    GRANT SELECT ON inbox_conversations, inbox_messages TO service_role;
  `);
  const sql = readFileSync('drizzle/migrations/0011_restore_inbox_analysis_sample.sql', 'utf8');
  assert.equal(sql, readFileSync('supabase/migrations/20261106120000_restore_inbox_analysis_sample.sql', 'utf8'));
  await db.exec(sql);
  await db.exec(sql);
  const owner = '00000000-0000-0000-0000-000000000001';
  const other = '00000000-0000-0000-0000-000000000002';
  const uid = n => `10000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
  for (let i = 1; i <= 25; i++) {
    const user = i === 24 ? other : owner;
    await db.query('INSERT INTO inbox_conversations VALUES ($1,$2,$3,$4,$5)', [uid(i), user, `Contato ${i}`, '5500000000000', i === 25]);
    const date = `2026-10-${String(i).padStart(2,'0')}T10:00:00Z`;
    const text = i === 23 ? 'Outra mensagem' : 'Olá!  Vi\to anúncio\n de Fotografia.';
    await db.query('INSERT INTO inbox_messages (id,user_id,conversation_id,body,direction,timestamp,created_at) VALUES ($1,$2,$3,$4,$5,$6,$6)', [uid(i+100),user,uid(i),text,'inbound',date]);
    await db.query('INSERT INTO inbox_messages (id,user_id,conversation_id,body,direction,timestamp,created_at) VALUES ($1,$2,$3,$4,$5,$6,$6)', [uid(i+200),user,uid(i),'Olá! Vi o anúncio de Fotografia.','inbound',`2026-11-01T10:00:00Z`]);
  }
  // Notes must not override the first received message.
  await db.query('INSERT INTO inbox_messages (id,user_id,conversation_id,body,direction,timestamp,created_at,is_note) VALUES ($1,$2,$3,$4,$5,$6,$6,true)', [uid(999),owner,uid(22),'Nota interna','inbound','2026-01-01T10:00:00Z']);
  await db.exec('SET ROLE service_role');
  const result = await db.query('SELECT get_inbox_analysis_sample($1,$2) AS sample', [owner, '  OLÁ! Vi o anúncio de Fotografia.  ']);
  const sample = result.rows[0].sample;
  assert.equal(sample.length, 20);
  assert.equal(sample[0].contact_name, 'Contato 22');
  assert.equal(sample[19].contact_name, 'Contato 3');
  assert.equal(sample[0].messages.length, 2);
  assert(!sample.some(c => ['Contato 23','Contato 24','Contato 25'].includes(c.contact_name)));
  const empty = await db.query('SELECT get_inbox_analysis_sample($1,$2) AS sample', [owner,'Texto inexistente']);
  assert.deepEqual(empty.rows[0].sample, []);
  await db.exec('RESET ROLE; SET ROLE authenticated');
  await assert.rejects(db.query('SELECT get_inbox_analysis_sample($1,$2)', [owner,'Texto']), e => e.code === '42501');
  await db.exec('RESET ROLE; SET ROLE anon');
  await assert.rejects(db.query('SELECT get_inbox_analysis_sample($1,$2)', [owner,'Texto']), e => e.code === '42501');
  console.log('PASS: Inbox RPC installation/reapplication, 20 most recent first messages, whitespace/case normalization, full histories, notes/groups/tenant exclusions, empty sample and service-role-only access.');
} finally {
  await db.close();
}
