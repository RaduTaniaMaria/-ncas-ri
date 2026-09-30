'use strict';
const $=s=>document.querySelector(s),pad=n=>String(n).padStart(2,'0'),iso=(y,m,d)=>`${y}-${pad(m+1)}-${pad(d)}`,parse=s=>s.split('-').map(Number);
const today=()=>{const d=new Date();return iso(d.getFullYear(),d.getMonth(),d.getDate())};
// luni calendaristice: 31 ian + 1 lună = 28/29 feb (ultima zi validă)
function addMonths(s,n){const[y,m,d]=parse(s),t=y*12+m-1+n,Y=Math.floor(t/12),M=t%12;return iso(Y,M,Math.min(d,new Date(Y,M+1,0).getDate()))}
function addDays(s,n){const[y,m,d]=parse(s),x=new Date(y,m-1,d+n);return iso(x.getFullYear(),x.getMonth(),x.getDate())}
const MO=['ianuarie','februarie','martie','aprilie','mai','iunie','iulie','august','septembrie','octombrie','noiembrie','decembrie'];
const fmtD=s=>{const[y,m,d]=parse(s);return `${d} ${MO[m-1]} ${y}`};
const fmtM=(a,c)=>new Intl.NumberFormat('ro-RO',{style:'currency',currency:c,minimumFractionDigits:0,maximumFractionDigits:2}).format(a);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const CUR=['RON','EUR','USD','GBP'],FM={m1:1,m3:3,m6:6,y:12},FL={m1:'Lunar',m3:'La 3 luni',m6:'La 6 luni',y:'Anual'},DRE=/^\d{4}-\d{2}-\d{2}$/;
const fl=c=>c.freq==='c'?`${c.months} ${c.months==1?'lună':'luni'}`:FL[c.freq];
const sum=l=>{const m={};l.forEach(p=>m[p.currency]=(m[p.currency]||0)+p.amount);const k=Object.keys(m);return k.length?k.map(c=>fmtM(m[c],c)).join(' + '):fmtM(0,'RON')};

const DB={open(){return new Promise((ok,no)=>{const r=indexedDB.open('incasari',1);r.onupgradeneeded=()=>{['clients','payments'].forEach(s=>r.result.createObjectStore(s,{keyPath:'id'}));r.result.createObjectStore('meta',{keyPath:'k'})};r.onsuccess=()=>{this.db=r.result;ok()};r.onerror=()=>no(r.error)})},
 all(s){return new Promise((ok,no)=>{const q=this.db.transaction(s).objectStore(s).getAll();q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)})},
 tx(ops){return new Promise((ok,no)=>{const t=this.db.transaction([...new Set(ops.map(o=>o[0]))],'readwrite');ops.forEach(([s,a,v])=>t.objectStore(s)[a](v));t.oncomplete=ok;t.onerror=()=>no(t.error);t.onabort=()=>no(t.error)})}};
let S={clients:[],payments:[],set:{}},hm,cal,q='',imp;
async function load(){S.clients=await DB.all('clients');S.payments=await DB.all('payments');const m=(await DB.all('meta')).find(x=>x.k==='settings');S.set=Object.assign({notif:false,rem:[0]},m&&m.v)}
async function commit(ops){await DB.tx(ops);ops.forEach(([s,a,v])=>{const r=S[s];if(!r)return;if(a==='put'){const i=r.findIndex(x=>x.id===v.id);i<0?r.push(v):r[i]=v}else S[s]=r.filter(x=>x.id!==v)});render()}
const saveSet=()=>DB.tx([['meta','put',{k:'settings',v:S.set}]]);

const ST={paid:['🟢','Plătit'],overdue:['🔴','Restant'],dueToday:['🟠','Scadent azi'],upcoming:['⚪','În curând']};
const stat=p=>p.paidDate?'paid':p.scheduled<today()?'overdue':p.scheduled===today()?'dueToday':'upcoming';
const badge=p=>`<span class="b ${stat(p)}">${ST[stat(p)][0]} ${ST[stat(p)][1]}</span>`;
const cl=id=>S.clients.find(c=>c.id===id),cpay=id=>S.payments.filter(p=>p.clientId===id).sort((a,b)=>b.scheduled.localeCompare(a.scheduled));
const pending=id=>cpay(id).filter(p=>!p.paidDate).pop();
const mkPay=(c,k)=>({id:uid(),clientId:c.id,amount:c.amount,currency:c.currency,scheduled:addMonths(c.anchor,c.months*k),paidDate:null,k});
const nextOps=(c,p)=>cpay(c.id).some(x=>!x.paidDate&&x.id!==p.id)?[]:[['payments','put',mkPay(c,p.k+1)]];
const row=(p,sub)=>{const c=cl(p.clientId);return `<a class="row" href="#/client/${p.clientId}"><div><b>${esc(c?.name)}</b>${sub?`<small>${sub}</small>`:''}</div><div class="r"><b>${fmtM(p.amount,p.currency)}</b>${badge(p)}</div></a>`};
const empty=m=>`<div class="empty"><p>${m}</p><button class="btn" data-a="new">+ Adaugă primul client</button></div>`;
const byDate=(a,b)=>a.scheduled.localeCompare(b.scheduled);
const group=l=>{let d='',h='';l.forEach(p=>{if(p.scheduled!==d){d=p.scheduled;h+=`<h2>${fmtD(d)}</h2>`}h+=row(p)});return h};

function vHome(){
 if(!S.clients.length)return empty('Nu ai încă niciun client.');
 const pre=`${hm.y}-${pad(hm.m+1)}`,L=S.payments.filter(p=>p.scheduled.startsWith(pre)).sort(byDate),cur=pre===today().slice(0,7);
 const old=cur?S.payments.filter(p=>!p.paidDate&&p.scheduled<pre+'-01').sort(byDate):[];
 return `<div class="bar"><h1>${MO[hm.m].toUpperCase()} ${hm.y}</h1><div><button class="chip" data-a="hm" data-n="-1">‹</button> <button class="chip" data-a="hm" data-n="0">Azi</button> <button class="chip" data-a="hm" data-n="1">›</button></div></div>
 <div class="sum"><div><small>De încasat</small><b>${sum(L)}</b></div><div><small>Încasat</small><b>${sum(L.filter(p=>p.paidDate))}</b></div><div><small>Restant</small><b style="color:var(--red)">${sum(L.filter(p=>stat(p)==='overdue'))}</b></div></div>
 ${old.length?`<h2 style="color:var(--red)">Restante din luni anterioare · ${sum(old)}</h2>`+old.map(p=>row(p,fmtD(p.scheduled))).join(''):''}
 ${L.length?(L.every(p=>p.paidDate)&&!old.length?'<div class="ok">Totul este în regulă.</div>':'')+group(L):(old.length?'':'<p class="empty mu">Nu ai plăți programate.</p>')}`}

function vClients(){return `<div class="bar"><h1>Clienți</h1><button class="btn s" data-a="new">+ Client</button></div>${S.clients.length?`<input id="q" type="search" placeholder="Caută client..." value="${esc(q)}" style="margin:10px 0"><div id="cl">${clList()}</div>`:empty('Nu ai încă niciun client.')}`}
function clList(){return S.clients.filter(c=>c.name.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>{const p=pending(c.id);return `<a class="row" href="#/client/${c.id}"><div><b>${esc(c.name)}</b><small>${fmtM(c.amount,c.currency)} · ${fl(c)}</small>${p?`<small>Următoarea plată: ${fmtD(p.scheduled)}</small>`:''}</div><div class="r">${p?badge(p):''}</div></a>`}).join('')||'<p class="mu">Niciun rezultat.</p>'}

function vClient(id){const c=cl(id);if(!c)return '<p>Client inexistent. <a href="#/clients">Înapoi</a></p>';
 const ps=cpay(id),pe=pending(id),last=ps.find(p=>p.paidDate);
 return `<a href="#/clients" class="mu">‹ Clienți</a><div class="bar"><h1>${esc(c.name)}</h1><button class="btn g s" data-a="edit" data-id="${id}">Editează</button></div>
 <h1 style="font-size:34px">${fmtM(c.amount,c.currency)}</h1>
 <div class="card"><small>Frecvență</small><div>${fl(c)}</div><br><small>Ultima plată</small><div>${fmtD(last?last.scheduled:c.anchor)}</div><br><small>Următoarea plată</small><div>${pe?fmtD(pe.scheduled):'—'}</div><br><small>Status</small><div>${pe?badge(pe):''}</div></div>
 ${pe?`<button class="btn big" data-a="paid" data-id="${pe.id}">✓ AM PRIMIT PLATA</button>`:''}
 ${[c.phone&&`<a href="tel:${esc(c.phone)}">📞 ${esc(c.phone)}</a>`,c.email&&`<a href="mailto:${esc(c.email)}">✉️ ${esc(c.email)}</a>`,c.notes&&`<span class="mu">${esc(c.notes)}</span>`].filter(Boolean).map(x=>`<div class="card">${x}</div>`).join('')}
 <h2>Istoric plăți</h2>${ps.map(p=>`<button class="row" data-a="editpay" data-id="${p.id}"><div><b>${fmtD(p.scheduled)}</b><small>${p.paidDate?'Primit efectiv: '+fmtD(p.paidDate):'Așteptată'}</small></div><div class="r"><b>${fmtM(p.amount,p.currency)}</b>${badge(p)}</div></button>`).join('')}
 <button class="btn d s" data-a="del" data-id="${id}" style="margin-top:20px">Șterge clientul</button>`}

const CF={all:'Toate',unpaid:'Neplătite',paid:'Plătite',overdue:'Restante'};
const fm=(p,f)=>f==='all'||(f==='unpaid'&&!p.paidDate)||(f==='paid'&&p.paidDate)||(f==='overdue'&&stat(p)==='overdue');
function vCal(){const{y,m,f,sel}=cal,pre=`${y}-${pad(m+1)}`,off=(new Date(y,m,1).getDay()+6)%7,n=new Date(y,m+1,0).getDate();
 let g=['Lu','Ma','Mi','Jo','Vi','Sâ','Du'].map(d=>`<small>${d}</small>`).join('')+'<i></i>'.repeat(off).replace(/<i><\/i>/g,'<button class="day x"></button>');
 for(let d=1;d<=n;d++){const s=iso(y,m,d),l=S.payments.filter(p=>p.scheduled===s&&fm(p,f));
  const k=!l.length?'':l.some(p=>stat(p)==='overdue')?'overdue':l.every(p=>p.paidDate)?'paid':'';
  g+=`<button class="day${s===today()?' t':''}${s===sel?' sel':''}" data-a="day" data-d="${s}">${d}${l.length?`<span class="dot ${k}"></span>`:''}</button>`}
 const dl=sel?S.payments.filter(p=>p.scheduled===sel&&fm(p,f)):[];
 return `<div class="bar"><h1>${MO[m]} ${y}</h1><div><button class="chip" data-a="cm" data-n="-1">‹</button> <button class="chip" data-a="cm" data-n="0">Azi</button> <button class="chip" data-a="cm" data-n="1">›</button></div></div>
 <div class="chips">${Object.entries(CF).map(([k,v])=>`<button class="chip${k===f?' on':''}" data-a="cf" data-f="${k}">${v}</button>`).join('')}</div><div class="cal">${g}</div>
 ${sel?`<h2>${fmtD(sel)}</h2>${dl.map(p=>row(p)).join('')||'<p class="mu">Nicio plată în această zi.</p>'}${dl.length?`<p><b>Total: ${sum(dl)}</b></p>`:''}`:''}`}

function vSet(){return `<h1>Setări</h1><h2>Notificări</h2><div class="card"><label class="ck"><input type="checkbox" data-s="notif" ${S.set.notif?'checked':''}> Notificări ON</label>
 ${[[0,'În ziua plății'],[1,'1 zi înainte'],[3,'3 zile înainte'],[7,'7 zile înainte']].map(([v,t])=>`<label class="ck"><input type="checkbox" data-s="rem" value="${v}" ${S.set.rem.includes(v)?'checked':''}> ${t}</label>`).join('')}
 <small>Fără server, notificările apar doar când aplicația este deschisă (sau repornită) în ziua respectivă. Pe iPhone funcționează doar după „Add to Home Screen".</small></div>
 <h2>Date</h2><div class="acts"><button class="btn" data-a="export">Exportă datele</button><button class="btn g" onclick="$('#file').click()">Importă datele</button><button class="btn g" data-a="csv">Exportă CSV</button></div>
 <input id="file" type="file" accept="application/json,.json" hidden><p class="mu">Datele sunt doar pe acest dispozitiv. Fă backup periodic.</p>`}

const ROUTES=[['#/','🏠','Acasă'],['#/clients','👥','Clienți'],['#/calendar','📅','Calendar'],['#/settings','⚙️','Setări']];
function render(){const h=location.hash||'#/',cm=h.match(/^#\/client\/(.+)/);let v;
 if(cm)v=vClient(cm[1]);else v=h==='#/clients'?vClients():h==='#/calendar'?vCal():h==='#/settings'?vSet():vHome();
 $('#nav').innerHTML=ROUTES.map(([r,i,t])=>`<a href="${r}" class="${h===r||(r==='#/clients'&&cm)?'on':''}"><span>${i}</span>${t}</a>`).join('');
 const y=window.scrollY;$('#view').innerHTML=v;window.scrollTo(0,y)}

// dialoguri
const dlg=$('#dlg'),open=h=>{dlg.innerHTML=h;if(!dlg.open)dlg.showModal()},err=m=>{const e=$('#ferr');if(e)e.textContent=m};
const msg=(t,m)=>open(`<h3>${t}</h3><p>${esc(m)}</p><div class="acts"><button class="btn" data-a="close">OK</button></div>`);
const cancel='<button type="button" class="btn g" data-a="close">Anulează</button>';
function clientForm(id){const c=id?cl(id):{currency:'RON',freq:'m1',months:1,ref:today()};let ref=today();
 if(id){const l=cpay(id).find(p=>p.paidDate);ref=l?l.scheduled:c.anchor}
 const o=(a,v)=>a.map(x=>`<option ${x[0]===v?'selected':''} value="${x[0]}">${x[1]}</option>`).join('');
 open(`<h3>${id?'Editează clientul':'Client nou'}</h3><form data-f="client"><input type="hidden" name="id" value="${id||''}"><input type="hidden" name="ref0" value="${ref}">
 <label>Nume</label><input name="name" value="${esc(c.name)}" required>
 <label>Sumă</label><input name="amount" inputmode="decimal" value="${c.amount??''}" required>
 <label>Monedă</label><select name="cur">${CUR.map(x=>`<option ${x===c.currency?'selected':''}>${x}</option>`).join('')}</select>
 <label>Data ultimei plăți / de referință</label><input type="date" name="ref" value="${ref}" required><small>Prima scadență = această dată + frecvența.</small>
 <label>Frecvență</label><select name="freq">${o([...Object.entries(FL),['c','Personalizat']],c.freq)}</select>
 <div id="cm" style="display:${c.freq==='c'?'block':'none'}"><label>Număr de luni</label><input type="number" name="months" min="1" max="120" value="${c.months}"></div>
 <label>Telefon (opțional)</label><input name="phone" type="tel" value="${esc(c.phone)}"><label>Email (opțional)</label><input name="email" type="email" value="${esc(c.email)}">
 <label>Notițe (opțional)</label><textarea name="notes" rows="3">${esc(c.notes)}</textarea><div id="ferr"></div>
 <div class="acts"><button class="btn">Salvează</button>${cancel}</div></form>`)}
const forms={
 async client(f){const id=f.get('id'),name=f.get('name').trim(),amount=parseFloat(String(f.get('amount')).replace(',','.')),ref=f.get('ref'),fr=f.get('freq'),months=FM[fr]||parseInt(f.get('months'));
  if(!name||!(amount>0)||!DRE.test(ref)||!(months>=1))return err('Completează numele, suma (>0), data și frecvența.');
  const base={name,amount,currency:f.get('cur'),freq:fr,months,phone:f.get('phone').trim(),email:f.get('email').trim(),notes:f.get('notes').trim()};
  if(!id){const c={id:uid(),...base,anchor:ref,createdAt:new Date().toISOString()};await commit([['clients','put',c],['payments','put',mkPay(c,1)]]);dlg.close();location.hash='#/client/'+c.id;return}
  const c=cl(id),pe=pending(id),ref0=f.get('ref0'),re=months!==c.months||ref!==ref0,ops=[];
  Object.assign(c,base);ops.push(['clients','put',c]);
  if(pe){pe.amount=amount;pe.currency=c.currency;if(re){c.anchor=ref===ref0?ref0:ref;pe.k=1;pe.scheduled=addMonths(c.anchor,months)}ops.push(['payments','put',pe])}
  await commit(ops);dlg.close()},
 async paid(f){const p=S.payments.find(x=>x.id===f.get('id')),d=f.get('date');if(!DRE.test(d))return err('Alege data.');p.paidDate=d;await commit([['payments','put',p],...nextOps(cl(p.clientId),p)]);dlg.close()},
 async pay(f){const p=S.payments.find(x=>x.id===f.get('id')),c=cl(p.clientId),a=parseFloat(String(f.get('amount')).replace(',','.')),s=f.get('sched'),paid=f.get('paid')==='on',pd=f.get('pd');
  if(!(a>0)||!DRE.test(s)||(paid&&!DRE.test(pd)))return err('Verifică datele introduse.');
  p.amount=a;p.scheduled=s;p.paidDate=paid?pd:null;const ops=[['payments','put',p]];
  if(paid)ops.push(...nextOps(c,p));else S.payments.filter(x=>x.clientId===c.id&&!x.paidDate&&x.id!==p.id&&x.scheduled>s).forEach(x=>ops.push(['payments','delete',x.id]));
  await commit(ops);dlg.close()}};

const download=(name,type,text)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove()};
function validate(d){const bad=m=>{throw new Error(m)};if(!d||d.app!=='incasari'||!Array.isArray(d.clients)||!Array.isArray(d.payments))bad('Fișierul nu este un backup valid Încasări.');
 const ids=new Set();d.clients.forEach((c,i)=>{if(!c||typeof c.id!=='string'||typeof c.name!=='string'||!(c.amount>0)||!CUR.includes(c.currency)||!DRE.test(c.anchor)||!(c.months>=1))bad(`Client invalid (nr. ${i+1}).`);ids.add(c.id)});
 d.payments.forEach((p,i)=>{if(!p||typeof p.id!=='string'||!ids.has(p.clientId)||!(p.amount>0)||!DRE.test(p.scheduled)||(p.paidDate&&!DRE.test(p.paidDate)))bad(`Plată invalidă (nr. ${i+1}).`)})}
const csv=()=>{const e=v=>`"${String(v??'').replace(/"/g,'""')}"`,r=[['Client','Sumă','Monedă','Frecvență','Telefon','Email','Data programată','Data efectivă','Status']];
 S.clients.forEach(c=>{const l=cpay(c.id);(l.length?l:[null]).forEach(p=>r.push([c.name,p?p.amount:c.amount,c.currency,fl(c),c.phone,c.email,p?.scheduled,p?.paidDate,p?ST[stat(p)][1]:'']))});
 download('incasari.csv','text/csv','\ufeff'+r.map(x=>x.map(e).join(',')).join('\n'))};

const actions={
 hm(d){const n=+d.n,t=new Date();hm=n?(x=>({y:Math.floor(x/12),m:x%12}))(hm.y*12+hm.m+n):{y:t.getFullYear(),m:t.getMonth()};render()},
 cm(d){const n=+d.n,t=new Date();if(n)cal=Object.assign(cal,(x=>({y:Math.floor(x/12),m:x%12}))(cal.y*12+cal.m+n));else Object.assign(cal,{y:t.getFullYear(),m:t.getMonth(),sel:today()});render()},
 cf(d){cal.f=d.f;render()},day(d){cal.sel=d.d;render()},new(){clientForm()},edit(d){clientForm(d.id)},close(){dlg.close()},csv,
 export(){download('incasari-backup.json','application/json',JSON.stringify({app:'incasari',version:1,exportedAt:new Date().toISOString(),clients:S.clients,payments:S.payments,settings:S.set},null,1))},
 paid(d){open(`<h3>Am primit plata</h3><form data-f="paid"><input type="hidden" name="id" value="${d.id}"><label>Data primirii efective</label><input type="date" name="date" value="${today()}" required><div id="ferr"></div><div class="acts"><button class="btn">Confirmă</button>${cancel}</div></form>`)},
 editpay(d){const p=S.payments.find(x=>x.id===d.id);open(`<h3>Plată</h3><form data-f="pay"><input type="hidden" name="id" value="${p.id}"><label>Sumă (${p.currency})</label><input name="amount" inputmode="decimal" value="${p.amount}"><label>Data programată</label><input type="date" name="sched" value="${p.scheduled}"><label class="ck" style="margin-top:14px"><input type="checkbox" name="paid" ${p.paidDate?'checked':''}> Plătit</label><label>Data efectivă</label><input type="date" name="pd" value="${p.paidDate||today()}"><div id="ferr"></div><div class="acts"><button class="btn">Salvează</button>${cancel}</div></form>`)},
 del(d){open(`<h3>Sigur vrei să ștergi clientul și istoricul lui?</h3><div class="acts"><button class="btn d" data-a="del2" data-id="${d.id}">Șterge</button>${cancel}</div>`)},
 async del2(d){await commit([['clients','delete',d.id],...S.payments.filter(p=>p.clientId===d.id).map(p=>['payments','delete',p.id])]);dlg.close();location.hash='#/clients'},
 async imp(){const d=imp;await DB.tx([['clients','clear'],['payments','clear'],...d.clients.map(c=>['clients','put',c]),...d.payments.map(p=>['payments','put',p])]);await load();dlg.close();render()}};
document.addEventListener('click',e=>{const t=e.target.closest('[data-a]');if(t&&actions[t.dataset.a])actions[t.dataset.a](t.dataset)});
document.addEventListener('submit',e=>{e.preventDefault();forms[e.target.dataset.f]?.(new FormData(e.target))});
document.addEventListener('input',e=>{if(e.target.id==='q'){q=e.target.value;$('#cl').innerHTML=clList()}});
document.addEventListener('change',async e=>{const t=e.target;
 if(t.name==='freq'){$('#cm').style.display=t.value==='c'?'block':'none'}
 if(t.id==='file'&&t.files[0]){try{const d=JSON.parse(await t.files[0].text());validate(d);imp=d;open(`<h3>Importă datele</h3><p>Importul înlocuiește datele curente cu ${d.clients.length} clienți și ${d.payments.length} plăți. Continui?</p><div class="acts"><button class="btn" data-a="imp">Importă</button>${cancel}</div>`)}catch(x){msg('Import eșuat',x instanceof SyntaxError?'Fișierul nu este un JSON valid.':x.message)}t.value=''}
 if(t.dataset.s==='rem'){S.set.rem=[...document.querySelectorAll('[data-s=rem]:checked')].map(x=>+x.value);saveSet()}
 if(t.dataset.s==='notif'){if(t.checked){if(!('Notification'in window)){t.checked=false;return msg('Indisponibil','Acest browser nu suportă notificări. Aplicația funcționează normal fără ele.')}
  if(await Notification.requestPermission()!=='granted'){t.checked=false;return msg('Permisiune refuzată','Permite notificările din setările browserului/dispozitivului.')}}
  S.set.notif=t.checked;saveSet();remind()}});

async function remind(){if(!S.set.notif||!('Notification'in window)||Notification.permission!=='granted')return;
 const td=today(),done=S.set.done||(S.set.done={});
 for(const k in done)if(!k.endsWith(td))delete done[k];
 for(const p of S.payments){if(p.paidDate)continue;for(const o of S.set.rem){const k=`${p.id}:${o}:${td}`;if(addDays(p.scheduled,-o)!==td||done[k])continue;done[k]=1;
  const c=cl(p.clientId),t=`${c.name} — ${fmtM(p.amount,p.currency)}`,b=o?`Scadent în ${o} ${o==1?'zi':'zile'}`:'Scadent azi',reg=await navigator.serviceWorker?.getRegistration();
  reg?reg.showNotification(t,{body:b,icon:'icons/icon-192.png'}):new Notification(t,{body:b})}}
 saveSet()}

(async()=>{const t=new Date();hm={y:t.getFullYear(),m:t.getMonth()};cal={y:t.getFullYear(),m:t.getMonth(),f:'all',sel:today()};
 try{await DB.open();await load()}catch(x){document.body.innerHTML='<p style="padding:20px">Stocarea locală (IndexedDB) nu este disponibilă în acest browser.</p>';return}
 window.addEventListener('hashchange',()=>{window.scrollTo(0,0);render()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();remind()}});
 render();remind();
 if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{})})();
