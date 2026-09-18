import express from 'express';
import {randomBytes,randomInt} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {people} from './data.js';
import {describeDataset,scoreDemo} from './datasets.js';
import {createJudge} from './jev.js';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
if(existsSync(path.join(root,'.env'))) process.loadEnvFile(path.join(root,'.env'));
const app=express(),port=Number(process.env.PORT||4317),live=Boolean(process.env.TYPESAFE_API_KEY);
const run=promisify(execFile),sessions=new Map();
app.disable('x-powered-by');app.use(express.json({limit:'8kb'}));
app.use('/api',(req,res,next)=>{
 res.set('Cache-Control','no-store');
 if(req.method!=='GET'&&req.headers.origin&&!['http://localhost:'+port,'http://127.0.0.1:'+port].includes(req.headers.origin))return res.status(403).json({error:'Cross-origin requests are not allowed.'});
 next();
});
function session(req,res){
 const id=req.headers.cookie?.match(/(?:^|; )jev_session=([a-f0-9]{48})(?:;|$)/)?.[1];let s=sessions.get(id);
 if(s&&s.expires>Date.now()){s.expires=Date.now()+3600000;return s;}
 for(const [key,value] of sessions)if(value.expires<Date.now())sessions.delete(key);
 if(sessions.size>=50){const e=new Error('Too many active sessions.');e.status=429;throw e;}
 const token=randomBytes(24).toString('hex');
 s={expires:Date.now()+3600000,busy:false,type:'people',rows:people,version:randomBytes(8).toString('hex'),judge:createJudge({apiKey:process.env.TYPESAFE_API_KEY,model:process.env.TYPESAFE_MODEL||'jev-latest'})};
 sessions.set(token,s);res.cookie('jev_session',token,{httpOnly:true,sameSite:'strict',maxAge:3600000});return s;
}
function dataset(s){return {live,version:s.version,rows:s.rows,...describeDataset(s.type)};}
app.get('/api/dataset',(req,res)=>res.json(dataset(session(req,res))));
app.post('/api/generate',async(req,res)=>{
 const s=session(req,res);if(s.busy)return res.status(429).json({error:'Let the current request finish first.'});s.busy=true;
 try{
  const choices=['people','countries','numbers'].filter(t=>t!==s.type),type=choices[randomInt(choices.length)];
  const {stdout}=await run(process.env.JAVA_BIN||'java',[path.join(root,'generator/GenerateDatabase.java'),type],{timeout:15000,maxBuffer:1000000});
  const generated=JSON.parse(stdout);
  if(!Array.isArray(generated.rows)||!generated.rows.length||generated.type!==type)throw new Error('Invalid generated dataset.');
  s.type=type;s.rows=generated.rows;s.version=randomBytes(8).toString('hex');s.judge.clear();res.json(dataset(s));
 }catch(e){console.error('Dataset generation failed:',e.code||e.name);res.status(503).json({error:'Database generation needs Java 11 or newer installed on this machine. Your current dataset is unchanged.'});}
 finally{s.busy=false;}
});
app.post('/api/search',async(req,res)=>{
 const {query,version}=req.body;
 if(typeof query!=='string'||!query.trim()||query.length>500)return res.status(400).json({error:'Enter a question between 1 and 500 characters.'});
 const s=session(req,res);if(version!==s.version)return res.status(409).json({error:'The dataset changed. Refresh and try again.'});
 if(s.busy)return res.status(429).json({error:'Let the current request finish first.'});s.busy=true;const start=performance.now();
 try{
  const results=live?await s.judge.search(s.rows,query.trim()):scoreDemo(s.type,query,s.rows);
  res.json({results:results.map(({row,probability})=>({row,probability})),elapsed:Number((performance.now()-start).toFixed(1)),evaluated:s.rows.length,cached:live?results.filter(r=>r.cached).length:0,mode:live?'live':'demo'});
 }finally{s.busy=false;}
});
app.use('/api',(err,req,res,next)=>{console.error(err.name==='Error'?err.message:err.name);res.status(err.status||502).json({error:err.message||'Request failed.'});});
app.use('/api',(req,res)=>res.status(404).json({error:'Endpoint not found.'}));
if(process.env.NODE_ENV==='production'){app.use(express.static(path.join(root,'dist')));app.get('/{*path}',(req,res)=>res.sendFile(path.join(root,'dist/index.html')));}else{const {createServer}=await import('vite');const vite=await createServer({root,server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
app.listen(port,'127.0.0.1',()=>console.log(`postgres-Jev → http://localhost:${port} (${live?'live':'offline demo'})`));
