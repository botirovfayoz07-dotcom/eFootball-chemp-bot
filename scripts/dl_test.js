const path=(process.argv[2]||process.cwd())+'/'; // loyiha papkasidan: node dl_test.js
const mount=require(path+'lib/deadlines.js'); const FX=require(path+'fixtures.js');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m)} else console.log('ok  ',m) };

// --- sof funksiyalar
const base=new Date('2026-11-04T05:00:00Z'); // 10:00 Toshkent
const st=mount.stamp([{round:1},{round:2}],base,7);
ok(st[0].notified[0]==='start' && +st[0].startsAt===+base,'1-tur darrov boshlanadi, "start" belgilangan');
ok(+st[0].deadline===+FX.roundDeadline(base,1,7) && +st[1].startsAt===+st[0].deadline,'2-tur 1-tur dedlaynida boshlanadi');
console.log('   1-tur dedlayni (UTC):',st[0].deadline.toISOString(),'= 11-11 23:59 Toshkent');
const sq=mount.stampSeq([{round:7},{round:9}],base,3); ok(sq[0].deadline>base && sq[1].deadline>sq[0].deadline && sq[0].notified[0]==='start','stampSeq: o\'tib ketgan turlar hozirdan sanaladi');
ok(mount.decide({home:1,away:2},[1]).kind==='win-home' && mount.decide({home:1,away:2},[2]).hg===0 && mount.decide({home:1,away:2},[]).kind==='void' && mount.decide({home:1,away:2},[1,2]).kind==='manual','decide: 4 holat');
ok(mount.clampDays('7')===7 && mount.clampDays(0)===null && mount.clampDays(31)===null && mount.clampDays('x')===null,'clampDays');

// --- soxta baza
const match=(doc,q)=>Object.entries(q).every(([k,c])=>{const v=doc[k];
  if(c===null||typeof c!=='object'||c instanceof Date) return (c===null)? (v==null) : +v===+c||v===c;
  return Object.entries(c).every(([op,x])=>{
    if(op==='$in') return Array.isArray(v)? v.some(y=>x.includes(y)) : x.includes(v);
    if(op==='$nin') return !x.includes(v);
    if(op==='$ne') return Array.isArray(v)? !v.includes(x) : (x===null? v!=null : v!==x);
    if(op==='$gt') return v!=null && v>x; if(op==='$lte') return v!=null && v<=x; return true; }); });
const mk=(docs)=>({docs,
  find:(q)=>{const r=docs.filter(d=>match(d,q));const c={limit:()=>c,lean:async()=>r.map(d=>d)};return c;},
  updateOne:async(q,u)=>{const d=docs.find(x=>match(x,q)); if(!d) return {modifiedCount:0};
    Object.assign(d,u.$set||{}); if(u.$addToSet) for(const[k,v] of Object.entries(u.$addToSet)) { if(!d[k].includes(v)) d[k].push(v);} return {modifiedCount:1};}});
const sent=[], admin=[], recalced=[];
const H=3600e3, now=Date.now();
const M=(o)=>({season:1,league:'premier-league',round:2,home:1,away:2,status:'scheduled',hg:null,ag:null,reportedBy:null,notified:[],...o});
const mkid=(i)=>({_id:'m'+i});
const matches=[ // 0: tur endi boshlandi
  M({...mkid(0),startsAt:new Date(now-1000),deadline:new Date(now+5*H),home:10,away:11}),
  M({...mkid(1),startsAt:new Date(now-5*H),deadline:new Date(now+2*H),home:12,away:13,notified:['start']}),                        // 3 soat ichida: eslatma
  M({...mkid(2),startsAt:new Date(now-5*H),deadline:new Date(now+2*H),home:14,away:15,status:'pending',reportedBy:14,notified:['start']}), // pending: faqat 15 ga
  M({...mkid(3),startsAt:new Date(now-50*H),deadline:new Date(now-1*H),home:20,away:21,notified:['start','h3']}), // dedlayn endi o'tdi → ogohlantirish
  M({...mkid(4),startsAt:new Date(now-90*H),deadline:new Date(now-20*H),home:30,away:31,notified:['start','h3','over']}), // muhlat tugadi, 30 faol → 3:0
  M({...mkid(5),startsAt:new Date(now-90*H),deadline:new Date(now-20*H),home:40,away:41,notified:['start','h3','over']}), // hech kim → bekor
  M({...mkid(6),startsAt:new Date(now-90*H),deadline:new Date(now-20*H),home:50,away:51,notified:['start','h3','over']}), // ikkalasi faol → bahsli
  M({...mkid(7),startsAt:new Date(now-90*H),deadline:new Date(now-20*H),home:60,away:61,status:'pending',reportedBy:60,notified:['start','h3']}), // pending o'tgan → admin
  M({...mkid(8),startsAt:new Date(now-90*H),deadline:new Date(now-20*H),home:70,away:71,status:'confirmed'}), // tasdiqlangan — tegilmaydi
  M({...mkid(10),startsAt:new Date(now-30*H),deadline:new Date(now+30*H),home:90,away:91}), // eskirgan start: xabarsiz belgilanadi
  M({...mkid(9),home:80,away:81}), // dedlaynsiz eski o'yin — tegilmaydi
];
const Match=mk(matches), Cup=mk([]);
const chat=[{from:30,key:'m4'},{from:50,key:'m6'},{from:51,key:'m6'},{from:99,key:'m5'}];
const ChatMessage={distinct:async(f,q)=>[...new Set(chat.filter(c=>c.key===q.key&&q.from.$in.includes(c.from)).map(c=>c.from))]};
const EFL={byId:{'premier-league':{name:'Premier Liga'}}};
// Admin dedlayn belgilagan va ochilgan turlar: e'lon faqat shunda yuboriladi
const LeagueConfig={find:()=>({select:()=>({lean:async()=>[{league:'premier-league',roundsLocked:false,openRounds:[],adminDeadlineRounds:Array.from({length:40},(_,i)=>i+1)}]})})};
const t=mount({Match,Cup,ChatMessage,LeagueConfig,season:1,EFL,notify:(id,key,...a)=>sent.push([id,key,...a]),whoIs:async(l,id)=>'U'+id,recalc:async l=>recalced.push(l),notifyAdmins:(x)=>admin.push(x)});
(async()=>{
  await t.tick();
  const by=(k)=>sent.filter(s=>s[1]===k).map(s=>s[0]).sort((a,b)=>a-b);
  ok(JSON.stringify(by('roundStart'))==='[10,11]','roundStart faqat yangi boshlangan turga (10,11): '+by('roundStart'));
  ok(JSON.stringify(by('remindPlay'))==='[12,13]','3 soatlik eslatma scheduled uchun ikkalasiga (12,13)');
  ok(JSON.stringify(by('remindConfirm'))==='[15]','pending: faqat tasdiqlashi kerak bo\'lgan 15 ga');
  ok(JSON.stringify(by('overdue'))==='[20,21]','dedlayn o\'tdi → muhlat ogohlantirishi (20,21)');
  ok(matches[3].status==='scheduled','muhlat ichida o\'yin tegilmadi');
  ok(matches[4].status==='confirmed'&&matches[4].hg===3&&matches[4].ag===0&&matches[4].confirmedBy==='auto'&&matches[4].auto.kind==='win-home','faol 30 ga 3:0 texnik g\'alaba');
  ok(JSON.stringify(by('techWin'))==='[30]'&&JSON.stringify(by('techLoss'))==='[31]','techWin→30, techLoss→31');
  ok(matches[5].status==='cancelled'&&matches[5].auto.kind==='void','ikkalasi kelmadi → bekor');
  ok(matches[6].status==='disputed','ikkalasi faol → bahsli (admin)');
  ok(matches[7].status==='pending'&&matches[7].notified.includes('over'),'pending o\'zi hal qilinmadi, adminga belgilandi');
  ok(matches[8].status==='confirmed'&&matches[8].hg===null,'tasdiqlangan o\'yin tegilmadi');
  ok(matches[10].status==='scheduled'&&!matches[10].notified.length,'dedlaynsiz o\'yin tegilmadi'); ok(matches[9].notified.includes('start')&&!sent.some(s=>s[0]===90),'eskirgan start: belgilandi, lekin xabar yuborilmadi');
  ok(recalced.length===1,'jadval faqat bir marta qayta hisoblandi');
  ok(admin.length===1&&/1 ta texnik g'alaba/.test(admin[0])&&/1 ta bekor/.test(admin[0])&&/1 ta bahsli/.test(admin[0])&&/1 ta admin/.test(admin[0]),'adminga bitta jamlanma: '+JSON.stringify(admin[0]));
  const n=sent.length, an=admin.length; await t.tick();
  ok(sent.length===n&&admin.length===an,'qayta tick takroriy xabar yubormadi (idempotent)');
  console.log(fails?('\n'+fails+' XATO'):'\nHAMMASI O\'TDI');
})();
