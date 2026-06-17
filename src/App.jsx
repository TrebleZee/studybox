import { useState, useEffect, useRef } from "react";

const SUBJ_DEFAULTS = [
  { id:'physics', name:'Physics', exam:'OCR A', color:'#4F9CF9',
    topics:['Practical Skills in Physics','Foundations of Physics','Forces and Motion','Electrons, Waves and Photons','Newtonian World and Astrophysics','Particles and Medical Physics'].map((n,i)=>({id:`ph${i}`,name:n,done:false})) },
  { id:'maths', name:'Maths', exam:'Edexcel', color:'#34D399',
    topics:["Algebra and Functions","Coordinate Geometry","Sequences and Series","Trigonometry","Exponentials and Logarithms","Differentiation","Integration","Vectors","Statistical Sampling","Probability and Distributions","Hypothesis Testing","Kinematics","Forces and Newton's Laws","Projectiles and Moments"].map((n,i)=>({id:`ma${i}`,name:n,done:false})) },
  { id:'further', name:'Further Maths', exam:'Edexcel', color:'#A78BFA',
    topics:['Complex Numbers','Argand Diagrams','Matrices','Linear Transformations','Further Algebra','Series and Sums','Further Calculus','Polar Coordinates','Hyperbolic Functions','Differential Equations','Further Vectors','Proof by Induction'].map((n,i)=>({id:`fm${i}`,name:n,done:false})) },
  { id:'cs', name:'Computer Science', exam:'OCR', color:'#FBBF24',
    topics:['Components of a Computer','Software and Software Development','Exchanging Data','Data Types, Structures and Algorithms','Legal, Moral and Ethical Issues','Elements of Computational Thinking','Problem Solving and Programming','Algorithms','Theory of Computation','NEA Programming Project'].map((n,i)=>({id:`cs${i}`,name:n,done:false})) },
];

const C = { bg:'#0C0C0C',s1:'#131313',s2:'#1A1A1A',s3:'#222',bdr:'#272727',bdr2:'#333',txt:'#F0F0F0',muted:'#5A5A5A',dim:'#353535' };

const fmt = s => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; return h?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; };
const fmtDur = s => { if(!s)return'—'; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h?(m?`${h}h ${m}m`:`${h}h`):`${m}m`; };
const fmtDate = iso => new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short'});

export default function StudyBox() {
  // localStorage-initialised state (no async loading needed)
  const [subjects, setSubjects] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sb-subjects')) || SUBJ_DEFAULTS; }
    catch { return SUBJ_DEFAULTS; }
  });
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sb-sessions')) || []; }
    catch { return []; }
  });
  const [sel, setSel] = useState('physics');
  const [view, setView] = useState('planner');

  // Timestamp-based timer — accurate in background tabs and standalone windows
  const [elapsed, setElapsed] = useState(0);        // seconds accumulated before current run
  const [startedAt, setStartedAt] = useState(null); // adjusted Date.now() anchor, null = paused
  const [tick, setTick] = useState(0);               // triggers re-renders only
  const [tSub, setTSub] = useState(null);

  const [newTopic, setNewTopic] = useState('');
  const [note, setNote] = useState('');
  const itvRef = useRef();

  // Persist
  useEffect(() => { localStorage.setItem('sb-subjects', JSON.stringify(subjects)); }, [subjects]);
  useEffect(() => { localStorage.setItem('sb-sessions', JSON.stringify(sessions)); }, [sessions]);

  // Tick for display refreshes — actual time is always computed from Date.now()
  const running = startedAt !== null;
  useEffect(() => {
    if (startedAt) { itvRef.current = setInterval(() => setTick(n => n + 1), 500); }
    else clearInterval(itvRef.current);
    return () => clearInterval(itvRef.current);
  }, [startedAt]);

  // getSecs always reflects real elapsed time regardless of throttling
  const getSecs = () => startedAt ? Math.floor((Date.now() - startedAt) / 1000) : elapsed;

  // Window title shows timer when running — visible in taskbar
  useEffect(() => {
    document.title = startedAt ? `${fmt(getSecs())} · StudyBox` : 'StudyBox';
  });

  // Derived
  const sub = subjects.find(s => s.id === sel);
  const tSubData = subjects.find(s => s.id === tSub);
  const pct = s => s.topics.length ? Math.round(s.topics.filter(t => t.done).length / s.topics.length * 100) : 0;
  const subTotal = id => sessions.filter(s => s.subjectId === id).reduce((a, s) => a + s.duration, 0);
  const grandTotal = sessions.reduce((a, s) => a + s.duration, 0);

  const toggleTopic = (sid, tid) => setSubjects(p => p.map(s => s.id===sid ? {...s,topics:s.topics.map(t => t.id===tid ? {...t,done:!t.done} : t)} : s));
  const addTopic = () => { if (!newTopic.trim()) return; setSubjects(p => p.map(s => s.id===sel ? {...s,topics:[...s.topics,{id:Date.now().toString(),name:newTopic.trim(),done:false}]} : s)); setNewTopic(''); };
  const delTopic = tid => setSubjects(p => p.map(s => s.id===sel ? {...s,topics:s.topics.filter(t => t.id!==tid)} : s));
  const delSess = id => setSessions(p => p.filter(s => s.id !== id));

  const start = () => { if (!tSub) setTSub(sel); setStartedAt(Date.now() - elapsed * 1000); };
  const pause = () => { setElapsed(getSecs()); setStartedAt(null); };
  const reset = () => { setElapsed(0); setStartedAt(null); setTSub(null); };
  const logSess = () => {
    const secs = getSecs();
    if (!secs) return;
    const s = tSubData || sub;
    setSessions(p => [{id:Date.now().toString(),subjectId:s?.id,subjectName:s?.name||'',subjectColor:s?.color||'#888',duration:secs,date:new Date().toISOString(),note:note.trim()}, ...p]);
    setNote(''); setElapsed(0); setStartedAt(null); setTSub(null);
  };

  const timerColor = tSubData?.color || sub?.color || '#888';
  const displaySecs = getSecs();

  const CSS = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
    input, textarea { font-family: inherit; font-size: 13px; }
    input::placeholder, textarea::placeholder { color: ${C.muted}; }
    .sub-btn:hover { background: rgba(255,255,255,0.04) !important; }
    .topic-row:hover { background: ${C.s2} !important; }
    .topic-row:hover .del { opacity: 0.5 !important; }
    .del:hover { opacity: 1 !important; color: ${C.txt} !important; }
    .nb:hover { opacity: 0.85; }
    .nb:active { transform: scale(0.97); }
    .sess-row:hover .del-sess { opacity: 0.6 !important; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .ticking { animation: blink 2s ease-in-out infinite; }
  `;

  return (
      <div style={{display:'flex',flexDirection:'column',height:'100vh',background:C.bg,color:C.txt,fontFamily:'"Inter",system-ui,sans-serif',fontSize:'13px',overflow:'hidden'}}>
        <style>{CSS}</style>

        {/* Nav */}
        <div style={{display:'flex',alignItems:'center',padding:'0 14px',height:'46px',borderBottom:`1px solid ${C.bdr}`,background:C.s1,gap:'3px',flexShrink:0}}>
          <span style={{fontWeight:700,fontSize:'14px',letterSpacing:'-0.3px',marginRight:'10px',color:C.txt}}>StudyBox</span>
          {[['planner','Planner'],['log','Log']].map(([v,l]) => (
              <button key={v} className="nb" onClick={() => setView(v)} style={{padding:'5px 11px',borderRadius:'6px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:500,background:view===v?C.s3:'transparent',color:view===v?C.txt:C.muted,transition:'background 0.1s'}}>
                {l}
              </button>
          ))}
          {grandTotal > 0 && <span style={{marginLeft:'auto',fontSize:'11px',color:C.muted}}>{fmtDur(grandTotal)} total</span>}
        </div>

        {/* ── PLANNER ── */}
        {view === 'planner' && (
            <div style={{display:'flex',flex:1,overflow:'hidden'}}>
              {/* Sidebar */}
              <div style={{width:'188px',borderRight:`1px solid ${C.bdr}`,background:C.s1,display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden'}}>
                <div style={{padding:'11px 13px 5px',fontSize:'10px',fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:'1px'}}>Subjects</div>
                <div style={{flex:1,overflowY:'auto'}}>
                  {subjects.map(s => (
                      <div key={s.id} className="sub-btn" onClick={() => setSel(s.id)} style={{padding:'9px 13px',cursor:'pointer',background:sel===s.id?`${s.color}18`:'transparent',borderLeft:`3px solid ${sel===s.id?s.color:'transparent'}`,transition:'background 0.1s'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'1px'}}>
                          <span style={{fontWeight:600,fontSize:'12px',color:sel===s.id?s.color:C.txt}}>{s.name}</span>
                          <span style={{fontSize:'10px',color:C.muted}}>{pct(s)}%</span>
                        </div>
                        <div style={{fontSize:'10px',color:C.muted,marginBottom:'5px'}}>{s.exam}</div>
                        <div style={{height:'2px',background:C.bdr2,borderRadius:'2px',overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${pct(s)}%`,background:s.color,borderRadius:'2px',transition:'width 0.4s'}}/>
                        </div>
                      </div>
                  ))}
                </div>
                <div style={{padding:'10px 13px',borderTop:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:'10px',color:C.muted,marginBottom:'2px'}}>Total study time</div>
                  <div style={{fontSize:'17px',fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{fmtDur(grandTotal)}</div>
                </div>
              </div>

              {/* Topics */}
              <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
                {sub && <>
                  <div style={{padding:'11px 16px',borderBottom:`1px solid ${C.bdr}`,display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
                    <div style={{width:'7px',height:'7px',borderRadius:'50%',background:sub.color,flexShrink:0}}/>
                    <span style={{fontWeight:700,fontSize:'14px'}}>{sub.name}</span>
                    <span style={{fontSize:'10px',color:C.muted,padding:'2px 7px',background:C.s2,borderRadius:'4px',border:`1px solid ${C.bdr2}`}}>{sub.exam}</span>
                    <span style={{fontSize:'11px',color:C.muted,marginLeft:'auto'}}>{sub.topics.filter(t=>t.done).length}/{sub.topics.length} done · {fmtDur(subTotal(sub.id))} logged</span>
                  </div>
                  <div style={{flex:1,overflowY:'auto'}}>
                    {sub.topics.length === 0 && <div style={{padding:'40px 16px',textAlign:'center',color:C.muted,fontSize:'12px'}}>No topics yet. Add one below.</div>}
                    {sub.topics.map(t => (
                        <div key={t.id} className="topic-row" style={{display:'flex',alignItems:'center',padding:'7px 16px',gap:'10px',transition:'background 0.1s',background:'transparent'}}>
                          <div onClick={() => toggleTopic(sub.id,t.id)} style={{width:'15px',height:'15px',borderRadius:'4px',flexShrink:0,border:`1.5px solid ${t.done?sub.color:C.dim}`,background:t.done?sub.color:'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.15s'}}>
                            {t.done && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 4.5-5" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span style={{flex:1,color:t.done?C.muted:C.txt,textDecoration:t.done?'line-through':'none',fontSize:'13px'}}>{t.name}</span>
                          <button className="del nb" onClick={() => delTopic(t.id)} style={{border:'none',background:'transparent',color:C.muted,cursor:'pointer',fontSize:'17px',lineHeight:1,opacity:0,transition:'opacity 0.1s',padding:'0 2px'}}>×</button>
                        </div>
                    ))}
                  </div>
                  <div style={{padding:'9px 16px',borderTop:`1px solid ${C.bdr}`,display:'flex',gap:'6px',flexShrink:0}}>
                    <input
                        style={{flex:1,background:C.s2,border:`1px solid ${C.bdr2}`,borderRadius:'6px',padding:'7px 10px',color:C.txt,outline:'none'}}
                        placeholder={`Add topic to ${sub.name}...`}
                        value={newTopic}
                        onChange={e => setNewTopic(e.target.value)}
                        onKeyDown={e => e.key==='Enter' && addTopic()}
                    />
                    <button className="nb" onClick={addTopic} style={{padding:'7px 14px',background:sub.color,border:'none',borderRadius:'6px',color:'#000',fontWeight:700,fontSize:'12px',cursor:'pointer'}}>Add</button>
                  </div>
                </>}
              </div>

              {/* Timer panel */}
              <div style={{width:'210px',borderLeft:`1px solid ${C.bdr}`,background:C.s1,display:'flex',flexDirection:'column',flexShrink:0}}>
                <div style={{padding:'11px 13px 8px',fontSize:'10px',fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:'1px',borderBottom:`1px solid ${C.bdr}`}}>Timer</div>
                <div style={{padding:'18px 13px 12px',textAlign:'center'}}>
                  <div className={running?'ticking':''} style={{fontSize:'40px',fontWeight:700,fontVariantNumeric:'tabular-nums',letterSpacing:'-2px',color:timerColor,lineHeight:1}}>{fmt(displaySecs)}</div>
                  <div style={{fontSize:'11px',color:C.muted,marginTop:'5px',height:'14px'}}>{tSubData?tSubData.name:(sub?.name||'—')}</div>
                </div>
                <div style={{display:'flex',gap:'5px',padding:'0 13px',marginBottom:'8px'}}>
                  {!running
                      ? <button className="nb" onClick={start} style={{flex:2,padding:'8px 0',borderRadius:'6px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'12px',background:timerColor,color:'#000'}}>
                        {displaySecs>0?'Resume':'Start'}
                      </button>
                      : <button className="nb" onClick={pause} style={{flex:2,padding:'8px 0',borderRadius:'6px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'12px',background:timerColor,color:'#000'}}>Pause</button>
                  }
                  <button className="nb" onClick={reset} style={{flex:1,padding:'8px 0',borderRadius:'6px',border:'none',cursor:'pointer',fontWeight:500,fontSize:'12px',background:C.s3,color:C.muted}}>Reset</button>
                </div>
                <textarea rows={2} placeholder="Session note (optional)" value={note} onChange={e=>setNote(e.target.value)}
                          style={{margin:'0 13px 8px',background:C.s2,border:`1px solid ${C.bdr2}`,borderRadius:'6px',padding:'7px 9px',color:C.txt,outline:'none',resize:'none',fontFamily:'inherit',fontSize:'12px',lineHeight:1.5}}/>
                <button className="nb" onClick={logSess} disabled={!displaySecs}
                        style={{margin:'0 13px 13px',padding:'9px 0',background:displaySecs?timerColor:C.s3,border:'none',borderRadius:'6px',color:displaySecs?'#000':C.muted,fontWeight:700,fontSize:'12px',cursor:displaySecs?'pointer':'not-allowed',transition:'all 0.15s'}}>
                  Log Session
                </button>
                <div style={{padding:'6px 13px 4px',fontSize:'10px',fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:'1px'}}>Hours by Subject</div>
                <div style={{flex:1,overflowY:'auto',paddingBottom:'8px'}}>
                  {subjects.map(s => (
                      <div key={s.id} style={{display:'flex',alignItems:'center',padding:'5px 13px',gap:'7px'}}>
                        <div style={{width:'6px',height:'6px',borderRadius:'50%',background:s.color,flexShrink:0}}/>
                        <span style={{flex:1,fontSize:'12px',color:s.id===sel?s.color:C.txt,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</span>
                        <span style={{fontSize:'11px',color:C.muted,fontVariantNumeric:'tabular-nums'}}>{fmtDur(subTotal(s.id))}</span>
                      </div>
                  ))}
                </div>
              </div>
            </div>
        )}

        {/* ── LOG ── */}
        {view === 'log' && (
            <div style={{display:'flex',flex:1,overflow:'hidden'}}>
              <div style={{width:'188px',borderRight:`1px solid ${C.bdr}`,background:C.s1,display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden'}}>
                <div style={{padding:'11px 13px 8px',fontSize:'10px',fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:'1px'}}>Overview</div>
                <div style={{padding:'0 13px 12px',borderBottom:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:'26px',fontWeight:800,letterSpacing:'-1px',lineHeight:1,fontVariantNumeric:'tabular-nums'}}>{fmtDur(grandTotal)}</div>
                  <div style={{fontSize:'11px',color:C.muted,marginTop:'3px'}}>{sessions.length} session{sessions.length!==1?'s':''}</div>
                </div>
                <div style={{padding:'9px 13px 4px',fontSize:'10px',fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:'1px'}}>By Subject</div>
                <div style={{flex:1,overflowY:'auto',padding:'3px 0 8px'}}>
                  {[...subjects].sort((a,b)=>subTotal(b.id)-subTotal(a.id)).map(s => {
                    const t=subTotal(s.id), mx=Math.max(...subjects.map(x=>subTotal(x.id)),1);
                    return (
                        <div key={s.id} style={{padding:'5px 13px'}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                            <span style={{fontSize:'12px',fontWeight:500,color:C.txt}}>{s.name}</span>
                            <span style={{fontSize:'11px',color:C.muted}}>{fmtDur(t)}</span>
                          </div>
                          <div style={{height:'3px',background:C.bdr2,borderRadius:'2px',overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${t/mx*100}%`,background:s.color,borderRadius:'2px',transition:'width 0.4s'}}/>
                          </div>
                        </div>
                    );
                  })}
                </div>
              </div>
              <div style={{flex:1,overflowY:'auto',padding:'14px 18px'}}>
                <div style={{fontSize:'10px',fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'10px'}}>Session History</div>
                {sessions.length === 0
                    ? <div style={{textAlign:'center',color:C.muted,padding:'60px 0'}}>
                      <div style={{fontSize:'28px',marginBottom:'8px',opacity:0.4}}>⏱</div>
                      <div style={{fontSize:'13px'}}>No sessions yet.</div>
                      <div style={{fontSize:'12px',marginTop:'4px'}}>Start the timer and log your first session.</div>
                    </div>
                    : sessions.map(s => (
                        <div key={s.id} className="sess-row" style={{display:'flex',alignItems:'center',gap:'11px',padding:'10px 13px',background:C.s2,borderRadius:'8px',marginBottom:'5px',border:`1px solid ${C.bdr}`}}>
                          <div style={{width:'7px',height:'7px',borderRadius:'50%',background:s.subjectColor,flexShrink:0}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:600,fontSize:'13px'}}>{s.subjectName}</div>
                            {s.note && <div style={{fontSize:'11px',color:C.muted,marginTop:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.note}</div>}
                          </div>
                          <div style={{textAlign:'right',flexShrink:0}}>
                            <div style={{fontWeight:700,fontSize:'14px',color:s.subjectColor,fontVariantNumeric:'tabular-nums'}}>{fmtDur(s.duration)}</div>
                            <div style={{fontSize:'11px',color:C.muted}}>{fmtDate(s.date)}</div>
                          </div>
                          <button className="del-sess nb" onClick={() => delSess(s.id)} style={{border:'none',background:'transparent',color:C.muted,cursor:'pointer',fontSize:'17px',lineHeight:1,opacity:0,transition:'opacity 0.1s',padding:'0 2px',flexShrink:0}}>×</button>
                        </div>
                    ))
                }
              </div>
            </div>
        )}
      </div>
  );
}