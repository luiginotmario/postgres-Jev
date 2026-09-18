import test from 'node:test';
import assert from 'node:assert/strict';
import {createJudge,parseProbability} from '../server/jev.js';
import {people,demoScores,examples} from '../server/data.js';
const response=(probability=.9)=>({ok:true,status:200,json:async()=>({answers:{match:{type:'noul',noul:probability}},usage:{input_tokens:10,output_tokens:2}})});
test('validates probability shape, type, and range',()=>{
 assert.equal(parseProbability({answers:{match:{type:'noul',noul:0}}}),0);
 for(const v of [-1,2,NaN,'0.9',true,undefined])assert.throws(()=>parseProbability({answers:{match:{type:'noul',noul:v}}}));
 assert.throws(()=>parseProbability({answers:{match:{type:'score',noul:.9}}}));
});
test('cache includes row content and query; cache hits consume zero tokens',async()=>{
 let calls=0;const j=createJudge({apiKey:'test',fetcher:async()=>{calls++;return response();}});
 await j.search([{id:1,name:'A'}],'remote');
 const hit=await j.search([{id:1,name:'A'}],'remote');assert.equal(hit[0].cached,true);assert.equal(hit[0].usage.input_tokens,0);assert.equal(calls,1);
 await j.search([{id:1,name:'B'}],'remote');await j.search([{id:1,name:'B'}],'designer');assert.equal(calls,3);
});
test('bounds concurrency to eight while preserving row associations',async()=>{
 let active=0,max=0;const j=createJudge({apiKey:'test',fetcher:async(url,opts)=>{active++;max=Math.max(max,active);const id=JSON.parse(opts.body).state.record.id;await new Promise(r=>setTimeout(r,2));active--;return response(id/20);}});
 const result=await j.search(Array.from({length:20},(_,id)=>({id})),'query');assert.equal(max,8);assert.ok(result.every(x=>x.probability===x.row.id/20));
});
test('rate limits retry with backoff; auth failures do not retry',async()=>{
 let calls=0;const waits=[];const j=createJudge({apiKey:'test',sleep:async ms=>waits.push(ms),fetcher:async()=>++calls<3?{ok:false,status:429}:response()});
 await j.search([{id:1}],'q');assert.deepEqual(waits,[400,800]);
 calls=0;const bad=createJudge({apiKey:'bad',fetcher:async()=>{calls++;return {ok:false,status:401};}});await assert.rejects(()=>bad.search([{}],'q'),/401/);assert.equal(calls,1);
});
test('failed answers are not cached',async()=>{
 let calls=0;const j=createJudge({apiKey:'test',fetcher:async()=>++calls===1?response(4):response(.8)});
 await assert.rejects(()=>j.search([{}],'q'));const result=await j.search([{}],'q');assert.equal(result[0].probability,.8);assert.equal(calls,2);
});
test('offline fixtures support examples, reject arbitrary semantic claims',()=>{
 assert.equal(people.length,129);assert.equal(new Set(people.map(r=>r.id)).size,129);
 for(const q of examples)assert.equal(demoScores(q,people).length,129);
 assert.equal(demoScores('Could work from home',people).filter(r=>r.probability>=.7).length,75);
 assert.throws(()=>demoScores('quantum mechanics',people),/offline playground/);
});

test('cache expiration and bounded eviction force fresh evaluations',async()=>{
 let calls=0;const j=createJudge({apiKey:'test',maxEntries:1,fetcher:async()=>{calls++;return response();}});
 await j.search([{id:1}],'q');await j.search([{id:2}],'q');await j.search([{id:1}],'q');assert.equal(calls,3);
 const expiring=createJudge({apiKey:'test',ttl:0,fetcher:async()=>{calls++;return response();}});
 await expiring.search([{}],'q');await expiring.search([{}],'q');assert.equal(calls,5);
});
