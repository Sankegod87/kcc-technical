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
  // Export the whole asset (gear) list as a spreadsheet file (CSV opens in Excel and Google Sheets).
  window.exportGearList=function(){
    const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"', d=t=>t?new Date(t).toLocaleDateString('en-CA'):'';
    const rows=[['Asset ID','Name','Category','Department','Qty','Stored in','Status','Checked out to','Due back','Last service','Service every (days)','Notes']];
    [...(db.gearItems||[])].sort((a,b)=>String(a.category||'').localeCompare(String(b.category||''))||String(a.name||'').localeCompare(String(b.name||''))).forEach(g=>{
      const co=typeof activeCheckout==='function'?activeCheckout(g.id):null, who=co?((db.technicians||[]).find(x=>x.id===co.personId)||{}).name||'':'';
      rows.push([g.assetId||g.id,g.name,g.category,g.dept,g.qty||1,gearStoreName(g),co?'Checked out':'Available',who,co?d(co.dueDate):'',d(g.lastServiceDate),g.serviceInterval||'',g.notes||'']);
    });
    if(rows.length<2){ toast('No gear to export yet','error'); return; }
    const blob=new Blob(['\ufeff'+rows.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='kcc-asset-list-'+new Date().toLocaleDateString('en-CA')+'.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    toast('Exported '+(rows.length-1)+' items','success');
  };
})();
