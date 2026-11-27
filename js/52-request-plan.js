// Request planning (admin): crew needed, estimated hours, gear for the event, and links to files.
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function build(){
    if(document.getElementById('erp-box')) return;
    const notes=document.getElementById('er-notes'); if(!notes) return; const row=notes.parentNode;
    const d=document.createElement('div'); d.id='erp-box'; d.style.cssText='grid-column:1/-1;border-top:1px solid var(--border);padding-top:12px;margin-top:4px';
    d.innerHTML='<div class="fw7 mb8" style="font-size:13px">Plan</div>'+
      '<div class="fgrid"><div class="fg"><label>Crew needed</label><input id="erp-crew" type="number" min="0" max="50" placeholder="e.g. 3"></div>'+
      '<div class="fg"><label>Estimated hours</label><input id="erp-hours" type="number" min="0" max="200" step="0.5" placeholder="e.g. 4"></div></div>'+
      '<div class="fg"><label>Gear for this event</label><input id="erp-gsearch" placeholder="Search gear…" oninput="erpFilter()" style="margin-bottom:6px"><div id="erp-gear" style="max-height:150px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:6px 10px"></div></div>'+
      '<div class="fg"><label>Links to files (one per line)</label><textarea id="erp-links" rows="3" placeholder="https://drive.google.com/…" style="min-height:60px"></textarea></div>';
    row.parentNode.insertBefore(d,row);
  }
  window.erpFilter=function(){ const q=(document.getElementById('erp-gsearch').value||'').toLowerCase(); document.querySelectorAll('#erp-gear label').forEach(l=>{ l.style.display=l.textContent.toLowerCase().includes(q)?'':'none'; }); };
  function fill(r){
    build();
    document.getElementById('erp-crew').value=r.crewNeeded||''; document.getElementById('erp-hours').value=r.estHours||'';
    document.getElementById('erp-links').value=(r.fileLinks||[]).join('\n'); document.getElementById('erp-gsearch').value='';
    const sel=new Set(r.gearIds||[]);
    const items=[...(db.gearItems||[])].sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    document.getElementById('erp-gear').innerHTML=items.length?items.map(g=>{
      const out=typeof activeCheckout==='function'&&activeCheckout(g.id);
      return '<label style="display:flex;gap:8px;align-items:center;padding:3px 0;font-size:13px;text-transform:none;letter-spacing:0"><input type="checkbox" value="'+E(g.id)+'"'+(sel.has(g.id)?' checked':'')+'><span>'+E(g.name)+(g.assetId?' <span class="dim">('+E(g.assetId)+')</span>':'')+(out?' <span style="color:var(--amber,#e0a800)">checked out</span>':'')+'</span></label>';
    }).join(''):'<div class="dim" style="font-size:12px">No gear in the list yet.</div>';
  }
  window.addEventListener('DOMContentLoaded',()=>{
    const _o=openEditRequest; openEditRequest=function(id){ const r=(db.techRequests||[]).find(x=>x.id===id); if(r&&isAdmin()) fill(r); return _o.apply(this,arguments); };
    const _s=saveRequestEdit; saveRequestEdit=function(){
      const id=document.getElementById('er-id').value, r=(db.techRequests||[]).find(x=>x.id===id);
      if(r&&isAdmin()&&document.getElementById('erp-box')){
        const links=(document.getElementById('erp-links').value||'').split(/[\s,]+/).map(x=>x.trim()).filter(Boolean);
        if(links.some(x=>!/^https:\/\/[^\s<>"']+$/i.test(x)||x.length>300)){ toast('Each file link must start with https://','error'); return; }
        const crew=parseInt(document.getElementById('erp-crew').value,10), hrs=parseFloat(document.getElementById('erp-hours').value);
        r.crewNeeded=crew>0?Math.min(crew,50):0; r.estHours=hrs>0?Math.round(Math.min(hrs,200)*2)/2:0; r.fileLinks=links.slice(0,10);
        r.gearIds=[...document.querySelectorAll('#erp-gear input:checked')].map(i=>i.value);
      }
      return _s.apply(this,arguments);
    };
  });
})();
