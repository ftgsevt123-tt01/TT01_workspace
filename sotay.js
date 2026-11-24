"use strict";
/* ===== Sổ tay cư dân =====
   Ba mục: Tài liệu tham khảo (admin đăng, đính kèm PDF), Mẹo vặt, Hỏi đáp.
   Cần chạy tt01_patch10_handbook.sql. Dùng chung các hàm của index.html (sb, q, act, esc, can, U...). */
var HBK=[["doc","Tài liệu tham khảo","📄"],["tip","Mẹo vặt","💡"],["question","Hỏi đáp","❓"]];
var HBI={doc:"Văn bản luật, nội quy và hướng dẫn để tham khảo. Chỉ admin đăng, cư dân bình luận, thả tim và chia sẻ link.",
  tip:"Kinh nghiệm sửa chữa điện nước, chăm sóc nhà cửa, dịch vụ quanh tòa.",
  question:"Hỏi để hiểu thêm và cùng thảo luận."};
var hbk="doc",hbt="all",hbTopics=null,hbFiles=[],hbDrop=[],hbCov=null,hbCovDel=false,hbKind="question";

function hbMod(){return(U.mods||[]).filter(function(m){return m.key==="handbook"||/^s[ổo] tay/i.test(m.label||"")})[0]}
function hbVisible(){var m=hbMod();return!!m&&(m.state==="on"||m.state==="admin")}
function hbAdm(){return can("post_handbook")}
function hbMember(){return hbAdm()||U.units.some(function(u){return u.status==="verified"||u.status==="pending"})}
function hbKL(k){return HBK.filter(function(x){return x[0]===k})[0]||HBK[0]}
function hbAu(it){return it.author_label||(it.profiles&&it.profiles.name)||"Cư dân"}
function hbTopicL(k){var t=(hbTopics||[]).filter(function(x){return x.key===k})[0];return t?t.label:"Khác"}
function hbLinks(s){return esc(s).replace(/https?:\/\/[^\s<]+/g,function(u){var t=u.replace(/[.,;:)]+$/,""),r=u.slice(t.length);return '<a href="'+t+'" target="_blank" rel="noopener">'+t+'</a>'+r})}
function hbSize(n){if(!n)return"";return n>=1048576?(n/1048576).toFixed(1).replace(".",",")+" MB":Math.max(1,Math.round(n/1024))+" KB"}
function hbExt(f){var m=/\.([a-z0-9]{2,5})$/i.exec(f.name||f.path||"");return m?m[1].toUpperCase():"FILE"}
function hbSafe(n){var b=String(n||"file").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").replace(/[^A-Za-z0-9._-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");return(b||"file").slice(-80)}
function hbNoDb(e){console.error(e);return bar("Sổ tay cư dân")+'<div class="card"><b>Chưa cài đặt cơ sở dữ liệu cho Sổ tay</b><p class="mute">Hãy chạy file <code>tt01_patch10_handbook.sql</code> trong Supabase → SQL Editor, rồi tải lại trang.</p></div>'}
async function hbLoadTopics(force){if(hbTopics&&!force)return hbTopics;hbTopics=await q(sb.from("hb_topics").select("*").order("sort").order("label"));return hbTopics}
/* Mẹo vặt mặc định mở cho cư dân; super admin tắt trong Cài đặt */
async function hbTipOpen(){try{var r=await sb.from("settings").select("value").eq("key","hb_tip_open").maybeSingle();return!(r.data&&(r.data.value===false||r.data.value==="false"))}catch(e){return true}}
function hbCanAdd(kind,tipOpen){var a=hbAdm();return kind==="doc"?a:kind==="tip"?(a||(tipOpen&&hbMember())):(a||hbMember())}

/* ----- Thả tim, đếm bình luận ----- */
async function hbEngage(ids){var o={r:{},c:{}};if(!ids.length)return o;var me=U.s.user.id,x=await Promise.all([sb.from("hb_reactions").select("item_id,user_id").in("item_id",ids),sb.from("hb_comments").select("item_id,hidden").in("item_id",ids)]);if(x[0].error)throw x[0].error;if(x[1].error)throw x[1].error;ids.forEach(function(i){o.r[i]={n:0,my:false};o.c[i]=0});x[0].data.forEach(function(r){var e=o.r[r.item_id];if(!e)return;e.n++;if(r.user_id===me)e.my=true});x[1].data.forEach(function(c){if(!c.hidden&&o.c[c.item_id]!=null)o.c[c.item_id]++});return o}
function hbLike(id,my){if(!hbMember())return toast("Cần khai báo căn hộ để thả tim");act(async function(){var me=U.s.user.id;if(my)await q(sb.from("hb_reactions").delete().eq("item_id",id).eq("user_id",me));else await q(sb.from("hb_reactions").insert({item_id:id}));refresh()})}
async function hbWho(id){var r=await sb.from("hb_reactions").select("user_id").eq("item_id",id);if(r.error)return toast(errMsg(r.error));var ids=(r.data||[]).map(function(x){return x.user_id}),pr=ids.length?await sb.from("profiles").select("id,name,photo_path").in("id",ids):{data:[]},old=document.querySelector(".pm");if(old)old.remove();var m=document.createElement("div");m.className="pm";m.innerHTML='<div><b style="font-size:18px">❤️ Đã thả tim ('+ids.length+')</b>'+((pr.data||[]).map(function(p){return '<div class="row" style="gap:10px;margin:10px 0">'+av({name:p.name||"?",photo_path:p.photo_path},32)+'<span>'+esc(p.name||"Cư dân")+'</span></div>'}).join("")||'<p class="mute">Chưa có ai.</p>')+'<button class="btn" style="margin-top:10px" onclick="this.closest(\'.pm\').remove()">Đóng</button></div>';m.onclick=function(e){if(e.target===m)m.remove()};document.body.appendChild(m)}

/* ----- Danh sách ----- */
function hbSetK(k){hbk=k;hbt="all";refresh()}
function hbSetT(t){hbt=t;refresh()}
function hbFind(inp){var s=inp.value.trim().toLowerCase(),n=0;document.querySelectorAll(".hbc").forEach(function(c){var ok=!s||c.dataset.s.indexOf(s)>-1;c.style.display=ok?"":"none";if(ok)n++});var e=$("hbnf");if(e)e.style.display=n?"none":""}
function hbCard(it,E){var k=hbKL(it.kind),cov=pubUrl(it.cover_path),nf=(it.files||[]).length,r=E.r[it.id]||{n:0},nc=E.c[it.id]||0,ng=(E.g&&it.ref_group)?(E.g[it.ref_group]||1)-1:0;
  return '<div class="card nl hbc" data-s="'+esc((it.title+" "+(it.body||"")+" "+(it.source||"")+" "+hbTopicL(it.topic)).toLowerCase())+'" onclick="go(\'hbitem\','+it.id+')">'+(cov?'<img src="'+esc(cov)+'" alt="">':'<div class="nth">'+k[2]+'</div>')+'<div style="min-width:0;flex:1"><div class="row">'+(it.pinned?'<span class="tag s-sent">📌 Ghim</span>':'')+'<span class="tag hbtp">'+esc(hbTopicL(it.topic))+'</span>'+(it.kind==="question"?(it.solved?'<span class="tag s-done">Đã giải đáp</span>':''):'')+(it.hidden?'<span class="tag s-new">Đã ẩn</span>':'')+'</div><b class="nt">'+esc(it.title)+'</b><div class="mute">'+esc(hbAu(it))+' · '+ago(it.created_at)+'</div><div class="mute hbm">'+(nf?'<span>📎 '+nf+' file</span>':'')+'<span>❤️ '+r.n+'</span><span>💬 '+nc+'</span>'+(ng>0?'<span>🔗 '+ng+' câu liên quan</span>':'')+'</div></div></div>'}
async function hbView(){
  if(!hbVisible())return bar("Sổ tay cư dân")+'<p class="mute">Mục này chưa mở.</p>';
  try{await hbLoadTopics()}catch(e){return hbNoDb(e)}
  var tipOpen=await hbTipOpen(),qy=sb.from("hb_items").select("*, profiles!author_id(name,photo_path)").eq("kind",hbk).order("pinned",{ascending:false}).order("created_at",{ascending:false}).limit(200);
  var act0=hbTopics.filter(function(t){return t.active});if(hbt!=="all"&&!act0.some(function(t){return t.key===hbt}))hbt="all";
  if(hbt!=="all")qy=qy.eq("topic",hbt);
  var l=await q(qy),E=await hbEngage(l.map(function(x){return x.id})),k=hbKL(hbk);E.g={};l.forEach(function(x){if(x.ref_group)E.g[x.ref_group]=(E.g[x.ref_group]||0)+1});
  var add={doc:"+ Đăng tài liệu",tip:"+ Chia sẻ mẹo",question:"+ Đặt câu hỏi"}[hbk];
  var h='<div class="bar"><h1>Sổ tay cư dân</h1><span style="flex:1"></span>'+(hbCanAdd(hbk,tipOpen)?'<button class="btn sm" style="width:auto;margin:0" onclick="hbNew()">'+add+'</button>':'')+'</div>'
    +((hbMod()||{}).state==="admin"?'<p class="mute">Mục này đang ẩn với cư dân, chỉ admin thấy.</p>':'')
    +'<div class="seg hbseg">'+HBK.map(function(x){return '<button class="'+(hbk===x[0]?"on":"")+'" onclick="hbSetK(\''+x[0]+'\')">'+x[2]+' '+x[1]+'</button>'}).join("")+'</div>'
    +'<div class="row hbtools"><button class="chip" onclick="mpTab=\'hb\';go(\'myposts\')">📋 Bài của tôi</button>'+(hbAdm()||can("hide_content")?'<button class="chip" onclick="go(\'hbadmin\')">🗂 Quản lý bài</button>':'')+'</div>'
    +'<p class="mute hbi">'+HBI[hbk]+(hbk==="question"?' Sự cố cần BQL kiểm tra hoặc xử lý, hãy <a href="#" onclick="newCase();return false">gửi Phản ánh</a>.':'')+(hbk==="tip"&&!tipOpen&&!hbAdm()?' Hiện chỉ admin đăng mẹo, bạn chia sẻ kinh nghiệm qua bình luận nhé.':'')+'</p>'
    +'<input class="hbq" type="search" placeholder="Tìm trong '+k[1].toLowerCase()+'..." oninput="hbFind(this)">'
    +'<div class="chips">'+[["all","Mọi chủ đề"]].concat(act0.map(function(t){return[t.key,t.label]})).map(function(t){return '<button class="chip'+(hbt===t[0]?" on":"")+'" onclick="hbSetT(\''+t[0]+'\')">'+esc(t[1])+'</button>'}).join("")+'</div>';
  var empty={doc:"Chưa có tài liệu nào.",tip:"Chưa có mẹo vặt nào.",question:"Chưa có câu hỏi nào. Hãy là người đầu tiên đặt câu hỏi."}[hbk];
  return h+l.map(function(it){return hbCard(it,E)}).join("")+'<p class="mute" id="hbnf" style="'+(l.length?"display:none":"")+'">'+(l.length?"Không tìm thấy bài phù hợp.":empty)+'</p>'}

/* ----- Chi tiết ----- */
async function hbItemView(){
  try{await hbLoadTopics()}catch(e){return hbNoDb(e)}
  var id=cur,it=await q(sb.from("hb_items").select("*, profiles!author_id(name,photo_path)").eq("id",id).maybeSingle());
  if(!it)return bar("Không tìm thấy","hb")+'<p class="mute">Bài không tồn tại, đã bị xóa hoặc đang ẩn.</p>';
  hbk=it.kind;var k=hbKL(it.kind),E=await hbEngage([id]),r=E.r[id]||{n:0,my:false},nc=E.c[id]||0,files=it.files||[],urls={};
  if(files.length){try{var s=await sb.storage.from("handbook-files").createSignedUrls(files.map(function(f){return f.path}),3600);(s.data||[]).forEach(function(x){if(x&&x.signedUrl)urls[x.path]=x.signedUrl})}catch(e){console.error(e)}}
  var cov=pubUrl(it.cover_path),me=U.s.user.id,own=it.author_id===me,adm=hbAdm(),mod=can("hide_content"),B='style="width:auto;margin:0"',btns="";
  if(own||adm)btns+='<button class="btn sm alt" '+B+' onclick="hbEdit('+id+')">✏️ Sửa</button>'+(own?'<button class="btn sm alt" '+B+' onclick="cf(this,function(){hbDel('+id+')})">🗑 Xóa</button>':'<button class="btn sm alt" '+B+' onclick="hbDelUi(['+id+'])">🗑 Xóa</button>');
  if(it.kind==="question"&&(own||adm))btns+='<button class="btn sm'+(it.solved?" alt":"")+'" '+B+' onclick="hbSet('+id+',{solved:'+!it.solved+'})">'+(it.solved?"Bỏ đánh dấu đã giải đáp":"✓ Đánh dấu đã giải đáp")+'</button>';
  if(adm)btns+='<button class="btn sm alt" '+B+' onclick="hbSet('+id+',{pinned:'+!it.pinned+'})">'+(it.pinned?"Bỏ ghim":"📌 Ghim")+'</button>';
  if(adm||mod)btns+='<button class="btn sm alt" '+B+' onclick="hbSet('+id+',{hidden:'+!it.hidden+'})">'+(it.hidden?"Hiện lại":"Ẩn bài")+'</button>';
  var h=bar(k[1],"hb")+'<div class="card hbd"><div class="row"><span class="tag s-sent">'+k[2]+' '+k[1]+'</span><span class="tag hbtp">'+esc(hbTopicL(it.topic))+'</span>'+(it.pinned?'<span class="tag s-sent">📌 Ghim</span>':'')+(it.kind==="question"&&it.solved?'<span class="tag s-done">Đã giải đáp</span>':'')+(it.hidden?'<span class="tag s-new">Đã ẩn</span>':'')+'</div>'
    +'<h2 class="hbh">'+esc(it.title)+'</h2><div class="mute">'+esc(hbAu(it))+' · '+stamp(it.created_at)+(it.edited_at?" · đã chỉnh sửa":"")+'</div>'
    +(it.source?'<div class="mute src">Nguồn: '+hbLinks(it.source)+'</div>':'')
    +(cov?'<img src="'+esc(cov)+'" alt="">':'')
    +(it.body?'<div class="hbb">'+hbLinks(it.body)+'</div>':'')
    +(files.length?'<div class="hbfs">'+files.map(function(f){var u=urls[f.path];return u?'<a class="hbfile" href="'+esc(u)+'" target="_blank" rel="noopener"><span class="hbx">'+esc(hbExt(f))+'</span><span class="hbfn"><b>'+esc(f.name||"Tệp đính kèm")+'</b><small>'+hbSize(f.size)+' · bấm để mở</small></span></a>':'<div class="hbfile off"><span class="hbx">'+esc(hbExt(f))+'</span><span class="hbfn"><b>'+esc(f.name||"Tệp đính kèm")+'</b><small>Không mở được file</small></span></div>'}).join("")+'</div>':'')
    +(btns?'<div class="row" style="gap:8px;margin-top:12px">'+btns+'</div>':'')+'</div>';
  h+='<div class="iga hbbar"><button class="heart'+(r.my?" on":"")+'" onclick="hbLike('+id+','+r.my+')"><span class="e">'+(r.my?"❤️":"🤍")+'</span><span class="rc" onclick="event.stopPropagation();hbWho('+id+')">'+r.n+'</span></button><button onclick="var c=document.getElementById(\'hcin\');if(c)c.focus()"><span class="e">💬</span>'+nc+'</button><span style="flex:1"></span><button onclick="copyLink(\'hbitem\','+id+')" aria-label="Sao chép link"><span class="e">🔗</span></button></div>';
  if(it.kind==="question")h+=await hbRelated(it);
  return h+'<h2>'+(it.kind==="question"?"Trả lời và thảo luận":"Bình luận")+'</h2>'+await hbComments(it)}
async function hbComments(it){
  var l=await q(sb.from("hb_comments").select("*, profiles!author_id(name,photo_path)").eq("item_id",it.id).order("created_at",{ascending:true})),me=U.s.user.id,adm=hbAdm(),mod=can("hide_content");
  var h='<div class="card hbcm">'+(l.map(function(c){var p=c.profiles||{},a=[];if(c.author_id===me||adm)a.push('<a class="mute" href="#" onclick="hbDelCm('+c.id+');return false">Xóa</a>');if(mod)a.push('<a class="mute" href="#" onclick="hbHideCm('+c.id+','+(!c.hidden)+');return false">'+(c.hidden?"Hiện lại":"Ẩn")+'</a>');return '<div class="cm" style="'+(c.hidden?"opacity:.5":"")+'">'+av({name:p.name||"?",photo_path:p.photo_path},30)+'<div style="flex:1;min-width:0"><b>'+esc(p.name||"Cư dân")+'</b>'+(c.author_id===it.author_id&&it.kind==="question"?' <span class="tag s-sent">Người hỏi</span>':'')+' <span class="mute">'+ago(c.created_at)+'</span>'+(c.hidden?' <span class="tag s-new">Đã ẩn</span>':'')+'<div class="hbb">'+hbLinks(c.body)+'</div>'+(a.length?'<div class="row" style="gap:12px">'+a.join("")+'</div>':'')+'</div></div>'}).join("")||'<p class="mute" style="margin:0">'+(it.kind==="question"?"Chưa có trả lời.":"Chưa có bình luận.")+'</p>');
  if(it.hidden)h+='<p class="mute">Bài đang ẩn nên không bình luận được.</p>';
  else if(!hbMember())h+='<p class="mute">Cần khai báo căn hộ để bình luận.</p>';
  else h+='<div class="cmi hbci"><textarea id="hcin" rows="2" placeholder="'+(it.kind==="question"?"Viết câu trả lời hoặc ý kiến...":"Viết bình luận...")+'"></textarea><button class="btn sm" onclick="hbAddCm('+it.id+')">Gửi</button></div>';
  return h+'</div>'}
function hbAddCm(id){act(async function(){var t=v("hcin");if(!t)return toast("Nhập nội dung");if(t.length>2000)return toast("Tối đa 2000 ký tự");await q(sb.from("hb_comments").insert({item_id:id,body:t}));refresh()})}
function hbDelCm(id){act(async function(){var r=await q(sb.from("hb_comments").delete().eq("id",id).select("id"));if(!r||!r.length)throw new Error("Bạn không có quyền xóa bình luận này");refresh()})}
function hbHideCm(id,h){act(async function(){await q(sb.from("hb_comments").update({hidden:h}).eq("id",id));refresh()})}
function hbSet(id,patch){act(async function(){var r=await q(sb.from("hb_items").update(patch).eq("id",id).select("id"));if(!r||!r.length)throw new Error("Bạn không có quyền thực hiện thao tác này");refresh()})}
function hbDel(id){act(async function(){var it=await q(sb.from("hb_items").select("files,cover_path").eq("id",id).maybeSingle()),r=await q(sb.from("hb_items").delete().eq("id",id).select("id"));if(!r||!r.length)throw new Error("Bạn không có quyền xóa bài này");if(it){var fp=(it.files||[]).map(function(f){return f.path});try{if(fp.length)await sb.storage.from("handbook-files").remove(fp);if(it.cover_path)await sb.storage.from("public-media").remove([it.cover_path])}catch(e){}}toast("Đã xóa bài");go("hb")})}

/* ----- Đăng và sửa ----- */
function hbNew(){hbFiles=[];hbDrop=[];hbCov=null;hbCovDel=false;hbKind=hbk;go("hbnew")}
function hbEdit(id){hbFiles=[];hbDrop=[];hbCov=null;hbCovDel=false;go("hbnew",id)}
var hbOld=null;
function hbFileList(){var e=$("hbfl");if(!e)return;var a=((hbOld&&hbOld.files)||[]).filter(function(f){return hbDrop.indexOf(f.path)<0}).map(function(f){return '<div class="hbfile"><span class="hbx">'+esc(hbExt(f))+'</span><span class="hbfn"><b>'+esc(f.name||f.path)+'</b><small>'+hbSize(f.size)+' · đang đính kèm</small></span><button class="xbtn" title="Bỏ file" onclick="hbDrop.push(\''+esc(f.path)+'\');hbFileList()">✕</button></div>'}),b=hbFiles.map(function(f,i){return '<div class="hbfile"><span class="hbx">'+esc(hbExt(f))+'</span><span class="hbfn"><b>'+esc(f.name)+'</b><small>'+hbSize(f.size)+' · sẽ tải lên</small></span><button class="xbtn" title="Bỏ file" onclick="hbFiles.splice('+i+',1);hbFileList()">✕</button></div>'});e.innerHTML=a.concat(b).join("")||'<span class="mute">Chưa có file.</span>'}
function hbPickFiles(inp){var fl=[].slice.call(inp.files);inp.value="";var have=((hbOld&&hbOld.files)||[]).filter(function(f){return hbDrop.indexOf(f.path)<0}).length+hbFiles.length;for(var i=0;i<fl.length;i++){var f=fl[i];if(have>=5){toast("Tối đa 5 file mỗi bài");break}if(f.size>20*1048576){toast(f.name+" lớn hơn 20 MB");continue}hbFiles.push(f);have++}hbFileList()}
async function hbPickCov(inp){var f=inp.files[0];inp.value="";if(!f)return;hbCov=await resizeTo(f,1200,false);hbCovDel=false;var e=$("hbcn");if(e)e.textContent=" Đã chọn ảnh"}
async function hbNewView(){
  try{await hbLoadTopics()}catch(e){return hbNoDb(e)}
  var ed=cur,me=U.s.user.id,adm=hbAdm(),it=null;hbOld=null;
  if(ed){it=await q(sb.from("hb_items").select("*").eq("id",ed).maybeSingle());if(!it)return bar("Sửa bài","hb")+'<p class="mute">Không tìm thấy bài.</p>';if(!(it.author_id===me||adm))return bar("Sửa bài","hb")+'<p class="mute">Bạn chưa có quyền sửa bài này.</p>';hbOld=it}
  var kind=it?it.kind:hbKind,k=hbKL(kind);
  if(!it&&!hbCanAdd(kind,await hbTipOpen()))return bar("Đăng bài","hb")+'<p class="mute">'+(kind==="doc"?"Chỉ admin được đăng tài liệu tham khảo.":kind==="tip"?"Hiện chỉ admin được đăng mẹo vặt.":"Cần khai báo căn hộ để đặt câu hỏi.")+'</p>';
  var tps=hbTopics.filter(function(t){return t.active||(it&&t.key===it.topic)}),tp0=it?it.topic:(hbt!=="all"?hbt:(tps[0]||{}).key);
  var T={doc:["Đăng tài liệu tham khảo","Sửa tài liệu"],tip:["Chia sẻ mẹo vặt","Sửa mẹo vặt"],question:["Đặt câu hỏi","Sửa câu hỏi"]}[kind],
      PH={doc:["Ví dụ: Luật Nhà ở 2023","Tóm tắt nội dung chính, điều khoản cư dân cần biết..."],tip:["Ví dụ: Cách xử lý aptomat hay bị nhảy","Các bước làm, dụng cụ cần có, lưu ý an toàn..."],question:["Ví dụ: Thay bình nóng lạnh cần báo BQL không?","Mô tả rõ câu hỏi để mọi người dễ trả lời..."]}[kind];
  var back=ed?'<div class="bar"><button class="back" onclick="go(\'hbitem\','+ed+')">‹ Quay lại</button><h1>'+T[1]+'</h1></div>':bar(T[0],"hb");
  var h=back+(kind==="question"&&!ed?'<div class="card nt"><b>Câu hỏi khác Phản ánh</b><div class="mute">Hỏi đáp dùng để thêm hiểu biết và cùng thảo luận, không gửi tới BQL. Nếu cần BQL kiểm tra hoặc xử lý sự cố, hãy gửi Phản ánh kèm ảnh.</div><button class="btn sm alt" style="width:auto;margin-top:8px" onclick="newCase()">📷 Gửi phản ánh</button></div>':'');
  h+='<div class="card"><div class="mute">Mục: '+k[2]+' '+k[1]+'</div><label>Chủ đề</label><select id="hbtp">'+tps.map(function(t){return '<option value="'+esc(t.key)+'"'+(t.key===tp0?" selected":"")+'>'+esc(t.label)+'</option>'}).join("")+'</select>'
    +'<label>Tiêu đề</label><input id="hbti" maxlength="200" value="'+esc(it?it.title:"")+'" placeholder="'+PH[0]+'">'
    +'<label>'+(kind==="question"?"Nội dung câu hỏi":"Nội dung")+'</label><textarea id="hbbo" rows="8" placeholder="'+PH[1]+'">'+esc(it?it.body:"")+'</textarea>'
    +(kind!=="question"?'<label>Nguồn'+(kind==="doc"?" (số hiệu văn bản, ngày ban hành, link)":" (nếu có)")+'</label><input id="hbsr" maxlength="300" value="'+esc(it&&it.source||"")+'" placeholder="'+(kind==="doc"?"Ví dụ: Luật số 27/2023/QH15, hiệu lực 01/8/2024":"Ví dụ: kinh nghiệm cá nhân, link bài viết")+'">':'')
    +'<label>Ảnh minh họa (không bắt buộc)</label><div class="row"><label class="btn sm alt" style="margin:0;cursor:pointer">🖼 Chọn ảnh<input type="file" accept="image/*" hidden onchange="hbPickCov(this)"></label>'+(it&&it.cover_path?'<button class="btn sm alt" style="width:auto;margin:0" onclick="hbCovDel=true;hbCov=null;$(\'hbcn\').textContent=\' Sẽ bỏ ảnh hiện tại\'">Bỏ ảnh</button>':'')+'<span class="mute" id="hbcn">'+(it&&it.cover_path?" Đang dùng ảnh hiện tại":"")+'</span></div>';
  if(adm&&kind==="doc")h+='<label>File đính kèm (PDF, Word, Excel, ảnh · tối đa 5 file, mỗi file 20 MB)</label><label class="btn sm alt" style="margin:0;cursor:pointer;display:inline-block">📎 Chọn file<input type="file" multiple hidden accept=".pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png" onchange="hbPickFiles(this)"></label><div id="hbfl" class="hbfs"></div>';
  h+=(kind==="doc"?'<div class="mute" style="margin-top:8px">Tên người đăng hiện là "Admin". Ghi rõ nguồn để cư dân đối chiếu văn bản gốc.</div>':'')+'<button class="btn" onclick="hbSave()">'+(ed?"Lưu thay đổi":kind==="question"?"Gửi câu hỏi":"Đăng")+'</button></div>';
  setTimeout(hbFileList,0);return h}
function hbSave(){act(async function(){
  var ed=cur,me=U.s.user.id,adm=hbAdm(),t=v("hbti"),b=$("hbbo")?$("hbbo").value.trim():"",tp=v("hbtp"),src=v("hbsr");
  if(t.length<3)return toast("Tiêu đề cần ít nhất 3 ký tự");if(!tp)return toast("Chọn chủ đề");
  var old=ed?await q(sb.from("hb_items").select("*").eq("id",ed).maybeSingle()):null;if(ed&&!old)throw new Error("Không tìm thấy bài");
  var kind=old?old.kind:hbKind;if(kind==="question"&&b.length<5)return toast("Hãy mô tả câu hỏi rõ hơn");
  var keep=((old&&old.files)||[]).filter(function(f){return hbDrop.indexOf(f.path)<0}),up=[],cov=null;
  if(keep.length+hbFiles.length>5)return toast("Tối đa 5 file mỗi bài");
  try{
    for(var i=0;i<hbFiles.length;i++){var f=hbFiles[i],path=kind+"/"+Date.now()+"-"+i+"-"+hbSafe(f.name),r=await sb.storage.from("handbook-files").upload(path,f,{contentType:f.type||"application/octet-stream",upsert:false});if(r.error)throw r.error;up.push({path:path,name:f.name,size:f.size,type:f.type||""})}
    if(hbCov){cov=me+"/hb-"+Date.now()+".jpg";var rc=await sb.storage.from("public-media").upload(cov,hbCov,{contentType:"image/jpeg"});if(rc.error){cov=null;throw rc.error}}
    var row={topic:tp,title:t,body:b,source:src||null};
    if(adm&&kind==="doc")row.files=keep.concat(up);
    if(cov)row.cover_path=cov;else if(hbCovDel)row.cover_path=null;
    var id=ed;
    if(ed){var u=await q(sb.from("hb_items").update(row).eq("id",ed).select("id"));if(!u||!u.length)throw new Error("Bạn không có quyền sửa bài này")}
    else{row.kind=kind;var n=await q(sb.from("hb_items").insert(row).select("id").single());id=n.id}
  }catch(e){try{if(up.length)await sb.storage.from("handbook-files").remove(up.map(function(x){return x.path}));if(cov)await sb.storage.from("public-media").remove([cov])}catch(x){}throw e}
  try{if(hbDrop.length)await sb.storage.from("handbook-files").remove(hbDrop);if(old&&old.cover_path&&(cov||hbCovDel))await sb.storage.from("public-media").remove([old.cover_path])}catch(e){}
  hbFiles=[];hbDrop=[];hbCov=null;hbCovDel=false;hbk=kind;toast(ed?"Đã lưu":"Đã đăng");go("hbitem",id)})}

/* ----- Cài đặt Sổ tay (super admin) ----- */
async function hbSettings(){
  if(!hbMod())return"";var tp,on;try{tp=await hbLoadTopics(true);on=await hbTipOpen()}catch(e){return '<div class="card"><h3 style="margin-top:0">Sổ tay cư dân</h3><p class="mute">Chưa chạy <code>tt01_patch10_handbook.sql</code>.</p></div>'}
  return '<div class="card"><h3 style="margin-top:0">Sổ tay cư dân</h3><label class="row" style="gap:10px;align-items:flex-start"><input type="checkbox" style="width:auto;margin-top:4px" '+(on?"checked":"")+' onchange="hbSetTip(this.checked)"><span>Cho cư dân đăng Mẹo vặt<br><span class="mute">Mặc định bật. Tắt: chỉ admin đăng mẹo. Tài liệu tham khảo luôn chỉ admin đăng. Hỏi đáp luôn mở cho cư dân đã khai căn.</span></span></label>'
    +'<h4>Chủ đề</h4><div class="hbtr hd"><span>Tên chủ đề</span><span>Thứ tự</span><span>Hiện</span><span></span></div>'+tp.map(function(t){return '<div class="hbtr"><input id="hbl_'+t.key+'" value="'+esc(t.label)+'" maxlength="60"><input id="hbs_'+t.key+'" type="number" value="'+t.sort+'"><input type="checkbox" id="hba_'+t.key+'"'+(t.active?" checked":"")+'><button class="btn sm alt" onclick="hbSaveTopic(\''+t.key+'\')">Lưu</button></div>'}).join("")
    +'<div class="hbtr add"><input id="hbnl" placeholder="Tên chủ đề mới" maxlength="60"><button class="btn sm" onclick="hbAddTopic()">+ Thêm</button></div><div class="mute">Bỏ tích "Hiện": bài cũ vẫn giữ, chủ đề không hiện trong bộ lọc và khi đăng bài mới.</div></div>'}
function hbSetTip(on){act(async function(){await q(sb.from("settings").upsert({key:"hb_tip_open",value:!!on},{onConflict:"key"}));toast(on?"Cư dân được đăng mẹo vặt":"Chỉ admin đăng mẹo vặt")})}
function hbSaveTopic(k){act(async function(){var l=v("hbl_"+k),s=parseInt(v("hbs_"+k),10);if(!l)return toast("Nhập tên chủ đề");await q(sb.from("hb_topics").update({label:l,sort:isNaN(s)?100:s,active:$("hba_"+k).checked}).eq("key",k));await hbLoadTopics(true);toast("Đã lưu chủ đề")})}
function hbAddTopic(){act(async function(){var l=v("hbnl");if(!l)return toast("Nhập tên chủ đề");var mx=(hbTopics||[]).filter(function(t){return t.sort<999}).reduce(function(m,t){return Math.max(m,t.sort)},0);await q(sb.from("hb_topics").insert({key:"t"+Date.now().toString(36),label:l,sort:mx+10}));await hbLoadTopics(true);toast("Đã thêm chủ đề");refresh()})}

/* ===== Câu hỏi liên quan (admin liên kết) ===== */
var HBSTOP=" co khong la cua va cho duoc bi thi o toi minh moi nguoi a nao gi nhu the nay do voi em anh chi ban hoi can phai khi nen se da dang mot cac nhung ve tai tu den lam sao ai oi nhe vay roi hay nha a. ";
function hbNorm(t){return String(t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/[^a-z0-9]+/g," ").trim()}
function hbWords(t){var o={};hbNorm(t).split(" ").forEach(function(w){if(w&&(w.length>1||/\d/.test(w))&&HBSTOP.indexOf(" "+w+" ")<0)o[w]=1});return o}
function hbSim(a,b){var A=hbWords(a),B=hbWords(b),i=0,u=0,k;for(k in A){u++;if(B[k])i++}for(k in B)if(!A[k])u++;return u?{j:i/u,i:i}:{j:0,i:0}}
async function hbRelated(it){var adm=hbAdm(),rel=[];
  if(it.ref_group)rel=await q(sb.from("hb_items").select("id,title,created_at,solved,hidden,author_label,profiles!author_id(name)").eq("ref_group",it.ref_group).neq("id",it.id).order("created_at",{ascending:true}));
  if(!rel.length&&!adm)return"";
  var E=await hbEngage(rel.map(function(x){return x.id}));
  return '<h2>Câu hỏi liên quan'+(rel.length?' ('+rel.length+')':'')+'</h2><div class="card hbrel">'+(rel.length?'<div class="mute" style="margin-bottom:4px">Các câu hỏi cùng nội dung do admin liên kết, xếp từ cũ đến mới. Xem trả lời ở các câu này trước khi hỏi thêm.</div>':'<div class="mute">Chưa liên kết câu hỏi nào.</div>')
    +rel.map(function(x){return '<div class="hbrr"><div style="flex:1;min-width:0;cursor:pointer" onclick="go(\'hbitem\','+x.id+')"><b>'+esc(x.title)+'</b><div class="mute">'+esc(hbAu(x))+' · '+stamp(x.created_at).slice(0,10)+' · 💬 '+(E.c[x.id]||0)+(ts(x.created_at)<ts(it.created_at)?' · hỏi trước':' · hỏi sau')+'</div></div>'+(x.solved?'<span class="tag s-done">Đã giải đáp</span>':'')+(x.hidden?'<span class="tag s-new">Đã ẩn</span>':'')+(adm?'<button class="xbtn" title="Bỏ liên kết câu này" onclick="cf(this,function(){hbUnlink('+x.id+')})">✕</button>':'')+'</div>'}).join("")
    +(adm?'<button class="btn sm alt" style="width:auto;margin-top:10px" onclick="hbLinkUi('+it.id+')">🔗 Liên kết câu hỏi tương tự</button>':'')+'</div>'}
function hbUnlink(id){act(async function(){await q(sb.rpc("hb_unlink",{p_item:id}));toast("Đã bỏ liên kết");refresh()})}
var hbLk=null;
async function hbLinkUi(id){var all=await q(sb.from("hb_items").select("id,title,created_at,ref_group,solved").eq("kind","question").order("created_at",{ascending:false}).limit(500)),me=all.filter(function(x){return x.id===id})[0];if(!me)return;
  hbLk={id:id,l:all.filter(function(x){return x.id!==id&&!(me.ref_group&&x.ref_group===me.ref_group)}).map(function(x){var m=hbSim(me.title,x.title);x.j=m.j;x.n=hbNorm(x.title);return x})};
  var old=document.querySelector(".pm");if(old)old.remove();var m=document.createElement("div");m.className="pm";
  m.innerHTML='<div><b style="font-size:18px">Liên kết câu hỏi tương tự</b><div class="mute">Chọn câu hỏi có cùng nội dung với: <b>'+esc(me.title)+'</b>. Hai câu sẽ hiện ở mục "Câu hỏi liên quan" của nhau.</div><input id="hblq" type="search" placeholder="Tìm câu hỏi theo tiêu đề..." oninput="hbLinkList()" style="margin-top:10px"><div id="hbll"></div><button class="btn alt" onclick="this.closest(\'.pm\').remove()">Đóng</button></div>';
  m.onclick=function(e){if(e.target===m)m.remove()};document.body.appendChild(m);hbLinkList()}
function hbLinkList(){var e=$("hbll");if(!e||!hbLk)return;var t=hbNorm(v("hblq")),l;
  if(t)l=hbLk.l.filter(function(x){return x.n.indexOf(t)>-1}).slice(0,30);else l=hbLk.l.filter(function(x){return x.j>0}).sort(function(a,b){return b.j-a.j}).slice(0,8);
  e.innerHTML=(t?'':'<div class="mute" style="margin:10px 0 4px">'+(l.length?"Gợi ý theo tiêu đề giống nhau:":"Không có câu nào giống tiêu đề, hãy gõ để tìm.")+'</div>')+l.map(function(x){return '<button class="sl hbls" onclick="hbDoLink('+x.id+')"><b>'+esc(x.title)+'</b><small>'+stamp(x.created_at).slice(0,10)+(x.solved?" · đã giải đáp":"")+(x.ref_group?" · đang ở nhóm khác, sẽ gộp nhóm":"")+'</small></button>'}).join("")+(t&&!l.length?'<p class="mute">Không tìm thấy.</p>':'')}
function hbDoLink(t){act(async function(){await q(sb.rpc("hb_link",{p_item:hbLk.id,p_target:t}));var m=document.querySelector(".pm");if(m)m.remove();toast("Đã liên kết câu hỏi");refresh()})}

/* ===== Admin xóa bài (trùng lặp, đăng nhầm...) kèm lý do ===== */
var HBR=["Trùng lặp với câu hỏi đã có","Đăng nhầm","Nội dung không phù hợp","Thông tin đã cũ, không còn đúng"],hbDelIds=[];
function hbDelUi(ids){hbDelIds=ids.slice();var old=document.querySelector(".pm");if(old)old.remove();var m=document.createElement("div");m.className="pm";
  m.innerHTML='<div><b style="font-size:18px">Xóa '+(ids.length>1?ids.length+" bài":"bài này")+'</b><div class="mute">Bình luận và lượt thả tim đi kèm cũng bị xóa. Tác giả nhận thông báo kèm lý do'+(ids.length===1?'':'')+'. Nếu là câu hỏi trùng, nên liên kết với câu gốc trước để tác giả được dẫn sang đó.</div><label>Lý do</label><div class="chips" style="flex-wrap:wrap">'+HBR.map(function(r,i){return '<button class="chip" onclick="document.querySelectorAll(\'.hbrs\').forEach(function(b){b.classList.remove(\'on\')});this.classList.add(\'on\');$(\'hbro\').value=this.textContent" >'+r+'</button>'}).join("").replace(/class="chip"/g,'class="chip hbrs"')+'</div><input id="hbro" placeholder="Hoặc ghi lý do khác"><button class="btn" style="background:var(--red);border-color:transparent" onclick="cf(this,hbDoDel)">🗑 Xóa</button><button class="btn alt" onclick="this.closest(\'.pm\').remove()">Hủy</button></div>';
  m.onclick=function(e){if(e.target===m)m.remove()};document.body.appendChild(m)}
function hbDoDel(){act(async function(){var why=v("hbro");if(!why)return toast("Chọn hoặc ghi lý do xóa");var ids=hbDelIds,r=await q(sb.rpc("hb_admin_delete",{p_ids:ids,p_reason:why}))||[],by={};r.forEach(function(x){(by[x.bucket]=by[x.bucket]||[]).push(x.path)});for(var b in by){try{await sb.storage.from(b).remove(by[b])}catch(e){}}var m=document.querySelector(".pm");if(m)m.remove();hbSel={};toast("Đã xóa "+ids.length+" bài");if(view==="hbitem")go("hb");else refresh()})}

/* ===== Quản lý bài Sổ tay (admin, moderator) ===== */
var hmK="all",hmS="all",hbSel={};
async function hbAdminView(){var adm=hbAdm(),mod=can("hide_content");if(!adm&&!mod)return bar("Quản lý bài","hb")+'<p class="mute">Chỉ admin hoặc moderator vào được mục này.</p>';
  try{await hbLoadTopics()}catch(e){return hbNoDb(e)}
  var all=await q(sb.from("hb_items").select("id,kind,topic,title,created_at,hidden,solved,pinned,ref_group,author_id,author_label,files,profiles!author_id(name)").order("created_at",{ascending:false}).limit(500)),E=await hbEngage(all.map(function(x){return x.id})),dup={};
  var qs=all.filter(function(x){return x.kind==="question"});for(var i=0;i<qs.length;i++)for(var j=i+1;j<qs.length;j++){var a=qs[i],b=qs[j];if(a.ref_group&&a.ref_group===b.ref_group)continue;var m=hbSim(a.title,b.title);if(m.i>=2&&m.j>=.5){(dup[a.id]=dup[a.id]||[]).push(b.id);(dup[b.id]=dup[b.id]||[]).push(a.id)}}
  var l=all.filter(function(x){return(hmK==="all"||x.kind===hmK)&&(hmS==="all"||(hmS==="hid"&&x.hidden)||(hmS==="dup"&&dup[x.id])||(hmS==="open"&&x.kind==="question"&&!x.solved&&!x.hidden)||(hmS==="nocm"&&!(E.c[x.id])))});
  Object.keys(hbSel).forEach(function(k){if(!l.some(function(x){return String(x.id)===k}))delete hbSel[k]});
  var nd=Object.keys(dup).length,h=bar("Quản lý bài Sổ tay","hb")+'<p class="mute">'+all.length+' bài. Tích chọn để ẩn, hiện'+(adm?' hoặc xóa':'')+' nhiều bài một lúc. Bấm tiêu đề để mở bài, liên kết câu hỏi tương tự ở trong bài.</p>'
    +'<div class="chips">'+[["all","Tất cả"]].concat(HBK.map(function(x){return[x[0],x[2]+" "+x[1]]})).map(function(x){return '<button class="chip'+(hmK===x[0]?" on":"")+'" onclick="hmK=\''+x[0]+'\';refresh()">'+x[1]+'</button>'}).join("")+'</div>'
    +'<div class="chips">'+[["all","Mọi trạng thái"],["dup","⚠ Có thể trùng ("+nd+")"],["open","Câu hỏi chưa giải đáp"],["nocm","Chưa có bình luận"],["hid","Đang ẩn"]].map(function(x){return '<button class="chip'+(hmS===x[0]?" on":"")+'" onclick="hmS=\''+x[0]+'\';refresh()">'+x[1]+'</button>'}).join("")+'</div>'
    +'<input class="hbq" type="search" placeholder="Tìm theo tiêu đề hoặc người đăng..." oninput="hbFind(this)">';
  h+=l.map(function(x){var k=hbKL(x.kind),d=dup[x.id];return '<div class="card hbmr hbc" data-s="'+esc((x.title+" "+hbAu(x)).toLowerCase())+'"><input type="checkbox" '+(hbSel[x.id]?"checked":"")+' onchange="hbPick('+x.id+',this.checked)"><div style="flex:1;min-width:0"><b class="hbmt" onclick="go(\'hbitem\','+x.id+')">'+k[2]+' '+esc(x.title)+'</b><div class="mute">'+esc(hbAu(x))+' · '+stamp(x.created_at).slice(0,10)+' · '+esc(hbTopicL(x.topic))+' · 💬 '+(E.c[x.id]||0)+((x.files||[]).length?' · 📎 '+x.files.length:'')+'</div><div class="row" style="gap:6px;margin-top:4px">'+(x.hidden?'<span class="tag s-new">Đã ẩn</span>':'')+(x.pinned?'<span class="tag s-sent">📌 Ghim</span>':'')+(x.kind==="question"?(x.solved?'<span class="tag s-done">Đã giải đáp</span>':'<span class="tag s-sent">Chưa giải đáp</span>'):'')+(x.ref_group?'<span class="tag hbtp">🔗 Đã liên kết</span>':'')+(d?'<span class="tag urgent" onclick="go(\'hbitem\','+d[0]+')" style="cursor:pointer">⚠ Có thể trùng '+d.length+' câu</span>':'')+'</div></div></div>'}).join("")||'<p class="mute">Không có bài nào.</p>';
  h+='<p class="mute" id="hbnf" style="display:none">Không tìm thấy bài phù hợp.</p><div class="hbbulk" id="hbbk"></div>';setTimeout(hbBulk,0);return h}
function hbPick(id,on){if(on)hbSel[id]=1;else delete hbSel[id];hbBulk()}
function hbBulk(){var e=$("hbbk");if(!e)return;var ids=Object.keys(hbSel).map(Number),adm=hbAdm();e.style.display=ids.length?"":"none";e.innerHTML='<b>Đã chọn '+ids.length+'</b><span style="flex:1"></span><button class="btn sm alt" onclick="hbBulkHide(true)">Ẩn</button><button class="btn sm alt" onclick="hbBulkHide(false)">Hiện</button>'+(adm?'<button class="btn sm" style="background:var(--red);border-color:transparent" onclick="hbDelUi(Object.keys(hbSel).map(Number))">Xóa</button>':'')+'<button class="btn sm alt" onclick="hbSel={};refresh()">Bỏ chọn</button>'}
function hbBulkHide(h){act(async function(){var ids=Object.keys(hbSel).map(Number);var r=await q(sb.from("hb_items").update({hidden:h}).in("id",ids).select("id"));hbSel={};toast((h?"Đã ẩn ":"Đã hiện ")+(r||[]).length+" bài");refresh()})}

/* ===== Bài đăng của tôi (mọi mục) ===== */
var mpTab="hb",mpK="all";
async function myPostsView(){var me=U.s.user.id,r=await Promise.all([sb.from("hb_items").select("*, profiles!author_id(name,photo_path)").eq("author_id",me).order("created_at",{ascending:false}).limit(300),sb.from("posts").select("*").eq("author_id",me).order("created_at",{ascending:false}).limit(300),sb.from("activities").select("*").eq("author_id",me).order("created_at",{ascending:false}).limit(300),loadCases().catch(function(){return[]})]);
  var hb=r[0].error?null:r[0].data||[],ps=r[1].error?[]:r[1].data||[],ac=r[2].error?[]:r[2].data||[],cs=r[3]||[],F=["author_id","user_id","created_by","reporter_id"],hasA=cs.some(function(c){return F.some(function(f){return f in c})}),uids=U.units.map(function(u){return u.unit_id});
  var mc=hasA?cs.filter(function(c){return F.some(function(f){return c[f]===me})}):cs.filter(function(c){return uids.indexOf(c.unit_id)>-1});
  if(hb)await hbLoadTopics().catch(function(){});
  var T=[["hb","Sổ tay",hb?hb.length:0],["voc",hasA?"Phản ánh":"Phản ánh của căn",mc.length],["feed","Bảng tin",ps.length],["act","Hoạt động",ac.length]].filter(function(x){return x[0]==="hb"?(hb&&hbVisible()):x[0]==="voc"||x[2]>0||(x[0]==="feed"&&canPost())||(x[0]==="act"&&can("post_activity"))});
  if(!T.some(function(x){return x[0]===mpTab}))mpTab=T[0][0];
  var h=bar("Bài đăng của tôi","mine")+'<div class="sst mp">'+T.map(function(x){return '<div onclick="mpTab=\''+x[0]+'\';refresh()" class="'+(mpTab===x[0]?"on":"")+'"><b>'+x[2]+'</b><span>'+x[1]+'</span></div>'}).join("")+'</div>';
  if(mpTab==="hb"){var E=await hbEngage(hb.map(function(x){return x.id})),l=hb.filter(function(x){return mpK==="all"||x.kind===mpK}),tc=0,ts0=0;hb.forEach(function(x){tc+=E.c[x.id]||0;ts0+=(E.r[x.id]||{n:0}).n});
    h+='<p class="mute">Bạn nhận được '+tc+' bình luận và '+ts0+' lượt thả tim. Bấm vào bài để sửa hoặc xóa.</p><div class="chips">'+[["all","Tất cả"]].concat(HBK.map(function(x){return[x[0],x[2]+" "+x[1]+" ("+hb.filter(function(y){return y.kind===x[0]}).length+")"]})).map(function(x){return '<button class="chip'+(mpK===x[0]?" on":"")+'" onclick="mpK=\''+x[0]+'\';refresh()">'+x[1]+'</button>'}).join("")+'</div>'
      +(l.map(function(x){return hbCard(x,E)}).join("")||'<p class="mute">Chưa có bài nào. <a href="#" onclick="go(\'hb\');return false">Vào Sổ tay</a></p>')}
  else if(mpTab==="voc")h+=(hasA?'':'<p class="mute">Phản ánh gửi từ các căn hộ của bạn (gồm cả người cùng căn).</p>')+(mc.map(cardList).join("")||'<p class="mute">Chưa có phản ánh nào.</p>');
  else if(mpTab==="feed")h+=(ps.map(newsList).join("")||'<p class="mute">Chưa có bài nào trên Bảng tin.</p>');
  else h+=(ac.map(actList).join("")||'<p class="mute">Chưa có hoạt động nào.</p>');
  return h}
