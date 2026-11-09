// ══════════════════════════════════════════════════
// PERMISSION SYSTEM
// 👑 master  — full access, only 1
// 🔑 admin   — manage crew/fixtures/inventory/schedule
// 👤 user    — report outages, replacements, receive bulbs
// ══════════════════════════════════════════════════
function curRole(){
  const t=getCurTech();
  if(!t) return 'user';
  return t.userRole||'user';
}
function isMaster(){ return curRole()==='master'; }
// Admins land on the Control Room; everyone else lands on Service Day.
function homePage(){ return isAdmin()?'dashboard':'sunday'; }
function isAdmin(){  return curRole()==='admin' || isMaster(); }
function isUser(){   return true; } // everyone can do basic actions

// Show/hide elements based on role
function applyPermissions(){
  const master = isMaster();
  const admin  = isAdmin();
  // Master-only buttons
  document.querySelectorAll('[data-perm="master"]').forEach(el=>{
    el.style.display = master ? '' : 'none';
  });
  // Admin+ buttons
  document.querySelectorAll('[data-perm="admin"]').forEach(el=>{
    el.style.display = admin ? '' : 'none';
  });
}
