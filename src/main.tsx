import React from 'react';
import {createRoot} from 'react-dom/client';
function App(){const [health,setHealth]=React.useState('Connecting…');React.useEffect(()=>{fetch('/api/health').then(r=>r.json()).then(d=>setHealth((d as {database:string}).database)).catch(()=>setHealth('unavailable'));},[]);return <main style={{fontFamily:'system-ui',padding:48}}><h1>ACME Compensation</h1><p>HR salary management • Fictional assessment data</p><p>Database: {health}</p></main>;}
createRoot(document.getElementById('root')!).render(<App/>);
