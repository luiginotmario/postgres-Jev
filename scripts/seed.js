import pg from 'pg';
import {existsSync} from 'node:fs';
import {people} from '../server/data.js';
if(existsSync('.env'))process.loadEnvFile('.env');
if(!process.env.DATABASE_URL)throw new Error('Set DATABASE_URL to the development database you intend to seed.');
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try{
 await client.query('BEGIN');
 // Do not alter or overwrite any existing people table.
 await client.query('CREATE TABLE public.people (id integer PRIMARY KEY, name text, job_title text, company text, city text, country text, department text, work_mode text, skills text, description text)');
 for(const row of people)await client.query('INSERT INTO public.people VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',Object.values(row));
 await client.query('COMMIT');console.log('Created people with 129 fictional records.');
}catch(e){await client.query('ROLLBACK');throw e;}finally{await client.end();}
