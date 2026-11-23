import express from 'express';
import type { Sql } from './database';
export function createApp(db:Sql) {
  const app=express(); app.disable('x-powered-by');
  app.use(express.json({limit:'64kb'}));
  app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
  app.get('/api/health',async (_req,res)=>{try{await db.all('SELECT 1 AS connected');res.json({status:'ok',database:'connected',storage:'persistent SQLite'});}catch{res.status(503).json({status:'unavailable',database:'unreachable'});}});
  return app;
}
