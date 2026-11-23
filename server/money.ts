export const MAX_SALARY_MINOR=10_000_000_000;
export class InputError extends Error { constructor(message:string,public status=400){super(message);} }
export function parseSalary(value:unknown):number {
  if(typeof value!=='string'|| !/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(value))throw new InputError('Enter a plain amount with up to two decimal places, without commas or currency symbols.');
  const [whole,fraction='']=value.split('.');
  const minor=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if(!Number.isSafeInteger(minor)||minor<1||minor>MAX_SALARY_MINOR)throw new InputError('Annual salary must be between 0.01 and 100,000,000.00.');
  return minor;
}
export function salaryDecimal(minor:number):string {return `${Math.floor(minor/100)}.${String(minor%100).padStart(2,'0')}`;}
