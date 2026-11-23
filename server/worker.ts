import { env } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import type { Sql } from './database';
import { createApp } from './app';
// Generated from the production React build by scripts/build.ts.
// @ts-ignore generated only at build time
import assets from '../dist/asset-map.json';
const binding=(env as unknown as {DB:D1Database}).DB;
const sql:Sql={
  async all<T>(query:string,values:import('./database').Value[]=[]) {return (await binding.prepare(query).bind(...values).all<T>()).results;},
  async run(query,values=[]) {return (await binding.prepare(query).bind(...values).run()).meta.changes;},
  async batch(query,rows) {await binding.batch(rows.map(values=>binding.prepare(query).bind(...values)));}
};
const app=createApp(sql);
app.use((req,res)=>{const path=req.path==='/'?'/index.html':req.path;const asset=(assets as Record<string,{type:string;body:string}>)[path];if(!asset) {res.status(404).send('Not found');return;}res.set('Content-Type',asset.type).send(Buffer.from(asset.body,'base64'));});
app.listen(3000);
export default httpServerHandler({port:3000});
