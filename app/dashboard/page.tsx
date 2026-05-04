'use client'
import { useState, useEffect, useRef } from 'react'
import type { Lancamento } from '../../lib/supabase'

const SENHA = 'EnricoT@1982'

type ViewMode = 'dashboard' | 'lancamentos' | 'pendentes' | 'regras'

export default function Dashboard() {
  const [authed, setAuthed]     = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [senhaInput, setSenha]  = useState('')
  const [senhaErro, setErro]    = useState(false)
  const [view, setView]         = useState<ViewMode>('dashboard')
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus]     = useState<{msg:string,type:'info'|'success'|'error'}|null>(null)
  const [mesesSel, setMesesSel] = useState<string[]>([])
  const [filterTitular, setFilterTitular] = useState('')
  const [filterTipo, setFilterTipo]       = useState('')
  const [filterStatus, setFilterStatus]   = useState('')
  const [editRow, setEditRow]   = useState<Lancamento|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const ok = sessionStorage.getItem('auth')
    if (ok === '1') setAuthed(true)
  }, [])

  useEffect(() => { if (authed) fetchLancamentos() }, [authed])

  function handleLogin() {
    if (senhaInput === SENHA) {
      sessionStorage.setItem('auth', '1')
      setAuthed(true)
    } else {
      setErro(true)
      setTimeout(() => setErro(false), 2000)
    }
  }

  async function fetchLancamentos() {
    setLoading(true)
    const res = await fetch('/api/lancamentos?limit=1000')
    const json = await res.json()
    setLancamentos(json.lancamentos || [])
    setLoading(false)
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    let total = 0
    for (const file of Array.from(files)) {
      setStatus({ msg: `Lendo ${file.name}...`, type: 'info' })
      const fd = new FormData()
      fd.append('pdf', file)
      const res  = await fetch('/api/extrair', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.error) { setStatus({ msg: json.error, type: 'error' }); continue }

      // Calcula status_reembolso antes de salvar
      const items = json.lancamentos.map((l: any) => ({
        ...l,
        status_reembolso: l.cobranca_terceiros === 'Sim' ? '⏳ PENDENTE' : 'N/A'
      }))

      const save = await fetch('/api/lancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items)
      })
      const saved = await save.json()
      total += saved.inserted || 0
    }
    setStatus({ msg: `✓ ${total} lançamentos importados e salvos`, type: 'success' })
    setUploading(false)
    fetchLancamentos()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este lançamento?')) return
    await fetch('/api/lancamentos', { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id}) })
    setLancamentos(prev => prev.filter(l => l.id !== id))
  }

  async function handleSaveEdit() {
    if (!editRow) return
    const updated = {
      ...editRow,
      status_reembolso: editRow.cobranca_terceiros === 'Sim'
        ? (editRow.data_reembolso ? '✔ REEMBOLSADO' : '⏳ PENDENTE')
        : 'N/A'
    }
    await fetch('/api/lancamentos', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(updated) })
    setLancamentos(prev => prev.map(l => l.id === updated.id ? updated : l))
    setEditRow(null)
  }

  async function handleReembolso(l: Lancamento) {
    const hoje = new Date().toLocaleDateString('pt-BR')
    const updated = { ...l, data_reembolso: hoje, status_reembolso: '✔ REEMBOLSADO' }
    await fetch('/api/lancamentos', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(updated) })
    setLancamentos(prev => prev.map(x => x.id === l.id ? updated : x))
  }

  function exportar() {
    import('../../lib/export').then(m => m.exportarExcel(filtered))
  }

  function toggleMes(m: string) {
    setMesesSel(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  const meses = [...new Set(lancamentos.map(l => l.mes_referencia).filter(Boolean))].sort().reverse()
  const titulares = [...new Set(lancamentos.map(l => l.titular).filter(Boolean))]

  const filtered = lancamentos.filter(l =>
    (mesesSel.length === 0 || mesesSel.includes(l.mes_referencia)) &&
    (!filterTitular || l.titular === filterTitular) &&
    (!filterTipo    || l.tipo   === filterTipo) &&
    (!filterStatus  || l.status_reembolso === filterStatus)
  )

  const pendentes = lancamentos.filter(l => l.status_reembolso === '⏳ PENDENTE')

  const totalGeral    = filtered.reduce((s,l) => s + (l.valor||0), 0)
  const totalPendente = filtered.filter(l => l.status_reembolso === '⏳ PENDENTE').reduce((s,l) => s+(l.valor||0),0)
  const totalEmpresa  = filtered.filter(l => l.tipo === 'Empresa').reduce((s,l) => s+(l.valor||0),0)
  const totalPendGeral = pendentes.reduce((s,l) => s+(l.valor||0), 0)
  const fmt = (v: number) => v.toLocaleString('pt-BR', {style:'currency',currency:'BRL'})

  function tipoBadge(tipo: string, cobranca: string) {
    if (cobranca === 'Sim') return <span className="badge badge-adicional">Adicional</span>
    if (tipo === 'Empresa') return <span className="badge badge-empresa">Empresa</span>
    return <span className="badge badge-pessoal">Pessoal</span>
  }

  function statusBadge(l: Lancamento) {
    if (l.cobranca_terceiros !== 'Sim') return <span className="badge badge-na">N/A</span>
    if (l.status_reembolso === '✔ REEMBOLSADO') return <span className="badge badge-ok">✔ Reembolsado</span>
    return (
      <button className="badge badge-pendente" style={{cursor:'pointer',border:'none'}} onClick={() => handleReembolso(l)} title="Clique para marcar como reembolsado">
        ⏳ Pendente
      </button>
    )
  }

  // ── Tela de login ──────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div className="card" style={{padding:32, width:340, textAlign:'center'}}>
        <div style={{fontFamily:'var(--font-display)', fontSize:24, color:'var(--brand)', marginBottom:8}}>Conciliação</div>
        <div style={{fontSize:13, color:'var(--text2)', marginBottom:24}}>Cartões empresa & pessoal</div>
        <input
          type="password" placeholder="Senha de acesso"
          value={senhaInput} onChange={e => setSenha(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{width:'100%', marginBottom:12,
            borderColor: senhaErro ? 'var(--red)' : undefined}}
        />
        {senhaErro && <div style={{color:'var(--red)', fontSize:12, marginBottom:8}}>Senha incorreta</div>}
        <button className="btn btn-primary" style={{width:'100%', justifyContent:'center'}} onClick={handleLogin}>
          Entrar
        </button>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh', background:'var(--bg)'}}>
      {/* Mobile header */}
      <div className="mobile-header">
        <button onClick={() => setMenuOpen(true)} style={{background:'none', border:'none', cursor:'pointer', fontSize:22, color:'var(--text)', padding:4}}>☰</button>
        <span style={{fontFamily:'var(--font-display)', fontSize:16, color:'var(--brand)'}}>Conciliação</span>
      </div>

      {/* Mobile overlay */}
      <div className={`mobile-overlay${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)} />

      <div style={{display:'flex', minHeight:'100vh'}}>
        {/* Sidebar */}
        <aside className={`sidebar${menuOpen ? ' open' : ''}`} style={{width:220, background:'var(--surface)', borderRight:'1px solid var(--border)', padding:'24px 0', display:'flex', flexDirection:'column', gap:4, flexShrink:0}}>
          <div style={{padding:'0 20px 20px', borderBottom:'1px solid var(--border)', marginBottom:8}}>
            <div style={{fontFamily:'var(--font-display)', fontSize:18, color:'var(--brand)', lineHeight:1.2}}>Conciliação</div>
            <div style={{fontSize:11, color:'var(--text2)', marginTop:2}}>Cartões empresa & pessoal</div>
          </div>
          {([
            ['dashboard',   '◈', 'Painel'],
            ['lancamentos', '≡', 'Lançamentos'],
            ['pendentes',   '⏳', `Pendentes${pendentes.length > 0 ? ` (${pendentes.length})` : ''}`],
            ['regras',      '◎', 'Regras'],
          ] as [ViewMode, string, string][]).map(([v, icon, label]) => (
            <button key={v} onClick={() => { setView(v); setMenuOpen(false) }}
              style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'10px 20px', border:'none', cursor:'pointer',
                background: view === v ? 'var(--brand-light)' : 'transparent',
                color: view === v ? 'var(--brand)' : v === 'pendentes' && pendentes.length > 0 ? 'var(--red)' : 'var(--text2)',
                fontWeight: view === v ? 500 : 400,
                fontSize:13, textAlign:'left',
              }}>
              <span style={{fontSize:16}}>{icon}</span> {label}
            </button>
          ))}

          <div style={{marginTop:'auto', padding:'16px 20px', borderTop:'1px solid var(--border)'}}>
            <button className="btn btn-primary" style={{width:'100%', justifyContent:'center'}}
              onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <><span className="spinner" /> Importando...</> : '+ Importar fatura'}
            </button>
            <input ref={fileRef} type="file" accept=".pdf" multiple style={{display:'none'}}
              onChange={e => handleUpload(e.target.files)} />
            <button className="btn" style={{width:'100%', justifyContent:'center', marginTop:8, fontSize:12}}
              onClick={() => { sessionStorage.removeItem('auth'); setAuthed(false) }}>
              Sair
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="main-content" style={{flex:1, padding:32, overflow:'auto'}}>
          {status && (
            <div style={{
              padding:'10px 16px', borderRadius:8, marginBottom:20, fontSize:13,
              background: status.type==='error' ? 'var(--red-bg)' : status.type==='success' ? 'var(--green-bg)' : 'var(--brand-light)',
              color: status.type==='error' ? 'var(--red)' : status.type==='success' ? 'var(--green)' : 'var(--brand)',
              display:'flex', justifyContent:'space-between', alignItems:'center'
            }}>
              {status.msg}
              <button onClick={() => setStatus(null)} style={{background:'none',border:'none',cursor:'pointer',color:'inherit',fontSize:16}}>×</button>
            </div>
          )}

          {/* ── PAINEL ── */}
          {view === 'dashboard' && (
            <div>
              <div style={{marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12}}>
                <div>
                  <h1 style={{fontFamily:'var(--font-display)', fontSize:28, fontWeight:400, marginBottom:4}}>Painel</h1>
                  <p style={{color:'var(--text2)', fontSize:13}}>Visão geral dos lançamentos importados</p>
                </div>
                <button className="btn btn-primary" onClick={exportar}>↓ Exportar Excel</button>
              </div>

              {/* Filtro meses múltiplos */}
              <div style={{marginBottom:20}}>
                <div style={{fontSize:12, color:'var(--text2)', marginBottom:8}}>Filtrar por mês (selecione um ou mais):</div>
                <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                  <button className="btn" style={{fontSize:12, padding:'4px 12px',
                    background: mesesSel.length === 0 ? 'var(--brand)' : 'var(--surface)',
                    color: mesesSel.length === 0 ? 'white' : 'var(--text)'}}
                    onClick={() => setMesesSel([])}>Todos</button>
                  {meses.map(m => (
                    <button key={m} className="btn" style={{fontSize:12, padding:'4px 12px',
                      background: mesesSel.includes(m) ? 'var(--brand)' : 'var(--surface)',
                      color: mesesSel.includes(m) ? 'white' : 'var(--text)'}}
                      onClick={() => toggleMes(m)}>{m}</button>
                  ))}
                </div>
              </div>

              {/* Métricas */}
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px,1fr))', gap:12, marginBottom:28}}>
                {[
                  ['Lançamentos',       filtered.length,    'var(--text)'],
                  ['Total fatura',      fmt(totalGeral),    'var(--brand)'],
                  ['A reembolsar',      fmt(totalPendente), 'var(--red)'],
                  ['Despesas empresa',  fmt(totalEmpresa),  'var(--green)'],
                ].map(([label, value, color]) => (
                  <div key={label as string} className="metric-card">
                    <div className="label">{label}</div>
                    <div className="value" style={{color: color as string}}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Últimos lançamentos */}
              <div className="card" style={{overflow:'hidden'}}>
                <div style={{padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span style={{fontWeight:500}}>Últimos lançamentos</span>
                  <button className="btn" onClick={() => setView('lancamentos')}>Ver todos →</button>
                </div>
                <div style={{overflowX:'auto'}}>
                  <table>
                    <thead><tr>
                      <th>Data</th><th>Estabelecimento</th><th>Titular</th>
                      <th style={{textAlign:'right'}}>Valor</th><th>Tipo</th><th>Status</th>
                    </tr></thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} style={{textAlign:'center', padding:32, color:'var(--text2)'}}>
                          <span className="spinner" style={{marginRight:8}} />Carregando...
                        </td></tr>
                      ) : filtered.slice(0,10).map(l => (
                        <tr key={l.id}>
                          <td style={{whiteSpace:'nowrap', color:'var(--text2)', fontSize:12}}>{l.data}</td>
                          <td><span style={{fontWeight:500}}>{l.estabelecimento}</span><br/>
                            <span style={{fontSize:11, color:'var(--text2)'}}>{l.descricao}</span></td>
                          <td style={{fontSize:12}}>{l.titular}</td>
                          <td style={{textAlign:'right', fontWeight:500, whiteSpace:'nowrap'}}>{fmt(l.valor)}</td>
                          <td>{tipoBadge(l.tipo, l.cobranca_terceiros)}</td>
                          <td>{statusBadge(l)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── PENDENTES ── */}
          {view === 'pendentes' && (
            <div>
              <div style={{marginBottom:24}}>
                <h1 style={{fontFamily:'var(--font-display)', fontSize:28, fontWeight:400, marginBottom:4}}>Pendentes</h1>
                <p style={{color:'var(--text2)', fontSize:13}}>Todos os reembolsos em aberto — de todos os meses</p>
              </div>

              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px,1fr))', gap:12, marginBottom:24}}>
                <div className="metric-card">
                  <div className="label">Total pendente</div>
                  <div className="value" style={{color:'var(--red)'}}>{fmt(totalPendGeral)}</div>
                </div>
                <div className="metric-card">
                  <div className="label">Quantidade</div>
                  <div className="value">{pendentes.length}</div>
                </div>
              </div>

              <div className="card" style={{overflow:'hidden'}}>
                <div style={{overflowX:'auto'}}>
                  <table>
                    <thead><tr>
                      <th>Data</th><th>Mês ref.</th><th>Estabelecimento</th>
                      <th>Titular</th><th style={{textAlign:'right'}}>Valor</th><th>Ações</th>
                    </tr></thead>
                    <tbody>
                      {pendentes.length === 0 ? (
                        <tr><td colSpan={6} style={{textAlign:'center', padding:32, color:'var(--text2)'}}>
                          Nenhum pendente! 🎉
                        </td></tr>
                      ) : pendentes.map(l => (
                        <tr key={l.id}>
                          <td style={{whiteSpace:'nowrap', color:'var(--text2)', fontSize:12}}>{l.data}</td>
                          <td style={{fontSize:12}}>{l.mes_referencia}</td>
                          <td><span style={{fontWeight:500}}>{l.estabelecimento}</span></td>
                          <td style={{fontSize:12}}>{l.nome_terceiro || l.titular}</td>
                          <td style={{textAlign:'right', fontWeight:500, color:'var(--red)', whiteSpace:'nowrap'}}>{fmt(l.valor)}</td>
                          <td>
                            <button className="btn" style={{padding:'4px 10px', fontSize:11, color:'var(--green)'}}
                              onClick={() => handleReembolso(l)}>✔ Marcar reembolsado</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── LANÇAMENTOS ── */}
          {view === 'lancamentos' && (
            <div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12}}>
                <div>
                  <h1 style={{fontFamily:'var(--font-display)', fontSize:28, fontWeight:400}}>Lançamentos</h1>
                  <p style={{color:'var(--text2)', fontSize:13}}>{filtered.length} registros</p>
                </div>
                <button className="btn btn-primary" onClick={exportar}>↓ Exportar Excel</button>
              </div>

              {/* Filtros */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12, color:'var(--text2)', marginBottom:8}}>Meses:</div>
                <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:12}}>
                  <button className="btn" style={{fontSize:12, padding:'4px 12px',
                    background: mesesSel.length === 0 ? 'var(--brand)' : 'var(--surface)',
                    color: mesesSel.length === 0 ? 'white' : 'var(--text)'}}
                    onClick={() => setMesesSel([])}>Todos</button>
                  {meses.map(m => (
                    <button key={m} className="btn" style={{fontSize:12, padding:'4px 12px',
                      background: mesesSel.includes(m) ? 'var(--brand)' : 'var(--surface)',
                      color: mesesSel.includes(m) ? 'white' : 'var(--text)'}}
                      onClick={() => toggleMes(m)}>{m}</button>
                  ))}
                </div>
                <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
                  <select value={filterTitular} onChange={e => setFilterTitular(e.target.value)} style={{width:180}}>
                    <option value="">Todos os titulares</option>
                    {titulares.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={{width:140}}>
                    <option value="">Todos os tipos</option>
                    <option value="Pessoal">Pessoal</option>
                    <option value="Empresa">Empresa</option>
                  </select>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{width:160}}>
                    <option value="">Todos os status</option>
                    <option value="⏳ PENDENTE">⏳ Pendente</option>
                    <option value="✔ REEMBOLSADO">✔ Reembolsado</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
              </div>

              <div className="card" style={{overflow:'hidden'}}>
                <div style={{overflowX:'auto'}}>
                  <table>
                    <thead><tr>
                      <th>Data</th><th>Cartão</th><th>Titular</th>
                      <th>Estabelecimento</th><th style={{textAlign:'right'}}>Valor</th>
                      <th>Tipo</th><th>Anotação</th><th>Status</th><th>Ações</th>
                    </tr></thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={9} style={{textAlign:'center', padding:32, color:'var(--text2)'}}>
                          <span className="spinner" style={{marginRight:8}} />Carregando...
                        </td></tr>
                      ) : filtered.map(l => (
                        <tr key={l.id}>
                          <td style={{whiteSpace:'nowrap', color:'var(--text2)', fontSize:12}}>{l.data}</td>
                          <td style={{fontSize:11, color:'var(--text2)', whiteSpace:'nowrap'}}>{l.cartao}</td>
                          <td style={{fontSize:12, whiteSpace:'nowrap'}}>{l.titular}</td>
                          <td>
                            <span style={{fontWeight:500}}>{l.estabelecimento}</span><br/>
                            <span style={{fontSize:11, color:'var(--text2)'}}>{l.descricao}</span>
                          </td>
                          <td style={{textAlign:'right', fontWeight:500, whiteSpace:'nowrap'}}>{fmt(l.valor)}</td>
                          <td>{tipoBadge(l.tipo, l.cobranca_terceiros)}</td>
                          <td>
                            <input
                              key={l.id}
                              defaultValue={l.obs || ''}
                              placeholder="Anotação..."
                              style={{width:160, fontSize:12, padding:'3px 8px', border:'1px solid var(--border)', borderRadius:6, background:'var(--surface2)', color:'var(--text)'}}
                              onBlur={async e => {
                                const val = e.target.value
                                if (val === (l.obs || '')) return
                                const updated = {...l, obs: val}
                                await fetch('/api/lancamentos', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(updated) })
                                setLancamentos(prev => prev.map(x => x.id === l.id ? updated : x))
                              }}
                            />
                          </td>
                          <td>{statusBadge(l)}</td>
                          <td>
                            <div style={{display:'flex', gap:4}}>
                              <button className="btn" style={{padding:'4px 8px', fontSize:11}} onClick={() => setEditRow(l)}>Editar</button>
                              <button className="btn" style={{padding:'4px 8px', fontSize:11, color:'var(--red)'}} onClick={() => handleDelete(l.id!)}>✕</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── REGRAS ── */}
          {view === 'regras' && <RegrasView />}
        </main>
      </div>

      {/* Modal edição */}
      {editRow && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100}}>
          <div className="card" style={{width:520, padding:24, maxHeight:'90vh', overflowY:'auto'}}>
            <h2 style={{fontWeight:500, marginBottom:20}}>Editar lançamento</h2>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
              {[
                ['data','Data'],['estabelecimento','Estabelecimento'],
                ['descricao','Descrição/Categoria'],['titular','Titular'],
                ['cartao','Cartão'],['obs','Observações'],
              ].map(([field, label]) => (
                <label key={field} style={{display:'flex', flexDirection:'column', gap:4, fontSize:12, color:'var(--text2)'}}>
                  {label}
                  <input value={(editRow as any)[field] || ''} onChange={e => setEditRow({...editRow, [field]: e.target.value})} />
                </label>
              ))}
              <label style={{display:'flex', flexDirection:'column', gap:4, fontSize:12, color:'var(--text2)'}}>
                Valor
                <input type="number" value={editRow.valor || ''} onChange={e => setEditRow({...editRow, valor: parseFloat(e.target.value)})} />
              </label>
              <label style={{display:'flex', flexDirection:'column', gap:4, fontSize:12, color:'var(--text2)'}}>
                Tipo
                <select value={editRow.tipo} onChange={e => setEditRow({...editRow, tipo: e.target.value})}>
                  <option>Pessoal</option><option>Empresa</option><option>Misto</option>
                </select>
              </label>
              <label style={{display:'flex', flexDirection:'column', gap:4, fontSize:12, color:'var(--text2)'}}>
                Cobrança para terceiros?
                <select value={editRow.cobranca_terceiros} onChange={e => setEditRow({...editRow, cobranca_terceiros: e.target.value})}>
                  <option>Não</option><option>Sim</option>
                </select>
              </label>
              <label style={{display:'flex', flexDirection:'column', gap:4, fontSize:12, color:'var(--text2)'}}>
                Nome do terceiro
                <input value={editRow.nome_terceiro || ''} onChange={e => setEditRow({...editRow, nome_terceiro: e.target.value})} />
              </label>
              <label style={{display:'flex', flexDirection:'column', gap:4, fontSize:12, color:'var(--text2)'}}>
                Data reembolso
                <input value={editRow.data_reembolso || ''} onChange={e => setEditRow({...editRow, data_reembolso: e.target.value})} />
              </label>
            </div>
            <div style={{display:'flex', gap:8, marginTop:20, justifyContent:'flex-end'}}>
              <button className="btn" onClick={() => setEditRow(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RegrasView() {
  const [regras, setRegras]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [nova, setNova]       = useState({ palavra_chave:'', descricao:'', tipo:'Pessoal', descontar_de:'Pessoal', cobranca_terceiros:'Não' })

  useEffect(() => {
    import('../../lib/supabase').then(({ supabase }) => {
      supabase.from('regras').select('*').order('palavra_chave').then(({ data }) => {
        setRegras(data || [])
        setLoading(false)
      })
    })
  }, [])

  async function addRegra() {
    if (!nova.palavra_chave.trim()) return
    const { supabase } = await import('../../lib/supabase')
    const { data } = await supabase.from('regras').insert(nova).select()
    setRegras(prev => [...prev, ...(data||[])])
    setNova({ palavra_chave:'', descricao:'', tipo:'Pessoal', descontar_de:'Pessoal', cobranca_terceiros:'Não' })
  }

  async function delRegra(id: string) {
    const { supabase } = await import('../../lib/supabase')
    await supabase.from('regras').delete().eq('id', id)
    setRegras(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontFamily:'var(--font-display)', fontSize:28, fontWeight:400}}>Regras automáticas</h1>
        <p style={{color:'var(--text2)', fontSize:13}}>Palavras-chave para classificar lançamentos automaticamente</p>
      </div>
      <div className="card" style={{padding:20, marginBottom:20}}>
        <div style={{fontWeight:500, marginBottom:14, fontSize:13}}>Nova regra</div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr auto', gap:10, alignItems:'end'}}>
          <label style={{display:'flex', flexDirection:'column', gap:4, fontSize:12, color:'var(--text2)'}}>
            Palavra-chave
            <input placeholder="Ex: AMAZON" value={nova.palavra_chave} onChange={e => setNova({...nova, palavra_chave: e.target.value.toUpperCase()})} />
          </label>
          <label style={{display:'flex', flexDirection:'column', gap:4, fontSize:12, color:'var(--text2)'}}>
            Categoria
            <input placeholder="Ex: Compras online" value={nova.descricao} onChange={e => setNova({...nova, descricao: e.target.value})} />
          </label>
          <label style={{display:'flex', flexDirection:'column', gap:4, fontSize:12, color:'var(--text2)'}}>
            Tipo
            <select value={nova.tipo} onChange={e => setNova({...nova, tipo: e.target.value})}>
              <option>Pessoal</option><option>Empresa</option><option>Misto</option>
            </select>
          </label>
          <label style={{display:'flex', flexDirection:'column', gap:4, fontSize:12, color:'var(--text2)'}}>
            Descontar de
            <input value={nova.descontar_de} onChange={e => setNova({...nova, descontar_de: e.target.value})} />
          </label>
          <label style={{display:'flex', flexDirection:'column', gap:4, fontSize:12, color:'var(--text2)'}}>
            Cobrança 3º?
            <select value={nova.cobranca_terceiros} onChange={e => setNova({...nova, cobranca_terceiros: e.target.value})}>
              <option>Não</option><option>Sim</option>
            </select>
          </label>
          <button className="btn btn-primary" onClick={addRegra} style={{height:36, alignSelf:'end'}}>+ Add</button>
        </div>
      </div>
      <div className="card" style={{overflow:'hidden'}}>
        <table>
          <thead><tr>
            <th>Palavra-chave</th><th>Categoria</th><th>Tipo</th><th>Descontar de</th><th>Cobrança 3º</th><th></th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{textAlign:'center', padding:24, color:'var(--text2)'}}>Carregando...</td></tr>
            ) : regras.map(r => (
              <tr key={r.id}>
                <td><span style={{fontWeight:600, fontFamily:'monospace', fontSize:12, background:'var(--surface2)', padding:'2px 6px', borderRadius:4}}>{r.palavra_chave}</span></td>
                <td style={{color:'var(--text2)', fontSize:13}}>{r.descricao}</td>
                <td>{r.tipo === 'Empresa' ? <span className="badge badge-empresa">Empresa</span> : <span className="badge badge-pessoal">Pessoal</span>}</td>
                <td style={{fontSize:13}}>{r.descontar_de}</td>
                <td style={{fontSize:13}}>{r.cobranca_terceiros}</td>
                <td><button className="btn" style={{padding:'4px 8px', fontSize:11, color:'var(--red)'}} onClick={() => delRegra(r.id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
