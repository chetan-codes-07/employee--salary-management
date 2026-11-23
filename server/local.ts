import express from 'express';
import { openLocal } from './database';
import { createApp } from './app';
const {sql}=openLocal();
const app=createApp(sql);
app.use(express.static('dist/client'));
app.listen(3000,'0.0.0.0',()=>console.log('ACME Compensation: http://localhost:3000'));
