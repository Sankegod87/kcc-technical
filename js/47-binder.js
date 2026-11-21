// Binder: prints the live fixture list, bulb stock and gear list as clean pages for the printed binder.
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const th=a=>'<tr>'+a.map(x=>'<th>'+x+'</th>').join('')+'</tr>';
  const td=a=>'<tr>'+a.map(x=>'<td>'+E(x)+'</td>').join('')+'</tr>';
  const date=t=>t?new Date(t).toLocaleDateString('en-CA'):'';
  window.binderPrint=function(){
    const w=window.open('','_blank'); if(!w){ toast('Allow pop-ups to print','error'); return; }
    const fx=[...(db.fixtures||[])].sort((a,b)=>String(a.location||'').localeCompare(String(b.location||''))||String(a.name||'').localeCompare(String(b.name||'')));
    const inv=[...(db.inventory||[])].sort((a,b)=>String(a.bulbType).localeCompare(String(b.bulbType)));
    const gear=[...(db.gearItems||[])].sort((a,b)=>String(a.category||'').localeCompare(String(b.category||''))||String(a.name||'').localeCompare(String(b.name||'')));
    const today=new Date().toLocaleDateString('en-CA');
    const css='body{font-family:Arial,sans-serif;font-size:12px;margin:0;color:#000}.pg{page-break-after:always;padding:24px}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:0 0 4px}p.s{color:#555;margin:0 0 12px}table{width:100%;border-collapse:collapse}th{background:#eee;text-align:left}th,td{border:1px solid #999;padding:4px 6px;vertical-align:top}.low{font-weight:bold}.cover{text-align:center;padding-top:200px}@page{margin:12mm}';
    const fxRows=fx.map(f=>td([f.id,f.name,f.location,f.category,f.bulbType,f.status==='out'?'OUT':'OK',f.maintInterval?f.maintInterval+' d':'',f.notes])).join('');
    const invRows=inv.map(i=>'<tr'+(i.inStock<=i.threshold?' class="low"':'')+'>'+[i.bulbType,i.inStock,i.threshold,i.totalUsed||0,i.inStock<=i.threshold?'LOW':''].map(x=>'<td>'+E(x)+'</td>').join('')+'<td style="width:60px"></td></tr>').join('');
    const gearRows=gear.map(g=>td([g.name,g.assetId,g.category,g.dept,g.qty||1,g.notes])).join('');
    w.document.write('<!doctype html><title>KCC Technical binder</title><style>'+css+'</style><body>'+
      '<div class="pg cover"><h1>KCC Technical</h1><h2>Equipment binder</h2><p class="s">Printed '+today+'</p></div>'+
      '<div class="pg"><h2>Fixtures ('+fx.length+')</h2><p class="s">Lights and fixtures, sorted by location. Printed '+today+'.</p><table>'+th(['ID','Name','Location','Type','Bulb','Status','Service every','Notes'])+fxRows+'</table></div>'+
      '<div class="pg"><h2>Bulb stock ('+inv.length+' types)</h2><p class="s">Count on '+today+'. Write the new count in the last column.</p><table>'+th(['Bulb type','In stock','Minimum','Total used','Flag','Counted'])+invRows+'</table></div>'+
      '<div class="pg"><h2>Gear and items ('+gear.length+')</h2><p class="s">Printed '+today+'.</p><table>'+th(['Item','Asset ID','Category','Dept','Qty','Notes'])+gearRows+'</table></div>'+
      '<script>setTimeout(function(){print()},400)<\/script></body>');
    w.document.close();
  };
})();
