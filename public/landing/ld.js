(()=>{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const q=new URLSearchParams(location.search);
/* ---------- device detection (prod) — demo bisa override pakai ?dev= ---------- */
function detect(){const ua=navigator.userAgent;const ios=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 if(ios){const inApp=/CriOS|FxiOS|EdgiOS|Instagram|FBAN|FBAV|TikTok|musical_ly|Line\/|GSA\//.test(ua);return inApp?'iosother':'ios'}
 return /Android/.test(ua)?'android':'desktop'}
const masuk=/(^|;\s*)sb-[^=;]+-auth-token(\.0)?=/.test(document.cookie);
const st={dev:q.get('dev')||detect(),inst:q.get('inst')==='1'||matchMedia('(display-mode: standalone)').matches||navigator.standalone===true,login:masuk,price:q.get('price')||'u',testi:q.get('testi')==='1',faq:q.get('faq')==='1'};
let deferred=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e});
addEventListener('appinstalled',()=>{st.inst=true;render()});
/* ---------- tour ---------- */
const T=[
{t:'Beranda',j:'ホーム',p:'Misi harian, perkiraan skor, dan kalender cap 学. Buka app, langsung tau hari ini ngapain.',d:'/landing/shots/beranda-d.webp',m:'/landing/shots/beranda-m.webp'},
{t:'Materi',j:'教材',p:'8.342 kata & 650 pola, N5–N1. Yang paling sering keluar di soal ditandain 🔥 dan didahuluin.',d:'/landing/shots/materi-d.webp',m:'/landing/shots/materi-m.webp'},
{t:'Bank Soal & Choukai',j:'問題集',p:'29 set latihan format JLPT per level (N1–N3): 文字・語彙・文法, 読解 dengan bacaan, sampai 聴解 beraudio. Lengkap pembahasan.',sub:[{k:'文字・語彙',img:'/landing/shots/bs-moji.webp',imgm:'/landing/shots/bs-moji-m.webp'},{k:'読解',img:'/landing/shots/bs-dokkai.webp',imgm:'/landing/shots/bs-dokkai-m.webp'},{k:'聴解',img:'/landing/shots/bs-choukai.webp',imgm:'/landing/shots/bs-choukai-m.webp'}]},
{t:'Sensei AI',j:'先生',p:'Blok teks di soal, terus Tanya Sensei, Simpan ke Kamus, atau Catat. Furigana sekali ketuk.',d:'/landing/shots/sensei-d.webp',m:'/landing/shots/sensei-m.webp'},
{t:'Kurikulum',j:'課程',p:'26 minggu sampai hari ujian. Tes penempatan lompatin yang udah kamu kuasai, ulangan tiap Senin, simulasi tiap bulan.',d:'/landing/shots/kurikulum-d.webp',m:'/landing/shots/kurikulum-m.webp'}];
const sen=m=>`<div class="sen${m?' m':''}"><div class="sen-c"><div class="sen-q"><span>文法・語彙 · Soal 12</span><span class="fur" lang="ja">ふりがな</span></div>
<p class="sen-t" lang="ja">会議の資料は、明日までに<mark>提出</mark>してください。</p>
<div class="sen-m"><span class="on">Tanya Sensei</span><span>Simpan ke Kamus</span><span>Catat</span></div>
<div class="sen-a"><img src="/honix/08-menunjuk.png" alt=""><div><b lang="ja">提出（ていしゅつ）</b> = menyerahkan, mengumpulkan. Biasa dipakai buat dokumen, tugas, atau laporan.</div></div></div></div>`;
const tabs=$('#tabs'),tvD=$('#tvD'),tvM=$('#tvM'),tvT=$('#tvT'),tour=$('#tour');
tabs.innerHTML=T.map((x,i)=>`<button class="tab" role="tab" data-i="${i}"><span class="n">0${i+1}</span><b>${x.t} <span lang="ja">${x.j}</span></b><p>${x.p}</p><i></i></button>`).join('');
const subImg=(x,v)=>x.sub.map((s,k)=>s.img?`<div class="sb sbi" data-k="${k}"><img src="${v==='m'?s.imgm:s.img}" alt="Screenshot soal ${s.k}" loading="lazy"></div>`:`<div class="sb" data-k="${k}" role="img" aria-label="Contoh soal ${s.k}">${HXV[s.v]}</div>`).join('');
tvD.innerHTML=T.map(x=>`<div class="scr">${x.sub?subImg(x,'d'):`<img src="${x.d}" alt="Cuplikan ${x.t}" loading="lazy">`}</div>`).join('');
tvM.innerHTML=T.map(x=>`<div class="scr${x.fit?' fit':''}">${x.sub?subImg(x,'m'):`<img src="${x.m}" alt="Cuplikan ${x.t}" loading="lazy">`}</div>`).join('');
const subs=document.createElement('div');subs.className='subs';subs.setAttribute('role','tablist');subs.innerHTML=T.find(x=>x.sub).sub.map((s,k)=>`<button data-k="${k}" lang="ja">${s.k}</button>`).join('');$('.tv').prepend(subs);
let si=0,sTimer=null,sAuto=true;function setSub(k){si=k;$$('.subs button').forEach((b,j)=>b.classList.toggle('on',j===k));$$('.tv .sb').forEach(im=>im.classList.toggle('on',+im.dataset.k===k))}
function runSub(){clearInterval(sTimer);if(!T[ti].sub)return;if(sAuto&&!RM)sTimer=setInterval(()=>setSub((si+1)%3),2400)}
subs.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;sAuto=false;clearInterval(sTimer);setSub(+b.dataset.k)});setSub(0);
let ti=0,timer=null,auto=!RM;
function setTab(i,user){ti=i;$$('.tab').forEach((b,k)=>{b.classList.toggle('on',k===i);b.setAttribute('aria-selected',k===i)});
 [tvD,tvM].forEach(v=>[...v.children].forEach((c,k)=>c.classList.toggle('on',k===i)));tvT.textContent=T[i].p;
 $('.tv').classList.toggle('has-sub',!!T[i].sub);if(T[i].sub){if(sAuto)setSub(0);runSub()}else clearInterval(sTimer);
 if(user){auto=false;$$('.tab i').forEach(x=>x.style.display='none')}
 const b=$$('.tab')[i];if(user&&tabs.scrollWidth>tabs.clientWidth)tabs.scrollTo({left:b.offsetLeft-20,behavior:RM?'auto':'smooth'});
 clearTimeout(timer);if(auto)timer=setTimeout(()=>setTab((ti+1)%T.length),7000)}
tabs.addEventListener('click',e=>{const b=e.target.closest('.tab');if(b)setTab(+b.dataset.i,true)});
tour.addEventListener('mouseenter',()=>{if(!auto)return;clearTimeout(timer);tour.classList.add('paused')});
tour.addEventListener('mouseleave',()=>{if(!auto)return;tour.classList.remove('paused');setTab(ti)});
if(RM)$$('.tab i').forEach(x=>x.style.display='none');
setTab(0);
/* ---------- fitur per bab ---------- */
const MS=["misi","skor","cap","sering","kilat","flash","pembahasan","furi","tugas","strategi","kamus","catatan","progres","pamer"];
const CH=[
{k:'覚',t:'Hafalin',c:'var(--goi)',f:[['sering','🔥 Yang sering keluar didahuluin','Kata & pola yang paling sering muncul di soal ditandain, jadi kamu hafalin yang paling penting dulu.'],['bunpou','650 pola Bunpou, lengkap','Arti, penyambungan, contoh, sama pola mirip yang rawan ketuker.'],['kilat','Latihan Kilat','Drill pola & kata cepat. Yang hampir lupa muncul lagi pas waktunya.'],['flash','Flashcard','Ketuk buat lihat jawaban. Jadwal ulangnya diatur otomatis.','c']]},
{k:'練',t:'Latihan',c:'var(--bunpou)',f:[['pembahasan','Pembahasan di tiap soal','Kenapa jawabannya itu, kenapa pilihan lain salah, plus poin grammar-nya.'],['furi','Furigana sekali ketuk','Kanji yang belum kebaca? Ketuk sekali, cara bacanya muncul di soal & pilihan.'],['tugas','Lembar Tugas','Pilih level, bagian, dan jumlah soal sendiri. Latihan sesuai kebutuhan.'],['strategi','Strategi ujian per level','Pembagian waktu, nilai minimum, target skor aman, urutan ngerjain.']]},
{k:'録',t:'Catat & pantau',c:'var(--moji)',f:[['kamus','Kamus pribadi','Kata yang kamu simpan dari soal ngumpul di sini. Bisa dicari & di-export.'],['catatan','Catatan','Catat langsung dari soal, rapi per topik, bisa di-export.'],['progres','Progres & statistik','Akurasi per bagian 文字 · 語彙 · 文法 · 読解 · 聴解, plus jumlah soal yang udah dikerjain.'],['skor','Perkiraan skor per bagian','Dibanding nilai lulus & minimum 19 tiap bagian. Perkiraan, bukan skor resmi.']]},
{k:'続',t:'Konsisten',c:'var(--primary)',f:[['misi','Misi harian 10 / 20 / 40 menit','Ulang yang hampir lupa, materi baru, latihan soal. Tinggal pencet Mulai.','c'],['cap','Waktu belajar & kalender cap 学','Total jam, rekor hari terlama, dan cap tiap hari kamu belajar.'],['pamer','Kartu pamer','Total jam, streak, dan kalender cap siap dibagiin ke story atau feed.'],['xp','Lv Honix & XP','XP dari semua latihan. Honix ikut naik level bareng kamu.','x']]}];
const chT=$('#chT'),chL=$('#chL'),chS=$('#chS'),chW=$('#ch');
chT.innerHTML=CH.map((c,i)=>`<button role="tab" data-c="${i}" style="--cc:${c.c}"><b lang="ja">${c.k}</b><span>${c.t}</span><small>${c.f.length} fitur</small></button>`).join('');
let ci=0,fi=0;
function drawCh(){const C=CH[ci];chW.style.setProperty('--cc',C.c);$$('#chT button').forEach((b,i)=>{b.classList.toggle('on',i===ci);b.setAttribute('aria-selected',i===ci)});
 chL.innerHTML=C.f.map((f,i)=>`<button class="cf" data-f="${i}"><span class="cf-n">${String(i+1).padStart(2,'0')}</span><span class="cf-t"><b>${f[1]}</b><span>${f[2]}</span></span></button>`).join('');
 chS.innerHTML=C.f.map((f,i)=>`<figure class="cs${MS.includes(f[0])?' hm':''}" data-f="${i}"><picture>${MS.includes(f[0])?`<source media="(max-width:760px)" srcset="/landing/shots/m-${f[0]}.webp">`:''}<img src="/landing/shots/x-${f[0]}.webp" alt="Screenshot ${f[1]}" loading="lazy"></picture></figure>`).join('')+`<div class="ch-kj" lang="ja" aria-hidden="true">${C.k}</div>`;
 setF(0)}
function setF(i){fi=i;$$('#chL .cf').forEach((b,k)=>b.classList.toggle('on',k===i));$$('#chS .cs').forEach((f,k)=>f.classList.toggle('on',k===i))}
chT.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;ci=+b.dataset.c;drawCh()});
chL.addEventListener('click',e=>{const b=e.target.closest('.cf');if(b)setF(+b.dataset.f)});
chL.addEventListener('mouseover',e=>{if(!matchMedia('(hover:hover)').matches)return;const b=e.target.closest('.cf');if(b&&+b.dataset.f!==fi)setF(+b.dataset.f)});
drawCh();
/* ---------- pricing ---------- */
$('#tg').addEventListener('click',e=>{const b=e.target.closest('button');if(b){st.price=b.dataset.p;render()}});
/* ---------- install ---------- */
const ic=(id)=>`<svg><use href="#${id}"></use></svg>`;
function instLabel(){return st.inst?['Buka aplikasi','i-open']:st.dev==='ios'?['Pasang di iPhone','i-inst']:['Pasang aplikasi','i-inst']}
function icCard(){const I='<img src="/icons/icon-192.png" alt="">';
 if(st.inst)return `${I}<div class="ic-t"><b>Honix udah terpasang</b><span class="ic-ok">✓ Buka dari ikon Honix di layar utama</span></div><button class="btn btn-p" data-install="">${ic('i-open')}Buka aplikasi</button>`;
 if(st.dev==='ios')return `${I}<div class="ic-t"><b>Pasang di iPhone / iPad</b><span>Lewat Safari, 3 langkah</span></div><button class="btn btn-p" data-install="">${ic('i-share')}Lihat caranya</button>`;
 if(st.dev==='iosother')return `${I}<div class="ic-t"><b>Buka di Safari dulu ya</b><span>Browser di dalam aplikasi ini gak bisa masang Honix</span></div><button class="btn btn-p" data-install="">${ic('i-copy')}Salin link</button>`;
 if(st.dev==='other')return `${I}<div class="ic-t"><b>Pasang dari menu browser</b><span>Browser ini gak punya tombol pasang otomatis</span></div><button class="btn btn-p" data-install="">Lihat caranya</button>`;
 return `${I}<div class="ic-t"><b>Honix JLPT</b><span>honixjlpt.com · ${st.dev==='android'?'buat HP Android':'buat laptop (Chrome / Edge)'}</span></div><button class="btn btn-p" data-install="">${ic('i-inst')}Pasang aplikasi</button>`}
const ov=$('#ov'),shc=$('#shc'),bp=$('#bp');
function sheet(h){shc.innerHTML=`<div class="sh-g"></div><button class="sh-x" data-close="" aria-label="Tutup">${ic('i-x')}</button>${h}`;ov.classList.add('show');setTimeout(()=>(shc.querySelector('.btn')||shc.querySelector('.sh-x'))?.focus({preventScroll:true}),60)}
function close(){ov.classList.remove('show');bp?.classList.remove('show')}
const SH={
ios:()=>`<div class="sh-h">Pasang Honix di iPhone</div><p class="sh-p">Apple belum ngizinin tombol pasang otomatis, jadi lewat Safari. Cuma 3 langkah.</p>
<ol class="ios">
<li><b>Ketuk ${ic('i-share')} Bagikan</b><small>Di bar bawah Safari. Gak kelihatan? Ketuk ••• dulu. Di iPad, ada di kanan atas.</small><div class="ill bar"><span>${ic('i-back')}</span><span>${ic('i-fwd')}</span><span class="hl">${ic('i-share')}</span><span>${ic('i-book')}</span><span>${ic('i-tabs')}</span></div></li>
<li><b>Pilih ${ic('i-plus')} Tambah ke Layar Utama</b><small>Geser ke bawah kalau belum kelihatan.</small><div class="ill list"><div>Salin ${ic('i-copy')}</div><div>Tambahkan ke Daftar Bacaan ${ic('i-book')}</div><div class="hl">Tambah ke Layar Utama ${ic('i-plus')}</div></div></li>
<li><b>Ketuk Tambah</b><small>Ikon Honix langsung muncul di layar utama.</small><div class="ill top"><span class="bl">Batal</span><span>Tambah ke Layar Utama</span><span class="hl">Tambah</span></div></li>
</ol><div class="sh-a"><button class="btn btn-p btn-w" data-close="">Oke, aku coba</button></div><p class="hint">Bisa dibuka lagi nanti dari Pengaturan → Pasang aplikasi.</p>`,
iosother:()=>`<div class="sh-h">Buka di Safari dulu ya</div><p class="sh-p">Kamu lagi buka Honix dari dalam aplikasi lain (Instagram, TikTok, dan sejenisnya). Dari sini Honix gak bisa dipasang.</p>
<div class="link"><span>honixjlpt.com</span><button class="btn btn-p" data-copy="">${ic('i-copy')}Salin link</button></div>
<p class="hint">Tempel di Safari, terus ketuk Bagikan → Tambah ke Layar Utama. Atau ketuk ••• di pojok layar → Buka di browser.</p>`,
other:()=>`<div class="sh-h">Pasang dari menu browser</div><p class="sh-p">Browser ini gak punya tombol pasang otomatis, tapi tetap bisa lewat menu.</p>
<ol class="ios"><li><b>Buka menu ⋮ browser</b><small>Biasanya di pojok kanan atas.</small></li><li><b>Pilih "Pasang aplikasi"</b><small>Di beberapa browser namanya "Tambahkan ke layar utama".</small></li></ol>
<div class="sh-a"><button class="btn btn-p btn-w" data-close="">Oke</button></div><p class="hint">Paling lancar pakai Chrome atau Edge.</p>`,
ok:()=>`<div class="ok-c"><img class="sh-hx" src="/honix/01-senang.png" alt=""><div class="sh-h">Honix udah terpasang!</div><p class="sh-p">${st.dev==='android'?'Ikonnya udah ada di layar utama HP kamu.':'Ikonnya ada di menu aplikasi atau dock. Bisa langsung kamu buka.'}</p>
<div class="sh-a"><button class="btn btn-p btn-w" data-act="open">${ic('i-open')}Buka aplikasi</button><button class="btn btn-g btn-w" data-close="">Nanti aja</button></div></div>`};
async function install(){
 if(st.inst)return act('open');
 if(st.dev==='ios'||st.dev==='iosother'||st.dev==='other')return sheet(SH[st.dev]());
 if(deferred){deferred.prompt();const r=await deferred.userChoice;deferred=null;if(r.outcome==='accepted'){st.inst=true;render();sheet(SH.ok())}return}
 sheet(SH.other())}
ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('[data-close]'))close();const c=e.target.closest('[data-copy]');if(c){navigator.clipboard?.writeText('https://www.honixjlpt.com').catch(()=>{});c.innerHTML='✓ Disalin';c.classList.replace('btn-p','btn-s')}});
addEventListener('keydown',e=>{if(e.key==='Escape')close()});
/* ---------- actions (demo: toast; prod: route) ---------- */
const toast=$('#toast');let tt;
function say(t){toast.textContent=t;toast.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>toast.classList.remove('show'),2200)}
/* Rute app: daftar & masuk = /login, Beranda = /, harga = /premium (alur Midtrans yang sekarang). */
function act(a,el){close();const ke=u=>{location.href=u};
 const paket=el?.dataset.paket||(st.price==='u'?'ujian':'bulanan');
 ({signup:()=>ke('/login?mode=daftar'),login:()=>ke('/login'),home:()=>ke('/'),open:()=>ke('/?src=pwa'),
  buy:()=>ke(st.login?`/premium?paket=${paket}`:`/login?mode=daftar`),install:()=>{go('pasang');install()}})[a]?.()}
document.addEventListener('click',e=>{const i=e.target.closest('[data-install]');if(i){e.preventDefault();return install()}const a=e.target.closest('[data-act]');if(a){e.preventDefault();act(a.dataset.act,a)}});
/* ---------- render ---------- */
function render(){
 document.body.classList.toggle('in',st.login);document.body.classList.toggle('testi',st.testi);
 const [l,i]=instLabel();$$('[data-install]').forEach(b=>{if(b.closest('#ic'))return;b.innerHTML=b.hasAttribute('data-icon-only')?ic(i):`${ic(i)}${l}`;b.setAttribute('aria-label',l)});
 $('#ic').innerHTML=icCard();
 $$('#tg button').forEach(b=>b.classList.toggle('on',b.dataset.p===st.price));
 const u=st.price==='u';$('#proN').textContent=u?'Paket Ujian':'Pro Bulanan';$('#proB').style.display=u?'':'none';
 $('#proP').textContent=u?'Rp 594.000':'Rp 129.000';$('#proU').textContent=u?'/ 6 bulan':'/ bulan';
 $('#proX').innerHTML=u?'≈ Rp 99.000/bulan · <b>hemat 23%</b>':'Bayar per bulan, perpanjang kalau mau';
 $('#proC').textContent=u?'Ambil Paket Ujian':'Ambil Pro Bulanan';
 $$('#qs details').forEach((d,k)=>{if(st.faq)d.open=true});
}
render();
/* ---------- scroll ui ---------- */
const nav=$('#nav'),mcta=$('#mcta'),hero=$('.hero');
function onS(){const y=scrollY;nav.classList.toggle('sc',y>8);mcta.classList.toggle('show',y>hero.offsetHeight*.75)}
addEventListener('scroll',onS,{passive:true});onS();
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});
$$('.rv').forEach((el,k)=>{el.style.transitionDelay=(RM?0:(k%4)*70)+'ms';io.observe(el)});
/* ---------- scroll ke bagian ---------- */
function go(id){const el=document.getElementById(id)||$('[data-sec='+id+']');if(!el)return;$$('.rv').forEach(r=>r.classList.add('in'));scrollTo({top:id==='hero'?0:el.getBoundingClientRect().top+scrollY-(innerWidth<=760?60:72),behavior:'auto'})}
if(q.get('go'))setTimeout(()=>go(q.get('go')),100);
window.HonixInstall={state:st,open:install,render};
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
})();
