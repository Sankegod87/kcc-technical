// Scan hub: one result card on the Scan page for every kind of code (fixture, gear, bulb, bulb sticker, storage cabinet),
// each with the actions that fit it. Scans from other pages still use the pop-up sheet.
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const A=v=>E(v).replace(/\\/g,'\\\\');
  let cur=null;
  const pill=(t,bg,fg)=>'<span style="font-size:11px;padding:3px 9px;border-radius:99px;background:'+bg+';color:'+fg+';font-weight:700;white-space:nowrap">'+E(t)+'</span>';
  const GOOD=['#E7F4EE','#0B5A46'], WARN=['#FAEEDA','#7A4A06'], BAD=['#FBE3DF','#8A241A'], INFO=['#E6F1FB','#0C447C'];
  const btn=(label,fn,cls)=>'<button class="btn '+(cls||'bgh')+' bsm" onclick="'+fn+'">'+label+'</button>';
  const head=(id,name,sub,p)=>'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div><div style="font-family:var(--mono);font-size:11px;color:var(--dim)">'+E(id)+'</div><div style="font-weight:700;font-size:16px">'+E(name)+'</div><div class="dim" style="font-size:12px">'+E(sub)+'</div></div>'+p+'</div>';
  const stat=(a,b)=>'<div><div class="dim" style="font-size:11px">'+E(a)+'</div><div style="font-weight:600;font-size:13px">'+E(b)+'</div></div>';
  const stats=l=>'<div style="display:flex;gap:22px;margin:10px 0;flex-wrap:wrap">'+l.join('')+'</div>';
  const acts=l=>'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">'+l.join('')+'</div>';

  function lookup(raw){
    let code=String(raw||'').trim(); const m=/storage=([^&#\s]+)/i.exec(code); if(m) code=decodeURIComponent(m[1]);
    const up=code.toUpperCase(); if(!up) return null;
    const sa=typeof stFind==='function'&&stFind(up); if(sa) return {t:'cab',o:sa,code:up};
    const h=typeof ssFind==='function'&&ssFind(up); if(h) return {t:h.type==='fixture'?'fix':'gear',o:h.obj,code:up};
    const inv=(db.inventory||[]).find(i=>String(i.bulbType).toUpperCase()===up); if(inv) return {t:'bulb',o:inv,code:up};
    const reg=(db.bulbRegistry||[]).find(b=>String(b.bulbId).toUpperCase()===up); if(reg) return {t:'sticker',o:reg,code:up};
    return {t:'none',code:up};
  }
  function render(){
    const el=document.getElementById('sh-result'); if(!el||!cur) return;
    const r=cur, o=r.o; let h='';
    if(r.t==='fix'){
      const out=o.status==='out';
      h=head(o.id,o.name,[o.category,o.location,o.bulbType].filter(Boolean).join(' · '),pill(out?'Out':'Working',...(out?BAD:GOOD)))+
        stats([stat('Last maintenance',o.lastMaint?ago(o.lastMaint):'Never'),stat('Outages',o.outageCount||0)])+
        acts([out?btn('Mark replaced',"openRepModal('"+A(o.id)+"')",'bg'):btn('Report outage',"openOutModal('"+A(o.id)+"')",'br'),btn('Log service',"shMaintFix('"+A(o.id)+"')"),btn('Details',"go('fixtures');viewFixture('"+A(o.id)+"')")]);
    } else if(r.t==='gear'){
      const co=activeCheckout(o.id), who=co&&(db.technicians.find(x=>x.id===co.personId)||{}).name;
      const due=o.serviceInterval&&o.lastServiceDate?o.lastServiceDate+o.serviceInterval*864e5:null;
      h=head(o.assetId||o.id,o.name,[o.category,o.dept].filter(Boolean).join(' · '),pill(co?'With '+(who||'someone'):'Available',...(co?WARN:GOOD)))+
        stats([stat(co?'Due back':'Last service',co&&co.dueDate?fmtDate(co.dueDate):(o.lastServiceDate?fmtDate(o.lastServiceDate):'Never')),stat('Service due',due?fmtDate(due):'—'),stat('Stored in',(typeof gearStoreName==='function'&&gearStoreName(o))||'Not set')])+
        acts([co?btn('Return it',"openReturnModal('"+A(co.id)+"')",'bg'):btn('Check out to me',"shCheckout('"+A(o.id)+"')",'bg'),btn('Log service',"shMaintGear('"+A(o.id)+"')"),btn('Report damage',"go('checkout')"),btn('Open gear',"go('checkout')")].concat(o.storageId?[btn('Show cabinet',"shShow('"+A(o.storageId)+"')")]:[]));
    } else if(r.t==='bulb'){
      const low=o.inStock<=o.threshold;
      h=head('Bulb stock',o.bulbType,'On the shelf',pill(low?'Low':'OK',...(low?BAD:GOOD)))+
        stats([stat('In stock',o.inStock),stat('Minimum',o.threshold),stat('Total used',o.totalUsed||0)])+
        acts([btn('Use one',"shBulb('use')",'bg'),btn('Add one to stock',"shBulb('add')"),btn('Request purchase',"shBuy()"),btn('Inventory',"go('inventory')")]);
    } else if(r.t==='sticker'){
      const lab={unassigned:'Printed, not on the shelf yet',in_stock:'In stock',installed:'Installed in '+(o.installedIn||'a fixture'),pulled:'Pulled, available',disposed:'Blown or disposed'}[o.status]||o.status;
      h=head(o.bulbId,o.bulbType,'Bulb sticker',pill(lab,...(o.status==='disposed'?BAD:o.status==='installed'?INFO:GOOD)))+
        acts([(o.status==='unassigned'||o.status==='pulled')?btn('Scan into stock',"scanBulbIn('"+A(o.bulbId)+"');shRefresh()",'bg'):'',btn('Inventory',"go('inventory')")].filter(Boolean));
    } else if(r.t==='cab'){
      const ls=String(o.contents||'').split('\n').map(s=>s.trim()).filter(Boolean);
      const gs=(db.gearItems||[]).filter(g=>g.storageId===o.id);
      h=head(o.id,o.name,(o.where||'Storage')+' · '+(ls.length+gs.length)+' items',pill('Storage',...INFO))+
        (gs.length?'<div class="dim" style="font-size:11px;margin-top:10px">Gear stored here</div><ul style="margin:4px 0 0;padding:0;list-style:none">'+gs.map(g=>'<li style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px"><span>'+E(g.name)+'</span><button class="btn bgh bsm" onclick="shShow(\''+A(g.assetId||g.id)+'\')">Open</button></li>').join('')+'</ul>':'')+
        (ls.length?'<ul style="margin:10px 0 0;padding:0;list-style:none">'+ls.map((x,i)=>'<li style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px"><span>'+E(x)+'</span><button class="btn bgh bsm" onclick="shCabTake('+i+')" title="Take this out of the list">Take out</button></li>').join('')+'</ul>':'<div class="dim" style="margin-top:10px;font-size:13px">Nothing listed yet.</div>')+
        '<div style="display:flex;gap:6px;margin-top:10px"><input id="sh-cab-add" placeholder="Add an item (e.g. HDMI cable, drawer 2)" style="flex:1" maxlength="120" onkeydown="if(event.key===\'Enter\')shCabAdd()"><button class="btn ba bsm" onclick="shCabAdd()">Add</button></div>'+
        acts([o.id==='BINDER'?btn('Open binder PDF',"window.open('manuals/kcc-binder.pdf','_blank','noopener')",'ba'):'',(typeof isAdmin==='function'&&isAdmin())?btn('Edit list',"stEdit('"+A(o.id)+"')"):''].filter(Boolean));
    } else {
      h='<div style="font-weight:700">Not found</div><div class="dim" style="font-size:13px;margin-top:4px">No fixture, gear, bulb or storage area uses the code <span style="font-family:var(--mono)">'+E(r.code)+'</span>. Check the label or type it again.</div>';
    }
    el.innerHTML='<div style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;background:var(--s2,transparent);margin-bottom:12px">'+h+'</div>';
  }
  window.shRefresh=function(){ if(cur){ const n=lookup(cur.code); if(n){ cur=n; render(); } } };
  window.shShow=function(code){ cur=lookup(code); if(!cur) return false; render(); const el=document.getElementById('sh-result'); if(el&&el.scrollIntoView) el.scrollIntoView({block:'nearest',behavior:'smooth'}); return true; };
  const me=()=>getCurTech&&getCurTech();
  window.shMaintFix=function(id){ markMaintDone(id); shRefresh(); };
  window.shMaintGear=function(id){
    const g=(db.gearItems||[]).find(x=>x.id===id); if(!g) return; const t=me();
    const notes=prompt('Maintenance notes (optional):',''); if(notes===null) return;
    const e={id:'ml_'+Date.now(),gearId:id,date:Date.now(),by:t?t.name:'',type:'Routine check',notes:(notes||'').trim(),cost:0,nextDue:null,photo:null};
    (db.maintLogs=db.maintLogs||[]).unshift(e); g.lastServiceDate=e.date; save(); toast('Service logged for '+g.name,'success'); shRefresh();
  };
  window.shCheckout=function(id){
    const t=me(), g=(db.gearItems||[]).find(x=>x.id===id); if(!t||!g){ toast('Select a technician first','error'); return; }
    if(activeCheckout(id)){ toast('Already checked out','error'); return; }
    const due=new Date(); due.setDate(due.getDate()+7); due.setHours(23,59,0,0);
    (db.checkouts=db.checkouts||[]).unshift({id:'co_'+Date.now(),gearId:id,personId:t.id,checkedOutAt:Date.now(),dueDate:due.getTime(),purpose:'',notes:'Scan checkout',returnedAt:null,returnCondition:null,returnNotes:null});
    save(); toast(g.name+' checked out to '+t.name+' (due in 7 days)','success'); shRefresh();
  };
  window.shBulb=function(k){
    if(!cur||cur.t!=='bulb') return; const i=cur.o;
    if(k==='use'){ if(i.inStock<=0){ toast('None left in stock','error'); return; } i.inStock--; i.totalUsed=(i.totalUsed||0)+1; }
    else { i.inStock++; i.totalReceived=(i.totalReceived||0)+1; }
    save(); try{ renderInv(); }catch(e){} toast(i.bulbType+': '+i.inStock+' in stock','success'); render();
  };
  window.shBuy=function(){
    if(!cur||cur.t!=='bulb') return; const n=cur.o.bulbType; go('inventory');
    setTimeout(()=>{ const f=document.getElementById('pr-form'); if(f&&f.style.display==='none'&&typeof prToggleForm==='function') prToggleForm(); const it=document.getElementById('pr-item'); if(it) it.value=n+' bulbs'; const p=document.getElementById('pr-panel'); if(p) p.scrollIntoView({behavior:'smooth',block:'start'}); },250);
  };
  function cabSave(a){ a.updated=Date.now(); const t=me(); a.by=t?t.name:''; save(); }
  window.shCabAdd=function(){
    if(!cur||cur.t!=='cab') return; const inp=document.getElementById('sh-cab-add'); const v=(inp.value||'').trim(); if(!v){ toast('Type what you are adding','error'); return; }
    const a=cur.o; a.contents=(String(a.contents||'').replace(/\s+$/,'')+'\n'+v).replace(/^\n/,'').slice(0,4000); cabSave(a); toast('Added to '+a.name,'success'); render();
  };
  window.shCabTake=function(i){
    if(!cur||cur.t!=='cab') return; const a=cur.o; const ls=String(a.contents||'').split('\n').map(s=>s.trim()).filter(Boolean); const x=ls.splice(i,1)[0];
    a.contents=ls.join('\n'); cabSave(a); toast('Took out: '+x,'info'); render();
  };
  window.addEventListener('DOMContentLoaded',()=>{
    const box=document.getElementById('scanResult');
    if(box&&!document.getElementById('sh-result')){ const d=document.createElement('div'); d.id='sh-result'; box.parentNode.insertBefore(d,box.nextSibling); }
    const lab=document.querySelector('#pg-scan #manualId'); if(lab&&lab.parentNode){ const l=lab.parentNode.querySelector('label'); if(l) l.textContent='Scan or type any code: fixture, gear, bulb or storage cabinet'; }
    const cam=document.getElementById('camBtn'); if(cam&&!document.getElementById('sh-rapid')){ const b=document.createElement('button'); b.id='sh-rapid'; b.className='btn ba'; b.style.cssText='width:100%;justify-content:center;margin-bottom:10px'; b.textContent='⚡ Rapid scan (check many items out or in)'; b.onclick=()=>{ if(typeof rsStart==='function') rsStart(); }; cam.parentNode.insertBefore(b,cam.nextSibling); }
    const _sh=smartHandleCode;
    smartHandleCode=function(code){ if(typeof _curPage!=='undefined'&&_curPage==='scan'&&shShow(code)) return; return _sh.apply(this,arguments); };
    const _rh=window.rsHandle;
    window.rsHandle=function(raw){
      const r=lookup(raw);
      if(r&&r.t!=='gear'&&r.t!=='none'){ rsStop(); go('scan'); setTimeout(()=>shShow(raw),200); return {ok:true,msg:r.code}; }
      return _rh.apply(this,arguments);
    };
    const _ogs=openGlobalScanner;
    openGlobalScanner=function(fieldTarget){
      if(fieldTarget) return _ogs.apply(this,arguments);
      closeScanSheet(); go('scan');
      setTimeout(()=>{ const c=document.getElementById('camBtn'); if(c&&/start/i.test(c.textContent)&&typeof toggleCamera==='function') toggleCamera(); },350);
    };
    const _go=go; go=function(p){ const r=_go.apply(this,arguments); if(p==='scan'&&cur) setTimeout(shRefresh,50); return r; };
  });
})();
