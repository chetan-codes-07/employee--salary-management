import express from 'express';
import type { Sql } from './database';
import {filtersFrom,listEmployees,updateSalary,summarize} from './employees';
import {InputError} from './money';
import {COUNTRIES,DEPARTMENTS,seed} from './seed-data';
export function createApp(db:Sql,options:{seedToken?:string}={}) {
  const app=express(); app.disable('x-powered-by');
  app.use((_req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});next();});
  app.use(express.json({limit:'16kb'}));
  app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
  app.get('/api/health',async (_req,res)=>{try{await db.all('SELECT 1 AS connected');res.json({status:'ok',database:'connected',storage:'persistent SQLite'});}catch{res.status(503).json({status:'unavailable',database:'unreachable'});}});
  app.get('/api/options',(_req,res)=>res.json({countries:COUNTRIES.map(c=>c.country),departments:DEPARTMENTS}));
  app.get('/api/employees',async (req,res)=>res.json(await listEmployees(db,filtersFrom(req.query),req.query.page)));
  app.get('/api/summary',async(req,res)=>res.json(await summarize(db,filtersFrom(req.query))));
  app.patch('/api/employees/:id/salary',async(req,res)=>{res.json(await updateSalary(db,req.params.id,req.body));});
  app.post('/api/admin/seed',async(req,res)=>{
    if(!options.seedToken||req.get('authorization')!==`Bearer ${options.seedToken}`)throw new InputError('Not authorized.',401);
    const offset=req.body?.offset;
    if(!Number.isInteger(offset)||offset<0||offset>=10_000||offset%80!==0)throw new InputError('Invalid seed offset.');
    const processed=await seed(db,offset,80);res.json({processed,offset});
  });
  app.use('/api',(_req,res)=>res.status(404).json({error:'Endpoint not found.'}));
  app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    if(error instanceof InputError){res.status(error.status).json({error:error.message});return;}
    const status=(error as {status?:number})?.status;
    if(status===400||status===413){res.status(status).json({error:status===413?'Request is too large.':'Request must contain valid JSON.'});return;}
    console.error('Request failed',error instanceof Error?error.message:'Unknown error');res.status(500).json({error:'Unable to complete the request. Please try again.'});
  });
  return app;
}
