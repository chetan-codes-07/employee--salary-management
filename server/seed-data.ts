import type {Sql,Value} from './database';
export const COUNTRIES=[{country:'India',currency:'INR',base:600_000},{country:'United States',currency:'USD',base:55_000},{country:'United Kingdom',currency:'GBP',base:35_000},{country:'Germany',currency:'EUR',base:45_000}] as const;
export const DEPARTMENTS=['Engineering','Design','Product','Sales','People','Finance'] as const;
const first=['Aarav','Ananya','Alex','Amelia','Arjun','Ava','Daniel','Emma','Felix','Hannah','Isha','James','Kabir','Leah','Liam','Maya','Mia','Noah','Priya','Riya','Sam','Sara','Sofia','Theo','Vikram','Zara'];
const last=['Bennett','Brooks','Carter','Das','Fischer','Gupta','Hart','Hayes','Hoffmann','Joshi','Kapoor','Khan','Kumar','Mehta','Miller','Morgan','Nair','Patel','Rao','Reed','Schmidt','Shah','Sharma','Singh','Taylor','Weber'];
export type Employee={id:string;name:string;department:string;country:string;currency:string;salary_minor:number;revision:number};
export function employees(seed=20261123):Employee[] {
  let state=seed>>>0;
  const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0; return state;};
  return Array.from({length:10_000},(_,i)=>{
    const place=COUNTRIES[i%COUNTRIES.length];
    const department=DEPARTMENTS[Math.floor(i/COUNTRIES.length)%DEPARTMENTS.length];
    const name=`${first[next()%first.length]} ${last[next()%last.length]}`;
    const salary=(place.base+next()%(place.base*2))*100;
    return {id:`EMP-${String(i+1).padStart(5,'0')}`,name,department,country:place.country,currency:place.currency,salary_minor:salary,revision:0};
  });
}
export const SEED_SQL='INSERT INTO employees (id,name,department,country,currency,salary_minor,revision) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING';
export function seedValues(row:Employee):Value[] {return [row.id,row.name,row.department,row.country,row.currency,row.salary_minor,row.revision];}
export async function seed(db:Sql,offset=0,limit=10_000){const rows=employees().slice(offset,offset+limit); for(let i=0;i<rows.length;i+=80)await db.batch(SEED_SQL,rows.slice(i,i+80).map(seedValues)); return rows.length;}
