import type {Sql,Value} from './database';
import {COUNTRIES,DEPARTMENTS,type Employee} from './seed-data';
import {InputError,parseSalary} from './money';
export type Filters={q:string;country:string;department:string};
export type Summary={currency:string;count:number;totalMinor:number;averageMinor:number};
export function filtersFrom(query:Record<string,unknown>):Filters {
  const read=(key:string)=>{const v=query[key];if(v===undefined)return '';if(typeof v!=='string')throw new InputError(`Invalid ${key} filter.`);return v.trim();};
  const q=read('q'),country=read('country'),department=read('department');
  if(q.length>100)throw new InputError('Search must be 100 characters or fewer.');
  if(country&&!COUNTRIES.some(c=>c.country===country))throw new InputError('Choose a valid country.');
  if(department&&!(DEPARTMENTS as readonly string[]).includes(department))throw new InputError('Choose a valid department.');
  return {q,country,department};
}
export function where(filters:Filters) {
  const clauses:string[]=[],values:Value[]=[];
  if(filters.q){const escaped=filters.q.replace(/[\\%_]/g,'\\$&');clauses.push("(name LIKE ? ESCAPE '\\' OR id LIKE ? ESCAPE '\\')");values.push(`%${escaped}%`,`%${escaped}%`);}
  if(filters.country){clauses.push('country = ?');values.push(filters.country);}
  if(filters.department){clauses.push('department = ?');values.push(filters.department);}
  return {sql:clauses.length?' WHERE '+clauses.join(' AND '):'',values};
}
export async function listEmployees(db:Sql,filters:Filters,pageInput:unknown=undefined){
  const pageValue=pageInput===undefined?'1':pageInput;
  if(typeof pageValue!=='string'|| !/^[1-9]\d{0,3}$/.test(pageValue))throw new InputError('Page must be a positive whole number.');
  const page=Number(pageValue),pageSize=25;
  if(page>400)throw new InputError('Page exceeds the 10,000 employee dataset.');
  const w=where(filters);
  const [count]=await db.all<{total:number}>('SELECT COUNT(*) AS total FROM employees'+w.sql,w.values);
  const items=await db.all<Employee>('SELECT * FROM employees'+w.sql+' ORDER BY id LIMIT ? OFFSET ?',[...w.values,pageSize,(page-1)*pageSize]);
  return {items,total:count.total,page,pageSize,pages:Math.ceil(count.total/pageSize)};
}
export async function summarize(db:Sql,filters:Filters):Promise<Summary[]> {
  const w=where(filters);
  const rows=await db.all<{currency:string;count:number;totalMinor:number}>('SELECT currency, COUNT(*) AS count, SUM(salary_minor) AS totalMinor FROM employees'+w.sql+' GROUP BY currency ORDER BY currency',w.values);
  return rows.map(r=>({...r,averageMinor:Math.round(r.totalMinor/r.count)}));
}
export async function updateSalary(db:Sql,id:string,body:unknown):Promise<Employee>{
  if(!/^EMP-\d{5}$/.test(id))throw new InputError('Employee not found.',404);
  if(!body||typeof body!=='object'||Array.isArray(body))throw new InputError('Provide salary and revision.');
  const {salary,revision}=body as {salary:unknown;revision:unknown};
  const minor=parseSalary(salary);
  if(typeof revision!=='number'||!Number.isSafeInteger(revision)||revision<0)throw new InputError('Provide a valid employee revision.');
  const [saved]=await db.all<Employee>('UPDATE employees SET salary_minor = ?, revision = revision + 1 WHERE id = ? AND revision = ? RETURNING *',[minor,id,revision]);
  if(saved)return saved;
  const [exists]=await db.all('SELECT id FROM employees WHERE id=?',[id]);
  throw exists?new InputError('This salary changed since you opened it. Reload the employee before saving again.',409):new InputError('Employee not found.',404);
}
