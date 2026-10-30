(function(){
const CATS=[
 {id:'food',name:'Food & groceries',color:'var(--k1)'},
 {id:'rent',name:'Rent',color:'var(--k2)',fixed:true},
 {id:'parents',name:'Parents',color:'var(--k3)',fixed:true},
 {id:'electricity',name:'Electricity',color:'var(--k4)'},
 {id:'water',name:'Water',color:'var(--k5)'},
 {id:'transport',name:'Transport',color:'var(--k6)'},
 {id:'phone',name:'Phone & internet',color:'var(--k7)'},
 {id:'medical',name:'Medical',color:'var(--period)'},
 {id:'household',name:'Household supplies',color:'var(--k8)'},
 {id:'clothes',name:'Clothes',color:'var(--k9)'},
 {id:'laundry',name:'Laundry & cleaning',color:'var(--k10)'},
 {id:'kitchen',name:'Kitchen & home items',color:'var(--k11)'},
 {id:'personal',name:'Personal',color:'var(--k12)'},
 {id:'gifts',name:'Gifts & family',color:'var(--k5)'},
 {id:'debt',name:'Debt payment',color:'var(--k8)'},
 {id:'other',name:'Custom',color:'var(--k10)',custom:true},
 {id:'savings',name:'Set aside',color:'var(--good)',saving:true}
];
const PAL=['var(--k2)','var(--k1)','var(--k3)','var(--k7)','var(--k5)','var(--k6)','var(--k9)','var(--k11)','var(--k8)','var(--k4)','var(--k12)','var(--k10)'];
const palOf=s=>PAL[hueOf(String(s).toLowerCase())%PAL.length];

const hueOf=s=>{let h=0;for(const ch of s)h=(h*31+ch.charCodeAt(0))%360;return h;};
const labelOf=e=>{if(e.cat==='debt'&&e.debtId){const d=state.debts.find(x=>x.id===e.debtId);return 'Debt · '+(d?d.name:'removed person');}return (e.cat==='other'&&e.label)?e.label:(CAT[e.cat]||CAT.other).name;};
const SLOTS=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
const catIdx=k=>{const i=CATS.findIndex(c=>c.id===k);return i>=0?i:100;};
function colorMap(items){const top=[...items].sort((a,b)=>b.amount-a.amount).slice(0,SLOTS.length);
  const ord=[...top].sort((a,b)=>catIdx(a.key)-catIdx(b.key)||String(a.key).localeCompare(String(b.key)));const m={};ord.forEach((g,i)=>m[g.key]=SLOTS[i]);return m;}
const keyOf=e=>e.cat==='other'&&e.label?'x:'+String(e.label).toLowerCase():e.cat;
const catCol=k=>k==='savings'?CAT.savings.color:((state.cmap||{})[k]||'var(--c0)');
const colorOf=e=>e.cat==='savings'?CAT.savings.color:catCol(keyOf(e));
const WEEK=['Sat','Sun','Mon','Tue','Wed','Thu','Fri'];
const CAT=Object.fromEntries(CATS.map(c=>[c.id,c]));
const DEFAULTS={rate:3.05,elecRate:31,
 incomes:[{id:'kydzzo',name:'Kydzzo',usd:1850,feePct:0,flat:0,count:true},
          {id:'rajaeen',name:'Rajaeen (Upwork)',usd:450,feePct:10,flat:50,count:false}],
 budgets:{food:1500,parents:1000,rent:1200},noSpend:[],weekGoal:2,
 waterTarget:0,ropeTarget:3,vitDDays:5,vitDDose:10000,journey:{start:87.5,low:82.7},heightCm:159,goalKg:0,
 why:['Fit back into my clothes','Stop reaching for sugar and junk food']};
const FEELS=['Hungry','Sad','Bored','Stressed','Tired','With others'];
const MEALS=[['breakfast','Breakfast'],['lunch','Lunch'],['dinner','Dinner'],['snack','Snack']];
const ON_FOODS=['Fruit (low sugar)','Chicken breast · 250 g','Minced beef','Tuna','Fish','Beans','Vegetables','Greek yogurt','Almonds · max 50 g','Pistachios · max 50 g','Sugar-free drink'];
const OFF_FOODS=['Sweets','Bread','Rice','Potatoes','Junk food','Juice / sugary drink','High-sugar fruit','Over portion'];
const PRICE_ITEMS=[['Chicken breast','kg'],['Minced beef','kg'],['Tuna','can'],['Fish','kg'],['Beans','can'],['Greek yogurt','cup'],['Almonds','kg'],['Pistachios','kg'],['Vegetables','kg'],['Fruit','kg']];
const TICK='<svg width="14" height="14" viewBox="0 0 14 14"><path d="m3 7 3 3 5-6" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const TAB_TITLES={notes:'Notes',today:'Today',money:'Money',health:'Health',kitchen:'Kitchen',closet:'Closet',people:'People'};
const FAB_LABELS={notes:'Add note',today:'Add spend',money:'Add spend',health:'Log food',kitchen:'Add recipe',closet:'Add clothes',people:'Add person'};
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const $=id=>document.getElementById(id);
const fmt=n=>'₪'+Math.round(n).toLocaleString('en-US');
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
function mergeSettings(s){const d=clone(DEFAULTS);if(!s)return d;
  return {...d,...s,incomes:Array.isArray(s.incomes)?s.incomes:d.incomes,budgets:s.budgets||{},noSpend:Array.isArray(s.noSpend)?s.noSpend:[],
    why:Array.isArray(s.why)?s.why:d.why,journey:{...d.journey,...(s.journey||{})}};}

const today=new Date();const todayStr=ymd(today);
const curMonth=todayStr.slice(0,7);
const state={settings:mergeSettings(null),entries:[],food:[],weights:[],prices:[],days:[],month:null,mode:'loading',openRow:null,selCat:'food',
  closet:[],cf:'all',ctype:'',openItem:null,itemConfirm:false,occ:null,outfits:null,outBusy:false,outErr:'',
  recipes:[],products:[],cycle:[],wishes:[],notes:[],nf:'all',nq:'',wf:'all',addCur:'NIS',priceCur:'NIS',bedit:null,wnew:null,rmonth:null,cmonth:null,cday:null,rq:'',rview:null,rscale:1,rticks:null,rConfirm:false,redit:null,openProd:null,prodConfirm:false,impBusy:false,impErr:'',
  people:[],dates:[],openPerson:null,pedit:null,pConfirm:false,dateIdea:null,dlog:null,
  tab:['today','money','health','kitchen','closet','people','notes'].includes(location.hash.slice(1))?location.hash.slice(1):'today',homeTab:'kitchen',hday:todayStr,meal:'lunch',openF:null,openP:null,
  sub:{money:'month',health:'today',kitchen:'recipes',closet:'wardrobe'},reorderD:false,debts:[],debtView:'NIS',openD:null,selDebt:null,feel:null,scan:null};
const COLLS=['entries','food','weights','prices','days','debts','closet','recipes','products','cycle','wishes','people','dates','notes'];

/* ---------- storage ---------- */
const LS='moneybook.v1';
function lsGet(){try{return JSON.parse(localStorage.getItem(LS)||'null')}catch(e){return null}}
function lsSet(){try{const o={settings:state.settings};COLLS.forEach(c=>o[c]=state[c]);localStorage.setItem(LS,JSON.stringify(o))}catch(e){}}
let db=null;
const retry1=async f=>{try{return await f();}catch(e){if(e&&['unavailable','resource_exhausted'].includes(e.code)){await new Promise(r=>setTimeout(r,500+Math.random()*700));return await f();}throw e;}};
const store={
  async put(c,o){ if(db){await retry1(()=>db.collection(c).doc(o.id).set(strip(o)));} else {state[c]=state[c].filter(x=>x.id!==o.id).concat([o]);lsSet();render();} },
  async del(c,id){ if(db){await retry1(()=>db.doc(c+'/'+id).delete());} else {state[c]=state[c].filter(x=>x.id!==id);lsSet();render();} },
  addEntry(e){return this.put('entries',e);},
  delEntry(id){return this.del('entries',id);},
  async saveSettings(s){ if(db){const c=clone(s);await retry1(()=>db.doc('settings/main').set(c));} else {state.settings=s;lsSet();render();} }
};
function strip(e){const o={...e};delete o.id;return o;}
function newId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}

async function initStore(){
  const cached=lsGet();
  if(cached){state.settings=mergeSettings(cached.settings);COLLS.forEach(c=>{state[c]=Array.isArray(cached[c])?cached[c]:[];});}
  render();
  let ns=null;
  try{ if(window.claude&&typeof window.claude.use==='function') ns=await window.claude.use('db'); }catch(e){ns=null}
  if(!ns){state.mode='local';render();return;}
  db=ns;state.mode='cloud';
  db.doc('settings/main').onSnapshot(s=>{state.settings=mergeSettings(s.exists?s.data():null);injectCustom(state.settings.customLooks||[]);if(state.settings.look)applyLook(state.settings.look);if(state.settings.mode)applyMode(state.settings.mode);lsSet();render();if(!moodAsked){moodAsked=true;setTimeout(maybeAskMood,900);}},
    ()=>{state.mode='error';render();});
  COLLS.forEach(c=>db.collection(c).onSnapshot(s=>{state[c]=s.docs.map(d=>({id:d.id,...d.data()}));lsSet();render();},
    ()=>{state.mode='error';render();}));
}

/* ---------- math ---------- */
const netUSD=i=>Math.max(0,(+i.usd||0)*(1-(+i.feePct||0)/100)-(+i.flat||0));
function monthInfo(mk){
  const [y,m]=mk.split('-').map(Number);const dim=new Date(y,m,0).getDate();
  const isCur=mk===curMonth;const isPast=mk<curMonth;
  const day=isCur?today.getDate():(isPast?dim:0);
  return {y,m,dim,isCur,isPast,day,progress:day/dim,label:MONTHS[m-1]};
}
/* ---------- money months: each calendar month, starting early if its salary lands early ---------- */
const incLog=()=>(state.settings.incomeLog||[]).filter(x=>x&&x.date).map(x=>x.cycle&&!x.forM?{...x,forM:+x.date.slice(8)>=15?nextMK(x.date.slice(0,7)):x.date.slice(0,7)}:x);
const nextMK=k=>{const [y,m]=k.split('-').map(Number);const d=new Date(y,m,1);return d.getFullYear()+'-'+pad(d.getMonth()+1);};
const prevMK=k=>{const [y,m]=k.split('-').map(Number);const d=new Date(y,m-2,1);return d.getFullYear()+'-'+pad(d.getMonth()+1);};
function salFor(k){return incLog().filter(x=>x.cycle&&x.forM===k).sort((a,b)=>a.date<b.date?-1:1)[0]||null;}
function keyOfDate(ds){const k=ds.slice(0,7);const n=salFor(nextMK(k));return n&&n.date<=ds?nextMK(k):k;}
function curKey(){return keyOfDate(todayStr);}
function usesLog(k){return incLog().some(x=>x.cycle&&x.forM<=k);}
function periodKeys(){const ds=state.entries.map(e=>e.date).filter(Boolean).sort();let m=(ds[0]||todayStr).slice(0,7);const last=curKey();const keys=[];let g=0;
  while(m<=last&&g++<240){keys.push(m);m=nextMK(m);}return keys;}
function periodInfo(k){const [y,m]=k.split('-').map(Number);const dimFull=new Date(y,m,0).getDate();let start=`${k}-01`,end=`${k}-${pad(dimFull)}`;
  const own=salFor(k);if(own&&own.date<start)start=own.date;const nx=salFor(nextMK(k));let cut=false;if(nx&&nx.date<=end){end=addD(nx.date,-1);cut=true;}
  const early=start<`${k}-01`;const label=MONTHS[m-1];const yr=y!==today.getFullYear()?' '+y:'';
  const nav=label+yr+(early?` · from ${shortD(start)}`:cut?` 1–${+end.slice(8)}`:'');
  const dim=Math.max(1,diffD(start,end)+1);const isCur=k===curKey();const isPast=!isCur&&end<todayStr;
  const day=isCur?Math.min(dim,diffD(start,todayStr)+1):(isPast?dim:0);
  return {key:k,start,end,until:end,early,cut,cycle:usesLog(k),salary:own,dim,day,isCur,isPast,progress:day/dim,label:label+yr,nav,y,m,title:label+yr};}
const inP=(ds,mi)=>!!ds&&ds>=mi.start&&ds<=mi.until;
function billMonth(k){return k;}
function fixMonthKey(){const ks=periodKeys();if(!state.month||!ks.includes(state.month))state.month=curKey();}
function calc(){
  fixMonthKey();const S=state.settings,mk=state.month,mi=periodInfo(mk);
  const ents=state.entries.filter(e=>inP(e.date,mi));
  const counted=S.incomes.filter(i=>i.count),notCounted=S.incomes.filter(i=>!i.count);
  const got=mi.cycle?incLog().filter(x=>x.cycle?x.forM===mk:inP(x.date,mi)).sort((a,b)=>a.date<b.date?-1:1):[];
  const income=mi.cycle?got.reduce((a,x)=>a+(+x.nis||0),0):counted.reduce((a,i)=>a+netUSD(i)*S.rate,0);
  const byCat={};CATS.forEach(c=>byCat[c.id]=0);
  ents.forEach(e=>{byCat[e.cat]=(byCat[e.cat]||0)+(+e.amount||0)});
  const saved=byCat.savings||0;
  const spent=ents.filter(e=>e.cat!=='savings').reduce((a,e)=>a+(+e.amount||0),0);
  const left=income-spent-saved;
  const active=new Set([...state.entries.map(e=>e.date),...(S.noSpend||[])]);
  const gmap={};ents.filter(e=>e.cat!=='savings').forEach(e=>{const lbl=e.cat==='other'&&e.label?e.label:(CAT[e.cat]||CAT.other).name;const key=e.cat==='other'&&e.label?'x:'+lbl.toLowerCase():e.cat;
    (gmap[key]=gmap[key]||{key,cat:e.cat,label:lbl,color:'',amount:0}).amount+=(+e.amount||0);});
  const groups=Object.values(gmap).sort((a,b)=>b.amount-a.amount);state.cmap=colorMap(groups);groups.forEach(g=>g.color=catCol(g.key));
  const spentToday=state.entries.filter(e=>e.date===todayStr&&e.cat!=='savings').reduce((a,e)=>a+(+e.amount||0),0);
  /* same point last month */
  const ks=periodKeys();const pk=ks[ks.indexOf(mk)-1];const pmi=pk?periodInfo(pk):null;
  const prevEnts=pmi?state.entries.filter(e=>inP(e.date,pmi)&&e.cat!=='savings'&&!(CAT[e.cat]||{}).fixed):[];
  const prevToDay=prevEnts.filter(e=>diffD(pmi.start,e.date)+1<=mi.day).reduce((a,e)=>a+(+e.amount||0),0);
  const curVar=ents.filter(e=>e.cat!=='savings'&&!(CAT[e.cat]||{}).fixed).reduce((a,e)=>a+(+e.amount||0),0);
  return {S,mi,ents,counted,notCounted,income,got,byCat,saved,spent,left,active,groups,spentToday,prevHas:prevEnts.length>0&&!!pmi&&pmi.dim>=mi.day,prevToDay,curVar,prevLabel:pmi?pmi.title:''};
}
function streak(active){
  let d=new Date(today);if(!active.has(ymd(d)))d.setDate(d.getDate()-1);
  let n=0;while(active.has(ymd(d))){n++;d.setDate(d.getDate()-1);}return n;
}

/* ---------- render ---------- */
function render(){
  (state.closet||[]).forEach(it=>{if(it.type==='Abaya')it.type='عباية';else if(it.type==='Hijab & scarf')it.type='حجاب & scarf';});
  const C=calc(),{S,mi}=C;
  $('mLabel').textContent=mi.nav;
  $('nextM').disabled=mi.isCur;$('prevM').disabled=periodKeys().indexOf(state.month)<=0;
  const mn=$('modeNote');
  if(state.mode==='local'){mn.hidden=false;mn.textContent='Saving on this device only right now. Open this page from your Claude account to sync across your phone and laptop.';}
  else if(state.mode==='error'){mn.hidden=false;mn.textContent='Lost connection to your saved data. Reload the page to reconnect.';}
  else mn.hidden=true;
  ['today','money','health','kitchen','closet','people','notes'].forEach(t=>{$('tab-'+t).hidden=state.tab!==t;});document.body.classList.toggle('bq-on',state.tab==='closet');const inHome=['kitchen','closet','people','notes'].includes(state.tab);$('fab').hidden=state.tab==='notes';$('sayBtn').hidden=state.tab==='notes';if(inHome)state.homeTab=state.tab;$('homeNav').hidden=!inHome;
  document.querySelectorAll('[data-hometab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.hometab===state.tab)));
  ['recipes','products','prices'].forEach(k=>{$('kitchen-'+k).hidden=state.sub.kitchen!==k;});
  document.querySelectorAll('[data-tab]').forEach(b=>{if(b.dataset.tab===state.tab||(b.dataset.tab==='home'&&inHome))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  $('brandTitle').textContent=state.tab==='today'?'':TAB_TITLES[state.tab];$('fabLabel').textContent=FAB_LABELS[state.tab];
  $('dLabel').textContent=dayLabel(state.hday);$('nextD').disabled=state.hday>=todayStr;
  document.querySelectorAll('[data-sub]').forEach(b=>{const [t,v]=b.dataset.sub.split(':');b.setAttribute('aria-selected',String(state.sub[t]===v));});
  $('money-month').hidden=state.sub.money!=='month';$('money-debts').hidden=state.sub.money!=='debts';$('money-wishlist').hidden=state.sub.money!=='wishlist';
  $('health-today').hidden=state.sub.health!=='today';$('health-progress').hidden=state.sub.health!=='progress';$('health-cycle').hidden=state.sub.health!=='cycle';
  const showMonth=state.tab==='money'&&state.sub.money==='month';$('monthNav').hidden=!showMonth;
  $('dayNav').hidden=!(state.tab==='today'||(state.tab==='health'&&state.sub.health==='today'));
  $('fabLabel').textContent=state.tab==='money'&&state.sub.money==='wishlist'?'Add wish':state.tab==='money'&&state.sub.money==='debts'?'Log payment':state.tab==='kitchen'?({recipes:'Add recipe',products:'Add product',prices:'Add price'}[state.sub.kitchen]):FAB_LABELS[state.tab];
  if(state.tab==='notes')renderNotes();
  if(state.tab==='today'){renderMotive();renderPrayers();renderTasbih();renderHToday();}
  else if(state.tab==='money'){if(state.sub.money==='month'){renderRecapBan();renderHero(C);renderBills(C);renderInsights(C);renderHistory(C);}else if(state.sub.money==='wishlist')renderWishlist();else renderDebts();}
  else if(state.tab==='health'){if(state.sub.health==='today'){renderHFood();renderSleep();renderBadges();}else if(state.sub.health==='cycle'){renderCycle();}else{renderHWeight();renderGoal();renderHPatterns();}}
  else if(state.tab==='people'){renderPeople();if(!$('personSheet').hidden&&!state.pedit)renderPersonSheet();}
  else if(state.tab==='closet'){renderCloset();if(!$('itemSheet').hidden)renderItem();}
  if(!$('recapSheet').hidden)renderRecap();
  else if(state.tab==='kitchen'){if(state.sub.kitchen==='recipes')renderRecipes();else if(state.sub.kitchen==='products')renderProducts();else renderPrices();
    if(!$('recipeSheet').hidden)renderRView();if(!$('productSheet').hidden)renderProduct();}
}

function isBillEntry(e,bills){return bills.some(b=>e.billId===b.id||(!e.billId&&b.id===b.cat&&e.cat===b.cat));}
function dailyMath(C){const {mi,income,ents,S}=C;const bills=billsList(S);
  const nonDaily=e=>e.cat==='savings'||e.cat==='debt'||(CAT[e.cat]||{}).fixed||isBillEntry(e,bills);
  const billsLeft=bills.reduce((a,b)=>a+Math.max(0,billNIS(b)-billState(b,mi.key).paid),0);
  const fixedSpent=ents.filter(nonDaily).reduce((a,e)=>a+(+e.amount||0),0);
  const before=ents.filter(e=>!nonDaily(e)&&e.date<todayStr).reduce((a,e)=>a+(+e.amount||0),0);
  const todaySp=ents.filter(e=>!nonDaily(e)&&e.date===todayStr).reduce((a,e)=>a+(+e.amount||0),0);
  const daysLeft=mi.isCur?Math.max(1,mi.dim-mi.day+1):0;const pool=income-billsLeft-fixedSpent-before;
  const allow=mi.isCur?Math.max(0,pool/daysLeft):0;return {billsLeft,allow,todaySp,daysLeft,pool};}
function renderHero(C){
  const {mi,income,spent,saved,left,notCounted,S}=C;
  const waiting=mi.cycle&&mi.isCur&&income<=0;const D=dailyMath(C);
  const chipOf=x=>`<button class="incchip" data-incview="${esc(x.id)}">${esc(x.name)} <b class="num">${x.cur==='USD'?'$'+Math.round(+x.amt).toLocaleString('en-US'):fmt(x.amt)}</b> <span>${shortD(x.date)}</span></button>`;
  const hasSal=!!mi.salary;const nk=nextMK(mi.key);
  const big=t=>`<button class="salbtn" data-income ${t?`data-salfor="${t}"`:''}><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="4" width="13" height="8.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8.2" r="2" fill="currentColor"/></svg>${t?`My ${MONTHS[+t.slice(5)-1]} salary arrived`:'Salary received?'}</button>`;
  const nextIn=mi.isCur&&salFor(nk);
  const incRow=(C.got.length?`<div class="salinc">${C.got.map(chipOf).join('')}${mi.isCur?`<button class="incchip add" data-income data-salfor="extra">+ Income</button>`:''}</div>`:'')
    +(mi.isCur&&!C.got.length?(mi.cycle?big(mi.key):big('')):'')
    +(mi.isCur&&hasSal&&!nextIn&&todayStr>=addD(mi.end,-6)?big(nk):'');
  const chips=mi.cycle?'':notCounted.map(i=>`<button class="chip" data-count="${esc(i.id)}"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>${esc(i.name)} ${fmt(netUSD(i)*S.rate)} not counted. Tap when it lands.</button>`).join('');
  const countedRaj=mi.cycle?'':C.counted.filter(i=>i.id!=='kydzzo').map(i=>`<button class="chip on" data-uncount="${esc(i.id)}">${esc(i.name)} counted · tap to remove</button>`).join('');
  const since=mi.early?`${mi.label} · since ${shortD(mi.start)}`:mi.nav;
  const tiles=`<div class="htiles"><div class="htile"><span>Income</span><b class="num">${fmt(income)}</b></div><div class="htile"><span>Spent</span><b class="num">${fmt(spent+saved)}</b></div><div class="htile"><span>${mi.isCur?'Bills to pay':'Left over'}</span><b class="num">${mi.isCur?fmt(D.billsLeft):(left<0?'−':'')+fmt(Math.abs(left))}</b></div></div>`;
  const strip=`<div class="hstrip" aria-hidden="true"><span style="flex:${mi.day}"></span><i style="flex:${Math.max(0,mi.dim-mi.day)}"></i></div><div class="hmrow num"><span>${esc(since)}</span><span>${mi.isCur?`Day ${mi.day} of ${mi.dim}`:'Closed'}</span></div>`;
  let top,mood='happy';
  if(waiting){top=`<span class="label">Spent so far in ${esc(mi.label)}</span><div class="big num">${fmt(spent+saved)}</div><div class="sub">Your ${esc(mi.label)} salary isn't logged yet. Keep logging as usual.</div>`;mood='meh';}
  else if(income<=0){top=`<span class="label">${esc(mi.label)}</span><div class="big num">${fmt(spent+saved)}</div><div class="sub">spent · <button class="link light" data-open-settings>set your income</button> to see what's left</div>`;mood='neutral';}
  else if(mi.isCur){const rem=D.allow-D.todaySp;const over=rem<0;const r=D.allow>0?D.todaySp/D.allow:(D.todaySp>0?2:0);mood=over?'sleepy':r>0.8?'meh':D.todaySp>0?'happy':'open';
    top=`<span class="label">${over?'Over today\'s share':'You can still spend today'}</span><div class="big num ${over?'neg':''}">${over?'+':''}${fmt(Math.abs(rem))}</div>
      <div class="sub num">${fmt(D.todaySp)} spent of today's ${fmt(D.allow)}${over?' · tomorrow gets a bit less':''}</div>
      <div class="tbar"><span class="${over?'over':''}" style="width:${Math.min(r,1)*100}%"></span></div>`;}
  else{mood=left<0?'sleepy':'happy';top=`<span class="label">${left<0?'Over in':'Left from'} ${esc(mi.label)}</span><div class="big num ${left<0?'neg':''}">${left<0?'−':''}${fmt(Math.abs(left))}</div><div class="sub num">of ${fmt(income)} income</div>`;}
  $('hero').innerHTML=`${top}${income>0||waiting?tiles:''}${strip}<div class="herocat">${catSVG(mood)}</div>${incRow}${chips}${countedRaj}`;
}

function renderInsights(C){
  const {spent,income,S,mi,active,groups}=C;const items=[];
  if(mi.isCur&&C.prevHas&&mi.day>=3){const d=C.prevToDay-C.curVar;
    items.push([d>=0?'↓':'↑',d>=0?`<b>${fmt(d)} less</b> on day-to-day spending than by day ${mi.day} of ${C.prevLabel}. Keep going.`:`<b>${fmt(-d)} more</b> on day-to-day spending than by day ${mi.day} of ${C.prevLabel}.`]);}
  const days=mi.isCur?mi.day:(mi.isPast?mi.dim:0);let missing=0;for(let d=1;d<=days;d++){if(!active.has(addD(mi.start,d-1)))missing++;}
  if(missing>0)items.push(['?',`<b>${missing} day${missing>1?'s':''} with nothing logged.</b> That's where money goes missing.`]);
  const unb=groups.filter(g=>!(CAT[g.cat]||{}).fixed&&!S.budgets[g.cat]);const unbSum=unb.reduce((a,g)=>a+g.amount,0);
  if(unbSum>0)items.push(['!',`<b>${fmt(unbSum)}</b> went to categories with no budget. Give them one so they stop surprising you.`]);
  if(!S.budgets.savings)items.push(['+','No "Set aside" goal yet. A small fixed amount each month builds your winter buffer.']);
  else{const sv=C.byCat.savings||0,sg=+S.budgets.savings;items.push(['+',sv>=sg?`<b>Set aside goal met:</b> ${fmt(sv)} of ${fmt(sg)}.`:`<b>Set aside: ${fmt(sv)} of ${fmt(sg)}.</b> ${fmt(sg-sv)} to go this month.`]);}
  let body;
  if(spent<=0)body='<p class="empty">Log a few spends and your money map appears here.</p>';
  else{
    const R=78,SW=26,CIRC=2*Math.PI*R;let off=0;
    const colored=groups.filter(g=>state.cmap[g.key]).sort((a,b)=>SLOTS.indexOf(state.cmap[a.key])-SLOTS.indexOf(state.cmap[b.key]));const rest=groups.filter(g=>!state.cmap[g.key]);
    const segs=[...colored,...(rest.length?[{key:'_o',label:rest.length===1?rest[0].label:`${rest.length} others`,color:'var(--c0)',amount:rest.reduce((a,g)=>a+g.amount,0)}]:[])];
    const leg=`<div class="donutleg">${segs.map(g=>`<span><i style="background:${g.color}"></i>${esc(g.label)} <b class="num">${Math.round(g.amount/spent*100)}%</b></span>`).join('')}</div>`;
    const arcs=segs.map(g=>{const len=g.amount/spent*CIRC;const gap=segs.length>1?3:0;const s=`<circle r="${R}" cx="110" cy="110" fill="none" style="stroke:${g.color}" stroke-width="${SW}" stroke-dasharray="${Math.max(0,len-gap)} ${CIRC-Math.max(0,len-gap)}" stroke-dashoffset="${-off}" transform="rotate(-90 110 110)"/>`;off+=len;return s;}).join('');
    const max=groups[0].amount;
    body=`<div class="mapwrap"><svg class="bigdonut" viewBox="0 0 220 220" role="img" aria-label="Spending by category"><circle r="${R}" cx="110" cy="110" fill="none" stroke="var(--surface)" stroke-width="${SW}"/>${arcs}
      <text x="110" y="100" text-anchor="middle" fill="var(--muted)" font-size="12" font-family="Figtree,system-ui">Spent in ${mi.label}</text>
      <text x="110" y="128" text-anchor="middle" fill="var(--ink)" font-size="28" font-weight="800" font-family="Bricolage Grotesque,system-ui">${fmt(spent)}</text>
      ${income?`<text x="110" y="148" text-anchor="middle" fill="var(--muted)" font-size="12" font-family="Figtree,system-ui">${Math.round(spent/income*100)}% of income</text>`:''}</svg></div>
      <div class="rank">${groups.map((g,i)=>{const pct=Math.round(g.amount/spent*100);const b=!(CAT[g.cat]||{}).custom&&S.budgets[g.cat]?+S.budgets[g.cat]:0;
        return `<div class="rk"><span class="rkn num">${i+1}</span><div class="rkm"><div class="rkt"><b><i class="dotc" style="background:${g.color}"></i>${esc(g.label)}</b><span class="num"><b>${fmt(g.amount)}</b> · ${pct}%</span></div>
          <div class="rkbar"><span style="width:${g.amount/max*100}%;background:${g.color}"></span></div>${b?`<small class="num">${g.amount>b+0.5?`<span style="color:var(--bad);font-weight:700">Over budget by ${fmt(g.amount-b)}</span>`:g.amount>=b-0.5?((CAT[g.cat]||{}).fixed?'Paid in full':'Budget fully used'):`${fmt(b-g.amount)} left of ${fmt(b)}${mi.isCur&&!(CAT[g.cat]||{}).fixed&&g.amount/b>mi.progress+0.1?' · <span style="color:var(--warn);font-weight:700">spending faster than the month</span>':''}`}</small>`:''}</div></div>`;}).join('')}</div>`;}
  $('insightCard').innerHTML=`<div class="cardhead"><h2>Where the money goes</h2><span class="label">${esc(mi.nav)}</span></div>${body}
    ${items.length?`<ul class="insights" style="margin-top:16px">${items.map(([i,t])=>`<li><span class="ic">${i}</span><p>${t}</p></li>`).join('')}</ul>`:''}<button class="link" data-open-settings style="margin-top:14px">Edit budgets</button>`;
}

function dayLabel(ds){if(ds===todayStr)return'Today';const y=new Date(today);y.setDate(y.getDate()-1);if(ds===ymd(y))return'Yesterday';
  const [Y,M,D]=ds.split('-').map(Number);const d=new Date(Y,M-1,D);return DOW[d.getDay()]+' '+D+' '+MONTHS[M-1].slice(0,3);}
function renderHistory(C){
  const groups={};C.ents.forEach(e=>{(groups[e.date]=groups[e.date]||[]).push(e)});
  const dates=Object.keys(groups).sort().reverse();
  let html=`<div class="cardhead"><h2>History</h2><span class="label num">${C.ents.length} entries</span></div>`;
  if(!dates.length)html+=`<p class="empty">Nothing logged in ${C.mi.label} yet. Tap <b>Add spend</b> to log your first one.</p>`;
  else html+=`<div class="days">${dates.map(ds=>{const list=groups[ds].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));const tot=list.filter(e=>e.cat!=='savings').reduce((a,e)=>a+(+e.amount||0),0);
    return `<div class="day"><h3><span>${dayLabel(ds)}</span><span class="num">${fmt(tot)}</span></h3>${list.map(e=>{const c=CAT[e.cat]||CAT.other;const open=state.openRow===e.id;
      return `<button class="entry" data-row="${esc(e.id)}" aria-expanded="${open}"><span class="swatch" style="background:${colorOf(e)}"></span><span class="nm"><b>${esc(labelOf(e))}</b>${subOf(e)}</span><span class="a num ${c.saving?'save':''}">${c.saving?'+':''}${fmt(e.amount)}</span></button>${open?`<div class="rowactions"><button class="del" data-del="${esc(e.id)}">Delete</button></div>`:''}`}).join('')}</div>`}).join('')}</div>`;
  $('historyCard').innerHTML=html;
}


function subOf(e){const parts=[];if(e.origCur==='USD'&&!e.debtId)parts.push('$'+(+e.origAmt||0).toLocaleString('en-US'));if(e.hours)parts.push(esc(e.hours)+' hrs');
  if(e.cat==='debt'&&e.debtId){const d=state.debts.find(x=>x.id===e.debtId);if(d&&d.currency==='USD')parts.push('$'+(+e.debtAmt||0).toLocaleString('en-US'));}
  if(e.item&&e.qty)parts.push(esc(e.qty+' '+e.unit+' '+e.item));if(e.note)parts.push(esc(e.note));return parts.length?`<small>${parts.join(' · ')}</small>`:'';}
/* ---------- cats ---------- */
const _fl={};function fluffP(cx,cy,rx,ry,n,a,rot){const key=[cx,cy,rx,ry,n,a,rot].join();if(_fl[key])return _fl[key];rot=rot||0;let d='';
  const P=(t,k)=>{const x=rx*k*Math.cos(t),y=ry*k*Math.sin(t);const c=Math.cos(rot),s=Math.sin(rot);return [cx+x*c-y*s,cy+x*s+y*c]};
  for(let i=0;i<n;i++){const t=i/n*2*Math.PI,t2=t+Math.PI/n,t3=t+2*Math.PI/n;const p=P(t,1),q=P(t2,1+a),r=P(t3,1);d+=(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)+' Q'+q[0].toFixed(1)+' '+q[1].toFixed(1)+' '+r[0].toFixed(1)+' '+r[1].toFixed(1)}return _fl[key]=d+'Z';}
/* Luffy's collar: picks the colour that stands out most from the current theme's cards and from her fur */
const COLLARS=['#1F8A9E','#2F6FD0','#1E2A5A','#1C1A22','#7B4FC9','#2BA88F'];let _colKey='',_col='#1F8A9E';
function hexRGB(c){c=String(c||'').trim();let m=c.match(/^#([0-9a-f]{6})$/i);if(m)return [0,2,4].map(i=>parseInt(m[1].substr(i,2),16));m=c.match(/rgba?\(([^)]+)\)/);if(m)return m[1].split(/[ ,\/]+/).slice(0,3).map(Number);
  try{const cv=document.createElement('canvas').getContext('2d');cv.fillStyle=c;const v=cv.fillStyle;if(/^#/.test(v))return hexRGB(v);m=v.match(/rgba?\(([^)]+)\)/);if(m)return m[1].split(/[ ,\/]+/).slice(0,3).map(Number);}catch(e){}return [128,128,128];}
function lab(rgb){const f=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)};const [r,g,b]=rgb.map(f);
  const l=Math.cbrt(0.4122214708*r+0.5363325363*g+0.0514459929*b),m=Math.cbrt(0.2119034982*r+0.6806995451*g+0.1073969566*b),s2=Math.cbrt(0.0883024619*r+0.2817188376*g+0.6299787005*b);
  return [0.2104542553*l+0.793617785*m-0.0040720468*s2,1.9779984951*l-2.428592205*m+0.4505937099*s2,0.0259040371*l+0.7827717662*m-0.808675766*s2];}
const dE=(a,b)=>{const x=lab(a),y=lab(b);return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2])*100;};
function collarColor(){const r=document.documentElement;const key=(r.dataset.look||'')+'|'+(r.dataset.theme||'')+'|'+(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'d':'l');
  if(key===_colKey)return _col;const cs=getComputedStyle(r);const bgs=['--hero1','--hero2','--surface','--bg','--surface-2'].map(v=>hexRGB(cs.getPropertyValue(v)));const fur=[[233,151,76],[251,235,211]];
  let best=COLLARS[0],sc=-1;COLLARS.forEach(c=>{const rgb=hexRGB(c);const s=Math.min(...bgs.map(b=>dE(rgb,b)))+0.6*Math.min(...fur.map(f=>dE(rgb,f)));if(s>sc){sc=s;best=c;}});_colKey=key;return _col=best;}
function collarSVG(part){const c=collarColor();
  if(part==='band')return `<path d="M43 68 Q60 80 77 68 L77 71.6 Q60 83.6 43 71.6 Z" fill="${c}"/><path d="M43.5 71.4 Q60 83.2 76.5 71.4" stroke="rgba(0,0,0,.2)" stroke-width=".9" fill="none"/>`;
  return `<circle cx="60" cy="78.6" r="1.3" fill="none" stroke="#B8862B" stroke-width="1"/><rect x="52.5" y="79.6" width="15" height="6.4" rx="3.2" fill="#F2C14E" stroke="#B8862B" stroke-width=".8"/><text x="60" y="84.5" text-anchor="middle" font-size="4.6" font-weight="800" fill="#7A4A1E" font-family="Bricolage Grotesque,Figtree,system-ui">Luffy</text>`;}
/* Luffy: Lina's Persian cat. Moods: open (copper eyes), excited (big glossy), meh (sleepy Persian), happy (content), sleepy, wink */
function catSVG(mood,o){o=o||{};const pose=o.pose||(o.coins?'coin':o.box?'box':o.hat?'chef':'sit');let m=mood==='neutral'?'open':(mood||'open');
  const hr=new Date().getHours();if(m==='open'&&!o.noNight&&(hr>=22||hr<5)&&pose!=='peek')m='sleepy';
  const F='#E9974C',S='#CD7834',C='#FBEBD3',W='#FFF8EE',P='#F2A9A3',K='#3B2416';
  const head=(x,y,md,s)=>{s=(s||1)*0.75;const xs=[53,87],ey=62;
    const cop=x=>`<g class="k-eye"><circle cx="${x}" cy="${ey}" r="9.6" fill="#D9822B"/><circle cx="${x}" cy="${ey}" r="9.6" fill="none" stroke="${K}" stroke-width="1.4"/><circle cx="${x}" cy="${ey+.6}" r="6.4" fill="#24140B"/><circle cx="${x+3}" cy="${ey-3}" r="3" fill="#fff"/><circle cx="${x-3.2}" cy="${ey+3.4}" r="1.3" fill="#fff"/></g>`;
    const glo=x=>`<g class="k-eye"><circle cx="${x}" cy="${ey}" r="10" fill="${K}"/><circle cx="${x}" cy="${ey+1.5}" r="8.6" fill="#7A3E14"/><circle cx="${x}" cy="${ey+.5}" r="7.4" fill="#24140B"/><circle cx="${x+3.2}" cy="${ey-3.4}" r="3.3" fill="#fff"/><circle cx="${x-3.4}" cy="${ey+3.6}" r="1.5" fill="#fff"/><path d="M${x-6} ${ey+5.5} q6 3 12 0" stroke="#D98A3D" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".9"/></g>`;
    const meh=x=>`<ellipse cx="${x}" cy="${ey+1}" rx="8" ry="6.4" fill="#24140B"/><path d="M${x-8.5} ${ey-2.5} q8.5 -4 17 0" stroke="${F}" stroke-width="3.4" fill="none"/><path d="M${x-8.5} ${ey-1.5} q8.5 -4 17 0" stroke="${K}" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="${x+3}" cy="${ey-.2}" r="2.4" fill="#fff"/><circle cx="${x-2.6}" cy="${ey+3}" r="1" fill="#fff"/>`;
    const arcU=x=>`<path d="M${x-7} ${ey+2} q7 -7 14 0" stroke="${K}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
    const arcD=x=>`<path d="M${x-7} ${ey} q7 5 14 0" stroke="${K}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
    const eyes=md==='happy'?xs.map(arcU).join(''):md==='sleepy'?xs.map(arcD).join(''):md==='excited'?xs.map(glo).join(''):md==='meh'?xs.map(meh).join(''):md==='wink'?arcU(53)+cop(87):xs.map(cop).join('');
    return `<g transform="translate(${x} ${y}) scale(${s}) translate(-70 -59)"><path d="M33 40 Q29 25 44 29 Z M107 40 Q111 25 96 29 Z" fill="${F}"/><path d="M36 37 Q34 29 42 31 Z M104 37 Q106 29 98 31 Z" fill="${P}"/>
      <path d="${fluffP(70,59,44,35,26,.075)}" fill="${F}"/><path d="M63 32 q2 5 0 9 M70 30 v11 M77 32 q-2 5 0 9" stroke="${S}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      <path d="${fluffP(70,78,25,15,14,.13)}" fill="${C}"/>${eyes}
      <path d="M67.2 70 h5.6 l-2.8 3 z" fill="${P}" stroke="#D07E76" stroke-width=".7" stroke-linejoin="round"/><path d="M70 73 v2 M66 75.6 q2 1.8 4 0 q2 1.8 4 0" stroke="${K}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="42" cy="73" rx="5.5" ry="3" fill="#F5A38F" opacity=".55"/><ellipse cx="98" cy="73" rx="5.5" ry="3" fill="#F5A38F" opacity=".55"/>
      <path d="M49 75 h-20 M49 78.5 l-18 3.5 M91 75 h20 M91 78.5 l18 3.5" stroke="#D9B48C" stroke-width="1.1" stroke-linecap="round" opacity=".9"/></g>`;};
  const wrap=(g,vb)=>`<svg viewBox="${vb||'0 0 120 116'}" class="kitty" aria-hidden="true">${g}</svg>`;
  const zz=`<g class="k-z" fill="${o.zc||'#E0A93A'}" font-weight="800" font-family="Bricolage Grotesque,system-ui"><text x="82" y="50" font-size="12">z</text><text x="92" y="38" font-size="16">Z</text></g>`;
  if(pose==='curl')return wrap(`<path class="k-tail" d="${fluffP(82,104,30,9,12,.16,.05)}" fill="${F}"/><path d="${fluffP(68,90,40,20,20,.07)}" fill="${F}"/><path d="M70 74 q4 6 2 12 M82 73 q3 7 0 13 M94 76 q2 6 -2 12" stroke="${S}" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="54" cy="108" rx="10" ry="5.5" fill="${W}"/>${head(40,82,'sleepy',.8)}${zz}`);
  if(pose==='peek')return wrap(`${head(60,72,m,1.05)}<g fill="${W}"><ellipse cx="42" cy="103" rx="10" ry="6.5"/><ellipse cx="78" cy="103" rx="10" ry="6.5"/></g><path d="M38 104 v3 M42 104 v3 M46 104 v3 M74 104 v3 M78 104 v3 M82 104 v3" stroke="#E3CFB2" stroke-width="1.1" stroke-linecap="round"/>`,'0 0 120 108');
  let g=`<path class="k-tail" d="${fluffP(94,92,10,22,11,.17,-0.75)}" fill="${F}"/><path d="${fluffP(60,92,31,22,20,.07)}" fill="${F}"/><path d="${fluffP(60,86,21,19,16,.12)}" fill="${C}"/>`;
  const chest=inner=>inner+`<g fill="${W}"><ellipse cx="47" cy="92" rx="6.5" ry="5.5"/><ellipse cx="73" cy="92" rx="6.5" ry="5.5"/></g>`;
  const paws=`<g fill="${W}"><ellipse cx="48" cy="110" rx="9" ry="5.5"/><ellipse cx="72" cy="110" rx="9" ry="5.5"/></g><path d="M45 111 v2.5 M48 111.5 v2.5 M51 111 v2.5 M69 111 v2.5 M72 111.5 v2.5 M75 111 v2.5" stroke="#E3CFB2" stroke-width="1" stroke-linecap="round"/>`;
  if(pose==='cozy')g+=`<path d="M28 78 Q60 62 92 78 L96 112 L24 112 Z" fill="#8C7B70"/><path d="M34 84 L88 84 M30 96 L92 96 M48 72 L46 112 M74 72 L76 112" stroke="#6E6058" stroke-width="2"/><rect x="80" y="90" width="16" height="16" rx="3" fill="#F8F2EA" stroke="#A39382"/><path d="M96 94 q5 0 5 4 q0 4 -5 4" stroke="#A39382" stroke-width="2" fill="none"/><path class="k-z" d="M85 86 q-2 -4 1 -7 M91 86 q-2 -4 1 -7" stroke="#A39382" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  else if(pose==='coin')g+=chest(`<circle cx="60" cy="90" r="12" fill="#F2C14E" stroke="#B8862B" stroke-width="2"/><text x="60" y="95" text-anchor="middle" font-size="13" font-weight="700" fill="#8A6212" font-family="Figtree,system-ui">₪</text>`)+`<ellipse cx="22" cy="108" rx="12" ry="4" fill="#B8862B"/><ellipse cx="22" cy="104" rx="12" ry="4" fill="#F2C14E" stroke="#B8862B"/><ellipse cx="22" cy="99" rx="10" ry="3.6" fill="#F2C14E" stroke="#B8862B"/>`;
  else if(pose==='gift')g+=chest(`<rect x="46" y="80" width="28" height="24" rx="4" fill="#2E6FB8"/><rect x="57" y="80" width="6" height="24" fill="#E0A93A"/><rect x="46" y="89" width="28" height="5" fill="#E0A93A"/><path d="M60 80 q-9 -9 -12 -3 q-2 5 12 3 q9 -9 12 -3 q2 5 -12 3" fill="none" stroke="#E0A93A" stroke-width="2.4"/>`);
  else if(pose==='heart')g+=chest(`<path d="M60 103 C42 91 45 77 54 78 C57.5 78.5 60 81.5 60 84 C60 81.5 62.5 78.5 66 78 C75 77 78 91 60 103Z" fill="#E04B5A" stroke="#A8303C" stroke-width="1.6"/><path d="M53 84 q2 -3 5 -2" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>`);
  else if(pose==='cake')g+=`<g><rect x="40" y="86" width="40" height="22" rx="4" fill="#F8E6C1"/><path d="M40 92 q5 4 10 0 q5 4 10 0 q5 4 10 0 q5 4 10 0" fill="none" stroke="#9D4EDD" stroke-width="3"/><rect x="58" y="74" width="4" height="12" rx="1.5" fill="#E0A93A"/><path class="k-z" d="M60 66 q4 4 0 8 q-4 -4 0 -8Z" fill="#F2C14E"/></g><g fill="#E3A73F"><ellipse cx="40" cy="98" rx="6" ry="5"/><ellipse cx="80" cy="98" rx="6" ry="5"/></g>`;
  else if(pose==='star')g+=chest(`<path d="M60 76 l4.4 9 9.9 1.4 -7.2 7 1.7 9.8 -8.8 -4.6 -8.8 4.6 1.7 -9.8 -7.2 -7 9.9 -1.4z" fill="#F2C14E" stroke="#B8862B" stroke-width="1.6" stroke-linejoin="round"/>`);
  else if(pose!=='box')g+=paws;
  if(pose==='scarf')g+=`<g transform="translate(0 9)"><path d="M38 66 Q60 77 82 66 L83 73 Q60 85 37 73 Z" fill="#2E6FB8"/><path d="M40 70 Q60 80 80 70" stroke="#E0A93A" stroke-width="1.6" fill="none"/><rect x="66" y="74" width="9" height="20" rx="2" fill="#2E6FB8" transform="rotate(-8 70 74)"/></g>`;

  const col=!['scarf','box','cozy'].includes(pose);if(col)g+=collarSVG('band');
  g+=head(60,44,m);
  if(col)g+=collarSVG('tag');
  if(pose==='box')g+=`<path d="M24 82 L96 82 L92 114 L28 114 Z" fill="#8B5E3C"/><path d="M24 82 L12 70 L38 70 L46 82 Z M96 82 L108 70 L82 70 L74 82 Z" fill="#A97A55"/><path d="M42 98 h36" stroke="#6E4A2F" stroke-width="2" stroke-linecap="round"/><g fill="${F}"><ellipse cx="48" cy="83" rx="7" ry="4.5"/><ellipse cx="72" cy="83" rx="7" ry="4.5"/></g>`;
  if(pose==='chef')g+=`<g transform="translate(60 44)"><path d="M-18 -27 Q-25 -47 -10 -45 Q-6 -58 5 -52 Q17 -56 19 -43 Q29 -41 20 -27 Z" fill="#FFFDF8" stroke="#D9CFC4"/><rect x="-19" y="-31" width="38" height="8" rx="3" fill="#FFFDF8" stroke="#D9CFC4"/></g><path d="M88 74 l8 -22" stroke="#8C7B70" stroke-width="2.4" stroke-linecap="round"/><path d="M96 52 q-6 -10 0 -14 q6 4 0 14 M96 52 q-2 -10 0 -14" stroke="#A39382" stroke-width="1.4" fill="none"/>`;
  return wrap(g,pose==='chef'?'0 -14 120 130':undefined);}

const SCALEI='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="4" width="17" height="16" rx="4" stroke="currentColor" stroke-width="2"/><path d="M8.5 10a3.5 3.5 0 0 1 7 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="m12 10 1.5-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const PAW='<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><g fill="#2B211C"><ellipse cx="16" cy="21" rx="7" ry="6"/><circle cx="7.5" cy="13" r="3"/><circle cx="12.5" cy="8" r="3"/><circle cx="19.5" cy="8" r="3"/><circle cx="24.5" cy="13" r="3"/></g></svg>';
const CALM=["One payment at a time. You're doing fine.","Every payment makes it a little lighter.","Slow and steady still gets there.","Debts shrink. Cats nap. Both count as progress.","You're handling this. Be proud of each payment.","No rush. Just the next small step."];

/* ---------- closet ---------- */
const TYPES=['Top','T-shirt','Shirt & blouse','Sweater','Pants','Jeans','Skirt','Dress','عباية','Jacket & coat','حجاب & scarf','Sportswear','Sleepwear','Shoes','Bag','Accessory'];
const FITS={fits:'Fits now',small:'Too small',big:'Too big'};
const PLANS={keep:'Keep',sell:'Sell',gift:'Gift',donate:'Donate'};
const OCCS=['Home with guests','Going out','Work','Family visit','Special occasion'];
const TAG_PROMPT='The photo shows one clothing item, shoe, bag or accessory. Reply with only this JSON object: {"name": a short descriptive name of 2-4 words like "Black wide-leg pants", "type": exactly one of '+JSON.stringify(TYPES)+', "color": the main color in 1-2 words}. If the photo shows several items, describe the main one.';
let assetsNS=null;
async function initAssets(){try{if(window.claude&&typeof window.claude.use==='function')assetsNS=await window.claude.use('assets');}catch(e){assetsNS=null;}}
const imgSrc=it=>it.photo?'/_blob/'+it.photo:(it.thumb||'');
function loadImg(file){return new Promise((res,rej)=>{const u=URL.createObjectURL(file);const im=new Image();im.onload=()=>res({im,u});im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('decode'));};im.src=u;});}
function drawTo(im,max){const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;const s=Math.min(1,max/Math.max(iw,ih));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(iw*s));c.height=Math.max(1,Math.round(ih*s));c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c;}
const addQ={files:[],total:0,done:0,running:false,failed:0};
async function runQ(){if(addQ.running)return;addQ.running=true;render();
  while(addQ.files.length){const f=addQ.files.shift();
    try{const {im,u}=await loadImg(f);const pp=await prepClosetPhoto(im);const big=pp.photo;
      const item={id:'c'+newId(),name:'New piece',type:'',color:'',fit:'fits',clean:true,plan:'keep',status:'reading',createdAt:Date.now()};
      await storeClosetPhoto(item,pp);
      URL.revokeObjectURL(u);
      await store.put('closet',item);
      let tag=null;if(sampleFn&&canScan){try{tag=await sampleFn.json(TAG_PROMPT,{images:[big],modelTier:'quick'});}catch(e){if(e&&['not_granted','sampling_disabled','images_unavailable'].includes(e.code))canScan=false;}}
      const upd={...item,status:'ready'};
      if(tag&&typeof tag==='object'){if(tag.name)upd.name=String(tag.name).slice(0,40);if(TYPES.includes(tag.type))upd.type=tag.type;if(tag.color)upd.color=String(tag.color).slice(0,20);}
      await store.put('closet',upd);}
    catch(e){addQ.failed++;const m=e&&e.code==='quota_or_state'?'Photo storage is full.':e&&e.code==='too_large'?'That photo is too large.':"Couldn't add one of the photos.";toast(m);}
    addQ.done++;render();}
  addQ.running=false;const f=addQ.failed;addQ.total=0;addQ.done=0;addQ.failed=0;render();if(addQ.total===0&&!f)toast('Added to your closet');}
function closetFiltered(){const f=state.cf||'all',t=state.ctype||'';return [...state.closet].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).filter(it=>{
  if(t&&it.type!==t)return false;
  if(f==='wear')return it.clean!==false&&it.fit==='fits'&&(it.plan||'keep')==='keep';
  if(f==='laundry')return it.clean===false;if(f==='small')return it.fit==='small'||it.fit==='big';
  if(f==='letgo')return ['sell','gift','donate'].includes(it.plan);
  if(['sell','gift','donate'].includes(f))return it.plan===f;return true;});}
function renderCloset(){
  const all=state.closet;const n=all.length;const dirty=all.filter(i=>i.clean===false).length;const nofit=all.filter(i=>i.fit&&i.fit!=='fits').length;
  const letgo=all.filter(i=>['sell','gift','donate'].includes(i.plan)).length;const wear=all.filter(wearable).length;const cf=state.cf||'all';
  const q=addQ.running?`<div class="bq-q">Adding photos · ${addQ.done} of ${addQ.total}<div class="minibar"><span style="width:${addQ.total?addQ.done/addQ.total*100:0}%;background:var(--bq-ink)"></span></div></div>`:'';
  const stat=(k,v,t)=>`<button data-cf="${k}" class="${cf===k?'sel':''}" aria-pressed="${cf===k}"><b class="num">${v}</b>${t}</button>`;
  $('clSummary').innerHTML=`<div class="bq-head"><div><span class="bq-caps">The wardrobe</span><h2 class="bq-h num">${n} piece${n===1?'':'s'}</h2></div><div class="bq-cat">${catSVG(dirty>0?'neutral':'happy',{pose:n===0?'box':'scarf'})}</div></div>
    ${n?`<div class="bq-stats">${stat('wear',wear,'ready')}${stat('laundry',dirty,'in laundry')}${stat('small',nofit,"doesn't fit")}${stat('letgo',letgo,'to let go')}</div>`:''}${q}`;
  renderLook();
  if(!n){$('clGrid').innerHTML=`<div class="bq-empty">${catSVG('happy',{box:true})}<h3>An empty rail</h3><p>Hang each piece on the same door, in daylight, and take a photo. Start with the ones that don't fit, so you can decide what to keep, sell, gift or donate.</p><button class="bq-btn" data-cladd style="margin-top:8px">Add your first pieces</button></div>`;return;}
  const types=[...new Set(all.map(i=>i.type).filter(Boolean))].sort((a,b)=>TYPES.indexOf(a)-TYPES.indexOf(b));
  if(state.ctype&&!types.includes(state.ctype))state.ctype='';
  const pill=(v,t)=>`<button class="bq-pill ${(state.ctype||'')===v?'sel':''}" data-ctype="${esc(v)}" aria-pressed="${(state.ctype||'')===v}">${esc(t)}</button>`;
  const list=closetFiltered();
  const groups=[];if(state.ctype)groups.push([state.ctype,list]);else{const used=new Set();RAILS.forEach(([t,ts])=>{const g=list.filter(i=>ts.includes(i.type));g.forEach(i=>used.add(i.id));if(g.length)groups.push([t,g]);});const un=list.filter(i=>!used.has(i.id));if(un.length)groups.push(['',un]);}
  $('clGrid').innerHTML=`<div class="bq-pills" role="group" aria-label="Filter by type">${pill('','All')}${types.map(t=>pill(t,t)).join('')}</div>
    ${cf==='laundry'&&list.length?`<button class="bq-btn out bq-laundry" data-laundrydone>Laundry's done · mark ${list.length} clean</button>`:''}
    ${groups.length?groups.map(([t,its])=>`<div class="bq-rail"><div class="bq-railhead"><h3>${esc(t||'Not sorted yet')}</h3><span class="bq-caps num">${its.length}</span></div><div class="bq-scroll"><div class="bq-hang">${its.map(hangHtml).join('')}</div></div></div>`).join(''):`<p class="bq-none">Nothing on the rail for this filter.</p>`}`;
}
const RAILS=[['Tops',['Top','T-shirt','Shirt & blouse','Sweater']],['Bottoms',['Pants','Jeans','Skirt']],['Dresses & عبايات',['Dress','عباية']],['Layers',['Jacket & coat']],['Hijabs & scarves',['حجاب & scarf']],['Shoes & bags',['Shoes','Bag']],['Accessories',['Accessory']],['Sport & sleep',['Sportswear','Sleepwear']]];
const CL_GROUPS={top:['Top','T-shirt','Shirt & blouse','Sweater'],bottom:['Pants','Jeans','Skirt'],one:['Dress','عباية'],layer:['Jacket & coat'],head:['حجاب & scarf'],shoes:['Shoes'],bag:['Bag']};
const clSrc=it=>(!it.crop&&it.orig&&it.bg&&it.bg!=='orig')?'/_blob/'+it.orig:imgSrc(it);
const wearable=it=>it.clean!==false&&it.fit==='fits'&&(it.plan||'keep')==='keep'&&it.status!=='reading';
const HOOK='<svg class="bq-hook" viewBox="0 0 22 24" aria-hidden="true"><path d="M11 24V14.6c0-1.7 4.4-2.4 4.4-6.3 0-2.8-2-4.8-4.4-4.8S6.6 5.4 6.6 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
function hangHtml(it){const flags=[it.clean===false?'Laundry':'',it.fit&&it.fit!=='fits'?FITS[it.fit]:'',it.plan&&it.plan!=='keep'?PLANS[it.plan]:''].filter(Boolean);const src=clSrc(it);
  return `<button class="bq-hg" data-cl="${esc(it.id)}">${HOOK}<span class="bq-arch"><i>${src?`<img src="${esc(src)}" alt="" loading="lazy">`:''}${it.status==='reading'?'<span class="bq-reading">Reading</span>':''}</i></span>
    <b>${esc(it.name||'New piece')}</b><small class="${flags.length?'flag':''}">${esc(flags.length?flags.join(' · '):(it.color||' '))}</small></button>`;}
function clLsGet(k){try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}}
function clLsPut(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function seedRand(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return ()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);h^=h>>>16;return (h>>>0)/4294967296;};}
function pickLook(n){const w=state.closet.filter(wearable);const r=seedRand(todayStr+':'+n);const of=g=>w.filter(i=>CL_GROUPS[g].includes(i.type));const one=a=>a.length?a[Math.floor(r()*a.length)]:null;
  const tops=of('top'),bots=of('bottom'),ones=of('one');const canTB=tops.length&&bots.length;let base=[];
  if(ones.length&&(!canTB||r()<ones.length/(ones.length+Math.min(tops.length,bots.length))))base=[one(ones)];
  else if(canTB)base=[one(tops),one(bots)];
  else{const pool=[...w];while(base.length<Math.min(3,pool.length))base.push(pool.splice(Math.floor(r()*pool.length),1)[0]);return base.map(i=>i.id);}
  const extra=[];['head','shoes','bag'].forEach(g=>{const x=one(of(g));if(x)extra.push(x);});const lay=one(of('layer'));if(lay&&r()<.5)extra.splice(1,0,lay);
  return [...base,...extra].slice(0,5).map(i=>i.id);}
function lookOk(L){return L&&L.d===todayStr&&Array.isArray(L.ids)&&L.ids.length&&L.ids.every(id=>{const it=state.closet.find(x=>x.id===id);return it&&wearable(it);});}
function todaysLook(){let L=clLsGet('lb.look');if(lookOk(L))return L;const n=L&&L.d===todayStr?(L.n||0)+1:0;L={d:todayStr,ids:pickLook(n),n,src:'auto'};if(L.ids.length)clLsPut('lb.look',L);return L;}
function anotherLook(){const L=clLsGet('lb.look');const cur=L&&L.d===todayStr?L:{n:0,ids:[]};let n=(cur.n||0),ids=[];for(let k=0;k<8;k++){n++;ids=pickLook(n);if(ids.join()!==(cur.ids||[]).join())break;}clLsPut('lb.look',{d:todayStr,ids,n,src:'auto'});renderLook();}
function renderLook(){const host=$('clLook');if(!host)return;const w=state.closet.filter(wearable);
  if(!state.closet.length){host.innerHTML='';return;}
  if(w.length<2){host.innerHTML=`<div class="bq-look"><span class="bq-caps">Today's look</span><p class="bq-cap">Once two clean pieces that fit are marked Keep, a look will be waiting here.</p></div>`;return;}
  const L=todaysLook();const its=L.ids.map(id=>state.closet.find(x=>x.id===id)).filter(Boolean);
  const names=its.map(i=>String(i.name||'piece').toLowerCase());let cap=names.length>1?names.slice(0,-1).join(', ')+' & '+names[names.length-1]:(names[0]||'');cap=cap.charAt(0).toUpperCase()+cap.slice(1);
  const dl=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  host.innerHTML=`<div class="bq-look"><div class="bq-lookhead"><span class="bq-caps" style="color:var(--bq-ink)">Today's look</span><span class="bq-caps">${esc(dl)}</span></div>
    <div class="bq-board n${its.length}">${its.map((it,k)=>{const src=clSrc(it);return `<button class="bq-fr ${k===0?'big':''}" data-cl="${esc(it.id)}" aria-label="${esc(it.name||'Piece')}"><i>${src?`<img src="${esc(src)}" alt="" loading="lazy">`:''}</i></button>`;}).join('')}</div>
    ${L.src==='ai'&&L.title?`<span class="bq-caps bq-looktitle">${esc(L.title)}</span>`:''}<p class="bq-cap">${esc(cap)}</p>
    <div class="bq-lookbtns"><button class="bq-btn" data-lookagain>Pick another look</button><button class="bq-btn out" data-outfit>Ask the stylist</button></div></div>`;}
function addClothes(){let off=false;try{off=localStorage.getItem('lb.cltip')==='off';}catch(e){}if(off){$('closetFile').click();return;}$('clTipOff').checked=false;openSheet('clTipSheet');}
/* item sheet */
function openItem(id){state.openItem=id;state.itemConfirm=false;state.bgEdit=null;state.crop=null;openSheet('itemSheet');renderItem();}
function renderItem(){const it=state.closet.find(x=>x.id===state.openItem);if(!it){return;}
  const seg=(f,opts,cur)=>`<div class="seg" style="grid-template-columns:repeat(${opts.length},minmax(0,1fr))">${opts.map(([v,t])=>`<button data-itset="${f}:${v}" aria-pressed="${String(cur)===String(v)}">${t}</button>`).join('')}</div>`;
  $('itemBody').innerHTML=`${cropHtml(it)}
    <div class="field"><label for="itName">Name</label><input id="itName" maxlength="40" value="${esc(it.name||'')}"></div>
    <div class="two"><div class="field"><label for="itType">Type</label><select id="itType"><option value="">Choose</option>${TYPES.map(t=>`<option ${it.type===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div>
    <div class="field"><label for="itColor">Color</label><input id="itColor" maxlength="20" value="${esc(it.color||'')}"></div></div>
    <span class="label">Right now</span>${seg('clean',[['1','Clean'],['0','In laundry']],it.clean===false?'0':'1')}
    <span class="label">Fit</span>${seg('fit',Object.entries(FITS),it.fit||'fits')}
    <span class="label">Plan</span>${seg('plan',Object.entries(PLANS),it.plan||'keep')}
    ${state.itemConfirm?`<p class="hint">Delete this piece and its photo? This can't be undone.</p><div class="two"><button class="btn2" data-itcancel>Keep it</button><button class="del" data-itdel>Delete</button></div>`:`<button class="del" data-itask style="width:100%">Delete piece</button>`}`;
  const save=async(patch)=>{const cur=state.closet.find(x=>x.id===it.id);if(!cur)return;try{await store.put('closet',{...cur,...patch});}catch(e){toast("Couldn't save. Check your connection.");}};
  $('itName').onchange=()=>save({name:$('itName').value.trim().slice(0,40)||'New piece'});
  $('itColor').onchange=()=>save({color:$('itColor').value.trim().slice(0,20)});
  $('itType').onchange=()=>save({type:$('itType').value});
  state._saveItem=save;wireCrop(it);}
/* outfits */
function openOutfit(){state.outfits=null;state.outBusy=false;state.outErr='';renderOutfit();openSheet('outfitSheet');}
function renderOutfit(){const occ=state.occ||OCCS[0];
  let res='';
  if(state.outBusy)res=`<div class="outbusy">${catSVG('neutral',{pose:'scarf'})}<p>Picking outfits from your clean clothes…</p></div>`;
  else if(state.outErr)res=`<p class="err">${esc(state.outErr)}</p>`;
  else if(state.outfits)res=state.outfits.map((o,oi)=>{const its=(o.items||[]).map(id=>state.closet.find(x=>x.id===id)).filter(Boolean);if(!its.length)return '';
    return `<div class="outfit"><b>${esc(o.title||'Outfit')}</b><div class="outimgs">${its.map(it=>`<button class="outit" data-cl="${esc(it.id)}">${clSrc(it)?`<img src="${esc(clSrc(it))}" alt="${esc(it.name)}">`:''}<small>${esc(it.name)}</small></button>`).join('')}</div>${o.tip?`<p class="hint">${esc(o.tip)}</p>`:''}<button class="btn2" data-wearlook="${oi}" style="align-self:flex-start">Wear this today</button></div>`;}).join('')||'<p class="hint">No outfits came back. Try again.</p>';
  $('outfitBody').innerHTML=`<span class="label">Where are you going?</span><div class="chips">${OCCS.map(o=>`<button class="fchip ${occ===o?'sel':''}" data-occ="${esc(o)}" aria-pressed="${occ===o}">${esc(o)}</button>`).join('')}</div>
    <button class="primary" data-suggest ${state.outBusy?'disabled':''}>${state.outfits?'Try other outfits':'Suggest outfits'}</button>${res}
    <p class="hint">Only uses clean pieces that fit now and are marked Keep.</p>`;}
async function suggestOutfits(){if(!sampleFn){state.outErr='Outfit ideas need this page open from your Claude account.';renderOutfit();return;}
  const wear=state.closet.filter(i=>i.clean!==false&&i.fit==='fits'&&(i.plan||'keep')==='keep'&&i.status!=='reading');
  if(wear.length<2){state.outErr='Add at least two clean pieces that fit to get outfit ideas.';renderOutfit();return;}
  state.outBusy=true;state.outErr='';renderOutfit();
  const lines=wear.slice(0,200).map(i=>`${i.id} | ${i.name} | ${i.type||'unknown'} | ${i.color||'unknown'}`).join('\n');
  const prompt=`Act as a friendly personal stylist. Suggest 3 different outfits for this occasion: "${state.occ||OCCS[0]}". Use ONLY items from this wardrobe list (each line: id | name | type | color):\n${lines}\n\nEach outfit uses 2 to 5 items that work together (a top with a bottom, or a dress or abaya; add shoes, a bag, a hijab or scarf, or an accessory when the list has them). Do not repeat the exact same outfit. Reply with only JSON: {"outfits":[{"title":"short name","items":["id1","id2"],"tip":"one short styling sentence"}]}`;
  try{const r=await sampleFn.json(prompt,{cache:false,modelTier:'default'});state.outfits=Array.isArray(r&&r.outfits)?r.outfits.slice(0,3):[];}
  catch(e){const m={not_granted:'Allow this page to use Claude to get outfit ideas.',rate_limited:'Too many requests right now. Try again in a minute.',session_expired:'Sign in to Claude again, then try.'};state.outErr=m[e&&e.code]||"Couldn't get outfit ideas. Try again.";}
  state.outBusy=false;renderOutfit();}

/* ---------- closet photos: crop + auto-brighten (no background removal) ---------- */
const CROP_A=3/4,DARK_LUM=0.42;
function cropRect(w,h,c){let cw,ch;if(w/h>CROP_A){ch=h;cw=h*CROP_A;}else{cw=w;ch=w/CROP_A;}const z=Math.max(1,Math.min(3,c.z||1));cw/=z;ch/=z;
  const cx=Math.max(cw/2/w,Math.min(1-cw/2/w,c.cx==null?.5:c.cx)),cy=Math.max(ch/2/h,Math.min(1-ch/2/h,c.cy==null?.5:c.cy));
  return {sx:cx*w-cw/2,sy:cy*h-ch/2,cw,ch,cx,cy,z};}
function imgLum(src){const c=drawTo(src,64);const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let t=0,n=0;for(let i=0;i<d.length;i+=4){t+=0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2];n++;}return n?t/n/255:0.5;}
function brighten(cv,lum){const g=Math.max(0.55,Math.min(1,Math.log(0.5)/Math.log(Math.max(0.05,Math.min(0.95,lum)))));if(g>=0.99)return cv;
  const x=cv.getContext('2d',{willReadFrequently:true});const img=x.getImageData(0,0,cv.width,cv.height);const d=img.data;const lut=new Uint8ClampedArray(256);for(let i=0;i<256;i++)lut[i]=Math.round(255*Math.pow(i/255,g));
  for(let i=0;i<d.length;i+=4){d[i]=lut[d[i]];d[i+1]=lut[d[i+1]];d[i+2]=lut[d[i+2]];}x.putImageData(img,0,0);return cv;}
function cropCanvas(src,c,bright,lum){const w=src.naturalWidth||src.width,h=src.naturalHeight||src.height;const r=cropRect(w,h,c);const OW=Math.max(1,Math.round(Math.min(900,r.cw))),OH=Math.round(OW/CROP_A);
  const out=document.createElement('canvas');out.width=OW;out.height=OH;const x=out.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,OW,OH);x.drawImage(src,r.sx,r.sy,r.cw,r.ch,0,0,OW,OH);
  if(bright)brighten(out,lum==null?imgLum(src):lum);return {canvas:out,crop:{cx:+r.cx.toFixed(4),cy:+r.cy.toFixed(4),z:+r.z.toFixed(3)}};}
async function prepClosetPhoto(im){const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;const k=Math.min(1,1100/Math.max(iw,ih));
  const oc=document.createElement('canvas');oc.width=Math.max(1,Math.round(iw*k));oc.height=Math.max(1,Math.round(ih*k));const ox=oc.getContext('2d');ox.fillStyle='#fff';ox.fillRect(0,0,oc.width,oc.height);ox.drawImage(im,0,0,oc.width,oc.height);
  const lum=imgLum(oc);const bright=lum<DARK_LUM;const {canvas,crop}=cropCanvas(oc,{cx:.5,cy:.5,z:1},bright,lum);
  return {orig:await toBlobP(oc,'image/jpeg',0.88),photo:await toBlobP(canvas,'image/jpeg',0.86),canvas,crop,bright};}
async function storeClosetPhoto(obj,pp){
  if(assetsNS){const u1=await assetsNS.upload(pp.orig,{type:'image/jpeg'});obj.orig=u1.id;const u2=await assetsNS.upload(pp.photo,{type:'image/jpeg'});obj.photo=u2.id;}
  else obj.thumb=drawTo(pp.canvas,420).toDataURL('image/jpeg',0.75);
  obj.bg='orig';obj.crop=pp.crop;obj.bright=pp.bright;}
function cropHtml(it){const src=clSrc(it);
  if(!assetsNS||!(it.orig||it.photo))return `<div class="itimg">${src?`<img src="${esc(src)}" alt="${esc(it.name)}">`:''}</div>`;
  const c=state.crop&&state.crop.id===it.id?state.crop:null;
  return `<div class="bq-crop"><div class="bq-cropbox" id="cropBox" tabindex="0" role="img" aria-label="Photo of ${esc(it.name||'this piece')}. Drag, or use the arrow keys, to frame it."><img id="cropImg" alt="" draggable="false"></div>
    <div class="slider"><label for="cropZ">Zoom</label><input type="range" id="cropZ" min="1" max="3" step="0.01" value="${c?c.z:((it.crop&&it.crop.z)||1)}"></div>
    <div class="bq-croprow"><label class="toggle"><input type="checkbox" id="cropBright" ${(c?c.bright:it.bright)?'checked':''}> Brighten</label><button class="btn2" data-cropreset>Reset</button></div>
    <p class="hint">Drag the photo to frame the piece in the arch. Pinch or slide to zoom.</p>
    <button class="primary" data-cropsave ${c&&c.dirty?'':'hidden'} ${c&&c.busy?'disabled':''}>${c&&c.busy?'Saving…':'Save crop'}</button></div>`;}
function wireCrop(it){const box=$('cropBox');if(!box)return;
  if(!state.crop||state.crop.id!==it.id){const c0=it.crop||{};state.crop={id:it.id,cx:c0.cx!=null?c0.cx:.5,cy:c0.cy!=null?c0.cy:.5,z:c0.z||1,bright:it.bright,dirty:false,busy:false};}
  const C=state.crop,img=$('cropImg'),zs=$('cropZ'),bc=$('cropBright');const srcUrl='/_blob/'+(it.orig||it.photo);
  function setSrc(){if(!C.im)return;if(C.bright){if(!C.bUrl)C.bUrl=brighten(drawTo(C.im,1000),C.lum).toDataURL('image/jpeg',0.85);img.src=C.bUrl;}else img.src=srcUrl;}
  function layout(){if(!C.im||!box.isConnected)return;const W=box.clientWidth;if(!W){requestAnimationFrame(layout);return;}const w=C.im.naturalWidth,h=C.im.naturalHeight;const r=cropRect(w,h,C);C.cx=r.cx;C.cy=r.cy;const k=W/r.cw;
    img.style.width=w*k+'px';img.style.height=h*k+'px';img.style.transform=`translate(${-r.sx*k}px,${-r.sy*k}px)`;}
  function dirty(){if(C.dirty)return;C.dirty=true;const b=document.querySelector('[data-cropsave]');if(b)b.hidden=false;}
  loadUrl(srcUrl).then(im=>{if(state.crop!==C||!box.isConnected)return;C.im=im;if(C.lum==null)C.lum=imgLum(im);if(C.bright==null)C.bright=C.lum<DARK_LUM;bc.checked=!!C.bright;setSrc();layout();}).catch(()=>box.classList.add('bq-err'));
  zs.oninput=()=>{C.z=+zs.value;layout();dirty();};
  bc.onchange=()=>{C.bright=bc.checked;setSrc();dirty();};
  const P=new Map();let pinch=0;
  box.onpointerdown=e=>{try{box.setPointerCapture(e.pointerId);}catch(x){}P.set(e.pointerId,{x:e.clientX,y:e.clientY});if(P.size===2){const [a,b]=[...P.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}};
  box.onpointermove=e=>{if(!P.has(e.pointerId)||!C.im)return;const p=P.get(e.pointerId);const dx=e.clientX-p.x,dy=e.clientY-p.y;P.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(P.size===1){const r=cropRect(C.im.naturalWidth,C.im.naturalHeight,C);const k=box.clientWidth/r.cw;C.cx-=dx/(k*C.im.naturalWidth);C.cy-=dy/(k*C.im.naturalHeight);}
    else if(P.size===2){const [a,b]=[...P.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)C.z=Math.max(1,Math.min(3,C.z*d/pinch));zs.value=C.z;pinch=d;}
    if(dx||dy){layout();dirty();}};
  const up=e=>{P.delete(e.pointerId);pinch=0;};box.onpointerup=up;box.onpointercancel=up;
  box.onwheel=e=>{if(!C.im)return;e.preventDefault();C.z=Math.max(1,Math.min(3,C.z*(e.deltaY<0?1.06:1/1.06)));zs.value=C.z;layout();dirty();};
  box.onkeydown=e=>{const m={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!m||!C.im)return;e.preventDefault();C.cx+=m[0]*0.02;C.cy+=m[1]*0.02;layout();dirty();};
  if(C.im){setSrc();layout();}}
async function cropSave(){const C=state.crop;const it=C&&state.closet.find(x=>x.id===C.id);if(!C||!it||C.busy||!C.im||!assetsNS)return;C.busy=true;renderItem();
  try{const origId=it.orig||it.photo;const {canvas,crop}=cropCanvas(C.im,C,!!C.bright,C.lum);const up=await assetsNS.upload(await toBlobP(canvas,'image/jpeg',0.86),{type:'image/jpeg'});
    const cur=state.closet.find(x=>x.id===it.id)||it;const old=cur.photo;await store.put('closet',{...cur,orig:origId,photo:up.id,bg:'orig',crop,bright:!!C.bright});
    if(old&&old!==origId&&old!==up.id)assetsNS.delete(old).catch(()=>{});C.dirty=false;C.busy=false;toast('Crop saved');}
  catch(e){C.busy=false;toast(e&&e.code==='quota_or_state'?'Photo storage is full.':"Couldn't save the crop. Try again.");}
  if(!$('itemSheet').hidden)renderItem();}

/* ---------- background cleaner (kitchen products only) ---------- */
const BGC={white:'#FFFFFF',black:'#141010',light:'#F4F0EB'};
function hasAlpha(im){const c=drawTo(im,120);const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let t=0,n=0;
  for(let x=0;x<c.width;x++){for(const y of [0,c.height-1]){n++;if(d[(y*c.width+x)*4+3]<200)t++;}}return t>n*0.5;}
function bgClean(im,o){o=o||{};const tol=o.tol||38,max=o.max||900,aspect=o.aspect||0.75,bgCol=o.bg||'#FFFFFF';
  const src=drawTo(im,max);const W=src.width,H=src.height,N=W*H;const sx=src.getContext('2d',{willReadFrequently:true});const img=sx.getImageData(0,0,W,H);const d=img.data;
  const alpha=new Uint8ClampedArray(N);
  if(o.alpha){for(let i=0;i<N;i++)alpha[i]=d[i*4+3];}
  else{
    const samp=[];const st=Math.max(1,Math.floor((W+H)/500));
    for(let i=0;i<W;i+=st){samp.push(i,(H-1)*W+i,W+i,(H-2)*W+i);}for(let j=0;j<H;j+=st){samp.push(j*W,j*W+W-1,j*W+1,j*W+W-2);}
    let cs=[0,0.33,0.66].map(f=>{const p=samp[Math.floor(f*samp.length)];return [d[p*4],d[p*4+1],d[p*4+2],0];});
    for(let it=0;it<10;it++){const acc=cs.map(()=>[0,0,0,0]);for(const p of samp){const r=d[p*4],g=d[p*4+1],b=d[p*4+2];let bi=0,bd=1e12;
        for(let k=0;k<cs.length;k++){const c=cs[k];const dd=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;if(dd<bd){bd=dd;bi=k;}}const a=acc[bi];a[0]+=r;a[1]+=g;a[2]+=b;a[3]++;}
      cs=cs.map((c,k)=>acc[k][3]?[acc[k][0]/acc[k][3],acc[k][1]/acc[k][3],acc[k][2]/acc[k][3],acc[k][3]]:[c[0],c[1],c[2],0]);}
    const C=cs.filter(c=>c[3]>samp.length*0.1);if(!C.length)return null;
    const T=tol*tol*3;
    const cd=p=>{let m=1e12;const r=d[p*4],g=d[p*4+1],b=d[p*4+2];for(const c of C){const dd=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;if(dd<m)m=dd;}return m;};
    const pd=(p,q)=>(d[p*4]-d[q*4])**2+(d[p*4+1]-d[q*4+1])**2+(d[p*4+2]-d[q*4+2])**2;
    const bg=new Uint8Array(N);const Q=new Int32Array(N);let qh=0,qt=0;
    const tryAdd=(p,from)=>{if(bg[p])return;const c=cd(p);if(c<T||(from>=0&&c<T*3.2&&pd(p,from)<T*0.06)){bg[p]=1;Q[qt++]=p;}};
    for(let x=0;x<W;x++){tryAdd(x,-1);tryAdd((H-1)*W+x,-1);}for(let y=0;y<H;y++){tryAdd(y*W,-1);tryAdd(y*W+W-1,-1);}
    while(qh<qt){const p=Q[qh++];const x=p%W;if(x>0)tryAdd(p-1,p);if(x<W-1)tryAdd(p+1,p);if(p>=W)tryAdd(p-W,p);if(p<N-W)tryAdd(p+W,p);}
    /* keep the main pieces of the item, drop specks */
    const lab=new Int32Array(N);const sizes=[0];let L=0;
    for(let s=0;s<N;s++){if(bg[s]||lab[s])continue;L++;let n=0;qh=0;qt=0;Q[qt++]=s;lab[s]=L;
      while(qh<qt){const p=Q[qh++];n++;const x=p%W;const nb=[x>0?p-1:-1,x<W-1?p+1:-1,p>=W?p-W:-1,p<N-W?p+W:-1];for(const q of nb){if(q>=0&&!bg[q]&&!lab[q]){lab[q]=L;Q[qt++]=q;}}}sizes.push(n);}
    const big=Math.max(0,...sizes);if(!big)return null;
    for(let i=0;i<N;i++)alpha[i]=(!bg[i]&&sizes[lab[i]]>=big*0.06)?255:0;
  }
  let fg=0,x0=W,y0=H,x1=-1,y1=-1;for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(alpha[y*W+x]>40){fg++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}}
  if(fg<N*0.03||fg>N*0.97)return null;
  if(!o.alpha){const tmp=new Uint8ClampedArray(N);for(let pass=0;pass<2;pass++){const a=pass?tmp:alpha,b=pass?alpha:tmp;
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){let s=0,c=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H){s+=a[yy*W+xx];c++;}}b[y*W+x]=s/c;}}}
  for(let i=0;i<N;i++)d[i*4+3]=alpha[i];sx.putImageData(img,0,0);
  const bw=x1-x0+1,bh=y1-y0+1;let OH=Math.min(1000,Math.max(bh,bw/aspect)*1.18),OW=OH*aspect;OH=Math.round(OH);OW=Math.round(OW);
  const out=document.createElement('canvas');out.width=OW;out.height=OH;const ox=out.getContext('2d');ox.fillStyle=bgCol;ox.fillRect(0,0,OW,OH);
  const sc=Math.min(OW*0.86/bw,OH*0.86/bh);const dw=bw*sc,dh=bh*sc;
  if(bgCol!==BGC.black){ox.shadowColor='rgba(40,20,15,.16)';ox.shadowBlur=Math.round(OH*0.03);ox.shadowOffsetY=Math.round(OH*0.012);}
  ox.drawImage(src,x0,y0,bw,bh,(OW-dw)/2,(OH-dh)/2,dw,dh);return out;}
const toBlobP=(c,type,q)=>new Promise((r,j)=>c.toBlob(b=>b?r(b):j(new Error('encode')),type,q));
/* used by both closet and products on upload */
async function prepPhoto(im,kind){const al=hasAlpha(im);const bgKey=kind==='closet'?'white':'light';
  const origC=drawTo(im,1100);const orig=await toBlobP(origC,al?'image/png':'image/jpeg',0.85);
  const clean=bgClean(im,{alpha:al,aspect:kind==='closet'?0.75:1,bg:BGC[bgKey]});
  const cleanBlob=clean?await toBlobP(clean,'image/jpeg',0.86):null;
  const forAI=al&&clean?cleanBlob:await toBlobP(origC,'image/jpeg',0.82);
  return {orig,origType:al?'image/png':'image/jpeg',clean,cleanBlob,bg:clean?bgKey:'orig',forAI};}
async function storePhoto(obj,pp){
  if(assetsNS){const u1=await assetsNS.upload(pp.orig,{type:pp.origType});obj.orig=u1.id;
    if(pp.cleanBlob){const u2=await assetsNS.upload(pp.cleanBlob,{type:'image/jpeg'});obj.photo=u2.id;}else obj.photo=u1.id;}
  else{const c=pp.clean||null;obj.thumb=c?drawTo(c,420).toDataURL('image/jpeg',0.75):'';}
  obj.bg=pp.bg;obj.tol=38;}
/* background controls in the item / product sheets */
const bgImgCache={};
function loadUrl(url){return new Promise((res,rej)=>{if(bgImgCache[url])return res(bgImgCache[url]);const im=new Image();im.onload=()=>{bgImgCache[url]=im;res(im);};im.onerror=()=>rej(new Error('load'));im.src=url;});}
function bgCtlHtml(kind,obj){const e=state.bgEdit&&state.bgEdit.id===obj.id?state.bgEdit:null;const cur=e?e.bg:(obj.bg||'orig');const tol=e?e.tol:(obj.tol||38);
  if(!assetsNS||!(obj.orig||obj.photo))return '';
  const opts=kind==='closet'?[['white','White'],['black','Black'],['orig','Original']]:[['light','Light'],['white','White'],['orig','Original']];
  const changed=e&&(e.bg!==(obj.bg||'orig')||(e.bg!=='orig'&&e.tol!==(obj.tol||38)));
  return `<div class="bgctl"><span class="label">Background</span><div class="seg" style="grid-template-columns:repeat(3,minmax(0,1fr))">${opts.map(([v,t])=>`<button data-bgset="${v}" aria-pressed="${cur===v}">${t}</button>`).join('')}</div>
    ${cur!=='orig'?`<div class="slider"><label for="bgTol">Strength</label><input type="range" id="bgTol" min="12" max="90" value="${tol}"></div><p class="hint">${e&&e.fail?'<b>Couldn\'t separate the item here.</b> Try another strength, or retake the photo on a plain surface.':'Raise it if bits of background stay. Lower it if parts of the item disappear.'}</p>`:''}
    ${changed?`<button class="primary" data-bgapply ${e.busy?'disabled':''}>${e.busy?'Saving…':'Save background'}</button>`:''}</div>`;}
let bgTimer=null;
async function bgPreview(kind){const e=state.bgEdit;if(!e)return;const obj=(kind==='closet'?state.closet:state.products).find(x=>x.id===e.id);if(!obj)return;
  const imgEl=document.querySelector(kind==='closet'?'#itemBody .itimg img':'#productBody .itimg img');
  if(e.bg==='orig'){e.fail=false;if(imgEl)imgEl.src='/_blob/'+(obj.orig||obj.photo);return;}
  try{const im=await loadUrl('/_blob/'+(obj.orig||obj.photo));const c=bgClean(im,{tol:e.tol,bg:BGC[e.bg],aspect:kind==='closet'?0.75:1,max:520,alpha:hasAlpha(im)});
    e.fail=!c;if(c&&imgEl)imgEl.src=c.toDataURL('image/jpeg',0.8);}catch(err){e.fail=true;}
  const h=document.querySelector(kind==='closet'?'#itemBody .bgctl .hint':'#productBody .bgctl .hint');if(h)h.innerHTML=e.fail?'<b>Couldn\'t separate the item here.</b> Try another strength, or retake the photo on a plain surface.':'Raise it if bits of background stay. Lower it if parts of the item disappear.';}
function wireBg(kind){const s=$('bgTol');if(s)s.oninput=()=>{state.bgEdit.tol=+s.value;clearTimeout(bgTimer);bgTimer=setTimeout(()=>{bgPreview(kind);const host=document.querySelector(kind==='closet'?'#itemBody .bgctl':'#productBody .bgctl');
  const obj=(kind==='closet'?state.closet:state.products).find(x=>x.id===state.bgEdit.id);if(host&&obj&&!host.querySelector('[data-bgapply]')){host.insertAdjacentHTML('beforeend','<button class="primary" data-bgapply>Save background</button>');}},180);};}
async function bgApply(kind){const e=state.bgEdit;if(!e||e.busy)return;const coll=kind==='closet'?'closet':'products';const obj=state[coll].find(x=>x.id===e.id);if(!obj)return;
  e.busy=true;kind==='closet'?renderItem():renderProduct();
  try{const origId=obj.orig||obj.photo;let photo=origId;
    if(e.bg!=='orig'){const im=await loadUrl('/_blob/'+origId);const c=bgClean(im,{tol:e.tol,bg:BGC[e.bg],aspect:kind==='closet'?0.75:1,alpha:hasAlpha(im)});
      if(!c){e.busy=false;e.fail=true;toast("Couldn't separate the item. Try another strength.");kind==='closet'?renderItem():renderProduct();return;}
      const up=await assetsNS.upload(await toBlobP(c,'image/jpeg',0.86),{type:'image/jpeg'});photo=up.id;}
    const oldPhoto=obj.photo;await store.put(coll,{...obj,orig:origId,photo,bg:e.bg,tol:e.tol});
    if(oldPhoto&&oldPhoto!==origId&&oldPhoto!==photo)assetsNS.delete(oldPhoto).catch(()=>{});
    state.bgEdit=null;toast('Background saved');}
  catch(err){e.busy=false;toast(err&&err.code==='quota_or_state'?'Photo storage is full.':"Couldn't save the background. Try again.");}
  kind==='closet'?renderItem():renderProduct();}

/* ---------- bills ---------- */
function billsList(S){if(Array.isArray(S.bills))return S.bills;return CATS.filter(c=>c.fixed&&S.budgets[c.id]).map(c=>({id:c.id,name:c.name,amount:+S.budgets[c.id],cat:c.id,day:null}));}
const billNIS=b=>b.cur==='USD'?(+b.amount||0)*rate():(+b.amount||0);
const billMoney=b=>b.cur==='USD'?`$${(+b.amount||0).toLocaleString('en-US')} · ${fmt(billNIS(b))}`:fmt(b.amount);
function billState(b,mk){const pi=periodInfo(mk);const ents=state.entries.filter(e=>inP(e.date,pi)&&(e.billId===b.id||(!e.billId&&b.id===b.cat&&e.cat===b.cat)));
  const paid=ents.reduce((a,e)=>a+(+e.amount||0),0);const mi=monthInfo(mk);let st='upcoming',due=null,left=null;
  if(b.day){const dd=Math.min(+b.day,mi.dim);due=`${mk}-${pad(dd)}`;left=diffD(todayStr,due);}
  if(paid>=billNIS(b)-0.5&&billNIS(b)>0)st='paid';else if(mi.isPast)st='missed';else if(due&&left<0)st='overdue';else if(due&&left<=5)st='soon';else if(!b.day)st='noday';
  return {paid,st,due,left};}
function billAlerts(){const S=state.settings;return billsList(S).map(b=>({b,s:billState(b,curMonth)})).filter(x=>x.s.st==='overdue'||x.s.st==='soon');}
function renderBills(C){const {S,mi}=C;const bills=billsList(S);
  const al=mi.isCur?billAlerts():[];
  const pal=mi.isCur?peopleAlerts():[];
  $('billAlert').hidden=!al.length&&!pal.length;
  $('billAlert').innerHTML=pal.map(({p,o,n})=>{const gf=o.kind==='bday'?giftFund(p):null;return `<div class="alertrow soon"><span class="aic">🎂</span><span class="atx"><b>${esc(p.name)}</b>'s ${esc(o.label.toLowerCase())} is ${n===0?'today':n===1?'tomorrow':'in '+n+' days'}<small class="num">${gf?`Gift fund ${fmt(gf.saved)} of ${fmt(gf.budget)}`:shortD(o.date)}</small></span><button class="btn2" data-person="${esc(p.id)}" data-gotopeople>Open</button></div>`;}).join('')+al.map(({b,s})=>`<div class="alertrow ${s.st}"><span class="aic">${s.st==='overdue'?'!':'⏰'}</span><span class="atx"><b>${esc(b.name)}</b> ${s.st==='overdue'?`was due ${-s.left===1?'yesterday':(-s.left)+' days ago'}`:s.left===0?'is due today':`is due in ${s.left} day${s.left>1?'s':''}`}<small class="num">${s.paid>0?fmt(Math.max(0,billNIS(b)-s.paid))+' left':billMoney(b)}</small></span><button class="pay" data-billpay="${esc(b.id)}">Mark paid</button></div>`).join('');
  $('billsCard').hidden=false;
  $('billsCard').innerHTML=`<div class="cardhead"><h2>Monthly bills</h2><button class="link" data-editbills>Edit</button></div>
   ${bills.length?`<div class="bills">${bills.map(b=>{const s=billState(b,billMonth(state.month));const c=CAT[b.cat]||CAT.other;
     const right=s.st==='paid'?`<span class="paid num">${TICK}Paid</span>`:s.st==='missed'?`<span class="pill bad">Not logged</span>`:`<button class="pay" data-billpay="${esc(b.id)}">Mark paid</button>`;
     const sub=s.st==='paid'?fmt(s.paid):s.st==='overdue'?`<span class="late">Overdue · was due ${shortD(s.due)}</span>`:s.st==='soon'?`<span class="soon">${s.left===0?'Due today':'Due in '+s.left+' day'+(s.left>1?'s':'')}</span>`:b.day?`Due ${shortD(s.due)}`:'<span class="soon">Set a due day</span>';
     return `<div class="bill st-${s.st}"><span class="swatch" style="background:${catCol(b.cat)}"></span><div class="nm"><b>${esc(b.name)} · <span class="num">${billMoney(b)}</span></b><small class="num">${s.paid>0&&s.st!=='paid'?`${fmt(s.paid)} paid · `:''}${sub}</small></div>${right}</div>`;}).join('')}</div>`
     :`<p class="hint">Add rent, your parents' money, internet or anything that repeats every month.</p>`}`;}
function openBills(){state.bedit=JSON.parse(JSON.stringify(billsList(state.settings)));if(!state.bedit.length)state.bedit.push({id:'b'+newId(),name:'',amount:'',cat:'rent',day:''});renderBillEdit();openSheet('billsSheet');}
function renderBillEdit(){const cats=CATS.filter(c=>!c.saving);
  $('billsBody').innerHTML=`<p class="hint">The app warns you 5 days before each due day, and when a bill is late.</p>
    ${state.bedit.map((b,i)=>`<div class="billrow"><input data-bi="${i}" data-bf="name" maxlength="30" value="${esc(b.name)}" placeholder="Name, e.g. Rent" aria-label="Bill name">
      <button data-brm="${i}" aria-label="Remove bill">×</button>
      <div class="curinput"><input data-bi="${i}" data-bf="amount" inputmode="decimal" value="${esc(b.amount)}" placeholder="Amount" aria-label="Amount">${curSeg('bill'+i,b.cur)}</div>
      <input data-bi="${i}" data-bf="day" inputmode="numeric" value="${esc(b.day||'')}" placeholder="Due day (1–31)" aria-label="Due day of month">
      <select data-bi="${i}" data-bf="cat" aria-label="Category">${cats.map(c=>`<option value="${c.id}" ${b.cat===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>`).join('')}
    <button class="btn2" data-badd>+ Add bill</button><button class="primary" data-bsave>Save bills</button>`;}

/* ---------- sleep ---------- */
const toMin=t=>{if(!t)return null;const [h,m]=String(t).split(':').map(Number);return isFinite(h)?h*60+(m||0):null;};
function sleepMin(ds){const d=dayDoc(ds);const b=toMin(d.bed),w=toMin(d.wake);if(b==null||w==null)return null;let x=w-b;if(x<=0)x+=1440;return x>60&&x<16*60?x:null;}
const hm=m=>`${Math.floor(m/60)}h ${pad(Math.round(m%60))}m`;
const MOON='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor"/></svg>';
const SUN='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function renderSleep(){const ds=state.hday,dd=dayDoc(ds),S=state.settings;const m=sleepMin(ds);const goal=+S.sleepGoal||0;
  const nights=[...Array(7)].map((_,i)=>addD(ds,i-6));const vals=nights.map(sleepMin);const got=vals.filter(v=>v!=null);const avg=got.length?got.reduce((a,b)=>a+b,0)/got.length:null;
  const ref=goal?goal*60:7*60;const verdict=m==null?'How did you sleep?':m>=ref?'Well rested':m>=ref-60?'A bit short':'Short night';
  /* timeline 20:00 → 12:00 */
  const b=toMin(dd.bed),w=toMin(dd.wake);const pos=x=>{let v=x-20*60;if(v<0)v+=1440;return Math.max(0,Math.min(100,v/(16*60)*100));};
  const seg=b!=null&&w!=null?`<span class="tlseg" style="left:${pos(b)}%;width:${Math.max(2,pos(w)-pos(b))}%"></span>`:'';
  const max=Math.max(10*60,...got,ref);
  $('hSleep').innerHTML=`<div class="stars" aria-hidden="true"></div><div class="slcat">${catSVG('sleepy',{pose:'curl'})}</div>
    <span class="label">${ds===todayStr?'Last night':'Night before '+shortD(ds)}</span>
    <div class="sltop"><div class="sldur num">${m?`${Math.floor(m/60)}<small>h</small> ${pad(Math.round(m%60))}<small>m</small>`:'—'}</div><span class="slverd ${m==null?'':m>=ref?'ok':m>=ref-60?'mid':'low'}">${verdict}</span></div>
    <div class="tl"><div class="tltrack">${seg}</div><div class="tllab"><span>8 pm</span><span>midnight</span><span>4 am</span><span>8 am</span><span>noon</span></div></div>
    <div class="sltimes"><label class="slt"><span class="sic moon">${MOON}</span><span><small>Bedtime</small><input type="time" id="slBed" value="${esc(dd.bed||'')}" aria-label="Bedtime"></span></label>
      <label class="slt"><span class="sic sun">${SUN}</span><span><small>Woke up</small><input type="time" id="slWake" value="${esc(dd.wake||'')}" aria-label="Wake-up time"></span></label></div>
    <div class="slweek">${nights.map((n,i)=>`<div class="slb2"><span class="bar ${vals[i]&&vals[i]>=ref?'ok':''}" style="height:${vals[i]?Math.max(10,vals[i]/max*100):4}%">${vals[i]?`<i>${Math.round(vals[i]/6)/10}</i>`:''}</span><small class="${n===ds?'cur':''}">${DOW[parseD(n).getDay()].slice(0,1)}</small></div>`).join('')}
      <span class="goalline" style="bottom:calc(18px + ${(ref/max)*100}% * (100% - 18px) / 100%)"></span></div>
    <div class="slfoot num"><span>${avg?`7-night average <b>${hm(avg)}</b>`:'Log a few nights to see your average'}</span>${goal?`<span>Goal ${goal}h</span>`:'<button class="link light" data-open-settings>Set a goal</button>'}</div>`;
  $('slBed').onchange=()=>patchDay(ds,{bed:$('slBed').value});$('slWake').onchange=()=>patchDay(ds,{wake:$('slWake').value});}

/* ---------- wishlist ---------- */
const WAIT=7;
function wishAge(w){return diffD(w.added,todayStr);}
function similarOwned(w){const own=state.closet.filter(c=>c.type&&c.type===w.type&&(c.plan||'keep')==='keep');const col=String(w.color||'').toLowerCase().split(/\s+/)[0];
  return own.sort((a,b)=>(col&&String(b.color||'').toLowerCase().includes(col)?1:0)-(col&&String(a.color||'').toLowerCase().includes(col)?1:0));}
const WCATS=[['clothes','Clothes','clothes'],['shoes','Shoes & bags','clothes'],['beauty','Beauty & care','personal'],['kitchen','Kitchen','kitchen'],['home','Home','household'],['tech','Tech','personal'],['gifts','Gifts','gifts'],['other','Other','other']];
const WCAT=Object.fromEntries(WCATS.map(([id,n,m])=>[id,{id,name:n,money:m}]));
const wcatOf=w=>w.cat||(w.type?'clothes':'other');
const wishNIS=w=>w.cur==='USD'?(+w.price||0)*rate():(+w.price||0);
const wishMoney=w=>w.price?money(+w.price,w.cur==='USD'?'USD':'NIS'):'';
function renderWishlist(){const all=[...state.wishes].sort((a,b)=>(a.added<b.added?-1:1));const f=state.wf||'all';const ws=all.filter(w=>f==='all'||wcatOf(w)===f);
  const waiting=ws.filter(w=>w.status==='waiting');const skipped=all.filter(w=>w.status==='skipped');const bought=all.filter(w=>w.status==='bought');
  const saved=skipped.reduce((a,w)=>a+wishNIS(w),0);const present=[...new Set(all.map(wcatOf))];
  $('wSummary').innerHTML=`<div class="clhead"><div><span class="label">Saved by waiting</span><div class="dtotal num">${fmt(saved)}</div><div class="wsub num">${skipped.length} let go · ${bought.length} bought · ${all.filter(w=>w.status==='waiting').length} waiting</div></div><div class="clcat">${catSVG(saved>0?'excited':'open',{pose:'gift'})}</div></div>
    <p class="hint">Add anything you want, from a shirt to a pan. Wait ${WAIT} days. If you still want it, buy it guilt-free.</p>`;
  const chip=(k,t)=>`<button class="fchip ${f===k?'sel':''}" data-wf="${k}" aria-pressed="${f===k}">${t}</button>`;
  const card=w=>{const age=wishAge(w),ready=age>=WAIT,leftD=Math.max(0,WAIT-age);const c=wcatOf(w);const sim=(c==='clothes'||c==='shoes')&&w.type?similarOwned(w):[];const R=20,C2=2*Math.PI*R;
    return `<div class="wish ${ready?'ready':''}"><div class="wtop2"><span class="wimg">${imgSrc(w)?`<img src="${esc(imgSrc(w))}" alt="">`:catSVG('neutral',{pose:'peek'})}</span>
      <div class="wnm"><b>${esc(w.name)}</b><small class="num">${[WCAT[c].name,wishMoney(w),w.where||''].filter(Boolean).map(esc).join(' · ')}</small></div>
      ${ready?'<span class="pill good">Ready to decide</span>':`<svg class="wring" viewBox="0 0 48 48" aria-label="${leftD} days left"><circle cx="24" cy="24" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="5"/><circle cx="24" cy="24" r="${R}" fill="none" stroke="var(--sun)" stroke-width="5" stroke-linecap="round" stroke-opacity="${age>0?1:0}" stroke-dasharray="${C2*age/WAIT} ${C2}" transform="rotate(-90 24 24)"/><text x="24" y="28" text-anchor="middle" font-size="13" font-weight="800" fill="var(--ink)" font-family="Bricolage Grotesque,system-ui">${leftD}d</text></svg>`}</div>
      ${sim.length?`<div class="wsim"><small>You already own ${sim.length} similar</small><div class="wsimimg">${sim.slice(0,5).map(x=>`<button class="outit" data-cl="${esc(x.id)}">${clSrc(x)?`<img src="${esc(clSrc(x))}" alt="${esc(x.name)}">`:''}</button>`).join('')}</div></div>`:''}
      ${ready?`<div class="two"><button class="btn2" data-wskip="${esc(w.id)}">Let it go</button><button class="pay" data-wbuy="${esc(w.id)}">I still want it</button></div>`:`<div class="wact"><span class="hint">Decide on ${shortD(addD(w.added,WAIT))}</span><button class="link" data-wskip="${esc(w.id)}">Let it go now</button></div>`}<button class="xbtn wx" data-wdel="${esc(w.id)}" aria-label="Delete ${esc(w.name)}">${XSVG}</button></div>`;};
  $('wList').innerHTML=`${present.length>1?`<div class="chips scrollx" style="margin-bottom:12px">${chip('all','All')}${WCATS.filter(([id])=>present.includes(id)).map(([id,n])=>chip(id,n)).join('')}</div>`:''}
    <div class="cardhead"><h2>Waiting</h2><span class="label num">${waiting.length}</span></div>
    ${waiting.length?`<div class="wishes">${waiting.map(card).join('')}</div>`:`<p class="empty">Nothing waiting${f!=='all'?' here':''}. Tap <b>Add wish</b> next time something catches your eye.</p>`}
    ${(skipped.length||bought.length)?`<span class="label" style="display:block;margin-top:16px">Decided</span><div class="cyhists">${[...skipped,...bought].filter(w=>f==='all'||wcatOf(w)===f).sort((a,b)=>(b.decided||'')<(a.decided||'')?-1:1).slice(0,12).map(w=>`<div class="cyhist"><span><b>${esc(w.name)}</b></span><span class="num">${wishMoney(w)}</span><span>${w.status==='skipped'?'Let go':'Bought'}</span><button class="xbtn" data-wdel="${esc(w.id)}" aria-label="Delete ${esc(w.name)}">${XSVG}</button></div>`).join('')}</div>`:''}`;}
function openWish(){state.wnew={cat:state.wf&&state.wf!=='all'?state.wf:'',name:'',type:'',color:'',price:'',cur:'NIS',where:'',photo:null,thumb:null};renderWishForm();openSheet('wishSheet');}
function renderWishForm(){const w=state.wnew;const fash=w.cat==='clothes'||w.cat==='shoes';
  $('wishBody').innerHTML=`<span class="label">Category</span><div class="chips">${WCATS.map(([id,n])=>`<button class="fchip ${w.cat===id?'sel':''}" data-wcat="${id}" aria-pressed="${w.cat===id}">${n}</button>`).join('')}</div>
    <div class="photorow">${imgSrc(w)?`<img src="${esc(imgSrc(w))}" alt="">`:''}<label class="btn2" for="wsPhoto">${imgSrc(w)?'Change photo':'Add a photo (optional)'}</label><input type="file" id="wsPhoto" accept="image/*" hidden></div>
    <div class="field"><label for="wsName">What do you want?</label><input id="wsName" maxlength="40" value="${esc(w.name)}" placeholder="${w.cat==='kitchen'?'e.g. Non-stick pan':'e.g. Beige linen shirt'}"></div>
    ${fash?`<div class="two"><div class="field"><label for="wsType">Type</label><select id="wsType"><option value="">Choose</option>${TYPES.map(t=>`<option ${w.type===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div>
    <div class="field"><label for="wsColor">Color</label><input id="wsColor" maxlength="20" value="${esc(w.color)}"></div></div>`:''}
    <div class="field"><label for="wsPrice">Price</label><div class="curinput"><input id="wsPrice" inputmode="decimal" value="${esc(w.price)}" placeholder="0">${curSeg('wish',w.cur)}</div></div>
    <div class="field"><label for="wsWhere">Shop or page</label><input id="wsWhere" maxlength="40" value="${esc(w.where)}"></div>
    <button class="primary" id="wsSave">Start the ${WAIT}-day wait</button>`;
  const bind=(id,k)=>{const el=$(id);if(el)el.oninput=()=>{w[k]=el.value;};};bind('wsName','name');bind('wsColor','color');bind('wsPrice','price');bind('wsWhere','where');
  if($('wsType'))$('wsType').onchange=()=>{w.type=$('wsType').value;};
  $('wsPhoto').onchange=async()=>{const f=$('wsPhoto').files&&$('wsPhoto').files[0];$('wsPhoto').value='';if(!f)return;
    try{const {im,u}=await loadImg(f);const c=drawTo(im,900);if(assetsNS){const up=await assetsNS.upload(await toBlobP(c,'image/jpeg',0.84),{type:'image/jpeg'});w.photo=up.id;}else w.thumb=drawTo(im,360).toDataURL('image/jpeg',0.72);URL.revokeObjectURL(u);renderWishForm();}catch(e){toast("Couldn't add that photo.");}};
  $('wsSave').onclick=async()=>{if(!w.cat){toast('Pick a category first.');return;}if(!w.name.trim()){toast('Name the thing you want first.');return;}
    const doc={id:'w'+newId(),cat:w.cat,name:w.name.trim().slice(0,40),type:fash?w.type:'',color:fash?String(w.color||'').trim():'',price:parseNum(w.price)||0,cur:w.cur,where:String(w.where||'').trim(),added:todayStr,status:'waiting',createdAt:Date.now()};if(w.photo)doc.photo=w.photo;if(w.thumb)doc.thumb=w.thumb;
    try{await store.put('wishes',doc);closeSheets();toast(`Added. Check back on ${shortD(addD(todayStr,WAIT))}.`);}catch(e){toast("Couldn't save. Try again.");}};}
const curSeg=(g,cur)=>`<div class="curseg" role="group" aria-label="Currency"><button type="button" data-curg="${g}" data-cur="NIS" aria-pressed="${cur!=='USD'}">₪</button><button type="button" data-curg="${g}" data-cur="USD" aria-pressed="${cur==='USD'}">$</button></div>`;

/* ---------- monthly recap ---------- */
function recapData(mk){const mi=monthInfo(mk);const S=state.settings;const ents=state.entries.filter(e=>(e.date||'').slice(0,7)===mk);
  const counted=S.incomes.filter(i=>i.count);const income=counted.reduce((a,i)=>a+netUSD(i)*S.rate,0);
  const spent=ents.filter(e=>e.cat!=='savings').reduce((a,e)=>a+(+e.amount||0),0);const saved=ents.filter(e=>e.cat==='savings').reduce((a,e)=>a+(+e.amount||0),0);
  const byCat={};ents.filter(e=>e.cat!=='savings').forEach(e=>{byCat[e.cat]=(byCat[e.cat]||0)+(+e.amount||0);});const top=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const pd=new Date(mi.y,mi.m-2,1);const pk=pd.getFullYear()+'-'+pad(pd.getMonth()+1);const prevSpent=state.entries.filter(e=>(e.date||'').slice(0,7)===pk&&e.cat!=='savings').reduce((a,e)=>a+(+e.amount||0),0);
  const debtPaid=ents.filter(e=>e.cat==='debt').reduce((a,e)=>a+(+e.amount||0),0);
  const days=[...Array(mi.isCur?mi.day:mi.dim)].map((_,i)=>`${mk}-${pad(i+1)}`);
  const logged=days.filter(d=>state.entries.some(e=>e.date===d)||(S.noSpend||[]).includes(d)).length;
  const ws=sortedW().filter(w=>w.date.slice(0,7)===mk);const wStart=ws.length?+ws[0].kg:null,wEnd=ws.length?+ws[ws.length-1].kg:null;
  const scores=days.map(d=>dayScore(d));const strong=scores.filter(s=>s.pct>=0.75).length;let best=0,run=0;scores.forEach(s=>{if(s.pct>=0.75){run++;best=Math.max(best,run);}else run=0;});
  const clean=days.filter(d=>{const f=dayFood(d);return f.length&&!f.some(x=>!x.plan);}).length;const foodDays=days.filter(d=>dayFood(d).length).length;
  const off=state.food.filter(f=>f.date.slice(0,7)===mk&&!f.plan).length;
  const rope=days.filter(d=>(+dayDoc(d).rope||0)>=(+S.ropeTarget||3)).length;const folic=days.filter(d=>dayDoc(d).folic).length;const vitd=days.filter(d=>dayDoc(d).vitD).length;
  const sl=days.map(sleepMin).filter(x=>x!=null);const sleepAvg=sl.length?sl.reduce((a,b)=>a+b,0)/sl.length:null;
  const per=periods().filter(p=>p.start.slice(0,7)===mk);
  const added=state.closet.filter(c=>c.createdAt&&ymd(new Date(c.createdAt)).slice(0,7)===mk).length;
  const wSk=state.wishes.filter(w=>w.status==='skipped'&&(w.decided||'').slice(0,7)===mk);const wBo=state.wishes.filter(w=>w.status==='bought'&&(w.decided||'').slice(0,7)===mk);
  const cooked=state.recipes.filter(r=>(r.lastMade||'').slice(0,7)===mk).length;
  const wins=[],next=[];
  const enough=logged>=days.length*0.5;
  if(enough&&income&&spent<income)wins.push(`You spent less than you earned and kept ${fmt(income-spent)}.`);else if(enough&&income&&spent>=income)next.push('Spending went over income. Pick one category to cut next month.');
  if(enough&&prevSpent&&spent<prevSpent)wins.push(`${fmt(prevSpent-spent)} less than ${MONTHS[pd.getMonth()]}.`);
  if(debtPaid)wins.push(`${fmt(debtPaid)} paid toward debts.`);
  if(wStart!=null&&wEnd!=null&&wEnd<wStart)wins.push(`${(wStart-wEnd).toFixed(1)} kg down this month.`);else if(wStart!=null&&wEnd!=null&&wEnd>wStart)next.push('Weight went up a little. The Patterns card shows which weeks.');
  if(best>=3)wins.push(`Best streak: ${best} strong days in a row.`);
  if(clean)wins.push(`${clean} day${clean>1?'s':''} fully on plan.`);
  if(wSk.length)wins.push(`Let go of ${wSk.length} want${wSk.length>1?'s':''} and saved ${fmt(wSk.reduce((a,w)=>a+wishNIS(w),0))}.`);
  if(logged<days.length*0.7)next.push(`Log spending more days. You logged ${logged} of ${days.length}.`);
  if(rope<days.length*0.5)next.push('Jump rope more often. Even 3 rounds counts.');
  if(sleepAvg&&sleepAvg<7*60)next.push('Sleep was under 7 hours on average.');
  const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);const perDays=new Set();per.concat(periods().filter(p=>p.start.slice(0,7)<mk&&(p.end||p.start).slice(0,7)>=mk)).forEach(p=>{const cs=cycleStats();let d=p.start;const e=cs.endOf(p);while(d<=e){if(d.slice(0,7)===mk)perDays.add(d);d=addD(d,1);}});
  const wSaved=wSk.reduce((a,w)=>a+wishNIS(w),0);
  return {cats,perDays,wSaved,dayList:days,scores,wlist:ws,mi,income,spent,saved,left:income-spent-saved,top,prevSpent,debtPaid,days:days.length,logged,wStart,wEnd,strong,best,clean,foodDays,off,rope,folic,vitd,sleepAvg,per,added,wSk,wBo,cooked,wins,next,pk};}
function openRecap(mk){state.rmonth=mk||(today.getDate()<=7?(()=>{const d=new Date(today.getFullYear(),today.getMonth()-1,1);return d.getFullYear()+'-'+pad(d.getMonth()+1);})():curMonth);renderRecap();openSheet('recapSheet');}
const HANGER='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M12 6.5a2 2 0 1 1 2-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 6.5v1.2L3.5 14a1.6 1.6 0 0 0 1 2.9h15a1.6 1.6 0 0 0 1-2.9L12 7.7" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const POT='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-5Z" stroke="currentColor" stroke-width="1.8"/><path d="M2 10h20M9 6c0-1 1-1 1-2M14 6c0-1 1-1 1-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const GIFT='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><rect x="4" y="9" width="16" height="11" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1.5S12 9 12 9Zm0 0c2-4 6-4 6-1.5S12 9 12 9Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
function ringSVG(pct,col,label,val){const R=30,C=2*Math.PI*R;return `<div class="rring"><svg viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="9"/><circle cx="38" cy="38" r="${R}" fill="none" style="stroke:${col}" stroke-width="9" stroke-linecap="round" stroke-opacity="${pct>0?1:0}" stroke-dasharray="${C*Math.min(1,pct)} ${C}" transform="rotate(-90 38 38)"/><text x="38" y="43" text-anchor="middle" font-size="15" font-weight="800" fill="var(--ink)" font-family="Bricolage Grotesque,system-ui">${Math.round(pct*100)}%</text></svg><b>${label}</b><small>${val}</small></div>`;}
function renderRecap(){const r=recapData(state.rmonth);const good=r.wins.length>=r.next.length;const head=r.mi.isCur?`${r.mi.label} so far`:`${r.mi.label} ${r.mi.y}`;
  const tile=(ic,v,k)=>`<div class="rtile"><span class="ric">${ic}</span><b class="num">${v}</b><small>${k}</small></div>`;
  /* donut */
  const groups=r.cats;const tot=groups.reduce((a,g)=>a+g[1],0);let donut='';const rmap=colorMap(groups.map(([c,v])=>({key:c,amount:v})));const rcol=c=>c==='savings'?CAT.savings.color:(rmap[c]||'var(--c0)');
  if(tot>0){const R=52,SW=20,C=2*Math.PI*R;let off=0;donut=`<svg class="rdonut" viewBox="0 0 140 140" aria-label="Spending by category"><circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="${SW}"/>${[...groups].sort((a,b)=>(rmap[a[0]]?SLOTS.indexOf(rmap[a[0]]):99)-(rmap[b[0]]?SLOTS.indexOf(rmap[b[0]]):99)).map(([c,v])=>{const len=v/tot*C;const s=`<circle cx="70" cy="70" r="${R}" fill="none" style="stroke:${rcol(c)}" stroke-width="${SW}" stroke-dasharray="${Math.max(0,len-1.2)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"/>`;off+=len;return s;}).join('')}<text x="70" y="68" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="Figtree,system-ui">spent</text><text x="70" y="86" text-anchor="middle" font-size="17" font-weight="800" fill="var(--ink)" font-family="Bricolage Grotesque,system-ui">${fmt(tot)}</text></svg>`;}
  const leg=groups.slice(0,5).map(([c,v])=>`<div class="rleg"><i style="background:${rcol(c)}"></i><span>${esc((CAT[c]||CAT.other).name)}</span><b class="num">${Math.round(v/tot*100)}%</b></div>`).join('');
  /* income vs spent */
  const inc=r.income,sp=r.spent,maxI=Math.max(inc,sp,1);
  const flow=inc?`<div class="rflow"><div class="rfl"><span>Income</span><div class="rfbar"><span style="width:${inc/maxI*100}%;background:var(--sun)"></span></div><b class="num">${fmt(inc)}</b></div>
      <div class="rfl"><span>Spent</span><div class="rfbar"><span style="width:${sp/maxI*100}%;background:var(--olive)"></span></div><b class="num">${fmt(sp)}</b></div>
      ${r.prevSpent?`<div class="rfl"><span>Last month</span><div class="rfbar"><span style="width:${r.prevSpent/maxI*100}%;background:var(--muted);opacity:.5"></span></div><b class="num">${fmt(r.prevSpent)}</b></div>`:''}</div>`:'';
  /* heatmap */
  const [Y,M]=state.rmonth.split('-').map(Number);const lead=(new Date(Y,M-1,1).getDay()+1)%7;const cls=s=>!s||s.total===0||s.done===0?'h0':s.pct>=1?'h4':s.pct>=0.75?'h3':s.pct>=0.4?'h2':'h1';
  let heat=WEEK.map(w=>`<span class="hw">${w.slice(0,1)}</span>`).join('')+'<span></span>'.repeat(lead);
  r.dayList.forEach((d,i)=>{heat+=`<span class="hd ${cls(r.scores[i])}" title="${d}">${r.perDays.has(d)?'<i></i>':''}</span>`;});
  /* weight sparkline */
  let spark='';if(r.wlist.length>1){const vs=r.wlist.map(w=>+w.kg);const mn=Math.min(...vs),mx=Math.max(...vs);const W=280,H=70;
    const pts=r.wlist.map((w,i)=>[10+i/(r.wlist.length-1)*(W-20),10+(mx===mn?0.5:(mx-w.kg)/(mx-mn))*(H-20)]);
    spark=`<svg class="rspark" viewBox="0 0 ${W} ${H}" aria-label="Weight this month"><path d="${pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ')}" fill="none" stroke="var(--olive)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="4" fill="var(--muted)"/><circle cx="${pts[pts.length-1][0]}" cy="${pts[pts.length-1][1]}" r="5" fill="var(--sun)" stroke="var(--surface)" stroke-width="2"/></svg>
      <div class="pmeta num"><span>${(+r.wlist[0].kg).toFixed(1)} kg</span><span><b>${(r.wEnd-r.wStart)>0?'+':''}${(r.wEnd-r.wStart).toFixed(1)} kg</b></span><span>${(+r.wlist[r.wlist.length-1].kg).toFixed(1)} kg</span></div>`;}
  const n=r.days||1;
  $('recapBody').innerHTML=`<div class="rhero"><div class="rnav"><button data-rmon="-1" aria-label="Previous month">‹</button><span>${esc(head)}</span><button data-rmon="1" aria-label="Next month" ${state.rmonth>=curMonth?'disabled':''}>›</button></div>
      <div class="rcat">${catSVG(good?'excited':'sleepy',{pose:good?'star':'curl'})}</div><h2>${good?'A month to be proud of':'A tough month, and that’s okay'}</h2></div>
    <div class="rcard"><span class="label">Your month in rings</span><div class="rrings">${ringSVG(r.logged/n,'var(--sun)','Logging',`${r.logged}/${r.days} days`)}${ringSVG(r.strong/n,'var(--olive)','Strong days',`${r.strong}/${r.days}`)}${ringSVG(r.folic/n,'#9D4EDD','Folic acid',`${r.folic}/${r.days}`)}</div></div>
    ${r.wins.length?`<div class="rchips">${r.wins.map(w=>`<span class="rchip win">${TICK}${esc(w)}</span>`).join('')}</div>`:''}
    <div class="rcard"><span class="label">Money</span>${flow}${donut?`<div class="rdwrap">${donut}<div class="rlegs">${leg}</div></div>`:'<p class="hint">No spending logged this month.</p>'}
      <div class="rtiles">${tile(IC.flame,fmt(Math.max(0,r.saved)),'set aside')}${tile(GIFT,fmt(r.wSaved),'saved by waiting')}${tile(IC.cap,fmt(r.debtPaid),'to debts')}</div></div>
    <div class="rcard"><span class="label">Healthy days</span><div class="heat">${heat}</div>
      <div class="legendline" style="margin-top:8px"><span><i class="hd h1"></i>Some</span><span><i class="hd h2"></i>Half</span><span><i class="hd h3"></i>Strong</span><span><i class="hd h4"></i>Perfect</span>${r.perDays.size?'<span><i style="background:var(--period);border-radius:50%"></i>Period</span>':''}</div>
      ${spark?`<span class="label" style="margin-top:6px">Weight</span>${spark}`:''}
      <div class="rtiles">${tile(IC.rope,r.rope,'jump-rope days')}${tile(IC.plate,r.clean,'clean days')}${tile(MOON,r.sleepAvg?hm(r.sleepAvg):'—','avg sleep')}</div></div>
    <div class="rcard"><span class="label">Closet & kitchen</span><div class="rtiles">${tile(HANGER,r.added,'pieces added')}${tile(GIFT,r.wSk.length,'wants let go')}${tile(POT,r.cooked,'recipes cooked')}</div></div>
    ${r.next.length?`<div class="rcard nextm"><b>Try next month</b><div class="rchips">${r.next.map(w=>`<span class="rchip">${esc(w)}</span>`).join('')}</div></div>`:''}`;}


/* ---------- income received ---------- */
function openIncome(opts){const S=state.settings;const o=opts||{};let d;
  if(o.id){const x=incLog().find(y=>y.id===o.id);if(!x)return;d={...x,amt:String(x.amt),rate:String(x.rate||S.rate),kind:x.cycle?'sal:'+x.forM:'extra',confirm:false};}
  else{const forM=o.salfor&&o.salfor!=='extra'?o.salfor:(+todayStr.slice(8)>=15?nextMK(curMonth):curMonth);const taken=!!salFor(forM);const kind=o.salfor==='extra'||taken?'extra':'sal:'+forM;
    const src=kind==='extra'?(S.incomes.find(i=>i.id!=='kydzzo')||S.incomes[0]||{}).id||'other':'kydzzo';const inc=S.incomes.find(i=>i.id===src);
    d={id:null,src:inc?inc.id:'other',name:inc?inc.name:'',cur:'USD',amt:inc?String(Math.round(netUSD(inc))):'',rate:String(S.rate),date:todayStr,kind,confirm:false};}
  state.inc=d;renderIncome();openSheet('incSheet');}
function renderIncome(){const d=state.inc,S=state.settings;const amt=parseNum(d.amt)||0,rate=parseNum(d.rate)||S.rate;const nis=d.cur==='USD'?amt*rate:amt;
  const srcs=[...S.incomes.map(i=>[i.id,i.name]),['other','Other']];const ck=curMonth,nk=nextMK(curMonth),pk=prevMK(curMonth);
  const kinds=[['sal:'+ck,`Salary for ${MONTHS[+ck.slice(5)-1]}`],['sal:'+nk,`Salary for ${MONTHS[+nk.slice(5)-1]}`],['extra','Extra income']];
  if(d.kind&&!kinds.some(k=>k[0]===d.kind))kinds.unshift([d.kind,`Salary for ${MONTHS[+d.kind.slice(9)-1]}`]);
  const sm=d.kind.startsWith('sal:')?d.kind.slice(4):null;const clash=sm&&salFor(sm)&&salFor(sm).id!==d.id;
  $('incTitle').textContent=d.id?'Edit income':'Income received';
  $('incBody').innerHTML=`<span class="label">What is it?</span><div class="chips">${kinds.map(([k,n])=>`<button class="fchip ${d.kind===k?'sel':''}" data-ikind="${k}" aria-pressed="${d.kind===k}">${n}</button>`).join('')}</div>
    <p class="hint">${sm?`Your ${MONTHS[+sm.slice(5)-1]} money starts from the day it lands, or on the 1st if it comes late, and ends on the last day of ${MONTHS[+sm.slice(5)-1]}.${clash?' <b>You already logged a salary for this month.</b> This one will be added on top.':''}`:'Extra income adds to the month you are in, without starting a new one.'}</p>
    <span class="label">From</span><div class="chips">${srcs.map(([id,n])=>`<button class="fchip ${d.src===id?'sel':''}" data-isrc="${esc(id)}" aria-pressed="${d.src===id}">${esc(n)}</button>`).join('')}</div>
    ${d.src==='other'?`<div class="field"><label for="iName">Name</label><input id="iName" maxlength="30" value="${esc(d.name==='Other'?'':d.name)}" placeholder="e.g. Freelance, gift"></div>`:''}
    <div class="two"><div class="field"><label for="iAmt">Amount that reached you</label><input id="iAmt" inputmode="decimal" value="${esc(d.amt)}"></div>
      <div class="field"><label>Currency</label><div class="curseg"><button data-icur="USD" aria-pressed="${d.cur==='USD'}">$</button><button data-icur="NIS" aria-pressed="${d.cur==='NIS'}">₪</button></div></div></div>
    ${d.cur==='USD'?`<div class="two"><div class="field"><label for="iRate">Rate you got (₪ per $1)</label><input id="iRate" inputmode="decimal" value="${esc(d.rate)}"></div><div class="field"><label>In shekels</label><div class="incnis num" id="iNis">${fmt(nis)}</div></div></div>`:''}
    <div class="field"><label for="iDate">Date it landed</label><input type="date" id="iDate" value="${esc(d.date)}" max="${todayStr}"></div>
    <button class="primary" data-isave>${d.id?'Save changes':'Add income'}</button>
    ${d.id?(d.confirm?`<button class="del" data-idel>Yes, delete this income</button>`:`<button class="btn2" data-iask>Delete</button>`):''}`;
  const bind=(id,k)=>{const el=$(id);if(el)el.oninput=()=>{d[k]=el.value;if(k==='amt'||k==='rate'){const n=$('iNis');if(n){const a=parseNum(d.amt)||0,r=parseNum(d.rate)||S.rate;n.textContent=fmt(a*r);}}};};
  bind('iName','name');bind('iAmt','amt');bind('iRate','rate');bind('iDate','date');}
async function saveIncome(){const d=state.inc,S=state.settings;const amt=parseNum(d.amt);if(!(amt>0)){toast('Enter the amount that reached you.');return;}
  if(!d.date||d.date>todayStr){toast('Pick the date it landed.');return;}
  const sm=d.kind.startsWith('sal:')?d.kind.slice(4):null;
  const ps=sm&&salFor(prevMK(sm));if(sm&&ps&&ps.id!==d.id&&d.date<=ps.date){toast(`That's on or before your ${MONTHS[+ps.forM.slice(5)-1]} salary date. Check the month or the date.`);return;}
  if(sm&&d.date<`${prevMK(sm)}-01`){toast('That date is too early for this month\'s salary.');return;}
  if(sm&&d.date>`${sm}-31`){toast(`That date is after ${MONTHS[+sm.slice(5)-1]}. Pick "Extra income" or another month.`);return;}
  const rate=d.cur==='USD'?(parseNum(d.rate)||S.rate):1;const inc=S.incomes.find(i=>i.id===d.src);
  const rec={id:d.id||'in'+newId(),src:d.src,name:d.src==='other'?(String(d.name||'').trim().slice(0,30)||'Other'):(inc?inc.name:'Income'),cur:d.cur,amt:Math.round(amt*100)/100,rate:d.cur==='USD'?rate:null,nis:Math.round((d.cur==='USD'?amt*rate:amt)*100)/100,date:d.date,cycle:!!sm};
  if(sm)rec.forM=sm;
  const s2=clone(S);const L=(s2.incomeLog||[]).filter(x=>x.id!==rec.id);L.push(rec);s2.incomeLog=L;if(sm&&d.cur==='USD'&&rate)s2.rate=rate;
  const wasNew=!d.id;state.settings=s2;state.month=sm||keyOfDate(rec.date);
  closeSheets();render();
  try{await store.saveSettings(s2);
    const early=sm&&rec.date<`${sm}-01`;toast(sm&&wasNew?(early?`Your ${MONTHS[+sm.slice(5)-1]} money starts today 🎉`:`${MONTHS[+sm.slice(5)-1]} salary added 🎉`):wasNew?`${rec.name} added`:'Saved');if(sm&&wasNew)confetti();}
  catch(e){console.error(e);state.settings=S;state.month=null;render();toast("Couldn't save. Try again.");}}

/* ---------- tasbih: realistic misbaha, shuffled from Lina's drawer ---------- */
const DHIKR=[{id:'ap',name:'تسبيح بعد الصلاة',sets:[['سُبْحَانَ ٱللَّٰهِ','',33],['ٱلْحَمْدُ لِلَّٰهِ','',33],['ٱللَّٰهُ أَكْبَرُ','',34]]},
 {id:'ist',name:'أستغفر الله',sets:[['أَسْتَغْفِرُ ٱللَّٰهَ','',100]]},
 {id:'tah',name:'لا إله إلا الله',sets:[['لَا إِلَٰهَ إِلَّا ٱللَّٰهُ','',100]]},
 {id:'sal',name:'الصلاة على النبي',sets:[['ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ','',100]]}];
const BEADS={
unakite:{name:'Unakite stone',str:'#6B5844',tas:['#F2CDA0','#D9A46E'],t:'stone',base:['#8FA586','#5E7B57','#3E5439'],spot:'#C98679',div:['#E0A65A','#9C5A1E','#5E3210']},
onyx:{name:'Onyx and gold',str:'#3A3A3A',tas:['#3A3A3A','#111'],t:'matte',base:['#5A5A5E','#232326','#0E0E10'],div:['#FFE6A0','#D4A93A','#8A6412'],imam:['#5A5A5E','#232326','#0E0E10'],cap:'#D4A93A'},
amber:{name:'Amber · كهرمان',str:'#7A5428',tas:['#F2D27A','#C8962E'],t:'glass',base:['#FFE6A0','#F0A93A','#A85A10'],div:['#C98A3A','#7A3E0A','#3E1E04']},
pearl:{name:'Pearl',str:'#B9B0A4',tas:['#FFFFFF','#DCD6CE'],t:'pearl',base:['#FFFFFF','#EDE6DC','#BDB2A4'],div:['#F2F2F2','#B8B8BC','#7E7E84']},
olive:{name:'Olive wood',str:'#5A4630',tas:['#E8D3A8','#B89A62'],t:'wood',base:['#E6CB97','#B88E55','#7A5A30'],grain:'#7A5530',div:['#9A6E3E','#6E4A24','#3E2810']},
turq:{name:'Turquoise',str:'#5E5446',tas:['#7FD6CF','#3E9E98'],t:'fleck',fleck:'#5A4630',base:['#9EE6DF','#3FB3AA','#1E6E68'],div:['#E9C88A','#B8862B','#6E4A12']},
lapis:{name:'Lapis lazuli',str:'#2E3550',tas:['#4A62B8','#1E2E6E'],t:'fleck',fleck:'#E8C76A',base:['#5A78D8','#2A44A0','#14205A'],div:['#FFE6A0','#D4A93A','#8A6412']},
tiger:{name:'Tiger’s eye',str:'#4A3420',tas:['#D9A65A','#8A5A20'],t:'band',grain:'#F2C46A',base:['#C88A3A','#7A4A16','#3A2006'],div:['#2A1A0E','#1A0E06','#080402']},
hematite:{name:'Hematite',str:'#5A5A60',tas:['#9A9AA2','#5A5A62'],t:'metal',base:['#E8E8EE','#6A6A74','#1E1E24'],div:['#F2F2F2','#B8B8BC','#7E7E84']},
kuka:{name:'كوك and silver',str:'#4A3A2E',tas:['#3A2A1E','#140C06'],t:'wood',grain:'#140C06',base:['#6A4A32','#3A2414','#180C04'],div:['#F2F2F2','#B8B8BC','#7E7E84'],imam:['#6A4A32','#3A2414','#180C04'],cap:'#C8C8D0'},
moon:{name:'Moonstone',str:'#9A96A8',tas:['#E6E8F2','#B0B6D0'],t:'glass',glow:'#B8D0FF',base:['#FFFFFF','#DCE0EE','#9AA2C0'],div:['#F2F2F2','#B8B8BC','#7E7E84']},
jade:{name:'Jade',str:'#3E4A3A',tas:['#E8D3A8','#B89A62'],t:'glass',glow:'#B8F0C8',base:['#8ED6A4','#3E9A64','#1A5A34'],div:['#FFE6A0','#D4A93A','#8A6412']}};
const BLOOP=(()=>{const CX=150,CY=128,RX=108,RY=112;const P=[];let L=0,prev=null;for(let i=0;i<=1200;i++){const th=Math.PI/2+i/1200*2*Math.PI;const x=CX+RX*Math.cos(th),y=CY+RY*Math.sin(th)*(1+0.08*Math.sin(th));if(prev)L+=Math.hypot(x-prev[0],y-prev[1]);P.push([x,y,L]);prev=[x,y];}return {P,L};})();
function bAt(l){const P=BLOOP.P;l=((l%BLOOP.L)+BLOOP.L)%BLOOP.L;let lo=0,hi=P.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(P[m][2]<l)lo=m;else hi=m;}return P[hi];}
function beadDefs(s,p){let d='<defs>';const g=(id,c)=>`<radialGradient id="${p}${id}" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="${c[0]}"/><stop offset=".55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></radialGradient>`;
 d+=g('gb',s.base)+g('gd',s.div)+g('gi',s.imam||s.div)+`<radialGradient id="${p}hl" cx="34%" cy="27%" r="${s.t==='metal'?24:32}%"><stop offset="0" stop-color="#fff" stop-opacity="${s.t==='matte'?.22:.92}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><linearGradient id="${p}tg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${s.tas[0]}"/><stop offset="1" stop-color="${s.tas[1]}"/></linearGradient>`;
 for(let v=0;v<3;v++){d+=`<symbol id="${p}b${v}" viewBox="-1 -1 2 2"><circle r="1" fill="url(#${p}gb)"/>`;
  if(s.t==='stone'){const sp=[[[-.3,.2,.38],[.38,-.25,.28],[.1,.58,.22],[-.5,-.45,.18]],[[.3,.3,.42],[-.42,-.3,.25],[-.1,.1,.16],[.5,-.5,.15]],[[0,-.45,.32],[-.38,.38,.3],[.48,.25,.22],[.2,.6,.12]]][v];sp.forEach(([x,y,r])=>d+=`<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*.72}" fill="${s.spot}" opacity=".8" transform="rotate(${v*40+20} ${x} ${y})"/>`);d+=`<circle r="1" fill="url(#${p}gb)" opacity=".3"/>`;}
  if(s.t==='wood')for(let k=0;k<4;k++){const yy=-.75+k*.45+v*.08;d+=`<path d="M-1 ${yy} Q0 ${yy+(k%2?.25:-.2)} 1 ${yy+.05}" stroke="${s.grain}" stroke-width=".07" fill="none" opacity=".45"/>`;}
  if(s.t==='band')for(let k=0;k<3;k++){const yy=-.55+k*.5+v*.06;d+=`<path d="M-1 ${yy} Q0 ${yy-.18} 1 ${yy}" stroke="${s.grain}" stroke-width=".16" fill="none" opacity=".55"/>`;}
  if(s.t==='fleck'){const fl=[[[-.4,.1],[.3,.4],[.5,-.2],[-.1,-.5],[.0,.65]],[[.4,.1],[-.3,.45],[-.5,-.25],[.1,-.55],[.2,.2]],[[-.2,.3],[.45,-.35],[-.45,-.1],[.25,.6],[-.05,-.2]]][v];fl.forEach(([x,y],i)=>d+=`<circle cx="${x}" cy="${y}" r="${.05+.04*(i%2)}" fill="${s.fleck}" opacity=".85"/>`);}
  if(s.t==='glass')d+=`<circle cx=".18" cy=".28" r=".55" fill="${s.glow||'#FFE29A'}" opacity=".45"/><circle cx="-.2" cy=".4" r=".2" fill="#fff" opacity=".18"/>`;
  if(s.t==='pearl')d+=`<circle r=".96" fill="none" stroke="#E9DDF2" stroke-width=".14" opacity=".55"/>`;
  if(s.t==='metal')d+=`<ellipse cx=".25" cy=".45" rx=".45" ry=".18" fill="#fff" opacity=".18"/>`;
  d+=`<circle r="1" fill="url(#${p}hl)"/><circle r=".97" fill="none" stroke="rgba(0,0,0,.28)" stroke-width=".06"/></symbol>`;}
 return d+'</defs>';}
function misbahaSVG(k,c,an,p){const s=BEADS[k]||BEADS.unakite;const N=33;c=Math.max(0,Math.min(N,c));
 const bead=(x,y,r,v,hl)=>`<ellipse cx="${x.toFixed(1)}" cy="${(y+r*0.8).toFixed(1)}" rx="${(r*0.85).toFixed(1)}" ry="${(r*0.32).toFixed(1)}" fill="rgba(0,0,0,.28)"/><use href="#${p}b${v}" x="${(x-r).toFixed(1)}" y="${(y-r).toFixed(1)}" width="${(2*r).toFixed(1)}" height="${(2*r).toFixed(1)}"/>${hl?`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r+2.4).toFixed(1)}" fill="none" stroke="rgba(255,248,238,.85)" stroke-width="1.3"/>`:''}`;
 const big=(x,y,r,gr)=>`<ellipse cx="${x.toFixed(1)}" cy="${(y+r*.85).toFixed(1)}" rx="${r}" ry="${(r*.33).toFixed(1)}" fill="rgba(0,0,0,.3)"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="url(#${p}${gr})"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="url(#${p}hl)"/>${s.cap?`<rect x="${(x-r*.5).toFixed(1)}" y="${(y-r-1.5).toFixed(1)}" width="${r.toFixed(1)}" height="3.2" rx="1.2" fill="${s.cap}"/><rect x="${(x-r*.5).toFixed(1)}" y="${(y+r-1.7).toFixed(1)}" width="${r.toFixed(1)}" height="3.2" rx="1.2" fill="${s.cap}"/>`:''}`;
 const G=22,DIVW=19,DR=8.6;const SP=Math.min(17,(BLOOP.L-2*G-2*DIVW-4)/N);const R=SP*0.47;
 let o=beadDefs(s,p)+`<path d="${BLOOP.P.filter((_,i)=>i%6===0).map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' ')}Z" fill="none" stroke="${s.str}" stroke-width="1.6"/>`;
 const [bx,by]=bAt(0);const top=by+33;o+=`<path d="M${bx} ${by+2} v10" stroke="${s.str}" stroke-width="2"/>`+big(bx,by+22,10,'gi')+`<path d="M${bx-6} ${top} q6 -4 12 0 l1.5 7 q-7.5 3 -15 0z" fill="url(#${p}tg)"/>`;
 for(let i=0;i<19;i++){const f=(i-9)/9;const sx=bx+f*6.5,ex=bx+f*13;o+=`<path d="M${sx.toFixed(1)} ${top+7} Q${(sx+f*2).toFixed(1)} ${top+24} ${ex.toFixed(1)} ${top+44-Math.abs(f)*4}" stroke="url(#${p}tg)" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="${(.78+.22*((i*7)%5)/4).toFixed(2)}"/>`;}
 o+=`<path d="M${bx-6.5} ${top+11} h13" stroke="${s.tas[1]}" stroke-width="2.4" stroke-linecap="round"/>`;
 const dA=[10,21];let l=BLOOP.L-G;for(let i=c-1;i>=0;i--){if(dA.includes(i)){l-=DIVW/2;const [x,y]=bAt(l);o+=big(x,y,DR,'gd');l-=DIVW/2;}l-=SP/2;const [x,y]=bAt(l);o+=bead(x,y,R,i%3,false);l-=SP/2;}
 const items=[];let L=G;for(let i=c;i<N;i++){L+=SP/2;items.push({i,l:L});L+=SP/2;if(dA.includes(i)&&i+1<N){L+=DIVW/2;items.push({d:1,l:L});L+=DIVW/2;}}
 items.slice().reverse().forEach(it=>{let l2=it.l;if(it.i===c&&an)l2=it.l-(it.l+G+SP/2)*an;const [x,y]=bAt(l2);o+=it.d?big(x,y,DR,'gd'):bead(x,y,R,it.i%3,it.i===c);});
 return `<svg viewBox="0 0 300 330" class="misbaha" aria-hidden="true">${o}</svg>`;}
function dhikrs(){return [...DHIKR,...((state.settings.customDhikr||[]).map(d=>({id:d.id,name:d.name,custom:true,sets:[[d.ar||d.name,d.name,+d.goal||100]]})))];}
const dTotal=d=>d.sets.reduce((a,x)=>a+x[2],0);
function tbCount(ds,id){return +((dayDoc(ds).tb||{})[id])||0;}
function pickBeads(){const drawer=(state.settings.beadDrawer&&state.settings.beadDrawer.length?state.settings.beadDrawer:Object.keys(BEADS)).filter(k=>BEADS[k]);let last=null;try{last=localStorage.getItem('lb.lastBeads')}catch(e){}
  const pool=drawer.length>1?drawer.filter(k=>k!==last):drawer;const k=pool[Math.floor(Math.random()*pool.length)]||'unakite';try{localStorage.setItem('lb.lastBeads',k)}catch(e){}return k;}
function renderTasbih(){const ds=state.hday;const ds2=dhikrs();const tot=ds2.reduce((a,d)=>a+tbCount(ds,d.id),0);
  $('tTasbih').innerHTML=`<div class="cardhead"><h2 class="arw">التسبيح</h2><span class="label num">${tot} today</span></div>
    <div class="tblist">${ds2.map(d=>{const n=tbCount(ds,d.id),g=dTotal(d);return `<button class="tbrow" data-tbopen="${esc(d.id)}"><span class="arw" dir="auto">${esc(d.name)}</span><span class="tbbar"><i style="width:${Math.min(1,n/g)*100}%"></i></span><b class="num ${n>=g?'done':''}">${n>=g?'✓ ':''}${n}/${g}</b></button>`;}).join('')}</div>
    <button class="primary" data-tbopen="${esc((state.tb&&state.tb.id)||'ap')}">Open the <span class="arw">مسبحة</span></button>`;}
function openTasbih(id){const d=dhikrs().find(x=>x.id===id)||DHIKR[0];state.tb={id:d.id,beads:pickBeads(),anim:0,busy:false};renderTbSheet();openSheet('tbSheet');}
function tbPos(d,n){let rem=n;for(let i=0;i<d.sets.length;i++){const sz=d.sets[i][2];if(rem<sz||i===d.sets.length-1){return {si:i,inSet:Math.min(rem,sz)};}rem-=sz;}return {si:0,inSet:0};}
function renderTbSheet(){const T=state.tb;if(!T)return;const d=dhikrs().find(x=>x.id===T.id)||DHIKR[0];const n=tbCount(todayStr,d.id),g=dTotal(d);const {si,inSet}=tbPos(d,n);const [ar,lat,sz]=d.sets[si];
  const rounds=sz>33?Math.floor(sz/33):0;const round=rounds?Math.min(rounds,Math.floor(inSet/33)+1):0;const beadsOnLoop=rounds?Math.min(33,inSet-(round-1)*33):inSet;
  $('tbTitle').textContent=d.name;
  $('tbBody').innerHTML=`<div class="chips scrollx">${dhikrs().map(x=>`<button class="fchip arw ${x.id===d.id?'sel':''}" data-tbpick="${esc(x.id)}" dir="auto">${esc(x.name)}</button>`).join('')}<button class="fchip" data-tbnew>+ Your own</button></div>
    <div class="beadcard" id="beadTap"><div class="bar2" dir="auto">${esc(ar)}</div>${lat?`<div class="blat">${esc(lat)}</div>`:''}<div id="beadSvg">${misbahaSVG(T.beads,n>=g?33:beadsOnLoop,T.anim,'mb_')}</div>
      <div class="bcount num"><b>${n}</b> of ${g}${d.sets.length>1?` · set ${si+1} of ${d.sets.length}`:round?` · round ${round} of ${rounds}`:''}</div>
      ${n>=g?'<div class="bdone">Complete. May Allah accept it.</div>':''}</div>
    <div class="two"><button class="btn2" data-tbundo>−1</button><button class="btn2" data-tbbeads>${esc(BEADS[T.beads].name)} ⟳</button></div>
    <button class="link" data-tbreset style="align-self:center">Reset today's count</button>`;
  $('beadTap').onpointerup=()=>tbTap();}
function setTb(ds,id,v){const next={...dayDoc(ds),id:ds};next.tb={...(next.tb||{}),[id]:Math.max(0,v)};state.days=state.days.filter(d=>d.id!==ds).concat([next]);
  clearTimeout(writeTimers[ds]);writeTimers[ds]=setTimeout(()=>{if(db)db.collection('days').doc(ds).set(strip(next)).catch(()=>toast("Couldn't save. Check your connection."));else lsSet();},600);}
function tbTap(){const T=state.tb;if(!T||T.busy)return;const d=dhikrs().find(x=>x.id===T.id);const n=tbCount(todayStr,d.id),g=dTotal(d);if(n>=g){toast('Done for today. Reset to count again.');return;}
  T.busy=true;let k=0;const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fin=()=>{T.anim=0;T.busy=false;const n2=n+1;setTb(todayStr,d.id,n2);const {si,inSet}=tbPos(d,n2);const boundary=d.sets.slice(0,si).reduce((a,x)=>a+x[2],0);const atSetEnd=n2===boundary+d.sets[si][2]||(d.sets.length>1&&inSet===0&&n2>0);
    if(navigator.vibrate)navigator.vibrate(n2>=g?[80,60,80]:(n2%33===0||atSetEnd)?[50,40,50]:10);renderTbSheet();if(n2>=g){confetti();}};
  if(reduce){fin();return;}
  const id=setInterval(()=>{k++;T.anim=k/8;const {si,inSet}=tbPos(d,n);const sz=d.sets[si][2];const rr=sz>33?Math.min(Math.floor(sz/33),Math.floor(inSet/33)+1):0;$('beadSvg').innerHTML=misbahaSVG(T.beads,rr?Math.min(33,inSet-(rr-1)*33):inSet,T.anim,'mb_');if(k>=8){clearInterval(id);fin();}},16);}

/* ---------- notes: chat with yourself ---------- */
const URLRE=/(https?:\/\/[^\s]+)/i;
const domainOf=u=>{try{return new URL(u).hostname.replace(/^www\./,'');}catch(e){return '';}};
/* filters: Work and Life to start, Lina can add her own */
const NT_COL=[['#DCE8FB','#0C447C'],['#FAEEDA','#633806'],['#DDF1E4','#1E5B36'],['#ECE3FA','#4A2A85'],['#D5EFEF','#14585B'],['#FFF1B8','#5E4800'],['#FCE3CF','#7A3A0E'],['#E6E9EE','#36414F']];
function noteTags(){const L=state.settings&&state.settings.noteTags;return Array.isArray(L)&&L.length?L:[{id:'work',name:'Work',c:0},{id:'life',name:'Life',c:1}];}
const ntOf=id=>noteTags().find(t=>t.id===id)||null;
const ntSty=t=>{const c=NT_COL[((t?t.c:7)%NT_COL.length+NT_COL.length)%NT_COL.length];return `background:${c[0]};color:${c[1]}`;};
let nDraft={tag:'life',photo:null,thumb:null};try{const t=localStorage.getItem('lb.ntag');if(t)nDraft.tag=t;}catch(e){}
function draftTag(){if(!ntOf(nDraft.tag))nDraft.tag=noteTags()[0].id;return ntOf(nDraft.tag);}
function renderNotes(){if(state.nf&&!['all','pin'].includes(state.nf)&&!ntOf(state.nf))state.nf='all';const f=state.nf||'all',q=(state.nq||'').toLowerCase();
  $('nChips').innerHTML=[['all','All'],...noteTags().map(t=>[t.id,esc(t.name)]),['pin','📌 Pinned']].map(([k,t])=>`<button class="fchip ${f===k?'sel':''}" data-nf="${esc(k)}" aria-pressed="${f===k}">${t}</button>`).join('')+`<button class="fchip" data-ntman aria-label="Add or edit filters">＋ Filter</button>`;
  const dt=draftTag();$('nTag').textContent=dt.name;$('nTag').className='ntag';$('nTag').style.cssText=ntSty(dt);$('nTag').setAttribute('aria-label','Filter for this note: '+dt.name);
  let L=[...state.notes].sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  if(ntOf(f))L=L.filter(n=>n.tag===f);if(f==='pin')L=L.filter(n=>n.pinned);
  if(q)L=L.filter(n=>[n.text,n.label,n.url].join(' ').toLowerCase().includes(q));
  if(!L.length){$('nList').innerHTML=`<div class="nempty">${catSVG('open',{pose:'peek'})}<p>${q||f!=='all'?'Nothing here.':'Your notes to yourself live here. Paste a link, jot an idea, or add a photo, like a chat with yourself.'}</p></div>`;return;}
  let html='',last='';L.forEach(n=>{const d=ymd(new Date(n.createdAt||Date.now()));if(d!==last){html+=`<div class="nday">${dayLabel(d)}</div>`;last=d;}
    const tm=new Date(n.createdAt||0);const time=`${tm.getHours()}:${pad(tm.getMinutes())}`;const txt=n.url?String(n.text||'').replace(n.url,'').trim():n.text;
    html+=`<button class="nb ${n.pinned?'pin':''}" data-note="${esc(n.id)}">
      ${ntOf(n.tag)||n.pinned?`<span class="ntop">${ntOf(n.tag)?`<span class="tag" style="${ntSty(ntOf(n.tag))}">${esc(ntOf(n.tag).name)}</span>`:''}${n.pinned?'<span class="npin">📌</span>':''}</span>`:''}
      ${imgSrc(n)?`<img src="${esc(imgSrc(n))}" alt="" class="nimg">`:''}
      ${txt?`<span class="ntxt" dir="auto">${esc(txt)}</span>`:''}
      ${n.url?`<span class="nlink">${n.label?`<b>✨ ${esc(n.label)}</b>`:n.labelling?'<b class="muted">✨ Reading the link…</b>':'<b class="muted">Tap to add a label</b>'}<small>${esc(domainOf(n.url))}</small></span>`:''}
      <span class="ntime">${time}</span></button>`;});
  $('nList').innerHTML=html;}
async function labelNote(n){if(!sampleFn||!n.url&&!n.photo)return;const upd=x=>{state.notes=state.notes.map(y=>y.id===x.id?x:y);if(state.tab==='notes')renderNotes();};
  upd({...n,labelling:true});
  const prompt=`Give a short label of 1 to 3 words saying what this saved item is about, like "Cabbage recipe", "Kids sleep tips" or "Abaya haul". Use English, or Arabic if the content is Arabic. Use what is in the link address, the note text${n.photo?', and the screenshot':''}. If you truly cannot tell, use null. Reply with only JSON: {"label": string|null}
Link: ${n.url||'none'}
Note: ${String(n.text||'').slice(0,500)}`;
  let lab=null;try{const opts={modelTier:'quick',cache:false};if(window.__lifeDB&&n.url)opts.peekUrl=n.url;if(n.photo){try{const b=await (await fetch('/_blob/'+n.photo)).blob();opts.images=[b];}catch(e){}}
    const r=await sampleFn.json(prompt,opts);lab=r&&typeof r.label==='string'?r.label.trim().slice(0,40):null;}catch(e){}
  const done={...n};delete done.labelling;if(lab)done.label=lab;try{await store.put('notes',done);}catch(e){upd(done);}}
async function saveNote(){const raw=$('nText').value.trim();if(!raw&&!nDraft.photo&&!nDraft.thumb)return;const m=raw.match(URLRE);
  const n={id:'n'+newId(),text:raw.slice(0,4000),tag:nDraft.tag,pinned:false,createdAt:Date.now()};if(m)n.url=m[1].replace(/[),.]+$/,'');if(nDraft.photo)n.photo=nDraft.photo;if(nDraft.thumb)n.thumb=nDraft.thumb;
  $('nText').value='';$('nText').style.height='';nDraft.photo=null;nDraft.thumb=null;$('nPhotoPrev').hidden=true;
  try{await store.put('notes',n);setTimeout(()=>{const el=$('nList');window.scrollTo(0,document.body.scrollHeight);},50);if(n.url)labelNote(n);}catch(e){toast("Couldn't save. Try again.");}}
const ntPickHTML=cur=>noteTags().map(t=>`<button type="button" class="${t.id===cur?'sel':''}" style="${ntSty(t)}" data-nesettag="${esc(t.id)}" aria-pressed="${t.id===cur}">${esc(t.name)}</button>`).join('');
function toggleTagMenu(show){const m=$('nTagMenu');if(show===undefined)show=m.hidden;if(!show){m.hidden=true;return;}const cur=draftTag().id;
  m.innerHTML=noteTags().map(t=>`<button role="menuitemradio" aria-checked="${t.id===cur}" class="${t.id===cur?'sel':''}" data-ntpick="${esc(t.id)}"><span class="dot" style="background:${NT_COL[t.c%NT_COL.length][1]}"></span>${esc(t.name)}${t.id===cur?' ✓':''}</button>`).join('')+`<button role="menuitem" data-ntman>＋ New filter</button>`;m.hidden=false;}
function openTagMan(){toggleTagMenu(false);state.ntm=noteTags().map(t=>({...t}));renderTagMan();openSheet('dateSheet');setTimeout(()=>{const i=$('ntNew');if(i)i.focus();},80);}
function renderTagMan(){const cnt=id=>state.notes.filter(n=>n.tag===id).length;$('dateTitle').textContent='Filters';
  $('dateBody').innerHTML=state.ntm.map((t,i)=>`<div class="ntrow ${t.gone?'gone':''}"><button type="button" class="ntdot" style="${ntSty(t)}" data-ntcol="${i}" aria-label="Change colour of ${esc(t.name)}">Aa</button><input data-ntname="${i}" value="${esc(t.name)}" maxlength="18" aria-label="Filter name" ${t.gone?'disabled':''}><button type="button" class="ntx" data-ntdel="${i}" aria-label="${t.gone?'Keep':'Delete'} ${esc(t.name)}">${t.gone?'↺':'✕'}</button></div>${t.gone&&cnt(t.id)?`<p class="nthint">${cnt(t.id)} note${cnt(t.id)>1?'s':''} will stay in All, with no filter.</p>`:''}`).join('')+
  `<div class="field"><label for="ntNew">New filter</label><div class="ntrow"><input id="ntNew" maxlength="18" placeholder="e.g. Recipes, Kydzzo, Ideas"><button type="button" class="btn2" data-ntadd style="flex:none">Add</button></div></div>
  <p class="nthint">Tap a circle to change its colour.</p><button class="primary" data-ntsave>Save filters</button>`;}
function ntSync(){document.querySelectorAll('[data-ntname]').forEach(i=>{const t=state.ntm[+i.dataset.ntname];if(t)t.name=i.value;});}
function ntAdd(){ntSync();const i=$('ntNew');const name=(i.value||'').trim().slice(0,18);if(!name){i.focus();return;}
  if(state.ntm.some(t=>!t.gone&&t.name.toLowerCase()===name.toLowerCase())){toast('You already have that one.');return;}
  if(state.ntm.filter(t=>!t.gone).length>=12){toast('12 filters is the limit.');return;}
  const used=state.ntm.map(t=>t.c);let c=0;while(used.includes(c)&&c<NT_COL.length-1)c++;state.ntm.push({id:'t'+newId(),name,c});renderTagMan();setTimeout(()=>{const x=$('ntNew');if(x)x.focus();},30);}
async function ntSave(){ntSync();const pend=($('ntNew')&&$('ntNew').value.trim());if(pend)ntAdd();
  const L=state.ntm.filter(t=>!t.gone).map(t=>({id:t.id,name:String(t.name).trim().slice(0,18),c:t.c}));
  if(!L.length){toast('Keep at least one filter.');return;}if(L.some(t=>!t.name)){toast('Give every filter a name.');return;}
  const S=state.settings,s2=clone(S);s2.noteTags=L;state.settings=s2;closeSheets();renderNotes();
  try{await store.saveSettings(s2);toast('Filters saved');}catch(e){state.settings=S;renderNotes();toast("Couldn't save. Try again.");}}
function openNote(id){const n=state.notes.find(x=>x.id===id);if(!n)return;state.nedit={...n};
  $('dateTitle').textContent='Note';$('dateBody').innerHTML=`${n.url?`<a class="btn2" href="${esc(n.url)}" target="_blank" rel="noopener" style="text-align:center;text-decoration:none;color:var(--ink)">Open link · ${esc(domainOf(n.url))}</a>`:''}
    ${n.url?`<div class="field"><label for="neLabel">Label</label><input id="neLabel" maxlength="40" value="${esc(n.label||'')}" placeholder="e.g. Cabbage recipe"></div>`:''}
    <div class="field"><label for="neText">Note</label><textarea id="neText" rows="4" dir="auto">${esc(n.text||'')}</textarea></div>
    <div class="field"><label>Filter</label><div class="ntpick" id="nePick">${ntPickHTML(n.tag)}</div></div>
    <div class="two"><button class="btn2" data-nepin>${n.pinned?'Unpin':'📌 Pin'}</button><button class="btn2" data-necopy>Copy text</button></div>
    ${n.url?'<button class="btn2" data-nelabel>✨ Label again</button>':''}
    <button class="primary" data-nesave>Save</button><button class="del" data-nedel>Delete note</button>`;openSheet('dateSheet');}
/* ---------- backup ---------- */
async function downloadBackup(){let dl=null;try{dl=await window.claude.use('downloads');}catch(e){dl=null;}
  if(!dl){toast('Downloads are not available here. Open the app from your Claude account.');return;}
  const data={app:'lenas-life-book',version:2,exportedAt:new Date().toISOString(),settings:state.settings,collections:{}};COLLS.forEach(c=>data.collections[c]=state[c]);
  toast('Packing your photos…');data.blobs=await collectBlobs();
  try{await dl.save({filename:`lifebook-backup-${todayStr}.json`,data:JSON.stringify(data,null,1)});toast('Backup saved');}catch(e){if(e&&e.code!=='declined')toast("Couldn't save the backup. Try again.");}}
async function collectBlobs(){const ids=new Set();COLLS.forEach(c=>(state[c]||[]).forEach(d=>{['photo','orig'].forEach(k=>{if(d&&typeof d[k]==='string'&&d[k]&&!/^data:/.test(d[k]))ids.add(d[k]);});}));
  const out={};for(const id of ids){try{const r=await fetch('/_blob/'+id);if(!r.ok)continue;const b=await r.blob();if(b.size)out[id]=await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>res(null);fr.readAsDataURL(b);});}catch(e){}}
  Object.keys(out).forEach(k=>{if(!out[k])delete out[k];});return out;}
async function restoreBackup(obj){let n=0;try{if(obj.blobs&&assetsNS&&assetsNS.putWithId){for(const [id,u] of Object.entries(obj.blobs)){try{const b=await (await fetch(u)).blob();await assetsNS.putWithId(id,b);}catch(e){}}}
  for(const c of COLLS){for(const d of (obj.collections[c]||[])){if(d&&d.id){await store.put(c,d);n++;}}}
    if(obj.settings)await store.saveSettings(mergeSettings(obj.settings));toast(`Restored ${n} records`);}catch(e){toast(`Stopped after ${n} records. Check your connection and try again.`);}}

function renderRecapBan(){const el=$('recapBan');if(today.getDate()>7){el.innerHTML='';return;}const d=new Date(today.getFullYear(),today.getMonth()-1,1);const k=d.getFullYear()+'-'+pad(d.getMonth()+1);
  let seen=null;try{seen=localStorage.getItem('lb.recapSeen')}catch(e){}
  el.innerHTML=seen===k?'':`<button class="recapban" data-recap="${k}">${catSVG('happy',{pose:'star'})}<span><b>Your ${MONTHS[d.getMonth()]} recap is ready</b><small>Tap to see how the month went</small></span></button>`;}
const LOOKS=[{"id": "royal", "name": "Royal purple", "glitter": 1, "h1": "#3A1F5C", "h2": "#170D24", "sun": "#E0A93A", "olive": "#2A1840", "bg": "#F8F5FA", "violet": "#9D4EDD"}, {"id": "cherry", "name": "Cherry and gold", "glitter": 1, "h1": "#C8233A", "h2": "#4A0C14", "sun": "#E0A93A", "olive": "#B3202F", "bg": "#FBF6F3", "violet": "#E63946"}, {"id": "midnight", "name": "Midnight mustard", "glitter": 0, "h1": "#2E2A28", "h2": "#151211", "sun": "#E0A93A", "olive": "#262221", "bg": "#F6F2EC", "violet": "#8B5E3C"}, {"id": "honey", "name": "Honey morning", "glitter": 0, "h1": "#C27C1E", "h2": "#5A3410", "sun": "#F0B429", "olive": "#6B4318", "bg": "#FFF8EC", "violet": "#D9822B"}, {"id": "lavender", "name": "Lavender dream", "glitter": 1, "h1": "#7462B8", "h2": "#3A2D6E", "sun": "#E0A93A", "olive": "#4E3F86", "bg": "#F8F6FD", "violet": "#9B87E0"}, {"id": "ocean", "name": "Ocean and sand", "glitter": 0, "h1": "#24507D", "h2": "#0E1F33", "sun": "#F2B544", "olive": "#1F3A5F", "bg": "#F5F7F9", "violet": "#3E7CB1"}, {"id": "espresso", "name": "Espresso caramel", "glitter": 0, "h1": "#4A3328", "h2": "#1F1511", "sun": "#D9A05B", "olive": "#3B2920", "bg": "#F7F1EA", "violet": "#A0673A"}, {"id": "sunset", "name": "Sunset glow", "glitter": 1, "h1": "#E2552C", "h2": "#6E1A0E", "sun": "#F5B83D", "olive": "#A33417", "bg": "#FFF6F0", "violet": "#F2542D"}, {"id": "galaxy", "name": "Galaxy night", "glitter": 1, "h1": "#2B2F7A", "h2": "#0A0B24", "sun": "#FFC94D", "olive": "#232A6E", "bg": "#F5F6FC", "violet": "#4C5FD5"}, {"id": "sky", "name": "Sunny sky", "glitter": 0, "h1": "#3D8BC9", "h2": "#164A75", "sun": "#FFC233", "olive": "#1F5E92", "bg": "#F4F9FD", "violet": "#3A9AD9"}];
/* ---------- themes ---------- */
/* ---------- themes: presets, custom, favorites ---------- */
const hsl=(h,s,l)=>`hsl(${Math.round(((h%360)+360)%360)} ${Math.round(s)}% ${Math.round(l)}%)`;
function genLook(h,s){const sunH=(h>=30&&h<=75)?(h+200)%360:42;const sunS=(h>=30&&h<=75)?55:72;
  const L={bg:hsl(h,Math.min(s,45),97),surface:'#FFFFFF',s2:hsl(h,Math.min(s,40),94),ink:hsl(h,30,12),muted:hsl(h,10,44),line:hsl(h,28,88),olive:hsl(h,s,24),osoft:hsl(h,s*.6,92),
    sun:sunH===42?'#E0A93A':hsl(sunH,sunS,58),ssoft:hsl(sunH,70,90),sink:'#2B1D05',violet:hsl(h,s,52),vsoft:hsl(h,s*.7,94),h1:hsl(h,s,30),h2:hsl(h,s,9)};
  const D={bg:hsl(h,25,7),surface:hsl(h,22,11),s2:hsl(h,20,16),ink:hsl(h,20,95),muted:hsl(h,10,66),line:hsl(h,18,24),olive:hsl(h,s*.8,87),osoft:hsl(h,25,20),
    sun:sunH===42?'#EBB648':hsl(sunH,sunS,66),ssoft:hsl(sunH,45,16),sink:'#231703',violet:hsl(h,s,70),vsoft:hsl(h,30,20),h1:hsl(h,s*.85,24),h2:hsl(h,s,7)};
  return {L,D};}
const tokBlock=d=>`--bg:${d.bg};--surface:${d.surface};--surface-2:${d.s2};--ink:${d.ink};--muted:${d.muted};--line:${d.line};--olive:${d.olive};--olive-soft:${d.osoft};--sun:${d.sun};--sun-soft:${d.ssoft};--sun-ink:${d.sink};--violet:${d.violet};--violet-soft:${d.vsoft};--hero1:${d.h1};--hero2:${d.h2};--char:${d.olive}`;
function customCss(list){return (list||[]).map(c=>{const {L,D}=genLook(c.hue,c.sat);return `:root[data-look="${c.id}"]{${tokBlock(L)}}@media (prefers-color-scheme: dark){:root[data-look="${c.id}"]:not([data-theme="light"]){${tokBlock(D)};color-scheme:dark}}:root[data-look="${c.id}"][data-theme="dark"]{${tokBlock(D)};color-scheme:dark}`;}).join('\n');}
function injectCustom(list){let el=document.getElementById('customLooks');if(!el){el=document.createElement('style');el.id='customLooks';document.head.appendChild(el);}const css=customCss(list);el.textContent=css;try{localStorage.setItem('lb.customCss',css);localStorage.setItem('lb.customList',JSON.stringify(list||[]));}catch(e){}}
function allLooks(){const cl=(state&&state.settings&&state.settings.customLooks)||(()=>{try{return JSON.parse(localStorage.getItem('lb.customList')||'[]')}catch(e){return []}})();
  return LOOKS.concat(cl.map(c=>{const {L}=genLook(c.hue,c.sat);return {id:c.id,name:c.name,glitter:c.glitter?1:0,h1:L.h1,h2:L.h2,sun:L.sun,violet:L.violet,custom:true};}));}
function applyLook(id){const L=allLooks().find(x=>x.id===id)||LOOKS[0];const r=document.documentElement;if(L.id==='royal')delete r.dataset.look;else r.dataset.look=L.id;r.dataset.sparkle=L.glitter?'on':'off';
  try{localStorage.setItem('lb.look',L.id)}catch(e){}}
try{const css=localStorage.getItem('lb.customCss');if(css){const el=document.createElement('style');el.id='customLooks';el.textContent=css;document.head.appendChild(el);}}catch(e){}
try{applyLook(localStorage.getItem('lb.look')||'royal');}catch(e){}
function applyMode(m){const r=document.documentElement;if(m==='light'||m==='dark')r.dataset.theme=m;else delete r.dataset.theme;try{localStorage.setItem('lb.mode',m||'auto')}catch(e){}}
try{const m=localStorage.getItem('lb.mode');if(m&&m!=='auto')applyMode(m);}catch(e){}
function syncModeSeg(){const m=state.settings.mode||'auto';document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===m)));}
function themePicker(){const S=state.settings;const cur=S.look||'royal';const fav=S.favLooks||[];
  const looks=allLooks().sort((a,b)=>(fav.includes(b.id)?1:0)-(fav.includes(a.id)?1:0));
  return `<div class="looks">${looks.map(L=>`<div class="look ${cur===L.id?'sel':''}"><button class="lookpick" data-pick="${L.id}" aria-pressed="${cur===L.id}" aria-label="Use ${esc(L.name)}"><span class="lsw" style="background:linear-gradient(150deg,${L.h1},${L.h2})"><i style="background:${L.sun}"></i><i style="background:${L.violet}"></i>${L.glitter?'<em>✦</em>':''}</span><b>${esc(L.name)}</b></button>
    <button class="lookfav ${fav.includes(L.id)?'on':''}" data-fav="${L.id}" aria-pressed="${fav.includes(L.id)}" aria-label="Favorite ${esc(L.name)}"><svg viewBox="0 0 24 24" width="16" height="16"><path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" fill="${fav.includes(L.id)?'currentColor':'none'}"/></svg></button>
    ${L.custom?`<button class="lookdel" data-ldel="${L.id}" aria-label="Delete ${esc(L.name)}">×</button>`:''}</div>`).join('')}
    <button class="lookmake" data-makelook><span class="lsw rainbow"></span><b>Create your own</b></button></div>
    <label class="toggle" style="margin-top:10px"><input type="checkbox" id="moodToggle" ${S.moodCheck===false?'':'checked'}> Ask my mood each morning and match a theme</label>`;}
/* creator */
function openCreator(){state.lmake={hue:150,sat:55,name:'',glitter:false};renderCreator();openSheet('lookSheet');}
function renderCreator(){const m=state.lmake;const {L}=genLook(m.hue,m.sat);
  $('lookBody').innerHTML=`<div class="lprev" style="background:linear-gradient(150deg,${L.h1},${L.h2})"><span class="lprevcat">${catSVG('happy')}</span><small>LEFT FOR OCTOBER</small><b>₪5,343</b>
      <div class="lprevrow"><span style="background:${L.sun};color:#2B1D05">Add spend</span><span style="background:${L.vsoft};color:${L.olive}">Done</span></div></div>
    <div class="field"><label for="lmHue">Main color</label><input type="range" id="lmHue" class="huerange" min="0" max="359" value="${m.hue}"></div>
    <div class="field"><label for="lmSat">Soft ↔ vivid</label><input type="range" id="lmSat" class="satrange" min="15" max="90" value="${m.sat}" style="--h:${m.hue}"></div>
    <div class="field"><label for="lmName">Name it</label><input id="lmName" maxlength="20" value="${esc(m.name)}" placeholder="e.g. Olive garden"></div>
    <label class="toggle"><input type="checkbox" id="lmGlit" ${m.glitter?'checked':''}> Add gold glitter</label>
    <button class="primary" id="lmSave">Save and use it</button>`;
  const upd=()=>{m.hue=+$('lmHue').value;m.sat=+$('lmSat').value;const {L}=genLook(m.hue,m.sat);const pv=document.querySelector('.lprev');pv.style.background=`linear-gradient(150deg,${L.h1},${L.h2})`;
    const sp=pv.querySelectorAll('.lprevrow span');sp[0].style.background=L.sun;sp[1].style.background=L.vsoft;sp[1].style.color=L.olive;$('lmSat').style.setProperty('--h',m.hue);};
  $('lmHue').oninput=upd;$('lmSat').oninput=upd;$('lmName').oninput=()=>{m.name=$('lmName').value;};$('lmGlit').onchange=()=>{m.glitter=$('lmGlit').checked;};
  $('lmSave').onclick=async()=>{const s2=clone(state.settings);const c={id:'c'+newId(),name:(m.name.trim()||'My theme').slice(0,20),hue:m.hue,sat:m.sat,glitter:m.glitter};
    s2.customLooks=[...(s2.customLooks||[]),c];s2.look=c.id;injectCustom(s2.customLooks);state.settings=s2;applyLook(c.id);
    try{await store.saveSettings(s2);closeSheets();toast(`${c.name} is on`);}catch(e){toast("Couldn't save. Try again.");}};}
/* morning mood */
const MOODS=[
 {id:'happy',label:'Happy',looks:['sky','honey','sunset'],msg:"Love that. Let's keep the sunshine going.",face:'M8 14 q4 4 8 0'},
 {id:'calm',label:'Calm',looks:['ocean','lavender','espresso'],msg:'A soft, calm look for a calm day.',face:'M8 15 h8'},
 {id:'energetic',label:'Energetic',looks:['cherry','sunset','galaxy'],msg:"Let's make today count.",face:'M8 13 q4 6 8 0 z'},
 {id:'cozy',label:'Cozy',looks:['espresso','honey','midnight'],msg:'Blanket, tea, and a cozy look.',face:'M8.5 14.5 q3.5 2.5 7 0'},
 {id:'dreamy',label:'Dreamy',looks:['galaxy','royal','lavender'],msg:'A little magic for a dreamy day.',face:'M9 15 q3 2 6 0'},
 {id:'tired',label:'Tired',looks:['midnight','espresso','lavender'],msg:'Go gentle today. Small steps still count.',face:'M9 15.5 h6'},
 {id:'stressed',label:'Stressed',looks:['lavender','ocean','midnight'],msg:'Breathe. One thing at a time.',face:'M8 16 q2 -2 4 0 q2 2 4 0'},
 {id:'sad',label:'Sad',looks:['honey','sunset','sky'],msg:"Sending you a warm hug. Heavy days pass.",face:'M8 16.5 q4 -4 8 0'}];
function moodLook(md){const fav=state.settings.favLooks||[];const f=md.looks.find(l=>fav.includes(l));return f||md.looks[0];}
function maybeAskMood(){if(state.settings.moodCheck===false)return;let seen=null;try{seen=localStorage.getItem('lb.moodDay')}catch(e){}if(seen===todayStr)return;
  const anyOpen=[...document.querySelectorAll('.sheet')].some(x=>!x.hidden);if(anyOpen)return;
  const h=new Date().getHours();$('moodBody').innerHTML=`<div class="mhead">${catSVG('open',{pose:'peek'})}<div><span class="label" dir="auto">${esc(greetLine(0,0))}</span><h2>How are you feeling today?</h2></div></div>
    <div class="moods">${MOODS.map(m=>`<button class="moodb" data-mood="${m.id}"><svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="var(--sun-soft)" stroke="var(--sun)" stroke-width="1.5"/><circle cx="9" cy="10" r="1.2" fill="var(--ink)"/><circle cx="15" cy="10" r="1.2" fill="var(--ink)"/><path d="${m.face}" stroke="var(--ink)" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg><span>${m.label}</span></button>`).join('')}</div>
    <p class="hint" style="text-align:center">I'll pick a theme to match${(state.settings.favLooks||[]).length?' from your favorites':''}.</p><button class="btn2" data-moodskip>Keep today's theme</button>`;
  openSheet('moodSheet');}
async function chooseMood(id){const md=MOODS.find(m=>m.id===id);if(!md)return;try{localStorage.setItem('lb.moodDay',todayStr)}catch(e){}
  const look=moodLook(md);applyLook(look);const s2=clone(state.settings);s2.look=look;state.settings.look=look;patchDay(todayStr,{mood:id});closeSheets();
  const nm=(allLooks().find(x=>x.id===look)||{}).name||'';toast(`${md.msg} · ${nm}`);if(id==='happy'||id==='energetic')confetti();try{await store.saveSettings(s2);}catch(e){}}

/* ---------- Say it (dictation quick add) ---------- */
function openSay(){state.say={text:'',busy:false,err:'',items:null};renderSay();openSheet('saySheet');setTimeout(()=>{const t=$('sayText');t&&t.focus();},80);}
function renderSay(){const s=state.say;
  const body=s.items?`<span class="label">Here's what I understood</span><div class="sayitems">${s.items.map((it,i)=>`<label class="sayit"><input type="checkbox" data-sayi="${i}" ${it.on!==false?'checked':''}><span class="sic2">${sayIcon(it.type)}</span><span><b>${esc(sayTitle(it))}</b><small>${esc(saySub(it))}</small></span></label>`).join('')}</div>
      <button class="primary" data-sayadd>Add ${s.items.filter(x=>x.on!==false).length} item${s.items.filter(x=>x.on!==false).length===1?'':'s'}</button><button class="btn2" data-sayredo>Change what I said</button>`
    :`<div class="saybox"><textarea id="sayText" rows="4" placeholder="Spent 40 shekels on vegetables, had tuna salad for lunch, 3 glasses of water, weighed 86.2">${esc(s.text)}</textarea>
      <p class="hint"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg> Tap the microphone on your keyboard and just talk. English or Arabic.</p></div>
      ${s.busy?`<div class="outbusy">${catSVG('open',{pose:'sit'})}<p>Understanding…</p></div>`:s.err?`<p class="err">${esc(s.err)}</p>`:''}
      <button class="primary" data-saygo ${s.busy?'disabled':''}>Understand</button>`;
  $('sayBody').innerHTML=body;const t=$('sayText');if(t)t.oninput=()=>{s.text=t.value;};}
const sayIcon=t=>({spend:'₪',food:'🍽',weight:'⚖',water:'💧',habit:'✓',sleep:'☾',wish:'♡'}[t]||'•');
function sayTitle(it){if(it.type==='spend')return `${it.currency==='USD'?'$':'₪'}${it.amount} · ${(CAT[it.category]||CAT.other).name}`;if(it.type==='food')return it.name;if(it.type==='weight')return `${it.kg} kg`;
  if(it.type==='water')return `${it.glasses} glass${it.glasses==1?'':'es'} of water`;if(it.type==='habit'){const h=habits().find(x=>x.id===it.habit);return (h?h.name:it.habit)+(h&&h.kind==='count'&&it.count?` · ${it.count} ${h.unit}`:'');}
  if(it.type==='sleep')return `Slept ${it.bed||'?'} → ${it.wake||'?'}`;if(it.type==='wish')return it.name;return 'Item';}
function saySub(it){if(it.type==='spend')return it.note?`Spend · ${it.note}`:'Spend';if(it.type==='food')return `Food · ${it.meal||'snack'} · ${it.on_plan?'on plan':'off plan'}`;if(it.type==='wish')return `Wishlist${it.price?` · ${it.currency==='USD'?'$':'₪'}${it.price}`:''}`;
  return {weight:"Today's weigh-in",water:'Added to today',habit:'Ticked for today',sleep:'Last night'}[it.type]||'';}
async function runSay(){const s=state.say;if(!s.text.trim()){s.err='Say or type something first.';renderSay();return;}
  if(!sampleFn){s.err='This needs the app open from your Claude account.';renderSay();return;}
  s.busy=true;s.err='';renderSay();
  const prompt=`Turn what the user said into app entries. Today is ${todayStr}, time ${pad(new Date().getHours())}:${pad(new Date().getMinutes())}. The user may write in English or Arabic; amounts are in shekels unless they say dollars.
Spend categories (use the id): ${CATS.filter(c=>!c.saving).map(c=>c.id+'='+c.name).join(', ')}.
Wishlist categories: ${WCATS.map(w=>w[0]).join(', ')}.
Her eating plan: protein (chicken, beef, tuna, fish, beans, eggs), vegetables, low-sugar fruit, Greek yogurt and up to 50 g of nuts are on plan. Sugar, sweets, juice, bread, rice, potatoes, junk food and high-sugar fruit are off plan.
Reply with only JSON: {"items":[ one object per thing, using these shapes:
{"type":"spend","amount":number,"currency":"NIS"|"USD","category":"id","note":"short"}
{"type":"food","name":"short","meal":"breakfast"|"lunch"|"dinner"|"snack","on_plan":true|false}
{"type":"weight","kg":number}
{"type":"water","glasses":number}
{"type":"habit","habit":"one of: ${habits().map(h=>h.id+'='+h.name).join(', ')}","count":number}
{"type":"sleep","bed":"HH:MM","wake":"HH:MM"}
{"type":"wish","name":"short","price":number|null,"currency":"NIS"|"USD","category":"id"} ]}
Only include things the user actually said. What the user said:
"""${s.text.slice(0,2000)}"""`;
  try{const r=await sampleFn.json(prompt,{cache:false,modelTier:'quick'});const ok=['spend','food','weight','water','habit','sleep','wish'];
    s.items=(Array.isArray(r&&r.items)?r.items:[]).filter(it=>it&&ok.includes(it.type)).slice(0,12);s.busy=false;if(!s.items.length){s.items=null;s.err="I couldn't find anything to add. Try saying it a bit differently.";}renderSay();}
  catch(e){s.busy=false;s.err={not_granted:'Allow this page to use Claude to understand what you say.',rate_limited:'Too many requests right now. Try again in a minute.'}[e&&e.code]||"Couldn't understand that. Try again.";renderSay();}}
async function applySay(){const s=state.say;const items=s.items.filter(x=>x.on!==false);let n=0;
  for(const it of items){try{
    if(it.type==='spend'&&+it.amount>0){const usd=it.currency==='USD';const cat=CAT[it.category]&&!CAT[it.category].saving?it.category:'other';const e={id:newId(),amount:Math.round((usd?it.amount*rate():+it.amount)*100)/100,cat,note:String(it.note||'').slice(0,80),date:todayStr,createdAt:Date.now()};if(usd){e.origCur='USD';e.origAmt=+it.amount;}if(cat==='other')e.label=String(it.note||'Other').slice(0,30);await store.addEntry(e);n++;}
    else if(it.type==='food'&&it.name){await store.put('food',{id:newId(),date:todayStr,meal:['breakfast','lunch','dinner','snack'].includes(it.meal)?it.meal:autoMeal(),name:String(it.name).slice(0,40),plan:!!it.on_plan,createdAt:Date.now()});n++;}
    else if(it.type==='weight'&&+it.kg>30&&+it.kg<250){await store.put('weights',{id:'w-'+todayStr,date:todayStr,kg:Math.round(it.kg*10)/10,createdAt:Date.now()});n++;}
    else if(it.type==='water'&&+it.glasses>0){patchDay(todayStr,{water:(+dayDoc(todayStr).water||0)+Math.round(+it.glasses)});n++;}
    else if(it.type==='habit'){const h=habits().find(x=>x.id===it.habit);if(h){if(h.kind==='count')patchDay(todayStr,{[h.id]:(+dayDoc(todayStr)[h.id]||0)+(Math.round(+it.count)||h.step||1)});else patchDay(todayStr,{[h.id]:true});n++;}}
    else if(it.type==='sleep'&&(it.bed||it.wake)){const p={};if(/^\d{1,2}:\d{2}$/.test(it.bed||''))p.bed=it.bed.padStart(5,'0');if(/^\d{1,2}:\d{2}$/.test(it.wake||''))p.wake=it.wake.padStart(5,'0');patchDay(todayStr,p);n++;}
    else if(it.type==='wish'&&it.name){await store.put('wishes',{id:'w'+newId(),cat:WCAT[it.category]?it.category:'other',name:String(it.name).slice(0,40),type:'',color:'',price:+it.price||0,cur:it.currency==='USD'?'USD':'NIS',where:'',added:todayStr,status:'waiting',createdAt:Date.now()});n++;}
  }catch(e){}}
  closeSheets();toast(`Added ${n} item${n===1?'':'s'}`);}

/* ---------- people ---------- */
const RELS=['Husband','Family','Friend','Colleague','Other'];
const DATE_IDEAS=['Movie night with homemade popcorn','Cook his favorite meal together','Tea on the roof or balcony at sunset','Card or board game night','Write each other a letter','Breakfast in bed','Look through old photos together','Try a new recipe from your Kitchen','Stargazing with blankets','Make a dessert together','Coffee and a long talk, phones away','Plan a dream trip together'];
const nextOcc=ds=>{if(!ds)return null;const md=ds.slice(5);let y=today.getFullYear();let n=`${y}-${md}`;if(md==='02-29'&&new Date(y,1,29).getMonth()!==1)n=`${y}-02-28`;if(n<todayStr)n=`${y+1}-${md==='02-29'?'02-28':md}`;return n;};
const prevOcc=ds=>{const n=nextOcc(ds);if(!n)return null;return `${+n.slice(0,4)-1}-${n.slice(5)}`;};
function occasions(p){const o=[];if(p.birthday)o.push({label:'Birthday',date:nextOcc(p.birthday),orig:p.birthday,kind:'bday'});
  (p.dates||[]).forEach(d=>{if(d.date&&d.label)o.push({label:d.label,date:nextOcc(d.date),orig:d.date,kind:'date'});});
  return o.sort((a,b)=>a.date<b.date?-1:1);}
function upcoming(days){const out=[];state.people.forEach(p=>occasions(p).forEach(o=>{const n=diffD(todayStr,o.date);if(n<=days)out.push({p,o,n});}));return out.sort((a,b)=>a.n-b.n);}
function giftFund(p){if(!p.birthday||!(+p.giftBudget>0))return null;const nx=nextOcc(p.birthday),pv=prevOcc(p.birthday);
  const saved=state.entries.filter(e=>e.cat==='savings'&&e.personId===p.id&&e.date>pv&&e.date<=nx).reduce((a,e)=>a+(+e.amount||0),0);
  const left=Math.max(0,p.giftBudget-saved);const months=Math.max(1,Math.ceil(diffD(todayStr,nx)/30.4));
  return {saved,left,budget:+p.giftBudget,perMonth:Math.ceil(left/months),months,next:nx,pct:Math.min(1,saved/p.giftBudget)};}
const ageOn=(p,date)=>{const y=+String(p.birthday||'').slice(0,4);return y>1920&&y<today.getFullYear()?(+date.slice(0,4))-y:null;};
const pAvatar=p=>imgSrc(p)?`<img src="${esc(imgSrc(p))}" alt="">`:`<span>${esc(String(p.name||'?').slice(0,1).toUpperCase())}</span>`;
function inDays(n){return n===0?'Today':n===1?'Tomorrow':`In ${n} days`;}
function renderPeople(){const partner=state.people.find(p=>p.partner);const others=state.people.filter(p=>!p.partner).sort((a,b)=>{const x=occasions(a)[0],y=occasions(b)[0];return (x?x.date:'9')<(y?y.date:'9')?-1:1;});
  const up=upcoming(45);
  $('pUp').innerHTML=`<div class="clhead"><div><span class="label">Coming up</span><div class="dtotal num">${up.length}<small> in the next 45 days</small></div></div><div class="clcat">${catSVG('happy',{pose:'cake'})}</div></div>
    ${up.length?`<div class="uplist">${up.slice(0,6).map(({p,o,n})=>{const gf=o.kind==='bday'?giftFund(p):null;const a=o.kind==='bday'?ageOn(p,o.date):null;
      return `<button class="uprow ${n<=7?'soon':''}" data-person="${esc(p.id)}"><span class="pav">${pAvatar(p)}</span><span class="upt"><b>${esc(p.name)}</b><small>${esc(o.label)}${a?` · turns ${a}`:''} · ${shortD(o.date)}</small>${gf?`<span class="minibar" style="display:block"><span style="width:${gf.pct*100}%;background:var(--sun)"></span></span>`:''}</span><span class="upn num">${inDays(n)}</span></button>`;}).join('')}</div>`
      :'<p class="hint">No birthdays or special days in the next 45 days.</p>'}`;
  /* partner */
  if(!partner)$('pPartner').innerHTML=`<div class="ptop"><div><span class="label">My person</span><h2 class="hello">Add your husband</h2><p class="cyctip">His birthday, your anniversaries, date nights and the little things he loves.</p></div><div class="mcat">${catSVG('happy',{pose:'heart'})}</div></div><button class="cycbtn" data-addpartner>Add my husband</button>`;
  else{const occ=occasions(partner);const nx=occ[0];const mk=curMonth;const dn=state.dates.filter(d=>(d.date||'').slice(0,7)===mk);const idea=state.dateIdea||DATE_IDEAS[(today.getDate()+today.getMonth())%DATE_IDEAS.length];
    const favR=state.recipes.filter(r=>r.forHim);
    $('pPartner').innerHTML=`<div class="ptop"><div><span class="label">My person ♥</span><h2 class="hello">${esc(partner.name)}</h2>
      ${nx?`<div class="pcount num"><b>${diffD(todayStr,nx.date)}</b><span>day${diffD(todayStr,nx.date)===1?'':'s'} until<br>${esc(nx.label.toLowerCase())}</span></div>`:'<p class="cyctip">Add his birthday and your anniversary.</p>'}</div><div class="mcat">${catSVG('happy',{pose:'heart'})}</div></div>
      <div class="dnbox"><div class="dnhead"><span class="label">Date night · ${MONTHS[today.getMonth()]}</span>${dn.length?`<span class="pill good">Done ${dn.length}×</span>`:'<span class="pill flat">Not yet</span>'}</div>
        <p class="dnidea">${esc(idea)}</p><div class="two"><button class="btn2 light" data-newidea>Another idea</button><button class="pay" data-logdate>We did it</button></div></div>
      ${(partner.favs||[]).length?`<span class="label">His favorites</span><div class="pchips">${partner.favs.map(f=>`<span>${esc(f)}</span>`).join('')}</div>`:''}
      ${(partner.wants||[]).length?`<span class="label">Little things he mentioned</span><div class="pchips">${partner.wants.map(f=>`<button data-wantwish="${esc(f)}">${esc(f)} <i>+ wish</i></button>`).join('')}</div>`:''}
      ${favR.length?`<span class="label">His favorite meals</span><div class="pchips">${favR.map(r=>`<button data-rv="${esc(r.id)}">${esc(r.title)}</button>`).join('')}</div>`:''}
      <button class="link light" data-person="${esc(partner.id)}">Open his card</button>`;}
  /* memory jar */
  const mem=[...state.dates].sort((a,b)=>a.date<b.date?1:-1);
  $('pMem').hidden=!partner;
  if(partner)$('pMem').innerHTML=`<div class="cardhead"><h2>Memory jar</h2><span class="label num">${mem.length}</span></div>${mem.length?`<div class="memgrid">${mem.slice(0,state.memAll?999:6).map(d=>`<button class="mem" data-mem="${esc(d.id)}">${imgSrc(d)?`<img src="${esc(imgSrc(d))}" alt="">`:`<span class="memi">♥</span>`}<b>${esc(d.idea||'Date night')}</b><small>${shortD(d.date)}${d.note?' · '+esc(d.note):''}</small></button>`).join('')}</div>${mem.length>6?`<button class="link" data-memall style="margin-top:10px">${state.memAll?'Show less':'See all '+mem.length}</button>`:''}`:'<p class="hint">After each date night, tap <b>We did it</b> and add a photo and one line. They collect here.</p>'}`;
  /* list */
  $('pList').innerHTML=`<div class="cardhead"><h2>People</h2><span class="label num">${others.length}</span></div>
    ${others.length?others.map(p=>{const o=occasions(p)[0];const gf=giftFund(p);const n=o?diffD(todayStr,o.date):null;
      return `<button class="prow2" data-person="${esc(p.id)}"><span class="pav">${pAvatar(p)}</span><span class="upt"><b>${esc(p.name)}</b><small>${esc(p.rel||'')}${o?` · ${esc(o.label)} ${shortD(o.date)}`:''}</small>${gf?`<span class="minibar" style="display:block"><span style="width:${gf.pct*100}%;background:var(--sun)"></span></span>`:''}</span>${n!=null?`<span class="upn num ${n<=7?'soon':''}">${inDays(n)}</span>`:''}</button>`;}).join('')
      :'<p class="hint">Add family and friends with their birthdays so gifts never catch you off guard.</p>'}`;}
/* person sheet: view */
function openPerson(id){state.openPerson=id;state.pedit=null;state.pConfirm=false;renderPersonSheet();openSheet('personSheet');}
function renderPersonSheet(){if(state.pedit){renderPersonForm();return;}const p=state.people.find(x=>x.id===state.openPerson);if(!p){closeSheets();return;}
  const occ=occasions(p);const gf=giftFund(p);
  $('personTitle').textContent=p.name;
  $('personBody').innerHTML=`<div class="phead"><span class="pav big">${pAvatar(p)}</span><div><b>${esc(p.name)}</b><small>${esc(p.rel||'')}</small></div></div>
    ${occ.length?`<div class="occlist">${occ.map(o=>{const n=diffD(todayStr,o.date);const a=o.kind==='bday'?ageOn(p,o.date):null;return `<div class="occ"><span>${esc(o.label)}${a?` · turns ${a}`:''}</span><b class="num">${shortD(o.date)} · ${inDays(n)}</b></div>`;}).join('')}</div>`:''}
    ${gf?`<div class="gfund"><div class="dnhead"><span class="label">Gift fund</span><span class="num"><b>${fmt(gf.saved)}</b> of ${fmt(gf.budget)}</span></div><div class="dbar"><span style="width:${gf.pct*100}%"></span></div>
      <p class="hint num">${gf.left>0?`Set aside about ${fmt(gf.perMonth)} a month to be ready by ${shortD(gf.next)}.`:'Ready for the gift.'}</p>${gf.left>0?`<button class="pay" data-giftsave="${esc(p.id)}" data-amt="${gf.perMonth}">Set aside ${fmt(Math.min(gf.perMonth,gf.left))}</button>`:''}</div>`:''}
    ${p.notes?`<div class="pnotes"><span class="label">Remember</span><p>${esc(p.notes)}</p></div>`:''}
    ${(p.favs||[]).length?`<span class="label">Favorites</span><div class="pchips dark">${p.favs.map(f=>`<span>${esc(f)}</span>`).join('')}</div>`:''}
    ${(p.wants||[]).length?`<span class="label">Gift ideas</span><div class="pchips dark">${p.wants.map(f=>`<button data-wantwish="${esc(f)}">${esc(f)} <i>+ wish</i></button>`).join('')}</div>`:''}
    <div class="giftlog"><span class="label">Gifts given</span>${(p.gifts||[]).length?p.gifts.map((g,gi)=>({g,gi})).reverse().map(({g,gi})=>`<div class="occ"><span>${esc(g.name)}</span><span class="wl2"><b class="num">${g.price?fmt(g.price)+' · ':''}${shortD(g.date)}</b><button class="xbtn" data-giftdel="${esc(p.id)}:${gi}" aria-label="Delete ${esc(g.name)}">${XSVG}</button></span></div>`).join(''):'<p class="hint">None logged yet.</p>'}
      <div class="giftadd"><input id="gName" maxlength="40" placeholder="What did you give?"><input id="gPrice" inputmode="decimal" placeholder="₪"><button class="btn2" data-giftlog="${esc(p.id)}">Log</button></div></div>
    <div class="two"><button class="btn2" data-pedit>Edit</button>${state.pConfirm?`<button class="del" data-pdel>Yes, delete</button>`:`<button class="btn2" data-pask>Delete</button>`}</div>`;}
/* person sheet: form */
function blankPerson(partner){return {name:partner?'':'',rel:partner?'Husband':'Family',partner:!!partner,birthday:'',dates:partner?[{label:'Wedding anniversary',date:''},{label:'Engagement anniversary',date:''}]:[],notes:'',favs:'',wants:'',giftBudget:'',photo:null,thumb:null};}
function editPerson(p){state.pedit=p?{...JSON.parse(JSON.stringify(p)),favs:(p.favs||[]).join('\n'),wants:(p.wants||[]).join('\n'),giftBudget:p.giftBudget||''}:blankPerson(false);renderPersonForm();}
function renderPersonForm(){const d=state.pedit;const isP=d.partner||d.rel==='Husband';
  $('personTitle').textContent=d.id?'Edit '+(d.name||'person'):isP?'My husband':'Add a person';
  $('personBody').innerHTML=`<div class="photorow">${imgSrc(d)?`<img src="${esc(imgSrc(d))}" alt="">`:''}<label class="btn2" for="peFile">${imgSrc(d)?'Change photo':'Add a photo (optional)'}</label><input type="file" id="peFile" accept="image/*" hidden></div>
    <div class="field"><label for="peName">Name</label><input id="peName" data-pf="name" maxlength="30" value="${esc(d.name)}"></div>
    <span class="label">Relationship</span><div class="chips">${RELS.map(r=>`<button class="fchip ${d.rel===r?'sel':''}" data-prel="${r}" aria-pressed="${d.rel===r}">${r}</button>`).join('')}</div>
    <div class="field"><label for="peBday">Birthday</label><input type="date" id="peBday" data-pf="birthday" value="${esc(d.birthday||'')}"></div>
    <span class="label">Other special days</span>
    ${(d.dates||[]).map((x,i)=>`<div class="billrow"><input data-di="${i}" data-df="label" maxlength="30" value="${esc(x.label)}" placeholder="e.g. Anniversary"><button data-drm="${i}" aria-label="Remove">×</button><input type="date" data-di="${i}" data-df="date" value="${esc(x.date||'')}" style="grid-column:1/-1"></div>`).join('')}
    <button class="btn2" data-dadd>+ Add a special day</button>
    <div class="field"><label for="peNotes">Things to remember</label><textarea id="peNotes" data-pf="notes" rows="3" placeholder="Sizes, allergies, what they love">${esc(d.notes||'')}</textarea></div>
    <div class="field"><label for="peFavs">${isP?'His favorites':'Favorites'} · one per line</label><textarea id="peFavs" data-pf="favs" rows="3" placeholder="Dark chocolate&#10;Mansaf">${esc(d.favs||'')}</textarea></div>
    <div class="field"><label for="peWants">${isP?'Little things he mentioned':'Gift ideas'} · one per line</label><textarea id="peWants" data-pf="wants" rows="3">${esc(d.wants||'')}</textarea></div>
    <div class="field"><label for="peBudget">Birthday gift budget (₪)</label><input id="peBudget" data-pf="giftBudget" inputmode="decimal" value="${esc(d.giftBudget)}" placeholder="Optional"></div>
    <button class="primary" id="peSave">Save</button>`;
  $('peFile').onchange=async()=>{const f=$('peFile').files&&$('peFile').files[0];$('peFile').value='';if(!f)return;
    try{const {im,u}=await loadImg(f);const c=drawTo(im,700);if(assetsNS){const up=await assetsNS.upload(await toBlobP(c,'image/jpeg',0.84),{type:'image/jpeg'});d.photo=up.id;}else d.thumb=drawTo(im,240).toDataURL('image/jpeg',0.72);URL.revokeObjectURL(u);renderPersonForm();}catch(e){toast("Couldn't add that photo.");}};
  $('peSave').onclick=savePerson;}
$('personBody').addEventListener('input',e=>{const t=e.target,d=state.pedit;if(!d)return;if(t.dataset.pf)d[t.dataset.pf]=t.value;else if(t.dataset.di!=null)d.dates[+t.dataset.di][t.dataset.df]=t.value;});
async function savePerson(){const d=state.pedit;if(!String(d.name||'').trim()){toast('Add a name first.');return;}
  const lines=v=>String(v||'').split('\n').map(x=>x.trim()).filter(Boolean).slice(0,20);const old=d.id?state.people.find(x=>x.id===d.id):null;
  const p={id:d.id||'pp'+newId(),name:d.name.trim().slice(0,30),rel:d.rel,partner:d.rel==='Husband',birthday:d.birthday||'',dates:(d.dates||[]).filter(x=>x.label&&x.date).map(x=>({label:String(x.label).slice(0,30),date:x.date})),
    notes:String(d.notes||'').slice(0,500),favs:lines(d.favs),wants:lines(d.wants),giftBudget:parseNum(d.giftBudget)||0,gifts:old?old.gifts||[]:[],createdAt:old?old.createdAt:Date.now()};
  if(d.photo)p.photo=d.photo;if(d.thumb)p.thumb=d.thumb;
  if(p.partner)state.people.filter(x=>x.partner&&x.id!==p.id).forEach(x=>store.put('people',{...x,partner:false}).catch(()=>{}));
  try{await store.put('people',p);state.openPerson=p.id;state.pedit=null;renderPersonSheet();toast(old?'Saved':'Added');}catch(e){toast("Couldn't save. Try again.");}}
/* date night log */
function openMemory(id){const m=state.dates.find(x=>x.id===id);if(!m)return;state.dlog={...m,confirm:false};$('dateTitle').textContent='Memory ♥';renderDateLog();openSheet('dateSheet');}
function openDateLog(){$('dateTitle').textContent='Date night ♥';state.dlog={date:todayStr,idea:state.dateIdea||DATE_IDEAS[(today.getDate()+today.getMonth())%DATE_IDEAS.length],note:'',photo:null,thumb:null};renderDateLog();openSheet('dateSheet');}
function renderDateLog(){const d=state.dlog;
  $('dateBody').innerHTML=`<div class="field"><label for="dlIdea">What did you do?</label><input id="dlIdea" maxlength="50" value="${esc(d.idea)}"></div>
    <div class="field"><label for="dlDate">When</label><input type="date" id="dlDate" value="${esc(d.date)}" max="${todayStr}"></div>
    <div class="field"><label for="dlNote">One line to remember it by</label><input id="dlNote" maxlength="80" value="${esc(d.note)}" placeholder="He laughed so hard at…"></div>
    <div class="photorow">${imgSrc(d)?`<img src="${esc(imgSrc(d))}" alt="">`:''}<label class="btn2" for="dlFile">${imgSrc(d)?'Change photo':'Add a photo'}</label><input type="file" id="dlFile" accept="image/*" hidden></div>
    <button class="primary" id="dlSave">${d.id?'Save changes':'Save to memory jar'}</button>${d.id?(d.confirm?`<button class="del" data-memdel>Yes, delete this memory</button>`:`<button class="btn2" data-memask>Delete memory</button>`):''}`;
  ['dlIdea','dlDate','dlNote'].forEach(id=>$(id).oninput=()=>{d[{dlIdea:'idea',dlDate:'date',dlNote:'note'}[id]]=$(id).value;});
  $('dlFile').onchange=async()=>{const f=$('dlFile').files&&$('dlFile').files[0];$('dlFile').value='';if(!f)return;
    try{const {im,u}=await loadImg(f);const c=drawTo(im,1000);if(assetsNS){const up=await assetsNS.upload(await toBlobP(c,'image/jpeg',0.84),{type:'image/jpeg'});d.photo=up.id;}else d.thumb=drawTo(im,300).toDataURL('image/jpeg',0.72);URL.revokeObjectURL(u);renderDateLog();}catch(e){toast("Couldn't add that photo.");}};
  $('dlSave').onclick=async()=>{const doc={id:d.id||'dn'+newId(),date:d.date||todayStr,idea:String(d.idea||'Date night').slice(0,50),note:String(d.note||'').slice(0,80),createdAt:d.createdAt||Date.now()};if(d.photo)doc.photo=d.photo;if(d.thumb)doc.thumb=d.thumb;
    try{await store.put('dates',doc);closeSheets();if(!d.id)confetti();toast(d.id?'Memory saved':'Saved to your memory jar ♥');}catch(e){toast("Couldn't save. Try again.");}};}
function peopleAlerts(){return upcoming(7).filter(x=>x.o.kind==='bday'||/anniv/i.test(x.o.label));}

/* ---------- cycle ---------- */
const SYMS=['Cramps','Headache','Bloating','Back pain','Cravings','Low mood','Irritable','Tired','Acne','Tender breasts'];
const FLOWS=[['spot','Spotting'],['light','Light'],['medium','Medium'],['heavy','Heavy']];
const addD=(ds,n)=>{const d=parseD(ds);d.setDate(d.getDate()+n);return ymd(d);};
const diffD=(a,b)=>Math.round((parseD(b)-parseD(a))/864e5);
function periods(){return [...state.cycle].filter(p=>p.start).sort((a,b)=>a.start<b.start?-1:1);}
function cycleStats(){const ps=periods();const lens=[];for(let i=1;i<ps.length;i++){const l=diffD(ps[i-1].start,ps[i].start);if(l>=15&&l<=60)lens.push(l);}
  const rec=lens.slice(-6);const avgLen=rec.length?Math.round(rec.reduce((a,b)=>a+b,0)/rec.length):28;
  const pl=ps.filter(p=>p.end).map(p=>diffD(p.start,p.end)+1).filter(x=>x>=1&&x<=12).slice(-6);const avgP=pl.length?Math.round(pl.reduce((a,b)=>a+b,0)/pl.length):5;
  const last=ps[ps.length-1]||null;
  const endOf=p=>p.end||(diffD(p.start,todayStr)<=9?(diffD(p.start,todayStr)>=0?todayStr:p.start):addD(p.start,avgP-1));
  const ongoing=!!(last&&!last.end&&diffD(last.start,todayStr)>=0&&diffD(last.start,todayStr)<=9);
  let next=last?addD(last.start,avgLen):null;const late=next&&next<todayStr&&!ongoing?diffD(next,todayStr):0;
  const preds=[];if(next){let s=next<todayStr?todayStr:next;if(ongoing)s=addD(last.start,avgLen);for(let k=0;k<3;k++){const st=addD(s,k*avgLen);const ov=addD(st,-14);preds.push({start:st,end:addD(st,avgP-1),ov,fs:addD(ov,-5),fe:addD(ov,1)});}}
  const day=last?diffD(last.start,todayStr)+1:null;
  return {ps,lens,rec,avgLen,avgP,known:rec.length>0,last,ongoing,next:preds[0]?preds[0].start:null,late,preds,day,endOf,var:rec.length>1?[Math.min(...rec),Math.max(...rec)]:null};}
function dayInfo(ds,cs){for(const p of cs.ps){if(ds>=p.start&&ds<=cs.endOf(p))return 'period';}
  const lastP=cs.ps[cs.ps.length-1];
  /* current cycle's ovulation (estimate) */
  if(lastP){const ov=addD(lastP.start,cs.avgLen-14);if(ds===ov&&ds>lastP.start)return 'ov';if(ds>=addD(ov,-5)&&ds<=addD(ov,1)&&ds>cs.endOf(lastP))return 'fertile';}
  for(const pr of cs.preds){if(ds>=pr.start&&ds<=pr.end)return 'pred';if(ds===pr.ov)return 'ov';if(ds>=pr.fs&&ds<=pr.fe)return 'fertile';}
  return '';}
function phaseOf(cs){if(!cs.last)return null;if(cs.ongoing)return {name:'Period',tip:'Rest, warm drinks, and be gentle with yourself.'};
  const t=dayInfo(todayStr,cs);if(t==='ov')return {name:'Ovulation day (estimate)',tip:'Energy is often at its highest around now.'};
  if(t==='fertile')return {name:'Fertile window (estimate)',tip:'Your most fertile days, based on your average cycle.'};
  const ov=addD(cs.last.start,cs.avgLen-14);
  if(todayStr<ov)return {name:'Follicular phase',tip:'Energy usually rises this week. A good time for jump rope.'};
  return {name:'Luteal phase',tip:'Cravings often rise before a period. Keep on-plan snacks close.'};}
function cycleChip(){const cs=cycleStats();if(!cs.last)return '';if(cs.ongoing)return `Period · day ${cs.day}`;
  if(cs.late)return `Period ${cs.late} day${cs.late>1?'s':''} late`;const n=diffD(todayStr,cs.next);return n>=0&&n<=3?(n===0?'Period expected today':`Period in ${n} day${n>1?'s':''}`):'';}
function renderCycle(){const cs=cycleStats();const ph=phaseOf(cs);const dd=dayDoc(todayStr);
  let main='';
  if(!cs.last)main=`<span class="label">Your cycle</span><h2 class="hello" style="font-size:24px;margin-top:4px">Start tracking</h2><p class="cyctip">Log the first day of your next period, or add past periods in the calendar below. Predictions get better with every cycle.</p>`;
  else{const n=cs.next?diffD(todayStr,cs.next):null;const fw=cs.preds.find(x=>x.fe>=todayStr);
    main=`<span class="label">${esc(ph?ph.name:'')}</span><div class="cycday num">Day ${cs.day}<small> of your cycle</small></div>
      <p class="cyctip">${esc(ph?ph.tip:'')}</p>
      <div class="cycrow num"><span>${cs.ongoing?`Period<br><b>Day ${cs.day}</b>`:cs.late?`Period is<br><b>${cs.late} day${cs.late>1?'s':''} late</b>`:`Next period<br><b>${n===0?'Today':'In '+n+' day'+(n===1?'':'s')}${cs.preds[0]?' · '+shortD(cs.preds[0].start):''}</b>`}</span>
        <span style="text-align:right">${fw?`Next fertile window<br><b>${shortD(fw.fs)} – ${shortD(fw.fe)}</b>`:''}</span></div>`;}
  const btn=cs.ongoing?`<button class="cycbtn" data-pend="${todayStr}">My period ended today</button>`:`<button class="cycbtn" data-pstart="${todayStr}">My period started today</button>`;
  $('cHero').innerHTML=`<div class="mtop"><div class="mleft" style="min-width:0">${main}</div><div class="mcat">${catSVG(cs.ongoing?'sleepy':'happy',{pose:'cozy'})}</div></div>${btn}
    <p class="cycnote">${cs.known?`Based on your last ${cs.rec.length} cycle${cs.rec.length>1?'s':''}.`:'Uses a 28-day estimate until you log two periods.'} Estimates only; not reliable for preventing pregnancy.</p>`;
  /* calendar */
  const cm=state.cmonth||todayStr.slice(0,7);const [Y,M]=cm.split('-').map(Number);const first=new Date(Y,M-1,1);const dim=new Date(Y,M,0).getDate();const lead=(first.getDay()+1)%7;
  const sel=state.cday||todayStr;let cells='';for(let i=0;i<lead;i++)cells+='<span></span>';
  for(let d=1;d<=dim;d++){const ds=`${Y}-${pad(M)}-${pad(d)}`;const t=dayInfo(ds,cs);const dk=dayDoc(ds);
    cells+=`<button class="cd ${t} ${ds===todayStr?'today':''} ${ds===sel?'sel':''}" data-cday="${ds}" aria-label="${ds}${t?' '+t:''}"><span>${d}</span>${dk.sym&&dk.sym.length?'<i class="symdot"></i>':''}</button>`;}
  $('cCal').innerHTML=`<div class="cardhead"><h2>${MONTHS[M-1]} ${Y}</h2><div class="monthnav"><button data-cmon="-1" aria-label="Previous month">‹</button><button data-cmon="1" aria-label="Next month">›</button></div></div>
    <div class="calgrid">${WEEK.map(w=>`<span class="cw">${w.slice(0,1)}</span>`).join('')}${cells}</div>
    <div class="legendline" style="margin-top:10px"><span><i style="background:var(--period)"></i>Period</span><span><i style="border:1.5px dashed var(--period)"></i>Expected</span><span><i style="background:var(--sun-soft);border:1px solid var(--sun)"></i>Fertile</span><span><i style="background:var(--sun)"></i>Ovulation</span></div>`;
  /* day log */
  const sd=dayDoc(sel);const inP=dayInfo(sel,cs)==='period';const pOf=cs.ps.find(p=>sel>=p.start&&sel<=cs.endOf(p));
  $('cLog').innerHTML=`<div class="cardhead"><h2>${dayLabel(sel)}</h2>${inP?'<span class="pill bad">Period</span>':''}</div>
    <div class="two">${pOf&&pOf.start===sel?`<button class="btn2" data-pdelstart="${esc(pOf.id)}">Remove this period</button>`:`<button class="btn2" data-pstart="${sel}" ${sel>todayStr?'disabled':''}>Period started</button>`}<button class="btn2" data-pend="${sel}" ${(!cs.ps.some(p=>p.start<=sel)||sel>todayStr)?'disabled':''}>Period ended</button></div>
    <span class="label">Flow</span><div class="chips">${FLOWS.map(([v,t])=>`<button class="fchip ${sd.flow===v?'sel':''}" data-flow="${v}" aria-pressed="${sd.flow===v}">${t}</button>`).join('')}</div>
    <span class="label">How you feel</span><div class="chips">${SYMS.map(x=>`<button class="fchip ${(sd.sym||[]).includes(x)?'sel':''}" data-sym="${esc(x)}" aria-pressed="${(sd.sym||[]).includes(x)}">${x}</button>`).join('')}</div>`;
  /* history + insights */
  const rows=[...cs.ps].reverse().slice(0,8).map((p,i,arr)=>{const nextP=cs.ps[cs.ps.indexOf(p)+1];const len=nextP?diffD(p.start,nextP.start):null;const pl=diffD(p.start,cs.endOf(p))+1;
    return `<div class="cyhist"><span><b>${shortD(p.start)}</b> ${p.start.slice(0,4)!==todayStr.slice(0,4)?p.start.slice(0,4):''}</span><span class="num">${pl} day period${p.end?'':' (est.)'}</span><span class="num">${len?len+'-day cycle':'current'}</span></div>`;}).join('');
  let ins='';
  if(cs.ps.length&&state.food.length){let pre=0,preDays=0;cs.ps.forEach(p=>{for(let k=1;k<=7;k++){const ds=addD(p.start,-k);if(state.food.some(f=>f.date===ds)){preDays++;pre+=state.food.filter(f=>f.date===ds&&!f.plan).length;}}});
    const preSet=new Set();cs.ps.forEach(p=>{for(let k=1;k<=7;k++)preSet.add(addD(p.start,-k));});const other=[...new Set(state.food.map(f=>f.date))].filter(d=>!preSet.has(d));
    const oth=other.reduce((a,ds)=>a+state.food.filter(f=>f.date===ds&&!f.plan).length,0);
    if(preDays>=3&&other.length>=3){const a=pre/preDays,b=oth/other.length;ins=`<li><span class="ic">!</span><p>In the week before your period you log <b>${a.toFixed(1)}</b> off-plan items a day, vs <b>${b.toFixed(1)}</b> on other days.${a>b*1.3?' Plan comforting on-plan snacks for those days.':''}</p></li>`;}}
  $('cHist').innerHTML=`<div class="cardhead"><h2>Your cycles</h2><span class="label num">${cs.ps.length} logged</span></div>
    ${cs.ps.length?`<div class="bmi" style="margin-bottom:12px"><div><small>Average cycle</small><b class="num">${cs.known?cs.avgLen+' days':'—'}</b></div><div><small>Average period</small><b class="num">${cs.avgP} days</b></div>${cs.var?`<div><small>Range</small><b class="num">${cs.var[0]}–${cs.var[1]} days</b></div>`:''}</div>
      ${ins?`<ul class="insights" style="margin-bottom:12px">${ins}</ul>`:''}<div class="cyhists">${rows}</div>`:'<p class="empty">Your cycle history will appear here.</p>'}
    <p class="hint" style="margin-top:10px">Cycles that change a lot from month to month, or very painful periods, are worth mentioning to a doctor.</p>`;}
async function startPeriod(ds){const cs=cycleStats();if(cs.ps.some(p=>ds>=p.start&&ds<=cs.endOf(p)&&p.end)){toast('That day is already in a logged period.');return;}
  const near=cs.ps.find(p=>!p.end&&diffD(p.start,ds)>=0&&diffD(p.start,ds)<=9);if(near&&near.start!==ds){toast('A period is already open. Mark when it ended first.');return;}
  const doc={id:'cy'+newId(),start:ds,end:null,createdAt:Date.now()};try{await store.put('cycle',doc);if(!dayDoc(ds).flow)patchDay(ds,{flow:'medium'});toast('Period logged. Take care of yourself.');}catch(e){toast("Couldn't save. Try again.");}}
async function endPeriod(ds){const p=[...periods()].reverse().find(x=>x.start<=ds);if(!p){toast('Log the start day first.');return;}if(diffD(p.start,ds)>14){toast('That end day is far from the start. Check the dates.');return;}
  try{await store.put('cycle',{...p,end:ds});toast(`Period marked as ${diffD(p.start,ds)+1} days.`);}catch(e){toast("Couldn't save. Try again.");}}

/* ---------- kitchen: products ---------- */
const PROD_PROMPT='The photo shows a food or kitchen product package. Read only what is printed. Reply with only this JSON object: {"name": the generic product name in English in 1-4 words, like "Baking powder" or "Cooking cream", "brand": the brand name as printed or null, "size": the net weight or volume as printed, like "250 g" or "1 L", or null}.';
const pQ={files:[],total:0,done:0,running:false};
async function runPQ(){if(pQ.running)return;pQ.running=true;render();
  while(pQ.files.length){const f=pQ.files.shift();
    try{const {im,u}=await loadImg(f);const pp=await prepPhoto(im,'products');const big=pp.forAI;
      const p={id:'p'+newId(),name:'New product',brand:'',size:'',notes:'',status:'reading',createdAt:Date.now()};
      await storePhoto(p,pp);
      URL.revokeObjectURL(u);await store.put('products',p);
      let tag=null;if(sampleFn&&canScan){try{tag=await sampleFn.json(PROD_PROMPT,{images:[big],modelTier:'quick'});}catch(e){if(e&&['not_granted','sampling_disabled','images_unavailable'].includes(e.code))canScan=false;}}
      const upd={...p,status:'ready'};if(tag&&typeof tag==='object'){if(tag.name)upd.name=String(tag.name).slice(0,40);if(tag.brand)upd.brand=String(tag.brand).slice(0,30);if(tag.size)upd.size=String(tag.size).slice(0,20);}
      await store.put('products',upd);}
    catch(e){toast(e&&e.code==='quota_or_state'?'Photo storage is full.':"Couldn't add one of the photos.");}
    pQ.done++;render();}
  pQ.running=false;pQ.total=0;pQ.done=0;render();}
const prodById=id=>state.products.find(p=>p.id===id);
const prodLabel=p=>[p.brand,p.size].filter(Boolean).join(' · ');
function renderProducts(){const list=[...state.products].sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  const banner=pQ.running?`<div class="qbar"><span>Adding products · ${pQ.done} of ${pQ.total}</span><div class="minibar"><span style="width:${pQ.total?pQ.done/pQ.total*100:0}%;background:var(--sun)"></span></div></div>`:'';
  $('kProducts').innerHTML=`<div class="cardhead"><h2>My products</h2><span class="label num">${list.length}</span></div>
    <p class="hint" style="margin-bottom:12px">The exact packages you cook with, so recipes always mean <i>your</i> flour and <i>your</i> baking powder.</p>${banner}
    ${list.length?`<div class="grid">${list.map(p=>`<button class="cl" data-prod="${esc(p.id)}"><span class="climg sq">${imgSrc(p)?`<img src="${esc(imgSrc(p))}" alt="${esc(p.name)}" loading="lazy">`:''}${p.status==='reading'?'<span class="reading">Reading…</span>':''}</span><b>${esc(p.name)}</b><small>${esc(prodLabel(p))}</small></button>`).join('')}</div>`
      :`<div class="clempty">${catSVG('happy',{hat:true})}<b>No products yet</b><p>Tap <b>Add product</b> and snap the front of a package. Claude reads the name, brand and size.</p></div>`}`;}
function openProduct(id){state.openProd=id;state.prodConfirm=false;state.bgEdit=null;renderProduct();openSheet('productSheet');}
function renderProduct(){const p=prodById(state.openProd);if(!p)return;const used=state.recipes.filter(r=>(r.ingredients||[]).some(i=>i.product_id===p.id));
  $('productBody').innerHTML=`<div class="itimg">${imgSrc(p)?`<img src="${esc(imgSrc(p))}" alt="${esc(p.name)}">`:''}</div>${bgCtlHtml('products',p)}
    <div class="field"><label for="pdName">Name</label><input id="pdName" maxlength="40" value="${esc(p.name||'')}"></div>
    <div class="two"><div class="field"><label for="pdBrand">Brand</label><input id="pdBrand" maxlength="30" value="${esc(p.brand||'')}"></div>
    <div class="field"><label for="pdSize">Package size</label><input id="pdSize" maxlength="20" value="${esc(p.size||'')}" placeholder="e.g. 250 g"></div></div>
    <div class="field"><label for="pdNotes">Notes</label><input id="pdNotes" maxlength="80" value="${esc(p.notes||'')}" placeholder="e.g. 1 sachet = 10 g"></div>
    ${used.length?`<p class="hint">Used in: ${used.map(r=>esc(r.title)).join(', ')}</p>`:''}
    ${state.prodConfirm?`<p class="hint">Delete this product? Recipes keep the ingredient name.</p><div class="two"><button class="btn2" data-pdcancel>Keep it</button><button class="del" data-pddel>Delete</button></div>`:`<button class="del" data-pdask style="width:100%">Delete product</button>`}`;
  const save=async()=>{const cur=prodById(p.id);if(!cur)return;try{await store.put('products',{...cur,name:$('pdName').value.trim().slice(0,40)||'Product',brand:$('pdBrand').value.trim().slice(0,30),size:$('pdSize').value.trim().slice(0,20),notes:$('pdNotes').value.trim().slice(0,80)});}catch(e){toast("Couldn't save. Check your connection.");}};
  ['pdName','pdBrand','pdSize','pdNotes'].forEach(id=>$(id).onchange=save);wireBg('products');if(state.bgEdit&&state.bgEdit.id===p.id&&!state.bgEdit.busy)bgPreview('products');}

/* ---------- kitchen: recipes ---------- */
const FRAC=[[0.25,'¼'],[0.5,'½'],[0.75,'¾'],[1/3,'⅓'],[2/3,'⅔']];
function fmtAmt(a){if(a==null||a==='')return '';const n=+a;if(!isFinite(n))return String(a);const w=Math.floor(n),r=n-w;
  for(const [v,s] of FRAC)if(Math.abs(r-v)<0.04)return (w?w:'')+s;return String(Math.round(n*100)/100);}
function renderRecipes(){const n=state.recipes.length;
  $('kRecipes').innerHTML=`<div class="cardhead"><h2>Recipe book</h2><span class="label num">${n}</span></div>
    ${n>5?`<input id="rSearch" class="search" placeholder="Search recipes" value="${esc(state.rq||'')}" aria-label="Search recipes">`:''}
    <div id="rGrid"></div>`;
  fillRecipeGrid();const s=$('rSearch');if(s)s.oninput=()=>{state.rq=s.value;fillRecipeGrid();};}
function fillRecipeGrid(){const q=(state.rq||'').toLowerCase();const list=[...state.recipes].filter(r=>!q||String(r.title).toLowerCase().includes(q)).sort((a,b)=>(b.made||0)-(a.made||0)||String(a.title).localeCompare(String(b.title)));
  $('rGrid').innerHTML=!state.recipes.length?`<div class="clempty">${catSVG('happy',{hat:true})}<b>Your recipe book is empty</b><p>Tap <b>Add recipe</b>, paste one you found online or snap a photo, and it's saved with your own products.</p></div>`
    :list.length?`<div class="rgrid">${list.map(r=>`<button class="rcard" data-rv="${esc(r.id)}"><span class="rimg">${r.photo?`<img src="/_blob/${esc(r.photo)}" alt="" loading="lazy">`:`<span class="rinit">${esc(String(r.title||'?').slice(0,1).toUpperCase())}</span>`}
      ${r.plan==='on'?'<i class="rtag on">On plan</i>':r.plan==='treat'?'<i class="rtag treat">Treat</i>':''}</span>
      <b>${esc(r.title)}</b><small class="num">${[r.servings?r.servings+' servings':'',r.time||'',r.made?`made ${r.made}×`:''].filter(Boolean).join(' · ')}</small></button>`).join('')}</div>`:'<p class="empty">No recipe matches that search.</p>';}
/* view */
let wakeLock=null;
async function keepAwake(){try{if(navigator.wakeLock)wakeLock=await navigator.wakeLock.request('screen');}catch(e){wakeLock=null;}}
function releaseAwake(){try{wakeLock&&wakeLock.release();}catch(e){}wakeLock=null;}
function openRecipe(id){state.rview=id;state.rscale=1;state.rticks={i:{},s:{}};state.rConfirm=false;renderRView();openSheet('recipeSheet');keepAwake();}
function renderRView(){const r=state.recipes.find(x=>x.id===state.rview);if(!r)return;const f=state.rscale||1;const T=state.rticks||{i:{},s:{}};
  const ing=(r.ingredients||[]).map((it,i)=>{const p=it.product_id?prodById(it.product_id):null;const amt=fmtAmt(it.amount!=null&&it.amount!==''?(+it.amount)*f:null);
    return `<button class="ing ${T.i[i]?'ticked':''}" data-itick="${i}"><span class="box">${T.i[i]?TICK:''}</span><span class="ingt"><b class="num">${esc([amt,it.unit].filter(Boolean).join(' '))}</b> ${esc(it.name||'')}
      ${p?`<span class="pchip">${imgSrc(p)?`<img src="${esc(imgSrc(p))}" alt="">`:''}${esc([p.brand||p.name,p.size].filter(Boolean).join(' · '))}</span>`:''}</span></button>`;}).join('');
  const steps=(r.steps||[]).map((s,i)=>`<button class="step ${T.s[i]?'ticked':''}" data-stick="${i}"><span class="snum">${T.s[i]?TICK:i+1}</span><span>${esc(s)}</span></button>`).join('');
  const sc=[0.5,1,2,3];
  $('recipeBody').innerHTML=`${r.photo?`<div class="itimg"><img src="/_blob/${esc(r.photo)}" alt=""></div>`:''}
    <div><h2 class="rtitle">${esc(r.title)}</h2><p class="hint num">${[r.servings?(r.servings*f)+' servings':'',r.time||'',r.plan==='on'?'On plan':r.plan==='treat'?'Treat':''].filter(Boolean).join(' · ')}</p></div>
    <div class="seg" style="grid-template-columns:repeat(4,minmax(0,1fr))">${sc.map(x=>`<button data-rscale="${x}" aria-pressed="${f===x}">${x===0.5?'½×':x+'×'}</button>`).join('')}</div>
    <span class="label">Ingredients · tap as you add them</span><div class="ings">${ing||'<p class="hint">No ingredients saved.</p>'}</div>
    <span class="label">Steps</span><div class="steps">${steps||'<p class="hint">No steps saved.</p>'}</div>
    ${(r.tips||[]).length?`<div class="tips"><b>Watch out</b><ul>${r.tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>`:''}
    <button class="primary" data-rmade>I made this${r.made?` · ${r.made}× so far`:''}</button>
    <div class="two"><button class="btn2" data-redit>Edit</button>${state.rConfirm?`<button class="del" data-rdel>Yes, delete</button>`:`<button class="btn2" data-rask>Delete</button>`}</div>`;}
/* import */
function openImport(){state.impBusy=false;state.impErr='';$('impText').value='';renderImport();openSheet('importSheet');}
function renderImport(){$('impStatus').innerHTML=state.impBusy?`<div class="outbusy">${catSVG('neutral',{hat:true})}<p>Reading the recipe and matching it to your products…</p></div>`:state.impErr?`<p class="err">${esc(state.impErr)}</p>`:'';
  $('impGo').disabled=state.impBusy;$('impPhotoL').hidden=!canScan;}
function importPrompt(text){const prods=state.products.map(p=>`${p.id} | ${p.name} | ${p.brand||''} | ${p.size||''}`).join('\n')||'(none)';
  return `Turn this recipe into structured data. ${text?'Recipe text:\n"""\n'+text.slice(0,12000)+'\n"""':'The recipe is in the attached photo.'}\n\nThe cook's own products (id | name | brand | size):\n${prods}\n\nMatch each ingredient to one of the cook's products when it is clearly the same thing (for example "baking powder" to their baking powder), otherwise use null. Keep amounts and units exactly as in the recipe; use null when there is no amount. Write steps as short, clear sentences. Put warnings and things that can go wrong in tips. Reply with only JSON: {"title": string, "servings": number|null, "time": string|null, "ingredients": [{"amount": number|null, "unit": string|null, "name": string, "product_id": string|null}], "steps": [string], "tips": [string]}`;}
async function runImport(img){const text=$('impText').value.trim();if(!text&&!img){state.impErr='Paste a recipe or choose a photo first.';renderImport();return;}
  if(!sampleFn){state.impErr='Reading recipes needs this page open from your Claude account. You can write it yourself instead.';renderImport();return;}
  state.impBusy=true;state.impErr='';renderImport();
  try{const r=await sampleFn.json(importPrompt(text),img?{images:[img],cache:false,modelTier:'default'}:{cache:false,modelTier:'default'});
    const valid=new Set(state.products.map(p=>p.id));
    const ings=Array.isArray(r&&r.ingredients)?r.ingredients.map(i=>({amount:i&&i.amount!=null&&isFinite(+i.amount)?+i.amount:'',unit:i&&i.unit?String(i.unit).slice(0,16):'',name:String(i&&i.name||'').slice(0,60),product_id:i&&valid.has(i.product_id)?i.product_id:''})).filter(i=>i.name):[];
    state.impBusy=false;closeSheets();
    openEditor({title:String(r&&r.title||'New recipe').slice(0,60),servings:r&&+r.servings>0?+r.servings:'',time:r&&r.time?String(r.time).slice(0,30):'',plan:'',ingredients:ings,
      steps:(Array.isArray(r&&r.steps)?r.steps:[]).map(String).join('\n'),tips:(Array.isArray(r&&r.tips)?r.tips:[]).map(String).join('\n')});
    toast('Check it, then save');}
  catch(e){const m={not_granted:'Allow this page to use Claude to read recipes.',rate_limited:'Too many requests right now. Try again in a minute.',image_rejected:"That photo couldn't be read. Try a clearer one.",invalid_json:"Couldn't read that recipe clearly. Try again or write it yourself."};
    state.impBusy=false;state.impErr=m[e&&e.code]||"Couldn't read the recipe. Try again or write it yourself.";renderImport();}}
/* editor */
function openEditor(data){state.redit=JSON.parse(JSON.stringify(data||{title:'',servings:'',time:'',plan:'',ingredients:[{amount:'',unit:'',name:'',product_id:''}],steps:'',tips:''}));
  if(!state.redit.ingredients.length)state.redit.ingredients.push({amount:'',unit:'',name:'',product_id:''});renderEditor();openSheet('editSheet');}
function renderEditor(){const d=state.redit;const opts=sel=>`<option value="">Not linked</option>${[...state.products].sort((a,b)=>String(a.name).localeCompare(String(b.name))).map(p=>`<option value="${esc(p.id)}" ${sel===p.id?'selected':''}>${esc(p.name+(prodLabel(p)?' · '+prodLabel(p):''))}</option>`).join('')}`;
  $('editTitle').textContent=d.id?'Edit recipe':'New recipe';
  $('editBody').innerHTML=`<div class="field"><label for="reTitle">Recipe name</label><input id="reTitle" data-rf="title" maxlength="60" value="${esc(d.title)}" placeholder="e.g. Fluffy pancakes"></div>
    <div class="two"><div class="field"><label for="reServ">Servings</label><input id="reServ" data-rf="servings" inputmode="numeric" value="${esc(d.servings)}"></div>
    <div class="field"><label for="reTime">Time</label><input id="reTime" data-rf="time" maxlength="30" value="${esc(d.time)}" placeholder="e.g. 25 min"></div></div>
    <div class="seg" style="grid-template-columns:repeat(3,minmax(0,1fr))">${[['','No tag'],['on','On plan'],['treat','Treat']].map(([v,t])=>`<button data-rplan="${v}" aria-pressed="${(d.plan||'')===v}">${t}</button>`).join('')}</div>
    <span class="label">Ingredients</span>
    <div class="ingedit">${d.ingredients.map((it,i)=>`<div class="ingrow"><input data-ii="${i}" data-if="amount" inputmode="decimal" value="${esc(it.amount)}" placeholder="2" aria-label="Amount"><input data-ii="${i}" data-if="unit" value="${esc(it.unit)}" placeholder="cups" aria-label="Unit"><input data-ii="${i}" data-if="name" value="${esc(it.name)}" placeholder="Flour" aria-label="Ingredient"><button data-irm="${i}" aria-label="Remove ingredient">×</button>
      <select data-ii="${i}" data-if="product_id" aria-label="Your product">${opts(it.product_id)}</select></div>`).join('')}</div>
    <button class="btn2" data-iadd>+ Add ingredient</button>
    <div class="field"><label for="reSteps">Steps · one per line</label><textarea id="reSteps" data-rf="steps" rows="6" placeholder="Whisk the eggs and sugar&#10;Add the flour slowly">${esc(d.steps)}</textarea></div>
    <div class="field"><label for="reTips">What can go wrong · one per line</label><textarea id="reTips" data-rf="tips" rows="3" placeholder="Don't overmix or they turn rubbery">${esc(d.tips)}</textarea></div>
    <label class="toggle"><input type="checkbox" id="reHim" ${d.forHim?'checked':''}> One of my husband's favorite meals</label>
    <div class="field"><label>Photo of the dish (optional)</label><div class="photorow">${d.photo?`<img src="/_blob/${esc(d.photo)}" alt="">`:''}<label class="btn2" for="rePhoto" ${assetsNS?'':'hidden'}>${d.photo?'Change photo':'Add photo'}</label><input type="file" id="rePhoto" accept="image/*" hidden></div></div>
    <p class="err" id="reErr" hidden></p>
    <button class="primary" id="reSave">Save recipe</button>`;
  $('rePhoto').onchange=async()=>{const f=$('rePhoto').files&&$('rePhoto').files[0];$('rePhoto').value='';if(!f||!assetsNS)return;
    try{const {im,u}=await loadImg(f);const b=await new Promise((r,j)=>drawTo(im,1100).toBlob(x=>x?r(x):j(new Error('e')),'image/jpeg',0.82));URL.revokeObjectURL(u);const up=await assetsNS.upload(b,{type:'image/jpeg'});state.redit.photo=up.id;renderEditor();}catch(e){toast("Couldn't add that photo.");}};
  $('reSave').onclick=saveRecipe;}
$('editBody').addEventListener('input',e=>{const t=e.target;const d=state.redit;if(!d)return;
  if(t.dataset.rf)d[t.dataset.rf]=t.value;else if(t.dataset.ii!=null){d.ingredients[+t.dataset.ii][t.dataset.if]=t.value;}});
$('editBody').addEventListener('change',e=>{const t=e.target;if(t.tagName==='SELECT'&&t.dataset.ii!=null)state.redit.ingredients[+t.dataset.ii].product_id=t.value;});
async function saveRecipe(){const d=state.redit;if(!d.title||!d.title.trim()){$('reErr').hidden=false;$('reErr').textContent='Give the recipe a name.';return;}
  const old=d.id?state.recipes.find(x=>x.id===d.id):null;
  const r={id:d.id||'r'+newId(),title:d.title.trim().slice(0,60),servings:parseNum(d.servings)||'',time:String(d.time||'').trim().slice(0,30),plan:d.plan||'',forHim:!!($('reHim')&&$('reHim').checked),
    ingredients:d.ingredients.filter(i=>String(i.name||'').trim()).map(i=>({amount:i.amount===''||i.amount==null?null:parseNum(i.amount),unit:String(i.unit||'').trim(),name:String(i.name).trim(),product_id:i.product_id||null})),
    steps:String(d.steps||'').split('\n').map(s=>s.trim()).filter(Boolean),tips:String(d.tips||'').split('\n').map(s=>s.trim()).filter(Boolean),
    made:old?old.made||0:0,lastMade:old?old.lastMade||null:null,createdAt:old?old.createdAt:Date.now()};
  if(d.photo)r.photo=d.photo;
  try{await store.put('recipes',r);closeSheets();toast(old?'Recipe updated':'Recipe saved');}catch(e){$('reErr').hidden=false;$('reErr').textContent="Couldn't save. Check your connection and try again.";}}

/* ---------- debts ---------- */
const rate=()=>+state.settings.rate||3.05;
const toNIS=(v,cur)=>cur==='USD'?v*rate():v;
const toUSD=(v,cur)=>cur==='USD'?v:v/rate();
const money=(v,cur)=>cur==='USD'?'$'+Math.round(v).toLocaleString('en-US'):fmt(v);
const personColor=n=>palOf(n);
const byOrder=(a,b)=>((a.order??1e9)-(b.order??1e9))||((a.createdAt||0)-(b.createdAt||0));
const DSORTS=[['manual','My order'],['most','Most left'],['least','Least left'],['done','Almost done'],['az','A–Z'],['za','Z–A']];
function sortedDebts(){const m=state.settings.debtSort||'manual';const L=[...state.debts].sort(byOrder);if(m==='manual')return L;
  const left=d=>toNIS(debtStats(d).rem,d.currency);const nm=d=>String(d.name||'').toLowerCase();const paid=d=>debtStats(d).rem<=0?1:0;
  const cmp={most:(a,b)=>left(b)-left(a),least:(a,b)=>left(a)-left(b),done:(a,b)=>debtStats(b).pct-debtStats(a).pct,az:(a,b)=>nm(a).localeCompare(nm(b)),za:(a,b)=>nm(b).localeCompare(nm(a))}[m];
  return cmp?L.sort((a,b)=>paid(a)-paid(b)||cmp(a,b)):L;}
async function saveDebtOrder(list){const changed=[];list.forEach((d,k)=>{if(d.order!==k)changed.push({...d,order:k});});
  state.debts=state.debts.map(d=>changed.find(c=>c.id===d.id)||d);render();
  try{for(const c of changed){if(db)await db.collection('debts').doc(c.id).set(strip(c));}if(!db)lsSet();}catch(e){toast("Couldn't save the new order. Try again.");}}
async function moveDebt(id,dir){const list=sortedDebts();const i=list.findIndex(d=>d.id===id);const j=i+dir;if(i<0||j<0||j>=list.length)return;
  [list[i],list[j]]=[list[j],list[i]];const changed=[];list.forEach((d,k)=>{if(d.order!==k)changed.push({...d,order:k});});
  state.debts=state.debts.map(d=>changed.find(c=>c.id===d.id)||d);render();
  try{for(const c of changed){if(db)await db.collection('debts').doc(c.id).set(strip(c));}if(!db)lsSet();}catch(e){toast("Couldn't save the new order. Try again.");}}
function debtStats(d){const pays=state.entries.filter(e=>e.cat==='debt'&&e.debtId===d.id);
  const logged=pays.reduce((a,e)=>a+(+e.debtAmt||0),0);const paid=(+d.paidBefore||0)+logged;const total=+d.total||0;
  return {pays,paid,rem:Math.max(0,total-paid),pct:total>0?Math.min(1,paid/total):0};}
function renderDebts(){
  const list=sortedDebts();const view=state.debtView;const f=view==='USD'?toUSD:toNIS;
  let rem=0,all=0,paid=0;const byCur={USD:{rem:0,n:0},NIS:{rem:0,n:0}};
  list.forEach(d=>{const st=debtStats(d);rem+=f(st.rem,d.currency);all+=f(+d.total||0,d.currency);paid+=f(st.paid,d.currency);const b=byCur[d.currency]||byCur.NIS;b.rem+=st.rem;b.n++;});
  const pct=all>0?paid/all*100:0;
  const other=view==='USD'?fmt(rem*rate()):'$'+Math.round(rem/rate()).toLocaleString('en-US');
  const linked=state.entries.filter(e=>e.cat==='debt'&&e.debtId);const months=new Set(linked.map(e=>(e.date||'').slice(0,7))).size;
  const avgNIS=months?linked.reduce((a,e)=>a+(+e.amount||0),0)/months:0;const remNIS=view==='USD'?rem*rate():rem;
  let eta='';
  if(list.length&&remNIS<=0.5)eta='<b>Everything is paid off.</b>';
  else if(avgNIS>0){const n=Math.ceil(remNIS/avgNIS);const dt=new Date(today.getFullYear(),today.getMonth()+n,1);eta=`At your average of ${fmt(avgNIS)} a month, you'll be debt-free around <b>${MONTHS[dt.getMonth()]} ${dt.getFullYear()}</b>.`;}
  else if(list.length)eta='Log your first payment to see when you\'ll be debt-free.';
  const seg=`<div class="curseg" role="group" aria-label="Show totals in"><button data-dview="NIS" aria-pressed="${view==='NIS'}">₪</button><button data-dview="USD" aria-pressed="${view==='USD'}">$</button></div>`;
  $('debtSummary').innerHTML=`<div class="cardhead"><h2>Total you owe</h2>${seg}</div>`+(list.length?
    `<div class="dtotal num">${money(rem,view)}</div><div class="wsub num">≈ ${other} · ${list.length} ${list.length===1?'person':'people'}</div>
     <div class="dbar"><span style="width:${pct}%"></span></div>
     <div class="pmeta num"><span>${money(paid,view)} paid of ${money(all,view)}</span><span>${Math.round(pct)}% done</span></div>
     <div class="bmi" style="margin-top:12px">${byCur.USD.n?`<div><small>Owed in dollars</small><b class="num">$${Math.round(byCur.USD.rem).toLocaleString('en-US')}</b></div>`:''}${byCur.NIS.n?`<div><small>Owed in shekels</small><b class="num">${fmt(byCur.NIS.rem)}</b></div>`:''}</div>
     <p class="hint" style="margin-top:10px">${eta} Dollars converted at ₪${rate()} per $1.</p>
     <div class="calm">${catSVG(remNIS<=0.5?'excited':'open',{pose:'coin'})}<p>${remNIS<=0.5?'All paid. Time for a celebration nap.':CALM[Math.floor((today-new Date(today.getFullYear(),0,0))/864e5)%CALM.length]}</p></div>`
    :`<p class="hint">Add each person you owe in the currency you owe them. Totals in dollars and shekels are worked out for you.</p>`);
  const ro=state.reorderD&&list.length>1;
  const dsm=state.settings.debtSort||'manual';
  $('debtList').innerHTML=`<div class="cardhead"><h2>People</h2>${list.length>1?`<button class="link" data-reorder>${ro?'Done':'Move by hand'}</button>`:`<span class="label num">${list.length}</span>`}</div>`
    +(list.length>1&&!ro?`<div class="chips scrollx dsort" role="group" aria-label="Sort people">${DSORTS.map(([k,t])=>`<button class="fchip ${dsm===k?'sel':''}" data-dsort="${k}" aria-pressed="${dsm===k}">${t}</button>`).join('')}</div>`:'')+list.map((d,idx)=>{const st=debtStats(d);const col=personColor(d.name);const open=!ro&&state.openD===d.id;
    if(ro)return `<div class="person"><div class="prow"><span class="avatar" style="background:${col}">${esc((d.name||'?').slice(0,1).toUpperCase())}</span><span class="nm"><b>${esc(d.name)}</b><small class="num">${st.rem>0?money(st.rem,d.currency)+' left':'Paid'}</small></span>
      <span class="mv"><button data-mv="${esc(d.id)}:-1" aria-label="Move ${esc(d.name)} up" ${idx===0?'disabled':''}>↑</button><button data-mv="${esc(d.id)}:1" aria-label="Move ${esc(d.name)} down" ${idx===list.length-1?'disabled':''}>↓</button></span></div></div>`;
    return `<div class="person"><button class="prow" data-prs="${esc(d.id)}" aria-expanded="${open}"><span class="avatar" style="background:${col}">${esc((d.name||'?').slice(0,1).toUpperCase())}</span>
      <span class="nm"><b>${esc(d.name)}</b><small class="num">${money(st.paid,d.currency)} of ${money(d.total,d.currency)} paid</small><span class="minibar" style="display:block"><span style="width:${st.pct*100}%;background:${col}"></span></span></span>
      <span class="rem num">${st.rem>0?money(st.rem,d.currency):'Paid'}<small>${st.rem>0?'left':'all done'}</small></span></button>
      ${open?`<div class="pdetail"><div class="acts">${st.rem>0?`<button class="pay" data-payd="${esc(d.id)}">Log a payment</button>`:''}<button class="btn2" data-editd="${esc(d.id)}">Edit</button></div>
        ${st.pays.length?`<div class="paylist">${[...st.pays].sort((a,b)=>a.date<b.date?1:-1).map(e=>`<div><span>${dayLabel(e.date)}</span><b class="num">${money(+e.debtAmt||0,d.currency)}</b></div>`).join('')}</div>`:'<p class="hint">No payments logged yet.</p>'}</div>`:''}</div>`;}).join('')
    +(ro?'':`<button class="addperson" data-adddebt>+ Add a person</button>`);
}
/* debt sheet */
let dpCur='USD',dpEdit=null,dpConfirm=false;
function openDebt(id){dpEdit=id||null;dpConfirm=false;const d=id?state.debts.find(x=>x.id===id):null;
  $('debtTitle').textContent=d?'Edit '+d.name:'Add a person';$('dpName').value=d?d.name:'';dpCur=d?d.currency:'USD';
  $('dpTotal').value=d?d.total:'';$('dpBefore').value=d&&d.paidBefore?d.paidBefore:'';$('dpErr').hidden=true;syncDp();openSheet('debtSheet');}
function syncDp(){$('dpCur').querySelectorAll('[data-dcur]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.dcur===dpCur)));
  $('dpTotalL').textContent=`Amount owed (${dpCur==='USD'?'$':'₪'})`;
  $('dpSave').disabled=!($('dpName').value.trim()&&parseNum($('dpTotal').value)>0);
  $('dpDanger').innerHTML=dpEdit?(dpConfirm?`<p class="hint">Delete this person? Their logged payments stay in your spending history.</p><div class="two"><button class="btn2" data-dpcancel>Keep</button><button class="del" data-dpdel>Delete</button></div>`
    :`<button class="del" data-dpask style="width:100%">Delete person</button>`):'';}
['dpName','dpTotal','dpBefore'].forEach(id=>$(id).oninput=syncDp);
$('dpSave').onclick=async()=>{const old=dpEdit?state.debts.find(x=>x.id===dpEdit):null;
  if(old&&old.currency!==dpCur&&debtStats(old).pays.length){$('dpErr').hidden=false;$('dpErr').textContent=`${old.name} already has payments in ${old.currency==='USD'?'dollars':'shekels'}. Keep the same currency.`;return;}
  const d={id:old?old.id:'d'+newId(),name:$('dpName').value.trim().slice(0,30),currency:dpCur,total:parseNum($('dpTotal').value),paidBefore:parseNum($('dpBefore').value),createdAt:old?old.createdAt:Date.now(),order:old&&old.order!=null?old.order:state.debts.reduce((m,x)=>Math.max(m,x.order??-1),-1)+1};
  try{await store.put('debts',d);closeSheets();toast(old?`${d.name} updated`:`${d.name} added`);}catch(e){$('dpErr').hidden=false;$('dpErr').textContent="Couldn't save. Check your connection and try again.";}};

/* ---------- health ---------- */
const parseD=ds=>{const [y,m,d]=ds.split('-').map(Number);return new Date(y,m-1,d);};
function weekStart(ds){const d=parseD(ds);d.setDate(d.getDate()-((d.getDay()+1)%7));return d;}
function weekDates(ds){const s=weekStart(ds);return [...Array(7)].map((_,i)=>{const d=new Date(s);d.setDate(s.getDate()+i);return ymd(d);});}
const shortD=ds=>{const d=parseD(ds);return MONTHS[d.getMonth()].slice(0,3)+' '+d.getDate();};
function autoMeal(){const h=new Date().getHours();return h<11?'breakfast':h<16?'lunch':h<21?'dinner':'snack';}
function dayDoc(ds){return state.days.find(d=>d.id===ds)||{id:ds};}
const writeTimers={};
function patchDay(ds,patch){const next={...dayDoc(ds),...patch,id:ds};state.days=state.days.filter(d=>d.id!==ds).concat([next]);render();
  clearTimeout(writeTimers[ds]);writeTimers[ds]=setTimeout(()=>{if(db)db.collection('days').doc(ds).set(strip(next)).catch(()=>toast("Couldn't save. Check your connection."));else lsSet();},500);}
function dayFood(ds){return state.food.filter(f=>f.date===ds).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));}
function dayStatus(ds){const f=dayFood(ds);if(!f.length)return 'none';const off=f.filter(x=>!x.plan).length;return off===0?'good':off<=2?'warn':'bad';}

const IC={
 pill:'<svg viewBox="0 0 32 32" width="30" height="30"><g transform="rotate(-40 16 16)"><rect x="5" y="11" width="22" height="10" rx="5" fill="currentColor" opacity=".35"/><path d="M16 11h6a5 5 0 0 1 0 10h-6z" fill="currentColor"/></g></svg>',
 cap:'<svg viewBox="0 0 32 32" width="30" height="30"><circle cx="16" cy="16" r="10" fill="currentColor" opacity=".35"/><path d="M9 16h14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>',
 drop:'<svg viewBox="0 0 32 32" width="30" height="30"><path d="M16 4c5 7 9 11 9 16a9 9 0 0 1-18 0c0-5 4-9 9-16Z" fill="currentColor" opacity=".35"/><path d="M16 4c5 7 9 11 9 16a9 9 0 0 1-18 0c0-5 4-9 9-16Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>',
 rope:'<svg viewBox="0 0 32 32" width="30" height="30"><path d="M7 9c0 14 18 14 18 0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><rect x="4.5" y="3" width="5" height="9" rx="2.5" fill="currentColor"/><rect x="22.5" y="3" width="5" height="9" rx="2.5" fill="currentColor"/></svg>',
 flame:'<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9Z" fill="currentColor"/></svg>',
 plate:'<svg viewBox="0 0 32 32" width="30" height="30"><circle cx="16" cy="16" r="11" fill="currentColor" opacity=".35"/><circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>',
 walk:'<svg viewBox="0 0 32 32" width="30" height="30"><ellipse cx="11" cy="12" rx="4.5" ry="7" fill="currentColor" opacity=".35"/><ellipse cx="21" cy="17" rx="4.5" ry="7" fill="currentColor"/><circle cx="11" cy="23.5" r="2.6" fill="currentColor" opacity=".35"/><circle cx="21" cy="28" r="2.4" fill="currentColor"/></svg>',
 book:'<svg viewBox="0 0 32 32" width="30" height="30"><path d="M4 7c4-1.5 8-1.5 12 1v18c-4-2.5-8-2.5-12-1Z" fill="currentColor" opacity=".35"/><path d="M28 7c-4-1.5-8-1.5-12 1v18c4-2.5 8-2.5 12-1Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>',
 leaf:'<svg viewBox="0 0 32 32" width="30" height="30"><path d="M6 26C6 13 14 6 27 5c0 14-7 21-21 21Z" fill="currentColor" opacity=".35"/><path d="M6 26C11 18 16 13 22 10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
 heart:'<svg viewBox="0 0 32 32" width="30" height="30"><path d="M16 27S4 19.5 4 11.5A6 6 0 0 1 16 9a6 6 0 0 1 12 2.5C28 19.5 16 27 16 27Z" fill="currentColor" opacity=".35"/><path d="M16 27S4 19.5 4 11.5A6 6 0 0 1 16 9a6 6 0 0 1 12 2.5C28 19.5 16 27 16 27Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>',
 moon:'<svg viewBox="0 0 32 32" width="30" height="30"><path d="M21 4a12 12 0 1 0 7 19A10 10 0 0 1 21 4Z" fill="currentColor" opacity=".35"/><path d="M21 4a12 12 0 1 0 7 19A10 10 0 0 1 21 4Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>',
 star:'<svg viewBox="0 0 32 32" width="30" height="30"><path d="m16 3 3.8 8 8.7 1-6.4 6 1.7 8.7L16 22.4l-7.8 4.3L9.9 18l-6.4-6 8.7-1Z" fill="currentColor" opacity=".35"/><path d="m16 3 3.8 8 8.7 1-6.4 6 1.7 8.7L16 22.4l-7.8 4.3L9.9 18l-6.4-6 8.7-1Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
 dumbbell:'<svg viewBox="0 0 32 32" width="30" height="30"><rect x="3" y="10" width="6" height="12" rx="2" fill="currentColor"/><rect x="23" y="10" width="6" height="12" rx="2" fill="currentColor"/><rect x="9" y="14" width="14" height="4" rx="1.5" fill="currentColor" opacity=".35"/></svg>',
 sparkle:'<svg viewBox="0 0 32 32" width="30" height="30"><path d="M14 3c1 7 4 10 11 11-7 1-10 4-11 11-1-7-4-10-11-11 7-1 10-4 11-11Z" fill="currentColor" opacity=".35"/><path d="M14 3c1 7 4 10 11 11-7 1-10 4-11 11-1-7-4-10-11-11 7-1 10-4 11-11Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M25 21c.4 2.6 1.4 3.6 4 4-2.6.4-3.6 1.4-4 4-.4-2.6-1.4-3.6-4-4 2.6-.4 3.6-1.4 4-4Z" fill="currentColor"/></svg>',
 cup:'<svg viewBox="0 0 32 32" width="30" height="30"><path d="M5 11h17v8a7 7 0 0 1-7 7h-3a7 7 0 0 1-7-7Z" fill="currentColor" opacity=".35"/><path d="M5 11h17v8a7 7 0 0 1-7 7h-3a7 7 0 0 1-7-7ZM22 13h2a4 4 0 0 1 0 8h-2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M11 4c-1 2 1 3 0 5M16 4c-1 2 1 3 0 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 lock:'<svg viewBox="0 0 24 24" width="16" height="16"><rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
};

/* ---------- habits (built-in + your own) ---------- */
const HBUILT={vitD:{name:'Vitamin D',icon:'pill',kind:'check'},folic:{name:'Folic acid',icon:'cap',kind:'check'},water:{name:'Water',icon:'drop',kind:'count',unit:'glasses'},rope:{name:'Jump rope',icon:'rope',kind:'count',unit:'rounds'}};
const HICONS=['pill','cap','drop','rope','walk','dumbbell','leaf','cup','book','moon','heart','sparkle','star'];
const HPRESETS=[
 {name:'Walk',icon:'walk',kind:'count',target:30,unit:'minutes',step:5},
 {name:'Workout',icon:'dumbbell',kind:'check',per:3},
 {name:'Stretch',icon:'star',kind:'check',per:7},
 {name:'Iron',icon:'pill',kind:'check',per:7},
 {name:'Omega-3',icon:'cap',kind:'check',per:7},
 {name:'Magnesium',icon:'pill',kind:'check',per:7},
 {name:'Vitamin B12',icon:'cap',kind:'check',per:7},
 {name:'Veggies',icon:'leaf',kind:'count',target:3,unit:'portions',step:1},
 {name:'Green tea',icon:'cup',kind:'count',target:2,unit:'cups',step:1},
 {name:'Skincare',icon:'sparkle',kind:'check',per:7},
 {name:'Read',icon:'book',kind:'count',target:10,unit:'pages',step:5},
 {name:'القرآن',icon:'book',kind:'count',target:5,unit:'pages',step:1},
 {name:'In bed by midnight',icon:'moon',kind:'check',per:7},
 {name:'Call Mama',icon:'heart',kind:'check',per:2}];
function habits(S){S=S||state.settings;const hid=S.hiddenHabits||[];const ed=S.habitEdits||{};const out=[];
  const b=(id,o)=>{if(!hid.includes(id))out.push({...HBUILT[id],step:1,per:7,target:0,...(ed[id]||{}),...o,id,builtin:true});};
  b('vitD',{per:+S.vitDDays||5,note:ed.vitD&&ed.vitD.note!=null?ed.vitD.note:`${(+S.vitDDose||10000).toLocaleString('en-US')} IU`});
  b('folic',{});b('water',{target:+S.waterTarget||0});b('rope',{target:+S.ropeTarget||3,range:!(ed.rope&&ed.rope.norange)});
  (S.customHabits||[]).forEach(h=>out.push({step:1,per:7,target:0,...h}));return out;}
function habitSub(h){if(h.kind==='check')return [h.note,h.per>=7?'Every day':`${h.per} day${h.per>1?'s':''} a week`].filter(Boolean).join(' · ');
  return [h.note,h.target?`Goal ${h.range?h.target+'–'+(h.target+1):h.target} ${h.unit}`:'No minimum',h.step>1?`+${h.step} a tap`:''].filter(Boolean).join(' · ');}
function saveS(s2,msg,undoPrev){state.settings=s2;render();if(!$('habitSheet').hidden)renderHabitSheet();
  return store.saveSettings(s2).then(()=>{if(msg)toast(msg,undoPrev?()=>saveS(undoPrev):null);}).catch(()=>toast("Couldn't save. Try again."));}
function openHabits(){state.hab={mode:'list'};renderHabitSheet();openSheet('habitSheet');}
function renderHabitSheet(){const H=state.hab||{mode:'list'};const hs=habits();
  if(H.mode==='list'){$('habitTitle').textContent='Your habits';
    const have=new Set(hs.map(h=>h.name.toLowerCase()));
    const back=Object.keys(HBUILT).filter(id=>(state.settings.hiddenHabits||[]).includes(id)).map(id=>({...HBUILT[id],id,builtin:true}));
    const pre=[...back,...HPRESETS.filter(p=>!have.has(p.name.toLowerCase()))];
    $('habitBody').innerHTML=`${hs.length?`<div class="hlist">${hs.map(h=>`<div class="hrow"><span class="hic">${IC[h.icon]||IC.star}</span><span class="nm"><b>${esc(h.name)}</b><small>${esc(habitSub(h))}</small></span><button class="btn2 sm" data-hedit="${esc(h.id)}">Edit</button><button class="xbtn" data-hrm="${esc(h.id)}" aria-label="Remove ${esc(h.name)}">${XSVG}</button></div>`).join('')}</div>`:'<p class="empty">No habits yet. Pick one below or make your own.</p>'}
      <span class="label">Add a habit</span>
      <div class="hpre">${pre.map((p,i)=>`<button class="hpchip" data-hpre="${i}"><span>${IC[p.icon]||IC.star}</span>${esc(p.name)}</button>`).join('')}</div>
      <button class="primary" data-hnew>+ Make your own</button>
      <p class="hint">Removing a habit doesn't erase past days. Your old ticks stay in your history and come back if you add it again.</p>`;
    state.hab.pre=pre;return;}
  const h=H.h;$('habitTitle').textContent=H.isNew?'New habit':'Edit habit';
  const ch=(k,v,t)=>`<button class="fchip ${h[k]==v?'sel':''}" data-hf="${k}:${v}" aria-pressed="${h[k]==v}">${t}</button>`;
  $('habitBody').innerHTML=`<div class="field"><label for="hfName">Name</label><input id="hfName" maxlength="24" value="${esc(h.name)}" placeholder="e.g. Walk, Iron, Skincare"></div>
    <span class="label">Icon</span><div class="hicons">${HICONS.map(k=>`<button class="hicb ${h.icon===k?'sel':''}" data-hf="icon:${k}" aria-label="${k}" aria-pressed="${h.icon===k}">${IC[k]}</button>`).join('')}</div>
    ${h.builtin?'':`<span class="label">How do you track it?</span><div class="modeseg"><button data-hf="kind:check" aria-pressed="${h.kind==='check'}">Tick once</button><button data-hf="kind:count" aria-pressed="${h.kind==='count'}">Count it</button></div>`}
    ${h.kind==='check'?`<span class="label">How often</span><div class="chips">${ch('per',7,'Every day')}${[6,5,4,3,2,1].map(n=>ch('per',n,n+'× a week')).join('')}</div>${h.id==='folic'||h.per>=7?'':'<p class="hint">Once the week is done, the tile tells you to skip.</p>'}`
     :`<div class="two"><div class="field"><label for="hfTarget">Daily goal${h.id==='water'?' (0 = none)':''}</label><input id="hfTarget" inputmode="numeric" value="${h.target||''}" placeholder="e.g. 8"></div>
       <div class="field"><label for="hfUnit">Unit</label><input id="hfUnit" maxlength="14" value="${esc(h.unit||'')}" placeholder="glasses, minutes…"></div></div>
       <span class="label">Each tap adds</span><div class="chips">${[1,2,5,10,15].map(n=>ch('step',n,'+'+n)).join('')}</div>`}
    <div class="field"><label for="hfNote">Note (optional)</label><input id="hfNote" maxlength="30" value="${esc(h.note||'')}" placeholder="e.g. 10,000 IU, after lunch"></div>
    <div class="two"><button class="btn2" data-hback>Back</button><button class="primary" data-hsave>${H.isNew?'Add habit':'Save'}</button></div>`;
  ['hfName','hfTarget','hfUnit','hfNote'].forEach(id=>{const el=$(id);if(el)el.oninput=()=>{h[{hfName:'name',hfTarget:'target',hfUnit:'unit',hfNote:'note'}[id]]=el.value;};});}
function saveHabit(){const H=state.hab,h=H.h;const name=String(h.name||'').trim().slice(0,24);if(!name){toast('Give it a name first.');return;}
  const prev=clone(state.settings);const s2=clone(state.settings);const tgt=Math.max(0,Math.min(999,Math.round(parseNum(h.target)||0)));
  const clean={name,icon:HICONS.includes(h.icon)?h.icon:'star',note:String(h.note||'').trim().slice(0,30)};
  if(h.builtin){s2.habitEdits={...(s2.habitEdits||{})};const e={...clean};
    if(h.kind==='count'){e.unit=String(h.unit||'').trim().slice(0,14)||HBUILT[h.id].unit;e.step=+h.step||1;}
    if(h.id==='vitD')s2.vitDDays=+h.per||5;else if(h.id==='folic')e.per=+h.per||7;else if(h.id==='water')s2.waterTarget=tgt;else if(h.id==='rope'){s2.ropeTarget=tgt||3;e.norange=true;}
    s2.habitEdits[h.id]=e;}
  else{const doc={id:h.id||'h'+newId(),kind:h.kind==='count'?'count':'check',...clean};
    if(doc.kind==='check')doc.per=+h.per||7;else{doc.target=tgt;doc.unit=String(h.unit||'').trim().slice(0,14)||'times';doc.step=+h.step||1;}
    const L=[...(s2.customHabits||[])];const i=L.findIndex(x=>x.id===doc.id);if(i>=0)L[i]=doc;else L.push(doc);s2.customHabits=L;}
  state.hab={mode:'list'};saveS(s2,H.isNew?`${name} added to your day`:'Saved',H.isNew?null:prev);}
function removeHabit(id){const h=habits().find(x=>x.id===id);if(!h)return;const prev=clone(state.settings);const s2=clone(state.settings);
  if(h.builtin)s2.hiddenHabits=[...new Set([...(s2.hiddenHabits||[]),id])];else s2.customHabits=(s2.customHabits||[]).filter(x=>x.id!==id);
  saveS(s2,`${h.name} removed`,prev);}
function addPreset(p){const s2=clone(state.settings);
  if(p.builtin){s2.hiddenHabits=(s2.hiddenHabits||[]).filter(x=>x!==p.id);}
  else{const old=(s2.customHabits||[]);s2.customHabits=[...old,{id:'h'+newId(),name:p.name,icon:p.icon,kind:p.kind,per:p.per||7,target:p.target||0,unit:p.unit||'',step:p.step||1,note:''}];}
  saveS(s2,`${p.name} added to your day`);}
const XSVG='<svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

/* ---------- greetings ---------- */
const GREETS={
 morning:['صباح الفل يا لينا','Good morning, Lina','صباحك سكر يا لينا','Rise and shine, Lina','صباح الورد يا قمر','Morning, Lina. يلا نبلش'],
 day:['أهلين يا لينا','Hey Lina, كيفك اليوم؟','يا هلا بلينا','Hi Lina, شو الأخبار؟','Keep going, Lina. قدها وقدود','لينا، يا شمس هالبيت'],
 evening:['مساء الخير يا لينا','مساء الفل يا لينا','Evening, Lina. يعطيكِ العافية','مساء الورد يا قمر','You made it through today, Lina'],
 night:['تصبحي على خير يا لينا','Sleep tight, يا قمر','Rest now, Lina. بكرا يوم جديد','نامي منيح يا لينا']};
function greetLine(st,pct){const now=new Date(),h=now.getHours();const slot=h>=22||h<4?'night':h<12?'morning':h<17?'day':'evening';
  let pool=[...GREETS[slot]];if(now.getDay()===5&&slot!=='night')pool.push('جمعة مباركة يا لينا');
  if(pct>=1)pool=['Perfect day! برافو عليكِ يا لينا','كلّه تمام، Lina. Proud of you'];else if(st>=3)pool.push(`${st} days strong. عاش يا لينا`);
  const doy=Math.floor((today-new Date(today.getFullYear(),0,0))/864e5);return pool[(doy+(state.greetN||0))%pool.length];}
function greetKicker(){const h=new Date().getHours();return `${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()]} ${h>=22||h<4?'night':h<12?'morning':h<17?'afternoon':'evening'}`;}

/* ---------- prayers: Gaza times (Egyptian method, matched to Lina's prayer app) + daily drawing ---------- */
const PRAYERS=[['fajr','الفجر','الفجر'],['dhuhr','الظهر','الظهر'],['asr','العصر','العصر'],['maghrib','المغرب','المغرب'],['isha','العشاء','العشاء']];
const PLOC={lat:31.5017,lon:34.4668};const POFF={fajr:1,sunrise:1,dhuhr:0,asr:-1,maghrib:2,isha:0};const ONTIME=20;
function tzOffsetH(ds){const d=parseD(ds);d.setHours(12);return -d.getTimezoneOffset()/60;}
const _pt={};function prayerTimes(ds){if(_pt[ds])return _pt[ds];const [Y,M,D]=ds.split('-').map(Number);let y=Y,m=M;if(m<=2){y--;m+=12;}const A=Math.floor(y/100),B=2-A+Math.floor(A/4);
  const jd=Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+D+B-1524.5;const Dd=jd-2451545,rad=Math.PI/180;
  const g=((357.529+0.98560028*Dd)%360)*rad,q=(280.459+0.98564736*Dd)%360,L=((q+1.915*Math.sin(g)+0.02*Math.sin(2*g))%360)*rad,e=(23.439-0.00000036*Dd)*rad;
  const RA=Math.atan2(Math.cos(e)*Math.sin(L),Math.cos(L))/rad/15,dec=Math.asin(Math.sin(e)*Math.sin(L));let eq=q/15-((RA%24+24)%24);eq=((eq+12)%24+24)%24-12;
  const tz=tzOffsetH(ds),noon=12+tz-PLOC.lon/15-eq,la=PLOC.lat*rad;
  const T=a=>Math.acos((-Math.sin(a*rad)-Math.sin(la)*Math.sin(dec))/(Math.cos(la)*Math.cos(dec)))/rad/15;
  const asrA=Math.atan(1/(1+Math.tan(Math.abs(la-dec))));const asr=noon+Math.acos((Math.sin(asrA)-Math.sin(la)*Math.sin(dec))/(Math.cos(la)*Math.cos(dec)))/rad/15;
  const h={fajr:noon-T(19.5),sunrise:noon-T(0.833),dhuhr:noon,asr,maghrib:noon+T(0.833),isha:noon+T(17.5)};const out={};
  Object.keys(h).forEach(k=>{out[k]=Math.round(h[k]*60)+POFF[k];});return _pt[ds]=out;}
const clk=mins=>{const h=Math.floor(mins/60)%24,m=mins%60;return `${(h%12)||12}:${pad(m)}`;};
const nowMin=()=>{const d=new Date();return d.getHours()*60+d.getMinutes();};
function prayerWindows(ds){const t=prayerTimes(ds);return {fajr:[t.fajr,t.sunrise],dhuhr:[t.dhuhr,t.asr],asr:[t.asr,t.maghrib],maghrib:[t.maghrib,t.isha],isha:[t.isha,24*60]};}
function prayStart(){const S=state.settings;if(S.prayStart)return S.prayStart;const ds=state.days.filter(d=>d.pr&&Object.keys(d.pr).length).map(d=>d.id).sort();return ds[0]||todayStr;}
function prayerState(ds,k){const dd=dayDoc(ds);const r=(dd.pr||{})[k];if(!r&&ds<prayStart())return 'off';const [st,en]=prayerWindows(ds)[k];
  if(r&&r.s)return r.s;const past=ds<todayStr||(ds===todayStr&&nowMin()>=en);if(past)return 'miss';if(ds===todayStr&&nowMin()>=st)return 'now';return 'todo';}
function judgeTap(ds,k){const [st,en]=prayerWindows(ds)[k];if(ds<todayStr)return 'late';const n=nowMin();if(n<st)return 'on';return n<=st+ONTIME?'on':n<en?'late':'qada';}
const PSHAPES={
arc:{name:'Sun arc',pts:[[15,105],[57.5,48.8],[100,30],[142.5,48.8],[185,105]],seg:['M15 105 Q32 70 57.5 48.8','M57.5 48.8 Q78 33 100 30','M100 30 Q122 33 142.5 48.8','M142.5 48.8 Q168 70 185 105']},
wave:{name:'Wave',pts:[[15,60],[57,25],[100,60],[143,95],[185,60]],seg:['M15 60 Q36 25 57 25','M57 25 Q78 25 100 60','M100 60 Q122 95 143 95','M143 95 Q164 95 185 60']},
hills:{name:'Hills',pts:[[15,100],[55,40],[100,85],[145,25],[185,100]],seg:['M15 100 L55 40','M55 40 L100 85','M100 85 L145 25','M145 25 L185 100']},
heart:{name:'Heart',pts:[[62,88],[40,45],[100,38],[160,45],[138,88]],seg:['M62 88 Q30 62 40 45','M40 45 C45 12 95 12 100 38','M100 38 C105 12 155 12 160 45','M160 45 Q170 62 138 88'],fin:'M138 88 L100 112 L62 88'},
dome:{name:'Dome',pts:[[38,100],[52,58],[100,30],[148,58],[162,100]],seg:['M38 100 L52 100 L52 58','M52 58 Q70 34 100 30','M100 30 Q130 34 148 58','M148 58 L148 100 L162 100'],fin:'M100 30 V20 M104 9 A6 6 0 1 0 104 21 A4.5 4.5 0 1 1 104 9'},
inf:{name:'Infinity',pts:[[100,60],[55,30],[55,90],[145,30],[145,90]],seg:['M100 60 Q80 30 55 30','M55 30 Q15 30 15 60 Q15 90 55 90','M55 90 Q80 90 100 60 Q120 30 145 30','M145 30 Q185 30 185 60 Q185 90 145 90'],fin:'M145 90 Q120 90 100 60'},
stairs:{name:'Stairs',pts:[[20,104],[60,82],[100,60],[140,38],[180,16]],seg:['M20 104 H60 V82','M60 82 H100 V60','M100 60 H140 V38','M140 38 H180 V16'],fin:'M180 16 V2 L194 7 L180 12'},
house:{name:'Home',pts:[[45,105],[45,55],[100,16],[155,55],[155,105]],seg:['M45 105 L45 55','M45 55 L100 16','M100 16 L155 55','M155 55 L155 105'],fin:'M155 105 H45 M90 105 V80 H110 V105'},
cloud:{name:'Cloud',pts:[[35,92],[48,58],[92,36],[142,46],[166,90]],seg:['M35 92 Q18 70 48 58','M48 58 Q58 28 92 36','M92 36 Q120 18 142 46','M142 46 Q186 52 166 90'],fin:'M166 90 Q100 100 35 92'}};
const PROT=['arc','wave','hills','heart','inf','stairs','cloud','house'];
function shapeOf(ds){const d=parseD(ds);if(d.getDay()===5)return 'dome';const n=Math.round(d.getTime()/864e5);return PROT[((n*3)%8+8)%8];}
function zigP(a,b,amp,n){const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;let d=`M${a[0]} ${a[1]}`;for(let k=1;k<n;k++){const t=k/n,s2=(k%2?1:-1)*amp;d+=` L${(a[0]+dx*t+nx*s2).toFixed(1)} ${(a[1]+dy*t+ny*s2).toFixed(1)}`;}return d+` L${b[0]} ${b[1]}`;}
function prayerSVG(ds,small){const P=PSHAPES[shapeOf(ds)];const st=PRAYERS.map(([k])=>prayerState(ds,k));const GOLD='var(--sun)',AMB='#F08A24',RED='#E5484D',G='rgba(255,255,255,.4)';
  let s=`<svg viewBox="0 0 200 122" class="ppath" role="img" aria-label="${esc(P.name)}: ${st.filter(x=>x==='on').length} of 5 on time">`;
  [...P.seg,...(P.fin?[P.fin]:[])].forEach(d=>s+=`<path d="${d}" fill="none" stroke="${G}" stroke-width="${small?3:2}" stroke-linecap="round" stroke-dasharray="0.1 ${small?7:5}"/>`);
  P.seg.forEach((d,i)=>{const v=st[i+1],a=P.pts[i],b=P.pts[i+1];
    if(v==='on')s+=`<path d="${d}" fill="none" stroke="${GOLD}" stroke-width="${small?6:4}" stroke-linecap="round" stroke-linejoin="round"/>`;
    else if(v==='late')s+=`<path d="${zigP(a,b,3.2,9)}" fill="none" stroke="${AMB}" stroke-width="${small?5:2.8}" stroke-linecap="round" stroke-linejoin="round"/>`;
    else if(v==='miss'||v==='qada'){const q1=[a[0]+(b[0]-a[0])*.38,a[1]+(b[1]-a[1])*.38],q2=[a[0]+(b[0]-a[0])*.62,a[1]+(b[1]-a[1])*.62];s+=`<path d="M${a[0]} ${a[1]} L${q1[0].toFixed(1)} ${q1[1].toFixed(1)} M${q2[0].toFixed(1)} ${q2[1].toFixed(1)} L${b[0]} ${b[1]}" stroke="${RED}" stroke-width="${small?5:3}" stroke-linecap="round"/>`;}});
  if(P.fin&&st.every(v=>v==='on'))s+=`<path d="${P.fin}" fill="none" stroke="${GOLD}" stroke-width="${small?6:4}" stroke-linecap="round" stroke-linejoin="round"/>`;
  if(!small)P.pts.forEach(([x,y],i)=>{const v=st[i];
    if(v==='on')s+=`<circle cx="${x}" cy="${y}" r="6.5" fill="${GOLD}"/>`;
    else if(v==='late')s+=`<path d="M${x} ${y-8} L${x+8} ${y+6} L${x-8} ${y+6} Z" fill="${AMB}" stroke="rgba(0,0,0,.35)" stroke-width="1"/><text x="${x}" y="${y+4.5}" font-size="9" font-weight="800" text-anchor="middle" fill="#2A1745">!</text>`;
    else if(v==='miss'||v==='qada')s+=`<circle cx="${x}" cy="${y}" r="7.5" fill="${RED}"/><path d="M${x-3.2} ${y-3.2} l6.4 6.4 M${x+3.2} ${y-3.2} l-6.4 6.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>${v==='qada'?`<circle cx="${x+7}" cy="${y-7}" r="3.6" fill="var(--sun)" stroke="rgba(0,0,0,.3)"/>`:''}`;
    else if(v==='now')s+=`<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="var(--sun)" stroke-width="1.4" class="pglow"/><circle cx="${x}" cy="${y}" r="6.5" fill="rgba(0,0,0,.25)" stroke="var(--sun)" stroke-width="2"/>`;
    else s+=`<circle cx="${x}" cy="${y}" r="6.5" fill="rgba(0,0,0,.25)" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/>`;});
  return s+'</svg>';}
function prayerSummary(ds){const st=PRAYERS.map(([k])=>prayerState(ds,k));return {st,on:st.filter(x=>x==='on').length,late:st.filter(x=>x==='late').length,miss:st.filter(x=>x==='miss'||x==='qada').length,done:st.filter(x=>x==='on'||x==='late'||x==='qada').length};}
function renderPrayers(){const ds=state.hday;const T=prayerTimes(ds),W=prayerWindows(ds);const sm=prayerSummary(ds);const P=PSHAPES[shapeOf(ds)];
  let head='';if(ds===todayStr){const n=nowMin();const nx=PRAYERS.find(([k])=>prayerState(ds,k)==='now')||PRAYERS.find(([k])=>T[k]>n);
    if(nx){const [k,en,ar]=nx;const stt=prayerState(ds,k);const left=W[k][0]+ONTIME-n;head=stt==='now'?(left>0?`<b>${en} now</b> · on time for ${left} min more`:`<b>${en}</b> · late now, still before ${clk(W[k][1])}`):`<b>Next · ${en}</b> at ${clk(T[k])}`;}else head='All prayer times have passed';}
  else head=dayLabel(ds);
  const msgs=[];PRAYERS.forEach(([k,en])=>{const v=sm.st[PRAYERS.findIndex(p=>p[0]===k)];if(v==='late')msgs.push(`<div class="pmsg late"><b>${en} was late.</b> The drawing is cracked today, and the finishing touch is gone.</div>`);
    if(v==='miss')msgs.push(`<div class="pmsg miss"><b>You missed ${en}.</b> The drawing has a gap and your streak is broken.<br><button class="btn2 sm" data-qada="${k}">I made it up (قضاء)</button></div>`);});
  const allOn=sm.on===5;const mood=allOn?'excited':sm.miss?'sleepy':sm.late?'meh':'open';
  const rows=PRAYERS.map(([k,en,ar],i)=>{const v=sm.st[i];const lab={on:'On time',late:'Late',miss:'Missed',qada:'Made up',now:'Now',todo:clk(T[k]),off:'—'}[v];
    return `<button class="prow p-${v}" data-pray="${k}"><span class="pn"><b class="arw">${ar}</b></span><span class="pt num">${clk(T[k])}</span><span class="ps">${lab}</span></button>`;}).join('');
  $('tPray').innerHTML=`<div class="phead"><div><span class="label">${esc(P.name)} · ${sm.on} of 5 on time</span><div class="pnext">${head}</div></div></div>
    ${prayerSVG(ds)}${allOn?'<div class="pmsg good"><b>All five on time.</b> The drawing is complete. Luffy is proud of you.</div>':msgs.join('')}
    <div class="prows">${rows}</div>
    <div class="pweek">${weekDates(ds).map(d=>`<button class="pday ${d===ds?'sel':''} ${d>todayStr?'fut':''}" data-pday="${d}" aria-label="${dayLabel(d)}">${d>todayStr?'':prayerSVG(d,1)}<span>${DOW[parseD(d).getDay()].slice(0,2)}</span></button>`).join('')}</div>`;}
function setPrayer(ds,k,s){if(!state.settings.prayStart){const s2=clone(state.settings);s2.prayStart=ds<todayStr?ds:todayStr;state.settings.prayStart=s2.prayStart;store.saveSettings(s2).catch(()=>{});}const dd=dayDoc(ds);const pr={...(dd.pr||{})};if(s)pr[k]={s,at:Date.now()};else delete pr[k];patchDay(ds,{pr});}
function openPrayerFix(ds,k){const en=PRAYERS.find(p=>p[0]===k)[1];state.pfix={ds,k};
  $('dateTitle').textContent=en;$('dateBody').innerHTML=`<p class="hint">Change how ${en} on ${dayLabel(ds).toLowerCase()} is marked.</p>
    <button class="btn2" data-pset="on">I prayed it on time</button><button class="btn2" data-pset="late">I prayed it late</button><button class="btn2" data-pset="qada">I missed it and made it up (قضاء)</button><button class="btn2" data-pset="">Not prayed yet</button>`;openSheet('dateSheet');}
function dayScore(ds){const S=state.settings,dd=dayDoc(ds);const it=[];
  habits(S).forEach(h=>{const v=dd[h.id];
    if(h.kind==='check'){if(h.per<7){const other=weekDates(ds).filter(x=>x!==ds&&dayDoc(x)[h.id]).length;if(v||other<h.per)it.push(!!v);}else it.push(!!v);}
    else if(h.target>0)it.push((+v||0)>=h.target);});
  const f=dayFood(ds);it.push(f.length>0&&!f.some(x=>!x.plan));
  it.push(prayerSummary(ds).on===5);
  const done=it.filter(Boolean).length;return {done,total:it.length,pct:it.length?done/it.length:0};}
function strongStreak(){let d=new Date(today);if(dayScore(todayStr).pct<0.75)d.setDate(d.getDate()-1);let n=0;
  while(n<400&&dayScore(ymd(d)).pct>=0.75){n++;d.setDate(d.getDate()-1);}return n;}
function bestStreak(){let best=0,run=0;for(let i=120;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);if(dayScore(ymd(d)).pct>=0.75){run++;best=Math.max(best,run);}else run=0;}return best;}
function renderMotive(){
  const S=state.settings;const ds=state.hday;const sc=dayScore(ds);const st=strongStreak();
  const doy=Math.floor((today-new Date(today.getFullYear(),0,0))/864e5);const qs=quotes();const q=qs[doy%qs.length];
  const greet=ds!==todayStr?dayLabel(ds):greetKicker();const hello=ds!==todayStr?'Lina':greetLine(st,sc.pct);
  const R=58,C2=2*Math.PI*R;const pctR=Math.round(sc.pct*100);
  const msg=sc.pct>=1?'Perfect day. You did everything.':sc.pct>=0.75?'Strong day. One more to make it perfect.':sc.pct>=0.4?'Halfway there. Keep tapping.':sc.done>0?'Good start. Keep going.':"Let's start. Tap your first habit below.";
  const whys=(S.why||[]).filter(x=>x&&String(x).trim());const g=goalInfo();
  const ps=prayerSummary(ds);const wl=g.cur&&g.next?(g.cur-g.next.kg):null;
  $('hMotive').innerHTML=`<div class="mtop"><div class="mleft"><div><span class="label">${esc(greet)}</span><h2 class="hello${hello!=='Lina'?' greet':''}" dir="auto">${ds===todayStr?`<button class="greetbtn" data-greet aria-label="Another greeting">${esc(hello)}</button>`:esc(hello)}</h2></div>
      <span class="streak ${st>0?'on':''}">${IC.flame}<b class="num">${st}</b> day streak</span></div><div class="mcat">${catSVG(sc.pct>=1?'excited':sc.done===0?'open':'happy')}</div></div>
    <div class="dtiles">
      <button class="dtile ${sc.total&&sc.done>=sc.total?'done':''}" data-jump="hToday"><span class="k">Habits</span><b class="num">${sc.done}<i>/${sc.total}</i></b><small>done ${ds===todayStr?'today':''}</small></button>
      <button class="dtile ${ps.on>=5?'done':''}" data-jump="tPray"><span class="k">Prayers</span><b class="num">${ps.on}<i>/5</i></b><small>on time</small></button>
      <button class="dtile ${g.cur&&!g.next?'done':''}" data-sub="health:progress"><span class="k">Weight</span>${!g.cur?'<b>—</b><small>weigh in first</small>':wl!=null?`<b class="num">${wl.toFixed(1)}</b><small>kg to next goal</small>`:'<b>✓</b><small>goal reached</small>'}</button>
    </div>
    ${cycleChip()?`<button class="mchip" data-sub="health:cycle">${esc(cycleChip())}</button>`:''}`;
  if(ds===todayStr&&sc.pct>=1&&sc.total>0){let shown=null;try{shown=localStorage.getItem('lb.confetti')}catch(e){}
    if(shown!==todayStr){try{localStorage.setItem('lb.confetti',todayStr)}catch(e){}confetti();}}
}
function confetti(){if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const cv=document.createElement('canvas');cv.className='confetti';document.body.appendChild(cv);const W=cv.width=innerWidth,H=cv.height=innerHeight;const x=cv.getContext('2d');
  const cs=getComputedStyle(document.documentElement);const cols=[cs.getPropertyValue('--sun').trim()||'#E0A93A',cs.getPropertyValue('--violet').trim()||'#9D4EDD','#F6E3B0',cs.getPropertyValue('--hero1').trim()||'#3A1F5C','#FFFFFF','#F2C14E'];const ps=[...Array(120)].map(()=>({x:W/2+(Math.random()-.5)*80,y:H*0.35,vx:(Math.random()-.5)*12,vy:-Math.random()*12-4,r:Math.random()*6+3,c:cols[Math.floor(Math.random()*cols.length)],a:Math.random()*6}));
  let t=0;(function f(){x.clearRect(0,0,W,H);ps.forEach(p=>{p.vy+=0.35;p.x+=p.vx;p.y+=p.vy;p.a+=0.2;x.save();x.translate(p.x,p.y);x.rotate(p.a);x.fillStyle=p.c;x.fillRect(-p.r/2,-p.r/4,p.r,p.r/2);x.restore();});
    if(++t<110)requestAnimationFrame(f);else cv.remove();})();}
function renderHToday(){
  const ds=state.hday,S=state.settings,dd=dayDoc(ds);const hs=habits(S);
  const tap=(h,on,sub,skip)=>`<button class="tile ${on?'done':''} ${skip?'skip':''}" data-check="${esc(h.id)}" aria-pressed="${on}"><span class="tic">${IC[h.icon]||IC.star}</span><b>${esc(h.name)}</b><small>${sub}</small><span class="tick">${on?TICK:''}</span></button>`;
  const cnt=h=>{const v=+dd[h.id]||0,target=h.target,step=h.step||1,on=target&&v>=target;const nd=target?Math.ceil(target/step):0;
    const sub=target?`${v} of ${h.range?target+'–'+(target+1):target} ${esc(h.unit)}`:(h.id==='water'?`${v} ${esc(h.unit)} · <button class="link setlink" data-hedit="water">Set a minimum</button>`:`${v} ${esc(h.unit)} today`);
    const prog=!target?'':nd<=12?`<div class="dots3">${[...Array(Math.max(nd,Math.ceil(v/step)))].map((_,i)=>`<i class="${i<Math.floor(v/step)?'f':''}"></i>`).join('')}</div>`:`<div class="hbar"><span style="width:${Math.min(1,v/target)*100}%"></span></div>`;
    return `<div class="tile ${on?'done':''}"><span class="tic">${IC[h.icon]||IC.star}</span><b>${esc(h.name)}</b><small>${sub}</small>
     <div class="cnt"><button data-cnt="${esc(h.id)}:-${step}" aria-label="${step} ${esc(h.unit)} less">−</button><span class="num">${v}</span><button data-cnt="${esc(h.id)}:${step}" aria-label="${step} ${esc(h.unit)} more">+</button></div>${prog}</div>`;};
  const tiles=hs.map(h=>{if(h.kind==='count')return cnt(h);const on=!!dd[h.id];
    const wk=weekDates(ds).filter(x=>dayDoc(x)[h.id]).length;const skip=h.per<7&&!on&&wk>=h.per;
    const sub=skip?'Week done, skip today':[h.note?esc(h.note):'',h.per<7?`${wk}/${h.per} this week`:'Every day'].filter(Boolean).join(' · ');
    return tap(h,on,sub,skip);}).join('');
  $('hToday').innerHTML=`<div class="cardhead"><h2>Today's habits</h2><span class="hhead"><span class="label">${dayLabel(ds)}</span><button class="link" data-habits>Edit</button></span></div>
    ${hs.length?`<div class="tiles">${tiles}</div>`:`<p class="empty">No habits yet. <button class="link" data-habits>Add your first one</button></p>`}`;
}
function badges(){const S=state.settings,J=S.journey||{};const ws=sortedW();const cur=curWeight();const g=goalInfo();
  const best=bestStreak();let clean=0,ropeD=0,waterD=0;
  const dset=new Set([...state.food.map(f=>f.date),...state.days.map(d=>d.id)]);
  dset.forEach(ds=>{const f=dayFood(ds);if(f.length&&!f.some(x=>!x.plan))clean++;const dd=dayDoc(ds);if((+dd.rope||0)>=(+S.ropeTarget||3))ropeD++;if(+S.waterTarget&&(+dd.water||0)>=+S.waterTarget)waterD++;});
  const first=ws.length?+ws[0].kg:null;
  return [
   {t:'First weigh-in',d:'You stepped on the scale',ok:ws.length>0},
   {t:'Clean day',d:'A whole day on plan',ok:clean>=1},
   {t:'3-day streak',d:'Three strong days in a row',ok:best>=3},
   {t:'Skipper',d:'Jump-rope goal hit 5 times',ok:ropeD>=5},
   {t:'Hydrated',d:'Water minimum reached',ok:waterD>=1},
   {t:'7-day streak',d:'A full strong week',ok:best>=7},
   {t:'Clean week',d:'7 days fully on plan',ok:clean>=7},
   {t:'First kilo',d:'1 kg down since you started',ok:first!=null&&cur!=null&&first-cur>=1},
   {t:'August low',d:`Back to ${J.low||'—'} kg`,ok:cur!=null&&+J.low&&cur<=J.low},
   {t:'Below BMI 30',d:'A big health milestone',ok:g.bmi!=null&&g.bmi<30},
   {t:'30-day streak',d:'A strong month',ok:best>=30}];}
function renderBadges(){const b=badges();const n=b.filter(x=>x.ok).length;
  const FACES=[SCALEI,IC.plate,'<span class="mtxt">3<small>days</small></span>',IC.rope,IC.drop,'<span class="mtxt">7<small>days</small></span>','<span class="mtxt">7<small>clean</small></span>','<span class="mtxt">−1<small>kg</small></span>','<span class="mtxt">Aug<small>low</small></span>','<span class="mtxt">30<small>BMI</small></span>','<span class="mtxt">30<small>days</small></span>'];
  const TILT=[-6,4,-3,6,-5,3,-4,5,-2,6,-5];
  const stk=(x,i)=>`<div class="stk ${x.ok?'ok':''}"><div class="sf" ${x.ok?`style="transform:rotate(${TILT[i%TILT.length]}deg)"`:''}>${FACES[i]||IC.flame}</div><b>${esc(x.t)}</b><small>${esc(x.d)}</small></div>`;
  $('hBadges').innerHTML=`<div class="cardhead"><h2>Luffy's sticker book</h2><span class="label num">${n} of ${b.length}</span></div>
    <div class="stickers">${b.map(stk).join('')}</div>`;}

function renderHFood(){
  const ds=state.hday,items=dayFood(ds),off=items.filter(x=>!x.plan).length;
  let strip='';for(let i=13;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const x=ymd(d);
    strip+=`<button class="${dayStatus(x)} ${x===ds?'sel':''}" data-hday="${x}" aria-label="${dayLabel(x)}"><i></i><span>${DOW[d.getDay()].slice(0,1)}</span></button>`;}
  const pill=!items.length?'<span class="pill flat">Nothing logged</span>':off===0?'<span class="pill good">All on plan</span>':`<span class="pill ${off<=2?'warn':'bad'}">${off} off plan</span>`;
  const logged=MEALS.filter(([k])=>items.some(i=>i.meal===k));const empty=MEALS.filter(([k])=>!items.some(i=>i.meal===k));
  const meals=logged.map(([k,n])=>{const list=items.filter(i=>i.meal===k);
    return `<div class="meal"><div class="mealhead"><span class="label">${n}</span><button class="link" data-addmeal="${k}">+ Add</button></div>${list.map(fi=>{const open=state.openF===fi.id;return `<button class="entry" data-frow="${esc(fi.id)}" aria-expanded="${open}"><span class="fdot ${fi.plan?'on':'off'}"></span><span class="nm"><b>${esc(fi.name)}</b>${fi.feel?`<small>Feeling: ${esc(fi.feel)}</small>`:''}</span>${fi.kcal?`<span class="kcaltag num">${Math.round(fi.kcal)} kcal</span>`:''}${fi.plan?'':'<span class="pill bad">Off plan</span>'}</button>${open?`<div class="rowactions"><button class="del" data-fdel="${esc(fi.id)}">Delete</button></div>`:''}`;}).join('')}</div>`;}).join('')
    +(empty.length?`<div class="mealadd">${empty.map(([k,n])=>`<button data-addmeal="${k}">+ <b>${n}</b></button>`).join('')}</div>`:'');
  const kc=items.reduce((a,f)=>a+(+f.kcal||0),0);
  $('hFood').innerHTML=`<div class="cardhead"><h2>Food log</h2>${pill}</div>${kc>0?`<div class="kcalline"><span>Counted calories today</span><b class="num">${Math.round(kc)} kcal</b></div>`:''}
    <div class="legendline"><span><i style="background:var(--sun)"></i>All on plan</span><span><i style="background:var(--warn)"></i>1–2 off</span><span><i style="background:var(--bad)"></i>3+ off</span><span><i style="background:var(--surface-2);border:1px solid var(--line)"></i>Not logged</span></div>
    <div class="strip">${strip}</div>${meals}`;
}

function sortedW(){return [...state.weights].sort((a,b)=>a.date<b.date?-1:1);}
function avg7(ws,ds){const s=parseD(ds);s.setDate(s.getDate()-6);const a=ymd(s);const w=ws.filter(x=>x.date>=a&&x.date<=ds);return w.length?w.reduce((t,x)=>t+(+x.kg),0)/w.length:null;}
function curWeight(){const ws=sortedW();if(!ws.length)return null;const last=ws[ws.length-1];return avg7(ws,last.date)??+last.kg;}
function renderHWeight(){
  const S=state.settings,J=S.journey||{};const all=sortedW();
  const cut=new Date(today);cut.setDate(cut.getDate()-60);const ws=all.filter(w=>w.date>=ymd(cut));
  const last=all[all.length-1];const todayW=all.find(w=>w.date===todayStr);
  const avgNow=last?avg7(all,last.date):null;
  let sub='No weigh-ins yet. Start tomorrow morning.';
  if(last){const wa=parseD(last.date);wa.setDate(wa.getDate()-7);const avgPrev=avg7(all,ymd(wa));
    sub=`7-day average ${avgNow.toFixed(1)} kg`+(avgPrev!=null?` · ${avgNow-avgPrev>0?'+':''}${(avgNow-avgPrev).toFixed(1)} vs last week`:'');}
  const W=340,H=170,L=34,R=12,T=14,B=24;
  const vals=[...ws.map(w=>+w.kg),+J.start||null,+J.low||null].filter(v=>v);let svg='';
  if(vals.length){
    const mn=Math.floor(Math.min(...vals)-0.5),mx=Math.ceil(Math.max(...vals)+0.5);const y=v=>T+(mx-v)/(mx-mn)*(H-T-B);
    const t0=ws.length?parseD(ws[0].date).getTime():0,t1=ws.length?parseD(ws[ws.length-1].date).getTime():0;
    const x=ds=>ws.length<2?L+(W-L-R)/2:L+(parseD(ds).getTime()-t0)/(t1-t0||1)*(W-L-R);
    svg+=[mn,Math.round((mn+mx)/2),mx].map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end" font-size="10" fill="var(--muted)">${v}</text>`).join('');
    if(+J.start)svg+=`<line x1="${L}" x2="${W-R}" y1="${y(J.start)}" y2="${y(J.start)}" stroke="var(--muted)" stroke-dasharray="4 4"/><text x="${W-R}" y="${y(J.start)-4}" text-anchor="end" font-size="10" fill="var(--muted)">Aug start ${J.start}</text>`;
    if(+J.low)svg+=`<line x1="${L}" x2="${W-R}" y1="${y(J.low)}" y2="${y(J.low)}" stroke="var(--good)" stroke-dasharray="4 4"/><text x="${W-R}" y="${y(J.low)+13}" text-anchor="end" font-size="10" fill="var(--good)">Aug low ${J.low}</text>`;
    svg+=ws.map(w=>`<circle cx="${x(w.date)}" cy="${y(w.kg)}" r="3" fill="var(--muted)" opacity=".55"/>`).join('');
    if(ws.length>1)svg+=`<path d="${ws.map((w,i)=>(i?'L':'M')+x(w.date).toFixed(1)+' '+y(avg7(all,w.date)).toFixed(1)).join(' ')}" fill="none" stroke="var(--olive)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    if(ws.length){const lw=ws[ws.length-1];svg+=`<circle cx="${x(lw.date)}" cy="${y(avg7(all,lw.date))}" r="5" fill="var(--olive)" stroke="var(--surface)" stroke-width="2"/>`;
      svg+=`<text x="${L}" y="${H-6}" font-size="10" fill="var(--muted)">${shortD(ws[0].date)}</text>`;if(ws.length>1)svg+=`<text x="${W-R}" y="${H-6}" text-anchor="end" font-size="10" fill="var(--muted)">${shortD(lw.date)}</text>`;}
  }
  $('hWeight').innerHTML=`<div class="cardhead"><h2>Daily weigh-in</h2><span class="label">kg</span></div>
    <div class="wtop"><div><div class="wbig num">${last?(+last.kg).toFixed(1):'—'}<small> kg</small></div><div class="wsub num">${last?(todayW?'This morning':'Last: '+dayLabel(last.date))+' · ':''}${sub}</div></div></div>
    ${vals.length?`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily weight with 7-day average">${svg}</svg><div class="legendline" style="margin-top:6px"><span><i style="background:var(--muted);opacity:.55;border-radius:50%"></i>Daily weight</span><span><i style="background:var(--olive)"></i>7-day average</span></div>`:''}
    <div class="wform"><input id="wIn" inputmode="decimal" placeholder="${todayW?todayW.kg:'e.g. 86.4'}" aria-label="This morning's weight in kg"><button class="pay" id="wSave">${todayW?'Change today':"Save this morning"}</button></div>
    <p class="hint" style="margin-top:8px">Weigh every morning after waking, before eating or drinking. Single days jump around; the bold line is what counts.</p>
    ${all.length?`<details class="wlog"><summary>Past weigh-ins <span class="label num">${all.length}</span></summary>${[...all].reverse().slice(0,14).map(w=>`<div class="occ"><span>${dayLabel(w.date)}</span><span class="wl2"><b class="num">${(+w.kg).toFixed(1)} kg</b><button class="xbtn" data-wwdel="${esc(w.id)}" aria-label="Delete weigh-in of ${dayLabel(w.date)}">${XSVG}</button></span></div>`).join('')}</details>`:''}`;
  $('wSave').onclick=async()=>{const kg=parseNum($('wIn').value);if(!(kg>30&&kg<250)){toast('Enter your weight in kg, like 86.4');return;}
    try{await store.put('weights',{id:'w-'+todayStr,date:todayStr,kg:Math.round(kg*10)/10,createdAt:Date.now()});toast(`Saved ${kg.toFixed(1)} kg`);}catch(e){toast("Couldn't save. Check your connection and try again.");}};
}

/* ---------- motivation + goal ---------- */
function quotes(){const J=state.settings.journey||{};const lost=(+J.start&&+J.low)?(J.start-J.low).toFixed(1):null;
  return ["Your clothes are waiting for you. Every on-plan day brings them closer.",
  lost?`You lost ${lost} kg in one month in August. That's proof, not hope.`:"You've done this before. Same you, same plan.",
  "Hungry, or sad? Only one of those is fixed by food.",
  "The snack lasts five minutes. The scale remembers it for a week.",
  "One off-plan item doesn't cancel a good day. Keep going.",
  "Log it, even when it's bad. Hidden days are where the weight comes back.",
  "Drink a glass of water first. Then decide if you're still hungry.",
  "You don't need motivation every day. You need the checklist every day.",
  "Sugar wants a habit. You want your old clothes back.",
  "Tomorrow morning's number is decided by tonight's choices.",
  "Protein first, vegetables second, cravings last.",
  "Be kind to yourself and strict with sugar.",
  "One good week is a start. Four good weeks is a new you.",
  "If you eat the snack, log the snack. No guilt, just information.",
  "Your body already knows how to do this. It did it in August.",
  "Close the pack after one portion. Tomorrow's you says thank you.",
  "The scale is information, not a judgment.",
  "Small wins every day beat a perfect week once a year.",
  "When you feel low, call someone before you open a snack.",
  "You are not starting over. You are starting from experience."];}
function goalInfo(){const S=state.settings,J=S.journey||{};const h=(+S.heightCm||159)/100;const bw=b=>Math.round(b*h*h*10)/10;
  const cur=curWeight();const goal=+S.goalKg||bw(24.9);
  let r=[];if(+J.low)r.push({kg:+J.low,name:'Back to your August low',sub:'You reached this before'});
  r.push({kg:80,name:'Under 80 kg',sub:'First big number gone'});r.push({kg:bw(29.9),name:'BMI below 30',sub:'A big health milestone'});
  r.push({kg:75,name:'75 kg',sub:''});r.push({kg:70,name:'Under 70 kg',sub:''});
  r=r.filter(x=>x.kg>goal+0.4);r.push({kg:goal,name:S.goalKg?'Your goal':'Healthy BMI range',sub:S.goalKg?'Set by you':'Top of the healthy range for your height'});
  r.sort((a,b)=>b.kg-a.kg);r.forEach(x=>x.reached=cur!=null&&cur<=x.kg);const next=r.find(x=>!x.reached)||null;
  return {h,cur,goal,rungs:r,next,bmi:cur?cur/(h*h):null,healthy:[bw(18.5),bw(24.9)]};}
function figure(bmi,kind){const k=Math.max(0,Math.min(1,((bmi||25)-19)/17));
  const sh=15+5*k,wa=9+12*k,hip=15+12*k,arm=3.6+2.4*k,leg=4.2+3.4*k;const c=kind==='goal'?'var(--sun)':'var(--muted)';const op=kind==='goal'?1:.55;
  const d=`M46,47 L${50-sh},54 Q${50-sh-2},58 ${50-sh+2},68 Q${50-wa-3},86 ${50-wa},100 Q${50-hip},110 ${50-hip},124 L${50-hip-7},160 L${50+hip+7},160 L${50+hip},124 Q${50+hip},110 ${50+wa},100 Q${50+wa+3},86 ${50+sh-2},68 Q${50+sh+2},58 ${50+sh},54 L54,47 Z`;
  return `<svg viewBox="0 0 100 214" aria-hidden="true"><g fill="${c}" opacity="${op}"><circle cx="50" cy="30" r="12"/><rect x="46.5" y="40" width="7" height="9" rx="3"/>
    <path d="${d}"/><rect x="${50-sh-arm*2+0.5}" y="57" width="${arm*2}" height="56" rx="${arm}" transform="rotate(8 ${50-sh} 57)"/><rect x="${50+sh-0.5}" y="57" width="${arm*2}" height="56" rx="${arm}" transform="rotate(-8 ${50+sh} 57)"/>
    <rect x="${50-5-leg*2+leg}" y="158" width="${leg*2}" height="46" rx="${leg}"/><rect x="${50+5-leg}" y="158" width="${leg*2}" height="46" rx="${leg}"/></g></svg>`;}
function ladderHtml(g,start){const up=[...g.rungs].sort((a,b)=>a.kg-b.kg);let rows='';let youDone=false;
  const you=`<div class="lr you"><div class="lstep"><span class="lcat">${catSVG('happy',{noNight:1})}</span></div><span class="nm"><b>You are here</b><small>Climb one rung at a time</small></span><span class="kg num">${g.cur.toFixed(1)}</span></div>`;
  up.forEach((r,i)=>{if(!youDone&&r.reached){rows+=you;youDone=true;}
    const isNext=g.next===r;const top=i===0;
    rows+=`<div class="lr ${r.reached?'reached':''} ${isNext?'next':''} ${top?'top':''}"><div class="lstep"></div><span class="nm"><b>${esc(r.name)}</b><small>${r.reached?'Reached':isNext?`${(g.cur-r.kg).toFixed(1)} kg to go`:esc(r.sub||'')}</small></span><span class="kg num">${r.kg}</span></div>`;});
  if(!youDone)rows+=you;
  rows+=`<div class="lr floor"><div class="lstep"></div><span class="nm"><b>Where you started</b></span><span class="kg num">${start}</span></div>`;
  return `<div class="lad" role="list" aria-label="Weight milestones ladder">${rows}</div>`;}
function renderGoal(){const S=state.settings,J=S.journey||{};const g=goalInfo();
  if(!g.cur){$('hGoal').innerHTML=`<div class="cardhead"><h2>Your goal</h2></div><p class="empty">Weigh in once and your goal path appears here.</p>`;return;}
  const start=Math.max(+J.start||0,...state.weights.map(w=>+w.kg));const pct=Math.max(0,Math.min(1,(start-g.cur)/(start-g.goal||1)));
  const ws=sortedW();const c28=new Date(today);c28.setDate(c28.getDate()-28);const rec=ws.filter(w=>w.date>=ymd(c28));let pace='';
  if(rec.length>=4){const a=rec[0],z=rec[rec.length-1];const days=(parseD(z.date)-parseD(a.date))/864e5;
    if(days>=7){const perWk=(avg7(ws,a.date)-avg7(ws,z.date))/(days/7);
      if(perWk>0.05){const wks=(g.cur-g.goal)/perWk;const dt=new Date(today);dt.setDate(dt.getDate()+wks*7);pace=`Losing about ${perWk.toFixed(1)} kg a week. At this pace you reach ${g.goal} kg around <b>${MONTHS[dt.getMonth()]} ${dt.getFullYear()}</b>.`;}
      else pace='Your 7-day average isn\'t going down yet. Check the Patterns card below.';}}
  if(!pace)pace='After two weeks of daily weigh-ins, your pace and expected goal date show here.';
  $('hGoal').innerHTML=`<div class="cardhead"><h2>Your goal</h2><button class="link" data-open-settings>Edit</button></div>
    <div class="figs"><div class="fig">${figure(g.bmi,'now')}<b class="num">${g.cur.toFixed(1)} kg</b><small>Now</small></div><div class="arrow" aria-hidden="true"><svg width="22" height="14" viewBox="0 0 22 14"><path d="M1 7h18m-5-5 5 5-5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="fig">${figure(g.goal/(g.h*g.h),'goal')}<b class="num">${g.goal} kg</b><small>Goal</small></div></div>
    <p class="hint" style="text-align:center">An illustration of the direction, not an exact picture of your body.</p>
    <div class="dbar" style="margin-top:12px"><span style="width:${pct*100}%;background:var(--olive)"></span></div>
    <div class="pmeta num"><span>${(start-g.cur).toFixed(1)} kg down from ${start}</span><span>${(g.cur-g.goal).toFixed(1)} kg to go</span></div>
    <p class="hint" style="margin-top:8px">${pace}</p>
    <div class="bmi"><div><small>BMI now</small><b class="num">${g.bmi.toFixed(1)}</b></div><div><small>Healthy range at ${Math.round(g.h*100)} cm</small><b class="num">${g.healthy[0]}–${g.healthy[1]} kg</b></div></div>
    ${ladderHtml(g,start)}
    <p class="hint" style="margin-top:10px">BMI doesn't measure muscle. Because you have some muscle, a doctor may suggest a goal a little higher than the BMI range.</p>`;}

function renderHPatterns(){
  const ws=[...state.weights].sort((a,b)=>a.date<b.date?-1:1);
  const rows=[];const start=weekStart(todayStr);
  for(let i=0;i<8;i++){const s=new Date(start);s.setDate(s.getDate()-7*i);const dates=weekDates(ymd(s));const a=dates[0],z=dates[6];
    const foods=state.food.filter(f=>f.date>=a&&f.date<=z);const off=foods.filter(f=>!f.plan).length;
    const upto=dates.filter(d=>d<=todayStr);const logged=upto.filter(d=>foods.some(f=>f.date===d));
    const onDays=logged.filter(d=>!foods.some(f=>f.date===d&&!f.plan)).length;
    const wIn=ws.filter(w=>w.date>=a&&w.date<=z);const wEnd=wIn[wIn.length-1];const wPrev=ws.filter(w=>w.date<a).pop();
    if(!foods.length&&!wIn.length)continue;
    rows.push({a,z,off,logged:logged.length,days:upto.length,onDays,delta:wEnd&&wPrev?wEnd.kg-wPrev.kg:null,wEnd});}
  const maxOff=Math.max(1,...rows.map(r=>r.off));
  const since=new Date(today);since.setDate(since.getDate()-30);const sinceS=ymd(since);
  const cnt={};state.food.filter(f=>!f.plan&&f.date>=sinceS).forEach(f=>{cnt[f.name]=(cnt[f.name]||0)+1;});
  const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,3);
  let html=`<div class="cardhead"><h2>Patterns</h2><span class="label">Last 8 weeks</span></div>
    <p class="hint">When the scale goes up, look here first. Weeks with long red bars and missing days are usually the reason.</p>`;
  if(!rows.length)html+=`<p class="empty">Log food for a week and weigh in, and your weekly patterns will show here.</p>`;
  else html+=rows.map(r=>{const dp=r.delta==null?'':`<span class="pill ${r.delta>0.05?'bad':r.delta<-0.05?'good':'flat'} num">${r.delta>0?'+':''}${r.delta.toFixed(1)} kg</span>`;
    return `<div class="wkrow"><div class="wk1"><b class="num">${shortD(r.a)} – ${shortD(r.z)}</b>${dp}</div>
      <div class="wkbar"><span style="width:${r.off/maxOff*100}%"></span></div>
      <small class="num">${r.off} off-plan item${r.off===1?'':'s'} · ${r.onDays} of ${r.logged} logged days fully on plan${r.days-r.logged>0?` · ${r.days-r.logged} day${r.days-r.logged>1?'s':''} not logged`:''}</small></div>`;}).join('');
  const fc={};state.food.filter(f=>!f.plan&&f.feel&&f.date>=sinceS).forEach(f=>{fc[f.feel]=(fc[f.feel]||0)+1;});const ft=Object.entries(fc).sort((a,b)=>b[1]-a[1]).slice(0,3);
  if(ft.length)html+=`<div class="wkrow"><span class="label">Off-plan eating happened most when</span><ul class="insights" style="margin-top:8px">${ft.map(([n,c])=>`<li><span class="ic">${c}</span><p>You felt <b>${esc(n.toLowerCase())}</b></p></li>`).join('')}</ul></div>`;
  if(top.length)html+=`<div class="wkrow"><span class="label">Most common off-plan, last 30 days</span><ul class="insights" style="margin-top:8px">${top.map(([n,c],i)=>`<li><span class="ic">${i+1}</span><p><b>${esc(n)}</b> · ${c} time${c>1?'s':''}</p></li>`).join('')}</ul></div>`;
  $('hPatterns').innerHTML=html;
}

/* ---------- prices ---------- */
function priceRows(){const rows=[];
  state.entries.filter(e=>e.item&&+e.qty>0).forEach(e=>rows.push({item:e.item,unit:e.unit||'kg',ppu:(+e.amount)/(+e.qty),date:e.date,src:'buy',id:e.id,createdAt:e.createdAt||0}));
  state.prices.forEach(p=>rows.push({item:p.item,unit:p.unit||'kg',ppu:+p.ppu,date:p.date,src:'check',id:p.id,createdAt:p.createdAt||0}));
  return rows.filter(r=>r.ppu>0&&r.date);}
function knownItems(){const m=new Map();PRICE_ITEMS.forEach(([n,u])=>m.set(n.toLowerCase(),[n,u]));
  priceRows().sort((a,b)=>b.createdAt-a.createdAt).forEach(r=>{if(!m.has(r.item.toLowerCase()))m.set(r.item.toLowerCase(),[r.item,r.unit]);});return [...m.values()];}
function renderPrices(){
  const groups={};priceRows().forEach(r=>{const k=r.item.toLowerCase()+'|'+r.unit;(groups[k]=groups[k]||{item:r.item,unit:r.unit,rows:[]}).rows.push(r);});
  const list=Object.entries(groups).map(([k,g])=>{g.key=k;g.rows.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:a.createdAt-b.createdAt);g.last=g.rows[g.rows.length-1];return g;})
    .sort((a,b)=>a.last.date<b.last.date?1:-1);
  let html=`<div class="cardhead"><h2>Price board</h2><span class="label num">${list.length} item${list.length===1?'':'s'}</span></div>
    <p class="hint" style="margin-bottom:12px">Fills itself when you log a Food spend and say what you bought. Use <b>Add price</b> for prices you see at the market.</p>`;
  if(!list.length)html+=`<p class="empty">No prices yet. Next time you buy chicken or tuna, add the item and quantity to the spend.</p>`;
  else html+=`<div class="pgrid">${list.map(g=>{
    const l=g.last;const since=new Date(parseD(l.date));since.setDate(since.getDate()-30);const ss=ymd(since);
    const prev=g.rows.slice(0,-1).filter(r=>r.date>=ss);const avg=prev.length?prev.reduce((a,r)=>a+r.ppu,0)/prev.length:0;
    const low=g.rows.reduce((m,r)=>r.ppu<m.ppu?r:m,g.rows[0]);
    let pill='<span class="pill flat">First price</span>';
    if(avg){const r=l.ppu/avg;pill=r<=0.95?'<span class="pill good">Good price</span>':r>=1.05?'<span class="pill bad">Higher than usual</span>':'<span class="pill flat">Usual price</span>';}
    const pts=g.rows.slice(-12);let spark='';
    if(pts.length>1){const mn=Math.min(...pts.map(p=>p.ppu)),mx=Math.max(...pts.map(p=>p.ppu));
      spark=`<svg width="90" height="28" viewBox="0 0 90 28" aria-hidden="true"><path d="${pts.map((p,i)=>(i?'L':'M')+(i/(pts.length-1)*86+2).toFixed(1)+' '+(mx===mn?14:(24-(p.ppu-mn)/(mx-mn)*20)).toFixed(1)).join(' ')}" fill="none" stroke="var(--olive)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;}
    const open=state.openP===g.key;
    return `<div><button class="pcard" data-prow="${esc(g.key)}" aria-expanded="${open}">
      <div class="ptop"><div><b>${esc(g.item)}</b><div class="pprice num">${fmt2(l.ppu)}<small> / ${esc(g.unit)}</small></div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">${pill}${spark}</div></div>
      <div class="pmeta num"><span>${dayLabel(l.date)}${l.src==='check'?' · seen':' · bought'}</span><span>Lowest ${fmt2(low.ppu)} (${shortD(low.date)})${avg?` · 30-day avg ${fmt2(avg)}`:''}</span></div></button>
      ${open?`<div class="phist">${[...g.rows].reverse().slice(0,12).map(r=>`<div><span class="num">${shortD(r.date)} · ${r.src==='check'?'seen':'bought'}</span><span class="num"><b>${fmt2(r.ppu)}</b>${r.src==='check'?` <button class="del" data-pdel="${esc(r.id)}" style="margin-left:8px">Delete</button>`:''}</span></div>`).join('')}</div>`:''}</div>`;}).join('')}</div>`;
  $('pBoard').innerHTML=html;
}
const fmt2=n=>'₪'+(Math.round(n*10)/10).toLocaleString('en-US',{maximumFractionDigits:1});

/* ---------- food sheet ---------- */
let lastAdded=[];
function customFoods(plan){const known=new Set([...ON_FOODS,...OFF_FOODS].map(x=>x.toLowerCase()));const seen=new Set();const out=[];
  [...state.food].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).forEach(f=>{const k=f.name.toLowerCase();if(!!f.plan===plan&&!known.has(k)&&!seen.has(k)){seen.add(k);out.push(f.name);}});return out.slice(0,8);}
function openFood(meal){state.meal=meal||(state.hday===todayStr?autoMeal():'lunch');lastAdded=[];state.feel=null;state.scan=null;$('foodName').value='';syncFoodBtns();buildFood();openSheet('foodSheet');}
function buildFood(){
  $('foodTitle').textContent='Log food · '+dayLabel(state.hday);
  $('mealSeg').innerHTML=MEALS.map(([k,n])=>`<button data-meal="${k}" aria-pressed="${state.meal===k}">${n}</button>`).join('');
  $('onChips').innerHTML=[...ON_FOODS,...customFoods(true)].map(n=>`<button class="fchip on" data-food="${esc(n)}" data-plan="1">${esc(n)}</button>`).join('');
  $('offChips').innerHTML=[...OFF_FOODS,...customFoods(false)].map(n=>`<button class="fchip off" data-food="${esc(n)}" data-plan="0">${esc(n)}</button>`).join('');
  $('feelChips').innerHTML=FEELS.map(n=>`<button class="fchip ${state.feel===n?'sel':''}" data-feel="${n}" aria-pressed="${state.feel===n}">${n}</button>`).join('');
  renderScan();
  const mn=(MEALS.find(m=>m[0]===state.meal)||[])[1];
  $('addedList').innerHTML=lastAdded.length?`<span class="label">Just added</span>`+lastAdded.map(f=>`<span class="fchip ${f.plan?'on':'off'}">${esc(f.name)}${f.kcal?` · ${f.kcal} kcal`:''} · ${(MEALS.find(m=>m[0]===f.meal)||[])[1]}<button data-unadd="${esc(f.id)}" aria-label="Remove ${esc(f.name)}" style="border:0;background:none;padding:0;line-height:1">×</button></span>`).join(''):'';
}
function syncFoodBtns(){const has=$('foodName').value.trim().length>0;$('addOn').disabled=!has;$('addOff').disabled=!has;}
$('foodName').oninput=syncFoodBtns;
async function logFood(name,plan){const f={id:newId(),date:state.hday,meal:state.meal,name:String(name).trim().slice(0,40),plan:!!plan,createdAt:Date.now()};if(!plan&&state.feel)f.feel=state.feel;
  try{await store.put('food',f);lastAdded.push(f);buildFood();}catch(e){toast("Couldn't save. Check your connection and try again.");}}
$('addOn').onclick=()=>{const n=$('foodName').value.trim();if(n){logFood(n,true);$('foodName').value='';syncFoodBtns();}};
$('addOff').onclick=()=>{const n=$('foodName').value.trim();if(n){logFood(n,false);$('foodName').value='';syncFoodBtns();}};

/* ---------- snack scanner ---------- */
let sampleFn=null,canScan=false;
async function initSample(){try{if(window.claude&&typeof window.claude.use==='function'){sampleFn=await window.claude.use('sample');
  if(sampleFn){const l=await sampleFn.limits().catch(()=>null);canScan=!!(l&&l.images);}}}catch(e){sampleFn=null;canScan=false;}
  if(!$('foodSheet').hidden)renderScan();}
const SCAN_PROMPT='The image is a photo of a packaged food or snack, ideally its nutrition label. Read only what is printed. Reply with only this JSON object: {"product": string|null, "kcal_per_100g": number|null, "package_g": number|null, "serving_g": number|null, "kcal_per_serving": number|null, "kcal_package": number|null}. Use grams for weights (treat ml as grams). If energy is printed only in kJ, convert to kcal by dividing by 4.184. Use null for anything not printed. Do not guess.';
function scanKcal(sc){let p100=+sc.p100||0;if(!p100&&+sc.kServ&&+sc.serving)p100=sc.kServ/sc.serving*100;
  const pkg=+sc.pkg||0,srv=+sc.serving||0;let g=0;
  if(sc.portion==='pack')g=pkg;else if(sc.portion==='half')g=pkg/2;else if(sc.portion==='serving')g=srv;else g=+sc.grams||0;
  return {p100,g,kcal:p100&&g?p100*g/100:0};}
function portionLabel(sc){return sc.portion==='pack'?'whole pack':sc.portion==='half'?'half pack':sc.portion==='serving'?'1 serving':`${Math.round(+sc.grams||0)} g`;}
function renderScan(){const box=$('scanOut');const sc=state.scan;$('scanLabel').hidden=!canScan;
  const manualLink=`<button class="link" data-scanmanual>${canScan?'Or type the numbers yourself':'Type the label numbers'}</button>`;
  if(!sc){box.innerHTML=manualLink;return;}
  if(sc.status==='busy'){box.innerHTML='<p class="hint">Reading the label… this can take up to a minute.</p>';return;}
  if(sc.status==='error'){box.innerHTML=`<p class="err">${esc(sc.msg)}</p>${manualLink}`;return;}
  const k=scanKcal(sc);const has=(v)=>v?String(Math.round(v*10)/10):'';
  const opt=(id,t,sub,dis)=>`<button data-portion="${id}" aria-pressed="${sc.portion===id}" ${dis?'disabled':''}>${t}<small class="num">${sub}</small></button>`;
  const pk=k.p100&&sc.pkg?Math.round(k.p100*sc.pkg/100):null;
  box.innerHTML=`<div class="scanres">
    <div class="field"><label for="scName">Product</label><input id="scName" maxlength="40" value="${esc(sc.product||'')}" placeholder="e.g. Chocolate wafer"></div>
    <div class="three"><div class="field"><label for="scP100">kcal / 100 g</label><input id="scP100" inputmode="decimal" value="${has(k.p100)}"></div>
    <div class="field"><label for="scPkg">Pack (g)</label><input id="scPkg" inputmode="decimal" value="${has(sc.pkg)}"></div>
    <div class="field"><label for="scSrv">Serving (g)</label><input id="scSrv" inputmode="decimal" value="${has(sc.serving)}"></div></div>
    ${sc.status==='done'?'<p class="hint">Read from your photo. Check the numbers against the label before logging.</p>':''}
    <div class="portions">${opt('pack','Whole pack',pk?pk+' kcal':'needs pack size',!sc.pkg)}${opt('half','Half pack',pk?Math.round(pk/2)+' kcal':'needs pack size',!sc.pkg)}${opt('serving','1 serving',k.p100&&sc.serving?Math.round(k.p100*sc.serving/100)+' kcal':'needs serving size',!sc.serving)}${opt('grams','Grams I ate','type below')}</div>
    ${sc.portion==='grams'?`<div class="field"><label for="scG">Grams eaten</label><input id="scG" inputmode="decimal" value="${has(sc.grams)}"></div>`:''}
    <div class="kcalline" style="margin:0"><span>This portion</span><b class="num" id="scK">${k.kcal?Math.round(k.kcal)+' kcal':'—'}</b></div>
    <div class="two"><button class="planbtn off" data-scanlog="0" ${k.kcal?'':'disabled'}>Log as off plan</button><button class="planbtn" data-scanlog="1" ${k.kcal?'':'disabled'}>Log as on plan</button></div></div>`;
  const sync=()=>{sc.product=$('scName').value;sc.p100=parseNum($('scP100').value);sc.kServ=0;sc.pkg=parseNum($('scPkg').value);sc.serving=parseNum($('scSrv').value);if($('scG'))sc.grams=parseNum($('scG').value);
    const kk=scanKcal(sc);$('scK').textContent=kk.kcal?Math.round(kk.kcal)+' kcal':'—';box.querySelectorAll('[data-scanlog]').forEach(b=>b.disabled=!kk.kcal);
    const pkK=kk.p100&&sc.pkg?Math.round(kk.p100*sc.pkg/100):null;
    const upd=(id,dis,txt)=>{const el=box.querySelector(`[data-portion="${id}"]`);if(!el)return;el.disabled=dis;el.querySelector('small').textContent=txt;};
    upd('pack',!sc.pkg,pkK?pkK+' kcal':'needs pack size');upd('half',!sc.pkg,pkK?Math.round(pkK/2)+' kcal':'needs pack size');
    upd('serving',!sc.serving,kk.p100&&sc.serving?Math.round(kk.p100*sc.serving/100)+' kcal':'needs serving size');};
  box.querySelectorAll('input').forEach(i=>{i.oninput=sync;});}
$('scanFile').onchange=async()=>{const file=$('scanFile').files&&$('scanFile').files[0];$('scanFile').value='';if(!file||!sampleFn)return;
  state.scan={status:'busy'};renderScan();
  try{const r=await sampleFn.json(SCAN_PROMPT,{images:[file],modelTier:'quick'});const num=v=>{const n=Number(v);return isFinite(n)&&n>0?n:0;};
    const sc={status:'done',product:r&&r.product?String(r.product).slice(0,40):'',p100:num(r&&r.kcal_per_100g),kServ:num(r&&r.kcal_per_serving),pkg:num(r&&r.package_g),serving:num(r&&r.serving_g)};
    if(!sc.p100&&num(r&&r.kcal_package)&&sc.pkg)sc.p100=num(r.kcal_package)/sc.pkg*100;
    if(!sc.p100&&sc.kServ&&sc.serving)sc.p100=sc.kServ/sc.serving*100;
    if(!sc.p100&&!sc.kServ){state.scan={status:'error',msg:"Couldn't find calories on that photo. Try a closer, sharper photo of the nutrition table."};}
    else{sc.portion=sc.pkg?'pack':sc.serving?'serving':'grams';state.scan=sc;}}
  catch(e){const m={not_granted:'Allow this page to use Claude to read photos, then try again.',image_rejected:"That photo couldn't be read. Try a different, sharper photo.",rate_limited:'Too many scans right now. Try again in a minute.',refused:"Couldn't read that photo. Type the numbers instead.",invalid_json:"Couldn't read the label clearly. Try again or type the numbers.",images_unavailable:'Photo reading is not available here. Type the numbers instead.',session_expired:'Sign in to Claude again, then try.'};
    if(e&&(e.code==='images_unavailable'||e.code==='not_granted'||e.code==='sampling_disabled'))canScan=false;
    state.scan={status:'error',msg:m[e&&e.code]||"Couldn't read the label. Try again, or type the numbers."};}
  renderScan();};
async function logScan(plan){const sc=state.scan;if(!sc)return;const k=scanKcal(sc);if(!k.kcal)return;
  const name=((sc.product||'Snack').trim()+' · '+portionLabel(sc)).slice(0,40);
  const f={id:newId(),date:state.hday,meal:state.meal,name,plan:!!plan,kcal:Math.round(k.kcal),createdAt:Date.now()};if(!plan&&state.feel)f.feel=state.feel;
  try{await store.put('food',f);lastAdded.push(f);state.scan=null;buildFood();toast(`Logged ${f.kcal} kcal`);}catch(e){toast("Couldn't save. Check your connection and try again.");}}

/* ---------- price sheet ---------- */
function fillItemList(){$('itemList').innerHTML=knownItems().map(([n])=>`<option value="${esc(n)}"></option>`).join('');}
function unitFor(name){const k=knownItems().find(([n])=>n.toLowerCase()===String(name).trim().toLowerCase());return k?k[1]:null;}
function openPrice(){state.priceCur='NIS';$('pCurBox').innerHTML=curSeg('price','NIS');fillItemList();$('pItem').value='';$('pPrice').value='';$('pUnit').value='kg';$('pDate').value=todayStr;$('pDate').max=todayStr;
  $('pSugg').innerHTML=knownItems().slice(0,10).map(([n])=>`<button type="button" data-psugg="${esc(n)}">${esc(n)}</button>`).join('');
  $('pSugg').querySelectorAll('[data-psugg]').forEach(b=>b.onclick=()=>{$('pItem').value=b.dataset.psugg;const u=unitFor(b.dataset.psugg);if(u)$('pUnit').value=u;valPrice();});
  valPrice();openSheet('priceSheet');}
function valPrice(){const ok=$('pItem').value.trim()&&parseNum($('pPrice').value)>0&&$('pDate').value;$('savePrice').disabled=!ok;return ok;}
$('pItem').oninput=()=>{const u=unitFor($('pItem').value);if(u)$('pUnit').value=u;valPrice();};$('pPrice').oninput=valPrice;$('pDate').oninput=valPrice;
$('savePrice').onclick=async()=>{if(!valPrice())return;const raw=parseNum($('pPrice').value);const usd=state.priceCur==='USD';const p={id:newId(),item:$('pItem').value.trim().slice(0,30),unit:$('pUnit').value,ppu:Math.round((usd?raw*rate():raw)*100)/100,date:$('pDate').value,createdAt:Date.now()};if(usd){p.origCur='USD';p.origPrice=raw;}
  try{await store.put('prices',p);closeSheets();toast(`Saved ${p.item} at ${fmt2(p.ppu)} / ${p.unit}`);}catch(e){toast("Couldn't save. Check your connection and try again.");}};

/* ---------- day nav ---------- */
$('prevD').onclick=()=>{const d=parseD(state.hday);d.setDate(d.getDate()-1);state.hday=ymd(d);state.openF=null;render();};
$('nextD').onclick=()=>{if(state.hday>=todayStr)return;const d=parseD(state.hday);d.setDate(d.getDate()+1);state.hday=ymd(d);state.openF=null;render();};

/* ---------- interactions ---------- */
let toastT;
function toast(msg,undo){$('toastMsg').textContent=msg;const u=$('toastUndo');u.hidden=!undo;u.onclick=()=>{$('toast').hidden=true;undo&&undo();};
  $('toast').hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{$('toast').hidden=true},undo?5000:2600);}
function openSheet(id){$('scrim').hidden=false;$(id).hidden=false;}
function closeSheets(){const wasTb=!$('tbSheet').hidden;$('scrim').hidden=true;['addSheet','setSheet','foodSheet','priceSheet','debtSheet','itemSheet','outfitSheet','clTipSheet','recipeSheet','importSheet','editSheet','productSheet','billsSheet','wishSheet','recapSheet','personSheet','dateSheet','lookSheet','moodSheet','saySheet','habitSheet','incSheet','tbSheet'].forEach(id=>$(id).hidden=true);releaseAwake();if(wasTb){state.tb=null;render();}}
$('scrim').onclick=closeSheets;
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeSheets);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){toggleTagMenu(false);closeSheets();}if(e.key==='Enter'&&e.target&&e.target.id==='ntNew'){e.preventDefault();ntAdd();}});

$('prevM').onclick=()=>{const ks=periodKeys();const i=ks.indexOf(state.month);if(i>0){state.month=ks[i-1];state.openRow=null;render();}};
$('nextM').onclick=()=>{const ks=periodKeys();const i=ks.indexOf(state.month);if(i>=0&&i<ks.length-1){state.month=ks[i+1];state.openRow=null;render();}};

document.addEventListener('click',async ev=>{
  const t=ev.target.closest('button');if(!t)return;



  if(t.dataset.pray){const ds=state.hday,k=t.dataset.pray;const cur=(dayDoc(ds).pr||{})[k];const ps=prayerState(ds,k);if((cur&&cur.s)||ps==='miss'||ps==='off'||ds<todayStr){openPrayerFix(ds,k);return;}
    if(ds===todayStr&&nowMin()<prayerWindows(ds)[k][0]){toast(`${PRAYERS.find(p=>p[0]===k)[1]} hasn't started yet.`);return;}
    const v=judgeTap(ds,k);setPrayer(ds,k,v);const en=PRAYERS.find(p=>p[0]===k)[1];
    if(v==='on'){toast(`${en} on time ✓`);if(prayerSummary(ds).on===5)confetti();}else if(v==='late')toast(`${en} marked late. Tomorrow, on time.`);else toast(`${en} marked as made up (قضاء).`);return;}
  if(t.dataset.qada){setPrayer(state.hday,t.dataset.qada,'qada');toast('Marked as made up (قضاء). The gap stays.');return;}
  if(t.dataset.pset!==undefined&&state.pfix){setPrayer(state.pfix.ds,state.pfix.k,t.dataset.pset||null);state.pfix=null;closeSheets();return;}
  if(t.dataset.pday){if(t.dataset.pday<=todayStr){state.hday=t.dataset.pday;render();}return;}


  if(t.dataset.nf){state.nf=t.dataset.nf;renderNotes();return;}
  if(t.dataset.note){openNote(t.dataset.note);return;}
  if(t.dataset.nesettag){state.nedit.tag=t.dataset.nesettag;$('nePick').innerHTML=ntPickHTML(state.nedit.tag);return;}
  if(t.dataset.ntpick){nDraft.tag=t.dataset.ntpick;try{localStorage.setItem('lb.ntag',nDraft.tag)}catch(e){}toggleTagMenu(false);renderNotes();return;}
  if(t.dataset.ntman!==undefined){openTagMan();return;}
  if(t.dataset.ntcol){ntSync();const x=state.ntm[+t.dataset.ntcol];x.c=(x.c+1)%NT_COL.length;renderTagMan();return;}
  if(t.dataset.ntdel){ntSync();const x=state.ntm[+t.dataset.ntdel];x.gone=!x.gone;renderTagMan();return;}
  if(t.dataset.ntadd!==undefined){ntAdd();return;}
  if(t.dataset.ntsave!==undefined){ntSave();return;}
  if(t.dataset.nepin!==undefined){const n=state.nedit;n.pinned=!n.pinned;t.textContent=n.pinned?'Unpin':'📌 Pin';return;}
  if(t.dataset.necopy!==undefined){try{await navigator.clipboard.writeText($('neText').value);toast('Copied');}catch(e){toast("Couldn't copy here.");}return;}
  if(t.dataset.nelabel!==undefined){const n=state.notes.find(x=>x.id===state.nedit.id);closeSheets();if(n)labelNote(n);return;}
  if(t.dataset.nesave!==undefined){const n={...state.nedit};n.text=$('neText').value.slice(0,4000);if($('neLabel'))n.label=$('neLabel').value.trim().slice(0,40);const m=n.text.match(URLRE);if(m)n.url=m[1];delete n.labelling;
    try{await store.put('notes',n);closeSheets();}catch(e){toast("Couldn't save. Try again.");}return;}
  if(t.dataset.nedel!==undefined){const n=state.notes.find(x=>x.id===state.nedit.id);if(!n)return;try{await store.del('notes',n.id);closeSheets();toast('Note deleted',()=>store.put('notes',n).catch(()=>{}));}catch(e){toast("Couldn't delete. Try again.");}return;}
  if(t.dataset.tbopen){openTasbih(t.dataset.tbopen);return;}
  if(t.dataset.tbpick){state.tb.id=t.dataset.tbpick;renderTbSheet();return;}
  if(t.dataset.tbundo!==undefined){const id=state.tb.id;setTb(todayStr,id,tbCount(todayStr,id)-1);renderTbSheet();return;}
  if(t.dataset.tbbeads!==undefined){state.tb.beads=pickBeads();renderTbSheet();return;}
  if(t.dataset.tbreset!==undefined){const id=state.tb.id,prev=tbCount(todayStr,id);setTb(todayStr,id,0);renderTbSheet();toast('Count reset',()=>{setTb(todayStr,id,prev);renderTbSheet();});return;}
  if(t.dataset.tbnew!==undefined){const name=(prompt('What would you like to say? (Arabic or English)')||'').trim().slice(0,40);if(!name)return;const goal=Math.max(1,Math.min(1000,Math.round(+prompt('How many times a day?','100')||100)));
    const s2=clone(state.settings);const id='d'+newId();s2.customDhikr=[...(s2.customDhikr||[]),{id,name,ar:name,goal}];state.settings=s2;store.saveSettings(s2).catch(()=>{});state.tb.id=id;renderTbSheet();return;}
  if(t.dataset.income!==undefined){openIncome({salfor:t.dataset.salfor});return;}
  if(t.dataset.ikind){const d=state.inc;d.kind=t.dataset.ikind;if(!d.id&&d.kind.startsWith('sal:')&&d.src!=='kydzzo'){d.src='kydzzo';const inc=state.settings.incomes.find(i=>i.id==='kydzzo');if(inc){d.name=inc.name;d.amt=String(Math.round(netUSD(inc)));d.cur='USD';}}renderIncome();return;}
  if(t.dataset.incview){openIncome({id:t.dataset.incview});return;}
  if(t.dataset.isrc){const d=state.inc,S=state.settings;d.src=t.dataset.isrc;const inc=S.incomes.find(i=>i.id===d.src);d.name=inc?inc.name:'Other';if(!d.id){d.amt=inc?String(Math.round(netUSD(inc))):'';d.cur=inc?'USD':'NIS';}renderIncome();return;}
  if(t.dataset.icur){state.inc.cur=t.dataset.icur;renderIncome();return;}
  if(t.dataset.isave!==undefined){saveIncome();return;}
  if(t.dataset.iask!==undefined){state.inc.confirm=true;renderIncome();return;}
  if(t.dataset.idel!==undefined){const prev=clone(state.settings);const s2=clone(state.settings);s2.incomeLog=(s2.incomeLog||[]).filter(x=>x.id!==state.inc.id);state.settings=s2;state.month=null;
    closeSheets();render();
    try{await store.saveSettings(s2);toast('Income deleted',()=>{state.settings=prev;state.month=null;store.saveSettings(prev).catch(()=>{});render();});}catch(e){console.error(e);state.settings=prev;state.month=null;render();toast("Couldn't delete. Try again.");}return;}
  if(t.dataset.habits!==undefined){closeSheets();openHabits();return;}
  if(t.dataset.hedit){const h=habits().find(x=>x.id===t.dataset.hedit);if(!h)return;if($('habitSheet').hidden){closeSheets();openSheet('habitSheet');}state.hab={mode:'form',h:{...h},isNew:false};renderHabitSheet();return;}
  if(t.dataset.hnew!==undefined){state.hab={mode:'form',h:{name:'',icon:'star',kind:'check',per:7,target:'',unit:'',step:1,note:''},isNew:true};renderHabitSheet();return;}
  if(t.dataset.hf){const [k,v]=t.dataset.hf.split(':');const h=state.hab.h;h[k]=(k==='per'||k==='step')?+v:v;if(k==='kind'&&v==='count'&&!h.unit)h.unit='times';renderHabitSheet();return;}
  if(t.dataset.hback!==undefined){state.hab={mode:'list'};renderHabitSheet();return;}
  if(t.dataset.hsave!==undefined){saveHabit();return;}
  if(t.dataset.hrm){removeHabit(t.dataset.hrm);return;}
  if(t.dataset.hpre){const p=(state.hab&&state.hab.pre||[])[+t.dataset.hpre];if(p)addPreset(p);return;}
  if(t.dataset.greet!==undefined){state.greetN=(state.greetN||0)+1;renderMotive();return;}
  if(t.dataset.dsort){const s2=clone(state.settings);s2.debtSort=t.dataset.dsort;state.settings.debtSort=s2.debtSort;render();try{await store.saveSettings(s2);}catch(e){}return;}
  if(t.dataset.mem){openMemory(t.dataset.mem);return;}
  if(t.dataset.memall!==undefined){state.memAll=!state.memAll;render();return;}
  if(t.dataset.memask!==undefined){state.dlog.confirm=true;renderDateLog();return;}
  if(t.dataset.memdel!==undefined){const m=state.dates.find(x=>x.id===state.dlog.id);if(!m)return;try{await store.del('dates',m.id);closeSheets();toast('Memory deleted',()=>store.put('dates',m).catch(()=>{}));}catch(e){toast("Couldn't delete. Try again.");}return;}
  if(t.dataset.wdel){const w=state.wishes.find(x=>x.id===t.dataset.wdel);if(!w)return;try{await store.del('wishes',w.id);toast(w.status==='bought'&&+w.price>0?'Wish deleted. Its spend stays in Money.':'Wish deleted',()=>store.put('wishes',w).catch(()=>{}));}catch(e){toast("Couldn't delete. Try again.");}return;}
  if(t.dataset.wwdel){const w=state.weights.find(x=>x.id===t.dataset.wwdel);if(!w)return;try{await store.del('weights',w.id);toast(`Deleted ${(+w.kg).toFixed(1)} kg`,()=>store.put('weights',w).catch(()=>{}));}catch(e){toast("Couldn't delete. Try again.");}return;}
  if(t.dataset.giftdel){const [pid,gi]=t.dataset.giftdel.split(':');const p=state.people.find(x=>x.id===pid);if(!p)return;const g=(p.gifts||[])[+gi];if(!g)return;
    try{await store.put('people',{...p,gifts:p.gifts.filter((_,k)=>k!==+gi)});toast(+g.price>0?'Gift removed. Its spend stays in Money.':'Gift removed',()=>store.put('people',p).catch(()=>{}));}catch(e){toast("Couldn't delete. Try again.");}return;}
  if(t.dataset.hometab){state.tab=state.homeTab=t.dataset.hometab;try{history.replaceState(null,'','#'+state.tab)}catch(e){}window.scrollTo(0,0);render();return;}
  if(t.dataset.tab){state.tab=t.dataset.tab==='home'?state.homeTab:t.dataset.tab;try{history.replaceState(null,'','#'+state.tab)}catch(e){}window.scrollTo(0,0);render();return;}
  if(t.dataset.jump){const el=$(t.dataset.jump);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(t.dataset.sub){const [tb,v]=t.dataset.sub.split(':');state.sub[tb]=v;if(['money','health','kitchen'].includes(tb)&&state.tab!==tb){state.tab=tb;try{history.replaceState(null,'','#'+tb)}catch(e){}}window.scrollTo(0,0);render();return;}
  if(t.dataset.bgset){const kind=!$('itemSheet').hidden?'closet':'products';const obj=kind==='closet'?state.closet.find(x=>x.id===state.openItem):prodById(state.openProd);if(!obj)return;
    const prev=state.bgEdit&&state.bgEdit.id===obj.id?state.bgEdit:{id:obj.id,tol:obj.tol||38};state.bgEdit={...prev,bg:t.dataset.bgset,busy:false};kind==='closet'?renderItem():renderProduct();return;}
  if(t.dataset.bgapply!==undefined){bgApply(!$('itemSheet').hidden?'closet':'products');return;}
  if(t.dataset.mode){applyMode(t.dataset.mode);const s2=clone(state.settings);s2.mode=t.dataset.mode;state.settings.mode=s2.mode;syncModeSeg();try{await store.saveSettings(s2);}catch(e){}return;}
  if(t.dataset.pick){applyLook(t.dataset.pick);const s2=clone(state.settings);s2.look=t.dataset.pick;state.settings.look=t.dataset.pick;$('themeBox').innerHTML=themePicker();try{await store.saveSettings(s2);}catch(e){}return;}
  if(t.dataset.fav){const s2=clone(state.settings);const f=new Set(s2.favLooks||[]);f.has(t.dataset.fav)?f.delete(t.dataset.fav):f.add(t.dataset.fav);s2.favLooks=[...f];state.settings.favLooks=s2.favLooks;$('themeBox').innerHTML=themePicker();try{await store.saveSettings(s2);}catch(e){}return;}
  if(t.dataset.ldel){const s2=clone(state.settings);s2.customLooks=(s2.customLooks||[]).filter(c=>c.id!==t.dataset.ldel);s2.favLooks=(s2.favLooks||[]).filter(x=>x!==t.dataset.ldel);if(s2.look===t.dataset.ldel){s2.look='royal';applyLook('royal');}
    state.settings=s2;injectCustom(s2.customLooks);$('themeBox').innerHTML=themePicker();try{await store.saveSettings(s2);}catch(e){}return;}
  if(t.dataset.makelook!==undefined){closeSheets();openCreator();return;}
  if(t.dataset.mood){chooseMood(t.dataset.mood);return;}
  if(t.dataset.moodskip!==undefined){try{localStorage.setItem('lb.moodDay',todayStr)}catch(e){}closeSheets();return;}
  if(t.dataset.saygo!==undefined){runSay();return;}
  if(t.dataset.sayredo!==undefined){state.say.items=null;renderSay();return;}
  if(t.dataset.sayadd!==undefined){applySay();return;}
  if(t.dataset.person){if(t.dataset.gotopeople!==undefined){state.tab='people';render();}openPerson(t.dataset.person);return;}
  if(t.dataset.addpartner!==undefined){state.openPerson=null;state.pedit=blankPerson(true);renderPersonForm();openSheet('personSheet');return;}
  if(t.dataset.pedit!==undefined){editPerson(state.people.find(x=>x.id===state.openPerson));return;}
  if(t.dataset.pask!==undefined){state.pConfirm=true;renderPersonSheet();return;}
  if(t.dataset.pdel!==undefined){const p=state.people.find(x=>x.id===state.openPerson);if(!p)return;try{await store.del('people',p.id);closeSheets();toast(`${p.name} removed`,()=>store.put('people',p).catch(()=>{}));}catch(e){toast("Couldn't delete. Try again.");}return;}
  if(t.dataset.prel){state.pedit.rel=t.dataset.prel;renderPersonForm();return;}
  if(t.dataset.dadd!==undefined){state.pedit.dates=state.pedit.dates||[];state.pedit.dates.push({label:'',date:''});renderPersonForm();return;}
  if(t.dataset.drm){state.pedit.dates.splice(+t.dataset.drm,1);renderPersonForm();return;}
  if(t.dataset.newidea!==undefined){const cur=state.dateIdea||'';let n;do{n=DATE_IDEAS[Math.floor(Math.random()*DATE_IDEAS.length)];}while(n===cur&&DATE_IDEAS.length>1);state.dateIdea=n;render();return;}
  if(t.dataset.logdate!==undefined){openDateLog();return;}
  if(t.dataset.giftsave){const p=state.people.find(x=>x.id===t.dataset.giftsave);const gf=p&&giftFund(p);if(!gf)return;const amt=Math.min(gf.perMonth,gf.left);
    const e={id:newId(),amount:amt,cat:'savings',personId:p.id,note:`Gift for ${p.name}`,date:todayStr,createdAt:Date.now()};try{await store.addEntry(e);toast(`${fmt(amt)} set aside for ${p.name}`,()=>store.delEntry(e.id));}catch(err){toast("Couldn't save. Try again.");}return;}
  if(t.dataset.giftlog){const p=state.people.find(x=>x.id===t.dataset.giftlog);if(!p)return;const name=$('gName').value.trim();if(!name){toast('Write what you gave.');return;}const price=parseNum($('gPrice').value);
    try{await store.put('people',{...p,gifts:[...(p.gifts||[]),{name:name.slice(0,40),price,date:todayStr}]});if(price>0){await store.addEntry({id:newId(),amount:price,cat:'gifts',note:`Gift for ${p.name}: ${name}`,date:todayStr,createdAt:Date.now()});}toast(price>0?`Logged · ${fmt(price)} under Gifts`:'Logged');}catch(e){toast("Couldn't save. Try again.");}return;}
  if(t.dataset.wantwish){closeSheets();state.tab='money';state.sub.money='wishlist';render();openWish();state.wnew.cat='gifts';state.wnew.name=t.dataset.wantwish;renderWishForm();return;}
  if(t.dataset.billpay){const b=billsList(state.settings).find(x=>x.id===t.dataset.billpay);if(!b)return;const st=billState(b,billMonth(state.month));const amt=Math.max(0,billNIS(b)-st.paid);
    const e={id:newId(),amount:Math.round(amt*100)/100,cat:b.cat,billId:b.id,note:b.name,date:defaultDate(),createdAt:Date.now()};if(b.cur==='USD'){e.origCur='USD';e.origAmt=Math.round(amt/rate()*100)/100;}
    try{await store.addEntry(e);toast(`${b.name} paid · ${fmt(amt)}`,()=>store.delEntry(e.id));}catch(err){toast("Couldn't save. Try again.");}return;}
  if(t.dataset.editbills!==undefined){openBills();return;}
  if(t.dataset.badd!==undefined){state.bedit.push({id:'b'+newId(),name:'',amount:'',cat:'other',day:''});renderBillEdit();return;}
  if(t.dataset.brm){state.bedit.splice(+t.dataset.brm,1);renderBillEdit();return;}
  if(t.dataset.bsave!==undefined){const bills=state.bedit.filter(b=>String(b.name).trim()&&parseNum(b.amount)>0).map(b=>({id:b.id,name:String(b.name).trim().slice(0,30),amount:parseNum(b.amount),cur:b.cur==='USD'?'USD':'NIS',cat:b.cat||'other',day:Math.min(31,Math.max(0,Math.round(parseNum(b.day))))||null}));
    const s2=clone(state.settings);s2.bills=bills;try{await store.saveSettings(s2);closeSheets();toast('Bills saved');}catch(e){toast("Couldn't save. Try again.");}return;}
  if(t.dataset.wbuy){const w=state.wishes.find(x=>x.id===t.dataset.wbuy);if(!w)return;const mc=(WCAT[wcatOf(w)]||WCAT.other).money;
    try{await store.put('wishes',{...w,status:'bought',decided:todayStr});let e=null;if(+w.price>0){e={id:newId(),amount:Math.round(wishNIS(w)*100)/100,cat:mc,note:w.name,date:todayStr,createdAt:Date.now()};if(mc==='other')e.label='Wishlist';if(w.cur==='USD'){e.origCur='USD';e.origAmt=+w.price;}await store.addEntry(e);}
      toast(e?`Enjoy it! ${wishMoney(w)} logged under ${mc==='other'?'Wishlist':(CAT[mc]||CAT.other).name}`:'Enjoy it!',e?()=>store.delEntry(e.id):null);}catch(err){toast("Couldn't save. Try again.");}return;}
  if(t.dataset.wf){state.wf=t.dataset.wf;render();return;}
  if(t.dataset.wcat){state.wnew.cat=t.dataset.wcat;renderWishForm();return;}
  if(t.dataset.curg){const g=t.dataset.curg,c=t.dataset.cur;if(g==='wish'){state.wnew.cur=c;t.parentNode.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cur===c)));}
    else if(g==='add'){state.addCur=c;syncCur();}else if(g==='price'){state.priceCur=c;$('pCurBox').innerHTML=curSeg('price',c);}
    else if(g.startsWith('bill')){const i=+g.slice(4);state.bedit[i].cur=c;renderBillEdit();}return;}
  if(t.dataset.wskip){const w=state.wishes.find(x=>x.id===t.dataset.wskip);if(!w)return;try{await store.put('wishes',{...w,status:'skipped',decided:todayStr});toast(w.price?`Nice. ${wishMoney(w)} stays with you.`:'Let go. Nice.');}catch(err){toast("Couldn't save. Try again.");}return;}
  if(t.dataset.rmon){const [y,m]=state.rmonth.split('-').map(Number);const d=new Date(y,m-1+(+t.dataset.rmon),1);const k=d.getFullYear()+'-'+pad(d.getMonth()+1);if(k>curMonth)return;state.rmonth=k;renderRecap();return;}
  if(t.dataset.recap){try{localStorage.setItem('lb.recapSeen',t.dataset.recap)}catch(e){}openRecap(t.dataset.recap);render();return;}
  if(t.dataset.backup!==undefined){downloadBackup();return;}
  if(t.dataset.rcancel!==undefined){state._restore=null;$('restoreBox').innerHTML='';return;}
  if(t.dataset.rgo!==undefined){const o=state._restore;if(!o)return;$('restoreBox').innerHTML='<p class="hint">Restoring…</p>';await restoreBackup(o);state._restore=null;$('restoreBox').innerHTML='';return;}
  if(t.dataset.cday){state.cday=t.dataset.cday;render();return;}
  if(t.dataset.cmon){const [y,m]=(state.cmonth||todayStr.slice(0,7)).split('-').map(Number);const d=new Date(y,m-1+(+t.dataset.cmon),1);state.cmonth=d.getFullYear()+'-'+pad(d.getMonth()+1);render();return;}
  if(t.dataset.pstart){startPeriod(t.dataset.pstart);return;}
  if(t.dataset.pend){endPeriod(t.dataset.pend);return;}
  if(t.dataset.pdelstart){const p=state.cycle.find(x=>x.id===t.dataset.pdelstart);if(!p)return;try{await store.del('cycle',p.id);toast('Period removed',()=>store.put('cycle',p).catch(()=>{}));}catch(e){toast("Couldn't remove. Try again.");}return;}
  if(t.dataset.flow){const ds=state.cday||todayStr;const cur=dayDoc(ds).flow;patchDay(ds,{flow:cur===t.dataset.flow?null:t.dataset.flow});return;}
  if(t.dataset.sym){const ds=state.cday||todayStr;const cur=[...(dayDoc(ds).sym||[])];const i=cur.indexOf(t.dataset.sym);if(i>=0)cur.splice(i,1);else cur.push(t.dataset.sym);patchDay(ds,{sym:cur});return;}
  if(t.dataset.prod){openProduct(t.dataset.prod);return;}
  if(t.dataset.pdask!==undefined){state.prodConfirm=true;renderProduct();return;}
  if(t.dataset.pdcancel!==undefined){state.prodConfirm=false;renderProduct();return;}
  if(t.dataset.pddel!==undefined){const p=prodById(state.openProd);if(!p)return;try{await store.del('products',p.id);if(p.photo&&assetsNS)assetsNS.delete(p.photo).catch(()=>{});closeSheets();toast('Product deleted');}catch(e){toast("Couldn't delete. Try again.");}return;}
  if(t.dataset.rv){openRecipe(t.dataset.rv);return;}
  if(t.dataset.rscale){state.rscale=+t.dataset.rscale;renderRView();return;}
  if(t.dataset.itick){const i=t.dataset.itick;state.rticks.i[i]=!state.rticks.i[i];renderRView();return;}
  if(t.dataset.stick){const i=t.dataset.stick;state.rticks.s[i]=!state.rticks.s[i];renderRView();return;}
  if(t.dataset.rmade!==undefined){const r=state.recipes.find(x=>x.id===state.rview);if(!r)return;try{await store.put('recipes',{...r,made:(r.made||0)+1,lastMade:todayStr});toast('Nice! Logged another time you made it');}catch(e){toast("Couldn't save. Try again.");}return;}
  if(t.dataset.redit!==undefined){const r=state.recipes.find(x=>x.id===state.rview);if(!r)return;closeSheets();
    openEditor({id:r.id,title:r.title,servings:r.servings||'',time:r.time||'',plan:r.plan||'',forHim:!!r.forHim,photo:r.photo,ingredients:(r.ingredients||[]).map(i=>({amount:i.amount==null?'':i.amount,unit:i.unit||'',name:i.name||'',product_id:i.product_id||''})),steps:(r.steps||[]).join('\n'),tips:(r.tips||[]).join('\n')});return;}
  if(t.dataset.rask!==undefined){state.rConfirm=true;renderRView();return;}
  if(t.dataset.rdel!==undefined){const r=state.recipes.find(x=>x.id===state.rview);if(!r)return;try{await store.del('recipes',r.id);closeSheets();toast('Recipe deleted',()=>store.put('recipes',r).catch(()=>{}));}catch(e){toast("Couldn't delete. Try again.");}return;}
  if(t.dataset.rwrite!==undefined){closeSheets();openEditor(null);return;}
  if(t.dataset.rplan!==undefined){state.redit.plan=t.dataset.rplan;renderEditor();return;}
  if(t.dataset.iadd!==undefined){state.redit.ingredients.push({amount:'',unit:'',name:'',product_id:''});renderEditor();const ins=$('editBody').querySelectorAll('[data-if="amount"]');ins[ins.length-1]&&ins[ins.length-1].focus();return;}
  if(t.dataset.irm){state.redit.ingredients.splice(+t.dataset.irm,1);if(!state.redit.ingredients.length)state.redit.ingredients.push({amount:'',unit:'',name:'',product_id:''});renderEditor();return;}
  if(t.dataset.cf){state.cf=state.cf===t.dataset.cf&&t.dataset.cf!=='all'?'all':t.dataset.cf;render();return;}
  if(t.dataset.cl){if(!$('outfitSheet').hidden)$('outfitSheet').hidden=true;openItem(t.dataset.cl);return;}
  if(t.dataset.itset){const [f,v]=t.dataset.itset.split(':');state._saveItem&&state._saveItem({[f]:f==='clean'?v==='1':v});return;}
  if(t.dataset.itask!==undefined){state.itemConfirm=true;renderItem();return;}
  if(t.dataset.itcancel!==undefined){state.itemConfirm=false;renderItem();return;}
  if(t.dataset.itdel!==undefined){const it=state.closet.find(x=>x.id===state.openItem);if(!it)return;
    try{await store.del('closet',it.id);if(it.photo&&assetsNS)assetsNS.delete(it.photo).catch(()=>{});closeSheets();toast('Piece deleted');}catch(e){toast("Couldn't delete. Try again.");}return;}
  if(t.dataset.laundrydone!==undefined){const dirty=state.closet.filter(i=>i.clean===false);try{for(const it of dirty)await store.put('closet',{...it,clean:true});toast(`${dirty.length} piece${dirty.length===1?'':'s'} back in your closet`);state.cf='all';render();}catch(e){toast("Couldn't update. Try again.");}return;}
  if(t.dataset.outfit!==undefined){openOutfit();return;}
  if(t.dataset.ctype!==undefined){state.ctype=t.dataset.ctype;render();return;}
  if(t.dataset.lookagain!==undefined){anotherLook();return;}
  if(t.dataset.cladd!==undefined){addClothes();return;}
  if(t.dataset.clpick!==undefined){if($('clTipOff').checked){try{localStorage.setItem('lb.cltip','off');}catch(e){}}closeSheets();$('closetFile').click();return;}
  if(t.dataset.cropsave!==undefined){cropSave();return;}
  if(t.dataset.cropreset!==undefined){const C=state.crop;if(!C)return;C.cx=.5;C.cy=.5;C.z=1;if(C.lum!=null)C.bright=C.lum<DARK_LUM;C.dirty=true;renderItem();return;}
  if(t.dataset.wearlook!==undefined){const o=(state.outfits||[])[+t.dataset.wearlook];const ids=o?(o.items||[]).filter(id=>state.closet.some(x=>x.id===id)).slice(0,5):[];if(!ids.length)return;
    const L=clLsGet('lb.look');clLsPut('lb.look',{d:todayStr,ids,n:L&&L.d===todayStr?L.n||0:0,src:'ai',title:String(o.title||'').slice(0,40)});closeSheets();render();toast("Set as today's look");return;}
  if(t.dataset.occ){state.occ=t.dataset.occ;renderOutfit();return;}
  if(t.dataset.suggest!==undefined){suggestOutfits();return;}
  if(t.dataset.reorder!==undefined){if(!state.reorderD&&(state.settings.debtSort||'manual')!=='manual'){const list=sortedDebts();const s2=clone(state.settings);s2.debtSort='manual';state.settings.debtSort='manual';await saveDebtOrder(list);store.saveSettings(s2).catch(()=>{});}state.reorderD=!state.reorderD;render();return;}
  if(t.dataset.mv){const [id,dv]=t.dataset.mv.split(':');moveDebt(id,+dv);return;}
  if(t.dataset.dview){state.debtView=t.dataset.dview;render();return;}
  if(t.dataset.prs){state.openD=state.openD===t.dataset.prs?null:t.dataset.prs;render();return;}
  if(t.dataset.payd){openAdd('debt',t.dataset.payd);return;}
  if(t.dataset.editd){openDebt(t.dataset.editd);return;}
  if(t.dataset.adddebt!==undefined){openDebt();return;}
  if(t.dataset.dcur){dpCur=t.dataset.dcur;syncDp();return;}
  if(t.dataset.dpask!==undefined){dpConfirm=true;syncDp();return;}
  if(t.dataset.dpcancel!==undefined){dpConfirm=false;syncDp();return;}
  if(t.dataset.dpdel!==undefined){const d=state.debts.find(x=>x.id===dpEdit);if(!d)return;try{await store.del('debts',d.id);closeSheets();toast(`${d.name} deleted`,()=>store.put('debts',d).catch(()=>{}));}catch(e){toast("Couldn't delete. Try again.");}return;}
  if(t.dataset.dsel){state.selDebt=t.dataset.dsel;syncDebtField();validate();return;}
  if(t.dataset.gotodebts!==undefined){closeSheets();state.tab='money';state.sub.money='debts';render();return;}
  if(t.dataset.feel){state.feel=state.feel===t.dataset.feel?null:t.dataset.feel;buildFood();return;}
  if(t.dataset.portion){if(state.scan){state.scan.portion=t.dataset.portion;renderScan();}return;}
  if(t.dataset.scanlog){logScan(t.dataset.scanlog==='1');return;}
  if(t.dataset.scanmanual!==undefined){state.scan={status:'manual',product:'',p100:0,pkg:0,serving:0,portion:'grams',grams:0};renderScan();return;}
  if(t.dataset.hday){state.hday=t.dataset.hday;state.openF=null;render();return;}
  if(t.dataset.check){const dd=dayDoc(state.hday);patchDay(state.hday,{[t.dataset.check]:!dd[t.dataset.check]});return;}
  if(t.dataset.cnt){const [k,dv]=t.dataset.cnt.split(':');const v=+dayDoc(state.hday)[k]||0;patchDay(state.hday,{[k]:Math.max(0,v+(+dv))});return;}
  if(t.dataset.water){const w=+dayDoc(state.hday).water||0;patchDay(state.hday,{water:Math.max(0,w+(+t.dataset.water))});return;}
  if(t.dataset.addmeal){openFood(t.dataset.addmeal);return;}
  if(t.dataset.meal){state.meal=t.dataset.meal;buildFood();return;}
  if(t.dataset.food){logFood(t.dataset.food,t.dataset.plan==='1');return;}
  if(t.dataset.unadd){const id=t.dataset.unadd;lastAdded=lastAdded.filter(f=>f.id!==id);buildFood();store.del('food',id).catch(()=>toast("Couldn't remove it. Try again."));return;}
  if(t.dataset.frow){state.openF=state.openF===t.dataset.frow?null:t.dataset.frow;render();return;}
  if(t.dataset.fdel){const f=state.food.find(x=>x.id===t.dataset.fdel);if(!f)return;state.openF=null;
    try{await store.del('food',f.id);toast(`Deleted ${f.name}`,()=>store.put('food',f).catch(()=>toast("Couldn't restore it.")));}catch(e){toast("Couldn't delete. Try again.");}return;}
  if(t.dataset.prow){state.openP=state.openP===t.dataset.prow?null:t.dataset.prow;render();return;}
  if(t.dataset.pdel){ev.stopPropagation();const p=state.prices.find(x=>x.id===t.dataset.pdel);if(!p)return;
    try{await store.del('prices',p.id);toast('Price deleted',()=>store.put('prices',p).catch(()=>{}));}catch(e){toast("Couldn't delete. Try again.");}return;}
  if(t.dataset.logdebt!==undefined){openAdd('debt');return;}
  if(t.dataset.row!==undefined){state.openRow=state.openRow===t.dataset.row?null:t.dataset.row;render();return;}
  if(t.dataset.del){const e=state.entries.find(x=>x.id===t.dataset.del);if(!e)return;state.openRow=null;
    try{await store.delEntry(e.id);toast(`Deleted ${fmt(e.amount)} · ${labelOf(e)}`,()=>store.addEntry(e).catch(()=>toast("Couldn't restore it. Add it again.")));}catch(err){toast("Couldn't delete. Check your connection and try again.");}return;}
  if(t.dataset.pay){const amt=+t.dataset.amt;const e={id:newId(),amount:Math.round(amt*100)/100,cat:t.dataset.pay,note:'',date:defaultDate(),createdAt:Date.now()};
    try{await store.addEntry(e);toast(`${CAT[e.cat].name} marked paid · ${fmt(amt)}`,()=>store.delEntry(e.id));}catch(err){toast("Couldn't save. Check your connection and try again.");}return;}
  if(t.dataset.count||t.dataset.uncount){const id=t.dataset.count||t.dataset.uncount;const s=clone(state.settings);const i=s.incomes.find(x=>x.id===id);if(!i)return;i.count=!!t.dataset.count;
    try{await store.saveSettings(s);toast(i.count?`${i.name} counted in income`:`${i.name} removed from income`);}catch(err){toast("Couldn't save. Try again.");}return;}
  if(t.dataset.openSettings!==undefined){openSettings();return;}
  if(t.dataset.goal){const s=clone(state.settings);s.weekGoal=Math.min(7,Math.max(1,(+s.weekGoal||2)+(+t.dataset.goal)));if(s.weekGoal===state.settings.weekGoal)return;
    try{await store.saveSettings(s);}catch(err){toast("Couldn't save. Try again.");}return;}
});
function defaultDate(){const mi=periodInfo(state.month||curKey());return mi.isCur?todayStr:mi.start;}

async function toggleNoSpend(){const s=clone(state.settings);const i=s.noSpend.indexOf(todayStr);if(i>=0)s.noSpend.splice(i,1);else s.noSpend.push(todayStr);
  s.noSpend=s.noSpend.filter(d=>d>=ymd(new Date(today.getFullYear()-1,today.getMonth(),1)));
  try{await store.saveSettings(s);if(i<0)toast('Logged as a spend-free day');}catch(e){toast("Couldn't save. Try again.");}}

/* add sheet */
function buildCats(){$('catGrid').innerHTML=CATS.map(c=>`<button class="cat" data-cat="${c.id}" aria-pressed="${state.selCat===c.id}"><span class="swatch" style="background:${c.color}"></span><span class="t">${c.name}</span></button>`).join('');
  $('catGrid').querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{state.selCat=b.dataset.cat;buildCats();syncHours();validate();});}
function syncItem(){const name=$('itemName').value.trim(),q=parseNum($('itemQty').value),a=parseNum($('amt').value);
  $('itemHint').textContent=name&&q>0&&a>0?`= ${fmt2(a/q)} per ${$('itemUnit').value}`:'';}
function syncCur(){const isD=state.selCat==='debt';const d=isD?state.debts.find(x=>x.id===state.selDebt):null;
  const cur=isD?(d&&d.currency==='USD'?'USD':'NIS'):(state.addCur||'NIS');$('amtCur').textContent=cur==='USD'?'$':'₪';
  $('addCurBox').innerHTML=isD?'':curSeg('add',cur);const a=parseNum($('amt').value);
  $('curHint').hidden=!(cur==='USD'&&a>0);if(cur==='USD'&&a>0)$('curHint').textContent=`= ${fmt(a*rate())} at ₪${rate()} per $1`;}
function syncDebtField(){const isD=state.selCat==='debt';$('debtField').hidden=!isD;const d=isD?state.debts.find(x=>x.id===state.selDebt):null;
  syncCur();
  if(!isD)return;
  if(!state.debts.length){$('debtPeople').innerHTML='';$('debtHint').innerHTML='Add the people you owe first, in Money → Debts. <button class="link" data-gotodebts>Go there</button>';return;}
  $('debtPeople').innerHTML=state.debts.map(x=>{const st=debtStats(x);return `<button class="fchip ${state.selDebt===x.id?'sel':''}" data-dsel="${esc(x.id)}" aria-pressed="${state.selDebt===x.id}">${esc(x.name)} · ${money(st.rem,x.currency)} left</button>`;}).join('');
  const a=parseNum($('amt').value);
  $('debtHint').textContent=!d?'Pick who you are paying.':d.currency==='USD'?(a>0?`$${a} = ${fmt(a*rate())} from this month's budget (₪${rate()} per $1).`:'Type the amount in dollars.'):'';}
function syncHours(){syncDebtField();const on=state.selCat==='electricity';$('hoursField').hidden=!on;
  const fo=state.selCat==='food';$('itemField').hidden=!fo;
  if(fo){fillItemList();$('itemSugg').innerHTML=knownItems().slice(0,8).map(([n])=>`<button type="button" data-isugg="${esc(n)}">${esc(n)}</button>`).join('');
    $('itemSugg').querySelectorAll('[data-isugg]').forEach(b=>b.onclick=()=>{$('itemName').value=b.dataset.isugg;const u=unitFor(b.dataset.isugg);if(u)$('itemUnit').value=u;if(!$('itemQty').value)$('itemQty').value='1';syncItem();});syncItem();}
  const cu=state.selCat==='other';$('customField').hidden=!cu;
  if(cu){const names=[...new Set(state.entries.filter(e=>e.cat==='other'&&e.label).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).map(e=>e.label))].slice(0,8);
    $('sugg').innerHTML=names.map(n=>`<button type="button" data-sugg="${esc(n)}">${esc(n)}</button>`).join('');
    $('sugg').querySelectorAll('[data-sugg]').forEach(b=>b.onclick=()=>{$('customName').value=b.dataset.sugg;validate();});}$('hoursHint').textContent=`At ${fmt(state.settings.elecRate)} per hour. Typing hours fills the amount.`;}
function parseNum(v){v=String(v).replace(/,/g,'.').replace(/[^\d.]/g,'');const n=parseFloat(v);return isFinite(n)?n:0;}
function validate(){const ok=parseNum($('amt').value)>0&&!!$('date').value&&(state.selCat!=='other'||$('customName').value.trim().length>0)&&(state.selCat!=='debt'||!!state.debts.find(x=>x.id===state.selDebt));$('saveEntry').disabled=!ok;return ok;}
$('amt').oninput=()=>{validate();syncItem();if(state.selCat==='debt')syncDebtField();else syncCur();};$('itemQty').oninput=syncItem;$('itemUnit').onchange=syncItem;
$('itemName').oninput=()=>{const u=unitFor($('itemName').value);if(u)$('itemUnit').value=u;syncItem();};$('customName').oninput=validate;$('date').oninput=validate;
$('hours').oninput=()=>{state.addCur='NIS';syncCur();const h=parseNum($('hours').value);if(h>0)$('amt').value=Math.round(h*(+state.settings.elecRate||31)*100)/100;validate();};
$('productFile').onchange=()=>{const fs=[...($('productFile').files||[])];$('productFile').value='';if(!fs.length)return;pQ.files.push(...fs);pQ.total+=fs.length;runPQ();};
$('impGo').onclick=()=>runImport(null);
$('impPhoto').onchange=async()=>{const f=$('impPhoto').files&&$('impPhoto').files[0];$('impPhoto').value='';if(!f)return;
  try{const {im,u}=await loadImg(f);const b=await new Promise((r,j)=>drawTo(im,1600).toBlob(x=>x?r(x):j(new Error('e')),'image/jpeg',0.85));URL.revokeObjectURL(u);runImport(b);}catch(e){state.impErr="Couldn't open that photo.";renderImport();}};
$('closetFile').onchange=()=>{const fs=[...($('closetFile').files||[])].filter(f=>/^image\//.test(f.type)||!f.type);$('closetFile').value='';if(!fs.length)return;addQ.files.push(...fs);addQ.total+=fs.length;runQ();};
$('openRecap').onclick=()=>openRecap();
['input','change'].forEach(ev=>$('billsBody').addEventListener(ev,e=>{const t=e.target;if(t.dataset.bi!=null&&state.bedit)state.bedit[+t.dataset.bi][t.dataset.bf]=t.value;}));
$('restoreFile').onchange=async()=>{const f=$('restoreFile').files&&$('restoreFile').files[0];$('restoreFile').value='';if(!f)return;
  try{const obj=JSON.parse(await f.text());if(!obj||obj.app!=='lenas-life-book'||!obj.collections)throw new Error('bad');
    const n=COLLS.reduce((a,c)=>a+((obj.collections[c]||[]).length),0);state._restore=obj;
    $('restoreBox').innerHTML=`<p class="hint">Backup from ${esc(String(obj.exportedAt||'').slice(0,10))} with ${n} records. Restoring adds them back and replaces matching ones. Nothing else is deleted.</p><div class="two"><button class="btn2" data-rcancel>Cancel</button><button class="pay" data-rgo>Restore</button></div>`;}
  catch(e){$('restoreBox').innerHTML='<p class="err">That file isn\'t a Life Book backup.</p>';}};
$('fab').onclick=()=>{if(state.tab==='today'){state.tab='money';state.sub.money='month';render();}if(state.tab==='people'){state.openPerson=null;editPerson(null);openSheet('personSheet');return;}if(state.tab==='closet'){addClothes();return;}if(state.tab==='money'&&state.sub.money==='wishlist'){openWish();return;}if(state.tab==='health')openFood();else if(state.tab==='kitchen'){if(state.sub.kitchen==='products')$('productFile').click();else if(state.sub.kitchen==='prices')openPrice();else openImport();}else if(state.sub.money==='debts')openAdd('debt');else openAdd();};
function openAdd(cat,debtId){state.addCur='NIS';if(cat)state.selCat=cat;else if(state.selCat==='debt')state.selCat='food';
  state.selDebt=debtId||(state.debts.length===1?state.debts[0].id:null);$('itemName').value='';$('itemQty').value='';$('itemUnit').value='kg';$('amt').value='';$('note').value='';$('hours').value='';$('customName').value='';$('date').value=defaultDate();$('date').max=todayStr;$('addErr').hidden=true;buildCats();syncHours();validate();openSheet('addSheet');setTimeout(()=>$('amt').focus(),60);};
$('saveEntry').onclick=async()=>{if(!validate())return;const amount=Math.round(parseNum($('amt').value)*100)/100;
  const e={id:newId(),amount,cat:state.selCat,note:$('note').value.trim().slice(0,80),date:$('date').value,createdAt:Date.now()};
  if(state.selCat==='debt'){const d=state.debts.find(x=>x.id===state.selDebt);if(d){e.debtId=d.id;e.debtAmt=amount;e.amount=Math.round(toNIS(amount,d.currency)*100)/100;}}
  else if(state.addCur==='USD'){e.origCur='USD';e.origAmt=amount;e.amount=Math.round(amount*rate()*100)/100;}
  if(state.selCat==='electricity'&&parseNum($('hours').value)>0)e.hours=parseNum($('hours').value);
  if(state.selCat==='food'&&$('itemName').value.trim()&&parseNum($('itemQty').value)>0){e.item=$('itemName').value.trim().slice(0,30);e.qty=parseNum($('itemQty').value);e.unit=$('itemUnit').value;
    const k=knownItems().find(([n])=>n.toLowerCase()===e.item.toLowerCase());if(k)e.item=k[0];}
  if(state.selCat==='other'){const n=$('customName').value.trim().slice(0,30);const prev=state.entries.find(x=>x.cat==='other'&&x.label&&x.label.toLowerCase()===n.toLowerCase());e.label=prev?prev.label:n;}
  $('saveEntry').disabled=true;
  try{await store.addEntry(e);closeSheets();toast(`Saved ${e.debtId?money(e.debtAmt,(state.debts.find(x=>x.id===e.debtId)||{}).currency):fmt(e.amount)} to ${labelOf(e)}`,()=>store.delEntry(e.id));
    if(keyOfDate(e.date)!==state.month){state.month=keyOfDate(e.date);render();}}
  catch(err){$('addErr').hidden=false;$('addErr').textContent="Couldn't save this spend. Check your connection and tap Save again.";$('saveEntry').disabled=false;}};

/* settings */
function openSettings(){const S=state.settings;$('themeBox').innerHTML=themePicker();syncModeSeg();$('moodToggle').onchange=async()=>{const s2=clone(state.settings);s2.moodCheck=$('moodToggle').checked;state.settings.moodCheck=s2.moodCheck;try{await store.saveSettings(s2);}catch(e){}};$('sRate').value=S.rate;$('sElec').value=S.elecRate;
  $('incList').innerHTML=S.incomes.map((i,k)=>`<div class="incrow" data-inc="${k}">
    <div class="top2"><b>${esc(i.name)}</b><label class="toggle"><input type="checkbox" id="inc-count-${k}" ${i.count?'checked':''}>Count it</label></div>
    <div class="three"><div class="field"><label for="inc-usd-${k}">USD a month</label><input id="inc-usd-${k}" inputmode="decimal" value="${i.usd}"></div>
    <div class="field"><label for="inc-fee-${k}">Fee %</label><input id="inc-fee-${k}" inputmode="decimal" value="${i.feePct}"></div>
    <div class="field"><label for="inc-flat-${k}">Flat fee $</label><input id="inc-flat-${k}" inputmode="decimal" value="${i.flat}"></div></div>
    <p class="hint num" id="inc-net-${k}"></p></div>`).join('');
  $('budList').innerHTML=CATS.map(c=>`<div class="field"><label for="bud-${c.id}">${c.name}</label><input id="bud-${c.id}" inputmode="decimal" placeholder="—" value="${S.budgets[c.id]??''}"></div>`).join('');
  $('hHeight').value=S.heightCm||'';$('hSleepG').value=S.sleepGoal||'';$('restoreBox').innerHTML='';$('hGoalW').value=S.goalKg||'';$('hWhy1').value=(S.why||[])[0]||'';$('hWhy2').value=(S.why||[])[1]||'';
  $('hStart').value=S.journey.start||'';$('hLow').value=S.journey.low||'';
  const upd=()=>S.incomes.forEach((i,k)=>{const n=netUSD({usd:parseNum($('inc-usd-'+k).value),feePct:parseNum($('inc-fee-'+k).value),flat:parseNum($('inc-flat-'+k).value)});
    $('inc-net-'+k).textContent=`Lands as $${n.toFixed(0)} ≈ ${fmt(n*(parseNum($('sRate').value)||0))}`;});
  $('setSheet').querySelectorAll('input').forEach(x=>x.oninput=upd);upd();openSheet('setSheet');}
$('openSettings').onclick=openSettings;
$('nSend').onclick=saveNote;
$('nText').addEventListener('input',e=>{const el=e.target;el.style.height='';el.style.height=Math.min(140,el.scrollHeight)+'px';});
$('nText').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();saveNote();}});
$('nTag').onclick=e=>{e.stopPropagation();toggleTagMenu();};
document.addEventListener('pointerdown',e=>{const m=$('nTagMenu');if(!m.hidden&&!m.contains(e.target)&&e.target!==$('nTag'))toggleTagMenu(false);});
$('nTagMenu').addEventListener('mousedown',e=>e.preventDefault());
$('nSearch').addEventListener('input',e=>{state.nq=e.target.value;renderNotes();});
$('nFile').onchange=async()=>{const f=$('nFile').files&&$('nFile').files[0];$('nFile').value='';if(!f)return;
  try{const {im,u}=await loadImg(f);const c=drawTo(im,1200);if(assetsNS){const up=await assetsNS.upload(await toBlobP(c,'image/jpeg',0.84),{type:'image/jpeg'});nDraft.photo=up.id;}else nDraft.thumb=drawTo(im,420).toDataURL('image/jpeg',0.72);URL.revokeObjectURL(u);
    $('nPhotoPrev').hidden=false;$('nPhotoPrev').innerHTML=`<img src="${esc(nDraft.photo?'/_blob/'+nDraft.photo:nDraft.thumb)}" alt=""><span>Photo ready. Add a line or a link, then send.</span>`;}catch(e){toast("Couldn't add that photo.");}};

$('saveSettings').onclick=async()=>{const s=clone(state.settings);s.rate=parseNum($('sRate').value)||s.rate;s.elecRate=parseNum($('sElec').value)||s.elecRate;
  s.incomes=s.incomes.map((i,k)=>({...i,usd:parseNum($('inc-usd-'+k).value),feePct:parseNum($('inc-fee-'+k).value),flat:parseNum($('inc-flat-'+k).value),count:$('inc-count-'+k).checked}));
  const b={};CATS.forEach(c=>{const v=parseNum($('bud-'+c.id).value);if(v>0)b[c.id]=v;});s.budgets=b;
  s.heightCm=parseNum($('hHeight').value)||159;s.sleepGoal=Math.min(14,parseNum($('hSleepG').value))||0;s.goalKg=parseNum($('hGoalW').value)||0;
  s.why=[$('hWhy1').value.trim().slice(0,60),$('hWhy2').value.trim().slice(0,60)].filter(Boolean);
  s.journey={start:parseNum($('hStart').value)||0,low:parseNum($('hLow').value)||0};
  try{await store.saveSettings(s);closeSheets();toast('Settings saved');}catch(e){toast("Couldn't save. Check your connection and try again.");}};

let moodAsked=false;
window.addEventListener('hashchange',()=>{let h=location.hash.slice(1);if(h==='home')h=state.homeTab;if(['today','money','health','kitchen','closet','people','notes'].includes(h)&&h!==state.tab){state.tab=h;render();}});
$('sayBtn').onclick=openSay;
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.sayi!=null&&state.say&&state.say.items){state.say.items[+t.dataset.sayi].on=t.checked;const b=document.querySelector('[data-sayadd]');const n=state.say.items.filter(x=>x.on!==false).length;if(b)b.textContent=`Add ${n} item${n===1?'':'s'}`;}});
initStore();initSample();initAssets();setTimeout(()=>{if(state.mode==='local'&&!moodAsked){moodAsked=true;maybeAskMood();}},11500);
})();
