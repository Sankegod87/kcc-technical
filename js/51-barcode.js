// Code 128 barcodes (set B) as SVG, so labels can be read by a handheld barcode scanner as well as by a phone camera.
(function(){
  const P='212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112'.split(' ');
  window.kccBarcodeModules=function(text){
    const t=String(text==null?'':text); const v=[104]; let sum=104;
    for(let i=0;i<t.length;i++){ let c=t.charCodeAt(i)-32; if(c<0||c>94) c=0; v.push(c); sum+=c*(i+1); }
    v.push(sum%103); v.push(106);
    let bits=''; v.forEach(x=>{ const p=P[x]; for(let i=0;i<p.length;i++) bits+=(i%2===0?'1':'0').repeat(+p[i]); });
    return bits;
  };
  window.kccBarcode=function(text,o){
    o=o||{}; const m=o.module||2, h=o.height||44, q=10; const bits=kccBarcodeModules(text);
    let x=q, r=''; for(let i=0;i<bits.length;){ let j=i; while(j<bits.length&&bits[j]===bits[i]) j++; if(bits[i]==='1') r+='<rect x="'+(x)+'" y="0" width="'+(j-i)+'" height="'+h+'"/>'; x+=j-i; i=j; }
    const W=bits.length+q*2;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="'+(W*m)+'" height="'+h+'" viewBox="0 0 '+W+' '+h+'" preserveAspectRatio="none" shape-rendering="crispEdges"><rect width="'+W+'" height="'+h+'" fill="#fff"/><g fill="#000">'+r+'</g></svg>';
  };
})();
