"use client";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, CloudUpload, LogOut, RefreshCw, Watch, Zap } from "lucide-react";
import { api, clearToken, getToken, saveToken } from "../lib/api";

const example = `{
  "name": "Lagoa - 6x2min",
  "date": "2026-08-29",
  "description": "Tiros controlados e recuperação em trote.",
  "steps": [
    {
      "type": "warmup",
      "duration": {"type": "distance", "value": 1500},
      "target": {"type": "pace", "min": "7:40", "max": "7:00"}
    },
    {
      "type": "repeat",
      "iterations": 6,
      "steps": [
        {
          "type": "run",
          "duration": {"type": "time", "value": 120},
          "target": {"type": "pace", "min": "6:15", "max": "5:50"}
        },
        {
          "type": "recovery",
          "duration": {"type": "time", "value": 120},
          "target": {"type": "pace", "min": "8:00", "max": "7:20"}
        }
      ]
    },
    {
      "type": "cooldown",
      "duration": {"type": "lap"},
      "target": {"type": "pace", "min": "7:40", "max": "7:00"}
    }
  ]
}`;

function fmtDuration(d: any) {
  if (!d) return "—";
  if (d.type === "time") return d.value % 60 === 0 ? `${d.value/60} min` : `${d.value}s`;
  if (d.type === "distance") return d.value >= 1000 ? `${d.value/1000} km` : `${d.value} m`;
  if (d.type === "lap") return "até LAP";
  return d.type;
}
function fmtTarget(t: any) {
  if (!t) return "";
  if (t.type === "pace") return `${t.min}–${t.max}/km`;
  if (t.type === "heart_rate") return `${t.min}–${t.max} bpm`;
  if (t.type === "heart_rate_zone") return `FC Z${t.zone}`;
  return "";
}
function StepList({steps}:{steps:any[]}) {
  return <>{steps?.map((s:any,i:number) => s.type === "repeat" ?
    <div className="repeat" key={i}><strong>{s.iterations}x repetir</strong><StepList steps={s.steps}/></div> :
    <div className="step" key={i}>
      <div className="row" style={{justifyContent:"space-between"}}>
        <strong>{({warmup:"Aquecimento",run:"Corrida",interval:"Intervalo",recovery:"Recuperação",cooldown:"Desaquecimento"} as any)[s.type] || s.type}</strong>
        <span className="badge">{fmtDuration(s.duration)}</span>
      </div>
      {s.target && <div className="muted" style={{marginTop:5}}>{fmtTarget(s.target)}</div>}
    </div>
  )}</>;
}

export default function Home() {
  const [authenticated,setAuthenticated] = useState(false);
  const [password,setPassword] = useState("");
  const [loginError,setLoginError] = useState("");
  const [tab,setTab] = useState("import");
  const [text,setText] = useState(example);
  const [garmin,setGarmin] = useState<{connected:boolean,email?:string}>({connected:false});
  const [garminEmail,setGarminEmail] = useState("");
  const [garminPass,setGarminPass] = useState("");
  const [mfa,setMfa] = useState("");
  const [needsMfa,setNeedsMfa] = useState(false);
  const [message,setMessage] = useState<any>(null);
  const [busy,setBusy] = useState(false);
  const [calendar,setCalendar] = useState<any[]>([]);
  const [history,setHistory] = useState<any[]>([]);

  useEffect(()=>setAuthenticated(!!getToken()),[]);
  const parsed = useMemo(()=>{ try { return JSON.parse(text); } catch { return null; }},[text]);

  async function doLogin(e:any) {
    e.preventDefault(); setLoginError("");
    try { const r=await api("/api/auth/login",{method:"POST",body:JSON.stringify({password})}); saveToken(r.token); setAuthenticated(true); }
    catch(e:any){setLoginError(e.message);}
  }
  async function refreshGarmin() {
    try { setGarmin(await api("/api/garmin/status")); } catch {}
  }
  useEffect(()=>{ if(authenticated) refreshGarmin(); },[authenticated]);

  async function connectGarmin(e:any) {
    e.preventDefault(); setBusy(true); setMessage(null);
    try {
      const r=await api("/api/garmin/login",{method:"POST",body:JSON.stringify({email:garminEmail,password:garminPass,mfa_code:mfa||null})});
      setNeedsMfa(false); setGarminPass(""); setMfa(""); setMessage({ok:true,text:`Garmin conectado: ${r.name}`}); await refreshGarmin();
    } catch(e:any) {
      if(e.status===428){setNeedsMfa(true); setMessage({ok:false,text:"Sua conta pediu MFA. Digite o código e envie novamente."});}
      else setMessage({ok:false,text:e.message});
    } finally {setBusy(false);}
  }
  async function send() {
    if(!parsed) return; setBusy(true); setMessage(null);
    try {
      await api("/api/workouts/validate",{method:"POST",body:JSON.stringify(parsed)});
      const r=await api("/api/workouts/send",{method:"POST",body:JSON.stringify(parsed)});
      setMessage({ok:r.verified,text:`${r.message} Workout #${r.workout_id}`});
    } catch(e:any){setMessage({ok:false,text:e.message});}
    finally{setBusy(false);}
  }
  async function loadCalendar() {
    const now=new Date();
    try { const r=await api(`/api/calendar?year=${now.getFullYear()}&month=${now.getMonth()+1}`); setCalendar(r.items||[]); }
    catch(e:any){setMessage({ok:false,text:e.message});}
  }
  async function loadHistory() {
    try {setHistory(await api("/api/history"));} catch(e:any){setMessage({ok:false,text:e.message});}
  }
  useEffect(()=>{ if(tab==="calendar") loadCalendar(); if(tab==="history") loadHistory(); },[tab]);

  if(!authenticated) return <main className="shell login"><section className="card">
    <div className="brand"><div className="logo">RS</div><div><h1>RunSync Garmin</h1><div className="muted">Seu painel privado de treinos</div></div></div>
    <div className="spacer"/>
    <form onSubmit={doLogin}><label>Senha da aplicação</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoFocus/>
      <div className="spacer"/><button className="btn primary" style={{width:"100%"}}>Entrar</button></form>
    {loginError && <div className="error" style={{marginTop:14}}>{loginError}</div>}
  </section></main>;

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><div className="logo"><Zap size={21}/></div><div><h1>RunSync Garmin</h1><div className="muted">ChatGPT → Garmin Connect → Forerunner</div></div></div>
      <div className="row">
        <span className="status"><span className={`dot ${garmin.connected?"ok":""}`}/>{garmin.connected?"Garmin conectado":"Garmin desconectado"}</span>
        <button className="btn secondary" onClick={()=>{clearToken();location.reload();}} title="Sair"><LogOut size={17}/></button>
      </div>
    </header>

    <div className="tabs">
      <button className={`tab ${tab==="import"?"active":""}`} onClick={()=>setTab("import")}>Novo treino</button>
      <button className={`tab ${tab==="calendar"?"active":""}`} onClick={()=>setTab("calendar")}>Calendário Garmin</button>
      <button className={`tab ${tab==="history"?"active":""}`} onClick={()=>setTab("history")}>Histórico</button>
      <button className={`tab ${tab==="garmin"?"active":""}`} onClick={()=>setTab("garmin")}>Conexão Garmin</button>
    </div>

    {message && <div className={message.ok?"success":"error"} style={{marginBottom:18}}>{message.text}</div>}

    {tab==="import" && <div className="grid">
      <section className="card">
        <h2>Importar treino</h2><p className="muted">Cole o JSON que o ChatGPT gerar para você.</p>
        <textarea value={text} onChange={e=>setText(e.target.value)} spellCheck={false}/>
        {!parsed && <div className="error" style={{marginTop:12}}>JSON inválido.</div>}
      </section>
      <aside className="card">
        <h2>Prévia</h2>
        {parsed ? <>
          <h3 style={{marginBottom:5}}>{parsed.name}</h3>
          <div className="muted">{parsed.date ? `Agendar em ${parsed.date.split("-").reverse().join("/")}` : "Sem data"}</div>
          <div style={{marginTop:15}}><StepList steps={parsed.steps}/></div>
          <div className="spacer"/>
          <button className="btn primary" style={{width:"100%"}} onClick={send} disabled={busy||!garmin.connected}>
            <CloudUpload size={17} style={{verticalAlign:"middle",marginRight:8}}/>{busy?"Enviando...":"Enviar para Garmin"}
          </button>
          {!garmin.connected && <p className="muted" style={{fontSize:13,marginTop:10}}>Conecte sua conta Garmin primeiro.</p>}
        </> : <p className="muted">Corrija o JSON para visualizar.</p>}
      </aside>
    </div>}

    {tab==="calendar" && <section className="card">
      <div className="row" style={{justifyContent:"space-between"}}><div><h2 style={{marginBottom:4}}>Calendário Garmin</h2><p className="muted">Treinos que a própria API Garmin retorna para o mês atual.</p></div>
      <button className="btn secondary" onClick={loadCalendar}><RefreshCw size={16}/></button></div>
      {calendar.length===0 ? <p className="muted">Nenhum treino encontrado neste mês.</p> :
      calendar.map((x:any,i)=><div className="calendar-item" key={i}><div><strong>{x.name}</strong><div className="muted" style={{fontSize:13}}>Workout #{x.workout_id||"—"}</div></div><span className="badge">{x.date||"Data não informada"}</span></div>)}
    </section>}

    {tab==="history" && <section className="card"><h2>Histórico de envios</h2>
      {history.length===0 ? <p className="muted">Nenhum envio ainda.</p> :
      history.map((x:any)=><div className="calendar-item" key={x.id}><div><strong>{x.name}</strong><div className="muted" style={{fontSize:13}}>{x.status} · #{x.workout_id}</div></div><span className="badge">{x.date||"sem data"}</span></div>)}
    </section>}

    {tab==="garmin" && <section className="card" style={{maxWidth:620}}>
      <div className="row"><Watch/><div><h2 style={{marginBottom:3}}>Garmin Connect</h2><div className="muted">{garmin.connected?`Conectado como ${garmin.email}`:"Faça a conexão uma única vez."}</div></div></div>
      <div className="spacer"/>
      <form onSubmit={connectGarmin}>
        <label>E-mail Garmin</label><input type="email" value={garminEmail} onChange={e=>setGarminEmail(e.target.value)} required/>
        <div className="spacer"/><label>Senha Garmin</label><input type="password" value={garminPass} onChange={e=>setGarminPass(e.target.value)} required/>
        {needsMfa && <><div className="spacer"/><label>Código MFA</label><input value={mfa} onChange={e=>setMfa(e.target.value)} inputMode="numeric" required/></>}
        <div className="spacer"/><button className="btn primary" disabled={busy}>{busy?"Conectando...":"Conectar Garmin"}</button>
      </form>
      <p className="muted" style={{fontSize:13,marginTop:16}}>Sua senha Garmin é usada apenas durante o login. O backend persiste somente os tokens, criptografados.</p>
    </section>}
  </main>;
}
