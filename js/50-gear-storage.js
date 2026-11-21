// "Stored in" for gear: pick which storage area (file cabinet) an item lives in. Shown on the scan card and in the cabinet list.
(function(){
  const areas=()=>db.storageAreas||[];
  const opts=sel=>'<option value="">Not in a storage area</option>'+areas().map(a=>'<option value="'+String(a.id).replace(/"/g,'&quot;')+'"'+(a.id===sel?' selected':'')+'>'+String(a.name).replace(/[<>&]/g,'')+' ('+a.id+')</option>').join('');
  function field(prefix){
    const v=document.getElementById(prefix+'-vendor'); if(!v) return null;
    let s=document.getElementById(prefix+'-store');
    if(!s){ const d=document.createElement('div'); d.className='fg'; d.innerHTML='<label>Stored in</label><select id="'+prefix+'-store"></select>'; v.parentNode.parentNode.insertBefore(d,v.parentNode.nextSibling); s=d.querySelector('select'); }
    return s;
  }
  function fill(prefix,sel){ const s=field(prefix); if(s) s.innerHTML=opts(sel||''); }
  window.gearStoreName=g=>{ const a=areas().find(x=>x.id===g.storageId); return a?a.name:''; };
  window.addEventListener('DOMContentLoaded',()=>{
    const _om=openM; openM=function(id){ const r=_om.apply(this,arguments); if(id==='addGearItem') fill('gi',''); return r; };
    const _oe=openEditGearItem; openEditGearItem=function(id){ const r=_oe.apply(this,arguments); const g=(db.gearItems||[]).find(x=>x.id===id); fill('egi',g&&g.storageId); return r; };
    const _sa=saveGearItem; saveGearItem=function(){
      const s=document.getElementById('gi-store'), v=s?s.value:'', before=(db.gearItems||[]).length;
      const r=_sa.apply(this,arguments);
      const l=db.gearItems||[]; if(l.length>before){ const n=l.reduce((a,b)=>(b.addedAt||0)>=(a.addedAt||0)?b:a); n.storageId=v; save(); }
      return r;
    };
    const _se=saveGearItemEdit; saveGearItemEdit=function(){
      const id=(document.getElementById('egi-id')||{}).value, s=document.getElementById('egi-store'), v=s?s.value:null;
      const r=_se.apply(this,arguments);
      if(v!==null&&isAdmin()){ const g=(db.gearItems||[]).find(x=>x.id===id); if(g){ g.storageId=v; save(); if(typeof renderCheckout==='function') renderCheckout(); } }
      return r;
    };
  });
})();
