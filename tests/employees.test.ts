import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openLocal} from '../server/database';
import {migrate} from '../server/migrate';
import {filtersFrom,listEmployees,updateSalary} from '../server/employees';
import {SEED_SQL} from '../server/seed-data';
export const empty={q:'',country:'',department:''};
export async function fixture(){const db=openLocal(':memory:');migrate(db.db);await db.sql.batch(SEED_SQL,[['EMP-00001','Priya Sharma','Engineering','India','INR',10000000,0],['EMP-00002','Aarav Shah','Engineering','India','INR',20000000,0],['EMP-00003','Sam Reed','Engineering','United States','USD',5000000,0],['EMP-00004','Maya Nair','Sales','India','INR',30000000,0]]);return db;}
test('search by ID or case-insensitive name with combined filters; wildcards are literal',async()=>{const db=await fixture();try{assert.equal((await listEmployees(db.sql,{...empty,q:'prIYa'})).items[0].id,'EMP-00001');assert.equal((await listEmployees(db.sql,{...empty,q:'emp-00002'})).total,1);assert.equal((await listEmployees(db.sql,{...empty,country:'India',department:'Engineering'})).total,2);for(const q of ['%','_',"' OR 1=1 --"])assert.equal((await listEmployees(db.sql,{...empty,q})).total,0);assert.equal((await listEmployees(db.sql,empty,'2')).items.length,0);}finally{db.close();}});
test('validate filter shape and pagination bounds',async()=>{const db=await fixture();try{for(const q of [{q:['a']},{country:'Atlantis'},{department:'Unknown'},{q:'a'.repeat(101)}])assert.throws(()=>filtersFrom(q));for(const page of ['0','-1','1.5','1e2','401',['1']])await assert.rejects(listEmployees(db.sql,empty,page));}finally{db.close();}});
test('salary persists after closing and reopening the database; stale edits conflict',async()=>{const dir=mkdtempSync(join(tmpdir(),'acme-test-')),path=join(dir,'db.sqlite');let db=openLocal(path);try{migrate(db.db);await db.sql.batch(SEED_SQL,[['EMP-00001','Priya Sharma','Engineering','India','INR',10000000,0]]);const updated=await updateSalary(db.sql,'EMP-00001',{salary:'110000.29',revision:0});assert.equal(updated.salary_minor,11000029);assert.equal(updated.currency,'INR');assert.equal(updated.revision,1);await assert.rejects(updateSalary(db.sql,'EMP-00001',{salary:'120000',revision:0}),{status:409});db.close();db=openLocal(path);const saved=await listEmployees(db.sql,empty);assert.equal(saved.items[0].salary_minor,11000029);await assert.rejects(updateSalary(db.sql,'EMP-99999',{salary:'100',revision:0}),{status:404});await assert.rejects(updateSalary(db.sql,'EMP-00001',{salary:'-1',revision:1}),{status:400});await assert.rejects(updateSalary(db.sql,'EMP-00001',{salary:'100',revision:'1'}),{status:400});}finally{db.close();rmSync(dir,{recursive:true,force:true});}});

test('a raise affects only the matching currency and team', async () => {
  const {summarize} = await import('../server/employees');
  const db = await fixture();
  try {
    const engineering = {...empty, department:'Engineering'};
    assert.deepEqual(await summarize(db.sql, engineering), [
      {currency:'INR', count:2, totalMinor:30000000, averageMinor:15000000},
      {currency:'USD', count:1, totalMinor:5000000, averageMinor:5000000}
    ]);
    await updateSalary(db.sql,'EMP-00001',{salary:'110000.00',revision:0});
    assert.deepEqual(await summarize(db.sql, {...engineering,country:'India'}), [
      {currency:'INR', count:2, totalMinor:31000000, averageMinor:15500000}
    ]);
  } finally { db.close(); }
});
