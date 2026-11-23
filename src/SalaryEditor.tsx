import {useRef,useEffect,useState,type FormEvent} from 'react';
import {request,money,type Employee} from './api';
export function SalaryEditor({employee,onClose,onSave}:{employee:Employee;onClose:()=>void;onSave:(row:Employee)=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  const [amount,setAmount]=useState((employee.salary_minor/100).toFixed(2));
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{const node=dialog.current!;node.showModal();return ()=>node.close();},[]);
  async function save(event:FormEvent){
    event.preventDefault();
    if(busy)return;
    setBusy(true);setError('');
    try{
      const saved=await request<Employee>('/api/employees/'+employee.id+'/salary',{
        method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({salary:amount,revision:employee.revision})
      });
      onSave(saved);
    }catch(e){setError(e instanceof Error?e.message:'Save failed. Try again.');setBusy(false);}
  }
  return <dialog ref={dialog} aria-labelledby="editor-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
    <form onSubmit={save}>
      <div className="eyebrow">{employee.id}</div><h2 id="editor-title">Edit annual salary</h2>
      <p><strong>{employee.name}</strong><br/>{employee.department} · {employee.country}</p>
      <div className="current">Current annual base <b>{money(employee.salary_minor,employee.currency)}</b></div>
      <label>New annual base salary ({employee.currency})<input autoFocus inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} aria-describedby="amount-hint" aria-invalid={!!error}/></label>
      <small id="amount-hint">{error || 'Enter an amount with up to two decimal places.'}</small>
      {error && <span role="alert" className="sr">{error}</span>}
      <div className="actions"><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="primary" disabled={busy}>{busy?'Saving…':'Save salary'}</button></div>
    </form>
  </dialog>;
}
