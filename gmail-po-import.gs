// ═══════════════════════════════════════════════════════════════════
// Paste at the BOTTOM of gmail-po-mail.gs
// Handles: GOLMAT, ROLLMAT (from purchasing1@golmat.co.il)
//          PAL-YAM          (from shira@t-p-y.co.il)
// No Drive advanced service — pure UrlFetchApp
// ═══════════════════════════════════════════════════════════════════

var PO_LABEL_NAME = 'PO_Processed';

/* v225 fix: POSCAN_RETURN (the app's PREVIEW) read only getMessages()[0], while
   POIMPORT_RETURN already looped ALL messages. Golmat replies to Yaniv's own forwarded
   quote with the PO attached, so the PO sits on message 2 — the preview showed nothing,
   Confirm was never pressed, and the importer never ran. ROLLMAT was unaffected because
   its POs arrive as standalone forwards (message 1 IS the PO). Verified in Gmail:
   POG2602220/POG2602219 match ONLY on the purchasing1@golmat.co.il reply. */
function POALLMSG(t) {
  var ms = t.getMessages(), atts = [], froms = [], subjs = [], bodies = [], seen = {};
  ms.forEach(function(m) {
    /* dedupe: Golmat's reply re-attaches the original quote, so the same PDF appears
       twice on the thread. Each duplicate costs a ~4s Drive conversion, and a repeated
       PO PDF would parse twice into duplicate rows. Key on name+size. */
    try { m.getAttachments().forEach(function(a) {
      var k = a.getName() + '|' + a.getSize();
      if (seen[k]) return;
      seen[k] = true; atts.push(a);
    }); } catch (e) {}
    try { froms.push(m.getFrom() || ''); } catch (e) {}
    try { subjs.push(m.getSubject() || ''); } catch (e) {}
    try { bodies.push(m.getPlainBody() || ''); } catch (e) {}
  });
  var first = ms[0];
  return {
    getId: function() { return first.getId(); },
    getDate: function() { return first.getDate(); },
    getFrom: function() { return froms.join(' '); },
    getSubject: function() { return subjs.join(' | '); },
    getPlainBody: function() { return bodies.join('\n'); },
    getAttachments: function() { return atts; }
  };
}

function POSCAN() {
  Logger.log('=== PO SCAN ===');
  var threads = POGETTHREADS();
  Logger.log('Unprocessed: ' + threads.length);
  threads.forEach(function(t) {
    var msg = POALLMSG(t);
    Logger.log('Thread: '+t.getId()+' | '+msg.getDate().toISOString().slice(0,10)+
      ' | From: '+msg.getFrom()+' | '+msg.getSubject());
    Logger.log('Attachments: '+msg.getAttachments().length);
    msg.getAttachments().forEach(function(att) {
      var ct = att.getContentType(), fn = att.getName();
      Logger.log('  "'+fn+'" | '+ct);
      if (ct.indexOf('pdf')===-1 && fn.toLowerCase().indexOf('.pdf')===-1) {
        Logger.log('  → not PDF, skip'); return;
      }
      try {
        var text   = POREADPDF(att.copyBlob());
        var sender = msg.getFrom();
        var client = PODETECTCLIENT(text, sender);
        var po     = POEXTRACTPO(text);
        var items  = POPARSEITEMSLOCAL(text);
        Logger.log('  → Client: '+client+' | PO: '+po+' | Items: '+items.length);
        Logger.log('  → Sample (1500 chars):');
        Logger.log(text.slice(0,1500).replace(/\n/g,'|'));
      } catch(e) { Logger.log('  → ERROR: '+e); }
    });
  });
  Logger.log('=== Done ===');
}

function POIMPORT() {
  Logger.log('=== PO IMPORT ===');
  var results = POIMPORT_RETURN();
  Logger.log('Added: '+results.length);
  results.forEach(function(r){
    Logger.log('✅ '+r.jobId+' | '+r.client+' | '+r.desc+' | ₪'+r.price+' | '+r.poNumber);
  });
  Logger.log('=== Done ===');
}

function PORESETLABEL() {
  var label = GmailApp.getUserLabelByName(PO_LABEL_NAME);
  if (!label) { Logger.log('Label "'+PO_LABEL_NAME+'" does not exist'); return {ok:true,removed:0}; }
  var threads = GmailApp.search('label:'+PO_LABEL_NAME, 0, 100);
  threads.forEach(function(t){ t.removeLabel(label); });
  Logger.log('Removed label from '+threads.length+' threads');
  return { ok:true, removed:threads.length };
}

// ── Called by doGet runPOImport action ─────────────────────────────
function POIMPORT_RETURN() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var label = GmailApp.getUserLabelByName(PO_LABEL_NAME) || GmailApp.createLabel(PO_LABEL_NAME);
  var done  = {}, results = [];

  POGETTHREADS().forEach(function(thread) {
    thread.getMessages().forEach(function(msg) {
      var sender = msg.getFrom();
      msg.getAttachments().forEach(function(att) {
        var ct = att.getContentType(), fn = att.getName();
        if (ct.indexOf('pdf')===-1 && fn.toLowerCase().indexOf('.pdf')===-1) return;
        var _subj=(msg.getSubject()||''); var _meta=fn+' '+_subj+' '+sender;
        var _isPO=/P(?:OG|OR)\d+/i.test(fn)||/הדפסת/.test(fn)||/פל ?ים|פל-ים|t-p-y/i.test(_meta);
        if(!_isPO){try{_isPO=/פל ?ים|פל-ים|t-p-y/i.test(msg.getPlainBody().slice(0,600));}catch(_e){}}
        if(!_isPO) return;
        try {
          var text   = POREADPDF(att.copyBlob());
          var sName  = PODETECTCLIENT(text, sender);
          var po     = POEXTRACTPO(text);
          if (!po) { Logger.log('❌ No PO# in '+fn+'\n'+text.slice(0,300)); return; }
          if (done[po]) { Logger.log('⚠️ '+po+' duplicate'); return; }
          var sheet = ss.getSheetByName(sName);
          if (!sheet) { Logger.log('❌ Sheet "'+sName+'" not found'); return; }
          var rows = sheet.getDataRange().getValues();
          var cols = findColumns(rows);
          if (cols.po !== -1) {
            for (var rx=cols.headerRow+1; rx<rows.length; rx++) {
              if (String(rows[rx][cols.po]||'').trim()===po) {
                Logger.log('⚠️ '+po+' already in '+sName); return;
              }
            }
          }
          done[po] = true;
          var items = POPARSEITEMSLOCAL(text);
          if (!items.length) { Logger.log('❌ No items in '+fn+'\n'+text.slice(0,400)); return; }
          items.forEach(function(item) {
            var id = POADDROW(sheet, sName, item.description, item.price, po);
            if (id) results.push({jobId:id, client:sName, desc:item.description,
              price:item.price, poNumber:po});
          });
        } catch(e) { Logger.log('❌ '+fn+': '+e); }
      });
    });
    thread.addLabel(label);
  });
  return results;
}

// ── Called by doGet scanPOEmails action ────────────────────────────
function POSCAN_RETURN() {
  var found = [], threadIds = [], seenPO = {};
  var threads = POGETTHREADS();
  var allG = GmailApp.search('subject:"הדפסת הזמנת רכש" has:attachment', 0, 50);
  var allP = GmailApp.search('from:yanivberg@icloud.com "t-p-y" has:attachment', 0, 50);
  threads.forEach(function(t) {
    threadIds.push(t.getId());
    var msg = POALLMSG(t);
    var sender = msg.getFrom();
    msg.getAttachments().forEach(function(att) {
      var ct=att.getContentType(), fn=att.getName();
      if (ct.indexOf('pdf')===-1 && fn.toLowerCase().indexOf('.pdf')===-1) return;
        var _subj=(msg.getSubject()||''); var _meta=fn+' '+_subj+' '+sender;
        var _isPO=/P(?:OG|OR)\d+/i.test(fn)||/הדפסת/.test(fn)||/פל ?ים|פל-ים|t-p-y/i.test(_meta);
        if(!_isPO){try{_isPO=/פל ?ים|פל-ים|t-p-y/i.test(msg.getPlainBody().slice(0,600));}catch(_e){}}
        if(!_isPO) return;
      try {
        var text   = POREADPDF(att.copyBlob());
        var client = PODETECTCLIENT(text, sender);
        var po     = POEXTRACTPO(text);
        if (!po || seenPO[po]) return;
        seenPO[po] = true;
        var items  = POPARSEITEMSLOCAL(text);
        // One entry per line item — poNumber/desc/price match modal expectations
        items.forEach(function(item) {
          found.push({ poNumber:po, client:client,
            desc:item.description, qty:(item.qty||1), price:item.price, total:(item.total||((item.qty||1)*item.price)) });
        });
        if (!items.length) found.push({ poNumber:po, client:client, desc:'—', price:0 });
      } catch(e) { found.push({ poNumber:'?', client:'?', desc:String(e), price:0 }); }
    });
  });
  return { found:found, threadIds:threadIds,
    unprocessed:threads.length, total:allG.length+allP.length };
}

// ── Get all unprocessed PO threads (GOLMAT/ROLLMAT + PAL-YAM) ─────
function POGETTHREADS() {
  var lname = PO_LABEL_NAME;
  // GOLMAT + ROLLMAT: direct from purchasing1@golmat.co.il
  var golmat = GmailApp.search('has:attachment -label:'+lname+' filename:הדפסת', 0, 30);
  // PAL-YAM: Shira emails yanivberg@icloud.com → Yaniv forwards to Gmail
  var palYam = GmailApp.search('has:attachment -label:'+lname+' "הזמנת רכש" ("פל ים" OR "פל-ים" OR "t-p-y")', 0, 30);
  var _s={},_o=[]; golmat.concat(palYam).forEach(function(_t){var _i=_t.getId(); if(!_s[_i]){_s[_i]=1;_o.push(_t);}}); return _o;
}

// ── Detect client from PDF text + sender email ─────────────────────
function PODETECTCLIENT(text, senderEmail) {
  // PAL-YAM: detected by PDF content (emails are forwarded so sender is always yanivberg@icloud.com)
  if (/פל ים/i.test(text))     return 'PAL-YAM';
  if (/ט\.פ\.י/i.test(text))   return 'PAL-YAM';
  if (/t-p-y/i.test(text))     return 'PAL-YAM';
  if (/513327064/.test(text))  return 'PAL-YAM';  // Pal Yam tax ID
  // GOLMAT vs ROLLMAT: PDF content
  if (/רולמט/i.test(text))  return 'ROLLMAT';
  if (/גולמט/i.test(text))  return 'GOLMAT';
  if (/POR\d+/i.test(text)) return 'ROLLMAT';
  if (/POG\d+/i.test(text)) return 'GOLMAT';
  return 'GOLMAT';
}

// ── Extract PO number ──────────────────────────────────────────────
function POEXTRACTPO(text) {
  // GOLMAT/ROLLMAT PO header reads "הזמנת רכש מספר 2601776POG" (digits then POG/POR).
  // Normalize to letters-first "POG2601776" (filename/sheet convention).
  var digits=null, letters=null, m;
  m = text.match(/הזמנת רכש מספר\s*([0-9]+)\s*(POG|POR)/i);
  if (m) { digits=m[1]; letters=m[2]; }
  if (!digits) { m = text.match(/(POG|POR)\s*0*([0-9]+)/i); if (m){ letters=m[1]; digits=m[2]; } }
  if (!digits) { m = text.match(/([0-9]+)\s*(POG|POR)/i); if (m){ digits=m[1]; letters=m[2]; } }
  if (digits) return letters.toUpperCase() + digits;
  var pm = text.match(/הזמנת רכש מספר\s*([0-9]{4,})/);
  if (pm) return pm[1];
  return '';
}

function POREADPDF(blob) {
  var token    = ScriptApp.getOAuthToken();
  var boundary = 'POBND_' + Date.now();
  var meta     = '{"name":"tmp_po_'+Date.now()+'","mimeType":"application/vnd.google-apps.document"}';
  var p1 = Utilities.newBlob(
    '--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+
    meta+'\r\n--'+boundary+'\r\nContent-Type: application/pdf\r\n\r\n').getBytes();
  var p2 = Utilities.newBlob('\r\n--'+boundary+'--').getBytes();
  var body = p1.concat(blob.getBytes()).concat(p2);

  var up = UrlFetchApp.fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    { method:'POST',
      headers:{'Authorization':'Bearer '+token,
               'Content-Type':'multipart/related; boundary='+boundary},
      payload:body, muteHttpExceptions:true });

  if (up.getResponseCode()!==200)
    throw new Error('Upload '+up.getResponseCode()+': '+up.getContentText().slice(0,150));
  var fid = JSON.parse(up.getContentText()).id;
  if (!fid) throw new Error('No fileId: '+up.getContentText().slice(0,100));

  var text='';
  try {
    text = UrlFetchApp.fetch(
      'https://docs.google.com/feeds/download/documents/export/Export?id='+fid+'&exportFormat=txt',
      {headers:{Authorization:'Bearer '+token},muteHttpExceptions:true}
    ).getContentText('UTF-8');
  } finally {
    try { UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/'+fid,
      {method:'DELETE',headers:{Authorization:'Bearer '+token},muteHttpExceptions:true}); }
    catch(e){}
  }
  return text;
}

// ── Parse line items ───────────────────────────────────────────────
function POPARSEITEMSLOCAL(text) {
  // Current GOLMAT/ROLLMAT line format (LTR after PDF->text extraction):
  //   <row> <SKU> <description...> <qty> יח' <unitPrice> ILS <lineTotal>
  // e.g. 1 4753EX עבודות חשמל לפי פירוט 1.000 יח' 4,200.000 ILS 4,200.00
  // (PO PDFs dropped the old date column, which broke the previous regex.)
  var items = [], seen = {};
  var re = /\d+\s+[A-Za-z0-9]{3,}\s+(.+?)\s+([\d,]+\.\d+)\s+יח'\s+([\d,]+\.\d+)\s+(?:ILS|ש["\u05F4]?ח)\s+([\d,]+\.\d{2})/g;
  var mm;
  while ((mm = re.exec(text)) !== null) {
    var desc = mm[1].replace(/\s{2,}/g, ' ').trim();
    var qty = parseFloat(String(mm[2]).replace(/,/g, '')) || 1;
    var price = parseFloat(String(mm[3]).replace(/,/g, ''));
    var total = parseFloat(String(mm[4]).replace(/,/g, '')) || (qty*price);
    if (!desc || desc.length < 2 || !(price > 0)) continue;
    if (/מחיר כולל|מע"מ|סה"כ|תנאי תשלום|תאור מוצר/.test(desc)) continue;
    var key = desc + '|' + price;
    if (seen[key]) continue;
    seen[key] = true;
    items.push({ description: desc, qty: qty, price: price, total: total });
  }
  return items;
}

function POADDROW(sheet, clientName, description, price, poNumber) {
  var data = sheet.getDataRange().getValues();
  var cols = findColumns(data);
  if (cols.headerRow===-1) return null;
  var targetRow=-1;
  for (var r=cols.headerRow+1; r<data.length; r++) {
    var ri=String(data[r][cols.jobId]||'').trim();
    var rd=cols.desc!==-1?String(data[r][cols.desc]||'').trim():'x';
    var rs=cols.dateStart!==-1?String(data[r][cols.dateStart]||'').trim():'';
    var rp=cols.po!==-1?String(data[r][cols.po]||'').trim():'';
    if (ri&&!rd&&!rs&&!rp){targetRow=r;break;}
  }
  var newId;
  if (targetRow!==-1) {
    newId=String(data[targetRow][cols.jobId]).trim(); var w=targetRow+1;
    if(cols.desc!==-1)   sheet.getRange(w,cols.desc+1).setValue(description);
    if(cols.price!==-1)  sheet.getRange(w,cols.price+1).setValue(price);
    if(cols.qty!==-1)    sheet.getRange(w,cols.qty+1).setValue(1);
    if(cols.status!==-1) sheet.getRange(w,cols.status+1).setValue('ממתין להצעה');
    if(cols.po!==-1)     sheet.getRange(w,cols.po+1).setValue(poNumber);
  } else {
    var prefix='PY';
    for(var r2=cols.headerRow+1;r2<data.length;r2++){
      var eid=String(data[r2][cols.jobId]||'').trim();
      if(eid){prefix=eid.replace(/[0-9]/g,'');break;}
    }
    var maxNum=0;
    for(var r3=cols.headerRow+1;r3<data.length;r3++){
      var mx=String(data[r3][cols.jobId]||'').match(/\d+/);
      if(mx) maxNum=Math.max(maxNum,parseInt(mx[0]));
    }
    newId=prefix+String(maxNum+1).padStart(4,'0');
    var lastRow=cols.headerRow;
    for(var r4=cols.headerRow+1;r4<data.length;r4++)
      if(String(data[r4][cols.jobId]||'').trim()) lastRow=r4;
    var nr=lastRow+2;
    if(lastRow>cols.headerRow)
      sheet.getRange(lastRow+1,1,1,sheet.getLastColumn()).copyTo(
        sheet.getRange(nr,1,1,sheet.getLastColumn()),
        SpreadsheetApp.CopyPasteType.PASTE_FORMAT,false);
    var mc=0;
    [cols.jobId,cols.desc,cols.price,cols.qty,cols.status,cols.po].forEach(function(c){if(c>mc)mc=c;});
    var row=[]; for(var i=0;i<=mc;i++) row.push('');
    row[cols.jobId]=newId;
    if(cols.desc!==-1)   row[cols.desc]=description;
    if(cols.price!==-1)  row[cols.price]=price;
    if(cols.qty!==-1)    row[cols.qty]=1;
    if(cols.status!==-1) row[cols.status]='ממתין להצעה';
    if(cols.po!==-1)     row[cols.po]=poNumber;
    sheet.getRange(nr,1,1,row.length).setValues([row]);
  }
  Logger.log('✅ '+newId+' | '+clientName+' | '+description+' | ₪'+price+' | '+poNumber);
  return newId;
}