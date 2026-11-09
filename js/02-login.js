// ── Sync UI ──
function setSyncState(s,m){document.getElementById('sdot').className='sdot '+s;document.getElementById('stxt').textContent=m;}
window.setSyncState=setSyncState;
function updSyncTime(){document.getElementById('stime').textContent='Last sync: '+new Date().toLocaleTimeString();}
window.updSyncTime=updSyncTime;
window.addEventListener('syncStatus',e=>{const{state,msg}=e.detail;setSyncState(state,msg);if(state==='ok')updSyncTime();});

// ══════════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════════
let _lsSelectedId = null;

function showLoginScreen(){
  if(location.hash==='#request'||location.hash==='#external-request'){showExternalRequestScreen();return;}
  const screen = document.getElementById('loginScreen');
  screen.style.display = 'flex';
  // Reset to step 1
  const rp=document.getElementById('ls-step2');if(rp)rp.style.display='none';
  const d1=document.getElementById('ls-dot-1'),d2=document.getElementById('ls-dot-2');
  if(d1)d1.className='ls-step-dot on';if(d2)d2.className='ls-step-dot off';
  const sl=document.getElementById('ls-step-label');if(sl)sl.textContent='Step 1 of 2 — Select your name';
  if(document.getElementById('ls-pw'))document.getElementById('ls-pw').value='';
  if(document.getElementById('ls-err'))document.getElementById('ls-err').style.display='none';
  _lsSelectedId=null;
  buildLsGrid();
}

function hideLoginScreen(){
  const screen = document.getElementById('loginScreen');
  screen.style.animation = 'none';
  screen.style.opacity = '0';
  screen.style.transition = 'opacity .25s';
  setTimeout(()=>{ screen.style.display='none'; screen.style.opacity=''; screen.style.transition=''; },250);
}

function buildLsGrid(){
  const grid = document.getElementById('ls-userGrid');
  const noUsers = document.getElementById('ls-noUsers');
  const firstRun = document.getElementById('ls-firstRun');
  if(!db.technicians.length){
    if(grid) grid.innerHTML = '';
    if(noUsers) noUsers.style.display = 'none';
    if(firstRun) firstRun.style.display = '';
    return;
  }
  if(noUsers) noUsers.style.display = 'none';
  if(firstRun) firstRun.style.display = 'none';
  const activeTechs = db.technicians.filter(isTechActive);
  if(!activeTechs.length){
    if(grid) grid.innerHTML = '<p class="dim" style="padding:20px 0;text-align:center">All crew accounts are inactive. Contact an admin.</p>';
    return;
  }
  grid.innerHTML = activeTechs.map(t=>{
    const roleLabel = t.userRole==='master'?'👑 Master':t.userRole==='admin'?'🔑 Admin':'';
    const deptColor = {Lighting:'#5DCAA5',Audio:'#85B7EB',Cameras:'#EF9F27',IT:'#B4B2A9'}[t.dept]||'rgba(255,255,255,.3)';
    return `<div class="ls-user-btn" data-id="${t.id}" onclick="lsSelectUser('${t.id}')">
      <div class="ls-av">${t.avatar||'👤'}</div>
      <div class="ls-uname">${t.name.split(' ')[0]}</div>
      ${t.dept?`<div class="ls-dept-tag">${t.dept}</div>`:''}
      ${roleLabel?`<div class="ls-role-tag" style="font-size:8px;background:rgba(15,110,86,.2);color:#5DCAA5;padding:1px 5px;border-radius:6px">${roleLabel}</div>`:''}
    </div>`;
  }).join('');
}

function lsSelectUser(id){
  const t0=db.technicians.find(x=>x.id===id);
  if(t0 && !isTechActive(t0)){ toast('This account is inactive','error'); return; }
  _lsSelectedId=id;
  const t=db.technicians.find(x=>x.id===id);if(!t)return;
  // Highlight selected tile
  document.querySelectorAll('.ls-user-btn').forEach(b=>b.classList.remove('selected'));
  const tile=document.querySelector('.ls-user-btn[data-id="'+id+'"]');
  if(tile) tile.classList.add('selected');
  // Show right panel
  const rp=document.getElementById('ls-step2');
  if(rp){rp.style.display='';rp.style.animation='lsSlideUp .3s ease-out';}
  // Update step dots on left
  const d1=document.getElementById('ls-dot-1'),d2=document.getElementById('ls-dot-2');
  const sl=document.getElementById('ls-step-label');
  if(d1){d1.className='ls-step-dot off';}if(d2){d2.className='ls-step-dot on';}
  if(sl) sl.textContent='Step 2 of 2 — Enter password';
  document.getElementById('ls-avatar').textContent = t.avatar||'👤';
  document.getElementById('ls-name').textContent = t.name;
  const roleLabel = t.userRole==='master'?'👑 Master Admin':t.userRole==='admin'?'🔑 User Admin':'👤 Regular User';
  document.getElementById('ls-role').textContent = (t.role||'Technician')+' · '+roleLabel;
  document.getElementById('ls-pw').value = '';
  document.getElementById('ls-err').style.display = 'none';
  // Focus only on non-touch devices — on iOS, programmatic focus in setTimeout is blocked
  if(!('ontouchstart' in window)){
    setTimeout(()=>document.getElementById('ls-pw').focus(), 100);
  }
}

function lsBack(){
  document.getElementById('ls-step2').style.display='none';
  document.getElementById('ls-pw').value='';
  document.getElementById('ls-err').style.display='none';
  _lsSelectedId=null;
  // Reset step dots
  const d1=document.getElementById('ls-dot-1'),d2=document.getElementById('ls-dot-2');
  const sl=document.getElementById('ls-step-label');
  if(d1){d1.className='ls-step-dot on';}if(d2){d2.className='ls-step-dot off';}
  if(sl) sl.textContent='Step 1 of 2 — Select your name';
  // Remove selected highlight from tiles
  document.querySelectorAll('.ls-user-btn').forEach(b=>b.classList.remove('selected'));
}

function lsSubmit(){
  const t = db.technicians.find(x=>x.id===_lsSelectedId);
  if(!t){
    // Tech not found — could be a Firebase sync timing issue; go back to step 1
    lsBack();
    toast('Please select your name again','info');
    return;
  }
  if(!isTechActive(t)){ toast('This account is inactive','error'); lsBack(); return; }
  const pw = document.getElementById('ls-pw').value;
  if(simpleHash(pw) !== t.passwordHash){
    document.getElementById('ls-err').style.display = '';
    document.getElementById('ls-pw').value = '';
    document.getElementById('ls-pw').focus();
    // Shake animation
    const card = document.getElementById('ls-step2');
    card.style.animation = 'none';
    card.style.transform = 'translateX(-8px)';
    setTimeout(()=>{ card.style.transition='transform .1s'; card.style.transform='translateX(8px)'; },80);
    setTimeout(()=>{ card.style.transform='translateX(-4px)'; },160);
    setTimeout(()=>{ card.style.transform='translateX(0)'; card.style.transition=''; },240);
    return;
  }
  lsLogin(t.id);
}

function lsLogin(id){
  _techId = id;
  try{ localStorage.setItem(TECH_KEY, id); }catch(e){}
  updTechUI();
  applyPermissions();
  hideLoginScreen();
  const t = db.technicians.find(x=>x.id===id);
  go(homePage()); // pre-render behind home screen
  showHomeScreen();
  // Check master admin claim
  setTimeout(()=>{
    const hasMaster=db.technicians.some(t=>t.userRole==='master');
    if(!hasMaster&&getCurTech()) toast('💡 No master admin set — go to Settings','info');
  },1200);
}

// ── Home Screen ──
function showHomeScreen(){
  const t = getCurTech();
  if(!t){ showLoginScreen(); return; }

  // Populate greeting
  document.getElementById('hs-avatar').textContent = t.avatar||'👤';
  document.getElementById('hs-name').textContent = t.name;
  const roleLabel = t.userRole==='master'?'👑 Master Admin':t.userRole==='admin'?'🔑 User Admin':'👤 Regular User';
  document.getElementById('hs-role').textContent = (t.role||'Crew')+' · '+roleLabel;

  // Show this Sunday's schedule if it exists
  const now = new Date();
  const daysUntilSun = (7 - now.getDay()) % 7 || 7;
  const sun = new Date(now); sun.setDate(now.getDate() + daysUntilSun);
  const key = schedKey(sun);
  const entry = db.schedules[key];
  const sundayEl = document.getElementById('hs-sunday');
  const sundayContent = document.getElementById('hs-sunday-content');

  if(entry && entry.crew && entry.crew.length){
    sundayEl.style.display = '';
    const myEntry = entry.crew.includes(t.id);
    const myRole = entry.roles?.[t.id];
    const dateStr = sun.toLocaleDateString('en-CA',{month:'long',day:'numeric'});
    const stationIcon = Object.fromEntries(getScheduleRoles().map(r=>[r.name,r.icon]));
    sundayContent.innerHTML =
      '<div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.8);margin-bottom:6px">'+dateStr+'</div>' +
      (myEntry
        ? '<div style="color:#5DCAA5;font-size:13px;margin-bottom:8px">✅ You are on the roster · <strong>'+(stationIcon[myRole]||'')+(myRole||'No station set')+'</strong></div>'
        : '<div style="color:#F09595;font-size:12px;margin-bottom:8px;display:flex;align-items:center;gap:6px"><span style="font-size:16px">🚫</span> You are <strong>not scheduled</strong> this week</div>') +
      '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
      entry.crew.map(id=>{
        const cr=db.technicians.find(x=>x.id===id);
        if(!cr) return '';
        const role=entry.roles?.[id]||'';
        const isMe = id === t.id;
        return '<div style="background:rgba(255,255,255,.06);border:1px solid '+(isMe?'rgba(15,110,86,.6)':'rgba(255,255,255,.1)')+';border-radius:20px;padding:3px 10px;font-size:11px;font-family:var(--mono);color:'+(isMe?'#9FE1CB':'rgba(255,255,255,.5)')+(isMe?';font-weight:700':'')+'">'+
          (cr.avatar||'👤')+' '+cr.name.split(' ')[0]+(role?' · '+(stationIcon[role]||role):'')+'</div>';
      }).join('') + '</div>';
  } else {
    sundayEl.style.display = '';
    const dateStr = sun.toLocaleDateString('en-CA',{month:'long',day:'numeric'});
    sundayContent.innerHTML =
      '<div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.8);margin-bottom:6px">'+dateStr+'</div>' +
      '<div style="color:rgba(255,255,255,.35);font-size:12px;display:flex;align-items:center;gap:6px"><span style="font-size:16px">📋</span> No roster set yet for this Sunday</div>';
  }

  document.getElementById('homeScreen').style.display = 'flex';
  document.getElementById('homeScreen').style.animation = 'fadeIn .25s';
}

function hideHomeScreen(){
  const el = document.getElementById('homeScreen');
  el.style.opacity = '0';
  el.style.transition = 'opacity .2s';
  setTimeout(()=>{ el.style.display='none'; el.style.opacity=''; el.style.transition=''; },200);
}

function hsGo(page){
  hideHomeScreen();
  go(page);
}

function lsForgot(){
  alert('Ask your Master Admin or User Admin to reset your password on the Crew page.');
}

function lsLogout(){
  _techId = null;
  try{ localStorage.removeItem(TECH_KEY); }catch(e){}
  updTechUI();
  applyPermissions();
  // Hide home screen if visible
  const hs=document.getElementById('homeScreen');
  if(hs) hs.style.display='none';
  buildLsGrid();
  showLoginScreen();
}

// Update login screen sync status
window.addEventListener('syncStatus', e=>{
  const el = document.getElementById('ls-syncStatus');
  if(el) el.textContent = e.detail.msg;
  if(e.detail.state==='ok'){
    // Rebuild login grid in case technicians just arrived from Firebase
    buildLsGrid();
    // If a session is already active, refresh home screen Sunday preview with fresh data
    if(_techId && getCurTech()){
      const hs = document.getElementById('homeScreen');
      if(hs && hs.style.display !== 'none') showHomeScreen();
    }
  }
});
