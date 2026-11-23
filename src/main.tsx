import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {SalaryEditor} from './SalaryEditor';
import {money,request,type Directory,type Employee,type Summary} from './api';
import './style.css';

const initial=new URLSearchParams(location.search);
type Options={countries:string[];departments:string[]};
function App(){
  const [q,setQ]=useState(initial.get('q')||'');
  const [country,setCountry]=useState(initial.get('country')||'');
  const [department,setDepartment]=useState(initial.get('department')||'');
  const [page,setPage]=useState(1);
  const [refresh,setRefresh]=useState(0);
  const [result,setResult]=useState<{directory:Directory;groups:Summary[];options:Options}|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [editing,setEditing]=useState<Employee|null>(null);
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    const params=new URLSearchParams();
    for(const [key,value] of Object.entries({q,country,department}))if(value)params.set(key,value);
    window.history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));
    setLoading(true);setError('');
    const timer=setTimeout(async()=>{
      try{
        const opts={signal:controller.signal};
        const [directory,groups,options]=await Promise.all([
          request<Directory>('/api/employees?'+params+'&page='+page,opts),
          request<Summary[]>('/api/summary?'+params,opts),request<Options>('/api/options',opts)
        ]);
        if(!controller.signal.aborted)setResult({directory,groups,options});
      }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unable to load employees.');}
      finally{if(!controller.signal.aborted)setLoading(false);}
    },150);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[q,country,department,page,refresh]);
  function change(set:(value:string)=>void,value:string){setPage(1);setNotice('');set(value);}
  function reset(){setQ('');setCountry('');setDepartment('');setPage(1);setNotice('');}
  const data=result?.directory;
  const live=!loading&&!error&&data;
  const count=live?data.total.toLocaleString():'…';
  return <>
    <header><div className="shell mast"><a className="brand" href="./"><i aria-hidden="true">A</i> ACME</a><span className="division">People Operations</span><span className="demo">Fictional data</span></div></header>
    <main className="shell"><div className="intro"><div className="eyebrow">HR workspace</div><h1>Compensation</h1><p>Review annual base pay and update employee salaries.</p></div>
    <section className="filters" aria-label="Workspace filters">
      <label>Search employees<input type="search" placeholder="Name or employee ID" value={q} maxLength={100} onChange={e=>change(setQ,e.target.value)}/></label>
      <label>Country<select value={country} onChange={e=>change(setCountry,e.target.value)}><option value="">All countries</option>{result?.options.countries.map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Department<select value={department} onChange={e=>change(setDepartment,e.target.value)}><option value="">All departments</option>{result?.options.departments.map(v=><option key={v}>{v}</option>)}</select></label>
      <button onClick={reset} disabled={!q&&!country&&!department}>Clear filters</button>
    </section>
    {error && <div role="alert" className="message">{error} <button onClick={()=>setRefresh(n=>n+1)}>Retry</button></div>}
    {notice && <div role="status" className="message">{notice}</div>}
    <section className="summary" aria-busy={loading}><div className="section-head"><div><h2>Pay overview</h2><p>Annual base pay by currency · All matching employees</p></div><div className="headcount"><strong>{count}</strong> employees</div></div>
    <div className="cards">{live&&result.groups.map(g=><article key={g.currency}><div className="card-top"><b>{g.currency}</b><span>{g.count.toLocaleString()} people</span></div><small>Total annual base</small><strong className="figure">{money(g.totalMinor,g.currency)}</strong><small>Average annual base</small><b className="avg">{money(g.averageMinor,g.currency)}</b></article>)}</div>
    {loading?<p>Loading pay figures…</p>:live&&!data.total?<p>No matching salaries.</p>:null}</section>
    <section className="directory" aria-busy={loading}><div className="section-head"><h2>Employee directory</h2><span>{live&&data.total?((page-1)*data.pageSize+1)+'–'+Math.min(page*data.pageSize,data.total)+' of '+count:''}</span></div>
    {live&&data.total>0?<><table><thead><tr>{['Employee','Department','Country','Annual base salary',''].map((v,i)=><th key={i}>{v}</th>)}</tr></thead><tbody>{data.items.map(e=><tr key={e.id}>
      <td><b>{e.name}</b><small>{e.id}</small></td><td data-label="Department">{e.department}</td><td data-label="Country">{e.country}</td><td className="amount" data-label="Annual base">{money(e.salary_minor,e.currency)}</td><td><button aria-label={'Edit salary for '+e.name+' '+e.id} onClick={()=>{setEditing(e);setNotice('');}}>Edit salary</button></td>
    </tr>)}</tbody></table><div className="pager"><button disabled={page===1} onClick={()=>setPage(n=>n-1)}>Previous</button><span>Page {page} of {data.pages}</span><button disabled={page>=data.pages} onClick={()=>setPage(n=>n+1)}>Next</button></div></>:<p>{loading?'Loading employees…':error?'Directory unavailable.':'No employees match these filters.'}</p>}</section>
    </main>{editing&&<SalaryEditor employee={editing} onClose={()=>{setEditing(null);setRefresh(n=>n+1);}} onSave={row=>{setEditing(null);setNotice(row.name+'’s annual base salary was saved at '+money(row.salary_minor,row.currency)+'.');setRefresh(n=>n+1);}}/>}
  </>;
}
createRoot(document.getElementById('root')!).render(<App/>);
