// ══════════════════════════════════════════════════
// ⬆️  SPREADSHEET IMPORT  (CSV + XLSX)
// ══════════════════════════════════════════════════
let _importType = '';
let _importRows = [];
let _importQueue = [];
let _importConflictRow = null;
let _importOverwriteAll = false;
let _importSkipAll = false;

// Column headers are matched ignoring case, spaces and punctuation, and a few common alternative names are accepted.
const _nk=k=>String(k).toLowerCase().replace(/[^a-z0-9]/g,'');
function getCol(r,names){
  if(!r._k){ Object.defineProperty(r,'_k',{value:Object.keys(r).reduce((m,k)=>{m[_nk(k)]=k;return m;},{}),enumerable:false}); }
  for(const n of names){ const k=r._k[_nk(n)]; if(k!==undefined&&String(r[k]).trim()!=='') return r[k]; }
  return undefined;
}
function parseImportDate(v){
  if(v===undefined||v==='') return undefined;
  if(typeof v==='number') return v>20000?Math.round((v-25569)*86400000):undefined;
  const t=String(v).trim(); const d=/^\d{4}-\d{2}-\d{2}$/.test(t)?new Date(t+'T12:00:00'):new Date(t);
  return isNaN(d)?undefined:d.getTime();
}
function findStorageId(v){
  if(v===undefined) return undefined; const t=String(v).trim().toLowerCase(); if(!t) return '';
  const a=(db.storageAreas||[]).find(x=>String(x.id).toLowerCase()===t||String(x.name).toLowerCase()===t||(String(x.name).toLowerCase()+' ('+String(x.id).toLowerCase()+')')===t);
  return a?a.id:undefined;
}
const IMPORT_SCHEMA = {
  fixtures: {
    hint: 'Required: <b>Fixture ID, Name, Bulb Type, Location</b> &nbsp;|&nbsp; Optional: Status, Department, Notes',
    idField: 'id',
    rowToObj(r){
      return {
        id:   (getCol(r,['Fixture ID','ID'])||'').toString().toUpperCase().trim(),
        name: (getCol(r,['Name'])||'').toString().trim(),
        bulbType: (getCol(r,['Bulb Type','Bulb'])||'').toString().trim(),
        location: (getCol(r,['Location'])||'').toString().trim(),
        status: (getCol(r,['Status'])||'ok').toString().toLowerCase().trim(),
        dept: (getCol(r,['Department','Dept'])||'').toString().trim(),
        notes: (getCol(r,['Notes'])||'').toString().trim(),
        added: Date.now()
      };
    },
    findDup(obj){ return (db.fixtures||[]).find(f=>f.id===obj.id); },
    applyToDb(obj, overwrite){
      const idx=(db.fixtures||[]).findIndex(f=>f.id===obj.id);
      if(idx>=0){ if(overwrite) db.fixtures[idx]={...db.fixtures[idx],...obj}; }
      else { db.fixtures.push(obj); }
    }
  },
  gear: {
    hint: 'Required: <b>Name</b> &nbsp;|&nbsp; Optional: Asset ID (made for you if blank), Category, Department, Qty, Stored in, Service every (days), Last service (YYYY-MM-DD), Notes. <br>Tip: use Export asset list, edit the file, then import it back. Existing items are matched by Asset ID and blank cells are left as they are.',
    idField: 'name',
    rowToObj(r){
      const o={};
      const nm=getCol(r,['Name','Item Name','Item']); if(nm!==undefined) o.name=String(nm).trim();
      const id=getCol(r,['Asset ID','Asset','AssetID']); o.assetId=id!==undefined?String(id).toUpperCase().trim():'';
      const cat=getCol(r,['Category','Type']); if(cat!==undefined) o.category=String(cat).trim();
      const dp=getCol(r,['Department','Dept']); if(dp!==undefined) o.dept=String(dp).trim();
      const nt=getCol(r,['Notes','Note']); if(nt!==undefined) o.notes=String(nt).trim();
      const q=parseInt(getCol(r,['Qty','Quantity'])); if(q>0) o.qty=q;
      const si=parseInt(getCol(r,['Service every (days)','Service Interval','Service every'])); if(si>0) o.serviceInterval=si;
      const ls=parseImportDate(getCol(r,['Last service','Last Serviced','Last service date'])); if(ls!==undefined) o.lastServiceDate=ls;
      const st=getCol(r,['Stored in','Storage','Storage area','Location']); const sid=findStorageId(st); if(sid!==undefined) o.storageId=sid; else if(st!==undefined) o._badStore=String(st);
      return o;
    },
    prepare(list){
      const used=new Set((db.gearItems||[]).map(g=>g.assetId).concat(list.map(x=>x.assetId)).filter(Boolean));
      list.forEach(o=>{
        if(o.assetId) return;
        const pre=((o.category||'GEAR').replace(/[^A-Za-z]/g,'').slice(0,4)||'GEAR').toUpperCase(); let n=1, c;
        do{ c=pre+'-'+String(n++).padStart(3,'0'); }while(used.has(c)); used.add(c); o.assetId=c; o._auto=true;
      });
    },
    findDup(obj){ return obj.assetId?(db.gearItems||[]).find(g=>g.assetId===obj.assetId):null; },
    applyToDb(obj, overwrite){
      if(!db.gearItems) db.gearItems=[];
      const {_auto,_badStore,...clean}=obj;
      const idx=clean.assetId?db.gearItems.findIndex(g=>g.assetId===clean.assetId):-1;
      if(idx>=0){ if(overwrite) db.gearItems[idx]={...db.gearItems[idx],...clean}; }
      else db.gearItems.push({id:'gear_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),category:'Other',dept:'',notes:'',qty:1,serviceInterval:90,lastServiceDate:null,storageId:'',addedAt:Date.now(),...clean});
    }
  },
  inventory: {
    hint: 'Required: <b>Bulb Type, In Stock</b> &nbsp;|&nbsp; Optional: Threshold, Total Received, Total Used, Notes',
    idField: 'bulbType',
    rowToObj(r){
      return {
        bulbType: (getCol(r,['Bulb Type','Bulb'])||'').toString().trim(),
        inStock:  parseInt(getCol(r,['In Stock','Stock','Qty']))||0,
        threshold:parseInt(getCol(r,['Threshold','Minimum','Min']))||5,
        totalReceived:parseInt(getCol(r,['Total Received']))||0,
        totalUsed: parseInt(getCol(r,['Total Used']))||0,
        notes: (getCol(r,['Notes'])||'').toString().trim()
      };
    },
    findDup(obj){ return (db.inventory||[]).find(i=>i.bulbType===obj.bulbType); },
    applyToDb(obj, overwrite){
      const idx=(db.inventory||[]).findIndex(i=>i.bulbType===obj.bulbType);
      if(idx>=0){ if(overwrite) db.inventory[idx]={...db.inventory[idx],...obj}; }
      else { db.inventory.push(obj); }
    }
  }
};

function openImportModal(type){
  _importType = type;
  resetImportModal();
  const titles = { fixtures:'Import Fixtures', inventory:'Import Bulb Inventory', gear:'Import Gear' };
  document.getElementById('importModalTitle').textContent = 'IMPORT — ' + (titles[type]||type).toUpperCase();
  const schema = IMPORT_SCHEMA[type];
  const hint = document.getElementById('importColHint');
  hint.innerHTML = schema.hint;
  hint.style.display = 'block';
  openM('importSheet');
}

function resetImportModal(){
  _importRows=[];_importQueue=[];_importConflictRow=null;
  _importOverwriteAll=false;_importSkipAll=false;
  document.getElementById('importFileInput').value='';
  document.getElementById('importPreviewWrap').style.display='none';
  document.getElementById('importConflictBox').style.display='none';
  document.getElementById('importProgress').style.display='none';
  document.getElementById('importStartBtn').style.display='none';
  document.getElementById('importDropZone').style.display='';
  document.getElementById('importRowCount').textContent='0';
}

function handleImportDrop(e){
  e.preventDefault();
  const dz=document.getElementById('importDropZone');
  dz.style.borderColor='var(--border2)';dz.style.background='var(--s2)';
  const file=e.dataTransfer.files[0];
  if(file) handleImportFile(file);
}

async function handleImportFile(file){
  if(!file) return;
  const name=file.name.toLowerCase();
  let rows=[];
  try {
    if(name.endsWith('.csv')){
      const text=await file.text();
      rows=parseCSVToObjects(text);
    } else if(name.endsWith('.xlsx')){
      rows=await parseXLSXToObjects(file);
    } else {
      toast('Unsupported file. Use .csv or .xlsx','error'); return;
    }
  } catch(err){
    toast('Failed to parse file: '+err.message,'error'); return;
  }
  if(!rows.length){ toast('No data rows found in file','error'); return; }
  _importRows=rows;
  renderImportPreview(rows);
}

function parseCSVToObjects(text){
  text=String(text).replace(/^\ufeff/,'');
  const rows=[]; let row=[], cur='', inQ=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(inQ){
      if(c==='"'){ if(text[i+1]==='"'){ cur+='"'; i++; } else inQ=false; }
      else cur+=c;
    } else if(c==='"') inQ=true;
    else if(c===','){ row.push(cur.trim()); cur=''; }
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(cur.trim()); cur=''; if(row.some(v=>v!=='')) rows.push(row); row=[]; }
    else cur+=c;
  }
  row.push(cur.trim()); if(row.some(v=>v!=='')) rows.push(row);
  if(rows.length<2) return [];
  const headers=rows[0].map(h=>h.trim());
  return rows.slice(1).map(vals=>{ const obj={}; headers.forEach((h,i)=>{ obj[h]=(vals[i]||'').trim(); }); return obj; });
}

async function parseXLSXToObjects(file){
  return new Promise((resolve,reject)=>{
    if(typeof XLSX==='undefined'){ reject(new Error('XLSX library not loaded')); return; }
    const reader=new FileReader();
    reader.onload=e=>{
      try{
        const wb=XLSX.read(e.target.result,{type:'array'});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const data=XLSX.utils.sheet_to_json(ws,{defval:''});
        resolve(data);
      }catch(err){reject(err);}
    };
    reader.onerror=()=>reject(new Error('File read error'));
    reader.readAsArrayBuffer(file);
  });
}

function renderImportPreview(rows){
  if(!rows.length) return;
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const schema=IMPORT_SCHEMA[_importType];
  const headers=Object.keys(rows[0]);
  let nNew=0,nUpd=0,nBad=0,badStore=0;
  const res=rows.map(r=>{
    const o=schema.rowToObj(r);
    if(!o[schema.idField]){ nBad++; return ['Skipped: missing '+(schema.idField==='name'?'name':schema.idField),'var(--red)']; }
    if(o._badStore) badStore++;
    const dup=schema.findDup(o); if(dup){ nUpd++; return ['Update','var(--amber,#e0a800)']; } nNew++; return ['New','var(--green,#2DD4A0)'];
  });
  document.getElementById('importPreviewHead').innerHTML='<tr><th>Result</th>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr>';
  document.getElementById('importPreviewBody').innerHTML=rows.slice(0,20).map((r,i)=>
    '<tr><td style="font-size:11px;font-weight:700;color:'+res[i][1]+'">'+esc(res[i][0])+'</td>'+headers.map(h=>'<td style="font-family:var(--mono);font-size:11px">'+esc(r[h])+'</td>').join('')+'</tr>'
  ).join('');
  document.getElementById('importRowCount').textContent=rows.length+(rows.length>20?' (showing first 20)':'')+' · '+nNew+' new, '+nUpd+' to update, '+nBad+' skipped'+(badStore?' · '+badStore+' with a storage area that does not exist (ignored)':'');
  document.getElementById('importPreviewWrap').style.display='';
  document.getElementById('importStartBtn').style.display='';
  document.getElementById('importDropZone').style.display='none';
}

async function startImport(){
  const schema=IMPORT_SCHEMA[_importType];
  if(!schema||!_importRows.length){ toast('No data to import','error'); return; }
  _importQueue=_importRows.map(r=>schema.rowToObj(r)).filter(o=>o[schema.idField]);
  if(schema.prepare) schema.prepare(_importQueue);
  if(!_importQueue.length){ toast('No valid rows found (check required columns)','error'); return; }
  document.getElementById('importStartBtn').style.display='none';
  document.getElementById('importPreviewWrap').style.display='none';
  document.getElementById('importColHint').style.display='none';
  document.getElementById('importProgress').style.display='';
  _importOverwriteAll=false; _importSkipAll=false;
  await processImportQueue();
}

async function processImportQueue(){
  const schema=IMPORT_SCHEMA[_importType];
  const total=_importQueue.length;
  let done=0, imported=0, skipped=0;
  while(_importQueue.length>0){
    const row=_importQueue[0];
    const dup=schema.findDup(row);
    if(dup && !_importOverwriteAll && !_importSkipAll){
      _importConflictRow=row;
      showConflict(row, schema);
      return;
    }
    const skip = _importSkipAll && !!dup;
    if(!skip){ schema.applyToDb(row, true); imported++; }
    else { skipped++; }
    _importQueue.shift();
    done++;
    const pct=Math.round((done/total)*100);
    document.getElementById('importProgressBar').style.width=pct+'%';
    document.getElementById('importProgressTxt').textContent=done+' / '+total;
    await new Promise(r=>setTimeout(r,20));
  }
  save(); refreshPage();
  closeM('importSheet');
  toast('Import complete — '+imported+' added/updated, '+skipped+' skipped','success');
}

function showConflict(row, schema){
  const idVal=row[schema.idField]||'?';
  document.getElementById('importConflictMsg').textContent='"'+idVal+'" already exists in your data. What would you like to do?';
  document.getElementById('importConflictBox').style.display='';
}

async function resolveConflict(action){
  document.getElementById('importConflictBox').style.display='none';
  const schema=IMPORT_SCHEMA[_importType];
  const row=_importQueue[0];
  if(action==='overwrite'){
    schema.applyToDb(row,true); _importQueue.shift();
  } else if(action==='skip'){
    _importQueue.shift();
  } else if(action==='overwrite-all'){
    _importOverwriteAll=true; _importSkipAll=false;
  } else if(action==='skip-all'){
    _importSkipAll=true; _importOverwriteAll=false;
  }
  await processImportQueue();
}

function downloadImportTemplate(type){
  const templates={
    fixtures:'Fixture ID,Name,Bulb Type,Location,Status,Department,Notes\nFX-001,Front Wash Left,PAR64 1000W,Stage Left,ok,Lighting,\nFX-002,Front Wash Right,PAR64 1000W,Stage Right,ok,Lighting,',
    inventory:'Bulb Type,In Stock,Threshold,Total Received,Total Used,Notes\nPAR64 1000W,10,5,20,10,\nLED PAR,6,3,8,2,',
    gear:'Asset ID,Name,Category,Department,Qty,Stored in,Service every (days),Last service,Notes\nCAM-001,Canon XA55 Camera,Cameras,Cameras,1,File cabinet 1,90,2026-01-15,Main broadcast cam\nMIC-001,Shure SM58,Audio,Audio,2,File cabinet 2,180,2026-03-01,Lead vocal mic',
  };
  const csv=templates[type]||'';
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='kcc-'+type+'-template.csv';
  a.click();
  toast('Template downloaded','success');
}

// ── Reset ──
function resetAllData(){
  if(!isMaster()){toast('Master admin only','error');return;}
  if(!confirm('RESET EVERYTHING?\n\nWipes all data from ALL devices.'))return;
  if(prompt('Type RESET to confirm:')!=='RESET'){toast('Reset cancelled','info');return;}
  db={fixtures:[],outages:[],inventory:[],orders:[],usageLog:[],technicians:[],settings:{}};
  try{localStorage.removeItem(LS_KEY);}catch(e){}
  save();toast('All data wiped','info');refreshPage();
}

// ── Camera ──
let _gsScanner=null, _gsRunning=false, _gsFieldTarget=null;

function toggleCamera(){_camRunning?stopCamera():startCamera();}

function openGlobalScanner(fieldTarget){
  _gsFieldTarget=fieldTarget||null;
  document.getElementById('gsManual').value='';
  document.getElementById('gs-result').style.display='none';
  // Set action buttons based on context
  const acts=document.getElementById('gsActions');
  if(fieldTarget){
    acts.innerHTML=`<button class="btn ba" style="grid-column:1/-1;justify-content:center" onclick="gsSubmitToField()">✅ Use This Code</button>`;
  } else {
    acts.innerHTML=`
      <button class="btn br" onclick="gsAction('outage')">🔴 Report Outage</button>
      <button class="btn bg" onclick="gsAction('replace')">✅ Mark Replaced</button>
      <button class="btn bgh" onclick="gsAction('scanIn')">📥 Bulb Scan IN</button>
      <button class="btn ba" onclick="gsSubmit()" style="grid-column:2">🔍 Auto-Detect</button>`;
  }
  document.getElementById('m-globalScan').style.display='flex';
  // Start scanner
  setTimeout(()=>{
    const el=document.getElementById('gs-reader');
    if(!el)return;
    _gsScanner=new Html5Qrcode('gs-reader');_gsRunning=true;
    _gsScanner.start({facingMode:'environment'},{fps:10,qrbox:{width:240,height:240}},
      code=>{
        const upper=code.toUpperCase();
        document.getElementById('gsManual').value=upper;
        document.getElementById('gs-result').style.display='';
        document.getElementById('gs-result').textContent='✅ Scanned: '+upper+' — choose an action below';
        stopGsScanner();
        if(_gsFieldTarget) gsSubmitToField();
        else if(ssFind(upper)){ closeGlobalScanner(); openScanSheet(upper); }
        // otherwise leave the modal open so the tech picks Report Outage /
        // Mark Replaced / Bulb Scan IN — auto-closing here was skipping
        // straight to Auto-Detect and never actually registering bulbs.
      },()=>{}
    ).catch(err=>{toast('Camera error: '+err,'error');stopGsScanner();});
  },200);
}

function stopGsScanner(){
  if(_gsScanner&&_gsRunning){_gsScanner.stop().catch(()=>{});_gsRunning=false;_gsScanner=null;}
}
function closeGlobalScanner(){
  stopGsScanner();
  document.getElementById('m-globalScan').style.display='none';
  document.getElementById('gs-reader').innerHTML='';
}
function gsSubmit(){
  const code=document.getElementById('gsManual').value.trim().toUpperCase();
  if(!code){toast('Scan or enter a code first','error');return;}
  closeGlobalScanner();
  smartHandleCode(code);
}
function gsAction(action){
  const code=document.getElementById('gsManual').value.trim().toUpperCase();
  if(!code){toast('Scan or enter a code first','error');return;}
  if(action==='outage'||action==='replace'){
    const f=db.fixtures.find(x=>x.id===code);
    if(!f){toast('Fixture "'+code+'" not found','error');return;}
    closeGlobalScanner();
    if(action==='outage')openOutModal(f.id);else openRepModal(f.id);
  } else if(action==='scanIn'){
    closeGlobalScanner();
    scanBulbIn(code);
  }
}
function gsSubmitToField(){
  const code=document.getElementById('gsManual').value.trim().toUpperCase();
  if(!code){toast('Scan or enter a code first','error');return;}
  const el=document.getElementById(_gsFieldTarget);
  if(el) el.value=code;
  closeGlobalScanner();
  toast('✅ Code entered: '+code,'success');
}
// Scan directly into a specific input field (e.g. bulb ID field in replace modal)
function scanIntoField(fieldId){
  openGlobalScanner(fieldId);
}
function startCamera(){
  stopRepCamera&&stopRepCamera();
  document.getElementById('qr-reader').style.display='';
  document.getElementById('camBtn').textContent='⏹ Stop Camera';
  _camScanner=new Html5Qrcode('qr-reader');_camRunning=true;
  _camScanner.start({facingMode:'environment'},{fps:10,qrbox:{width:240,height:240}},
    code=>handleScannedCode(code),()=>{}
  ).catch(err=>{toast('Camera error: '+err,'error');stopCamera();});
}
function stopCamera(){
  if(_camScanner&&_camRunning){_camScanner.stop().catch(()=>{});_camRunning=false;_camScanner=null;}
  const el=document.getElementById('qr-reader');if(el){el.style.display='none';el.innerHTML='';}
  const btn=document.getElementById('camBtn');if(btn)btn.textContent='📷 Start Camera Scanner';
}
function handleScannedCode(code){
  document.getElementById('manualId').value=code.toUpperCase();
  const res=document.getElementById('scanResult');res.style.display='';res.textContent='✅ Scanned: '+code;
  stopCamera();
  smartHandleCode(code.toUpperCase());
}

// ══ Scan-first result sheet ══
let _ssCode=null;
function ssEsc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function ssFind(code){
  const c=String(code||'').trim().toUpperCase();
  const f=db.fixtures.find(x=>String(x.id).toUpperCase()===c);
  if(f) return {type:'fixture',obj:f};
  const g=(db.gearItems||[]).find(x=>String(x.assetId||'').toUpperCase()===c||String(x.id).toUpperCase()===c);
  if(g) return {type:'gear',obj:g};
  return null;
}
function closeScanSheet(){
  const w=document.getElementById('scanSheetWrap'); if(w){w.classList.remove('open');w.setAttribute('aria-hidden','true');}
}
function openScanSheet(code){
  const hit=ssFind(code); if(!hit) return false;
  _ssCode=String(code).toUpperCase();
  const w=document.getElementById('scanSheetWrap'), el=document.getElementById('scanSheet'); if(!w||!el) return false;
  if(hit.type==='fixture'){
    const f=hit.obj, out=f.status==='out';
    el.innerHTML=`<div class="grab"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div><div class="ss-id">${ssEsc(f.id)}</div><div class="ss-name">${ssEsc(f.name)}</div><div class="ss-sub">${ssEsc([f.category,f.location,f.bulbType].filter(Boolean).join(' · '))}</div></div>
        <span class="ss-pill" style="background:${out?'#FBE3DF':'#E7F4EE'};color:${out?'#8A241A':'#0B5A46'}">${out?'Out':'Working'}</span>
      </div>
      <div class="ss-stats"><div><span>Last maintenance</span><b>${f.lastMaint?ago(f.lastMaint):'Never'}</b></div><div><span>Outages</span><b>${f.outageCount||0}</b></div></div>
      <div class="ss-acts">
        ${out?`<button class="ss-btn grn" onclick="closeScanSheet();openRepModal('${ssEsc(f.id)}')">Mark replaced</button>`
              :`<button class="ss-btn red" onclick="closeScanSheet();openOutModal('${ssEsc(f.id)}')">Report outage</button>`}
        <div class="ss-row">
          <button class="ss-btn" onclick="ssMaintFixture('${ssEsc(f.id)}')">Log maintenance</button>
          <button class="ss-btn" onclick="closeScanSheet();go('fixtures');viewFixture('${ssEsc(f.id)}')">Open details</button>
        </div>
        <button class="ss-btn" style="border-color:transparent;color:var(--dim)" onclick="closeScanSheet();openGlobalScanner()">Scan another</button>
      </div>`;
  } else {
    const g=hit.obj, co=activeCheckout(g.id), me=getCurTech();
    const who=co?(db.technicians.find(x=>x.id===co.personId)||{}).name:null;
    const due=g.serviceInterval&&g.lastServiceDate?g.lastServiceDate+g.serviceInterval*864e5:null;
    const dueNow=due&&due<Date.now();
    el.innerHTML=`<div class="grab"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div><div class="ss-id">${ssEsc(g.assetId||g.id)}</div><div class="ss-name">${ssEsc(g.name)}</div><div class="ss-sub">${ssEsc([g.category,g.dept].filter(Boolean).join(' · '))}</div></div>
        <span class="ss-pill" style="background:${co?'#FAEEDA':'#E7F4EE'};color:${co?'#7A4A06':'#0B5A46'}">${co?'Checked out':'Available'}</span>
      </div>
      <div class="ss-stats"><div><span>${co?'Out with':'Last service'}</span><b>${co?ssEsc(who||'Unknown'):(g.lastServiceDate?fmtDate(g.lastServiceDate):'Never')}</b></div><div><span>${co&&co.dueDate?'Due back':'Service due'}</span><b style="${dueNow&&!co?'color:#FF6B5E':''}">${co&&co.dueDate?fmtDate(co.dueDate):(due?fmtDate(due):'Not set')}</b></div></div>
      <div class="ss-acts">
        ${co?`<button class="ss-btn grn" onclick="closeScanSheet();openReturnModal('${ssEsc(co.id)}')">Return it</button>`
            :`<button class="ss-btn grn" onclick="ssCheckoutToMe('${ssEsc(g.id)}')">Check out to me${me?' ('+ssEsc(me.name)+')':''}</button>`}
        <div class="ss-row">
          <button class="ss-btn" onclick="ssMaintGear('${ssEsc(g.id)}')">Log maintenance</button>
          <button class="ss-btn" onclick="closeScanSheet();go('checkout')">Open gear</button>
        </div>
        <button class="ss-btn" style="border-color:transparent;color:var(--dim)" onclick="closeScanSheet();openGlobalScanner()">Scan another</button>
      </div>`;
  }
  w.classList.add('open'); w.setAttribute('aria-hidden','false');
  return true;
}
function ssMaintFixture(id){ markMaintDone(id); if(_ssCode) openScanSheet(_ssCode); }
function ssMaintGear(id){
  const g=(db.gearItems||[]).find(x=>x.id===id); if(!g) return;
  const t=getCurTech();
  const notes=prompt('Maintenance notes (optional):','');
  if(notes===null) return;
  const entry={id:'ml_'+Date.now(),gearId:id,date:Date.now(),by:t?t.name:'',type:'Routine check',notes:(notes||'').trim(),cost:0,nextDue:null,photo:null};
  if(!db.maintLogs) db.maintLogs=[];
  db.maintLogs.unshift(entry); g.lastServiceDate=entry.date;
  save(); toast('Maintenance logged for '+g.name,'success'); openScanSheet(_ssCode);
}
function ssCheckoutToMe(id){
  const me=getCurTech(); const g=(db.gearItems||[]).find(x=>x.id===id);
  if(!me||!g){toast('Select a technician first','error');return;}
  if(activeCheckout(id)){toast('Already checked out','error');return;}
  const due=new Date(); due.setDate(due.getDate()+7); due.setHours(23,59,0,0);
  if(!db.checkouts) db.checkouts=[];
  db.checkouts.unshift({id:'co_'+Date.now(),gearId:id,personId:me.id,checkedOutAt:Date.now(),dueDate:due.getTime(),purpose:'',notes:'Scan checkout',returnedAt:null,returnCondition:null,returnNotes:null});
  save(); toast(g.name+' checked out to '+me.name+' (due in 7 days)','success'); openScanSheet(_ssCode);
}
function smartHandleCode(code){
  if(openScanSheet(code)) return;
  // Check if it's a known fixture
  const fixture=db.fixtures.find(x=>x.id===code);
  if(fixture){
    toast('💡 Fixture: '+fixture.name,'info');
    if(fixture.status==='out') openRepModal(fixture.id);
    else openOutModal(fixture.id);
    return;
  }
  // Check if it's a known bulb label in the registry
  const regMatch=db.bulbRegistry.find(b=>b.bulbId===code);
  if(regMatch){
    const statusLabel={unassigned:'🏷️ Printed — not scanned in yet',in_stock:'📦 In Stock',installed:'💡 Installed in '+regMatch.installedIn,pulled:'♻️ Available',disposed:'💀 Blown / Disposed'}[regMatch.status]||regMatch.status;
    toast('🏷️ Bulb '+code+' — '+regMatch.bulbType+' · '+statusLabel+(regMatch.status==='unassigned'?' — tap "Bulb Scan IN" to add to stock':''),'info');
    document.getElementById('manualId').value=code;
    return;
  }
  // Unknown code — just show it in the manual field, let the tech decide what to do
  document.getElementById('manualId').value=code;
  toast('❓ Unknown code "'+code+'" — use buttons below to act on it','info');
}
function scanAction(action){
  const id=document.getElementById('manualId').value.trim().toUpperCase();
  if(!id){toast('Enter or scan a Fixture ID first','error');return;}
  if(action==='outage'||action==='replace'){
    const f=db.fixtures.find(x=>x.id===id);
    if(!f){toast('Fixture "'+id+'" not found','error');return;}
    if(action==='outage')openOutModal(f.id);else openRepModal(f.id);
  } else if(action==='scanIn'){scanBulbIn(id);}
}

// Scan a physical bulb sticker onto the shelf — this is what actually
// increments stock, so "in stock" always matches bulbs that were really scanned.
function scanBulbIn(code){
  const t=getTech('recv');
  let reg=db.bulbRegistry.find(b=>b.bulbId===code);

  if(!reg){
    // Code isn't a printed label we know about — offer to register it fresh.
    const bulbType=prompt('Unknown label "'+code+'". What bulb type is this? (leave blank to cancel)','')?.trim();
    if(!bulbType){toast('Scan cancelled — bulb type required','error');return;}
    reg={bulbId:code,bulbType,status:'unassigned',createdAt:Date.now(),installedIn:null,installedAt:null,installedBy:null,history:[]};
    db.bulbRegistry.push(reg);
  }

  if(reg.status==='in_stock'){
    toast('⚠️ '+code+' is already marked in stock — skipping to avoid double count','info');
    return;
  }
  if(reg.status==='installed'){
    toast('💡 '+code+' is currently installed in '+(reg.installedIn||'a fixture')+' — not added to stock','info');
    return;
  }
  if(reg.status==='disposed'){
    toast('💀 '+code+' was marked blown/disposed — not added to stock','info');
    return;
  }

  // unassigned or pulled → bring it onto the shelf
  reg.status='in_stock';
  reg.installedIn=null;
  reg.history.push({event:'received',tech:t?t.name:'Unknown',timestamp:Date.now()});

  let inv=db.inventory.find(i=>i.bulbType===reg.bulbType);
  if(inv){inv.inStock++;inv.totalReceived++;}
  else db.inventory.push({bulbType:reg.bulbType,inStock:1,threshold:3,totalReceived:1,totalUsed:0});

  save();renderInv&&renderInv();renderBulbRegistry&&renderBulbRegistry();
  toast('📥 '+code+' ('+reg.bulbType+') scanned into stock','success');
  document.getElementById('manualId').value='';
  const res=document.getElementById('scanResult');if(res){res.style.display='';res.textContent='✅ '+code+' added to stock';}
}

// Recompute each bulb type's stock count from the registry's actual in_stock
// scans — fixes drift between the manual "Receive Batch" number and reality.
function recalcStockFromRegistry(){
  if(!isAdmin()){toast('Admin permission required','error');return;}
  if(!confirm('Recalculate stock counts from the Bulb Registry?\n\nEach bulb type\'s "In Stock" number will be set to match the number of individually scanned-in labels for that type. Types with no registered labels are left untouched.'))return;
  const counts={};
  db.bulbRegistry.forEach(b=>{if(b.status==='in_stock')counts[b.bulbType]=(counts[b.bulbType]||0)+1;});
  let changed=0;
  Object.keys(counts).forEach(type=>{
    let inv=db.inventory.find(i=>i.bulbType===type);
    if(!inv){inv={bulbType:type,inStock:0,threshold:3,totalReceived:0,totalUsed:0};db.inventory.push(inv);}
    if(inv.inStock!==counts[type]){inv.inStock=counts[type];changed++;}
  });
  save();renderInv&&renderInv();
  toast(changed?changed+' bulb type(s) corrected from registry':'Stock already matched the registry','success');
}

// ── Print ──
function printLabels(){
  const type=prompt('Label type:\n1 = Fixture Labels\n2 = Bulb Labels','1');if(!type)return;
  const prefix=(prompt('Prefix (e.g. FX or BLB-A):',type==='1'?'FX':'BLB-A')||'LBL').toUpperCase();
  const qty=Math.min(parseInt(prompt('How many labels?','6')||'6'),100);

  // For bulb labels — ask bulb type so we can register them
  let bulbType='';
  if(type==='2'){
    bulbType=prompt('Bulb type for these labels? (e.g. PAR64 1000W)','')?.trim();
    if(!bulbType){toast('Bulb type required to register labels','error');return;}
  }

  const newLabels=[], list=[];
  for(let i=1;i<=qty;i++){
    const code=prefix+'-'+String(i).padStart(3,'0');
    // Register bulb labels in the registry as UNASSIGNED. They don't count as
    // stock until someone sticks the label on a bulb and scans it in.
    if(type==='2'){
      const exists=db.bulbRegistry.find(b=>b.bulbId===code);
      if(!exists){
        db.bulbRegistry.push({bulbId:code,bulbType,status:'unassigned',createdAt:Date.now(),installedIn:null,installedAt:null,installedBy:null,history:[]});
        newLabels.push(code);
      }
    }
    list.push({code,sub:type==='1'?'FIXTURE':bulbType||'BULB'});
  }

  if(newLabels.length>0){
    save();
    toast(newLabels.length+' bulb stickers printed — scan each one in (Scan → Bulb Scan IN) once it\'s on a bulb','success');
  }
  if(typeof qrLabelSheet==='function') qrLabelSheet('KCC Technical labels',list,4,90,x=>x.code,x=>x.code,x=>x.sub);
}

// ── Inv tabs ──
function invTab(tab,btn){
  ['stock','orders','usage','used','registry'].forEach(t=>document.getElementById('it-'+t).style.display=t===tab?'':'none');
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  else {const idx=['stock','orders','usage','used','registry'].indexOf(tab);const tb=document.querySelectorAll('#pg-inventory .tab')[idx];if(tb)tb.classList.add('active');}
  if(tab==='used')renderUsedBulbs();
  if(tab==='registry')renderBulbRegistry();
}

function clearBulbRegistry(){
  if(!confirm('Clear the entire Bulb Registry?\n\nThis removes all bulb label history. Fixtures will lose their current bulb records. This cannot be undone.')) return;
  db.bulbRegistry=[];
  // Also clear currentBulbId from all fixtures
  db.fixtures.forEach(f=>{f.currentBulbId=null;f.currentBulbType=null;});
  save();renderBulbRegistry();renderFix();
  toast('Bulb Registry cleared','info');
}

function bulbLifeStatus(b){
  const inv=db.inventory.find(i=>i.bulbType===b.bulbType);
  const lifeHours=inv?inv.expectedLifeHours||0:0;
  const used=b.hoursUsed||0;
  if(!lifeHours)return{status:'untracked',label:'Not tracked',color:'#888780',pct:0};
  const pct=Math.min(100,Math.round((used/lifeHours)*100));
  if(pct>=100)return{status:'overdue',label:'Past expected life ('+used+'h / '+lifeHours+'h)',color:'#E24B4A',pct};
  if(pct>=80)return{status:'due-soon',label:pct+'% of life used ('+used+'h / '+lifeHours+'h)',color:'#BA7517',pct};
  return{status:'ok',label:pct+'% of life used',color:'#639922',pct};
}
function logBulbHours(bulbId){
  const b=db.bulbRegistry.find(x=>x.bulbId===bulbId);if(!b)return;
  const val=prompt('Hours to add for '+bulbId+' ('+b.bulbType+'):','');
  if(val===null)return;
  const hrs=parseFloat(val);
  if(isNaN(hrs)||hrs<=0){toast('Enter a positive number','error');return;}
  b.hoursUsed=(b.hoursUsed||0)+hrs;
  save();renderBulbRegistry();refreshPage();
  toast('Logged '+hrs+'h for '+bulbId,'success');
}
function renderBulbRegistry(){
  const tbody=document.getElementById('regTbl');if(!tbody)return;
  const filter=document.getElementById('regFilter')?.value||'all';
  let list=[...db.bulbRegistry].sort((a,b)=>b.createdAt-a.createdAt);
  if(filter!=='all')list=list.filter(b=>b.status===filter);
  if(!list.length){tbody.innerHTML='<tr><td colspan="9" style="text-align:center;color:var(--dim);padding:28px">No bulbs registered yet — generate labels to register them</td></tr>';return;}
  const statusStyle={
    unassigned:{icon:'🏷️',color:'var(--dim)',label:'Printed — not scanned in'},
    in_stock:{icon:'📦',color:'var(--blue)',label:'In Stock'},
    installed:{icon:'💡',color:'var(--green)',label:'Installed'},
    pulled:{icon:'♻️',color:'var(--amber)',label:'Available (Pulled)'},
    disposed:{icon:'💀',color:'var(--red)',label:'Blown / Disposed'}
  };
  tbody.innerHTML=list.map(b=>{
    const ss=statusStyle[b.status]||{icon:'❓',color:'var(--dim)',label:b.status};
    const curFix=b.installedIn?db.fixtures.find(f=>f.id===b.installedIn):null;
    const lastEvent=b.history.length?b.history[b.history.length-1]:null;
    const ls=bulbLifeStatus(b);
    return`<tr>
      <td><span class="mono ca" style="font-size:12px">${esc(b.bulbId)}</span></td>
      <td style="font-size:12px">${esc(b.bulbType)}</td>
      <td><span style="color:${ss.color};font-weight:700;font-size:12px">${ss.icon} ${esc(ss.label)}</span></td>
      <td style="font-size:12px">${curFix?curFix.name+' ('+esc(b.installedIn)+')':b.status==='installed'?b.installedIn||'—':'—'}</td>
      <td style="text-align:center"><strong>${b.history.filter(h=>h.event==='installed').length}</strong></td>
      <td class="dim">${fmtD(b.createdAt)}</td>
      <td class="dim">${lastEvent?lastEvent.event+' · '+ago(lastEvent.timestamp):'—'}</td>
      <td style="font-size:11px">${ls.status==='untracked'?'<span class="dim">—</span>':`<span style="color:${ls.color};font-weight:700">${esc(ls.label)}</span>`}${b.status==='installed'?` <button class="btn bgh bsm" style="padding:2px 6px;font-size:10px" onclick="logBulbHours('${esc(b.bulbId)}')">⏱ Log</button>`:''}</td>
      <td><button class="btn bgh bsm" data-perm="admin" style="border-color:var(--red);color:var(--red)" onclick="deleteBulbRegistryEntry('${esc(b.bulbId)}')">🗑️</button></td>
    </tr>`;
  }).join('');
}

function deleteBulbRegistryEntry(bulbId){
  if(!isAdmin()){toast('Admin permission required','error');return;}
  const b=db.bulbRegistry.find(x=>x.bulbId===bulbId);if(!b)return;
  if(!confirm('Remove bulb label "'+bulbId+'" ('+b.bulbType+') from the registry?\n\nThis only removes the label record — it does NOT change stock counts. If it was counted as In Stock, run "Recalc from Registry" afterward to correct the total.'))return;
  db.bulbRegistry=db.bulbRegistry.filter(x=>x.bulbId!==bulbId);
  // If it was installed in a fixture, clear that fixture's current-bulb pointer
  if(b.installedIn){
    const f=db.fixtures.find(x=>x.id===b.installedIn);
    if(f&&f.currentBulbId===bulbId){f.currentBulbId=null;f.currentBulbType=null;}
  }
  save();renderBulbRegistry();renderFix&&renderFix();
  toast('Bulb label '+bulbId+' removed from registry','info');
}

// ── Helpers ──
function fmtD(ts){return new Date(ts).toLocaleString('en-CA',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}
function ago(ts){const s=Math.floor((Date.now()-ts)/1000);if(s<60)return'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';}
function fmtDur(ms){const m=Math.round(ms/60000);if(m<60)return m+' min';return Math.floor(m/60)+'h '+m%60+'m';}
function toast(msg,type='info'){const c=document.getElementById('toasts');const el=document.createElement('div');el.className='toast '+type;el.innerHTML=(type==='success'?'✅':type==='error'?'🔴':'💡')+' '+esc(msg);c.appendChild(el);setTimeout(()=>el.remove(),3000);}
