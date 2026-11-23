import type { Employee } from '../server/seed-data';
export type { Employee };
export type {Summary} from '../server/employees';
export type Directory = {items: Employee[]; total: number; pages: number; page: number; pageSize: number};
export async function request<T>(url:string, options?:RequestInit):Promise<T> {
  const response = await fetch(url, options);
  const payload = await response.json() as T & {error?:string};
  if (!response.ok) throw new Error(payload.error || 'Unable to complete the request.');
  return payload;
}
export const money = (minor:number,currency:string) => new Intl.NumberFormat(currency==='INR'?'en-IN':'en-US',{
  style:'currency', currency, currencyDisplay:'code', minimumFractionDigits:2
}).format(minor/100);
