// QR gear labels + rapid scan. Labels hold the item's asset ID (or ID); scanning one opens the normal scan sheet,
// and Rapid scan keeps the camera open so a whole case can be checked out or returned scan by scan.
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const codeOf=g=>String(g.assetId||g.id);
  // Labels print from their own window with the QR codes drawn as images, so they always show.
  function labelSheet(title,list,cols,size,code,line1,line2){
    if(!list.length){ toast('Nothing to print yet','error'); return; }
    if(typeof QRCode==='undefined'){ toast('QR library not loaded. Refresh the app and try again.','error'); return; }
    const tmp=document.createElement('div'); tmp.style.cssText='position:fixed;left:-9999px;top:0'; document.body.appendChild(tmp);
    const imgs=list.map(x=>{ const d=document.createElement('div'); tmp.appendChild(d);
      try{ new QRCode(d,{text:String(code(x)),width:size*2,height:size*2,colorDark:'#000',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.M}); }catch(e){}
      const c=d.querySelector('canvas'), im=d.querySelector('img'); return c?c.toDataURL('image/png'):(im?im.src:''); });
    tmp.remove();
    const w=window.open('','_blank'); if(!w){ toast('Allow pop-ups to print the labels','error'); return; }
    w.document.write('<!doctype html><title>'+E(title)+'</title><body style="font-family:Arial,sans-serif;margin:12px"><div style="display:grid;grid-template-columns:repeat('+cols+',1fr);gap:8px">'+
      list.map((x,i)=>'<div style="border:1px dashed #999;padding:8px;text-align:center;break-inside:avoid"><img src="'+imgs[i]+'" width="'+size+'" height="'+size+'"><div style="font-weight:700;font-size:12px;margin-top:4px">'+E(line1(x))+'</div><div style="font-size:11px;color:#555">'+E(line2(x))+'</div>'+'<div style="margin-top:6px">'+(typeof kccBarcode==='function'?kccBarcode(String(code(x))).replace('<svg ','<svg style="max-width:100%" '):'')+'</div>'+'</div>').join('')+
      '</div><script>setTimeout(function(){print()},500)<\/script></body>');
    w.document.close();
  }
  window.qrLabelSheet=labelSheet;
  window.qrPrintLabels=function(){ labelSheet('Gear labels',db.gearItems||[],3,110,codeOf,g=>g.name,codeOf); };
  // QR labels for stage fixtures (code = fixture ID; scanning shows the fixture card)
  window.qrPrintFixtures=function(){ labelSheet('Fixture labels',db.fixtures||[],4,100,f=>f.id,f=>f.id,f=>f.name||f.type||''); };
  // ── rapid scan ──
  const RS={on:false,scanner:null,mode:'auto',last:'',lastAt:0,log:[]};
  window.rsHandle=function(raw){
    const code=String(raw||'').trim().toUpperCase(); if(!code) return null;
    if(code===RS.last&&Date.now()-RS.lastAt<2500) return null; RS.last=code; RS.lastAt=Date.now();
    const hit=ssFind(code), me=getCurTech(); let msg, ok=true;
    if(!hit||hit.type!=='gear'){ msg=code+' — not a gear item'; ok=false; }
    else if(!me){ msg='Sign in first'; ok=false; }
    else {
      const g=hit.obj, co=activeCheckout(g.id), who=co&&(db.technicians.find(t=>t.id===co.personId)||{}).name;
      const want=RS.mode==='auto'?(co?'in':'out'):RS.mode;
      if(want==='in'){
        if(!co){ msg=g.name+' is already in'; ok=false; }
        else { co.returnedAt=Date.now(); co.returnCondition='Good'; co.returnNotes='Rapid scan return'; msg='↩ '+g.name+' returned'+(who?' (was with '+who+')':''); }
      } else {
        if(co){ msg=g.name+' is out with '+(who||'someone'); ok=false; }
        else { const due=new Date(); due.setDate(due.getDate()+7); due.setHours(23,59,0,0);
          (db.checkouts=db.checkouts||[]).unshift({id:'co_'+Date.now()+'_'+RS.log.length,gearId:g.id,personId:me.id,checkedOutAt:Date.now(),dueDate:due.getTime(),purpose:'',notes:'Rapid scan checkout',returnedAt:null,returnCondition:null,returnNotes:null});
          msg='↗ '+g.name+' out to '+me.name; }
      }
      if(ok) save();
    }
    RS.log.unshift({ok,msg}); RS.log=RS.log.slice(0,30); rsPaint(); try{ if(navigator.vibrate) navigator.vibrate(ok?60:[40,40,40]); }catch(e){}
    return {ok,msg};
  };
  function rsPaint(){
    const l=document.getElementById('rs-log'); if(!l) return;
    l.innerHTML=RS.log.map(x=>`<div style="padding:8px 10px;border-bottom:1px solid var(--border);color:${x.ok?'var(--text)':'var(--red)'}">${E(x.msg)}</div>`).join('')||'<div class="dim" style="padding:12px">Point the camera at a label. Each scan is saved straight away.</div>';
  }
  window.rsSetMode=function(m){ RS.mode=m; document.querySelectorAll('#rs-modes .btn').forEach(b=>b.classList.toggle('ba',b.dataset.m===m)); };
  window.rsStart=function(){
    if(RS.on) return; RS.on=true; RS.log=[]; RS.last='';
    const w=document.createElement('div'); w.id='rs-wrap'; w.style.cssText='position:fixed;inset:0;z-index:9000;background:var(--bg,#0b0f0e);display:flex;flex-direction:column';
    w.innerHTML=`<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border)"><b style="flex:1">Rapid scan</b><div id="rs-modes" style="display:flex;gap:4px">
      <button class="btn bsm ba" data-m="auto" onclick="rsSetMode('auto')">Auto</button><button class="btn bgh bsm" data-m="out" onclick="rsSetMode('out')">Check out</button><button class="btn bgh bsm" data-m="in" onclick="rsSetMode('in')">Return</button></div>
      <button class="btn bgh bsm" onclick="rsStop()">Done</button></div>
      <div id="rs-reader" style="width:100%;max-width:420px;margin:8px auto;min-height:240px"></div>
      <div style="display:flex;gap:6px;padding:0 12px 8px"><input id="rs-manual" placeholder="or type a code" style="flex:1"><button class="btn bgh bsm" onclick="rsHandle(document.getElementById('rs-manual').value);document.getElementById('rs-manual').value=''">Add</button></div>
      <div id="rs-log" style="flex:1;overflow:auto;font-size:14px"></div>`;
    document.body.appendChild(w); rsPaint();
    try{ RS.scanner=new Html5Qrcode('rs-reader'); RS.scanner.start({facingMode:'environment'},{fps:10,qrbox:{width:220,height:220}},c=>rsHandle(c),()=>{}).catch(e=>toast('Camera error: '+e,'error')); }catch(e){ toast('Camera not available — type codes instead','error'); }
  };
  window.rsStop=function(){
    RS.on=false; try{ if(RS.scanner){ RS.scanner.stop().catch(()=>{}); RS.scanner=null; } }catch(e){}
    const w=document.getElementById('rs-wrap'); if(w) w.remove();
    try{ renderCheckout(); }catch(e){}
  };
  // add the two buttons to the Asset Checkout header
  function addButtons(){
    const bar=document.querySelector('#pg-checkout .row.gap8'); if(!bar||document.getElementById('qr-btns')) return;
    const s=document.createElement('span'); s.id='qr-btns'; s.style.display='contents';
    s.innerHTML='<button class="btn ba" onclick="rsStart()">⚡ Rapid scan</button><button class="btn bgh" data-perm="admin" onclick="qrPrintLabels()">🏷️ Print QR labels</button>';
    bar.insertBefore(s,bar.firstChild);
    const adm=isAdmin(); s.querySelectorAll('[data-perm]').forEach(b=>b.style.display=adm?'':'none');
  }
  // js/17 loads after this file, so wrap once every script is in
  window.addEventListener('DOMContentLoaded',()=>{ const _rc=renderCheckout; renderCheckout=function(){ addButtons(); return _rc.apply(this,arguments); }; });
})();
