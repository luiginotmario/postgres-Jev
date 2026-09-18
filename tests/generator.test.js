import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {describeDataset,scoreDemo} from '../server/datasets.js';
const run=promisify(execFile);
for(const type of ['people','countries','numbers'])test(`Java generates valid ${type} records and searchable examples`,async()=>{
 const {stdout}=await run(process.env.JAVA_BIN||'java',['generator/GenerateDatabase.java',type],{timeout:15000});
 const data=JSON.parse(stdout),spec=describeDataset(type);assert.equal(data.type,type);assert.ok(data.rows.length>=18);assert.equal(new Set(data.rows.map(r=>r.id)).size,data.rows.length);
 for(const row of data.rows)for(const c of spec.columns)assert.ok(c in row,`missing ${c}`);
 for(const q of spec.examples){const result=scoreDemo(type,q,data.rows);assert.equal(result.length,data.rows.length);assert.ok(result.every(r=>r.probability>=0&&r.probability<=1));}
 if(type==='people')assert.equal(new Set(data.rows.map(r=>r.name)).size,data.rows.length);
 if(type==='numbers')assert.ok(data.rows.every(r=>r.battery_pct>=1&&r.battery_pct<=100));
 if(type==='countries')assert.equal(new Set(data.rows.map(r=>r.country)).size,data.rows.length);
});
