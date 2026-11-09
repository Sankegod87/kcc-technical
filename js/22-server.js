// ══════════════════════════════════════════════════
// SERVER-SIDE SIGN-IN GLUE
// Sign-in, crew accounts, the YouTube key and the public request form all go through Cloud Functions.
// Browsers never see password hashes. See kcc-auth-core.js.
// ══════════════════════════════════════════════════
window._localDb=function(){return db;};

// Turn a Cloud Function error into a short message people can act on.
function srvErr(e){
  const c=String((e&&e.code)||'').replace('functions/','');
  if(c==='resource-exhausted'&&e.details&&e.details.retryAfter) return 'Too many tries — wait '+e.details.retryAfter+'s';
  if(!navigator.onLine||c==='unavailable'||c==='deadline-exceeded') return 'No connection — this needs the internet';
  if(c==='internal') return 'Server error — please try again';
  return (e&&e.message&&!/^(internal|unknown)$/i.test(e.message))?e.message:'Something went wrong';
}
function needCloud(){ if(window._syncMode!=='firebase'||!window._kccTechOp){toast('This needs the cloud connection','error');return false;} return true; }

// Run a crew/account action on the server, then pull the fresh crew list so the screen updates at once.
async function techCall(payload){
  if(!needCloud()) return null;
  try{ const r=await window._kccTechOp(payload); await refreshTechs(); return r||{ok:true}; }
  catch(e){ toast(srvErr(e),'error'); return null; }
}
async function refreshTechs(){
  try{
    const list=await window._fetchKey('technicians');
    if(list){ db.technicians=list; lsave(); try{ const b=syncGetBase(); if(b){b.technicians=list;syncSetBase(b);} }catch(e){} }
  }catch(e){}
}
// Small edits to one person's profile (training progress, certificates, own phone number...).
function techPatch(id,fields){ return techCall({op:'patch',id,fields}); }

// The signed-in person is whoever the server token says. Keep the app in step with it.
window.addEventListener('authChanged',function(){
  const uid=window._authUid&&window._authUid();
  if(uid){
    if(_techId!==uid){ _techId=uid; try{localStorage.setItem(TECH_KEY,uid);}catch(e){} }
    if(db.technicians.some(t=>t.id===uid)&&document.getElementById('loginScreen')?.style.display==='flex'&&typeof resumeSession==='function') resumeSession(uid);
  } else if(_techId){
    _techId=null; try{localStorage.removeItem(TECH_KEY);}catch(e){}
    updTechUI(); applyPermissions(); showLoginScreen();
  }
});
window.addEventListener('rosterChanged',function(){ if(typeof buildLsGrid==='function') buildLsGrid(); });
// A message to show after a forced sign-out reloads the page.
try{ const m=sessionStorage.getItem('kcc_msg'); if(m){ sessionStorage.removeItem('kcc_msg'); setTimeout(()=>toast(m,'info'),1200); } }catch(e){}

// The public request form needs no sign-in, so show it as soon as the page is ready (nothing else will trigger it).
function _showExtIfRequested(){ if((location.hash==='#request'||location.hash==='#external-request')&&typeof showExternalRequestScreen==='function') showExternalRequestScreen(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',_showExtIfRequested); else _showExtIfRequested();
window.addEventListener('hashchange',_showExtIfRequested);
