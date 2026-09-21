const STORAGE_KEY = 'personal_finance_dashboard_v1';

const seed = [
  {id:1,type:'income',name:'Gaji bulanan',category:'Gaji',amount:6000000,date:'2026-09-01'},
  {id:2,type:'expense',name:'Sewa / kos',category:'Tagihan',amount:1800000,date:'2026-09-02'},
  {id:3,type:'expense',name:'Belanja mingguan',category:'Belanja',amount:450000,date:'2026-09-05'},
  {id:4,type:'expense',name:'Transportasi',category:'Transportasi',amount:260000,date:'2026-09-07'},
  {id:5,type:'expense',name:'Makan & kopi',category:'Makanan',amount:375000,date:'2026-09-10'},
  {id:6,type:'expense',name:'Streaming',category:'Hiburan',amount:120000,date:'2026-09-12'},
  {id:7,type:'income',name:'Freelance',category:'Freelance',amount:850000,date:'2026-09-15'},
  {id:8,type:'expense',name:'Belanja kebutuhan',category:'Belanja',amount:320000,date:'2026-09-17'}
];

const budgets = [
  {name:'Makanan',limit:1000000},
  {name:'Transportasi',limit:500000},
  {name:'Belanja',limit:800000},
  {name:'Hiburan',limit:300000},
  {name:'Tagihan',limit:2200000}
];

let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || seed;

const money = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n||0);
const isoToday = new Date().toISOString().slice(0,10);

function saveData(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }

function withinPeriod(t){
  const p = document.getElementById('period').value;
  if(p==='all') return true;
  const now = new Date();
  const d = new Date(t.date+'T12:00:00');
  if(p==='month') return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth();
  const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth()-3);
  return d >= cutoff && d <= now;
}

function filtered(){ return transactions.filter(withinPeriod); }

function fmtDate(s){ return new Date(s+'T12:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}); }

function totals(list){
  const income = list.filter(x=>x.type==='income').reduce((a,b)=>a+b.amount,0);
  const expense = list.filter(x=>x.type==='expense').reduce((a,b)=>a+b.amount,0);
  return {income,expense,balance:income-expense};
}

function renderMetrics(){
  const list = filtered(), t = totals(list);
  document.getElementById('balance').textContent = money(t.balance);
  document.getElementById('income').textContent = money(t.income);
  document.getElementById('expense').textContent = money(t.expense);
  const rate = t.income ? Math.max(-999, Math.round((t.balance/t.income)*100)) : 0;
  document.getElementById('savingRate').textContent = rate + '%';

  const all = totals(transactions);
  const base = all.income || 1;
  document.getElementById('incomeTrend').textContent = '+' + Math.round((t.income/base)*100) + '%';
  document.getElementById('expenseTrend').textContent = Math.round((t.expense/(all.expense||1))*100) + '%';
  document.getElementById('subtitle').textContent = document.getElementById('period').selectedOptions[0].text;
}

function renderBudget(){
  const list = filtered().filter(x=>x.type==='expense');
  const map={};
  list.forEach(x=>map[x.category]=(map[x.category]||0)+x.amount);
  const totalBudget=budgets.reduce((a,b)=>a+b.limit,0);
  const totalSpent=budgets.reduce((a,b)=>a+(map[b.name]||0),0);
  document.getElementById('budgetTotalLabel').textContent = money(totalSpent)+' / '+money(totalBudget);
  document.getElementById('budgetList').innerHTML = budgets.map(b=>{
    const spent=map[b.name]||0, pct=Math.min(100,Math.round(spent/b.limit*100));
    const cls=pct>100?'var(--red)':pct>80?'var(--yellow)':'var(--primary)';
    return `<div class="budget-item">
      <div class="top"><span>${b.name}</span><span>${money(spent)} / ${money(b.limit)}</span></div>
      <div class="progress"><div style="width:${pct}%;background:${cls}"></div></div>
    </div>`;
  }).join('');
}

function renderTransactions(){
  const body=document.getElementById('txBody');
  const list=[...filtered()].sort((a,b)=>b.date.localeCompare(a.date));
  if(!list.length){ body.innerHTML='<tr><td colspan="4" class="empty">Belum ada transaksi.</td></tr>'; return; }
  body.innerHTML=list.slice(0,12).map(x=>{
    const icon=x.type==='income'?'↗':'↘';
    const iconClass=x.type==='income'?'income':'expense';
    return `<tr>
      <td><div class="tx-name"><div class="tx-icon" style="background:${x.type==='income'?'var(--green-soft)':'var(--red-soft)'};color:${x.type==='income'?'var(--green)':'var(--red)'}">${icon}</div><span>${escapeHtml(x.name)}</span></div></td>
      <td><span class="pill">${escapeHtml(x.category)}</span></td>
      <td>${fmtDate(x.date)}</td>
      <td class="${iconClass}">${x.type==='income'?'+':'-'}${money(x.amount)}</td>
    </tr>`;
  }).join('');
}

function escapeHtml(v){ return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

function renderGoal(){
  const all=totals(transactions);
  const target=10000000;
  const saved=Math.max(0,all.balance);
  const pct=Math.min(100,Math.round(saved/target*100));
  document.getElementById('goalAmount').textContent=money(saved)+' / '+money(target);
  document.getElementById('goalPct').textContent=pct+'%';
  document.getElementById('goalProgress').style.width=pct+'%';
  document.getElementById('goalNote').textContent=pct>=100?'Target dana darurat tercapai.':`Kamu perlu ${money(target-saved)} lagi untuk mencapai target dana darurat.`;
}

function groupByMonth(list){
  const map={};
  list.forEach(x=>{
    const d=new Date(x.date+'T12:00:00');
    const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if(!map[k])map[k]={income:0,expense:0};
    map[k][x.type]+=x.amount;
  });
  return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0])).slice(-7);
}

function groupCategory(list){
  const m={};
  list.filter(x=>x.type==='expense').forEach(x=>m[x.category]=(m[x.category]||0)+x.amount);
  return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,6);
}

function drawCharts(){
  const cash=document.getElementById('cashflowChart');
  const ctx=cash.getContext('2d');
  const rect=cash.getBoundingClientRect();
  const dpr=window.devicePixelRatio||1;
  cash.width=rect.width*dpr; cash.height=rect.height*dpr;
  ctx.scale(dpr,dpr);
  const w=rect.width,h=rect.height,p={l:40,r:18,t:15,b:32};
  ctx.clearRect(0,0,w,h);
  const data=groupByMonth(filtered());
  const max=Math.max(1,...data.map(x=>Math.max(x[1].income,x[1].expense)));
  const step=data.length>1?(w-p.l-p.r)/(data.length-1):0;
  const y=v=>h-p.b-(v/max)*(h-p.t-p.b);
  ctx.strokeStyle='#eceef3';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const yy=p.t+i*(h-p.t-p.b)/4;ctx.beginPath();ctx.moveTo(p.l,yy);ctx.lineTo(w-p.r,yy);ctx.stroke();}
  function line(key,stroke){
    ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.beginPath();
    data.forEach((it,i)=>{const xx=p.l+i*step,yy=y(it[1][key]);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)});
    ctx.stroke();
    data.forEach((it,i)=>{const xx=p.l+i*step,yy=y(it[1][key]);ctx.fillStyle=stroke;ctx.beginPath();ctx.arc(xx,yy,4,0,Math.PI*2);ctx.fill();});
  }
  line('income','#22a06b'); line('expense','#e45757');
  ctx.fillStyle='#8a8f9e';ctx.font='11px system-ui';
  data.forEach((it,i)=>{const xx=p.l+i*step;ctx.textAlign='center';ctx.fillText(it[0].slice(5),xx,h-10);});
  if(!data.length){ctx.textAlign='center';ctx.fillStyle='#8a8f9e';ctx.fillText('Belum ada data pada periode ini',w/2,h/2);}

  const cat=document.getElementById('categoryChart'), cctx=cat.getContext('2d');
  const cr=cat.getBoundingClientRect(); cat.width=cr.width*dpr;cat.height=cr.height*dpr;cctx.scale(dpr,dpr);
  cctx.clearRect(0,0,cr.width,cr.height);
  const cats=groupCategory(filtered());
  if(!cats.length){cctx.fillStyle='#8a8f9e';cctx.font='12px system-ui';cctx.textAlign='center';cctx.fillText('Belum ada pengeluaran',cr.width/2,cr.height/2);return;}
  const total=cats.reduce((a,b)=>a+b[1],0), cx=cr.width*0.32, cy=cr.height/2, radius=Math.min(cr.width,cr.height)*0.33;
  let angle=-Math.PI/2;
  cats.forEach(([name,val],i)=>{
    const a2=angle+val/total*Math.PI*2;
    cctx.beginPath();cctx.moveTo(cx,cy);cctx.arc(cx,cy,radius,angle,a2);cctx.closePath();
    cctx.fillStyle=['#5b5ce2','#22a06b','#e45757','#d9921e','#7a7fd1','#8d93a3'][i%6];cctx.fill();
    angle=a2;
  });
  cctx.beginPath();cctx.fillStyle='#fff';cctx.arc(cx,cy,radius*.56,0,Math.PI*2);cctx.fill();
  cctx.fillStyle='#20232a';cctx.font='700 14px system-ui';cctx.textAlign='center';cctx.fillText(money(total),cx,cy+5);
  cctx.font='11px system-ui';cctx.fillStyle='#8a8f9e';cctx.fillText('total',cx,cy+22);
  cats.forEach(([name,val],i)=>{
    const yy=25+i*30; cctx.fillStyle=['#5b5ce2','#22a06b','#e45757','#d9921e','#7a7fd1','#8d93a3'][i%6];cctx.fillRect(cr.width*.61,yy-9,9,9);
    cctx.fillStyle='#4e5360';cctx.font='12px system-ui';cctx.textAlign='left';cctx.fillText(name,cr.width*.61+16,yy);
    cctx.textAlign='right';cctx.fillStyle='#7b8190';cctx.fillText(Math.round(val/total*100)+'%',cr.width-8,yy);
  });
}

function openAdd(){
  document.getElementById('modal').classList.add('show');
  document.getElementById('date').value=isoToday;
}
function closeModal(){document.getElementById('modal').classList.remove('show');document.getElementById('txForm').reset();}
function saveTransaction(e){
  e.preventDefault();
  const tx={
    id:Date.now(),
    type:document.getElementById('type').value,
    name:document.getElementById('name').value.trim(),
    category:document.getElementById('category').value,
    amount:Number(document.getElementById('amount').value),
    date:document.getElementById('date').value
  };
  transactions.push(tx);saveData();closeModal();renderAll();
}
function exportCSV(){
  const rows=[['Tanggal','Jenis','Nama','Kategori','Jumlah']];
  filtered().sort((a,b)=>a.date.localeCompare(b.date)).forEach(x=>rows.push([x.date,x.type,x.name,x.category,x.amount]));
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='transaksi-keuangan.csv';a.click();URL.revokeObjectURL(a.href);
}
function scrollToSection(id){document.getElementById(id).scrollIntoView({behavior:'smooth'});}
function renderAll(){renderMetrics();renderBudget();renderTransactions();renderGoal();requestAnimationFrame(drawCharts);}
window.addEventListener('resize',drawCharts);
document.getElementById('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal();});
renderAll();