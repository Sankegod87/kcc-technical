// Training modules: several manual links per module, linked gear, and a short pass/fail quiz that completes the module.
// Extra fields on a module: links:[{label,url}], gearIds:[id], quiz:{pass:80, qs:[{q, opts:[...], a:index}]}
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mod=id=>(db.trainingModules||[]).find(m=>m.id===id);
  const hasQuiz=m=>!!(m&&m.quiz&&m.quiz.qs&&m.quiz.qs.length);
  const overlay=(id,inner)=>{ closeOv(id); const o=document.createElement('div'); o.id=id; o.className='mover'; o.style.cssText='display:flex;z-index:9100'; o.innerHTML='<div class="modal" style="max-width:560px;width:100%">'+inner+'</div>'; document.body.appendChild(o); return o; };
  const closeOv=id=>{ const o=document.getElementById(id); if(o) o.remove(); };

  // ── what crew see inside a module ──
  function extras(m){
    const links=(m.links||[]).filter(l=>safeUrl(l.url)).map(l=>`<div class="tm-resource"><span style="font-size:18px">📘</span><a href="${E(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer" style="color:var(--blue);font-size:13px">${E(l.label||'Manual')} →</a></div>`).join('');
    const gear=(m.gearIds||[]).map(id=>(db.gearItems||[]).find(g=>g.id===id)).filter(Boolean);
    const gearHtml=gear.length?`<div class="dim" style="font-size:12px;margin:8px 0 4px">Covers this gear:</div><div style="display:flex;gap:6px;flex-wrap:wrap">${gear.map(g=>`<span class="badge blow">${E(g.name)}</span>`).join('')}</div>`:'';
    const q=hasQuiz(m)?`<div style="margin-top:10px"><button class="btn ba bsm" onclick="tqStart('${E(m.id)}')">📝 Take the quiz (${m.quiz.qs.length} question${m.quiz.qs.length>1?'s':''}, pass ${m.quiz.pass||80}%)</button></div>`:'';
    return links+gearHtml+q;
  }
  function decorate(){
    const me=getCurTech(), done=(me&&me.completedModules)||[];
    (db.trainingModules||[]).forEach(m=>{
      const body=document.getElementById('tmb-'+m.id); if(!body||body.dataset.tq) return; body.dataset.tq='1';
      const acts=body.querySelector('div[style*="margin-top:10px"][style*="display:flex"]');
      const wrap=document.createElement('div'); wrap.innerHTML=extras(m);
      if(acts) body.insertBefore(wrap,acts); else body.appendChild(wrap);
      if(hasQuiz(m)){
        const hd=body.parentNode.querySelector('.tm-header .row.gap6.mb8'); if(hd) hd.insertAdjacentHTML('beforeend','<span style="background:#E6F1FB;color:#0C447C;border-radius:20px;padding:2px 8px;font-size:9px;font-family:var(--mono);font-weight:600">QUIZ</span>');
        if(!isAdmin()&&!done.includes(m.id)&&acts){ const b=acts.querySelector('button[onclick^="markModuleComplete"]'); if(b){ b.remove(); acts.insertAdjacentHTML('afterbegin','<span class="dim" style="font-size:12px;align-self:center">Pass the quiz to complete this module.</span>'); } }
      }
      if(isAdmin()&&acts) acts.insertAdjacentHTML('afterbegin',`<button class="btn bgh bsm" onclick="tqEdit('${E(m.id)}')">✎ Manuals &amp; quiz</button>`);
    });
  }
  // js/17 loads after this file, so wrap once every script is in
  window.addEventListener('DOMContentLoaded',()=>{ const _rt=renderTraining; renderTraining=function(){ const r=_rt.apply(this,arguments); try{decorate();}catch(e){console.warn(e);} return r; }; wrapGear(); });

  // ── gear detail: show linked manuals ──
  function wrapGear(){ const _rg=renderGearDetail; renderGearDetail=function(){
    const r=_rg.apply(this,arguments);
    try{
      const g=(db.gearItems||[]).find(x=>x.id===window._gdId), body=document.getElementById('gd-body'); if(!g||!body) return r;
      const ms=(db.trainingModules||[]).filter(m=>(m.gearIds||[]).includes(g.id)); if(!ms.length) return r;
      const me=getCurTech(), done=(me&&me.completedModules)||[];
      const html='<div class="gd-sec"><div class="gd-k">Manuals &amp; training</div>'+ms.map(m=>{
        const links=[].concat(m.url?[{label:'Resource',url:m.url}]:[],m.links||[]).filter(l=>safeUrl(l.url));
        return `<div style="margin:6px 0"><b>${E(m.title)}</b> ${done.includes(m.id)?'<span style="color:#2DD4A0">✓ done</span>':''}<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:2px">${links.map(l=>`<a href="${E(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer" style="color:var(--blue);font-size:13px">${E(l.label||'Open')} →</a>`).join('')}<a href="#" onclick="closeM('gearDetail');go('training');return false" style="font-size:13px">Open in Training${hasQuiz(m)?' (quiz)':''} →</a></div></div>`;}).join('')+'</div>';
      const acts=body.querySelector('.gd-acts'); if(acts) acts.insertAdjacentHTML('beforebegin',html); else body.insertAdjacentHTML('beforeend',html);
    }catch(e){console.warn(e);}
    return r;
  }; }

  // ── admin editor ──
  let ED=null;
  window.tqEdit=function(id){
    if(!isAdmin()) return; const m=mod(id); if(!m) return;
    ED={id,qs:JSON.parse(JSON.stringify((m.quiz&&m.quiz.qs)||[]))};
    const links=(m.links||[]).map(l=>(l.label?l.label+' | ':'')+l.url).join('\n');
    const gear=(db.gearItems||[]).map(g=>`<label style="display:flex;gap:6px;align-items:center;font-size:13px;margin:3px 0;text-transform:none;letter-spacing:0"><input type="checkbox" class="tq-g" value="${E(g.id)}" ${(m.gearIds||[]).includes(g.id)?'checked':''} style="width:auto"> ${E(g.name)}</label>`).join('')||'<div class="dim">No gear items yet.</div>';
    overlay('tq-ed',`<div class="mh"><span class="mt">Manuals &amp; quiz · ${E(m.title)}</span><button class="xb" onclick="closeOv_tq('tq-ed')">✕</button></div><div class="mb" style="max-height:70vh;overflow:auto">
      <div class="fg"><label>Manual links (one per line: <i>Label | https://…</i>)</label><textarea id="tq-links" style="min-height:70px" placeholder="X32 manual | https://drive.google.com/…&#10;Band layout | https://…">${E(links)}</textarea></div>
      <div class="fg"><label>Gear this module covers</label><div style="max-height:110px;overflow:auto;border:1px solid var(--border);border-radius:6px;padding:6px 10px">${gear}</div></div>
      <div class="fg"><label>Quiz pass mark (%)</label><input id="tq-pass" type="number" min="50" max="100" value="${(m.quiz&&m.quiz.pass)||80}" style="width:100px"></div>
      <div id="tq-qs"></div><button class="btn bgh bsm" onclick="tqAddQ()">+ Add question</button></div>
      <div class="mf"><button class="btn bgh" onclick="closeOv_tq('tq-ed')">Cancel</button><button class="btn ba" onclick="tqSave()">Save</button></div>`);
    paintQs();
  };
  window.closeOv_tq=closeOv;
  function readQs(){
    ED.qs=[...document.querySelectorAll('#tq-qs .tq-q')].map(el=>({q:el.querySelector('.tq-text').value.trim(),opts:[...el.querySelectorAll('.tq-opt')].map(i=>i.value.trim()),a:+((el.querySelector('input[type=radio]:checked')||{}).value||0)}));
  }
  function paintQs(){
    const box=document.getElementById('tq-qs'); if(!box) return;
    box.innerHTML=ED.qs.map((q,i)=>{ const opts=(q.opts||[]).concat(['','','','']).slice(0,4);
      return `<div class="tq-q" style="border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:10px"><div style="display:flex;gap:6px"><input class="tq-text" placeholder="Question ${i+1}" value="${E(q.q)}" style="flex:1"><button class="btn br bsm" onclick="tqDelQ(${i})">✕</button></div>
        ${opts.map((o,j)=>`<div style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="radio" name="tqa${i}" value="${j}" ${(q.a||0)===j?'checked':''} title="Correct answer" style="width:auto"><input class="tq-opt" placeholder="Answer ${String.fromCharCode(65+j)}${j<2?'':' (optional)'}" value="${E(o)}" style="flex:1"></div>`).join('')}
        <div class="dim" style="font-size:11px;margin-top:4px">Tick the circle next to the correct answer.</div></div>`; }).join('')||'<div class="dim" style="margin-bottom:8px">No quiz yet. Add a few questions; crew then pass it to complete the module.</div>';
  }
  window.tqAddQ=function(){ readQs(); if(ED.qs.length>=10){ toast('10 questions is the limit','error'); return; } ED.qs.push({q:'',opts:['','','',''],a:0}); paintQs(); };
  window.tqDelQ=function(i){ readQs(); ED.qs.splice(i,1); paintQs(); };
  window.tqSave=function(){
    if(!isAdmin()) return; readQs(); const m=mod(ED.id); if(!m) return;
    const links=[], bad=[];
    document.getElementById('tq-links').value.split('\n').map(s=>s.trim()).filter(Boolean).forEach(line=>{
      const p=line.split('|'), url=(p.length>1?p.slice(1).join('|'):p[0]).trim(), label=p.length>1?p[0].trim():'';
      if(safeUrl(url)&&/^https?:/i.test(url)) links.push({label:label.slice(0,60),url}); else bad.push(line);
    });
    if(bad.length){ toast('Link not recognised: '+bad[0].slice(0,50)+' (must start with https://)','error'); return; }
    const qs=[]; for(let i=0;i<ED.qs.length;i++){
      const q=ED.qs[i]; if(!q.q&&!q.opts.some(Boolean)) continue;
      const keep=[],map={}; q.opts.forEach((o,j)=>{ if(o){ map[j]=keep.length; keep.push(o); } });
      if(!q.q||keep.length<2||map[q.a]===undefined){ toast('Question '+(i+1)+' needs text, at least two answers and a correct answer','error'); return; }
      qs.push({q:q.q,opts:keep,a:map[q.a]});
    }
    const pass=Math.max(50,Math.min(100,parseInt(document.getElementById('tq-pass').value)||80));
    m.links=links; m.gearIds=[...document.querySelectorAll('.tq-g:checked')].map(c=>c.value);
    if(qs.length) m.quiz={pass,qs}; else delete m.quiz;
    save(); closeOv('tq-ed'); renderTraining(); toast('Saved','success');
  };

  // ── quiz runner ──
  let Q=null;
  window.tqStart=function(id){ const m=mod(id); if(!hasQuiz(m)) return; Q={id,i:0,right:0,answered:false,order:m.quiz.qs.map((_,i)=>i).sort(()=>Math.random()-.5)}; paintQ(); };
  function paintQ(){
    const m=mod(Q.id), n=m.quiz.qs.length;
    if(Q.i>=n){ return finish(m); }
    const q=m.quiz.qs[Q.order[Q.i]];
    overlay('tq-run',`<div class="mh"><span class="mt">${E(m.title)} · ${Q.i+1} of ${n}</span><button class="xb" onclick="closeOv_tq('tq-run')">✕</button></div><div class="mb">
      <div style="font-size:16px;font-weight:600;margin-bottom:12px">${E(q.q)}</div>
      ${q.opts.map((o,j)=>`<button class="btn bgh tq-o" data-j="${j}" style="display:block;width:100%;text-align:left;margin-bottom:8px;white-space:normal" onclick="tqAnswer(${j})">${E(o)}</button>`).join('')}
      <div id="tq-fb" style="min-height:22px;font-size:13px"></div></div><div class="mf"><span class="dim" style="flex:1;font-size:12px">Score so far: ${Q.right}</span><button class="btn ba" id="tq-next" style="display:none" onclick="tqNext()">${Q.i+1>=n?'See result':'Next'}</button></div>`);
  }
  window.tqAnswer=function(j){
    if(Q.answered) return; Q.answered=true; const m=mod(Q.id), q=m.quiz.qs[Q.order[Q.i]], ok=j===q.a; if(ok) Q.right++;
    document.querySelectorAll('.tq-o').forEach(b=>{ const k=+b.dataset.j; b.disabled=true; if(k===q.a){ b.style.borderColor='#2DD4A0'; b.style.background='rgba(45,212,160,.15)'; } else if(k===j){ b.style.borderColor='#FF8A80'; b.style.background='rgba(255,138,128,.15)'; } });
    document.getElementById('tq-fb').innerHTML=ok?'<span style="color:#2DD4A0">Correct ✓</span>':'<span style="color:#FF8A80">Not quite. Correct answer: '+E(q.opts[q.a])+'</span>';
    document.getElementById('tq-next').style.display='';
  };
  window.tqNext=function(){ Q.i++; Q.answered=false; paintQ(); };
  async function finish(m){
    const n=m.quiz.qs.length, pct=Math.round(Q.right/n*100), pass=m.quiz.pass||80, ok=pct>=pass, me=getCurTech();
    overlay('tq-run',`<div class="mh"><span class="mt">${E(m.title)} · Result</span><button class="xb" onclick="closeOv_tq('tq-run')">✕</button></div><div class="mb" style="text-align:center;padding:24px">
      <div style="font-size:44px;font-weight:700;color:${ok?'#2DD4A0':'#FF8A80'}">${pct}%</div><div style="margin:6px 0 12px">${Q.right} of ${n} correct · pass mark ${pass}%</div>
      <div style="font-size:15px">${ok?'Passed. This module is marked complete.':'Not passed this time. Have another look at the manual and try again.'}</div></div>
      <div class="mf">${ok?'':`<button class="btn ba" onclick="tqStart('${E(m.id)}')">Try again</button>`}<button class="btn bgh" onclick="closeOv_tq('tq-run')">Close</button></div>`);
    if(ok&&me&&!(me.completedModules||[]).includes(m.id)) await markModuleComplete(me.id,m.id);
  }
})();
