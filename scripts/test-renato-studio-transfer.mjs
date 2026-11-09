import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const db=new PGlite();
const source='00000000-0000-0000-0000-000000000001';
const target='00000000-0000-0000-0000-000000000002';
const reviewed=[
 ['a7b92a42-ab25-4909-9878-abbfd8fdab30','a24cdef8-6c00-4798-8ac7-11604255fa6d',26],
 ['a5bde9c6-a4e8-43f8-94f8-bc3a23e73c70','770d3188-e28c-43a8-b2dc-98272ff53d6b',30],
 ['eb00e80a-a478-48b3-9164-f7a3dea7d461','d98bb711-dad7-4f6a-8024-b4505f4a5b98',11],
 ['9e8c4052-4bbb-42d8-9d18-9d5763876f06','1c586473-a8ff-4f25-814b-5ad64519fd9f',17],
];
const repair=readFileSync('scripts/maintenance/renato-studio-transfer.sql','utf8');
async function rejected(reason){await assert.rejects(db.exec(repair),reason);await db.exec('ROLLBACK');}
try {
 await db.exec(`CREATE SCHEMA storage;
 CREATE TABLE profiles(user_id uuid,nome text);
 CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='${source}'::uuid AND $2='admin' $$;
 CREATE TABLE projects(id uuid PRIMARY KEY,user_id uuid,nome text);
 CREATE TABLE carousels(id uuid PRIMARY KEY,project_id uuid,user_id uuid,rendered_slides jsonb,rendered_meta jsonb);
 CREATE TABLE photos(id uuid DEFAULT gen_random_uuid(),project_id uuid,user_id uuid,storage_path text,image_url text);
 CREATE TABLE carousel_slides(id uuid DEFAULT gen_random_uuid(),carousel_id uuid,user_id uuid);
 CREATE TABLE slide_photos(id uuid DEFAULT gen_random_uuid(),slide_id uuid,photo_id uuid,user_id uuid);
 CREATE TABLE social_accounts(id uuid PRIMARY KEY,user_id uuid,username text);
 CREATE TABLE scheduled_posts(id uuid DEFAULT gen_random_uuid(),carousel_id uuid,social_account_id uuid,user_id uuid,status text,instagram_media_id text,published_at timestamptz);
 CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text,metadata jsonb);
 INSERT INTO profiles VALUES ('${source}','Synthetic source'),('${target}','Synthetic target');
 INSERT INTO social_accounts VALUES ('${target}','${target}','renatosoaresfoto');`);
 for(const [project,carousel,count] of reviewed){
  await db.query('INSERT INTO projects VALUES ($1,$2,$3)',[project,source,'Synthetic']);
  const rendered=`${target}/${carousel}/render.jpg`;
  await db.query('INSERT INTO carousels VALUES ($1,$2,$3,$4,$5)',[carousel,project,source,[rendered],[{path:rendered}]]);
  await db.query('INSERT INTO storage.objects(bucket_id,name,metadata) VALUES ($1,$2,$3)',['carousel-renders',rendered,{size:20}]);
  await db.query('INSERT INTO scheduled_posts(carousel_id,social_account_id,user_id,status,instagram_media_id,published_at) VALUES ($1,$2,$2,$3,$4,$5)',[carousel,target,'publicado',`synthetic-${carousel}`,'2026-11-01T10:00:00Z']);
  const slide=(await db.query('INSERT INTO carousel_slides(carousel_id,user_id) VALUES ($1,$2) RETURNING id',[carousel,source])).rows[0].id;
  for(let i=0;i<count;i++){
   const path=`${source}/${project}/${i}.jpg`;
   const photo=(await db.query('INSERT INTO photos(project_id,user_id,storage_path,image_url) VALUES ($1,$2,$3,$3) RETURNING id',[project,source,path])).rows[0].id;
   await db.query('INSERT INTO storage.objects(bucket_id,name,metadata) VALUES ($1,$2,$3)',['project-photos',path,{size:64}]);
   await db.query('INSERT INTO slide_photos(slide_id,photo_id,user_id) VALUES ($1,$2,$3)',[slide,photo,source]);
  }
 }
 for(let i=0;i<3;i++)await db.query('INSERT INTO projects VALUES (gen_random_uuid(),$1,$2)',[source,`Unrelated draft ${i}`]);
 const manifest=await db.exec(readFileSync('scripts/maintenance/renato-studio-copy-plan.sql','utf8'));
 assert.equal(manifest[0].rows.length,84);
 await rejected(/copied photos missing/);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM photos WHERE user_id=$1',[source])).rows[0].n,84);
 // Simulate successful Storage copies. Never contact real storage in this test.
 await db.query("INSERT INTO storage.objects(bucket_id,name,metadata) SELECT bucket_id,$1 || substring(name FROM 37),metadata FROM storage.objects WHERE bucket_id='project-photos'",[target]);
 const extra=(await db.query("INSERT INTO scheduled_posts(carousel_id,social_account_id,user_id,status) VALUES ($1,$2,$2,'publicado') RETURNING id",[reviewed[0][1],target])).rows[0].id;
 await rejected(/Expected four|counts changed/);
 await db.query('DELETE FROM scheduled_posts WHERE id=$1',[extra]);
 const badPath=`${target}/${reviewed[0][0]}/0.jpg`;
 await db.query("UPDATE storage.objects SET metadata='{}'::jsonb WHERE name=$1",[badPath]);
 await rejected(/byte lengths differ/);
 await db.query('UPDATE storage.objects SET metadata=$1 WHERE name=$2',[{size:64},badPath]);
 const postsBefore=(await db.query('SELECT * FROM scheduled_posts ORDER BY id')).rows;
 const renderedBefore=(await db.query('SELECT id,rendered_slides,rendered_meta FROM carousels ORDER BY id')).rows;
 await db.exec(repair);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM projects WHERE user_id=$1',[target])).rows[0].n,4);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM projects WHERE user_id=$1',[source])).rows[0].n,3);
 for(const table of ['photos','carousels','carousel_slides','slide_photos'])assert.equal((await db.query(`SELECT count(*)::int AS n FROM ${table} WHERE user_id<>$1`,[target])).rows[0].n,0);
 assert.deepEqual((await db.query('SELECT * FROM scheduled_posts ORDER BY id')).rows,postsBefore);
 assert.deepEqual((await db.query('SELECT id,rendered_slides,rendered_meta FROM carousels ORDER BY id')).rows,renderedBefore);
 assert.equal((await db.query("SELECT count(*)::int AS n FROM storage.objects WHERE bucket_id='project-photos' AND name LIKE $1",[`${source}/%`])).rows[0].n,84);
 await rejected(/already transferred/);
 console.log('PASS: exact 4-project/84-photo transfer, manifest, missing-copy/count/size guards, rollback, original retention, unrelated drafts, published post/render preservation and repeat-run refusal.');
}finally{await db.close();}
