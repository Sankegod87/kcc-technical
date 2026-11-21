// Storage areas (the file cabinets at the tech desk): scan a cabinet's QR label and see what is inside.
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const areas=()=>db.storageAreas=db.storageAreas||[];
  const norm=c=>{ c=String(c||'').trim(); const m=/storage=([^&#\s]+)/i.exec(c); return (m?decodeURIComponent(m[1]):c).toUpperCase(); };
  const find=c=>areas().find(a=>String(a.id).toUpperCase()===norm(c));
  const link=a=>location.origin+location.pathname+'#storage='+encodeURIComponent(a.id);
  window.stFind=find;
  function close(){ const o=document.getElementById('st-modal'); if(o) o.remove(); }
  function shell(inner){
    let o=document.getElementById('st-modal');
    if(!o){ o=document.createElement('div'); o.id='st-modal'; o.className='mover'; o.style.display='flex'; o.onclick=e=>{ if(e.target===o) close(); }; document.body.appendChild(o); }
    o.innerHTML='<div class="modal" style="max-width:640px;max-height:92vh;overflow-y:auto">'+inner+'</div>';
  }
  const lines=a=>String(a.contents||'').split('\n').map(s=>s.trim()).filter(Boolean);
  window.stClose=close;
  window.stOpenList=function(){
    const adm=isAdmin();
    if(adm&&!areas().length){ [['CAB-1','File cabinet 1'],['CAB-2','File cabinet 2']].forEach(p=>areas().push({id:p[0],name:p[1],where:'Main KCC Technical desk',contents:'',updated:0,by:''})); save(); }
    shell('<div class="mh"><span class="mt">🗄️ Storage areas</span><button class="xb" onclick="stClose()">✕</button></div><div class="mb">'+
      (adm?'<div class="row gap6 mb14" style="flex-wrap:wrap"><button class="btn ba bsm" onclick="stAdd()">+ Add storage area</button><button class="btn bgh bsm" onclick="stPrintLabels()">🏷️ Print QR labels</button></div>':'')+
      (areas().length?areas().map(a=>'<div class="panel" style="margin-bottom:10px"><div class="pb"><div class="row jbet"><div><div class="fw7">'+E(a.name)+'</div><div class="dim" style="font-size:12px">'+E(a.id)+(a.where?' · '+E(a.where):'')+' · '+lines(a).length+' items</div></div><div class="row gap6"><button class="btn ba bsm" onclick="stView(\''+E(a.id)+'\')">Open</button>'+(adm?'<button class="btn bgh bsm" onclick="stEdit(\''+E(a.id)+'\')">Edit</button>':'')+'</div></div></div></div>').join(''):'<div class="dim">No storage areas yet.</div>')+
      '</div>');
  };
  window.stView=function(id){
    const a=find(id); if(!a){ toast('Storage area not found','error'); return; }
    const l=lines(a);
    shell('<div class="mh"><span class="mt">🗄️ '+E(a.name)+'</span><button class="xb" onclick="stClose()">✕</button></div><div class="mb"><div class="dim" style="margin-bottom:10px">'+E(a.id)+(a.where?' · '+E(a.where):'')+'</div>'+
      (l.length?'<ul style="margin:0 0 12px 18px;line-height:1.7">'+l.map(x=>'<li>'+E(x)+'</li>').join('')+'</ul>':'<div class="dim" style="margin-bottom:12px">Nothing listed yet.</div>')+
      (a.updated?'<div class="dim" style="font-size:11px">Updated '+new Date(a.updated).toLocaleDateString('en-CA')+(a.by?' by '+E(a.by):'')+'</div>':'')+
      '<div class="row gap6" style="margin-top:12px">'+(isAdmin()?'<button class="btn ba bsm" onclick="stEdit(\''+E(a.id)+'\')">Edit contents</button>':'')+'<button class="btn bgh bsm" onclick="stOpenList()">All areas</button></div></div>');
  };
  window.stEdit=function(id){
    const a=find(id); if(!a||!isAdmin()) return;
    shell('<div class="mh"><span class="mt">Edit '+E(a.name)+'</span><button class="xb" onclick="stClose()">✕</button></div><div class="mb">'+
      '<div class="fg"><label>Name</label><input id="st-name" value="'+E(a.name)+'"></div>'+
      '<div class="fg"><label>Where it is</label><input id="st-where" value="'+E(a.where||'')+'"></div>'+
      '<div class="fg"><label>What is inside (one item per line, add the drawer if you like)</label><textarea id="st-contents" rows="12" style="width:100%">'+E(a.contents||'')+'</textarea></div>'+
      '<div class="row gap6"><button class="btn ba" onclick="stSave(\''+E(a.id)+'\')">Save</button><button class="btn bgh" onclick="stOpenList()">Cancel</button><button class="btn bgh" style="margin-left:auto;color:var(--red)" onclick="stDel(\''+E(a.id)+'\')">Delete</button></div></div>');
  };
  window.stSave=function(id){
    const a=find(id); if(!a) return;
    a.name=(document.getElementById('st-name').value||'').trim().slice(0,80)||a.name;
    a.where=(document.getElementById('st-where').value||'').trim().slice(0,120);
    a.contents=(document.getElementById('st-contents').value||'').slice(0,4000);
    a.updated=Date.now(); const me=typeof getCurTech==='function'?getCurTech():null; a.by=me?me.name:'';
    save(); toast('Saved','success'); stView(id);
  };
  window.stAdd=function(){
    if(!isAdmin()) return; const n=areas().length+1; let id='CAB-'+n; while(find(id)) id='CAB-'+(++n);
    areas().push({id,name:'Storage area '+n,where:'Main KCC Technical desk',contents:'',updated:0,by:''}); save(); stEdit(id);
  };
  window.stDel=function(id){
    if(!isAdmin()||!confirm('Delete this storage area? Its printed QR label will stop working.')) return;
    db.storageAreas=areas().filter(a=>a.id!==id); save(); stOpenList();
  };
  window.stPrintLabels=function(){
    if(typeof QRCode==='undefined'){ toast('QR library not loaded. Refresh the app and try again.','error'); return; }
    const l=areas(); if(!l.length){ toast('No storage areas yet','error'); return; }
    const tmp=document.createElement('div'); tmp.style.cssText='position:fixed;left:-9999px;top:0'; document.body.appendChild(tmp);
    const imgs=l.map(a=>{
      const d=document.createElement('div'); tmp.appendChild(d);
      try{ new QRCode(d,{text:link(a),width:240,height:240,colorDark:'#000',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.M}); }catch(e){}
      const c=d.querySelector('canvas'), im=d.querySelector('img');
      return c?c.toDataURL('image/png'):(im?im.src:'');
    });
    tmp.remove();
    const w=window.open('','_blank'); if(!w){ toast('Allow pop-ups to print the labels','error'); return; }
    w.document.write('<!doctype html><title>Storage labels</title><body style="font-family:Arial,sans-serif;margin:16px"><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px">'+
      l.map((a,i)=>'<div style="border:1px dashed #999;padding:16px;text-align:center;break-inside:avoid"><img src="'+imgs[i]+'" width="220" height="220"><div style="font-weight:700;font-size:20px;margin-top:6px">'+E(a.name)+'</div><div style="font-family:monospace;font-size:15px">'+E(a.id)+'</div><div style="font-size:12px;color:#555">Scan to see what is inside</div></div>').join('')+
      '</div><script>setTimeout(function(){print()},500)<\/script></body>');
    w.document.close();
  };
  window.addEventListener('DOMContentLoaded',()=>{
    const pend=()=>{ const m=/^#storage=(.+)$/i.exec(location.hash||''); return m?decodeURIComponent(m[1]):''; };
    let want=pend();
    window.addEventListener('hashchange',()=>{ const x=pend(); if(x){ want=x; tryOpen(); } });
    function tryOpen(){ if(!want||!(typeof getCurTech==='function'&&getCurTech())) return; const a=find(want); want=''; try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){} if(a) stView(a.id); else toast('Storage area not found','error'); }
    const _go=go; go=function(){ const r=_go.apply(this,arguments); setTimeout(tryOpen,300); return r; };
    setTimeout(tryOpen,1500);
    const _sh=smartHandleCode; smartHandleCode=function(code){ const a=find(code); if(a){ stView(a.id); return; } return _sh.apply(this,arguments); };
  });
})();
