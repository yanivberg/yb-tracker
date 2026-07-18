// Apps Script — v205
// v205: expenses carry a "billed on" stamp — Expenses col J (index 9) gets a yyyy-MM-dd date whenever
//       createExpenseRow writes or updates a job's rollup line; getExpenses returns it as invoicedDoc so
//       the daily list can grey out + tick billed rows. INFORMATIONAL ONLY — the double-billing guard is
//       still v204's _syncExpenseRollup set-to-total, NOT this stamp.
// v204: expense rollup integrity — _syncExpenseRollup (top-level) is the single source of truth for the
//       'הוצאות <title>' client-sheet line. deleteExpense now syncs it (was: never updated → clients billed for
//       deleted expenses). createExpenseRow is now idempotent (was: appended a duplicate line every run).
//       Rollup rows carry a SRC:<jobId> back-ref in the notes column so the line is findable by source job.
//       repairExpenseRollups(dryRun) backfills SRC + collapses legacy duplicates (dry-run by default).
// v203: emailQuote + updateQuote now email the CLEANED quote PDF via Gmail (worker getDocPdf → GmailApp), NOT Caspit's EmailDocument API — that API 500s on every call (silent mailSent:false since forever). New shared helper emailQuotePdfViaGmail(docId, docNum, to): 2s pause so Caspit regenerates the PDF after the line-Details cleanup PUT, fetch via worker getDocPdf (one retry), attach & send. Reuses the proven monthly-bundle pattern. Quotes only (trxTypeId 16). Pairs with HTML v923 (drops SendByEmail at create; calls emailQuote after the cleanup PUT resolves).
// v202: getCaspitToken cache reduced 25min→8min (Caspit tokens live only 10min — stale cache caused 401/500 on AS-direct calls like EmailDocument); emailQuote now clears the cached token and retries once on any 4xx/5xx
// v201: new action emailQuote — emails a quote PDF via Caspit EmailDocument, invoked by HTML v921 after the line-Details cleanup PUT (fixes: emailed PDF was generated at create time, before cleanup, so it still showed the doubled description)
// v195: FIX sendMonthlyBundle client filter — was exact-match (===) so a client whose Caspit CustomerBusinessName differs by case/space/suffix (e.g. GOLMAT) matched nothing. Now normalizes (trim/lowercase/strip quotes) + bidirectional contains; if still empty, returns the customer names actually found that month for diagnosis
// v194: added getAIPriceRows action — prices each New-Quotation line item separately (one Gemini call, returns per-row {min,max,reasoning}); existing getAIPriceSuggestion (whole-project box) untouched (HTML v810)
// v193: sendMonthlyBundle accepts optional client param — filters documents by CustomerBusinessName and labels the email subject with the client (HTML v809)
// v192: added getClientJobs (list all rows for a client), updateJobFull (edit every editable field; never touches computed columns), deleteJob (delete row) — powers Manage Jobs screen (HTML v806)
// v191: added setProgress action (writes "אחוז התקדמות" column, auto-creates it if missing) + getJobDetails now returns progress — powers persistent progress meter (HTML v803)
// v190: getOpenTasksForWeekly now returns hours (הערכת שעות / estimate) per task — powers Weekly Planning estimated-hours display (HTML v801)
// Google Sheets backend for י.ב אחזקות time tracker
// Deploy as Web App → Anyone → New deployment each update
// v47: saveWorkLog + searchWorkLog
// v48: dateStart added to getJobs, getPendingQuote, getCompletedJobs, getInvoices
// v188: sendMonthlyBundle now sends each document as its own separate PDF (real Caspit PDF via getDocPdf) attached in one email, instead of one consolidated list PDF
// v189: monthly bundle surfaces per-doc PDF failure reason; pairs with worker v19 getDocPdf id-resolution fix
// v189: monthly bundle PDF fetch now chunked (4 at a time, paced) + one retry pass for failures, to avoid Caspit rate-limiting that dropped some invoice PDFs
// v51: getInvoiceReadyJobs, Caspit proxy actions merged in
// v52: getCaspitToken auto-refresh, getCaspitTokenDirect, doPost
// v53: XML contacts parser, initCaspitOpenToken via URL param
// v54: Gemini hardened getCaspitToken with 8.5min cache
// v55: income + hoursActual + grossProfit added to getJobs response
// v80: createClient — case-insensitive template lookup + explicit header row copy
// v81: createClient — programmatic headers
// v82: diagnose action
// v83: fix header position
// v84: addJob + addJobsBulk
// v85: addJobsBulk
// v86: addJob — iq param
// v87: getProfitByCategory
// v88: getAIAnalysis
// v89: model gemini-2.5-flash
// v90: gemini-2.5-flash
// v91: getDeepJobData + getAIDeepAnalysis
// v92: equal sampling across all clients
// v93: dates
// v95: structured JSON sections
// v96: getAIBriefing
// v97: getAISessionTips
// v98: per-project tools
// v99: categoryTools
// v100: strip markdown
// v101: saveProjectSurvey
// v102: savePreProjectSurvey
// v103: getSurveyData + AI reads surveys
// v104: analyzeJobForPreSurvey
// v105: timeout fix
// v106: getProjectTips
// v107: pre-survey +4 fields
// v108: weather
// v109: done tips
// v110: agreement + height docs
// v111: adminLogin
// v112: full day context
// v113: remember me option (30/90 days) full day context — time, conditions, done tips, pre-surveys in AI adminLogin — email+password auth via Script Properties agreement + height docs in AI tips done tips exclusion from AI weather integration — Open-Meteo for outdoor projects pre-survey +4 fields (height, workers, location, power) getProjectTips — per-project AI tips remove self-call timeout fix analyzeJobForPreSurvey — AI breaks description into steps getSurveyData + AI reads pre/post surveys savePreProjectSurvey → Pre-Project Surveys sheet saveProjectSurvey → Job Surveys sheet strip markdown backticks from Gemini JSON responses categoryTools memory passed to Gemini per-project summary + Hebrew tools + toolbox cross-check getAISessionTips — real-time session analysis with notes+history getAIBriefing — daily project tips + tool list structured JSON sections — expandable cards add dates to deep analysis + time-based progress analysis getAIDeepAnalysis — equal sampling across all clients getDeepJobData + getAIDeepAnalysis — full job descriptions+notes to Gemini model → gemini-2.5-flash Gemini model → gemini-2.5-flash getAIAnalysis — Gemini via Script Properties getProfitByCategory — AI advisor data source addJob — iq param for Y.B. quotation number (invoiceQuote column) — fix numCols=0 crash on repaired sheets (empty row 1) — date logic based on status, not noDate param — row 2 col B (matching GOLMAT structure) — shows row 1 state of all sheets (never rely on template row 1); repairClientHeaders action


var SPREADSHEET_ID = '1Wn2-Yzx08H2NKmJLsMs2xrYIBPLzJJqvRo-Su8jWlgA';




// ── Weather helper ────────────────────────────────────
function fetchCurrentWeather(lat, lon) {
  try {
    lat = lat || 32.3833;  // Hadar Am, Israel
    lon = lon || 34.9167;  // הדר עם
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat +
      '&longitude=' + lon +
      '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&wind_speed_unit=kmh&temperature_unit=celsius';
    var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var data = JSON.parse(resp.getContentText());
    var c = data.current || {};
    var code = c.weather_code || 0;
    var condition = code === 0 ? 'Clear' : code <= 3 ? 'Partly cloudy' :
      code <= 48 ? 'Foggy' : code <= 67 ? 'Rain' : code <= 77 ? 'Snow' :
      code <= 82 ? 'Heavy rain' : code <= 99 ? 'Thunderstorm' : 'Unknown';
    return {
      temp: Math.round(c.temperature_2m||0) + 'C',
      condition: condition,
      summary: condition + ', ' + Math.round(c.temperature_2m||0) + 'C, wind ' + Math.round(c.wind_speed_10m||0) + 'km/h, humidity ' + (c.relative_humidity_2m||0) + '%'
    };
  } catch(e2) { return null; }
}
// ─────────────────────────────────────────────────────
function copyProfitFormulasDown(sheet, cols, newRowNum) {
  // Copies the formula cells (income / grossProfit / profitPerHour) from the row
  // directly above into the new row. copyTo keeps relative references, so
  // Q27-U27 becomes Q28-U28 automatically. Best-effort: skips if no row above.
  try {
    if (newRowNum <= (cols.headerRow + 2)) return;
    [cols.income, cols.grossProfit, cols.profitPerHour].forEach(function(c) {
      if (typeof c !== 'number' || c === -1) return;
      var src = sheet.getRange(newRowNum - 1, c + 1);
      if (!src.getFormula()) return; // row above has no formula — leave empty
      src.copyTo(sheet.getRange(newRowNum, c + 1), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
    });
  } catch (eCF) { Logger.log('copyProfitFormulasDown: ' + eCF); }
}


function isSystemSheet(name) {
  var lower = name.toLowerCase();
  return ['sheet 1','projects list','בקשות הצעה','golmat הצעות','clients',
          'מיקום נוכחי','יומן','לוג עבודה','caspit documents','caspit log',
          'new tamplate','new template','lessons learned','weekly plan','expenses'].indexOf(lower) !== -1;
}


function doGet(e) {
  if (!e || !e.parameter) return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  var action = e.parameter.action;
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);


  if (action === 'testTxLog') {
    var workerBase = 'https://yb-caspit-proxy.sunroof-dictate-39.workers.dev';
    var results = [];
    // Test with 3 date formats for type 1 (חשבונית)
    var formats = [
      {label:'ISO', from:'2026-01-01', to:'2026-05-24'},
      {label:'US',  from:'01/01/2026', to:'05/24/2026'},
      {label:'IL',  from:'01/01/2026', to:'24/05/2026'}
    ];
    formats.forEach(function(fmt) {
      try {
        var r = UrlFetchApp.fetch(workerBase + '/?action=listDocsByDate&trxTypeId=1&page=0&datStart=' + encodeURIComponent(fmt.from) + '&datEnd=' + encodeURIComponent(fmt.to), {muteHttpExceptions:true, deadline:15});
        results.push({format:fmt.label, code:r.getResponseCode(), body:r.getContentText().slice(0,200)});
      } catch(e2) { results.push({format:fmt.label, error:e2.message}); }
    });
    return ContentService.createTextOutput(JSON.stringify(results)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'testCaspitContacts') {
    var tcResp = UrlFetchApp.fetch('https://yb-caspit-proxy.sunroof-dictate-39.workers.dev/?action=getContacts', { muteHttpExceptions: true });
    return ContentService.createTextOutput(JSON.stringify({
      code: tcResp.getResponseCode(), raw: tcResp.getContentText().slice(0, 500)
    })).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'testCaspitAuth') {
    var props2 = PropertiesService.getScriptProperties();
    var pwd2  = props2.getProperty('CASPIT_PWD') || '';
    var results2 = [];
    // Test minimal auth — docs say only UserName+Password required
    var attempts2 = [
      {u:'yaniv berg',   osek:''},
      {u:'yaniv berg',   osek:'060139755'},
      {u:'yanivberg',    osek:''},
      {u:'yaniv',        osek:''},
      {u:'Yaniv Berg',   osek:''}
    ];
    attempts2.forEach(function(a) {
      try {
        var body2 = {UserName:a.u, Password:pwd2};
        if (a.osek) body2.OsekMorsheNumber = a.osek;
        var r2 = UrlFetchApp.fetch('https://app.caspit.biz/api/v1/Token', {
          method:'post', contentType:'application/json',
          payload:JSON.stringify(body2), muteHttpExceptions:true
        });
        results2.push({user:a.u, osek:a.osek||'none', code:r2.getResponseCode(), resp:r2.getContentText().slice(0,80)});
      } catch(e2) { results2.push({user:a.u, error:e2.message}); }
    });
    return ContentService.createTextOutput(JSON.stringify({hasPwd:!!pwd2, results:results2})).setMimeType(ContentService.MimeType.JSON);
  }


  // ── LESSONS LEARNED — at top to ensure always reachable ─────────────────
  if (action === 'debugLessons') {
    return ContentService.createTextOutput(JSON.stringify({ok:true, action:action, keys:Object.keys(e.parameter)})).setMimeType(ContentService.MimeType.JSON);
  }
  if (action === 'saveLessonLearned') {
    try {
      var lessonSheet = ss.getSheetByName('Lessons Learned');
      if (!lessonSheet) {
        lessonSheet = ss.insertSheet('Lessons Learned');
        lessonSheet.appendRow(['Timestamp','JobId','Client','Category','Description','ActualHrs','EstHrs','HrsAccuracy%','Outcome','Materials','Steps','SuccessKeys','Tools','Notes','Rating','ProgressSnapshots','PaceAccuracy%']);
        lessonSheet.getRange(1,1,1,17).setFontWeight('bold');
      } else {
        // Backfill new columns on existing sheet if missing
        var hdr = lessonSheet.getRange(1,1,1,Math.max(lessonSheet.getLastColumn(),1)).getValues()[0];
        if (hdr.indexOf('ProgressSnapshots') === -1) {
          lessonSheet.getRange(1, hdr.length+1).setValue('ProgressSnapshots').setFontWeight('bold');
          lessonSheet.getRange(1, hdr.length+2).setValue('PaceAccuracy%').setFontWeight('bold');
        }
      }
      var p = e.parameter;
      var actHrs = parseFloat(p.actualHrs||0), estHrs = parseFloat(p.estHrs||0);
      lessonSheet.appendRow([new Date(), p.jobId||'', p.client||'', p.category||'', (p.desc||'').slice(0,100), actHrs, estHrs, estHrs>0?Math.round(actHrs/estHrs*100):'', p.outcome||'success', p.materials||'', p.steps||'', p.successKeys||'', p.tools||'', (p.notes||'').slice(0,500), '', (p.progressSnapshots||'').slice(0,500), p.paceAccuracy||'']);
      return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
    } catch(esl) { return ContentService.createTextOutput(JSON.stringify({ok:false,error:esl.message})).setMimeType(ContentService.MimeType.JSON); }
  }
  if (action === 'getLessons') {
    try {
      var cat = (e.parameter.cat||'').trim(), limit = parseInt(e.parameter.limit||'20',10);
      var lSheet = ss.getSheetByName('Lessons Learned');
      if (!lSheet) return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
      var lData = lSheet.getDataRange().getValues();
      if (lData.length < 2) return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
      var lessons = [];
      for (var li = lData.length-1; li >= 1 && lessons.length < limit; li--) {
        var row = lData[li];
        var rowCat = String(row[3]||'').trim();
        if (cat && rowCat !== cat) continue;
        lessons.push({
          timestamp: row[0] ? (row[0] instanceof Date ? Utilities.formatDate(row[0],'Asia/Jerusalem','dd/MM/yyyy') : String(row[0]).slice(0,10)) : '',
          jobId:String(row[1]||''), client:String(row[2]||''), category:rowCat, desc:String(row[4]||''),
          actualHrs:row[5]||0, estHrs:row[6]||0, accuracy:row[7]||'', outcome:String(row[8]||'success'),
          materials:String(row[9]||''), steps:String(row[10]||''), successKeys:String(row[11]||''),
          tools:String(row[12]||''), notes:String(row[13]||''), rating:row[14]||''
        });
      }
      return ContentService.createTextOutput(JSON.stringify(lessons)).setMimeType(ContentService.MimeType.JSON);
    } catch(egl) { return ContentService.createTextOutput(JSON.stringify({error:'getLessons: '+egl.message})).setMimeType(ContentService.MimeType.JSON); }
  }
  // ── END LESSONS LEARNED ────────────────────────────────────────────────


  // ── WEEKLY PLAN ────────────────────────────────────────────────────────
  if (action === 'getWeeklyPlan') {
    try {
      var wk = (e.parameter.weekKey||'').trim();
      var wpSh = ss.getSheetByName('Weekly Plan');
      if (!wpSh || !wk) return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
      var wpD = wpSh.getDataRange().getValues();
      var wpE = [];
      for (var wr=1;wr<wpD.length;wr++) {
        if (String(wpD[wr][0]).trim()===wk) wpE.push({dayIndex:parseInt(wpD[wr][1]||0),jobId:String(wpD[wr][2]||''),client:String(wpD[wr][3]||''),desc:String(wpD[wr][4]||''),status:String(wpD[wr][5]||'')});
      }
      return ContentService.createTextOutput(JSON.stringify(wpE)).setMimeType(ContentService.MimeType.JSON);
    } catch(ewp){return ContentService.createTextOutput(JSON.stringify({error:ewp.message})).setMimeType(ContentService.MimeType.JSON);}
  }
  if (action === 'saveWeeklyEntry') {
    try {
      var wpSh2 = ss.getSheetByName('Weekly Plan');
      if (!wpSh2){wpSh2=ss.insertSheet('Weekly Plan');wpSh2.appendRow(['WeekKey','DayIndex','JobId','Client','Description','Status']);wpSh2.getRange(1,1,1,6).setFontWeight('bold');}
      wpSh2.appendRow([e.parameter.weekKey||'',parseInt(e.parameter.dayIndex||0),e.parameter.jobId||'',e.parameter.client||'',(e.parameter.desc||'').slice(0,100),e.parameter.status||'']);
      return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
    } catch(ewp2){return ContentService.createTextOutput(JSON.stringify({ok:false,error:ewp2.message})).setMimeType(ContentService.MimeType.JSON);}
  }
  if (action === 'removeWeeklyEntry') {
    try {
      var wpSh3 = ss.getSheetByName('Weekly Plan');
      if (!wpSh3) return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
      var wpD3 = wpSh3.getDataRange().getValues();
      var wkR = (e.parameter.weekKey||'').trim(), wkDi = parseInt(e.parameter.dayIndex||0), wkJi = (e.parameter.jobId||'').trim();
      for (var wr3=wpD3.length-1;wr3>=1;wr3--){
        if (String(wpD3[wr3][0]).trim()===wkR && parseInt(wpD3[wr3][1])===wkDi && String(wpD3[wr3][2]).trim()===wkJi){wpSh3.deleteRow(wr3+1);break;}
      }
      return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
    } catch(ewp3){return ContentService.createTextOutput(JSON.stringify({ok:false,error:ewp3.message})).setMimeType(ContentService.MimeType.JSON);}
  }
  if (action === 'getOpenTasksForWeekly') {
    try {
      var openSt = ['ממתין לביצוע','בתהליך ביצוע'];
      var openTasks = [];
      ss.getSheets().forEach(function(sh){
        var nm = sh.getName(); if(isSystemSheet(nm)) return;
        var dat = sh.getDataRange().getValues(); var cols = findColumns(dat); if(cols.headerRow===-1) return;
        for(var rr=cols.headerRow+1;rr<dat.length;rr++){
          var jid=String(dat[rr][cols.jobId]||'').trim(); if(!jid) continue;
          var desc=cols.desc!==-1?String(dat[rr][cols.desc]||'').trim():'';
          var st=cols.status!==-1?String(dat[rr][cols.status]||'').trim():'';
          if(openSt.indexOf(st)===-1) continue;
          openTasks.push({jobId:jid,client:nm,desc:desc,status:st,hours:cols.hours!==-1?(parseFloat(dat[rr][cols.hours])||0):0});
        }
      });
      return ContentService.createTextOutput(JSON.stringify(openTasks)).setMimeType(ContentService.MimeType.JSON);
    } catch(ewp4){return ContentService.createTextOutput(JSON.stringify({error:ewp4.message})).setMimeType(ContentService.MimeType.JSON);}
  }
  
  if (action === 'getWeeklyPlanHistory') {
    try {
      var wpSh=ss.getSheetByName('Weekly Plan');
      if(!wpSh) return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
      var wpD=wpSh.getDataRange().getValues(), all=[];
      for(var r=1;r<wpD.length;r++){
        var wk=String(wpD[r][0]||'').trim(); if(!wk) continue;
        all.push({weekKey:wk,dayIndex:parseInt(wpD[r][1]||0),jobId:String(wpD[r][2]||''),client:String(wpD[r][3]||''),desc:String(wpD[r][4]||''),status:String(wpD[r][5]||'')});
      }
      return ContentService.createTextOutput(JSON.stringify(all)).setMimeType(ContentService.MimeType.JSON);
    } catch(ewph){return ContentService.createTextOutput(JSON.stringify({error:ewph.message})).setMimeType(ContentService.MimeType.JSON);}
  }
  // ── END WEEKLY PLAN ────────────────────────────────────────────────────


  // ── Expenses ───────────────────────────────────────────────────────────────
  if (action === 'addExpense') {
    try {
      var expSh = ss.getSheetByName('Expenses') || (function(){
        var s = ss.insertSheet('Expenses');
        s.appendRow(['JobId','Client','Date','Category','Description','Amount','CreatedAt']);
        s.getRange(1,1,1,7).setFontWeight('bold').setBackground('#e8f0fe');
        return s;
      })();
      var expDate = e.parameter.date || new Date().toISOString().slice(0,10);
      expSh.appendRow([
        e.parameter.jobId    || '',
        e.parameter.client   || '',
        expDate,
        e.parameter.category || 'חומרים',
        e.parameter.desc     || '',
        parseFloat(e.parameter.amount || 0),
        new Date().toISOString()
      ]);
      // Update עלויות + רווח גולמי — only if expenses are on me (not on client)
      if ((e.parameter.expensesOn||'me') !== 'client') {
        _updateJobCosts(ss, e.parameter.jobId||'', e.parameter.client||'');
      }
      return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
    } catch(ee){ return ContentService.createTextOutput(JSON.stringify({ok:false,error:ee.message})).setMimeType(ContentService.MimeType.JSON); }
  }


  if (action === 'recalcJobCosts') {
    try {
      var rjJobId  = e.parameter.jobId || '';
      var rjClient = e.parameter.client || '';
      var rjOn     = e.parameter.expensesOn || 'me';
      if (!rjJobId || !rjClient) return ContentService.createTextOutput('missing params').setMimeType(ContentService.MimeType.TEXT);
      if (rjOn === 'client') {
        // Clear costs — expenses billed separately, full profit retained
        var cs = ss.getSheetByName(rjClient);
        if (cs) {
          var cdat = cs.getDataRange().getValues();
          var ccols = findColumns(cdat);
          if (ccols.headerRow !== -1 && ccols.costs !== -1) {
            for (var cr = ccols.headerRow + 1; cr < cdat.length; cr++) {
              if (String(cdat[cr][ccols.jobId] || '').trim() !== rjJobId) continue;
              cs.getRange(cr + 1, ccols.costs + 1).setValue('');
              if (ccols.grossProfit !== -1 && ccols.income !== -1) {
                var inc = parseFloat(cdat[cr][ccols.income] || 0);
                cs.getRange(cr + 1, ccols.grossProfit + 1).setValue(inc);
              }
              break;
            }
          }
        }
      } else {
        // 'me' — count expenses toward costs/gross profit
        _updateJobCosts(ss, rjJobId, rjClient);
      }
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    } catch(erc) { return ContentService.createTextOutput('err:' + erc.message).setMimeType(ContentService.MimeType.TEXT); }
  }


 if (action === 'getExpenses') {
    try {
      var expSh2 = ss.getSheetByName('Expenses');
      if (!expSh2) return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
      var expD = expSh2.getDataRange().getValues();
      var jobId2 = (e.parameter.jobId||'').trim();
      var clientFilter2 = (e.parameter.client||'').trim();
      var allForClient = e.parameter.allForClient === '1';
      var exps = [];
      for (var er=1; er<expD.length; er++) {
        if (allForClient) {
          if (clientFilter2 && String(expD[er][1]).trim() !== clientFilter2) continue;
        } else {
          if (String(expD[er][0]).trim() !== jobId2) continue;
        }
        exps.push({
          row:      er+1,
          jobId:    String(expD[er][0]),
          client:   String(expD[er][1]),
          date:     String(expD[er][2]),
          category: String(expD[er][3]),
          desc:     String(expD[er][4]),
          amount:   parseFloat(expD[er][5]||0),
          createdAt:String(expD[er][6]),
          link:     String(expD[er][7] || ''),
          invoicedDoc: String(expD[er][9] || '')   // v205: col J — '' = not yet billed
        });
      }
      // When fetching all for a client, enrich each row with PO number from the client sheet
      if (allForClient && clientFilter2 && exps.length) {
        try {
          var clientSh2 = ss.getSheetByName(clientFilter2);
          if (clientSh2) {
            var cDat2 = clientSh2.getDataRange().getValues();
            var cCols2 = findColumns(cDat2);
            // Build jobId → {po, desc} lookup
            var jobMap = {};
            if (cCols2.headerRow !== -1) {
              for (var cr2 = cCols2.headerRow+1; cr2 < cDat2.length; cr2++) {
                var jid2 = String(cDat2[cr2][cCols2.jobId]||'').trim();
                if (!jid2) continue;
                jobMap[jid2] = {
                  po:   cCols2.po   !== -1 ? String(cDat2[cr2][cCols2.po]  ||'') : '',
                  desc: cCols2.desc !== -1 ? String(cDat2[cr2][cCols2.desc]||'') : ''
                };
              }
            }
            exps.forEach(function(ex) {
              var info = jobMap[ex.jobId] || {};
              ex.po       = info.po   || '';
              ex.jobDesc  = info.desc || '';
            });
          }
        } catch(ePO) { Logger.log('getExpenses PO lookup: ' + ePO); }
      }
      return ContentService.createTextOutput(JSON.stringify(exps)).setMimeType(ContentService.MimeType.JSON);
    } catch(ee2){ return ContentService.createTextOutput(JSON.stringify({error:ee2.message})).setMimeType(ContentService.MimeType.JSON); }
  }
 
  if (action === 'deleteExpense') {
    try {
      var expSh3 = ss.getSheetByName('Expenses');
      if (!expSh3) return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
      var row3 = parseInt(e.parameter.row||0);
      var jobId3 = '', client3 = '';
      if (row3 > 1) {
        var delRow = expSh3.getRange(row3, 1, 1, 2).getValues()[0];
        jobId3  = String(delRow[0]||'');
        client3 = String(delRow[1]||'');
        expSh3.deleteRow(row3);
      }
      if (jobId3) { _updateJobCosts(ss, jobId3, client3); _syncExpenseRollup(ss, jobId3, client3, ''); }  // v204: keep the client rollup line in sync
      return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
    } catch(ee3){ return ContentService.createTextOutput(JSON.stringify({ok:false,error:ee3.message})).setMimeType(ContentService.MimeType.JSON); }
  }
   if (action === 'updateExpenseReceipt') {
    try {
      var expSh = ss.getSheetByName('Expenses');
      if (!expSh) return ContentService.createTextOutput(JSON.stringify({ok:false,error:'No Expenses sheet'})).setMimeType(ContentService.MimeType.JSON);
      var row = parseInt(e.parameter.row||0);
      var receipt = e.parameter.receipt || '';
      if (row < 2) return ContentService.createTextOutput(JSON.stringify({ok:false,error:'bad row'})).setMimeType(ContentService.MimeType.JSON);
      // Ensure column 9 exists (index 8)
      expSh.getRange(row, 9).setValue(receipt);
      return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
    } catch(eUR){ return ContentService.createTextOutput(JSON.stringify({ok:false,error:eUR.message})).setMimeType(ContentService.MimeType.JSON); }
  }
 
  // ── End Expenses ───────────────────────────────────────────────────────────


  if (action === 'searchQuotes') {
    try {
      var wb2 = 'https://yb-caspit-proxy.sunroof-dictate-39.workers.dev';
      var num2 = e.parameter.number || ''; var qry2 = e.parameter.query || '';
      var u2 = wb2 + '/?action=searchQuotes&number=' + encodeURIComponent(num2) + '&query=' + encodeURIComponent(qry2);
      var r2 = UrlFetchApp.fetch(u2, {muteHttpExceptions:true, deadline:20});
      return ContentService.createTextOutput(r2.getContentText()).setMimeType(ContentService.MimeType.JSON);
    } catch(esq){return ContentService.createTextOutput(JSON.stringify({error:esq.message})).setMimeType(ContentService.MimeType.JSON);}
  }


  if (action === 'debugQuotes') {
    try {
      var wbDbg = 'https://yb-caspit-proxy.sunroof-dictate-39.workers.dev';
      var rDbg = UrlFetchApp.fetch(wbDbg + '/?action=debugQuotes', {muteHttpExceptions:true, deadline:20});
      return ContentService.createTextOutput(rDbg.getContentText()).setMimeType(ContentService.MimeType.JSON);
    } catch(edbg){return ContentService.createTextOutput(JSON.stringify({error:edbg.message})).setMimeType(ContentService.MimeType.JSON);}
  }


  if (action === 'getQuoteDetail') {
    try {
      var wb3 = 'https://yb-caspit-proxy.sunroof-dictate-39.workers.dev';
      var did3 = e.parameter.docId  || '';
      var num3 = e.parameter.number || '';
      var r3 = UrlFetchApp.fetch(wb3 + '/?action=getDocument&documentId=' + encodeURIComponent(did3) + '&number=' + encodeURIComponent(num3) + '&trxTypeId=16', {muteHttpExceptions:true, deadline:20});
      return ContentService.createTextOutput(r3.getContentText()).setMimeType(ContentService.MimeType.JSON);
    } catch(egq){return ContentService.createTextOutput(JSON.stringify({error:egq.message})).setMimeType(ContentService.MimeType.JSON);}
  }


  if (action === 'getInvoices') {
    var result = [];
    ss.getSheets().forEach(function(sheet) {
      var name = sheet.getName();
      if (isSystemSheet(name)) return;
      var data = sheet.getDataRange().getValues();
      var cols = findColumns(data);
      if (cols.headerRow === -1) return;
      for (var r = cols.headerRow + 1; r < data.length; r++) {
        var jobId  = String(data[r][cols.jobId]  || '').trim();
        if (!jobId || jobId === 'undefined') continue;
        var invoice = cols.invoice !== -1 ? String(data[r][cols.invoice] || '').trim() : '';
        if (invoice !== 'להוציא חש') continue;
        result.push({
          id:           jobId,
          client:       name,
          desc:         cols.desc         !== -1 ? String(data[r][cols.desc]         || '') : '',
          po:           cols.po           !== -1 ? String(data[r][cols.po]           || '') : '',
          notes:        cols.notes        !== -1 ? String(data[r][cols.notes]        || '') : '',
          income:       cols.income       !== -1 ? String(data[r][cols.income]       || '') : '',
          invoiceQuote: cols.invoiceQuote !== -1 ? String(data[r][cols.invoiceQuote] || '') : '',
          dateStart:    cols.dateStart    !== -1 ? String(data[r][cols.dateStart]    || '') : '',
          grossProfit:  cols.grossProfit  !== -1 ? String(data[r][cols.grossProfit]  || '') : ''
        });
      }
    });
    result.sort(function(a,b){ return a.client.localeCompare(b.client); });
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getCompletedJobs') {
    var result = [];
    ss.getSheets().forEach(function(sheet) {
      var name = sheet.getName();
      if (isSystemSheet(name)) return;
      var data = sheet.getDataRange().getValues();
      var cols = findColumns(data);
      if (cols.headerRow === -1) return;
      for (var r = cols.headerRow + 1; r < data.length; r++) {
        var jobId  = String(data[r][cols.jobId]  || '').trim();
        var status = String(data[r][cols.status] || '').trim();
        var desc   = String(data[r][cols.desc]   || '').trim();
        if (!jobId || jobId === 'undefined') continue;
        if (status !== 'בוצע') continue;
        result.push({
          id: jobId, desc: desc, client: name,
          dateStart:    cols.dateStart    !== -1 && data[r][cols.dateStart]    ? (data[r][cols.dateStart]    instanceof Date ? Utilities.formatDate(data[r][cols.dateStart],    'Asia/Jerusalem', 'dd/MM/yyyy') : String(data[r][cols.dateStart]))    : '',
          dateEnd:      cols.dateEnd      !== -1 && data[r][cols.dateEnd]      ? (data[r][cols.dateEnd]      instanceof Date ? Utilities.formatDate(data[r][cols.dateEnd],      'Asia/Jerusalem', 'dd/MM/yyyy') : String(data[r][cols.dateEnd]))      : '',
          hoursActual:  cols.hoursActual  !== -1 ? (parseFloat(data[r][cols.hoursActual])  || 0) : 0,
          grossProfit:  cols.grossProfit  !== -1 ? (parseFloat(data[r][cols.grossProfit])  || 0) : 0,
          invoiceQuote: cols.invoice      !== -1 ? String(data[r][cols.invoice] || '').trim() : ''
        });
      }
    });
    result.sort(function(a,b){ return a.client.localeCompare(b.client); });
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getFullJobInfo') {
    var jobId = e.parameter.jobId; var client = e.parameter.client;
    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('{}').setMimeType(ContentService.MimeType.JSON);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      if (String(data[r][cols.jobId] || '').trim() === jobId) {
        var result = {
          id:            jobId, client: client,
          desc:          cols.desc          !== -1 ? String(data[r][cols.desc]          || '') : '',
          status:        cols.status        !== -1 ? String(data[r][cols.status]        || '') : '',
          category:      cols.category      !== -1 ? String(data[r][cols.category]      || '') : '',
          price:         cols.price         !== -1 ? String(data[r][cols.price]         || '') : '',
          qty:           cols.qty           !== -1 ? String(data[r][cols.qty]           || '') : '',
          hours:         cols.hours         !== -1 ? String(data[r][cols.hours]         || '') : '',
          hoursActual:   cols.hoursActual   !== -1 ? String(data[r][cols.hoursActual]   || '') : '',
          po:            cols.po            !== -1 ? String(data[r][cols.po]            || '') : '',
          notes:         cols.notes         !== -1 ? String(data[r][cols.notes]         || '') : '',
          income:        cols.income        !== -1 ? String(data[r][cols.income]        || '') : '',
          invoiceQuote:  cols.invoiceQuote  !== -1 ? String(data[r][cols.invoiceQuote]  || '') : '',
          dateStart:     cols.dateStart     !== -1 ? String(data[r][cols.dateStart]     || '') : '',
          dateEnd:       cols.dateEnd       !== -1 ? String(data[r][cols.dateEnd]       || '') : '',
          costs:         cols.costs         !== -1 ? String(data[r][cols.costs]         || '') : '',
          grossProfit:   cols.grossProfit   !== -1 ? String(data[r][cols.grossProfit]   || '') : '',
          profitPerHour: cols.profitPerHour !== -1 ? String(data[r][cols.profitPerHour] || '') : ''
        };
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput('{}').setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getJobs') {
    var result = [];
    ss.getSheets().forEach(function(sheet) {
      try {
        var name = sheet.getName();
        if (isSystemSheet(name)) return;
        var data = sheet.getDataRange().getValues();
        var cols = findColumns(data);
        if (cols.headerRow === -1) return;
        for (var r = cols.headerRow + 1; r < data.length; r++) {
          var jobId  = String(data[r][cols.jobId]  || '').trim();
          var status = String(data[r][cols.status] || '').trim();
          var desc   = String(data[r][cols.desc]   || '').trim();
          var hours  = data[r][cols.hours] || 0;
          if (!jobId || jobId === 'undefined') continue;
          if (status !== 'בתהליך ביצוע' && status !== 'ממתין לביצוע') continue;
          result.push({
            id: jobId, desc: desc, client: name, hours: hours,
            hoursActual: cols.hoursActual !== -1 ? (parseFloat(data[r][cols.hoursActual]) || 0) : 0,
            grossProfit: cols.grossProfit !== -1 ? (parseFloat(data[r][cols.grossProfit]) || 0) : 0,
            income:      cols.income      !== -1 ? (parseFloat(data[r][cols.income])      || 0) : 0,
            dateStart: cols.dateStart !== -1 && data[r][cols.dateStart] ? (data[r][cols.dateStart] instanceof Date ? Utilities.formatDate(data[r][cols.dateStart], 'Asia/Jerusalem', 'dd/MM/yyyy') : String(data[r][cols.dateStart])) : ''
          });
        }
      } catch(eSheet) { console.error('getJobs sheet error: ' + sheet.getName() + ' — ' + eSheet.message); }
    });
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getPendingQuote') {
    var result = [];
    ss.getSheets().forEach(function(sheet) {
      var name = sheet.getName();
      if (isSystemSheet(name)) return;
      var data = sheet.getDataRange().getValues();
      var cols = findColumns(data);
      if (cols.headerRow === -1) return;
      for (var r = cols.headerRow + 1; r < data.length; r++) {
        var jobId  = String(data[r][cols.jobId]  || '').trim();
        var status = String(data[r][cols.status] || '').trim();
        var desc   = String(data[r][cols.desc]   || '').trim();
        if (!jobId || jobId === 'undefined') continue;
        if (status !== 'ממתין להצעה' && status !== 'ניתנה הצעה') continue;
       result.push({ id: jobId, desc: desc, client: name, status: status, dateStart: cols.dateStart !== -1 && data[r][cols.dateStart] ? (data[r][cols.dateStart] instanceof Date ? Utilities.formatDate(data[r][cols.dateStart], 'Asia/Jerusalem', 'dd/MM/yyyy') : String(data[r][cols.dateStart])) : '', notes: cols.notes !== -1 ? String(data[r][cols.notes] || '') : '', qty: cols.qty !== -1 ? String(data[r][cols.qty] || '') : '', price: cols.price !== -1 ? String(data[r][cols.price] || '') : '' });
      }
    });
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
if (action === 'getYoman') {
    var limit = parseInt(e.parameter.limit, 10) || 5;
    var sheet = ss.getSheetByName('יומן');
    if (!sheet) return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
    var data = sheet.getDataRange().getValues();
    var lastCol = sheet.getLastColumn();
    var lines = (data.length > 1 && lastCol >= 3) ? sheet.getRange(1, 3, data.length, 1).getFontLines() : [];
    var out = [];
    for (var r = data.length - 1; r >= 1 && out.length < limit; r--) {
      var dateRaw = data[r][0], timeRaw = data[r][1];
      var noteParts = [];
      for (var c = 2; c < data[r].length; c++) { var v = String(data[r][c] || '').trim(); if (v) noteParts.push(v); }
      var note = noteParts.join(' ');
      if (!note && !dateRaw) continue;
      var struck = (lines[r] && lines[r][0] === 'line-through');
      if (struck) continue;
      var dateStr = (dateRaw instanceof Date) ? Utilities.formatDate(dateRaw, 'Asia/Jerusalem', 'd.M.yyyy') : String(dateRaw || '').trim();
      var timeStr;
      if (timeRaw instanceof Date) timeStr = Utilities.formatDate(timeRaw, 'Asia/Jerusalem', 'HH:mm');
      else { timeStr = String(timeRaw || '').trim(); if (timeStr.indexOf(':') !== -1 && timeStr.length >= 5) timeStr = timeStr.slice(0, 5); }
      out.push({ row: r + 1, date: dateStr, time: timeStr, note: note });
    }
    return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
  }
  if (action === 'setYomanDone') {
    var row = parseInt(e.parameter.row, 10);
    var sheet = ss.getSheetByName('יומן');
    if (!sheet || !row || row < 2) return ContentService.createTextOutput('ERR: bad row').setMimeType(ContentService.MimeType.TEXT);
    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var doneCol = -1;
    for (var i = 0; i < header.length; i++) { if (String(header[i] || '').trim() === 'בוצע') { doneCol = i + 1; break; } }
    if (doneCol === -1) { doneCol = lastCol + 1; sheet.getRange(1, doneCol).setValue('בוצע'); }
    if (doneCol > 1) sheet.getRange(row, 1, 1, doneCol - 1).setFontLine('line-through');
    var stamp = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm');
    sheet.getRange(row, doneCol).setValue(stamp);
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  }
  if (action === 'getCategories') {
    var client = e.parameter.client || '';
    var cats = [];
    var targetSheet = client ? ss.getSheetByName(client) : null;
    if (!targetSheet) {
      ss.getSheets().some(function(s) {
        if (!isSystemSheet(s.getName())) { targetSheet = s; return true; }
      });
    }
    if (targetSheet) {
      var data = targetSheet.getDataRange().getValues();
      var cols = findColumns(data);
      if (cols.category !== -1 && cols.headerRow !== -1) {
        var rule = targetSheet.getRange(cols.headerRow + 2, cols.category + 1).getDataValidation();
        if (rule) {
          var criteria = rule.getCriteriaValues();
          if (criteria && criteria[0]) {
            var rawList = String(criteria[0]);
            cats = rawList.split(',').map(function(v){ return v.trim(); }).filter(Boolean);
          }
        }
        if (!cats.length) {
          var seen = {};
          for (var r = cols.headerRow + 1; r < data.length; r++) {
            var v = String(data[r][cols.category] || '').trim();
            if (v && !seen[v]) { seen[v] = 1; cats.push(v); }
          }
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify(cats)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getClients') {
    if (e.parameter.full === '1') {
      var clientSheet = ss.getSheetByName('Clients');
      var clientList = [];
      if (clientSheet) {
        var clientData = clientSheet.getDataRange().getValues();
        for (var r = 1; r < clientData.length; r++) {
          var cName = String(clientData[r][0] || '').trim();
          if (cName) clientList.push({
            name:     cName,
            type:     String(clientData[r][1] || '').trim(),
            contact:  String(clientData[r][2] || '').trim(),
            taxId:    String(clientData[r][3] || '').trim(),
            phone:    String(clientData[r][4] || '').trim(),
            email:    String(clientData[r][5] || '').trim(),
            address:  String(clientData[r][6] || '').trim(),
            city:     String(clientData[r][7] || '').trim(),
            caspitId: String(clientData[r][8] || '').trim(),
            created:  String(clientData[r][9] || '').trim()
          });
        }
      }
      return ContentService.createTextOutput(JSON.stringify(clientList)).setMimeType(ContentService.MimeType.JSON);
    }
    var clients = [];
    ss.getSheets().forEach(function(sheet) {
      var name = sheet.getName();
      if (isSystemSheet(name)) return;
      var data = sheet.getDataRange().getValues();
      var cols = findColumns(data);
      if (cols.headerRow !== -1) clients.push(name);
    });
    return ContentService.createTextOutput(JSON.stringify(clients)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getJobHours') {
    var jobId = e.parameter.jobId; var client = e.parameter.client;
    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('0').setMimeType(ContentService.MimeType.TEXT);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      if (String(data[r][cols.jobId] || '').trim() === jobId) {
        return ContentService.createTextOutput(String(parseFloat(data[r][cols.hoursActual]) || 0)).setMimeType(ContentService.MimeType.TEXT);
      }
    }
    return ContentService.createTextOutput('0').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'getJobNotes') {
    var jobId = e.parameter.jobId; var client = e.parameter.client;
    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('none').setMimeType(ContentService.MimeType.TEXT);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    if (cols.notes === -1) return ContentService.createTextOutput('none').setMimeType(ContentService.MimeType.TEXT);
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      if (String(data[r][cols.jobId] || '').trim() === jobId) {
        var notes = String(data[r][cols.notes] || '').trim();
        return ContentService.createTextOutput(notes || 'none').setMimeType(ContentService.MimeType.TEXT);
      }
    }
    return ContentService.createTextOutput('none').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'getJobDetails') {
    var jobId = e.parameter.jobId; var client = e.parameter.client;
    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('{}').setMimeType(ContentService.MimeType.JSON);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      if (String(data[r][cols.jobId] || '').trim() === jobId) {
        var result = {
          category: cols.category !== -1 ? String(data[r][cols.category] || '') : '',
          price:    cols.price    !== -1 ? String(data[r][cols.price]    || '') : '',
          qty:      cols.qty      !== -1 ? String(data[r][cols.qty]      || '') : '',
          hours:    cols.hours    !== -1 ? String(data[r][cols.hours]    || '') : '',
          po:       cols.po       !== -1 ? String(data[r][cols.po]       || '') : '',
          progress: cols.progress !== -1 ? String(data[r][cols.progress] || '') : ''
        };
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput('{}').setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'setProgress') {
    var jobId = e.parameter.jobId; var client = e.parameter.client;
    var progress = parseInt(e.parameter.progress, 10); if (isNaN(progress)) progress = 0;
    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('Sheet not found').setMimeType(ContentService.MimeType.TEXT);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    if (cols.headerRow === -1) return ContentService.createTextOutput('No header').setMimeType(ContentService.MimeType.TEXT);
    var pcol = cols.progress;
    if (pcol === -1) {
      // create the "אחוז התקדמות" column at the end — additive, existing columns untouched
      pcol = data[cols.headerRow].length;
      sheet.getRange(cols.headerRow + 1, pcol + 1).setValue('אחוז התקדמות');
    }
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      if (String(data[r][cols.jobId] || '').trim() === jobId) {
        sheet.getRange(r + 1, pcol + 1).setValue(progress);
        return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
      }
    }
    return ContentService.createTextOutput('Not found').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'appendLocation') {
    var jobId = e.parameter.jobId; var client = e.parameter.client; var loc = e.parameter.loc;
    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('Sheet not found').setMimeType(ContentService.MimeType.TEXT);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    if (cols.location === -1) return ContentService.createTextOutput('No location column').setMimeType(ContentService.MimeType.TEXT);
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      if (String(data[r][cols.jobId] || '').trim() === jobId) {
        var existing = String(data[r][cols.location] || '').trim();
        if (existing.indexOf(loc) === -1) {
          var newVal = existing ? existing + ' → ' + loc : loc;
          sheet.getRange(r + 1, cols.location + 1).setValue(newVal);
        }
        return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
      }
    }
    return ContentService.createTextOutput('Not found').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'saveCaspitDocument') {
    var jobId      = e.parameter.jobId;
    var client     = e.parameter.client;
    var docId      = e.parameter.docId      || '';
    var docNumber  = e.parameter.docNumber  || '';
    var trxTypeId  = e.parameter.trxTypeId  || '';
    var pdfLink    = e.parameter.pdfLink    || '';
    var total      = e.parameter.total      || '';
    var jobIds     = e.parameter.jobIds     || jobId;
    var createdAt  = e.parameter.createdAt  || Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd/MM/yyyy');
    var docType    = trxTypeId === '1' ? 'Invoice' : trxTypeId === '16' ? 'Quote' : 'Document';
    var note       = e.parameter.note || '';


    var sheet = ss.getSheetByName(client);
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      var cols = findColumns(data);
      var jobIdList = jobIds.split(',');
      jobIdList.forEach(function(jid) {
        jid = jid.trim();
        for (var r = cols.headerRow + 1; r < data.length; r++) {
          if (String(data[r][cols.jobId] || '').trim() === jid) {
            if (cols.invoiceQuote !== -1) sheet.getRange(r+1, cols.invoiceQuote+1).setValue(docNumber);
            if (cols.invoice !== -1 && trxTypeId === '1') sheet.getRange(r+1, cols.invoice+1).setValue('יצאה חש');
            break;
          }
        }
      });
    }


    var logSheet = ss.getSheetByName('Caspit Documents');
    if (!logSheet) {
      logSheet = ss.insertSheet('Caspit Documents');
      logSheet.getRange(1, 1, 1, 10).setValues([['#', 'Date', 'Doc Number', 'Type', 'Client', 'Total (₪)', 'Jobs', 'Caspit ID', 'PDF', 'Note']]);
      logSheet.getRange(1, 1, 1, 10).setFontWeight('bold');
      logSheet.setFrozenRows(1);
    } else if (logSheet.getLastColumn() < 10) {
      logSheet.getRange(1, 10).setValue('Note');
      logSheet.getRange(1, 10).setFontWeight('bold');
    }
    var lastRow = logSheet.getLastRow();
    logSheet.appendRow([lastRow, createdAt, docNumber, docType, client, total ? '₪' + total : '', jobIds, docId, pdfLink, note]);
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'setInvoiceStatus') {
    var jobId = e.parameter.jobId; var client = e.parameter.client; var invoiceStatus = e.parameter.invoiceStatus;
    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('Sheet not found').setMimeType(ContentService.MimeType.TEXT);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    if (cols.invoice === -1) return ContentService.createTextOutput('No invoice column').setMimeType(ContentService.MimeType.TEXT);
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      if (String(data[r][cols.jobId] || '').trim() === jobId) {
        sheet.getRange(r + 1, cols.invoice + 1).setValue(invoiceStatus);
        return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
      }
    }
    return ContentService.createTextOutput('Not found').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'setStatus') {
    var jobId = e.parameter.jobId; var client = e.parameter.client; var status = e.parameter.status;
    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('Sheet not found').setMimeType(ContentService.MimeType.TEXT);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      if (String(data[r][cols.jobId] || '').trim() === jobId) {
        sheet.getRange(r + 1, cols.status + 1).setValue(status);
        if (status === 'בוצע' && cols.dateEnd !== -1)
          sheet.getRange(r + 1, cols.dateEnd + 1).setValue(Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd/MM/yyyy'));
        return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
      }
    }
    return ContentService.createTextOutput('Not found').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'updateJob') {
    var jobId = e.parameter.jobId; var client = e.parameter.client;
    var hours = parseFloat(e.parameter.hours) || 0;
    var dateStart = e.parameter.dateStart; var dateDone = e.parameter.dateDone;
    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('Sheet not found').setMimeType(ContentService.MimeType.TEXT);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      if (String(data[r][cols.jobId] || '').trim() === jobId) {
        if (cols.hoursActual !== -1) sheet.getRange(r+1, cols.hoursActual+1).setValue(hours);
        if (dateStart && cols.dateStart !== -1 && !data[r][cols.dateStart]) sheet.getRange(r+1, cols.dateStart+1).setValue(dateStart);
        if (dateDone && cols.dateEnd !== -1) sheet.getRange(r+1, cols.dateEnd+1).setValue(dateDone);
        return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
      }
    }
    return ContentService.createTextOutput('Not found').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'updateJobFields') {
    var jobId = e.parameter.jobId; var client = e.parameter.client;
    var category = e.parameter.category || ''; var price = parseFloat(e.parameter.price) || 0;
    var qty = parseFloat(e.parameter.qty) || 0; var hours = parseFloat(e.parameter.hours) || 0;
    var po = e.parameter.po || '';
    var descPresent = (typeof e.parameter.desc !== 'undefined');
    var desc = e.parameter.desc || '';
    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('Sheet not found').setMimeType(ContentService.MimeType.TEXT);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      if (String(data[r][cols.jobId] || '').trim() === jobId) {
        if (cols.desc     !== -1 && descPresent && desc !== '') sheet.getRange(r+1, cols.desc+1).setValue(desc);
        if (cols.category !== -1 && category) sheet.getRange(r+1, cols.category+1).setValue(category);
        if (cols.price    !== -1 && price)    sheet.getRange(r+1, cols.price+1).setValue(price);
        if (cols.qty      !== -1 && qty)      sheet.getRange(r+1, cols.qty+1).setValue(qty);
        if (cols.hours    !== -1 && hours)    sheet.getRange(r+1, cols.hours+1).setValue(hours);
        if (cols.po       !== -1 && po)       sheet.getRange(r+1, cols.po+1).setValue(po);
        return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
      }
    }
    return ContentService.createTextOutput('Not found').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'getClientJobs') {
    var client = e.parameter.client;
    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    if (cols.headerRow === -1 || cols.jobId === -1) return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
    var gv = function(row, key){ return cols[key] !== -1 ? String(data[row][cols[key]] || '') : ''; };
    var out = [];
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      var id = String(data[r][cols.jobId] || '').trim();
      if (!id) continue;
      out.push({
        id: id, desc: gv(r,'desc'), category: gv(r,'category'), status: gv(r,'status'),
        price: gv(r,'price'), qty: gv(r,'qty'), income: gv(r,'income'), costs: gv(r,'costs'),
        hours: gv(r,'hours'), hoursActual: gv(r,'hoursActual'),
        dateStart: gv(r,'dateStart'), dateEnd: gv(r,'dateEnd'),
        po: gv(r,'po'), quote: gv(r,'invoiceQuote'), invoice: gv(r,'invoice'),
        notes: gv(r,'notes'), grossProfit: gv(r,'grossProfit'), profitPerHour: gv(r,'profitPerHour')
      });
    }
    return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'updateJobFull') {
    var jobId = e.parameter.jobId; var client = e.parameter.client;
    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('Sheet not found').setMimeType(ContentService.MimeType.TEXT);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    var P = e.parameter;
    var textMap = { desc:'desc', category:'category', status:'status', po:'po', quote:'invoiceQuote', invoice:'invoice', dateStart:'dateStart', dateEnd:'dateEnd', notes:'notes' };
    var numMap  = { price:'price', qty:'qty', costs:'costs', hours:'hours', hoursActual:'hoursActual' };
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      if (String(data[r][cols.jobId] || '').trim() === jobId) {
        for (var k in textMap) {
          if (typeof P[k] !== 'undefined' && cols[textMap[k]] !== -1) sheet.getRange(r+1, cols[textMap[k]]+1).setValue(P[k]);
        }
        for (var k2 in numMap) {
          if (typeof P[k2] !== 'undefined' && cols[numMap[k2]] !== -1) {
            var raw = P[k2];
            sheet.getRange(r+1, cols[numMap[k2]]+1).setValue(raw === '' ? '' : (parseFloat(raw) || 0));
          }
        }


        return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
      }
    }
    return ContentService.createTextOutput('Not found').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'deleteJob') {
    var jobId = e.parameter.jobId; var client = e.parameter.client;
    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('Sheet not found').setMimeType(ContentService.MimeType.TEXT);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      if (String(data[r][cols.jobId] || '').trim() === jobId) {
        sheet.deleteRow(r+1);
        return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
      }
    }
    return ContentService.createTextOutput('Not found').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'addNote') {
    var jobId = e.parameter.jobId; var client = e.parameter.client; var note = e.parameter.note;
    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('Sheet not found').setMimeType(ContentService.MimeType.TEXT);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    if (cols.notes === -1) return ContentService.createTextOutput('No notes column').setMimeType(ContentService.MimeType.TEXT);
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      if (String(data[r][cols.jobId] || '').trim() === jobId) {
        var existing = String(data[r][cols.notes] || '').trim();
        sheet.getRange(r+1, cols.notes+1).setValue(existing ? existing + '\n' + note : note);
        return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
      }
    }
    return ContentService.createTextOutput('Not found').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'deleteNote') {
    var jobId = e.parameter.jobId; var client = e.parameter.client; var note = e.parameter.note;
    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('Sheet not found').setMimeType(ContentService.MimeType.TEXT);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    if (cols.notes === -1) return ContentService.createTextOutput('No notes column').setMimeType(ContentService.MimeType.TEXT);
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      if (String(data[r][cols.jobId] || '').trim() === jobId) {
        var lines = String(data[r][cols.notes] || '').split('\n').filter(function(l) {
          return l.trim() && l.trim() !== note.trim();
        });
        sheet.getRange(r + 1, cols.notes + 1).setValue(lines.join('\n'));
        return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
      }
    }
    return ContentService.createTextOutput('Not found').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'getAIPriceSuggestion') {
    try {
      var desc2        = (e.parameter.desc         || '').trim();
      var client2      = (e.parameter.client       || '').trim();
      var hours2       = parseFloat(e.parameter.hours || '0');
      var workers2     = parseInt(e.parameter.workers || '1');
      var withMat2     = e.parameter.materials === '1';
      var gemKey2      = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || '';
      if (!gemKey2 || !desc2) return ContentService.createTextOutput(JSON.stringify({error:'Missing params'})).setMimeType(ContentService.MimeType.JSON);


      // Fetch similar past jobs from this client's sheet
      var similarJobs = [];
      try {
        var clientSheet2 = ss.getSheetByName(client2);
        if (clientSheet2) {
          var cData2 = clientSheet2.getDataRange().getValues();
          var cCols2 = findColumns(cData2);
          if (cCols2.headerRow !== -1) {
            for (var rr2 = cCols2.headerRow + 1; rr2 < cData2.length; rr2++) {
              var jDesc2 = cCols2.desc   !== -1 ? String(cData2[rr2][cCols2.desc]||'').trim() : '';
              var jInc2  = cCols2.income !== -1 ? parseFloat(cData2[rr2][cCols2.income]||0) : 0;
              var jHrs2  = cCols2.hours  !== -1 ? parseFloat(cData2[rr2][cCols2.hours]||0) : 0;
              var jStat2 = cCols2.status !== -1 ? String(cData2[rr2][cCols2.status]||'').trim() : '';
              if (!jDesc2 || !jInc2) continue;
              if (['הצעה ניתנה','בתהליך ביצוע','הסתיים'].indexOf(jStat2) === -1) continue;
              similarJobs.push({desc: jDesc2.slice(0,60), income: jInc2, hours: jHrs2, status: jStat2});
              if (similarJobs.length >= 5) break;
            }
          }
        }
      } catch(_) {}


      var prompt2 = 'You are a pricing expert for an Israeli field maintenance contractor (י.ב אחזקות). ' +
        'Job: "' + desc2 + '". Client: ' + (client2||'unknown') + '. ' +
        'Estimated hours: ' + (hours2||'unknown') + '. Workers: ' + workers2 + '. ' +
        (withMat2 ? 'Price INCLUDES materials. ' : 'Labor only, no materials. ') +
        (similarJobs.length ? 'Past similar jobs for this client: ' + JSON.stringify(similarJobs) + '. ' : '') +
        'Israeli labor rate ~₪90-120/hour per worker. Israeli market context: 2026 prices. ' +
        'Search the web for current Israeli market prices for this type of work. ' +
        'Return ONLY valid JSON (no markdown, no explanation): ' +
        '{"min":NUMBER,"max":NUMBER,"materials_est":NUMBER,"labor_est":NUMBER,"market_range":"₪X–₪Y","margin_pct":NUMBER,"reasoning":"1-2 sentences in Hebrew"}. ' +
        'All numbers as integers. min/max are total recommended price range.';


      var gemUrl2 = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + gemKey2;
      var gemBody2 = {
        contents: [{parts: [{text: prompt2}]}],
        tools: [{google_search: {}}],
        generationConfig: {temperature: 0.2, maxOutputTokens: 400, thinkingConfig: { thinkingBudget: 0 }}
      };
      var gemResp2 = UrlFetchApp.fetch(gemUrl2, {method:'post', contentType:'application/json', payload:JSON.stringify(gemBody2), muteHttpExceptions:true, deadline:30});
      var gemData2 = JSON.parse(gemResp2.getContentText());
      var rawText2 = (((gemData2.candidates||[])[0]||{}).content||{}).parts;
      rawText2 = rawText2 ? rawText2.map(function(p){return p.text||'';}).join('') : '';
      var cleaned2 = rawText2.replace(/```json|```/g,'').trim();
      var match2 = cleaned2.match(/\{[\s\S]*\}/);
      if (!match2) return ContentService.createTextOutput(JSON.stringify({error:'No JSON in response', raw:rawText2.slice(0,200)})).setMimeType(ContentService.MimeType.JSON);
      var result2 = JSON.parse(match2[0]);
      result2.similar_count = similarJobs.length;
      return ContentService.createTextOutput(JSON.stringify(result2)).setMimeType(ContentService.MimeType.JSON);
    } catch(ePrice) {
      return ContentService.createTextOutput(JSON.stringify({error: ePrice.message})).setMimeType(ContentService.MimeType.JSON);
    }
  }


  if (action === 'getAIPriceRows') {
    try {
      var linesRaw = e.parameter.lines || '[]';
      var hoursRaw = e.parameter.hours || '[]';
      var linesR = [], hoursR = [];
      try { linesR = JSON.parse(linesRaw); } catch(_) { linesR = []; }
      try { hoursR = JSON.parse(hoursRaw); } catch(_) { hoursR = []; }
      if (!Array.isArray(linesR)) linesR = [];
      var clientR  = (e.parameter.client || '').trim();
      var workersR = parseInt(e.parameter.workers || '1');
      var withMatR = e.parameter.materials === '1';
      var gemKeyR  = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || '';
      var nonEmpty = linesR.filter(function(l){ return String(l||'').trim(); });
      if (!gemKeyR || !nonEmpty.length) return ContentService.createTextOutput(JSON.stringify({error:'Missing params'})).setMimeType(ContentService.MimeType.JSON);


      // Fetch similar past jobs from this client's sheet (same source as getAIPriceSuggestion)
      var similarJobsR = [];
      try {
        var clientSheetR = ss.getSheetByName(clientR);
        if (clientSheetR) {
          var cDataR = clientSheetR.getDataRange().getValues();
          var cColsR = findColumns(cDataR);
          if (cColsR.headerRow !== -1) {
            for (var rrR = cColsR.headerRow + 1; rrR < cDataR.length; rrR++) {
              var jDescR = cColsR.desc   !== -1 ? String(cDataR[rrR][cColsR.desc]||'').trim() : '';
              var jIncR  = cColsR.income !== -1 ? parseFloat(cDataR[rrR][cColsR.income]||0) : 0;
              var jHrsR  = cColsR.hours  !== -1 ? parseFloat(cDataR[rrR][cColsR.hours]||0) : 0;
              var jStatR = cColsR.status !== -1 ? String(cDataR[rrR][cColsR.status]||'').trim() : '';
              if (!jDescR || !jIncR) continue;
              if (['הצעה ניתנה','בתהליך ביצוע','הסתיים'].indexOf(jStatR) === -1) continue;
              similarJobsR.push({desc: jDescR.slice(0,60), income: jIncR, hours: jHrsR});
              if (similarJobsR.length >= 6) break;
            }
          }
        }
      } catch(_) {}


      var numbered = linesR.map(function(l, ix){ var h = parseFloat(hoursR[ix]||0)||0; return (ix+1) + '. ' + String(l||'(empty)') + (h ? (' [est. ' + h + ' hrs]') : ''); }).join('\n');
      var promptR = 'You are a pricing expert for an Israeli field maintenance contractor (י.ב אחזקות). ' +
        'Price EACH line item below SEPARATELY for client ' + (clientR||'unknown') + '. ' +
        'Workers available: ' + workersR + '. ' +
        (withMatR ? 'Each price INCLUDES materials. ' : 'Labor only, no materials. ') +
        (similarJobsR.length ? 'Past similar jobs for this client (desc/income/hours): ' + JSON.stringify(similarJobsR) + '. ' : '') +
        'Israeli labor rate ~₪90-120/hour per worker. Israeli 2026 market context. ' +
        'Search the web for current Israeli market prices where useful. ' +
        'Line items:\n' + numbered + '\n' +
        'Return ONLY a valid JSON array (no markdown, no prose), exactly ' + linesR.length + ' objects, one per line item IN THE SAME ORDER. ' +
        'For an empty line item return {"min":0,"max":0,"reasoning":""}. ' +
        'Schema per object: {"min":NUMBER,"max":NUMBER,"reasoning":"1 short sentence in Hebrew"}. ' +
        'All numbers integers; min/max are the total recommended price for that single line (not per unit).';


      var gemUrlR = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + gemKeyR;
      var gemBodyR = {
        contents: [{parts: [{text: promptR}]}],
        tools: [{google_search: {}}],
        generationConfig: {temperature: 0.2, maxOutputTokens: 1200, thinkingConfig: { thinkingBudget: 0 }}
      };
      var gemRespR = UrlFetchApp.fetch(gemUrlR, {method:'post', contentType:'application/json', payload:JSON.stringify(gemBodyR), muteHttpExceptions:true, deadline:45});
      var gemDataR = JSON.parse(gemRespR.getContentText());
      var rawTextR = (((gemDataR.candidates||[])[0]||{}).content||{}).parts;
      rawTextR = rawTextR ? rawTextR.map(function(p){ return p.text||''; }).join('') : '';
      var cleanedR = rawTextR.replace(/```json|```/g,'').trim();
      var matchR = cleanedR.match(/\[[\s\S]*\]/);
      var arrR = [];
      if (matchR) { try { arrR = JSON.parse(matchR[0]); } catch(_) { arrR = []; } }
      if (!Array.isArray(arrR)) arrR = [];
      var rowsOut = linesR.map(function(l, ix){
        var o = arrR[ix] || {};
        return { desc: String(l||''), min: Math.round(parseFloat(o.min||0))||0, max: Math.round(parseFloat(o.max||0))||0, reasoning: String(o.reasoning||'') };
      });
      return ContentService.createTextOutput(JSON.stringify({rows: rowsOut, similar_count: similarJobsR.length})).setMimeType(ContentService.MimeType.JSON);
    } catch(eRows) {
      return ContentService.createTextOutput(JSON.stringify({error: eRows.message})).setMimeType(ContentService.MimeType.JSON);
    }
  }


  if (action === 'toggleNoteCheck') {
    var jobId = e.parameter.jobId, client = e.parameter.client;
    var noteIdx = parseInt(e.parameter.noteIdx || '0');
    var isDone  = e.parameter.done === '1';
    var sheet   = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('Sheet not found').setMimeType(ContentService.MimeType.TEXT);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    if (cols.notes === -1) return ContentService.createTextOutput('No notes column').setMimeType(ContentService.MimeType.TEXT);
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      if (String(data[r][cols.jobId] || '').trim() === jobId) {
        var lines = String(data[r][cols.notes] || '').split('\n');
        if (noteIdx < 0 || noteIdx >= lines.length) return ContentService.createTextOutput('Not found').setMimeType(ContentService.MimeType.TEXT);
        var stripped = lines[noteIdx].replace(/^\[DONE:[^\]]+\]/, '');
        lines[noteIdx] = isDone ? '[DONE:' + new Date().toISOString() + ']' + stripped : stripped;
        sheet.getRange(r + 1, cols.notes + 1).setValue(lines.join('\n'));
        return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
      }
    }
    return ContentService.createTextOutput('Not found').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'updateCurrentLocation') {
    var loc     = e.parameter.loc  || '';
    var lat     = e.parameter.lat  || '';
    var lng     = e.parameter.lng  || '';
    var dateStr = e.parameter.date || '';
    var timeStr = e.parameter.time || '';
    var locSheet = ss.getSheetByName('מיקום נוכחי');
    if (!locSheet) {
      locSheet = ss.insertSheet('מיקום נוכחי');
      locSheet.getRange(1,1,1,5).setValues([['תאריך','שעה','מיקום','lat','lng']]);
      locSheet.getRange(1,1,1,5).setFontWeight('bold');
    }
    locSheet.getRange(2,1,1,5).setValues([[dateStr, timeStr, loc, lat, lng]]);
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  }


  // ── v47: Work Log ──────────────────────────────────────────────────────
  if (action === 'saveWorkLog') {
    try {
      var date     = e.parameter.date     || '';
      var dayStart = e.parameter.dayStart || '';
      var dayEnd   = e.parameter.dayEnd   || '';
      var totalHrs = e.parameter.total    || '';
      var summary  = e.parameter.summary  || '';
      var logSheet = ss.getSheetByName('לוג עבודה');
      if (!logSheet) {
        logSheet = ss.insertSheet('לוג עבודה');
        logSheet.getRange(1,1,1,6).setValues([['#','תאריך','התחלה','סיום','סה״כ','סיכום']]);
        logSheet.getRange(1,1,1,6).setFontWeight('bold');
        logSheet.setColumnWidth(1, 40); logSheet.setColumnWidth(2, 90);
        logSheet.setColumnWidth(3, 70); logSheet.setColumnWidth(4, 70);
        logSheet.setColumnWidth(5, 70); logSheet.setColumnWidth(6, 500);
      }
      var lastRow = logSheet.getLastRow();
      var idx = lastRow > 1 ? lastRow : 1;
      logSheet.appendRow([idx, date, dayStart, dayEnd, totalHrs, summary]);
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    } catch(err) {
      return ContentService.createTextOutput('Error: ' + err).setMimeType(ContentService.MimeType.TEXT);
    }
  }


  if (action === 'searchWorkLog') {
    try {
      var query    = (e.parameter.q || '').trim().toLowerCase();
      var logSheet = ss.getSheetByName('לוג עבודה');
      if (!logSheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
      var data    = logSheet.getDataRange().getValues();
      var results = [];
      for (var r = 1; r < data.length; r++) {
        var rowText = [data[r][1], data[r][5]].join(' ').toLowerCase();
        if (!query || rowText.indexOf(query) !== -1) {
          results.push({ idx: data[r][0], date: data[r][1], dayStart: data[r][2], dayEnd: data[r][3], total: data[r][4], summary: data[r][5] });
        }
      }
      results.reverse();
      return ContentService.createTextOutput(JSON.stringify(results)).setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
  }
  // ── end v47 ────────────────────────────────────────────────────────────


  if (action === 'getActualPriceSummary') {
    // Sums הכנסה מתוכננת (planned income / actual price) per client, same 'להוציא חש' filter
    var resAP = { total: 0, clients: {} };
    ss.getSheets().forEach(function(sheet) {
      var name = sheet.getName();
      if (isSystemSheet(name)) return;
      var data = sheet.getDataRange().getValues();
      var cols = findColumns(data);
      if (cols.headerRow === -1) return;
      for (var r = cols.headerRow + 1; r < data.length; r++) {
        var jobId = String(data[r][cols.jobId] || '').trim();
        if (!jobId) continue;
        var invoice = cols.invoice !== -1 ? String(data[r][cols.invoice] || '').trim() : '';
        if (invoice !== 'להוציא חש') continue;
        var inc = cols.income !== -1 ? parseFloat(data[r][cols.income]) || 0 : 0;
        resAP.total += inc;
        if (!resAP.clients[name]) resAP.clients[name] = 0;
        resAP.clients[name] += inc;
      }
    });
    resAP.total = Math.round(resAP.total);
    Object.keys(resAP.clients).forEach(function(k) { resAP.clients[k] = Math.round(resAP.clients[k]); });
    return ContentService.createTextOutput(JSON.stringify(resAP)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getGrossProfitSummary') {
    var result = { total: 0, clients: {} };
    ss.getSheets().forEach(function(sheet) {
      var name = sheet.getName();
      if (isSystemSheet(name)) return;
      var data = sheet.getDataRange().getValues();
      var cols = findColumns(data);
      if (cols.headerRow === -1) return;
      for (var r = cols.headerRow + 1; r < data.length; r++) {
        var jobId = String(data[r][cols.jobId] || '').trim();
        if (!jobId) continue;
        var invoice = cols.invoice !== -1 ? String(data[r][cols.invoice] || '').trim() : '';
        if (invoice !== 'להוציא חש') continue;
        var gp = cols.grossProfit !== -1 ? parseFloat(data[r][cols.grossProfit]) || 0 : 0;
        result.total += gp;
        if (!result.clients[name]) result.clients[name] = 0;
        result.clients[name] += gp;
      }
    });
    result.total = Math.round(result.total);
    Object.keys(result.clients).forEach(function(k) { result.clients[k] = Math.round(result.clients[k]); });
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getInvoiceReadyJobs') {
    var result = [];
    ss.getSheets().forEach(function(sheet) {
      var name = sheet.getName();
      if (isSystemSheet(name)) return;
      var range = sheet.getDataRange();
      var data        = range.getValues();
      var displayData = range.getDisplayValues();
      var cols = findColumns(data);
      if (cols.headerRow === -1) return;
      for (var r = cols.headerRow + 1; r < data.length; r++) {
        var jobId   = String(data[r][cols.jobId]  || '').trim();
        var invoice = cols.invoice !== -1 ? String(data[r][cols.invoice] || '').trim() : '';
        if (!jobId || invoice !== 'להוציא חש') continue;
        // Try numeric value first; fall back to display value (handles formula cells)
        var _incNum  = cols.income !== -1 ? (parseFloat(String(data[r][cols.income]).replace(/[^0-9.-]/g,'')) || 0) : 0;
        var _incDisp = cols.income !== -1 ? (parseFloat(String(displayData[r][cols.income]).replace(/[^0-9.]/g,'')) || 0) : 0;
        var _inc = _incNum || _incDisp;
        var _pr   = cols.price  !== -1 ? (parseFloat(data[r][cols.price])  || 0) : 0;
        var _qty  = cols.qty    !== -1 ? (parseFloat(data[r][cols.qty])    || 1) : 1;
        var _hrs  = cols.hours  !== -1 ? (parseFloat(data[r][cols.hours])  || 0) : 0;
        // If income column is empty/0, calculate from price×qty (or price×hours)
        if (!_inc && _pr) { _inc = _pr * (_qty || _hrs || 1); }
        result.push({
          jobId:       jobId, client: name,
          description: cols.desc        !== -1 ? String(data[r][cols.desc]        || '') : '',
          price:       _pr, qty: _qty, income: _inc, hours: _hrs,
          poNumber:    cols.po      !== -1 ? String(data[r][cols.po] || '') : '',
          dateEnd:     cols.dateEnd !== -1 && data[r][cols.dateEnd] ? (data[r][cols.dateEnd] instanceof Date ? Utilities.formatDate(data[r][cols.dateEnd], 'Asia/Jerusalem', 'dd/MM/yyyy') : String(data[r][cols.dateEnd])) : '',
          status:      invoice
        });
      }
    });
    result.sort(function(a,b){ return a.client.localeCompare(b.client); });
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getProjectsList') {
    var props = PropertiesService.getScriptProperties();
    var list = props.getProperty('YB_PROJECTS_LIST') || 'No active projects';
    return ContentService.createTextOutput(list).setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'saveProjectsList') {
    var list = e.parameter.list || '';
    if (list) PropertiesService.getScriptProperties().setProperty('YB_PROJECTS_LIST', list);
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'addDayNote') {
    var note    = e.parameter.note || '';
    var dateStr = e.parameter.date || '';
    var timeStr = e.parameter.time || '';
    var loc     = e.parameter.loc  || '';
    if (!note) return ContentService.createTextOutput('Empty').setMimeType(ContentService.MimeType.TEXT);
    var journalSheet = ss.getSheetByName('יומן');
    if (!journalSheet) {
      journalSheet = ss.insertSheet('יומן');
      journalSheet.getRange(1, 1, 1, 4).setValues([['תאריך', 'שעה', 'הערה', 'מיקום']]);
      journalSheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    }
    journalSheet.appendRow([dateStr, timeStr, note, loc]);
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'addPONewRow') {
    try {
      var client   = e.parameter.client;
      var poNumber = e.parameter.poNumber;
      var desc     = e.parameter.desc  || '';
      var price    = parseFloat(e.parameter.price) || 0;
      var qty      = parseFloat(e.parameter.qty) || 1;
      var sheet    = ss.getSheetByName(client);
      if (!sheet) return ContentService.createTextOutput('Sheet not found').setMimeType(ContentService.MimeType.TEXT);
      var jobId = addPORowAndReturn(sheet, client, desc, price, poNumber, qty);
      return ContentService.createTextOutput(jobId || 'Error').setMimeType(ContentService.MimeType.TEXT);
    } catch(err) {
      return ContentService.createTextOutput('Error: ' + err).setMimeType(ContentService.MimeType.TEXT);
    }
  }


  if (action === 'attachPOToJob') {
    var jobId    = e.parameter.jobId;
    var client   = e.parameter.client;
    var poNumber = e.parameter.poNumber;
    var price    = parseFloat(e.parameter.price) || 0;
    var qty      = parseFloat(e.parameter.qty) || 0;
    var sheet    = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('Sheet not found').setMimeType(ContentService.MimeType.TEXT);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      if (String(data[r][cols.jobId] || '').trim() === jobId) {
        if (cols.po    !== -1) sheet.getRange(r+1, cols.po+1).setValue(poNumber);
        if (cols.price !== -1 && price) sheet.getRange(r+1, cols.price+1).setValue(price);
        if (cols.qty   !== -1 && qty)   sheet.getRange(r+1, cols.qty+1).setValue(qty);
        return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
      }
    }
    return ContentService.createTextOutput('Not found').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'addJobsBulk') {
    var client     = e.parameter.client;
    var noDate     = e.parameter.noDate === '1';
    var bulkNotes  = e.parameter.notes  || '';
    var rowsRaw    = e.parameter.rows || '[]';
    var rows;
    try { rows = JSON.parse(rowsRaw); } catch(err) { return ContentService.createTextOutput(JSON.stringify({error:'Bad JSON'})).setMimeType(ContentService.MimeType.JSON); }
    if (!rows.length) return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);


    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({error:'Sheet not found'})).setMimeType(ContentService.MimeType.JSON);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    if (cols.headerRow === -1) return ContentService.createTextOutput(JSON.stringify({error:'Header not found'})).setMimeType(ContentService.MimeType.JSON);


    var prefix = client.replace(/[^a-zA-Z]/g,'').substring(0,2).toUpperCase();
    var maxNum = 0;
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      var rid = String(data[r][cols.jobId] || '').trim();
      if (rid) { var p = rid.replace(/[0-9]/g,''); if (p) prefix = p; var n = parseInt(rid.replace(/[^0-9]/g,'')) || 0; if (n > maxNum) maxNum = n; }
    }


    var today = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd/MM/yyyy');
    var newIds = [];
    var isFirstRow = true;


    function findFirstEmptyRow() {
      var d = sheet.getDataRange().getValues();
      for (var rr = cols.headerRow + 1; rr < d.length; rr++) {
        var dv = cols.desc !== -1 ? String(d[rr][cols.desc] || '').trim() : 'x';
        if (dv === '') return rr + 1;
      }
      return sheet.getLastRow() + 1;
    }


    rows.forEach(function(row) {
      maxNum++;
      var newId = prefix + String(maxNum).padStart(4, '0');
      newIds.push(newId);
      var targetRow = findFirstEmptyRow();
      // v198: cell-by-cell write (like addJob) — never blanks the whole row width,
      // so any pre-existing formula in a column we don't manage (e.g. רווח גולמי) survives.
      sheet.getRange(targetRow, cols.jobId+1).setValue(newId);
      if (cols.desc   !== -1) sheet.getRange(targetRow, cols.desc+1).setValue(row.desc || '');
      if (cols.status !== -1) sheet.getRange(targetRow, cols.status+1).setValue(row.st || 'ממתין להצעה');
      if (cols.price  !== -1) sheet.getRange(targetRow, cols.price+1).setValue(parseFloat(row.pr) || 0);
      if (cols.qty    !== -1) sheet.getRange(targetRow, cols.qty+1).setValue(parseFloat(row.qt) || 0);
      if (cols.hours  !== -1) sheet.getRange(targetRow, cols.hours+1).setValue(parseFloat(row.eh) || 0);
      if (cols.category !== -1 && row.ca) sheet.getRange(targetRow, cols.category+1).setValue(row.ca);
      if (isFirstRow && bulkNotes && cols.notes !== -1) { sheet.getRange(targetRow, cols.notes+1).setValue(bulkNotes); } isFirstRow = false;
      // v909: income/grossProfit/profitPerHour are live sheet formulas — never
      // write values into them; copy the formulas down from the row above instead.
      copyProfitFormulasDown(sheet, cols, targetRow);
      // v84: date logic based on status
      if (cols.dateStart !== -1 && (row.st === 'במהלך ביצוע' || row.st === 'בוצע'))
        sheet.getRange(targetRow, cols.dateStart+1).setValue(today);
      if (cols.dateEnd !== -1 && row.st === 'בוצע')
        sheet.getRange(targetRow, cols.dateEnd+1).setValue(today);
    });


    return ContentService.createTextOutput(JSON.stringify(newIds)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'addJob') {
    var client     = e.parameter.client;
    var desc       = e.parameter.desc;
    var status     = e.parameter.st   || 'ממתין לביצוע';
    var category   = e.parameter.ca   || '';
    var price      = parseFloat(e.parameter.pr)  || 0;
    var qty        = parseFloat(e.parameter.qt)  || 0;
    var estHours   = parseFloat(e.parameter.eh)  || 0;
    var po           = e.parameter.po   || '';
    var invoiceQuote  = e.parameter.iq    || '';
    var incomeMode   = e.parameter.incomeMode || 'qty';
    var noDate       = e.parameter.noDate === '1';
    var jobNotes     = e.parameter.notes  || '';


    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput('Sheet not found: ' + client).setMimeType(ContentService.MimeType.TEXT);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    if (cols.headerRow === -1) return ContentService.createTextOutput('Header not found').setMimeType(ContentService.MimeType.TEXT);


   function writeFields(rowNum) {
      if (cols.desc     !== -1) sheet.getRange(rowNum, cols.desc+1).setValue(desc     || '');
      if (cols.status   !== -1) sheet.getRange(rowNum, cols.status+1).setValue(status  || '');
      if (cols.hours    !== -1) sheet.getRange(rowNum, cols.hours+1).setValue(estHours || '');
      if (cols.category !== -1) sheet.getRange(rowNum, cols.category+1).setValue(category || '');
      if (cols.price    !== -1) sheet.getRange(rowNum, cols.price+1).setValue(price    || '');
      if (cols.qty      !== -1) sheet.getRange(rowNum, cols.qty+1).setValue(qty        || '');
      if (cols.po           !== -1) sheet.getRange(rowNum, cols.po+1).setValue(po            || '');
      if (cols.invoiceQuote !== -1 && invoiceQuote) sheet.getRange(rowNum, cols.invoiceQuote+1).setValue(invoiceQuote);
      if (cols.notes        !== -1 && jobNotes)     sheet.getRange(rowNum, cols.notes+1).setValue(jobNotes);
      // v909: income/grossProfit/profitPerHour are live sheet formulas — never
      // write into them; copy the formulas down from the row above instead.
      copyProfitFormulasDown(sheet, cols, rowNum);
      // v84: date logic based on status
      var _today = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd/MM/yyyy');
      if (cols.dateStart !== -1 && (status === 'במהלך ביצוע' || status === 'בוצע'))
        sheet.getRange(rowNum, cols.dateStart+1).setValue(_today);
      if (cols.dateEnd !== -1 && status === 'בוצע')
        sheet.getRange(rowNum, cols.dateEnd+1).setValue(_today);
    }
    var targetRow = -1;
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      var ri = String(data[r][cols.jobId] || '').trim();
      var rd = cols.desc      !== -1 ? String(data[r][cols.desc]      || '').trim() : 'x';
      var rs = cols.dateStart !== -1 ? String(data[r][cols.dateStart]  || '').trim() : '';
      var rp = cols.po        !== -1 ? String(data[r][cols.po]         || '').trim() : '';
      if (ri && !rd && !rs && !rp && targetRow === -1) { targetRow = r; break; }
    }


    var newId;
    if (targetRow !== -1) {
      newId = String(data[targetRow][cols.jobId]).trim();
      writeFields(targetRow + 1);
    } else {
      var prefix = client.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase();
      for (var r = cols.headerRow + 1; r < data.length; r++) {
        var eid = String(data[r][cols.jobId] || '').trim();
        if (eid) { prefix = eid.replace(/[0-9]/g, ''); break; }
      }
      var maxNum = 0;
      for (var r = cols.headerRow + 1; r < data.length; r++) {
        var rid = String(data[r][cols.jobId] || '').trim();
        if (rid) { var n = parseInt(rid.replace(/[^0-9]/g, '')) || 0; if (n > maxNum) maxNum = n; }
      }
      newId = prefix + String(maxNum + 1).padStart(4, '0');
      var lastDataRow = cols.headerRow + 1;
      for (var r = cols.headerRow + 1; r < data.length; r++) {
        if (String(data[r][cols.jobId] || '').trim()) lastDataRow = r;
      }
      var newRowNum = data.length + 1;
      var srcRange  = sheet.getRange(lastDataRow + 1, 1, 1, data[cols.headerRow].length);
      var destRange = sheet.getRange(newRowNum,       1, 1, data[cols.headerRow].length);
      srcRange.copyTo(destRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
      sheet.getRange(newRowNum, cols.jobId + 1).setValue(newId);
      writeFields(newRowNum);
    }
    return ContentService.createTextOutput(newId).setMimeType(ContentService.MimeType.TEXT);
  }


if (action === 'scanPOEmails') {
    try {
      var result = POSCAN_RETURN ? POSCAN_RETURN() : scanPOEmailsOnly();
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
  }


  if (action === 'debugPOScan') {
    var dbgOut = [];
    try {
      var threads = GmailApp.search('has:attachment -label:' + PO_GMAIL_LABEL, 0, 30);
      dbgOut.push('threads found: ' + threads.length);
      threads.forEach(function(thread, ti) {
        var subj = thread.getFirstMessageSubject();
        thread.getMessages().forEach(function(msg, mi) {
          var atts = msg.getAttachments();
          atts.forEach(function(att, ai) {
            dbgOut.push('thread ' + ti + ' msg ' + mi + ' att ' + ai + ': name="' + att.getName() + '" type="' + att.getContentType() + '" subj="' + subj + '"');
          });
          if (!atts.length) dbgOut.push('thread ' + ti + ' msg ' + mi + ': NO ATTACHMENTS (subj="' + subj + '")');
        });
      });
    } catch(eDbg) {
      dbgOut.push('ERROR: ' + eDbg.message);
    }
    return ContentService.createTextOutput(JSON.stringify(dbgOut, null, 2)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'resetPOLabel') {
    try {
      var result = typeof PORESETLABEL === 'function' ? PORESETLABEL() : resetPOLabel();
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
  }


  if (action === 'labelPOEmails') {
    try {
      var ids = JSON.parse(e.parameter.threadIds || '[]');
      labelPOThreads(ids);
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    } catch(err) {
      return ContentService.createTextOutput('Error: ' + err).setMimeType(ContentService.MimeType.TEXT);
    }
  }


  if (action === 'runPOImport') {
    try {
      var results = POIMPORT_RETURN();
      return ContentService.createTextOutput(JSON.stringify({ ok: true, count: results.length, rows: results })).setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
  }


  if (action === 'createClient') {
    var clientName  = e.parameter.name || e.parameter.clientName;
    var clientType  = e.parameter.clientType  || '';
    var contactName = e.parameter.contactName || '';
    var taxId       = e.parameter.taxId       || '';
    var phone       = e.parameter.phone       || '';
    var email       = e.parameter.email       || '';
    var street      = e.parameter.street      || '';
    var city        = e.parameter.city        || '';


    if (!clientName) return ContentService.createTextOutput(JSON.stringify({error:'No name'})).setMimeType(ContentService.MimeType.JSON);


    // Check if tab already exists
    var newSheet = ss.getSheetByName(clientName);
    if (newSheet) return ContentService.createTextOutput(JSON.stringify({status:'exists'})).setMimeType(ContentService.MimeType.JSON);


    // ── v80 FIX: Case-insensitive template lookup ──────────────────────
    var templateSheet = ss.getSheets().find(function(s) {
      var n = s.getName().toLowerCase();
      return n === 'new tamplate' || n === 'new template';
    }) || ss.getSheetByName('GOLMAT');
    // ───────────────────────────────────────────────────────────────────


    // ── v81: Hardcoded headers — never rely on template row 1 values ──────
    var CLIENT_HEADERS = [
      'Job_ID', 'תיאור', 'סטטוס', 'קטגוריה',
      'מחיר ליחידה', 'כמות', 'הערכת שעות', 'שעות בפועל',
      'הכנסה', 'עלויות', 'רווח גולמי', 'רווח לשעה',
      'תאריך התחלה', 'תאריך סיום', 'רכש', 'הערות',
      'יצאה חש', 'הצעת מחיר', 'אתר/מיקום'
    ];
    // ──────────────────────────────────────────────────────────────────────


    if (templateSheet) {
      // Duplicate template — copies formatting, data validations, column widths
      newSheet = templateSheet.copyTo(ss);
      newSheet.setName(clientName);
    } else {
      newSheet = ss.insertSheet(clientName);
    }


    // v83: write headers to row 2, col B — matching GOLMAT structure
    var HEADER_ROW = 2; var HEADER_COL = 2;
    newSheet.getRange(HEADER_ROW, HEADER_COL, 1, CLIENT_HEADERS.length).setValues([CLIENT_HEADERS]);
    newSheet.getRange(HEADER_ROW, HEADER_COL, 1, CLIENT_HEADERS.length).setFontWeight('bold');
    newSheet.setFrozenRows(HEADER_ROW);


    // Generate ID prefix: first 3 letters of client name (no spaces)
    var prefix = clientName.replace(/\s+/g, '').substring(0, 3).toUpperCase();


    // Clear data rows (row 3+), set IDs in col B
    var lastRow = newSheet.getLastRow();
    for (var row = HEADER_ROW + 1; row <= lastRow; row++) {
      for (var col = 1; col <= newSheet.getLastColumn(); col++) {
        var cell = newSheet.getRange(row, col);
        if (!cell.getFormula()) cell.clearContent();
      }
      newSheet.getRange(row, HEADER_COL).setValue(prefix + String(row - HEADER_ROW).padStart(3, '0'));
    }


    // Save to Clients sheet
    var clientSheet = ss.getSheetByName('Clients');
    if (!clientSheet) {
      clientSheet = ss.insertSheet('Clients');
      var cHeaders = ['Name', 'Type', 'Contact', 'Tax ID', 'Phone', 'Email', 'Address', 'City', 'Caspit ID', 'Created'];
      clientSheet.getRange(1, 1, 1, cHeaders.length).setValues([cHeaders]);
    }
    clientSheet.appendRow([clientName, clientType, contactName, taxId, phone, email, street, city, '', new Date()]);


    return ContentService.createTextOutput(JSON.stringify({status:'OK'})).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'updateClientCaspitId') {
    var clientName = e.parameter.name || e.parameter.clientName;
    var caspitId   = e.parameter.caspitId;
    if (!clientName || !caspitId) return ContentService.createTextOutput(JSON.stringify({error:'Missing params'})).setMimeType(ContentService.MimeType.JSON);
    var clientSheet = ss.getSheetByName('Clients');
    if (!clientSheet) return ContentService.createTextOutput(JSON.stringify({error:'No Clients sheet'})).setMimeType(ContentService.MimeType.JSON);
    var data = clientSheet.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0]).toLowerCase() === clientName.toLowerCase()) {
        clientSheet.getRange(r + 1, 9).setValue(caspitId);
        return ContentService.createTextOutput(JSON.stringify({status:'OK'})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({error:'Client not found'})).setMimeType(ContentService.MimeType.JSON);
  }


  // ── v81: Repair missing headers on existing client sheets ─────────────
  if (action === 'diagnose') {
    var report = [];
    ss.getSheets().forEach(function(sheet) {
      var name = sheet.getName();
      var isSys = isSystemSheet(name);
      var row1 = sheet.getRange(1, 1, 1, Math.min(sheet.getLastColumn() || 1, 5)).getValues()[0];
      var row1Str = row1.map(function(v){ return String(v||'').trim(); }).join(' | ');
      var data = sheet.getDataRange().getValues();
      var cols = findColumns(data);
      report.push({ name: name, isSystem: isSys, headerRow: cols.headerRow, jobIdCol: cols.jobId, row1: row1Str });
    });
    return ContentService.createTextOutput(JSON.stringify(report, null, 2)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'repairClientHeaders') {
    var CLIENT_HEADERS = [
      'Job_ID', 'תיאור', 'סטטוס', 'קטגוריה',
      'מחיר ליחידה', 'כמות', 'הערכת שעות', 'שעות בפועל',
      'הכנסה', 'עלויות', 'רווח גולמי', 'רווח לשעה',
      'תאריך התחלה', 'תאריך סיום', 'רכש', 'הערות',
      'יצאה חש', 'הצעת מחיר', 'אתר/מיקום'
    ];
    // v83: row 2, col B — matches GOLMAT structure (headerRow:1, jobId:1)
    var HEADER_ROW = 2; var HEADER_COL = 2;
    var targetName = e.parameter.client || '';
    var repaired = [];
    var sheets = targetName ? [ss.getSheetByName(targetName)].filter(Boolean) : ss.getSheets().filter(function(s) { return !isSystemSheet(s.getName()); });
    sheets.forEach(function(sheet) {
      var data = sheet.getDataRange().getValues();
      var cols = findColumns(data);
      // Fix if no headers OR headers are in wrong position (row 1 col A from previous bad repair)
      var wrongPosition = cols.headerRow === 0 && cols.jobId === 0;
      if (cols.headerRow === -1 || wrongPosition) {
        // Clear wrong row 1 headers if present
        if (wrongPosition) sheet.getRange(1, 1, 1, CLIENT_HEADERS.length + 1).clearContent();
        // Write headers to row 2, col B (matching GOLMAT)
        sheet.getRange(HEADER_ROW, HEADER_COL, 1, CLIENT_HEADERS.length).setValues([CLIENT_HEADERS]);
        sheet.getRange(HEADER_ROW, HEADER_COL, 1, CLIENT_HEADERS.length).setFontWeight('bold');
        sheet.setFrozenRows(HEADER_ROW);
        repaired.push(sheet.getName());
      }
    });
    return ContentService.createTextOutput(JSON.stringify({ repaired: repaired })).setMimeType(ContentService.MimeType.JSON);
  }
  // ── end v81 ────────────────────────────────────────────────────────────


  if (action === 'save') {
    var sheet = ss.getSheetByName('Projects List');
    if (!sheet) sheet = ss.insertSheet('Projects List');
    sheet.getRange('A1').setValue(e.parameter.data);
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  }


  if (action === 'read') {
    var sheet = ss.getSheetByName('Projects List');
    if (!sheet) return ContentService.createTextOutput('No projects').setMimeType(ContentService.MimeType.TEXT);
    return ContentService.createTextOutput(sheet.getRange('A1').getValue()).setMimeType(ContentService.MimeType.TEXT);
  }


  // ── Caspit proxy actions ───────────────────────────────────────────────
  if (action === 'getCaspitContacts') {
    try {
      var workerUrl = 'https://yb-caspit-proxy.sunroof-dictate-39.workers.dev/?action=getContacts';
      var resp = UrlFetchApp.fetch(workerUrl, { muteHttpExceptions: true, deadline: 30 });
      var raw = resp.getContentText();
      var contacts = JSON.parse(raw); // [{Id, Name}]
      if (!Array.isArray(contacts)) throw new Error('Worker returned: ' + raw.slice(0,100));
      var CLIENT_NAME_MAP = {
        'GOLMAT': 'גולמט', 'ROLLMAT': 'רולמט', 'BILLINSKY': 'בילינסקי',
        'MODUL PLADA': 'מודול פלדה', 'SONIC BEAT LTD': 'Sonic Beat',
        'Y.SHAY': 'שי מוצרי', 'עלי העמק': 'עלי העמק',
        'דרך הדהרמה': 'דרך הדהרמה', 'גורילז': 'גורילז',
        'TEST': null, 'Yaniv berg': null
      };
      var resolved = {};
      Object.keys(CLIENT_NAME_MAP).forEach(function(sheetName) {
        var hint = CLIENT_NAME_MAP[sheetName];
        if (hint === null) { resolved[sheetName] = null; return; }
        var match = contacts.find(function(c) { return (c.Name||'').indexOf(hint) !== -1; });
        if (match) resolved[sheetName] = match.Id;
      });
      var logSheet = ss.getSheetByName('Caspit Log') || ss.insertSheet('Caspit Log');
      logSheet.appendRow([new Date(), 'getCaspitContacts via Worker', contacts.length + ' contacts', JSON.stringify(resolved)]);
      return ContentService.createTextOutput(JSON.stringify({ contacts: contacts, resolved: resolved })).setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
  }


  if (action === 'createCaspitDocument') {
    try {
      var token = getCaspitToken();
      if (!token) return ContentService.createTextOutput(JSON.stringify({ error: 'No token' })).setMimeType(ContentService.MimeType.JSON);
      var payloadStr = e.parameter.payload || '{}';
      var payload    = JSON.parse(payloadStr);
      if (!payload.DocumentId) payload.DocumentId = 'YB-' + Date.now();
      if (!payload.DocumentSource) payload.DocumentSource = 2;
      // Route through Cloudflare Worker (Caspit blocks Google IPs)
      var resp = UrlFetchApp.fetch('https://yb-caspit-proxy.sunroof-dictate-39.workers.dev/?action=createDocument', {
        method: 'post', contentType: 'application/json',
        payload: JSON.stringify(payload), muteHttpExceptions: true
      });
      var text = resp.getContentText();
      var logSheet = ss.getSheetByName('Caspit Log') || ss.insertSheet('Caspit Log');
      logSheet.appendRow([new Date(), 'createDocument via Worker', resp.getResponseCode(), text.substring(0,200)]);
      var result;
      try { result = JSON.parse(text); } catch(ex) { result = { raw: text }; }
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
  }


  if (action === 'getCaspitTokenDirect') {
    // Route through Worker testAuth instead of calling Caspit directly
    try {
      var resp = UrlFetchApp.fetch('https://yb-caspit-proxy.sunroof-dictate-39.workers.dev/?action=testAuth', { muteHttpExceptions: true });
      return ContentService.createTextOutput(resp.getContentText()).setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({error: err.toString()})).setMimeType(ContentService.MimeType.JSON);
    }
  }


  if (action === 'initCaspitOpenToken') {
    try {
      var token = e.parameter.t || PropertiesService.getScriptProperties().getProperty('CASPIT_TOKEN') || '';
      if (!token) return ContentService.createTextOutput('No token. Use ?t=YOUR_TOKEN').setMimeType(ContentService.MimeType.TEXT);
      var resp = UrlFetchApp.fetch('https://app.caspit.biz/api/v1/OpenAPIToken?token=' + encodeURIComponent(token), { muteHttpExceptions: true });
      var text = resp.getContentText();
      var accessMatch      = text.match(/<AccessToken>([^<]+)<\/AccessToken>/);
      var refreshMatch     = text.match(/<RefreshToken>([^<]+)<\/RefreshToken>/);
      var accessDateMatch  = text.match(/<AccessTokenValidDate>([^<]+)<\/AccessTokenValidDate>/);
      var refreshDateMatch = text.match(/<RefreshTokenValidDate>([^<]+)<\/RefreshTokenValidDate>/);
      if (accessMatch && refreshMatch) {
        var props = PropertiesService.getScriptProperties();
        props.setProperty('CASPIT_ACCESS_TOKEN',  accessMatch[1].trim());
        props.setProperty('CASPIT_REFRESH_TOKEN', refreshMatch[1].trim());
        props.setProperty('CASPIT_ACCESS_VALID',  accessDateMatch  ? accessDateMatch[1].trim()  : '');
        props.setProperty('CASPIT_REFRESH_VALID', refreshDateMatch ? refreshDateMatch[1].trim() : '');
        return ContentService.createTextOutput('OpenAPIToken initialized!\nAccess valid: ' + (accessDateMatch ? accessDateMatch[1] : '?') + '\nRefresh valid: ' + (refreshDateMatch ? refreshDateMatch[1] : '?')).setMimeType(ContentService.MimeType.TEXT);
      }
      return ContentService.createTextOutput('Failed: ' + text.substring(0,300)).setMimeType(ContentService.MimeType.TEXT);
    } catch(err) {
      return ContentService.createTextOutput('Error: ' + err).setMimeType(ContentService.MimeType.TEXT);
    }
  }
  // ── end Caspit ─────────────────────────────────────────────────────────


  if (action === 'getProfitByCategory') {
    var cats = {};
    ss.getSheets().forEach(function(sheet) {
      var name = sheet.getName();
      if (isSystemSheet(name)) return;
      var data = sheet.getDataRange().getValues();
      var cols = findColumns(data);
      if (cols.headerRow === -1) return;
      for (var r = cols.headerRow + 1; r < data.length; r++) {
        var jobId  = String(data[r][cols.jobId]  || '').trim();
        var status = String(data[r][cols.status]  || '').trim();
        if (!jobId || status !== 'בוצע') continue;
        var cat = cols.category  !== -1 ? String(data[r][cols.category]  || '').trim() : '';
        var gp  = cols.grossProfit !== -1 ? (parseFloat(data[r][cols.grossProfit]) || 0) : 0;
        var hrs = cols.hoursActual !== -1 ? (parseFloat(data[r][cols.hoursActual]) || 0) : 0;
        var inc = cols.income !== -1 ? (parseFloat(data[r][cols.income]) || 0) : 0;
        if (!cat) cat = 'ללא קטגוריה';
        if (!cats[cat]) cats[cat] = { category: cat, totalProfit: 0, totalHours: 0, totalIncome: 0, jobCount: 0 };
        cats[cat].totalProfit += gp;
        cats[cat].totalHours  += hrs;
        cats[cat].totalIncome += inc;
        cats[cat].jobCount++;
      }
    });
    var result = Object.values(cats).map(function(c) {
      return {
        category:     c.category,
        jobCount:     c.jobCount,
        totalProfit:  Math.round(c.totalProfit),
        totalIncome:  Math.round(c.totalIncome),
        totalHours:   Math.round(c.totalHours * 10) / 10,
        profitPerHour: c.totalHours > 0 ? Math.round(c.totalProfit / c.totalHours) : 0
      };
    }).sort(function(a,b){ return b.profitPerHour - a.profitPerHour; });
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getAIAnalysis') {
    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) return ContentService.createTextOutput(JSON.stringify({error:'GEMINI_API_KEY not set in Script Properties'})).setMimeType(ContentService.MimeType.JSON);
    var dataRaw = e.parameter.data || '[]';
    var prompt = 'You are a business advisor for a field maintenance company in Israel. ' +
      'Analyze the following profitability data by job category and provide clear, actionable insights in Hebrew. ' +
      'Data is from completed jobs: category name, job count, total gross profit, total hours worked, profit per hour. ' +
      'Be direct and specific. Write in plain Hebrew prose — NO markdown, NO asterisks, NO bold, NO numbered lists, NO headers. ' +
      'Cover: 1) Most profitable category and why. 2) Category to avoid or reprice. 3) One clear action this week. ' +
      'Keep it under 120 words. Use ₪ for currency. ' +
      'Data: ' + dataRaw;
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
    var resp = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 800, thinkingConfig: { thinkingBudget: 0 } } }),
      muteHttpExceptions: true, deadline: 30
    });
    var _rawR = resp.getContentText();
    var _resR; try { _resR = JSON.parse(_rawR); } catch(_ep) { _resR = {}; }
    var text = '';
    if (_resR.error) { text = 'שגיאה: ' + (_resR.error.message||JSON.stringify(_resR.error)); }
    else { try { var _c=(_resR.candidates||[])[0]; if(_c){var _ct=_c.content; if(typeof _ct==='string'){text=_ct;}else if(_ct&&_ct.parts&&_ct.parts[0]){text=_ct.parts[0].text||'';} if(!text&&_c.finishReason&&_c.finishReason!=='STOP'){text='בוצע חסימה: '+_c.finishReason;}} } catch(_ep2){text='';} }
    return ContentService.createTextOutput(JSON.stringify({text: text})).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getDeepJobData') {
    var jobs = [];
    ss.getSheets().forEach(function(sheet) {
      var name = sheet.getName();
      if (isSystemSheet(name)) return;
      var data = sheet.getDataRange().getValues();
      var cols = findColumns(data);
      if (cols.headerRow === -1) return;
      for (var r = cols.headerRow + 1; r < data.length; r++) {
        var jobId  = String(data[r][cols.jobId]  || '').trim();
        var status = String(data[r][cols.status]  || '').trim();
        if (!jobId || status !== 'בוצע') continue;
        var desc    = cols.desc       !== -1 ? String(data[r][cols.desc]       || '').trim() : '';
        var cat     = cols.category   !== -1 ? String(data[r][cols.category]   || '').trim() : '';
        var notes   = cols.notes      !== -1 ? String(data[r][cols.notes]      || '').trim() : '';
        var hrs     = cols.hoursActual !== -1 ? (parseFloat(data[r][cols.hoursActual]) || 0) : 0;
        var gp      = cols.grossProfit !== -1 ? (parseFloat(data[r][cols.grossProfit]) || 0) : 0;
        var income  = cols.income     !== -1 ? (parseFloat(data[r][cols.income])      || 0) : 0;
        var pph     = hrs > 0 ? Math.round(gp / hrs) : 0;
        jobs.push({
          id: jobId, client: name,
          desc: desc, cat: cat, notes: notes,
          hrs: Math.round(hrs * 10) / 10,
          income: Math.round(income),
          gp: Math.round(gp),
          pph: pph
        });
      }
    });
    return ContentService.createTextOutput(JSON.stringify(jobs)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getDeepAggregatedData') {
    var jobs2 = [];
    ss.getSheets().forEach(function(sheet) {
      var name = sheet.getName();
      if (isSystemSheet(name)) return;
      var data = sheet.getDataRange().getValues();
      var cols = findColumns(data);
      if (cols.headerRow === -1) return;
      for (var r = cols.headerRow + 1; r < data.length; r++) {
        var jobId  = String(data[r][cols.jobId]  || '').trim();
        var status = String(data[r][cols.status]  || '').trim();
        if (!jobId || status !== 'בוצע') continue;
        var desc  = cols.desc       !== -1 ? String(data[r][cols.desc]       || '').trim().slice(0,60) : '';
        var cat   = cols.category   !== -1 ? String(data[r][cols.category]   || '').trim() : '';
        var hrs   = cols.hoursActual !== -1 ? (parseFloat(data[r][cols.hoursActual]) || 0) : 0;
        var gp    = cols.grossProfit !== -1 ? (parseFloat(data[r][cols.grossProfit]) || 0) : 0;
        var income= cols.income     !== -1 ? (parseFloat(data[r][cols.income])      || 0) : 0;
        var dateEnd = cols.dateEnd  !== -1 ? String(data[r][cols.dateEnd] || '').trim() : '';
        if (!desc && !cat) continue;
        jobs2.push({ client:name, cat:cat||'ללא', hrs:Math.round(hrs*10)/10, gp:Math.round(gp), income:Math.round(income), date:dateEnd });
      }
    });
    var byCat2 = {}, byClient2 = {};
    jobs2.forEach(function(j) {
      if (!byCat2[j.cat]) byCat2[j.cat] = {count:0,hrs:0,income:0,gp:0,clients:{}};
      byCat2[j.cat].count++; byCat2[j.cat].hrs+=j.hrs; byCat2[j.cat].income+=j.income; byCat2[j.cat].gp+=j.gp; byCat2[j.cat].clients[j.client]=true;
      if (!byClient2[j.client]) byClient2[j.client] = {count:0,hrs:0,gp:0,cats:{}};
      byClient2[j.client].count++; byClient2[j.client].hrs+=j.hrs; byClient2[j.client].gp+=j.gp; byClient2[j.client].cats[j.cat]=true;
    });
    var catStats2 = Object.keys(byCat2).map(function(c){ var x=byCat2[c]; return {cat:c,count:x.count,hrs:Math.round(x.hrs),income:Math.round(x.income),gp:Math.round(x.gp),gpph:x.hrs>0?Math.round(x.gp/x.hrs):0,clients:Object.keys(x.clients).length}; }).sort(function(a,b){return b.gp-a.gp;});
    var clientStats2 = Object.keys(byClient2).map(function(c){ var x=byClient2[c]; return {client:c,count:x.count,hrs:Math.round(x.hrs),gp:Math.round(x.gp),gpph:x.hrs>0?Math.round(x.gp/x.hrs):0,cats:Object.keys(x.cats).join(',')}; }).sort(function(a,b){return b.gp-a.gp;});
    var recentTrend2 = jobs2.filter(function(j){return j.date;}).sort(function(a,b){return a.date>b.date?-1:1;}).slice(0,12).map(function(j){return j.cat+':'+j.gp+'₪/'+j.hrs+'h';});
    var payload = {totalJobs:jobs2.length,clients:Object.keys(byClient2).length,categories:catStats2,clientSummary:clientStats2,recentTrend:recentTrend2};
    CacheService.getScriptCache().put('yb_deep_data', JSON.stringify(payload), 300);
    return ContentService.createTextOutput(JSON.stringify({ok:true, totalJobs:payload.totalJobs, clients:payload.clients})).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getAIDeepAnalysis') {
    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) return ContentService.createTextOutput(JSON.stringify({error:'GEMINI_API_KEY not set'})).setMimeType(ContentService.MimeType.JSON);


    // Read pre-aggregated data from server-side cache (stored by getDeepAggregatedData)
    var cached = CacheService.getScriptCache().get('yb_deep_data');
    if (!cached) return ContentService.createTextOutput(JSON.stringify({error:'Cache expired — tap analyze again'})).setMimeType(ContentService.MimeType.JSON);
    var dataPayload;
    try { dataPayload = JSON.parse(cached); } catch(ep) { return ContentService.createTextOutput(JSON.stringify({error:'Cache parse error'})).setMimeType(ContentService.MimeType.JSON); }


    var surveyContext = '';
    var prompt =
      'You are a business intelligence analyst for a field maintenance company in Israel (owner: Yaniv). ' +
      'Analyze the following aggregated business data (' + (dataPayload.totalJobs||'?') + ' completed jobs, ' + (dataPayload.clients||'?') + ' clients). ' +
      'Return ONLY valid JSON. IMPORTANT: summary and details must be STRINGS (not arrays). Use \\n for line breaks. ' +
      'Format: {"sections":[{"key":"profitable","summary":"line1\\nline2","details":"• bullet1\\n• bullet2"},{"key":"categories","summary":"...","details":"..."},{"key":"clients","summary":"...","details":"..."},{"key":"notes","summary":"...","details":"..."},{"key":"underpriced","summary":"...","details":"..."},{"key":"progress","summary":"...","details":"..."},{"key":"action","summary":"...","details":"..."}]} ' +
      'Keys exactly: profitable, categories, clients, notes, underpriced, progress, action. ' +
      'summary: 1-2 Hebrew lines, max 80 chars each. details: 2-3 Hebrew bullets, max 70 chars each. All in Hebrew. ' +
      '\n\nBusiness data:\n' + JSON.stringify(dataPayload);


    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
    var resp = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 4000, temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } } }),
      muteHttpExceptions: true,
      deadline: 50
    });
    var _rawR = resp.getContentText();
    var _resR; try { _resR = JSON.parse(_rawR); } catch(_ep) { _resR = {}; }
    var text = '';
    if (_resR.error) { text = 'שגיאה: ' + (_resR.error.message||JSON.stringify(_resR.error)); }
    else { try { var _c=(_resR.candidates||[])[0]; if(_c){var _ct=_c.content; if(typeof _ct==='string'){text=_ct;}else if(_ct&&_ct.parts&&_ct.parts[0]){text=_ct.parts[0].text||'';} if(!text&&_c.finishReason&&_c.finishReason!=='STOP'){text='בוצע חסימה: '+_c.finishReason;}} } catch(_ep2){text='';} }
    // Strip markdown code blocks if Gemini wrapped the JSON
    var cleanText = text.trim().replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
    var parsed = null;
    try { parsed = JSON.parse(cleanText); } catch(e) { parsed = null; }
    return ContentService.createTextOutput(JSON.stringify({ text: text, parsed: parsed, jobCount: dataPayload.totalJobs||0, clients: dataPayload.clients||0 })).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getAIBriefing') {
    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) return ContentService.createTextOutput(JSON.stringify({error:'GEMINI_API_KEY not set'})).setMimeType(ContentService.MimeType.JSON);
    var todayRaw = e.parameter.projects || '[]';
    var todayProjects;
    try { todayProjects = JSON.parse(todayRaw); } catch(err) { todayProjects = []; }
    if (!todayProjects.length) return ContentService.createTextOutput(JSON.stringify({error:'No projects'})).setMimeType(ContentService.MimeType.JSON);


    // Fetch historical jobs for these clients
    var history = {};
    todayProjects.forEach(function(p) { if (p.client && !history[p.client]) history[p.client] = []; });


    ss.getSheets().forEach(function(sheet) {
      var name = sheet.getName();
      if (!history[name]) return;
      var data = sheet.getDataRange().getValues();
      var cols = findColumns(data);
      if (cols.headerRow === -1) return;
      for (var r = cols.headerRow + 1; r < data.length; r++) {
        var jobId = String(data[r][cols.jobId] || '').trim();
        var status = String(data[r][cols.status] || '').trim();
        if (!jobId || status !== 'בוצע') continue;
        var desc  = cols.desc       !== -1 ? String(data[r][cols.desc]       || '').trim() : '';
        var cat   = cols.category   !== -1 ? String(data[r][cols.category]   || '').trim() : '';
        var hrs   = cols.hoursActual !== -1 ? (parseFloat(data[r][cols.hoursActual]) || 0) : 0;
        var estH  = cols.estHours   !== -1 ? (parseFloat(data[r][cols.estHours])    || 0) : 0;
        var gp    = cols.grossProfit !== -1 ? (parseFloat(data[r][cols.grossProfit]) || 0) : 0;
        var notes = cols.notes      !== -1 ? String(data[r][cols.notes]      || '').trim() : '';
        history[name].push({ desc:desc, cat:cat, hrs:Math.round(hrs*10)/10, estH:Math.round(estH*10)/10, gp:Math.round(gp), notes:notes });
      }
    });


    // Fetch survey history for today's projects
    var bSurveyData = { pre: [], post: [] };
    todayProjects.forEach(function(tp) {
      try {
        var url = ScriptApp.getService().getUrl() + '?action=getSurveyData&client=' + encodeURIComponent(tp.client||'') + '&cat=' + encodeURIComponent(tp.cat||'');
        var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        var d = JSON.parse(r.getContentText());
        if (d.pre) bSurveyData.pre = bSurveyData.pre.concat(d.pre.slice(0,3));
        if (d.post) bSurveyData.post = bSurveyData.post.concat(d.post.slice(0,3));
      } catch(e) {}
    });


    var prompt =
      'You are a field maintenance work advisor. Owner: Yaniv, Israel. ' +
      'Today he has these projects: ' + JSON.stringify(todayProjects) + '. ' +
      'Historical completed jobs per client: ' + JSON.stringify(history) + '. ' +
      'Pre-project surveys for similar past jobs (his planned strategy + materials): ' + JSON.stringify(bSurveyData.pre) + '. ' +
      'Post-project surveys for similar past jobs (actual tools used, issues encountered, ratings): ' + JSON.stringify(bSurveyData.post) + '. ' +
      'Return ONLY valid JSON, no markdown, no backticks: ' +
      '{"projects":[{"tip":"2 Hebrew lines with specific advice based on history for this client/type of work"}],"tools":[{"n":"tool name in Hebrew","p":"short Hebrew purpose - what it is for on these jobs"},...],"warning":"Hebrew warning about workload or timing if relevant, or empty string"} ' +
      'projects array must match the order of today projects. tools = specific tools in Hebrew based on the job types; each tool MUST include n (name) and p (a short purpose, 2-5 words, why it is needed today). warning = if total hours > 6 or history shows overruns. All Hebrew.';


    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
    var resp = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 2000, thinkingConfig: { thinkingBudget: 0 } } }),
      muteHttpExceptions: true, deadline: 30
    });
    var _rawR = resp.getContentText();
    var _resR; try { _resR = JSON.parse(_rawR); } catch(_ep) { _resR = {}; }
    var text = '';
    if (_resR.error) { text = 'שגיאה: ' + (_resR.error.message||JSON.stringify(_resR.error)); }
    else { try { var _c=(_resR.candidates||[])[0]; if(_c){var _ct=_c.content; if(typeof _ct==='string'){text=_ct;}else if(_ct&&_ct.parts&&_ct.parts[0]){text=_ct.parts[0].text||'';} if(!text&&_c.finishReason&&_c.finishReason!=='STOP'){text='בוצע חסימה: '+_c.finishReason;}} } catch(_ep2){text='';} }
    // Strip markdown code blocks if Gemini wrapped the JSON
    var cleanText = text.trim().replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
    var parsed = null;
    try { parsed = JSON.parse(cleanText); } catch(e) { parsed = null; }
    return ContentService.createTextOutput(JSON.stringify({ text:text, parsed:parsed })).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getAISessionTips') {
    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) return ContentService.createTextOutput(JSON.stringify({error:'GEMINI_API_KEY not set'})).setMimeType(ContentService.MimeType.JSON);
    var projectsRaw = e.parameter.projects || '[]';
    var totalHrs = parseFloat(e.parameter.totalHrs || 0);
    var sessionProjects;
    try { sessionProjects = JSON.parse(projectsRaw); } catch(err) { sessionProjects = []; }
    if (!sessionProjects.length) return ContentService.createTextOutput(JSON.stringify({error:'No projects'})).setMimeType(ContentService.MimeType.JSON);


    // Fetch history for these clients
    var history = {};
    sessionProjects.forEach(function(p) { if (p.client && !history[p.client]) history[p.client] = []; });
    ss.getSheets().forEach(function(sheet) {
      var name = sheet.getName();
      if (!history[name]) return;
      var data = sheet.getDataRange().getValues();
      var cols = findColumns(data);
      if (cols.headerRow === -1) return;
      var count = 0;
      for (var r = cols.headerRow + 1; r < data.length && count < 30; r++) {
        var jobId = String(data[r][cols.jobId] || '').trim();
        var status = String(data[r][cols.status] || '').trim();
        if (!jobId || status !== 'בוצע') continue;
        var desc  = cols.desc        !== -1 ? String(data[r][cols.desc]        || '').trim() : '';
        var cat   = cols.category    !== -1 ? String(data[r][cols.category]    || '').trim() : '';
        var hrs   = cols.hoursActual !== -1 ? (parseFloat(data[r][cols.hoursActual]) || 0) : 0;
        var estH  = cols.estHours    !== -1 ? (parseFloat(data[r][cols.estHours])    || 0) : 0;
        var gp    = cols.grossProfit !== -1 ? (parseFloat(data[r][cols.grossProfit]) || 0) : 0;
        var notes = cols.notes       !== -1 ? String(data[r][cols.notes]       || '').trim() : '';
        history[name].push({ desc:desc, cat:cat, hrs:Math.round(hrs*10)/10, estH:Math.round(estH*10)/10, gp:Math.round(gp), notes:notes });
        count++;
      }
    });


    var myToolbox = e.parameter.toolbox ? JSON.parse(e.parameter.toolbox) : [];
    var categoryTools = e.parameter.categoryTools ? JSON.parse(e.parameter.categoryTools) : {};


    // Fetch survey data for session projects
    var sSurveys = { pre:[], post:[] };
    sessionProjects.forEach(function(sp) {
      try {
        var sUrl = ScriptApp.getService().getUrl() + '?action=getSurveyData&client=' + encodeURIComponent(sp.client||'') + '&cat=' + encodeURIComponent(sp.cat||'');
        var sr = UrlFetchApp.fetch(sUrl, { muteHttpExceptions: true });
        var sd = JSON.parse(sr.getContentText());
        if (sd.pre) sSurveys.pre = sSurveys.pre.concat(sd.pre.slice(0,3));
        if (sd.post) sSurveys.post = sSurveys.post.concat(sd.post.slice(0,3));
      } catch(e2) {}
    });


    // Fetch weather (include for outdoor sessions)
    var sessWeather = fetchCurrentWeather();
    var sessWeatherCtx = sessWeather ? 'Current weather: ' + sessWeather.summary + '. Factor into advice for any outdoor projects. ' : '';


    var dayCtx = e.parameter.dayContext ? JSON.parse(e.parameter.dayContext) : {};
    var hoursLeft = dayCtx.hoursLeftInDay || '?';
    var timeNow   = dayCtx.timeOfDay || '';


    var prompt =
      'You are a real-time WORK DAY CONSULTANT for Yaniv, a field maintenance operator in Israel. ' +
      'You have FULL context of his day. Current time: ' + timeNow + '. Estimated hours left in workday: ' + hoursLeft + 'h. ' +
      'Day summary: ' + (dayCtx.totalToday||0) + ' projects total, ' + (dayCtx.completed||0) + ' done, ' + (dayCtx.active||0) + ' active, ' + (dayCtx.paused||0) + ' paused. ' +
      sessWeatherCtx +
      'He is currently working on these projects: ' + JSON.stringify(sessionProjects) + '. ' +
      'Total accumulated hours: ' + totalHrs + '. ' +
      'Historical data for these clients: ' + JSON.stringify(history) + '. ' +
      'His toolbox: ' + JSON.stringify(myToolbox) + '. ' +
      'Category tools learned: ' + JSON.stringify(categoryTools) + '. ' +
      'Pre-project surveys (planned strategies for similar past jobs): ' + JSON.stringify(sSurveys.pre) + '. ' +
      'Post-project surveys (what actually happened — tools used, issues, ratings): ' + JSON.stringify(sSurveys.post) + '. ' +
      'For each project, also consider: pre-survey conditions (height work, outdoor, agreement needed, height docs), and done tips list (tips already actioned — do NOT repeat these). ' +
      'Return ONLY valid JSON, no markdown: ' +
      '{"projects":[{"desc":"project description","summary":"2-3 Hebrew lines: progress + specific tip + any safety/condition alerts","tools":[{"n":"כלי","p":"מטרה קצרה"},...],"missing_tools":[{"n":"כלי חסר","p":"מטרה קצרה"},...]}],"tips":[{"type":"warning|good|note|focus","title":"short Hebrew title","body":"2 Hebrew lines"}]} ' +
      'Every tool in tools and missing_tools MUST be an object with n (Hebrew name) and p (short Hebrew purpose, 2-5 words, what it is for on this job). ' +
      'For each project: use pre-survey data (height work → safety tips, outdoor → weather impact, agreement → remind to sign). Exclude done tips. ' +
      'Global tips (3-5): prioritization for remaining day time, workload vs hours left, any urgent items. All Hebrew.';


    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
    var resp = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 2000, thinkingConfig: { thinkingBudget: 0 } } }),
      muteHttpExceptions: true, deadline: 30
    });
    var _rawR = resp.getContentText();
    var _resR; try { _resR = JSON.parse(_rawR); } catch(_ep) { _resR = {}; }
    var text = '';
    if (_resR.error) { text = 'שגיאה: ' + (_resR.error.message||JSON.stringify(_resR.error)); }
    else { try { var _c=(_resR.candidates||[])[0]; if(_c){var _ct=_c.content; if(typeof _ct==='string'){text=_ct;}else if(_ct&&_ct.parts&&_ct.parts[0]){text=_ct.parts[0].text||'';} if(!text&&_c.finishReason&&_c.finishReason!=='STOP'){text='בוצע חסימה: '+_c.finishReason;}} } catch(_ep2){text='';} }
    // Strip markdown code blocks if Gemini wrapped the JSON
    var cleanText = text.trim().replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
    var parsed = null;
    try { parsed = JSON.parse(cleanText); } catch(e) { parsed = null; }
    return ContentService.createTextOutput(JSON.stringify({ text:text, parsed:parsed })).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'saveProjectSurvey') {
    if (request.method !== 'POST') return ContentService.createTextOutput(JSON.stringify({error:'POST required'})).setMimeType(ContentService.MimeType.JSON);
    var body; try { body = JSON.parse(request.postData.contents); } catch(e) { return ContentService.createTextOutput(JSON.stringify({error:'Invalid JSON'})).setMimeType(ContentService.MimeType.JSON); }
    // Get or create Job Surveys sheet
    var surveySheet = ss.getSheetByName('Job Surveys');
    if (!surveySheet) {
      surveySheet = ss.insertSheet('Job Surveys');
      surveySheet.appendRow(['Date','JobID','Client','Description','Category','Hours','Rating','Tools Used','Process Steps','Issues','Issue Notes']);
      surveySheet.getRange(1,1,1,11).setFontWeight('bold').setBackground('#263238').setFontColor('#ffffff');
    }
    surveySheet.appendRow([
      body.date || '',
      body.jobId || '',
      body.client || '',
      body.desc || '',
      body.cat || '',
      body.hrs || 0,
      body.rating || 0,
      (body.toolsUsed || []).join(', '),
      (body.steps || []).join(', '),
      (body.issues || []).join(', '),
      body.issueText || ''
    ]);
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'savePreProjectSurvey') {
    if (request.method !== 'POST') return ContentService.createTextOutput(JSON.stringify({error:'POST required'})).setMimeType(ContentService.MimeType.JSON);
    var body; try { body = JSON.parse(request.postData.contents); } catch(e) { return ContentService.createTextOutput(JSON.stringify({error:'Invalid JSON'})).setMimeType(ContentService.MimeType.JSON); }
    var sheet = ss.getSheetByName('Pre-Project Surveys');
    if (!sheet) {
      sheet = ss.insertSheet('Pre-Project Surveys');
      sheet.appendRow(['Date','JobID','Client','Description','Category','Strategy Steps','Key for Success','Planned Tools','Materials','Height Work','Workers','Location','Power Supply','Agreement Needed','Height Docs OK']);
      sheet.getRange(1,1,1,15).setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');
    }
    sheet.appendRow([
      body.date||'', body.jobId||'', body.client||'', body.desc||'', body.cat||'',
      (body.steps||[]).join(' → '),
      (body.keys||[]).join(', '),
      (body.tools||[]).join(', '),
      (body.materials||[]).join(', '),
      body.heightWork||'', body.workers||'', body.location||'', body.powerSupply||'', body.needAgreement||'', body.heightDocs||''
    ]);
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getSurveyData') {
    var result = { pre: [], post: [] };
    var clientFilter = e.parameter.client || '';
    var catFilter    = e.parameter.cat    || '';


    // Read Pre-Project Surveys
    var preSheet = ss.getSheetByName('Pre-Project Surveys');
    if (preSheet) {
      var preData = preSheet.getDataRange().getValues();
      for (var r = 1; r < preData.length; r++) {
        var row = preData[r];
        if (!row[0]) continue;
        if ((clientFilter && String(row[2]).indexOf(clientFilter) === -1) &&
            (catFilter    && String(row[4]).indexOf(catFilter)    === -1)) continue;
        result.pre.push({ date:row[0], client:row[2], desc:row[3], cat:row[4], steps:row[5], keys:row[6], tools:row[7], materials:row[8] });
      }
    }


    // Read Job Surveys (post-project)
    var postSheet = ss.getSheetByName('Job Surveys');
    if (postSheet) {
      var postData = postSheet.getDataRange().getValues();
      for (var r = 1; r < postData.length; r++) {
        var row = postData[r];
        if (!row[0]) continue;
        if ((clientFilter && String(row[2]).indexOf(clientFilter) === -1) &&
            (catFilter    && String(row[4]).indexOf(catFilter)    === -1)) continue;
        result.post.push({ date:row[0], client:row[2], desc:row[3], cat:row[4], hrs:row[5], rating:row[6], tools:row[7], steps:row[8], issues:row[9], issueNotes:row[10] });
      }
    }


    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'analyzeJobForPreSurvey') {
    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) return ContentService.createTextOutput(JSON.stringify({error:'GEMINI_API_KEY not set'})).setMimeType(ContentService.MimeType.JSON);
    var desc     = e.parameter.desc     || '';
    var cat      = e.parameter.cat      || '';
    var client   = e.parameter.client   || '';
    var jobNotes = e.parameter.notes    || '';


    // Read past lessons from Lessons Learned sheet
    var pastLessons = [];
    var llSheet = ss.getSheetByName('Lessons Learned');
    if (llSheet) {
      var llData = llSheet.getDataRange().getValues();
      // Scan newest-first, match by category (exact) or partial
      for (var li = llData.length - 1; li >= 1 && pastLessons.length < 3; li--) {
        var llRow = llData[li];
        var llCat = String(llRow[3]||'').trim();
        if (!cat || llCat === cat || (cat && llCat.indexOf(cat) !== -1)) {
          pastLessons.push({
            desc:      String(llRow[4]||'').slice(0,80),
            client:    String(llRow[2]||''),
            outcome:   String(llRow[8]||''),
            actualHrs: llRow[5]||0,
            estHrs:    llRow[6]||0,
            materials: String(llRow[9]||'').slice(0,100),
            steps:     String(llRow[10]||'').slice(0,150),
            notes:     String(llRow[13]||'').slice(0,250)
          });
        }
      }
    }


    var pastContext = pastLessons.length
      ? '\n\nPAST SIMILAR JOBS (category: ' + cat + ') — use to improve estimate and steps:\n' +
        pastLessons.map(function(l, idx) {
          return (idx+1) + '. "' + l.desc + '" | ' + (l.outcome||'success') +
            ' | ' + l.actualHrs + 'h actual / ' + l.estHrs + 'h est' +
            (l.materials ? '\n   Materials: ' + l.materials : '') +
            (l.steps ? '\n   Steps: ' + l.steps : '') +
            (l.notes ? '\n   Field notes from that job: ' + l.notes : '');
        }).join('\n')
      : '';


    var prompt =
      'You are a field maintenance project planner in Israel. ' +
      'Analyze this job and create a pre-project briefing. ' +
      'Job description: "' + desc + '". ' +
      'Category: ' + cat + '. Client: ' + client + '. ' +
      (jobNotes ? 'Additional notes: "' + jobNotes + '". ' : '') +
      pastContext +
      '\nReturn ONLY valid JSON, no markdown: ' +
      '{"descSummary":"2 Hebrew lines summarizing what this job involves and what success looks like",' +
      '"steps":["4-6 specific Hebrew steps derived from the description — break it into logical work phases"],' +
      '"keys":["3-5 Hebrew key success factors specific to THIS job"],' +
      '"tools":["Hebrew tool names needed for this specific job"],' +
      '"materials":["specific materials/parts needed based on the description"]}' +
      ' Be specific — extract real info from the description. If past similar jobs exist, use their steps/materials as starting point.';


    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
    var resp = UrlFetchApp.fetch(url, { method:'post', contentType:'application/json', payload:JSON.stringify({ contents:[{ parts:[{ text:prompt }] }], generationConfig:{ maxOutputTokens:2000, thinkingConfig:{ thinkingBudget:0 } } }), muteHttpExceptions:true });
    var _rawR = resp.getContentText();
    var _resR; try { _resR = JSON.parse(_rawR); } catch(_ep) { _resR = {}; }
    var text = '';
    if (_resR.error) { text = 'שגיאה: ' + (_resR.error.message||JSON.stringify(_resR.error)); }
    else { try { var _c=(_resR.candidates||[])[0]; if(_c){var _ct=_c.content; if(typeof _ct==='string'){text=_ct;}else if(_ct&&_ct.parts&&_ct.parts[0]){text=_ct.parts[0].text||'';} if(!text&&_c.finishReason&&_c.finishReason!=='STOP'){text='בוצע חסימה: '+_c.finishReason;}} } catch(_ep2){text='';} }
    var cleanText = text.trim().replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
    var parsed = null;
    try { parsed = JSON.parse(cleanText); } catch(e2) { parsed = null; }
    return ContentService.createTextOutput(JSON.stringify({ text:text, parsed:parsed })).setMimeType(ContentService.MimeType.JSON);
  }
// Apps Script v199 patch — ADD this as a new action inside doGet(e).
// Paste it right after the existing 'analyzeJobForPreSurvey' block (search for
// "if (action === 'analyzeJobForPreSurvey')" and its closing '}', then paste this
// new block immediately after).
//
// What it does differently from analyzeJobForPreSurvey:
// - Accepts MULTIPLE lines (one per quotation row) instead of one description.
// - Returns lineSteps: an array of step-arrays, one per line — each line gets its
//   own working strategy instead of sharing one set across the whole quote.
// - tools/materials are grounded in THIS CLIENT's actual past job history (desc +
//   any tools/materials logged in Job Surveys for that client), not the category-wide
//   localStorage list that previously caused "same tools every time" regardless of
//   what the specific job actually needs. When no relevant history exists, the AI is
//   free to suggest fresh from the description text alone.
// - keys (Key for Success) stay shared across the whole quote, same as before.


  if (action === 'analyzeQuotationLines') {
    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) return ContentService.createTextOutput(JSON.stringify({error:'GEMINI_API_KEY not set'})).setMimeType(ContentService.MimeType.JSON);


    var linesRaw = e.parameter.lines || '[]';
    var lines;
    try { lines = JSON.parse(linesRaw); } catch(errL) { lines = []; }
    if (!Array.isArray(lines)) lines = [];
    lines = lines.filter(function(l){ return String(l||'').trim(); });
    if (!lines.length) return ContentService.createTextOutput(JSON.stringify({error:'No lines'})).setMimeType(ContentService.MimeType.JSON);


    var cat    = e.parameter.cat    || '';
    var client = e.parameter.client || '';


    // ── Pull this client's real job history: description + any logged tools/materials ──
    var clientJobHistory = []; // {desc}
    var clientSurveyHistory = []; // {desc, tools} from Job Surveys (post-project, what was actually used)
    if (client) {
      var clientSheet = ss.getSheetByName(client);
      if (clientSheet) {
        var cData = clientSheet.getDataRange().getValues();
        var cCols = findColumns(cData);
        if (cCols.headerRow !== -1) {
          for (var cr = cCols.headerRow + 1; cr < cData.length && clientJobHistory.length < 15; cr++) {
            var cDesc = cCols.desc !== -1 ? String(cData[cr][cCols.desc]||'').trim() : '';
            var cStat = cCols.status !== -1 ? String(cData[cr][cCols.status]||'').trim() : '';
            if (!cDesc || cStat !== 'בוצע') continue;
            if (cat) {
              var cCat = cCols.category !== -1 ? String(cData[cr][cCols.category]||'').trim() : '';
              if (cCat && cCat !== cat) continue; // prefer same-category history when category is known
            }
            clientJobHistory.push({ desc: cDesc.slice(0,100) });
          }
        }
      }
      // Job Surveys sheet logs actual tools/materials used per job (post-project reality, not guesses)
      var jsSheet = ss.getSheetByName('Job Surveys');
      if (jsSheet) {
        var jsData = jsSheet.getDataRange().getValues();
        // columns: Date, JobID, Client, Description, Category, Hours, Rating, Tools Used, Process Steps, Issues, Issue Notes
        for (var jr = 1; jr < jsData.length && clientSurveyHistory.length < 10; jr++) {
          var jClient = String(jsData[jr][2]||'').trim();
          if (jClient !== client) continue;
          var jDesc  = String(jsData[jr][3]||'').trim();
          var jTools = String(jsData[jr][7]||'').trim();
          if (!jDesc) continue;
          clientSurveyHistory.push({ desc: jDesc.slice(0,100), tools: jTools });
        }
      }
    }


    var numbered = lines.map(function(l, ix){ return (ix+1) + '. ' + l; }).join('\n');


    var prompt =
      'You are a field maintenance project planner for an Israeli contractor (י.ב אחזקות). ' +
      'A new quotation has ' + lines.length + ' separate line items for client "' + (client||'unknown') + '" (category: ' + (cat||'general') + '). ' +
      'Line items:\n' + numbered + '\n\n' +
      (clientJobHistory.length
        ? 'This client\'s past completed job descriptions (for context — similar work this client has had done before): ' + JSON.stringify(clientJobHistory) + '. '
        : 'No past job history exists for this client yet — base suggestions on the line item descriptions alone. ') +
      (clientSurveyHistory.length
        ? 'Tools actually used on this client\'s past similar jobs (real field data, prioritize these when relevant): ' + JSON.stringify(clientSurveyHistory) + '. '
        : '') +
      '\nReturn ONLY valid JSON, no markdown: ' +
      '{"descSummary":"2 Hebrew lines summarizing the overall scope of this quotation",' +
      '"lineSteps":[["3-5 specific Hebrew work steps for line 1"],["3-5 specific Hebrew work steps for line 2"],...],' +
      '"keys":["3-5 Hebrew key success factors relevant across the WHOLE quotation"],' +
      '"tools":["Hebrew tool names — prioritize tools seen in this client\'s real history above if relevant, otherwise infer fresh from the line descriptions; do NOT just repeat a generic category tool list"],' +
      '"materials":["specific materials/parts needed, inferred from the line descriptions — quantities/specs if mentioned in the text, otherwise general items; can include materials not seen before if the description implies them"]}' +
      ' lineSteps array length MUST exactly match the number of line items (' + lines.length + '), in the same order, one steps-array per line. ' +
      'Be specific — extract real detail from each line\'s own text rather than generic advice.';


    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
    var resp = UrlFetchApp.fetch(url, {
      method:'post', contentType:'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2500, thinkingConfig: { thinkingBudget: 0 } }
      }),
      muteHttpExceptions: true, deadline: 35
    });
    var _rawR = resp.getContentText();
    var _resR; try { _resR = JSON.parse(_rawR); } catch(_ep) { _resR = {}; }
    var text = '';
    if (_resR.error) { text = 'שגיאה: ' + (_resR.error.message||JSON.stringify(_resR.error)); }
    else { try { var _c=(_resR.candidates||[])[0]; if(_c){var _ct=_c.content; if(typeof _ct==='string'){text=_ct;}else if(_ct&&_ct.parts&&_ct.parts[0]){text=_ct.parts[0].text||'';} if(!text&&_c.finishReason&&_c.finishReason!=='STOP'){text='בוצע חסימה: '+_c.finishReason;}} } catch(_ep2){text='';} }


    var cleanText = text.trim().replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
    var jStart = cleanText.indexOf('{'), jEnd = cleanText.lastIndexOf('}');
    if (jStart !== -1 && jEnd !== -1) cleanText = cleanText.slice(jStart, jEnd+1);
    var parsed = null;
    try { parsed = JSON.parse(cleanText); } catch(e2) { parsed = null; }


    // Defensive: ensure lineSteps length matches lines length even if AI miscounts
    if (parsed && Array.isArray(parsed.lineSteps)) {
      while (parsed.lineSteps.length < lines.length) parsed.lineSteps.push(['','','','']);
      parsed.lineSteps = parsed.lineSteps.slice(0, lines.length);
    }


    return ContentService.createTextOutput(JSON.stringify({ text:text, parsed:parsed })).setMimeType(ContentService.MimeType.JSON);
  }
  if (action === 'getProjectTips') {
    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) return ContentService.createTextOutput(JSON.stringify({error:'GEMINI_API_KEY not set'})).setMimeType(ContentService.MimeType.JSON);
    var desc      = e.parameter.desc      || '';
    var cat       = e.parameter.cat       || '';
    var client    = e.parameter.client    || '';
    var notes     = (e.parameter.notes || '').slice(0, 200);
    var actualHrs = parseFloat(e.parameter.actualHrs || 0);
    var estHrs    = parseFloat(e.parameter.estHrs    || 0);
    var income    = parseFloat(e.parameter.income    || 0);
    var materials = []; try { if (e.parameter.materials) materials = JSON.parse(e.parameter.materials); } catch(em) {}
    var steps     = []; try { if (e.parameter.steps)     steps     = JSON.parse(e.parameter.steps);     } catch(es) {}
    var doneTips  = []; try { if (e.parameter.done)      doneTips  = JSON.parse(e.parameter.done);      } catch(ed) {}


    // Fetch past survey data for this category
    var pastPost = [];
    var postSheet = ss.getSheetByName('Job Surveys');
    if (postSheet) {
      var pData = postSheet.getDataRange().getValues();
      for (var r = 1; r < pData.length && pastPost.length < 5; r++) {
        if (String(pData[r][4]).indexOf(cat) !== -1 || String(pData[r][2]).indexOf(client) !== -1)
          pastPost.push({ desc:pData[r][3], tools:pData[r][7], issues:pData[r][9], rating:pData[r][6], hrs:pData[r][5] });
      }
    }


    // Fetch historical jobs for this client
    var clientHistory = [];
    ss.getSheets().forEach(function(sheet) {
      if (sheet.getName() !== client) return;
      var data = sheet.getDataRange().getValues();
      var cols = findColumns(data);
      if (cols.headerRow === -1) return;
      var count = 0;
      for (var r = cols.headerRow + 1; r < data.length && count < 10; r++) {
        var jobId = String(data[r][cols.jobId]||'').trim();
        var status = String(data[r][cols.status]||'').trim();
        if (!jobId || status !== 'בוצע') continue;
        var d = cols.desc !== -1 ? String(data[r][cols.desc]||'').trim() : '';
        var h = cols.hoursActual !== -1 ? (parseFloat(data[r][cols.hoursActual])||0) : 0;
        if (d) { clientHistory.push({ desc:d, hrs:h }); count++; }
      }
    });


    var pctUsed = estHrs > 0 ? Math.round(actualHrs/estHrs*100) : 0;


    // Always fetch weather for תנאי עבודה category
    var w = fetchCurrentWeather();
    var weatherFull = w ? w.summary : 'Weather data unavailable';


    // ── Materials knowledge base ─────────────────────────────────────────────
    var MATERIALS_KB = {
      'sikaflex':     'Sikaflex (polyurethane sealant/adhesive): Surface must be dry, dust-free and grease-free before application. Apply primer on porous substrates. Optimal temp 10–35C; above 30C skin forms in ~20min — do not disturb after. Max joint depth = 2x width; use backer rod for deep joints. Tool smooth within 5–10min. Full cure 24–48h. Keep uncured product away from water and rain.',
      'weber':        'Weber tile adhesive: Mix to lump-free paste, let rest 5min, re-stir. Open time 20–30min (shorter in heat/sun). Back-butter large format tiles. Match notch trowel size to tile size. Never add water after initial mix. Clean tools before adhesive hardens (~45min). In heat, work small sections.',
      'mapei':        'Mapei grout/adhesive: Follow water-to-powder ratio precisely — too much water weakens. For epoxy grout: work in 0.5m2 sections, pot life 30min in heat. Damp-cure cement-based grout for 24h with misting. Remove haze before full cure with damp sponge. Seal grout in wet areas after 7 days.',
      'felt':         'Felt waterproofing membrane: Overlap joints min 10cm, seam in direction of water flow. Torch-apply in 2 passes — first tack bond, second full bond. Surface temp must be above 5C. Avoid overheating — membrane should bubble slightly not smoke or blister. Seal all penetrations with collar flashing. Lap up walls min 20cm.',
      'bitumen':      'Bitumen waterproofing: Prime surface with bitumen primer, let flash off fully before membrane. Apply in 2 layers — second layer perpendicular to first. Protect from UV within 48h (protection board or reflective coating). Bring up min 20cm onto vertical surfaces at edges and penetrations.',
      'silicone':     'Silicone sealant: Surface must be 100% dry — moisture kills adhesion completely. Use masking tape for clean lines. Cut nozzle at 45 to joint width. Smooth with soapy water and tool within 2min of application. Never paint over silicone (use paintable acrylic instead for painted joints). Full cure 24h — keep dry.',
      'epoxy':        'Epoxy (coating/adhesive/grout): Mix Part A and Part B at exact manufacturer ratio — wrong ratio means it never cures. Pot life 20–45min — work fast. Apply thin coats, thick coats trap heat and crack. Surface temp 10–30C, above dew point. If doing second coat: within 24h window or re-abrade surface first.',
      'polyurethane': 'Polyurethane expanding foam: Shake can vigorously 60sec. Wet surface slightly — moisture activates cure. Fill max 50% of cavity (foam expands 2–3x). Do not disturb until tack-free (30min). Trim only after full cure (4h min, 24h full). Exposed foam degrades in UV — must be covered or painted within 48h.',
      'plaster':      'Plaster/render: Dampen substrate — not soaking wet. Apply scratch coat, score diagonally before it sets. Apply second coat after first is firm but not dry. Keep moist for 3 days to prevent rapid drying and cracking. In heat or direct sun, mist and shade. Max single coat 15mm — build up in layers for more.',
      'paint':        'Paint (interior/exterior): Surface clean, dry, primed. Stir well, never shake (bubbles). Two thin coats better than one thick. Min recoat time: water-based 2–4h, oil-based 24h. Apply between 10–30C, humidity below 80%. For exterior: avoid applying in direct midday sun — paint dries too fast and bubbles.',
      'grout':        'Tile grout: Wait min 24h after tile adhesive before grouting. Dampen tile surface lightly. Mix to toothpaste consistency. Apply diagonally with rubber float. Remove excess within 15–20min. Buff haze before fully cured with damp cloth. Seal grout joints in wet areas after full cure (7 days).',
      'waterproof':   'Liquid waterproofing membrane: Apply 2 coats — second coat perpendicular to first. Minimum wet film thickness per coat per spec. Reinforce corners and joints with fabric tape embedded in first coat. Each coat fully cured before next (4–24h). Flood test: fill with water 24h before tiling.',
      'screed':       'Floor screed: Do not add excess water — too wet causes shrinkage cracks. Compact thoroughly and level with screed board. Cover with polythene sheeting for 7-day slow cure. No foot traffic 24–48h, no heavy loads for 7 days. Always prime before tiling.',
      'caulk':        'Acrylic caulk: For internal painted joints only — never use in wet areas (use silicone there). Apply bead, smooth with wet finger, paintable when dry (1–2h). Not structural — do not use to fill structural gaps. Check it is acrylic not silicone before painting over.',
      'adhesive':     'Construction adhesive: Apply in serpentine bead or dots. Press and twist firmly to spread contact. Most require 24–48h before full load. Temp above 5C. Do not use to gap-fill — needs solid contact. Combine with mechanical fasteners on heavy or overhead loads.',
      'primer':       'Primer/bonding agent: Apply to clean dry surface only. Allow to become tacky (not wet, not fully dry) before applying next layer — timing varies 15min to 2h. Do not apply over painted or contaminated surfaces without abrading first. Recoat window usually 1–8h.',
      'pvc':          'PVC/uPVC profile/pipe: Solvent cement joint: deburr, dry-fit first, apply cement fast and assemble immediately — sets in 30sec. Do not rotate after. Support pipes every 60–80cm. Thermal expansion: leave 10mm gap per 3m length at joints.',
      'rockwool':     'Rockwool/mineral wool insulation: Always wear gloves and mask — fibres irritate skin and lungs. Keep dry — moisture destroys insulation value. Cut with serrated knife, friction fit tight to framing. No gaps at edges. Vapour barrier on warm side (inside) in cold climates.',
      'mastic':       'Mastic/bitumen mastic: Apply with trowel at 2–3mm thickness. Not for standing water areas. Above 20C applies more easily. Minimum 3h before traffic. Solvent-based: ensure ventilation. Can bridge cracks up to 3mm.',
      'metal primer': 'Metal primer (red oxide/zinc): Degrease metal first with solvent wipe. Apply within 1h of cleaning in humid conditions. 2 coats minimum. Recoat window 4–24h. Do not apply over rust — treat rust first with converter or grinder.'
    };


    // Match materials list and project text to KB
    var materialTips = [];
    var searchText = (desc + ' ' + notes + ' ' + materials.join(' ')).toLowerCase();
    Object.keys(MATERIALS_KB).forEach(function(k) {
      if (searchText.indexOf(k) !== -1) {
        if (materialTips.indexOf(MATERIALS_KB[k]) === -1) materialTips.push(MATERIALS_KB[k]);
      }
    });


    var prompt =
      'You are a field maintenance advisor for Yaniv Berg in Israel. ' +
      'Give EXACTLY 4 tips for this project, one per category. ' +
      'Project: "' + desc + '". Category: ' + (cat||'general') + '. Client: "' + client + '". ' +
      'Accumulated: ' + actualHrs + 'h / ' + estHrs + 'h estimated (' + pctUsed + '%). ' +
      'Project notes: "' + notes + '". ' +
      (income ? 'Income: \u20aa' + income + '. ' : '') +
      (materials.length ? 'Materials in use: ' + materials.join(', ') + '. ' : '') +
      (steps.length ? 'Work steps: ' + steps.join(' > ') + '. ' : '') +
      (materialTips.length ? '\nTECHNICAL REFERENCE (most relevant material — use for טיפ טכני only):\n' + materialTips[0].slice(0, 300) + '\n' : '') +
      (pastPost.length ? 'Past similar jobs: ' + JSON.stringify(pastPost) + '. ' : '') +
      (clientHistory.length ? 'History with ' + client + ': ' + JSON.stringify(clientHistory) + '. ' : '') +
      (doneTips.length ? 'Already done — do NOT repeat: ' + doneTips.join('; ') + '. ' : '') +
      'Current weather (Hadar Am): ' + weatherFull + '. ' +
      '\nReturn ONLY valid JSON (no markdown):' +
      '{"tips":[' +
        '{"cat":"\u05d7\u05d9\u05d6\u05d5\u05e7","title":"short title","body":"2-3 Hebrew lines of positive reinforcement based on project progress and client history — MUST mention the client name \"' + client + '\" — goal is to boost morale"},' +
        '{"cat":"\u05dc\u05e9\u05d9\u05e4\u05d5\u05e8","title":"short title","body":"2-3 Hebrew lines identifying ONE specific improvement area in this project — constructive and positive tone, no criticism"},' +
        '{"cat":"\u05d8\u05d9\u05e4 \u05d8\u05db\u05e0\u05d9","title":"short Hebrew title","body":"2-3 Hebrew lines — extract the single most critical and immediately actionable technical point from the TECHNICAL REFERENCE above. Be specific: include quantities, temperatures, times. If no reference matched, give a specific technical tip based on the work steps and category."},' +
        '{"cat":"\u05ea\u05e0\u05d0\u05d9 \u05e2\u05d1\u05d5\u05d3\u05d4","title":"short title","body":"2-3 Hebrew lines on weather/work conditions safety — if extreme warn strongly, if normal confirm safe"}' +
      ']}' +
      ' All body text in Hebrew. Be specific — use actual project content, not generic advice.';


    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
    var resp = UrlFetchApp.fetch(url, { method:'post', contentType:'application/json', payload:JSON.stringify({ contents:[{ parts:[{ text:prompt }] }], generationConfig:{ temperature:0.4, maxOutputTokens:3000, thinkingConfig:{ thinkingBudget:0 } } }), muteHttpExceptions:true, deadline:30 });
    var raw2 = resp.getContentText();
    var result2; try { result2 = JSON.parse(raw2); } catch(ep) { return ContentService.createTextOutput(JSON.stringify({error:'Gemini parse: '+raw2.slice(0,200)})).setMimeType(ContentService.MimeType.JSON); }
    if (result2.error) return ContentService.createTextOutput(JSON.stringify({error:'Gemini: '+(result2.error.message||JSON.stringify(result2.error))})).setMimeType(ContentService.MimeType.JSON);
    var text2 = '';
    try {
      var cand = (result2.candidates||[])[0];
      if (!cand) return ContentService.createTextOutput(JSON.stringify({error:'No candidates. Raw: '+raw2.slice(0,300)})).setMimeType(ContentService.MimeType.JSON);
      var cont = cand.content;
      if (typeof cont === 'string') { text2 = cont; }
      else if (cont && cont.parts && cont.parts[0]) { text2 = cont.parts[0].text || ''; }
      if (!text2 && cand.finishReason && cand.finishReason !== 'STOP') return ContentService.createTextOutput(JSON.stringify({error:'Blocked: '+cand.finishReason})).setMimeType(ContentService.MimeType.JSON);
    } catch(ep2) { return ContentService.createTextOutput(JSON.stringify({error:'Content extract: '+ep2.message})).setMimeType(ContentService.MimeType.JSON); }
    var cleanText = text2.replace(/```json|```/g,'').trim();
    var jStart = cleanText.indexOf('{'), jEnd = cleanText.lastIndexOf('}');
    if (jStart !== -1 && jEnd !== -1) cleanText = cleanText.slice(jStart, jEnd+1);
    var parsed = null; try { parsed = JSON.parse(cleanText); } catch(ep3) { parsed = null; }
    return ContentService.createTextOutput(JSON.stringify({ text:text2, parsed:parsed })).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'adminLogin') {
    var email = (e.parameter.email || '').toLowerCase().trim();
    var pass  = (e.parameter.pass  || '');
    var adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || '';
    var adminPass  = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || '';
    if (!adminEmail || !adminPass) {
      return ContentService.createTextOutput(JSON.stringify({ ok:false, error:'Admin credentials not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in Script Properties.' })).setMimeType(ContentService.MimeType.JSON);
    }
    if (email !== adminEmail.toLowerCase().trim() || pass !== adminPass) {
      return ContentService.createTextOutput(JSON.stringify({ ok:false, error:'Invalid email or password' })).setMimeType(ContentService.MimeType.JSON);
    }
    // Generate simple session token
    var rememberMe = e.parameter.remember || '0';
    var token = Utilities.base64Encode(email + ':' + new Date().getTime() + ':' + Math.random());
    return ContentService.createTextOutput(JSON.stringify({ ok:true, token:token, email:email, remember:rememberMe })).setMimeType(ContentService.MimeType.JSON);
  }


  // ── Debug: inspect column mappings ───────────────────────────────────────
  if (action === 'debugColumns') {
    var clientName = e.parameter.client || 'MODUL PLADA';
    var sheet = ss.getSheetByName(clientName);
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({error:'Sheet not found: '+clientName})).setMimeType(ContentService.MimeType.JSON);
    var data = sheet.getDataRange().getValues();
    var cols = findColumns(data);
    var headerRow = cols.headerRow !== -1 ? data[cols.headerRow] : [];
    // Show all rows with status "להוציא חש" with raw cell values
    var invoiceRows = [];
    for (var ri = cols.headerRow + 1; ri < data.length; ri++) {
      var inv = cols.invoice !== -1 ? String(data[ri][cols.invoice]||'').trim() : '';
      if (inv !== 'להוציא חש') continue;
      invoiceRows.push({
        row: ri,
        jobId: cols.jobId !== -1 ? data[ri][cols.jobId] : 'N/A',
        rawIncome:      cols.income      !== -1 ? data[ri][cols.income]      : 'N/A',
        rawPrice:       cols.price       !== -1 ? data[ri][cols.price]       : 'N/A',
        rawQty:         cols.qty         !== -1 ? data[ri][cols.qty]         : 'N/A',
        rawGrossProfit: cols.grossProfit !== -1 ? data[ri][cols.grossProfit] : 'N/A',
        parsedIncome:   cols.income      !== -1 ? (parseFloat(String(data[ri][cols.income]).replace(/[^0-9.-]/g,''))||0) : 0,
        parsedPrice:    cols.price       !== -1 ? (parseFloat(data[ri][cols.price])||0) : 0
      });
    }
    return ContentService.createTextOutput(JSON.stringify({cols:cols, invoiceRows:invoiceRows})).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getWorkPatternAnalysis') {
    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) return ContentService.createTextOutput(JSON.stringify({error:'GEMINI_API_KEY not set'})).setMimeType(ContentService.MimeType.JSON);


    var historyRaw = e.parameter.history || '[]';
    var sessions;
    try { sessions = JSON.parse(historyRaw); } catch(err) { sessions = []; }
    if (!sessions.length) return ContentService.createTextOutput(JSON.stringify({error:'No history'})).setMimeType(ContentService.MimeType.JSON);
    if (sessions.length < 3) return ContentService.createTextOutput(JSON.stringify({error:'צריך לפחות 3 סשנים לניתוח — יש כרגע ' + sessions.length})).setMimeType(ContentService.MimeType.JSON);


    // Build compact summary of sessions for prompt
    function fmtMsShort(ms) {
      var h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000);
      return h > 0 ? h + 'h' + m + 'm' : m + 'm';
    }
    function tsToHHMM(ts) {
      var d = new Date(ts);
      return ('0'+d.getHours()).slice(-2) + ':' + ('0'+d.getMinutes()).slice(-2);
    }
    function dayOfWeek(ts) {
      return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(ts).getDay()];
    }


    var sessCompact = sessions.slice(0, 30).map(function(s) {
      return {
        d: s.dateKey,
        dow: dayOfWeek(s.start),
        s: tsToHHMM(s.start),
        e: tsToHHMM(s.end),
        w: fmtMsShort(s.totalMs),
        dr: Math.round((s.drivingMs||0)/60000),
        p: (s.projects||[]).slice(0,3).map(function(p){
          return (p.client||'').slice(0,15)+':'+fmtMsShort(p.totalMs);
        })
      };
    });


    var prompt =
      'You are a work-habit analyst reviewing ALL historical work sessions for Yaniv, an Israeli field maintenance operator. ' +
      'Analyze ONLY the patterns you can objectively detect from this data. Do NOT invent anything not supported by the data. ' +
      'Session history (' + sessCompact.length + ' sessions): ' + JSON.stringify(sessCompact) + '. ' +
      (function(){
        try {
          var wpSh2 = ss.getSheetByName('Weekly Plan');
          if (!wpSh2) return '';
          var wpD2 = wpSh2.getDataRange().getValues();
          var planSummary = [], seenWk = {};
          for (var rr=1;rr<wpD2.length;rr++){
            var pw=String(wpD2[rr][0]||'').trim(); if(!pw) continue;
            if(!seenWk[pw])seenWk[pw]=[];
            seenWk[pw].push(String(wpD2[rr][4]||'').slice(0,20));
          }
          var wkKeys=Object.keys(seenWk).sort().slice(-8);
          wkKeys.forEach(function(k){planSummary.push({week:k,jobs:seenWk[k]});});
          if(!planSummary.length) return '';
          return ' Weekly planning history (last 8 weeks): ' + JSON.stringify(planSummary) + '.';
        } catch(_){return '';}
      })()+
      '\nFind and report: start time patterns, end time patterns, day-of-week patterns, typical session length, ' +
      'most frequent clients and projects, arrangement/driving time ratios, multi-session days, project switching patterns, ' +
      'longest/shortest days, any anomalies or outliers. ' +
      '\nReturn ONLY valid JSON (no markdown): ' +
      '{"patterns":[{"icon":"emoji","title":"short Hebrew title","value":"concise Hebrew stat","detail":"1 Hebrew line max"}],' +
      '"habits":[{"icon":"emoji","title":"short Hebrew title","body":"1 Hebrew line"}],' +
      '"records":{"longestDay":{"date":"","value":""},"shortestDay":{"date":"","value":""},"mostProjects":{"date":"","value":""},"earliestStart":{"date":"","value":""},"latestEnd":{"date":"","value":""}}}. ' +
      'patterns: exactly 5 stats. habits: exactly 3 patterns. records: exact values. All Hebrew. Be concise — 1 line per field max.';


    var payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8000, thinkingConfig: { thinkingBudget: 0 } }
    };
    var geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
    var resp = UrlFetchApp.fetch(geminiUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true, deadline: 30
    });
    var raw = resp.getContentText();
    var parsed;
    try { parsed = JSON.parse(raw); } catch(e2) { return ContentService.createTextOutput(JSON.stringify({error:'Gemini HTTP parse error: '+raw.slice(0,300)})).setMimeType(ContentService.MimeType.JSON); }


    // Handle Gemini API error response
    if (parsed.error) return ContentService.createTextOutput(JSON.stringify({error:'Gemini API: '+(parsed.error.message||JSON.stringify(parsed.error))})).setMimeType(ContentService.MimeType.JSON);


    // Robust text extraction — handle all Gemini response shapes
    var text = '';
    try {
      var candidate = (parsed.candidates||[])[0];
      if (!candidate) return ContentService.createTextOutput(JSON.stringify({error:'No candidates. FinishReason: '+(parsed.promptFeedback ? JSON.stringify(parsed.promptFeedback) : 'unknown')+'. Raw: '+raw.slice(0,300)})).setMimeType(ContentService.MimeType.JSON);
      var content = candidate.content;
      if (typeof content === 'string') { text = content; }
      else if (content && content.parts && content.parts[0]) { text = content.parts[0].text || ''; }
      else if (candidate.text) { text = candidate.text; }
      if (!text && candidate.finishReason && candidate.finishReason !== 'STOP') {
        return ContentService.createTextOutput(JSON.stringify({error:'Gemini blocked: '+candidate.finishReason})).setMimeType(ContentService.MimeType.JSON);
      }
    } catch(e2b) { return ContentService.createTextOutput(JSON.stringify({error:'Content extract: '+e2b.message+' raw: '+raw.slice(0,200)})).setMimeType(ContentService.MimeType.JSON); }


    text = text.replace(/```json[\s\S]*?```|```[\s\S]*?```/g, function(m){ return m.replace(/```json|```/g,''); }).trim();


    var result;
    try { result = JSON.parse(text); } catch(e3) {
      var jsonStart = text.indexOf('{');
      var jsonEnd   = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        try { result = JSON.parse(text.slice(jsonStart, jsonEnd+1)); } catch(e4) { result = null; }
      }
      if (!result) return ContentService.createTextOutput(JSON.stringify({error:'JSON parse failed. Raw text: '+text.slice(0,300)})).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'debugLessons') {
    var dbg = { received_action: action, raw_action: e.parameter.action, param_keys: Object.keys(e.parameter||{}), all_params: JSON.stringify(e.parameter||{}) };
    return ContentService.createTextOutput(JSON.stringify(dbg)).setMimeType(ContentService.MimeType.JSON);
  }


  // ── Lessons Learned — save ────────────────────────────────────────────────
  // ── Lessons Learned — fetch by category ───────────────────────────────────
  if (action === 'getLessons') {
    try {
    var cat   = (e.parameter.cat   || '').trim();
    var limit = parseInt(e.parameter.limit || '8', 10);
    var lSheet = ss.getSheetByName('Lessons Learned');
    if (!lSheet) return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
    var lData = lSheet.getDataRange().getValues();
    if (lData.length < 2) return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
    var lessons = [];
    for (var li = lData.length - 1; li >= 1; li--) {
      var row = lData[li];
      var rowCat = String(row[3]||'').trim();
      if (cat && rowCat !== cat) continue;
      lessons.push({
        timestamp: row[0] ? (row[0] instanceof Date ? Utilities.formatDate(row[0], 'Asia/Jerusalem', 'dd/MM/yyyy') : String(row[0]).slice(0,10)) : '',
        jobId:      String(row[1]||''), client:   String(row[2]||''),
        category:   rowCat,            desc:      String(row[4]||''),
        actualHrs:  row[5]||0,         estHrs:    row[6]||0,
        accuracy:   row[7]||'',        outcome:   String(row[8]||'success'),
        materials:  String(row[9]||''), steps:    String(row[10]||''),
        successKeys:String(row[11]||''),tools:    String(row[12]||''),
        notes:      String(row[13]||''),rating:   row[14]||''
      });
      if (lessons.length >= limit) break;
    }
    return ContentService.createTextOutput(JSON.stringify(lessons)).setMimeType(ContentService.MimeType.JSON);
    } catch(eLessons) {
      return ContentService.createTextOutput(JSON.stringify({error: 'getLessons crash: ' + eLessons.message})).setMimeType(ContentService.MimeType.JSON);
    }
  }






  if (action === 'sendMonthlyBundle') {
    try {
      var month   = (e.parameter.month  || '').trim(); // MM/YYYY
      var types   = (e.parameter.types  || '1').split(',');
      var toEmail = 'yanivberg@icloud.com';
      if (!month) return ContentService.createTextOutput(JSON.stringify({ok:false,error:'Missing month'})).setMimeType(ContentService.MimeType.JSON);
      var parts = month.split('/'), mm = parts[0], yyyy = parts[1];
      var lastDay = new Date(parseInt(yyyy), parseInt(mm), 0).getDate();
      var datStart = yyyy+'-'+mm+'-01', datEnd = yyyy+'-'+mm+'-'+String(lastDay).padStart(2,'0');
      var wb = 'https://yb-caspit-proxy.sunroof-dictate-39.workers.dev';
      var typeNames = {'1':'חשבונית מס','2':'קבלה','7':'חש/קבלה','9':'חשבונית זיכוי','16':'הצעת מחיר'};


      // Fetch docs for each selected type
      var allDocs = [];
      var reqs = types.map(function(tid){ return { url: wb+'/?action=listDocsByDate&trxTypeId='+tid+'&datStart='+encodeURIComponent(datStart)+'&datEnd='+encodeURIComponent(datEnd)+'&page=0', muteHttpExceptions:true }; });
      var resps = UrlFetchApp.fetchAll(reqs);
      resps.forEach(function(resp, idx) {
        try {
          var data = JSON.parse(resp.getContentText());
          var docs = Array.isArray(data) ? data : (data.Results || []);
          docs.forEach(function(d){ d._typeName = typeNames[types[idx]]||types[idx]; d._typeId = types[idx]; allDocs.push(d); });
        } catch(_){}
      });
      var clientFilter = (e.parameter.client || '').trim();
      var _normName = function(s){ return String(s||'').trim().toLowerCase().replace(/[\u0022\u05f4"']/g,'').replace(/\s+/g,' '); };
      // Map sheet names (English) to Caspit CustomerBusinessName fragments (Hebrew)
      var CLIENT_CASPIT_MAP = {
        'GOLMAT':       'גולמט',
        'ROLLMAT':      'רולמט',
        'BILLINSKY':    'בילינסקי',
        'MODUL PLADA':  'מודול פלדה',
        'PAL-YAM':      'פל ים',
        'SONIC BEAT LTD': 'sonic beat',
        'Y.SHAY':       'שי'
      };
      var monthNames = {};
      allDocs.forEach(function(d){ var nm = d.CustomerBusinessName || d.Customer || d.CustomerName || d.ContactName || ''; if (nm) monthNames[nm] = 1; });
      if (clientFilter) {
        // Translate sheet name to Hebrew Caspit name if mapping exists
        var mappedFilter = CLIENT_CASPIT_MAP[clientFilter.toUpperCase()] || CLIENT_CASPIT_MAP[clientFilter] || clientFilter;
        var cf = _normName(mappedFilter);
        var cfOrig = _normName(clientFilter); // also try original as fallback
        allDocs = allDocs.filter(function(d){
          var nm = _normName(d.CustomerBusinessName || d.Customer || d.CustomerName || d.ContactName || '');
          if (!nm) return false;
          return nm === cf || nm.indexOf(cf) !== -1 || cf.indexOf(nm) !== -1 ||
                 nm === cfOrig || nm.indexOf(cfOrig) !== -1 || cfOrig.indexOf(nm) !== -1;
        });
      }
      if (!allDocs.length) {
        var foundList = Object.keys(monthNames);
        var emptyMsg = 'אין מסמכים' + (clientFilter ? (' ל-' + clientFilter) : '') + ' לחודש ' + month;
        if (clientFilter && foundList.length) emptyMsg += ' · שמות הלקוחות שנמצאו החודש: ' + foundList.join(' | ');
        return ContentService.createTextOutput(JSON.stringify({ok:false, error: emptyMsg, found: Object.keys(monthNames)})).setMimeType(ContentService.MimeType.JSON);
      }


      // Fetch the real PDF for each document via worker getDocPdf, then attach each
      // as its own file in a single email. To avoid Caspit rate-limiting under parallel
      // load, fetch in small chunks with a short pause, and retry any failures once.
      function _sanitize(s){ return String(s||'').replace(/[\\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim().slice(0,60); }
      function _pdfReq(d){
        return {
          url: wb + '/?action=getDocPdf&docNumber=' + encodeURIComponent(d.Number||'') +
               '&trxTypeId=' + encodeURIComponent(d._typeId||'') +
               '&docId=' + encodeURIComponent(d.DocumentId||''),
          muteHttpExceptions: true
        };
      }
      var pdfB64 = new Array(allDocs.length); // index -> base64 PDF (or undefined)
      var pdfErr = new Array(allDocs.length); // index -> failure reason (or undefined)
      function _runChunks(indices, chunkSize, pauseMs){
        var stillFailed = [];
        for (var s=0; s<indices.length; s+=chunkSize){
          var batch = indices.slice(s, s+chunkSize);
          var resps = UrlFetchApp.fetchAll(batch.map(function(i){ return _pdfReq(allDocs[i]); }));
          resps.forEach(function(resp, k){
            var i = batch[k];
            try {
              var pd = JSON.parse(resp.getContentText());
              if (pd && pd.ok && pd.pdf) { pdfB64[i] = pd.pdf; pdfErr[i] = undefined; }
              else { stillFailed.push(i); pdfErr[i] = (pd && pd.error) ? pd.error : 'no pdf'; }
            } catch(eX) { stillFailed.push(i); pdfErr[i] = 'parse: ' + (eX.message||eX); }
          });
          if (s + chunkSize < indices.length) Utilities.sleep(pauseMs);
        }
        return stillFailed;
      }
      var allIdx = allDocs.map(function(_d, i){ return i; });
      var failedIdx = _runChunks(allIdx, 4, 700);          // first pass: 4 at a time
      if (failedIdx.length) { Utilities.sleep(2000); failedIdx = _runChunks(failedIdx, 2, 1200); } // retry pass, gentler


      var attachments = [], errors = [];
      allDocs.forEach(function(d, idx){
        var label = (d._typeName||'') + ' ' + (d.Number||'') + ' — ' + (d.CustomerBusinessName||d.Customer||'');
        if (pdfB64[idx]) {
          try {
            var bytes = Utilities.base64Decode(pdfB64[idx]);
            var fname = _sanitize((d._typeName||'doc') + ' ' + (d.Number||'') + ' ' + (d.CustomerBusinessName||d.Customer||'')) + '.pdf';
            attachments.push(Utilities.newBlob(bytes, 'application/pdf', fname));
          } catch(eDec) { errors.push(label + ' (שגיאת קובץ)'); }
        } else {
          errors.push(label + ' — ' + (pdfErr[idx] || 'אין PDF'));
        }
      });


      if (!attachments.length) return ContentService.createTextOutput(JSON.stringify({ok:false,error:'לא הצלחתי להוריד אף PDF',errors:errors})).setMimeType(ContentService.MimeType.JSON);


      var total = allDocs.reduce(function(s,d){ return s + (parseFloat(d.Total||d.TotalPayment||0)||0); }, 0);
      var subject = (clientFilter ? (clientFilter + ' | ') : '') + 'מסמכי ' + month + ' | י.ב אחזקות (' + attachments.length + ' מסמכים)';
      var bodyText = 'מצורפים מסמכי חודש ' + month + ' | י.ב אחזקות\n' +
        'כל מסמך כקובץ PDF נפרד.\n' +
        attachments.length + ' מסמכים | סה"כ: ₪' + total.toLocaleString() + '\n\n' +
        allDocs.map(function(d){ return (d._typeName||'') + ' ' + (d.Number||'') + ' — ' + (d.CustomerBusinessName||d.Customer||'') + ' — ₪' + (d.Total||d.TotalPayment||0); }).join('\n') +
        (errors.length ? '\n\n⚠️ לא נשלחו (' + errors.length + '):\n' + errors.join('\n') : '');
      GmailApp.sendEmail(toEmail, subject, bodyText, { attachments: attachments });
      return ContentService.createTextOutput(JSON.stringify({ok:true, sent:attachments.length, total:allDocs.length, errors:errors})).setMimeType(ContentService.MimeType.JSON);
    } catch(emb) {
      return ContentService.createTextOutput(JSON.stringify({ok:false,error:emb.message})).setMimeType(ContentService.MimeType.JSON);
    }
  }


  if (action === 'sendMonthlyExpenseReport') {
    try {
      var meClient = e.parameter.client || '';
      var meMonth  = e.parameter.month  || ''; // YYYY-MM
      var meEmail  = e.parameter.email  || '';
      var meTotal  = e.parameter.total  || '0';
 
      if (!meClient || !meMonth || !meEmail) {
        return ContentService.createTextOutput(JSON.stringify({ok:false,error:'Missing params'})).setMimeType(ContentService.MimeType.JSON);
      }
 
      var expSh = ss.getSheetByName('Expenses');
      if (!expSh) return ContentService.createTextOutput(JSON.stringify({ok:false,error:'No Expenses sheet'})).setMimeType(ContentService.MimeType.JSON);
 
      var expData = expSh.getDataRange().getValues();
      // Columns: JobId(0) Client(1) Date(2) Category(3) Description(4) Amount(5) CreatedAt(6) Link(7)
      var filtered = [];
      for (var er = 1; er < expData.length; er++) {
        var rowClient = String(expData[er][1]||'').trim();
        if (rowClient !== meClient) continue;
        var rowDate = String(expData[er][2]||'').trim();
        var ym = '';
        if (rowDate.match(/^\d{4}-\d{2}/)) ym = rowDate.slice(0,7);
        else if (rowDate.match(/^\d{2}\/\d{2}\/\d{4}/)) { var p=rowDate.split('/'); ym=p[2]+'-'+p[1]; }
        if (ym !== meMonth) continue;
        filtered.push({
          jobId:    String(expData[er][0]||'ללא פרויקט'),
          date:     rowDate,
          category: String(expData[er][3]||''),
          desc:     String(expData[er][4]||''),
          amount:   parseFloat(expData[er][5]||0),
          link:     String(expData[er][7]||'')
        });
      }
 
      if (!filtered.length) {
        return ContentService.createTextOutput(JSON.stringify({ok:false,error:'אין הוצאות לחודש ' + meMonth + ' עבור ' + meClient})).setMimeType(ContentService.MimeType.JSON);
      }
 
      // Group by jobId
      var jobs = {}, jobOrder = [];
      filtered.forEach(function(ex) {
        if (!jobs[ex.jobId]) { jobs[ex.jobId] = []; jobOrder.push(ex.jobId); }
        jobs[ex.jobId].push(ex);
      });
 
      var displayMonth = meMonth.split('-').reverse().join('/'); // MM/YYYY
 
      // Plain text body
      var bodyText = 'שלום,\n\nמצורף דוח הוצאות חודש ' + displayMonth + ' עבור ' + meClient + '.\n\n';
      jobOrder.forEach(function(jid) {
        var rows = jobs[jid];
        var jobTotal = rows.reduce(function(s,r){ return s+r.amount; }, 0);
        bodyText += '── פרויקט: ' + jid + ' ──\n';
        rows.forEach(function(r) {
          bodyText += '• ' + r.desc + ' | ₪' + r.amount.toLocaleString() + ' | ' + r.date;
          if (r.link) bodyText += '\n  קישור למקור: ' + r.link;
          bodyText += '\n';
        });
        bodyText += 'סה"כ פרויקט: ₪' + jobTotal.toLocaleString() + '\n\n';
      });
      bodyText += '══════════════════════\n';
      bodyText += 'סה"כ הוצאות חודש ' + displayMonth + ': ₪' + parseFloat(meTotal).toLocaleString() + '\n\n';
      bodyText += 'בברכה,\nי.ב אחזקות';
 
      // HTML body
      var htmlBody = '<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;">' +
        '<h2 style="color:#c62828;">דוח הוצאות — ' + displayMonth + '</h2>' +
        '<p style="color:#555;">לקוח: <strong>' + meClient + '</strong></p>';
      jobOrder.forEach(function(jid) {
        var rows = jobs[jid];
        var jobTotal = rows.reduce(function(s,r){ return s+r.amount; }, 0);
        htmlBody += '<h3 style="color:#0d47a1;border-bottom:2px solid #e3f2fd;padding-bottom:4px;">' + jid + '</h3>' +
          '<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">' +
          '<tr style="background:#fafafa;"><th style="text-align:right;padding:6px;border-bottom:1px solid #eee;">תיאור</th>' +
          '<th style="text-align:right;padding:6px;border-bottom:1px solid #eee;">תאריך</th>' +
          '<th style="text-align:right;padding:6px;border-bottom:1px solid #eee;">סכום</th>' +
          '<th style="text-align:center;padding:6px;border-bottom:1px solid #eee;">מקור</th></tr>';
        rows.forEach(function(r) {
          htmlBody += '<tr><td style="padding:6px;border-bottom:0.5px solid #f5f5f5;">' + r.desc + '</td>' +
            '<td style="padding:6px;border-bottom:0.5px solid #f5f5f5;color:#888;">' + r.date + '</td>' +
            '<td style="padding:6px;border-bottom:0.5px solid #f5f5f5;font-weight:700;color:#c62828;">₪' + r.amount.toLocaleString() + '</td>' +
            '<td style="padding:6px;border-bottom:0.5px solid #f5f5f5;text-align:center;">' +
              (r.link ? '<a href="' + r.link + '" style="font-size:16px;text-decoration:none;" title="פתח מייל מקור">📧</a>' : '—') +
            '</td></tr>';
        });
        htmlBody += '<tr style="background:#fafafa;"><td colspan="2" style="padding:6px;font-weight:700;">סה"כ פרויקט:</td>' +
          '<td style="padding:6px;font-weight:900;color:#c62828;" colspan="2">₪' + jobTotal.toLocaleString() + '</td></tr>' +
          '</table>';
      });
      htmlBody += '<div style="background:#fff3e0;border-radius:8px;padding:12px 16px;margin-top:16px;display:flex;justify-content:space-between;">' +
        '<strong>סה"כ הוצאות חודש ' + displayMonth + ':</strong>' +
        '<strong style="color:#c62828;">₪' + parseFloat(meTotal).toLocaleString() + '</strong></div>' +
        '<p style="color:#aaa;font-size:11px;margin-top:20px;">נשלח מ-YB Tracker | י.ב אחזקות</p></div>';
 
      var subject = 'דוח הוצאות ' + displayMonth + ' | ' + meClient + ' | י.ב אחזקות';
      GmailApp.sendEmail(meEmail, subject, bodyText, {
        name: 'י.ב אחזקות',
        htmlBody: htmlBody,
        replyTo: 'yanivberg@icloud.com'
      });
 
      return ContentService.createTextOutput(JSON.stringify({ok:true, sent:filtered.length, to:meEmail})).setMimeType(ContentService.MimeType.JSON);
    } catch(eME) {
      return ContentService.createTextOutput(JSON.stringify({ok:false, error:eME.message})).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
// ── Build כרטסת תנועות PDF (Caspit-style transaction ledger report) ─────────
function _buildTransactionLogPdf(allDocs, displayFrom, displayTo, fromDate, toDate, typeNames) {
  try {
    var token = ScriptApp.getOAuthToken();
    var SHORT = {'1':'חש','2':'קבל','3':'חש/ק','7':'חש/ק','9':'זיכוי','10':'הצע','16':'הצע'};


    // Sort all docs by date descending (newest first), regardless of type
    allDocs.sort(function(a,b){
      return new Date(b.Date||b.DocumentDate||0) - new Date(a.Date||a.DocumentDate||0);
    });


    function fmt(raw){ if(!raw) return ''; try{ var d=new Date(raw); return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+String(d.getFullYear()).slice(-2); }catch(_){ return String(raw).slice(0,10); } }
    function fmtAmt(v){ v=parseFloat(v)||0; return v===0?'0.00':v.toFixed(2); }


    var grandBefore=0, grandVat=0, grandCredit=0, grandWith=0;


    var colHdr = '<tr class="col-hdr">'+
      '<th width="4%">סוג</th><th width="9%">מספר</th><th width="8%">תאריך</th><th width="20%">שם הלקוח</th>'+
      '<th width="15%">אסמכתא</th><th width="11%">חיוב לפני מע"מ</th><th width="9%">מע"מ</th>'+
      '<th width="8%">זיכוי</th><th width="5%">ניכוי</th><th width="11%">פרטים</th></tr>';


    var docRows = allDocs.map(function(d){
      var shortCode = SHORT[d._typeId||'']||d._typeId||'';
      var isCredit  = d._typeId==='9';
      var bt   = parseFloat(d.TotalBeforeVAT||d.BeforeTax||0)||0;
      var vat  = parseFloat(d.Vat||d.VatAmount||0)||0;
      var tot  = parseFloat(d.Total||d.TotalWithVat||0)||0;
      var with_= parseFloat(d.WithholdingTax||d.Withholding||0)||0;
      if(!tot) tot=parseFloat(d.TotalPayment||d.TotalPaymentNIS||0)||0;
      if(!bt && tot) bt = Math.round(tot/1.18*100)/100;
      if(!vat && tot && bt) vat = Math.round((tot-bt)*100)/100;
      var credit=0, charge=bt;
      if(isCredit){ credit=Math.abs(bt); charge=0; }
      else { grandBefore+=charge; grandVat+=vat; grandWith+=with_; }
      if(isCredit) grandCredit+=credit;
      var alloc   = String(d.AllocationNumber||d.allocationNumber||'').trim();
      var details = String(d.Details||d.Comments||d.Description||'').slice(0,40);
      var cust    = String(d.CustomerBusinessName||d.CustomerName||d.ContactName||'').slice(0,30);
      return '<tr>'+
        '<td>'+shortCode+'</td>'+
        '<td>'+( d.Number||'')+'</td>'+
        '<td>'+fmt(d.Date||d.DocumentDate||d.CreationDate)+'</td>'+
        '<td style="text-align:right;">'+cust+'</td>'+
        '<td>'+alloc+'</td>'+
        '<td class="num">'+(isCredit?'':fmtAmt(charge))+'</td>'+
        '<td class="num">'+(isCredit?'':fmtAmt(vat))+'</td>'+
        '<td class="num">'+(isCredit?fmtAmt(credit):'')+'</td>'+
        '<td class="num">'+(with_?fmtAmt(with_):'')+'</td>'+
        '<td>'+details+'</td>'+
        '</tr>';
    }).join('');


    var typeBlocks = colHdr + docRows;


    var today = Utilities.formatDate(new Date(),'Asia/Jerusalem','dd/MM/yyyy');
    var typeLabels = allDocs.reduce(function(acc,d){ var n=typeNames[d._typeId||'']||d._typeId||''; if(n&&acc.indexOf(n)===-1) acc.push(n); return acc; },[]);
    var filterStr = 'סינון לפי: '+displayFrom+'-'+displayTo+' | סוג המסמך: '+typeLabels.join(', ');


    var html = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><style>'+
      '@page{margin:12mm 10mm;}'+
      'body{font-family:Arial,sans-serif;font-size:8.5pt;direction:rtl;margin:0;}'+
      'h1{font-size:12pt;text-align:center;margin:0 0 3px;font-weight:bold;}'+
      '.subtitle{font-size:7.5pt;color:#333;text-align:center;margin-bottom:4px;line-height:1.4;}'+
      '.meta{display:flex;justify-content:space-between;font-size:8pt;margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:4px;}'+
      'table{width:100%;border-collapse:collapse;border:1px solid #999;table-layout:fixed;}'+
            '.type-hdr td{border-top:2px solid #000;border-bottom:1px solid #000;font-weight:bold;padding:4px 5px;font-size:8.5pt;background:#fff;}'+
      '.col-hdr th{background:#f0f0f0;border:1px solid #999;padding:3px 5px;font-size:7.5pt;text-align:right;font-weight:bold;}'+
      '.col-hdr th:nth-child(6),.col-hdr th:nth-child(7),.col-hdr th:nth-child(8),.col-hdr th:nth-child(9){text-align:left;}'+
      'td{padding:2px 4px;border:0.5px solid #ccc;font-size:7.5pt;vertical-align:top;}'+
      '.num{text-align:left;white-space:nowrap;}'+
      '.cls-hdr td{border-top:1px solid #999;border-bottom:0.5px solid #ccc;font-weight:bold;padding:3px 5px;font-size:8pt;background:#f9f9f9;font-style:italic;}'+
      '.sub td{border-top:1px solid #999;font-weight:bold;font-size:8pt;padding:3px 5px;background:#f0f0f0;}'+
      '.type-sub td{border-top:2px solid #333;border-bottom:2px solid #000;font-weight:bold;font-size:8.5pt;padding:4px 5px;background:#e8e8e8;}'+
      '.grand td{border-top:3px double #000;font-weight:bold;font-size:9pt;padding:5px 5px;background:#f0f0f0;}'+
      '.legend{margin-top:10px;font-size:7.5pt;color:#444;border-top:1px solid #ccc;padding-top:6px;line-height:1.6;}'+
      '</style></head><body>'+
      '<h1>כרטסת תנועות</h1>'+
      '<div class="subtitle">התנועות מקובצות לפי סוג התנועה (כלומר, סוג ה"מסמך". ראה פירוט סוגי מסמכים בסוף הדו"ח) ואז לפי סיווג התנועה (=ה"סוג" של ההוצאה או ההכנסה).</div>'+
      '<div class="subtitle">'+filterStr+'</div>'+
      '<div class="meta"><span>י.ב אחזקות 060139755</span><span>'+today+'</span></div>'+
      '<table width="100%"><colgroup>'+
          '<col width="4%"><col width="9%"><col width="8%"><col width="20%">'+
          '<col width="15%"><col width="11%"><col width="9%"><col width="8%">'+
          '<col width="5%"><col width="11%">'+
          '</colgroup>'+typeBlocks+
      '<tr class="grand"><td colspan="5">סה"כ כולל ('+allDocs.length+' תנועות)</td>'+
      '<td class="num">'+fmtAmt(grandBefore)+'</td>'+
      '<td class="num">'+fmtAmt(grandVat)+'</td>'+
      '<td class="num">'+fmtAmt(grandCredit)+'</td>'+
      '<td class="num">'+fmtAmt(grandWith)+'</td><td></td></tr>'+
      '</table>'+
      '<div class="legend">סוגי תנועה נפוצים: חש=חשבונית מס, קבל=קבלה, חש/ק=חשבונית/קבלה, זיכוי=חשבונית זיכוי, הצע=הצעת מחיר</div>'+
      '</body></html>';


    // Upload HTML → Google Doc → export PDF
    var boundary = 'TXPDF_'+Date.now();
    var meta = '{"name":"tmp_txlog_'+Date.now()+'","mimeType":"application/vnd.google-apps.document"}';
    var p1 = Utilities.newBlob('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+meta+'\r\n--'+boundary+'\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n').getBytes();
    var p2 = Utilities.newBlob('\r\n--'+boundary+'--').getBytes();
    var body = p1.concat(Utilities.newBlob(html).getBytes()).concat(p2);
    var up = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{
      method:'POST', headers:{'Authorization':'Bearer '+token,'Content-Type':'multipart/related; boundary='+boundary},
      payload:body, muteHttpExceptions:true});
    if (up.getResponseCode()!==200) throw new Error('Upload '+up.getResponseCode());
    var fileId = JSON.parse(up.getContentText()).id;
    if (!fileId) throw new Error('No fileId');
    var pdfResp = UrlFetchApp.fetch('https://docs.google.com/feeds/download/documents/export/Export?id='+fileId+'&exportFormat=pdf',
      {headers:{Authorization:'Bearer '+token},muteHttpExceptions:true});
    var pdfBlob = pdfResp.getBlob().setName('כרטסת-תנועות-'+displayFrom.replace(/\//g,'-')+'-'+displayTo.replace(/\//g,'-')+'.pdf');
    try{ UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/'+fileId,{method:'DELETE',headers:{Authorization:'Bearer '+token},muteHttpExceptions:true});}catch(_){}
    return pdfBlob;
  } catch(e){ Logger.log('_buildTransactionLogPdf: '+e); return null; }
}


// ── Build a single-PDF listing of all monthly documents ──────────────────
function _buildMonthlyListPdf(allDocs, month) {
  try {
    var token = ScriptApp.getOAuthToken();


    // Sort by type then number
    allDocs.sort(function(a,b){
      var ta = a._typeName||'', tb = b._typeName||'';
      if (ta !== tb) return ta < tb ? -1 : 1;
      return (a.Number||'') < (b.Number||'') ? -1 : 1;
    });


    // Group by type
    var groups = {}, order = [];
    allDocs.forEach(function(d) {
      var t = d._typeName || 'מסמכים';
      if (!groups[t]) { groups[t] = []; order.push(t); }
      groups[t].push(d);
    });


    var total = allDocs.reduce(function(s,d){ return s+(parseFloat(d.Total||d.TotalPayment||0)||0); }, 0);


    // Build HTML
    var html = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">' +
      '<style>' +
        'body{font-family:"Arial",sans-serif;font-size:11pt;direction:rtl;margin:20px;}' +
        'h1{font-size:14pt;margin-bottom:4px;}' +
        'h2{font-size:11pt;margin:14px 0 4px;color:#333;border-bottom:1px solid #ccc;padding-bottom:2px;}' +
        'table{width:100%;border-collapse:collapse;margin-bottom:8px;}' +
        'th{background:#1a237e;color:#fff;padding:6px 8px;text-align:right;font-size:10pt;}' +
        'td{padding:5px 8px;border-bottom:1px solid #eee;font-size:10pt;}' +
        'tr:nth-child(even) td{background:#f5f5f5;}' +
        '.total-row td{font-weight:bold;border-top:2px solid #333;background:#e8eaf6;}' +
        '.grand-total{margin-top:12px;font-size:12pt;font-weight:bold;text-align:left;color:#1a237e;}' +
        '.meta{font-size:9pt;color:#777;margin-bottom:14px;}' +
      '</style></head><body>' +
      '<h1>דוח מסמכים — ' + month + '</h1>' +
      '<div class="meta">י.ב אחזקות | הופק: ' + Utilities.formatDate(new Date(),'Asia/Jerusalem','dd/MM/yyyy HH:mm') + '</div>';


    order.forEach(function(typeName) {
      var docs = groups[typeName];
      var typeTotal = docs.reduce(function(s,d){ return s+(parseFloat(d.Total||d.TotalPayment||0)||0); }, 0);
      html += '<h2>' + typeName + ' (' + docs.length + ')</h2>' +
        '<table><tr><th>#</th><th>מספר מסמך</th><th>לקוח</th><th>תאריך</th><th>סכום</th></tr>';
      docs.forEach(function(d, i) {
        var dateStr = '';
        if (d.Date) { try { dateStr = Utilities.formatDate(new Date(d.Date),'Asia/Jerusalem','dd/MM/yyyy'); } catch(_){ dateStr = String(d.Date).slice(0,10); } }
        html += '<tr><td>' + (i+1) + '</td>' +
          '<td>' + (d.Number||'—') + '</td>' +
          '<td>' + (d.CustomerBusinessName||d.Customer||d.CustomerName||'—') + '</td>' +
          '<td>' + dateStr + '</td>' +
          '<td>₪' + (parseFloat(d.Total||d.TotalPayment||0)||0).toLocaleString() + '</td></tr>';
      });
      html += '<tr class="total-row"><td colspan="4">סה"כ ' + typeName + '</td><td>₪' + typeTotal.toLocaleString() + '</td></tr></table>';
    });


    html += '<div class="grand-total">סה"כ כולל: ₪' + total.toLocaleString() + ' | ' + allDocs.length + ' מסמכים</div>' +
      '</body></html>';


    // Upload HTML → Google Doc
    var boundary = 'MPDF_' + Date.now();
    var meta = '{"name":"tmp_monthly_' + Date.now() + '","mimeType":"application/vnd.google-apps.document"}';
    var p1 = Utilities.newBlob(
      '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
      meta + '\r\n--' + boundary + '\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n'
    ).getBytes();
    var p2 = Utilities.newBlob('\r\n--' + boundary + '--').getBytes();
    var body = p1.concat(Utilities.newBlob(html).getBytes()).concat(p2);


    var up = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token,
                 'Content-Type': 'multipart/related; boundary=' + boundary },
      payload: body, muteHttpExceptions: true
    });
    if (up.getResponseCode() !== 200) throw new Error('Upload ' + up.getResponseCode());
    var fileId = JSON.parse(up.getContentText()).id;
    if (!fileId) throw new Error('No fileId');


    // Export as PDF
    var pdfResp = UrlFetchApp.fetch(
      'https://docs.google.com/feeds/download/documents/export/Export?id=' + fileId + '&exportFormat=pdf',
      { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true }
    );
    var pdfBlob = pdfResp.getBlob().setName('מסמכים-' + month.replace('/', '-') + '.pdf');


    // Cleanup
    try { UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + fileId,
      { method:'DELETE', headers:{ Authorization:'Bearer '+token }, muteHttpExceptions:true }); } catch(_){}


    return pdfBlob;
  } catch(e) {
    Logger.log('_buildMonthlyListPdf error: ' + e);
    return null;
  }
}


  if (action === 'sendTransactionLog') {
    // DEBUG PING — remove after confirming this gets through
    if (e.parameter.ping === '1') {
      return ContentService.createTextOutput(JSON.stringify({ok:false, error:'PING OK — action reached', count:0})).setMimeType(ContentService.MimeType.JSON);
    }
    var fromDate  = e.parameter.from  || '';
    var toDate    = e.parameter.to    || '';
    var typesRaw  = e.parameter.types || '1,2,3,7,16';
    var toEmail   = e.parameter.email || '';
    if (!fromDate || !toDate || !toEmail)
      return ContentService.createTextOutput(JSON.stringify({ok:false, error:'Missing parameters'})).setMimeType(ContentService.MimeType.JSON);


    var typeIds = typesRaw.split(',').map(function(t){ return t.trim(); }).filter(Boolean);
    var typeNames = {'1':'חשבונית מס','2':'קבלה','3':'חש/קבלה','4':'תעודת משלוח','7':'חשבונית קבלה','9':'חשבונית זיכוי','10':'הצעת מחיר','16':'הצעת מחיר'};


    // Format dates for Caspit API (MM/DD/YYYY)
    // Caspit expects ISO date format YYYY-MM-DD (same as HTML date input)
    var datStart = fromDate;  // already YYYY-MM-DD from frontend
    var datEnd   = toDate;


    var workerBase = 'https://yb-caspit-proxy.sunroof-dictate-39.workers.dev';
    // Parallel fetch via Cloudflare Worker — page=0 (Caspit is 0-indexed)
    var requests = typeIds.map(function(typeId) {
      return {
        url: workerBase + '/?action=listDocsByDate&trxTypeId=' + typeId +
          '&datStart=' + encodeURIComponent(datStart) +
          '&datEnd=' + encodeURIComponent(datEnd) + '&page=0',
        muteHttpExceptions: true
      };
    });
    var responses; var fetchErrors = [];
    try { responses = UrlFetchApp.fetchAll(requests); }
    catch(ef) { return ContentService.createTextOutput(JSON.stringify({ok:false, error:'Caspit: '+ef.message})).setMimeType(ContentService.MimeType.JSON); }
    var allDocs = [];
    responses.forEach(function(resp, idx) {
      try {
        var data = JSON.parse(resp.getContentText());
        // Caspit returns CaspitResponse: {Results:[...], TotalPages, CurrentPage}
        var docs = Array.isArray(data) ? data : (data.Results || data.results || []);
        docs.forEach(function(doc) {
          doc._typeName = typeNames[String(typeIds[idx])] || ('סוג ' + typeIds[idx]); doc._typeId = String(typeIds[idx]);
          allDocs.push(doc);
        });
      } catch(ep) { fetchErrors.push('Type ' + typeIds[idx] + ': ' + ep.message); }
    });


    if (!allDocs.length)
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: 'לא נמצאו תנועות בטווח הנבחר',
        count: 0,
        debug: {from: datStart, to: datEnd, types: typeIds, errors: fetchErrors,
          sample: responses.map(function(r,i){return {type:typeIds[i],code:r.getResponseCode(),body:r.getContentText().slice(0,120)};})
        }
      })).setMimeType(ContentService.MimeType.JSON);


    // Sort by document date
    allDocs.sort(function(a,b) {
      var da = new Date(a.DocumentDate || a.CreationDate || 0);
      var db = new Date(b.DocumentDate || b.CreationDate || 0);
      return da - db;
    });


    // Format display date
    function fmtDisplayDate(raw) {
      if (!raw) return '';
      var d = new Date(raw);
      if (isNaN(d)) return raw;
      return ('0'+d.getDate()).slice(-2) + '/' + ('0'+(d.getMonth()+1)).slice(-2) + '/' + d.getFullYear();
    }


    // Calculate totals
    var totalBeforeTax = 0, totalVat = 0, totalWithTax = 0;
    allDocs.forEach(function(doc) {
      var t = parseFloat(doc.Total || doc.TotalWithVat || 0);
      if (!t) t = parseFloat(doc.TotalPayment || doc.TotalPaymentNIS || doc.EffectiveTotal || 0);
      totalBeforeTax += parseFloat(doc.TotalBeforeVAT || doc.BeforeTax || doc.Price || 0) || t;
      totalVat       += parseFloat(doc.Vat || doc.VatAmount || 0);
      totalWithTax   += t;
    });


    // Build HTML email
    var displayFrom = fromDate.split('-').reverse().join('/');
    var displayTo   = toDate.split('-').reverse().join('/');


    var rows = allDocs.map(function(doc) {
      var bt  = parseFloat(doc.TotalBeforeVAT || doc.BeforeTax || doc.Price || 0);
      var vat = parseFloat(doc.Vat || doc.VatAmount || 0);
      var tot = parseFloat(doc.Total || doc.TotalWithVat || 0);
      // Receipts (קבלה) store amount in TotalPayment / EffectiveTotal
      if (!tot) { tot = parseFloat(doc.TotalPayment || doc.TotalPaymentNIS || doc.EffectiveTotal || 0); vat = 0; bt = tot; }
      var status = doc.Status || doc.DocStatus || '';
      return '<tr style="border-bottom:1px solid #f0f0f0;">' +
        '<td style="padding:7px 10px;font-size:12px;direction:rtl;">' + fmtDisplayDate(doc.Date || doc.DocumentDate || doc.CreationDate || doc.DateCreated) + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;text-align:center;">' + (doc.Number || doc.DocumentNumber || '') + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;direction:rtl;">' + (doc.CustomerBusinessName || doc.CustomerName || doc.ContactName || doc.Contact || '') + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;direction:rtl;">' + doc._typeName + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;text-align:left;">₪' + bt.toFixed(2) + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;text-align:left;">₪' + vat.toFixed(2) + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;font-weight:700;text-align:left;">₪' + tot.toFixed(2) + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;color:#666;">' + status + '</td>' +
      '</tr>';
    }).join('');


    var html =
      '<div dir="rtl" style="font-family:Arial,sans-serif;max-width:900px;margin:0 auto;">' +
      '<h2 style="color:#0d47a1;border-bottom:2px solid #0d47a1;padding-bottom:8px;">📊 יומן תנועות — ' + displayFrom + ' עד ' + displayTo + '</h2>' +
      '<p style="color:#666;font-size:13px;">' + allDocs.length + ' תנועות | י.ב אחזקות</p>' +
      '<table style="width:100%;border-collapse:collapse;margin-top:16px;">' +
        '<thead><tr style="background:#0d47a1;color:#fff;">' +
          '<th style="padding:9px 10px;text-align:right;font-size:12px;">תאריך</th>' +
          '<th style="padding:9px 10px;text-align:center;font-size:12px;">מסמך #</th>' +
          '<th style="padding:9px 10px;text-align:right;font-size:12px;">לקוח</th>' +
          '<th style="padding:9px 10px;text-align:right;font-size:12px;">סוג</th>' +
          '<th style="padding:9px 10px;text-align:left;font-size:12px;">לפני מע"מ</th>' +
          '<th style="padding:9px 10px;text-align:left;font-size:12px;">מע"מ</th>' +
          '<th style="padding:9px 10px;text-align:left;font-size:12px;">סה"כ</th>' +
          '<th style="padding:9px 10px;text-align:right;font-size:12px;">סטטוס</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '<tfoot><tr style="background:#e8f5e9;font-weight:700;">' +
          '<td colspan="4" style="padding:9px 10px;font-size:13px;text-align:right;">סה"כ (' + allDocs.length + ' תנועות)</td>' +
          '<td style="padding:9px 10px;font-size:13px;">₪' + totalBeforeTax.toFixed(2) + '</td>' +
          '<td style="padding:9px 10px;font-size:13px;">₪' + totalVat.toFixed(2) + '</td>' +
          '<td style="padding:9px 10px;font-size:13px;color:#1b5e20;">₪' + totalWithTax.toFixed(2) + '</td>' +
          '<td></td>' +
        '</tr></tfoot>' +
      '</table>' +
      (fetchErrors.length ? '<p style="color:#c62828;font-size:11px;margin-top:12px;">שגיאות: ' + fetchErrors.join(', ') + '</p>' : '') +
      '<p style="font-size:11px;color:#aaa;margin-top:20px;">נשלח מ-BLUE — YB Tracker</p>' +
      '</div>';


    // Build כרטסת תנועות PDF (Caspit-style report) and email it
    var subject2 = 'כרטסת תנועות ' + displayFrom + ' – ' + displayTo + ' | י.ב אחזקות';
    var pdfBlob2 = _buildTransactionLogPdf(allDocs, displayFrom, displayTo, fromDate, toDate, typeNames);
    var mailOpts2 = { name: 'י.ב אחזקות — כרטסת תנועות' };
    if (pdfBlob2) mailOpts2.attachments = [pdfBlob2];
    var bodyText2 = 'מצורפת כרטסת תנועות ' + displayFrom + ' – ' + displayTo +
      ' | ' + allDocs.length + ' תנועות | י.ב אחזקות';
    GmailApp.sendEmail(toEmail, subject2, bodyText2, mailOpts2);
    return ContentService.createTextOutput(JSON.stringify({
      ok: true, mailSent: true, count: allDocs.length, toEmail: toEmail,
      pdfAttached: pdfBlob2 ? 1 : 0, html: html
    })).setMimeType(ContentService.MimeType.JSON);
  }
  if (action === 'createExpenseRow') {
    try {
      var jobId   = e.parameter.jobId   || '';
      var client  = e.parameter.client  || '';
      var title   = e.parameter.title   || '';
      var po      = e.parameter.po      || '';
      if (!jobId || !client) return ContentService.createTextOutput(JSON.stringify({ok:false,error:'missing jobId/client'})).setMimeType(ContentService.MimeType.JSON);


      // Sum all expenses for this job
      var expSh = ss.getSheetByName('Expenses');
      var totalExp = 0;
      var billedRows = [];   // v205: Expenses rows to stamp as billed (col J) once the rollup is written
      if (expSh) {
        var expData = expSh.getDataRange().getValues();
        for (var er = 1; er < expData.length; er++) {
          if (String(expData[er][0]).trim() !== jobId) continue;
          totalExp += parseFloat(expData[er][5]||0);   // unchanged: rollup stays the FULL job total (v204 set-to-total)
          if (String(expData[er][9]||'').trim() === '') billedRows.push(er + 1);
        }
      }
      if (totalExp <= 0) return ContentService.createTextOutput(JSON.stringify({ok:true,skipped:true,reason:'no expenses'})).setMimeType(ContentService.MimeType.JSON);
      // v204: if a rollup line already exists for this job, update it in place instead of appending a duplicate
      if (_syncExpenseRollup(ss, jobId, client, title)) {
        var markedU = _stampExpensesBilled(expSh, billedRows);   // v205
        return ContentService.createTextOutput(JSON.stringify({ok:true, updated:true, total:totalExp, marked:markedU})).setMimeType(ContentService.MimeType.JSON);
      }


      // Get client sheet and find columns
      var clientSh = ss.getSheetByName(client);
      if (!clientSh) return ContentService.createTextOutput(JSON.stringify({ok:false,error:'sheet not found: '+client})).setMimeType(ContentService.MimeType.JSON);
      var dat  = clientSh.getDataRange().getValues();
      var cols = findColumns(dat);
      if (cols.headerRow === -1) return ContentService.createTextOutput(JSON.stringify({ok:false,error:'no header'})).setMimeType(ContentService.MimeType.JSON);


      // Generate new job ID — same prefix as existing rows, max+1
      var prefix = 'EX';
      var maxNum = 0;
      for (var r = cols.headerRow+1; r < dat.length; r++) {
        var eid = String(dat[r][cols.jobId]||'').trim();
        if (eid) { prefix = eid.replace(/[0-9]/g,'') || prefix; var n = parseInt(eid.match(/\d+/)||[0]); if (n > maxNum) maxNum = n; }
      }
      var newJobId = prefix + String(maxNum+1).padStart(4,'0');


      // Find last data row and append after it
      var lastRow = cols.headerRow;
      for (var r2 = cols.headerRow+1; r2 < dat.length; r2++) if (String(dat[r2][cols.jobId]||'').trim()) lastRow = r2;
      var newRowNum = lastRow + 2;


      // Copy format from last data row
      if (lastRow > cols.headerRow) {
        clientSh.getRange(lastRow+1,1,1,clientSh.getLastColumn()).copyTo(
          clientSh.getRange(newRowNum,1,1,clientSh.getLastColumn()),
          SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
      }


      // Build row
      var mc = 0;
      [cols.jobId,cols.desc,cols.price,cols.qty,cols.status,cols.po,cols.invoiceStatus,cols.dateStart,cols.income,cols.grossProfit,cols.notes].forEach(function(c){if(c>mc)mc=c;});
      var row = []; for (var ci=0;ci<=mc;ci++) row.push('');
      row[cols.jobId] = newJobId;
      if (cols.notes !== -1) row[cols.notes] = 'SRC:' + jobId;  // v204: back-ref so the rollup line is findable by source job
      if (cols.desc        !== -1) row[cols.desc]         = 'הוצאות ' + title;
      if (cols.price       !== -1) row[cols.price]        = totalExp;
      if (cols.qty         !== -1) row[cols.qty]          = 1;
      if (cols.status      !== -1) row[cols.status]       = 'בוצע';
      if (cols.po          !== -1) row[cols.po]           = po;
      if (cols.invoice !== -1) row[cols.invoice] = 'להוציא חש';
      // v201: this expense row had no income/gross-profit at all — price/qty were
      // set but never multiplied into income, so the printed quote line showed ₪0
      // gross profit and a blank "הכנסה מתוכננת". Fill both now: income = price*qty,
      // gross profit = income (no separate cost to subtract — this IS the cost,
      // billed straight through to the client).
      
      clientSh.getRange(newRowNum,1,1,row.length).setValues([row]);
      copyProfitFormulasDown(clientSh, cols, newRowNum);
      Logger.log('✅ Created expense row ' + newJobId + ' for ' + client + ' — ₪' + totalExp);
      var markedC = _stampExpensesBilled(expSh, billedRows);   // v205
      return ContentService.createTextOutput(JSON.stringify({ok:true, newJobId:newJobId, total:totalExp, marked:markedC})).setMimeType(ContentService.MimeType.JSON);
    } catch(ee) { return ContentService.createTextOutput(JSON.stringify({ok:false,error:ee.message})).setMimeType(ContentService.MimeType.JSON); }
  }
  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
}


// ── Caspit token management ────────────────────────────────────────────────
// ── Helper: recalculate עלויות + רווח גולמי after expense change ──────────
// v205: mark Expenses rows as billed — col J (index 9) gets a date stamp.
// Informational only: the double-billing guard is _syncExpenseRollup's set-to-total,
// not this stamp. The daily list uses it to grey out + tick already-billed expenses.
function _stampExpensesBilled(expSh, rows) {
  if (!expSh || !rows || !rows.length) return 0;
  var stamp = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd');
  for (var i = 0; i < rows.length; i++) expSh.getRange(rows[i], 10).setValue(stamp);
  return rows.length;
}

function _syncExpenseRollup(ss, jobId, client, title) {
  // Single source of truth for a job's 'הוצאות <title>' rollup line on the client sheet.
  // Returns true iff an existing rollup row was found and handled (updated or deleted); false if none existed.
  // Never appends here — createExpenseRow owns creation. Price-only updates preserve the sheet's profit formulas.
  if (!jobId || !client) return false;
  var expSh = ss.getSheetByName('Expenses');
  var total = 0;
  if (expSh) {
    var ed = expSh.getDataRange().getValues();
    for (var er = 1; er < ed.length; er++) if (String(ed[er][0]).trim() === jobId) total += parseFloat(ed[er][5]||0);
  }
  var sh = ss.getSheetByName(client);
  if (!sh) return false;
  var dat  = sh.getDataRange().getValues();
  var cols = findColumns(dat);
  if (cols.headerRow === -1) return false;
  var SRC = 'SRC:' + jobId;
  var legacyDesc = title ? ('הוצאות ' + title) : '';
  var hits = [];
  for (var r = cols.headerRow + 1; r < dat.length; r++) {
    var noteVal = (cols.notes !== -1) ? String(dat[r][cols.notes] || '') : '';
    var descVal = (cols.desc  !== -1) ? String(dat[r][cols.desc]  || '').trim() : '';
    var isSrc = (cols.notes !== -1) && noteVal.indexOf(SRC) !== -1;
    var isLegacy = legacyDesc && descVal === legacyDesc && noteVal.indexOf('SRC:') === -1; // untagged legacy line, this title
    if (isSrc || isLegacy) hits.push(r);
  }
  if (!hits.length) return false;
  // collapse duplicates: delete extras bottom-up so row indices below don't shift
  for (var d = hits.length - 1; d >= 1; d--) sh.deleteRow(hits[d] + 1);
  var keep = hits[0];               // 0-based data index; sheet row = keep+1
  if (total <= 0) { sh.deleteRow(keep + 1); return true; }
  var rowNum = keep + 1;
  if (cols.price !== -1) sh.getRange(rowNum, cols.price + 1).setValue(total); // income/GP formulas recompute from price
  if (cols.qty   !== -1 && !dat[keep][cols.qty]) sh.getRange(rowNum, cols.qty + 1).setValue(1);
  if (cols.notes !== -1 && String(dat[keep][cols.notes] || '').indexOf(SRC) === -1) {
    var nv = String(dat[keep][cols.notes] || ''); sh.getRange(rowNum, cols.notes + 1).setValue((nv ? nv + ' ' : '') + SRC);
  }
  return true;
}

function repairExpenseRollups(dryRun) {
  // One-time integrity pass over legacy rollup lines. DRY-RUN by default: pass false to actually write.
  // Backfills SRC:<jobId> on untagged 'הוצאות <title>' lines (matching title -> source job's desc on the same sheet),
  // collapses duplicates, and recomputes each line's price from the Expenses sheet.
  if (dryRun === undefined) dryRun = true;
  var ss = SpreadsheetApp.openById('1Wn2-Yzx08H2NKmJLsMs2xrYIBPLzJJqvRo-Su8jWlgA');
  var expSh = ss.getSheetByName('Expenses');
  var expByJob = {};
  if (expSh) { var ed = expSh.getDataRange().getValues(); for (var er = 1; er < ed.length; er++){ var j = String(ed[er][0]).trim(); if(j) expByJob[j] = (expByJob[j]||0) + parseFloat(ed[er][5]||0); } }
  var log = [], sheets = ss.getSheets();
  for (var si = 0; si < sheets.length; si++) {
    var sh = sheets[si], name = sh.getName();
    if (typeof isSystemSheet === 'function' && isSystemSheet(name)) continue;
    var dat = sh.getDataRange().getValues(), cols = findColumns(dat);
    if (cols.headerRow === -1 || cols.desc === -1) continue;
    // gather rollup lines and a title->jobId map from non-rollup rows
    var titleToJob = {};
    for (var r = cols.headerRow + 1; r < dat.length; r++) {
      var dv = String(dat[r][cols.desc] || '').trim(), jid = String(dat[r][cols.jobId] || '').trim();
      if (jid && dv && dv.indexOf('הוצאות ') !== 0) { if (titleToJob[dv] === undefined) titleToJob[dv] = jid; else titleToJob[dv] = null; } // null = ambiguous
    }
    var seen = {};
    for (var r2 = cols.headerRow + 1; r2 < dat.length; r2++) {
      var dv2 = String(dat[r2][cols.desc] || '').trim();
      if (dv2.indexOf('הוצאות ') !== 0) continue;
      var title = dv2.substring('הוצאות '.length).trim();
      var note = (cols.notes !== -1) ? String(dat[r2][cols.notes] || '') : '';
      var srcJob = (note.match(/SRC:(\S+)/) || [])[1] || '';
      if (!srcJob) { var m = titleToJob[title]; if (m) srcJob = m; }
      if (!srcJob) { log.push(name + ' | row ' + (r2+1) + ' | "' + dv2 + '" | UNRESOLVED (no SRC, title ambiguous/unmatched) — manual review'); continue; }
      var key = srcJob;
      if (seen[key]) { log.push(name + ' | row ' + (r2+1) + ' | DUPLICATE of ' + srcJob + ' -> ' + (dryRun?'would delete':'DELETED')); if(!dryRun) sh.deleteRow(r2+1); continue; }
      seen[key] = true;
      var want = expByJob[srcJob] || 0, cur = (cols.price !== -1) ? parseFloat(dat[r2][cols.price] || 0) : 0;
      var acts = [];
      if (cols.notes !== -1 && note.indexOf('SRC:') === -1) { acts.push('tag SRC:'+srcJob); if(!dryRun) sh.getRange(r2+1, cols.notes+1).setValue((note?note+' ':'')+'SRC:'+srcJob); }
      if (want <= 0) { acts.push('total 0 -> '+(dryRun?'would delete':'DELETE')); if(!dryRun) sh.deleteRow(r2+1); }
      else if (Math.abs(want - cur) > 0.005) { acts.push('price '+cur+' -> '+want); if(!dryRun && cols.price!==-1) sh.getRange(r2+1, cols.price+1).setValue(want); }
      if (acts.length) log.push(name + ' | row ' + (r2+1) + ' | ' + srcJob + ' | ' + acts.join(' ; '));
    }
  }
  var out = (dryRun ? '=== DRY RUN (no writes) ===\n' : '=== APPLIED ===\n') + (log.length ? log.join('\n') : 'nothing to do');
  Logger.log(out);
  return out;
}

function _updateJobCosts(ss, jobId, client) {
  if (!jobId || !client) return;
  // Sum all expenses for this jobId
  var expSh = ss.getSheetByName('Expenses');
  var totalCosts = 0;
  if (expSh) {
    var expData = expSh.getDataRange().getValues();
    for (var er = 1; er < expData.length; er++) {
      if (String(expData[er][0]).trim() === jobId) {
        totalCosts += parseFloat(expData[er][5] || 0);
      }
    }
  }
 // Find job row in client sheet and update עלויות (costs only — רווח גולמי is a formula)
  var clientSh = ss.getSheetByName(client);
  if (!clientSh) return;
  var dat = clientSh.getDataRange().getValues();
  var cols = findColumns(dat);
  if (cols.headerRow === -1 || cols.costs === -1) return;
  for (var r = cols.headerRow + 1; r < dat.length; r++) {
    if (String(dat[r][cols.jobId] || '').trim() !== jobId) continue;
    clientSh.getRange(r + 1, cols.costs + 1).setValue(totalCosts);
    // v909: רווח גולמי is a live sheet formula — it recalculates automatically
    // when we update costs. Never write into that column.
    break;
  }
}
// ── End helper ─────────────────────────────────────────────────────────────


function getCaspitToken() {
  var props = PropertiesService.getScriptProperties();
  var cachedToken = props.getProperty('CASPIT_TOKEN');
  var cachedTime  = props.getProperty('CASPIT_TOKEN_TIME');
  var now = Date.now();
  if (cachedToken && (!cachedTime || (now - parseInt(cachedTime) < 8 * 60 * 1000))) return cachedToken;   // v202: Caspit tokens live 10min — 25min cache served dead tokens
  var pwd  = props.getProperty('CASPIT_PWD');
  var user = props.getProperty('CASPIT_USERNAME') || 'yaniv berg';
  var osek = '060139755';
  if (!pwd) { console.error('CASPIT_PWD not set — using cached token'); return cachedToken || null; }
  try {
    // Match Cloudflare Worker: POST with form-encoded body, OsekMorshe (not OsekMorsheNumber)
    var body = 'UserName=' + encodeURIComponent(user) + '&Password=' + encodeURIComponent(pwd) + '&OsekMorshe=' + osek;
    var resp = UrlFetchApp.fetch('https://app.caspit.biz/api/v1/token/', {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: body,
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    var text = resp.getContentText().trim();
    console.log('Caspit token: HTTP ' + code + ' | ' + text.slice(0, 80));
    if (code === 200 && text) {
      var token = text;
      // Parse: JSON string, JSON object, or XML <string>...</string>
      try { var p = JSON.parse(text); token = (typeof p === 'string') ? p : (p.Token || p.token || text); } catch(_) {}
      if (token.indexOf('<') === 0) { try { token = XmlService.parse(token).getRootElement().getText(); } catch(_) {} }
      token = token.replace(/^"|"$/g, '').trim();
      if (token && token.length > 10) {
        props.setProperties({ 'CASPIT_TOKEN': token, 'CASPIT_TOKEN_TIME': now.toString() });
        console.log('Caspit token refreshed OK');
        return token;
      }
    }
    console.error('Token refresh failed (HTTP ' + code + ') — using cached');
    return cachedToken || null;
  } catch(e) {
    console.error('getCaspitToken exception: ' + e.toString() + ' — using cached');
    return cachedToken || null;
  }
}


// v203: email a single quote's CLEANED PDF via Gmail. Reuses the monthly-bundle pattern
// (worker getDocPdf → base64 PDF → GmailApp attachment). Caspit's own EmailDocument API 500s
// on every call, so we never touch it. Returns {ok, error?}. trxTypeId fixed to 16 (quote).
// A 2s pause lets Caspit regenerate the PDF after the client's line-Details cleanup PUT.
function emailQuotePdfViaGmail(docId, docNum, to) {
  var wb = 'https://yb-caspit-proxy.sunroof-dictate-39.workers.dev';
  var toAddr = to || 'yanivberg@icloud.com';
  Utilities.sleep(2000); // let Caspit regenerate the PDF after the cleanup PUT
  function _fetchPdf() {
    var url = wb + '/?action=getDocPdf&docNumber=' + encodeURIComponent(docNum||'') +
      '&trxTypeId=16&docId=' + encodeURIComponent(docId||'');
    try {
      var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, deadline: 25 });
      var pd = JSON.parse(resp.getContentText());
      if (pd && pd.ok && pd.pdf) return { pdf: pd.pdf };
      return { error: (pd && pd.error) ? pd.error : 'no pdf' };
    } catch(e) { return { error: 'fetch: ' + (e.message||e) }; }
  }
  var got = _fetchPdf();
  if (!got.pdf) { Utilities.sleep(2500); got = _fetchPdf(); } // one gentle retry
  if (!got.pdf) return { ok:false, error: 'PDF fetch failed: ' + (got.error||'unknown') };
  try {
    var bytes = Utilities.base64Decode(got.pdf);
    var fname = 'הצעת מחיר ' + (docNum||'') + '.pdf';
    var subject = 'הצעת מחיר ' + (docNum ? (docNum + ' ') : '') + '| י.ב אחזקות';
    var bodyText = 'מצורפת הצעת מחיר ' + (docNum||'') + ' | י.ב אחזקות';
    GmailApp.sendEmail(toAddr, subject, bodyText, { attachments: [Utilities.newBlob(bytes, 'application/pdf', fname)] });
    return { ok:true };
  } catch(e) { return { ok:false, error: 'send: ' + (e.message||e) }; }
}


function setToken() {
  PropertiesService.getScriptProperties().setProperty('CASPIT_TOKEN', 'PASTE_TOKEN_HERE');
  Logger.log('Token set');
}


function setCaspitPassword() {
  PropertiesService.getScriptProperties().setProperty('CASPIT_PWD', 'placeholder');
  Logger.log('Password stored');
}


function findColumns(data) {
  var result = {
    headerRow: -1, jobId: -1, status: -1, desc: -1,
    hours: -1, hoursActual: -1, dateStart: -1, dateEnd: -1,
    notes: -1, category: -1, price: -1, qty: -1, po: -1,
    invoice: -1, invoiceQuote: -1, income: -1, costs: -1,
    grossProfit: -1, profitPerHour: -1, location: -1, progress: -1
  };
  for (var i = 0; i < Math.min(6, data.length); i++) {
    var row = data[i];
    for (var j = 0; j < row.length; j++) {
      var v = String(row[j] || '').trim();
      if (v.indexOf('Job_ID') !== -1)                                    { result.headerRow = i; result.jobId = j; }
      if (v === 'סטטוס' || v === 'status')                                result.status       = j;
      if (v.indexOf('תיאור') !== -1 && result.desc === -1)               result.desc         = j;
      if (v.indexOf('הערכת שעות') !== -1)                                result.hours        = j;
      if (v.indexOf('שעות בפועל') !== -1)                                result.hoursActual  = j;
      if (v.indexOf('תאריך התחלה') !== -1)                               result.dateStart    = j;
      if (v.indexOf('תאריך סיום') !== -1)                                result.dateEnd      = j;
      if (v.indexOf('הערות') !== -1 && result.notes === -1)              result.notes        = j;
      if (v === 'קטגוריה')                                                result.category     = j;
      if (v.indexOf('מחיר') !== -1 && v.indexOf('ליחידה') !== -1)        result.price        = j;
      if (v === 'כמות')                                                   result.qty          = j;
      if (v.indexOf('רכש') !== -1)                                        result.po           = j;
      if (v.indexOf('יצאה חש') !== -1)                                    result.invoice      = j;
      if (v.indexOf('הצעת מחיר') !== -1)                                 result.invoiceQuote = j;
      if (v.indexOf('הכנסה') !== -1)                                      result.income       = j;
      if (v.indexOf('עלויות') !== -1 || v.indexOf('עלות') !== -1)        result.costs        = j;
      if (v.indexOf('רווח גולמי') !== -1)                                 result.grossProfit  = j;
      if (v.indexOf('רווח לשעה') !== -1)                                  result.profitPerHour= j;
      if (v === 'אתר/מיקום' || v.indexOf('אתר/מיקום') !== -1)           result.location     = j;
      if (v.indexOf('אחוז התקדמות') !== -1)                              result.progress     = j;
    }
    if (result.headerRow !== -1) break;
  }
  return result;
}


function doPost(e) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var action = (e.parameter && e.parameter.action) || '';
  var body = {};
  try { body = JSON.parse(e.postData && e.postData.contents || '{}'); action = action || body.action || ''; } catch(ex) {}


  // Route AI actions (sent as POST with JSON body) through a synthetic e object to doGet
  var AI_ACTIONS = ['getProjectTips','getAISessionTips','getAIBriefing','getAIAnalysis','getAIDeepAnalysis','analyzeJobForPreSurvey','getWorkPatternAnalysis','sendTransactionLog'];
  if (AI_ACTIONS.indexOf(action) !== -1) {
    // Build synthetic e.parameter from POST body for doGet handlers
    var syntheticE = {
      parameter: { action: action }
    };
    Object.keys(body).forEach(function(k) { syntheticE.parameter[k] = typeof body[k] === 'string' ? body[k] : JSON.stringify(body[k]); });
    return doGet(syntheticE);
  }


  if (action === 'updateQuote') {
    try {
      var wb4 = 'https://yb-caspit-proxy.sunroof-dictate-39.workers.dev';
      var caspitDoc = body.caspitDoc || {};
      var client4   = body.client   || '';
      var jobId4    = body.jobId    || '';
      var newDesc4  = body.desc     || '';
      var newPrice4 = parseFloat(body.price || 0);


      // ── Look up the correct DocumentId (YB-Q-{ts}) from Caspit Documents sheet ──
      // The list endpoint returns DocumentId = accounting code ("הכנסות/מכירות"), not the path id.
      // Our sheet logs the real Caspit ID in col 8 (index 7) keyed by Doc Number (col 3, index 2).
      var docNum4lookup = String(caspitDoc.Number || '').trim();
      if (docNum4lookup) {
        var logSh4 = ss.getSheetByName('Caspit Documents');
        if (logSh4) {
          var logData4 = logSh4.getDataRange().getValues();
          for (var lr4 = 1; lr4 < logData4.length; lr4++) {
            if (String(logData4[lr4][2]).trim() === docNum4lookup) {
              var storedId4 = String(logData4[lr4][7] || '').trim();
              if (storedId4) { caspitDoc.DocumentId = storedId4; break; }
            }
          }
        }
      }
      // ── End lookup ──


      var updResp = UrlFetchApp.fetch(wb4 + '/?action=updateDocument', {
        method: 'post', contentType: 'application/json',
        payload: JSON.stringify(caspitDoc), muteHttpExceptions: true, deadline: 25
      });
      var updResult = JSON.parse(updResp.getContentText());
      if (!updResult.ok) return ContentService.createTextOutput(JSON.stringify({ok:false,error:updResult.error||'Caspit update failed'})).setMimeType(ContentService.MimeType.JSON);
      if (client4) {
        var clientSh4 = ss.getSheetByName(client4);
        if (clientSh4) {
          var dat4 = clientSh4.getDataRange().getValues();
          var cols4 = findColumns(dat4);
          if (cols4.headerRow !== -1) {
            for (var rr4 = cols4.headerRow + 1; rr4 < dat4.length; rr4++) {
              var invQ = cols4.invoiceQuote !== -1 ? String(dat4[rr4][cols4.invoiceQuote]||'').trim() : '';
              var jid4 = String(dat4[rr4][cols4.jobId]||'').trim();
              if ((invQ && invQ === (caspitDoc.Number||'')) || (jobId4 && jid4 === jobId4)) {
                if (cols4.desc   !== -1 && newDesc4)  clientSh4.getRange(rr4+1, cols4.desc+1).setValue(newDesc4);
                if (cols4.income !== -1 && newPrice4) clientSh4.getRange(rr4+1, cols4.income+1).setValue(newPrice4);
                break;
              }
            }
          }
        }
      }
      // ── Email the CLEANED PDF via Gmail (v203) ──────────────────────────
      // The edit already re-saved the doc Details-first (single description); email that PDF.
      // Caspit's EmailDocument API 500s on every call, so we use worker getDocPdf → GmailApp.
      var docId4  = caspitDoc.DocumentId || '';
      var docNum4 = caspitDoc.Number     || '';
      var mailSent4 = false;
      try {
        var eqRes4 = emailQuotePdfViaGmail(docId4, docNum4, 'yanivberg@icloud.com');
        mailSent4 = !!(eqRes4 && eqRes4.ok);
      } catch(_emailErr) {}
      return ContentService.createTextOutput(JSON.stringify({ok:true,mailSent:mailSent4})).setMimeType(ContentService.MimeType.JSON);
    } catch(euq){ return ContentService.createTextOutput(JSON.stringify({ok:false,error:euq.message})).setMimeType(ContentService.MimeType.JSON); }
  }

  if (action === 'emailQuote') {
    // v203: email the CLEANED quote PDF via Gmail (worker getDocPdf → GmailApp), NOT Caspit's
    // EmailDocument API (500s on every call, silently). Called by HTML v923 AFTER the line-Details
    // cleanup PUT resolves, so the fetched PDF shows the description once.
    var docIdEQ  = (e.parameter && e.parameter.docId)  || body.docId  || '';
    var docNumEQ = (e.parameter && e.parameter.docNum) || body.docNum || '';
    var toEQ     = (e.parameter && e.parameter.to)     || body.to     || 'yanivberg@icloud.com';
    if (!docIdEQ && !docNumEQ) return ContentService.createTextOutput(JSON.stringify({ok:false,error:'docId or docNum required'})).setMimeType(ContentService.MimeType.JSON);
    try {
      var eqRes = emailQuotePdfViaGmail(docIdEQ, docNumEQ, toEQ);
      return ContentService.createTextOutput(JSON.stringify({ok: eqRes.ok, mailSent: eqRes.ok, error: eqRes.error||undefined})).setMimeType(ContentService.MimeType.JSON);
    } catch(errEQ){ return ContentService.createTextOutput(JSON.stringify({ok:false,error:errEQ.message})).setMimeType(ContentService.MimeType.JSON); }
  }


if (action === 'addJobsBulk') {
    var noDate  = (e.parameter && e.parameter.noDate) === '1' || body.noDate === '1';
    var rowsRaw = (e.parameter && e.parameter.rows) || body.rows || '[]';
    var rows;
    try { rows = JSON.parse(rowsRaw); } catch(err) { rows = []; }
    if (!rows.length || !client) return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);


    var sheet = ss.getSheetByName(client);
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({error:'Sheet not found'})).setMimeType(ContentService.MimeType.JSON);
    var data = sheet.getDataRange().getValues(); var cols = findColumns(data);
    if (cols.headerRow === -1) return ContentService.createTextOutput(JSON.stringify({error:'Header not found'})).setMimeType(ContentService.MimeType.JSON);


    var prefix = client.replace(/[^a-zA-Z]/g,'').substring(0,2).toUpperCase();
    var maxNum = 0;
    for (var r = cols.headerRow + 1; r < data.length; r++) {
      var rid = String(data[r][cols.jobId] || '').trim();
      if (rid) { var p = rid.replace(/[0-9]/g,''); if (p) prefix = p; var n = parseInt(rid.replace(/[^0-9]/g,'')) || 0; if (n > maxNum) maxNum = n; }
    }


    var today = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd/MM/yyyy');
    var newIds = [];


    function findFirstEmptyRowPost() {
      var d = sheet.getDataRange().getValues();
      for (var rr = cols.headerRow + 1; rr < d.length; rr++) {
        var dv = cols.desc !== -1 ? String(d[rr][cols.desc] || '').trim() : 'x';
        if (dv === '') return rr + 1;
      }
      return sheet.getLastRow() + 1;
    }


    rows.forEach(function(row) {
      maxNum++;
      var newId = prefix + String(maxNum).padStart(4, '0');
      newIds.push(newId);
      var targetRow = findFirstEmptyRowPost();
      // v198: cell-by-cell write — never blanks the whole row width.
      sheet.getRange(targetRow, cols.jobId+1).setValue(newId);
      if (cols.desc   !== -1) sheet.getRange(targetRow, cols.desc+1).setValue(row.desc || '');
      if (cols.status !== -1) sheet.getRange(targetRow, cols.status+1).setValue(row.st || 'ממתין להצעה');
      if (cols.price  !== -1) sheet.getRange(targetRow, cols.price+1).setValue(parseFloat(row.pr) || 0);
      if (cols.qty    !== -1) sheet.getRange(targetRow, cols.qty+1).setValue(parseFloat(row.qt) || 0);
      if (cols.hours  !== -1) sheet.getRange(targetRow, cols.hours+1).setValue(parseFloat(row.eh) || 0);
      if (cols.category !== -1 && row.ca) sheet.getRange(targetRow, cols.category+1).setValue(row.ca);
      // v909: income/grossProfit/profitPerHour are live sheet formulas — never
      // write into them; copy the formulas down from the row above instead.
      copyProfitFormulasDown(sheet, cols, targetRow);
      // v84: date logic based on status
      if (cols.dateStart !== -1 && (row.st === 'במהלך ביצוע' || row.st === 'בוצע'))
        sheet.getRange(targetRow, cols.dateStart+1).setValue(today);
      if (cols.dateEnd !== -1 && row.st === 'בוצע')
        sheet.getRange(targetRow, cols.dateEnd+1).setValue(today);
    });
    return ContentService.createTextOutput(JSON.stringify(newIds)).setMimeType(ContentService.MimeType.JSON);
  }


  if (action === 'getCaspitTokenDirect') {
    try {
      var resp = UrlFetchApp.fetch('https://yb-caspit-proxy.sunroof-dictate-39.workers.dev/?action=testAuth', { muteHttpExceptions: true });
      var text = resp.getContentText();
      var logSheet = ss.getSheetByName('Caspit Log') || ss.insertSheet('Caspit Log');
      logSheet.appendRow([new Date(), 'getCaspitTokenDirect via Worker', resp.getResponseCode(), text.length > 10 ? 'OK' : 'FAILED']);
      return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({error: err.toString()})).setMimeType(ContentService.MimeType.JSON);
    }
  }


  // ── Deploy Latest File from Drive to GitHub ────────────────────────────────
  if (action === 'deployFromDrive') {
    try {
      var ghToken = e.parameter.ghToken || PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
      if (!ghToken) return ContentService.createTextOutput(JSON.stringify({ok:false,error:'GITHUB_TOKEN not set in Script Properties'})).setMimeType(ContentService.MimeType.JSON);


      var folderName  = e.parameter.folder  || '';
      var filePattern = e.parameter.pattern || 'yb-tracker-v';
      var repo        = e.parameter.repo    || 'yanivberg/yb-tracker';
      var targetPath  = e.parameter.path    || 'index.html';


      // ── Find latest matching file in Drive ──
      var query = 'title contains "' + filePattern + '" and trashed = false';
      if (folderName) {
        var folderIter = DriveApp.getFoldersByName(folderName);
        if (folderIter.hasNext()) {
          var folderId = folderIter.next().getId();
          query += ' and "' + folderId + '" in parents';
        }
      }
      var files = DriveApp.searchFiles(query);
      var latest = null, latestVersion = -1;
      while (files.hasNext()) {
        var f = files.next();
        var m = f.getName().match(/v(\d+)/);
        var v = m ? parseInt(m[1]) : 0;
        if (v > latestVersion) { latestVersion = v; latest = f; }
      }
      if (!latest) return ContentService.createTextOutput(JSON.stringify({ok:false,error:'No file found matching "' + filePattern + '"' + (folderName ? ' in folder "' + folderName + '"' : ' in Drive')})).setMimeType(ContentService.MimeType.JSON);


      var fileName = latest.getName();
      var content  = latest.getBlob().getDataAsString('UTF-8');
      var encoded  = Utilities.base64Encode(Utilities.newBlob(content, 'text/html').getBytes());


      // ── Get current SHA from GitHub ──
      var ghBase = 'https://api.github.com/repos/' + repo + '/contents/' + targetPath;
      var ghHeaders = { 'Authorization': 'token ' + ghToken, 'Accept': 'application/vnd.github.v3+json' };
      var shaResp = UrlFetchApp.fetch(ghBase, { headers: ghHeaders, muteHttpExceptions: true });
      var shaData = {};
      try { shaData = JSON.parse(shaResp.getContentText()); } catch(e2) {}
      var sha = shaData.sha || null;


      // ── Push to GitHub ──
      var pushPayload = { message: 'Deploy ' + fileName, content: encoded };
      if (sha) pushPayload.sha = sha;
      var pushResp = UrlFetchApp.fetch(ghBase, {
        method: 'put',
        headers: Object.assign({}, ghHeaders, {'Content-Type':'application/json'}),
        payload: JSON.stringify(pushPayload),
        muteHttpExceptions: true
      });
      var pushData = {};
      try { pushData = JSON.parse(pushResp.getContentText()); } catch(e3) {}


      if (pushResp.getResponseCode() === 200 || pushResp.getResponseCode() === 201) {
        return ContentService.createTextOutput(JSON.stringify({
          ok: true,
          file: fileName,
          version: latestVersion > 0 ? 'v' + latestVersion : fileName,
          commitSha: pushData.commit ? pushData.commit.sha.slice(0,7) : '',
          url: 'https://' + repo.split('/')[0] + '.github.io/' + repo.split('/')[1] + '/'
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ok:false,error:'GitHub API error ' + pushResp.getResponseCode() + ': ' + (pushData.message||'')})).setMimeType(ContentService.MimeType.JSON);
      }
    } catch(deployErr) {
      return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(deployErr)})).setMimeType(ContentService.MimeType.JSON);
    }
  }


  // ── יומן תנועות — fetch Caspit docs + email ─────────────────────────────




  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
}


function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}


// ── Gmail PO Importer ────────────────────────────────────────────────────────
var PO_SUBJECT_KEYWORD = 'הדפסת הזמנת רכש';
var PO_GMAIL_LABEL     = 'PO_Processed';


function scanPOEmailsOnly() {
  var found = [], threadIds = [], processedThisRun = {};
  var threads = GmailApp.search('has:attachment -label:' + PO_GMAIL_LABEL, 0, 30);
  threads.forEach(function(thread) {
    var threadMatched = false;
    thread.getMessages().forEach(function(msg) {
      msg.getAttachments().forEach(function(att) {
        var ct = att.getContentType();
        var name = att.getName() || '';
        if (ct !== 'application/pdf' && !name.toLowerCase().endsWith('.pdf')) return;
        if (!/P(?:OG|OR)\d+/i.test(name)) return;
        try {
          var items = parsePOEmailOnly(att.copyBlob(), name, processedThisRun);
          items.forEach(function(item) { found.push(item); });
          threadMatched = true;
        } catch(err) { Logger.log('scanPO error: ' + err); }
      });
    });
    if (threadMatched) threadIds.push(thread.getId());
  });
  try {
    var pyResult = scanPalYamPOEmails();
    pyResult.found.forEach(function(f){found.push(f);});
    pyResult.threadIds.forEach(function(id){threadIds.push(id);});
  } catch(epy) { Logger.log('Pal-Yam scan failed: ' + epy); }
  return { found: found, threadIds: threadIds };
}


function parsePOEmailOnly(pdfBlob, fileName, processedThisRun) {
  var items = [], text = '';
  var tempFile = Drive.Files.insert(
    { title: 'temp_po_scan_' + Date.now(), mimeType: 'application/vnd.google-apps.document' },
    pdfBlob, { convert: true }
  );
  try {
    var resp = UrlFetchApp.fetch(
      'https://docs.google.com/feeds/download/documents/export/Export?id=' + tempFile.id + '&exportFormat=txt',
      { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true }
    );
    text = resp.getContentText('UTF-8');
  } finally { DriveApp.getFileById(tempFile.id).setTrashed(true); }
  var poMatch = text.match(/P(?:OG|OR)\d+/) || text.match(/(\d+)P(?:OG|OR)/);
  var poNumber = poMatch ? poMatch[0] : null;
  if (poNumber && !poNumber.match(/^P(?:OG|OR)/)) {
    var numPart = poNumber.replace(/P(?:OG|OR)/g, '');
    poNumber = poNumber.match(/P(?:OG|OR)/)[0] + numPart;
  }
  if (!poNumber) return items;
  if (processedThisRun[poNumber]) return items;
  processedThisRun[poNumber] = true;
  var lineItems = parsePOLineItems(text);
  lineItems.forEach(function(item) {
    items.push({ poNumber: poNumber, client: poNumber.indexOf('POG') !== -1 ? 'GOLMAT' : 'ROLLMAT', desc: item.description, price: item.price });
  });
  return items;
}


function labelPOThreads(threadIds) {
  var label = GmailApp.getUserLabelByName(PO_GMAIL_LABEL) || GmailApp.createLabel(PO_GMAIL_LABEL);
  threadIds.forEach(function(id) { try { var t=GmailApp.getThreadById(id); if(t) t.addLabel(label); } catch(e){} });
}


function runPOImportAndReturn() {
  var results = [], processedThisRun = {};
  var label = GmailApp.getUserLabelByName(PO_GMAIL_LABEL) || GmailApp.createLabel(PO_GMAIL_LABEL);
  var threads = GmailApp.search('has:attachment -label:' + PO_GMAIL_LABEL, 0, 30);
  threads.forEach(function(thread) {
    var threadMatched = false;
    thread.getMessages().forEach(function(msg) {
      msg.getAttachments().forEach(function(att) {
        var ct = att.getContentType();
        var name = att.getName() || '';
        if (ct !== 'application/pdf' && !name.toLowerCase().endsWith('.pdf')) return;
        if (!/P(?:OG|OR)\d+/i.test(name)) return;
        try {
          var rows = processPOPdfAndReturn(att.copyBlob(), name, processedThisRun);
          rows.forEach(function(r) { results.push(r); });
          threadMatched = true;
        } catch(err) { Logger.log('runPOImport error: ' + err); }
      });
    });
    if (threadMatched) thread.addLabel(label);
  });
  try {
    var palYamRows = importPalYamPOsAndReturn();
    palYamRows.forEach(function(r){ results.push(r); });
  } catch(epy2) { Logger.log('Pal-Yam import failed: ' + epy2); }
  return results;
}


function processPOPdfAndReturn(pdfBlob, fileName, processedThisRun) {
  var rows = [], text = '';
  var tempFile = Drive.Files.insert(
    { title: 'temp_po_' + Date.now(), mimeType: 'application/vnd.google-apps.document' },
    pdfBlob, { convert: true }
  );
  try {
    var resp = UrlFetchApp.fetch(
      'https://docs.google.com/feeds/download/documents/export/Export?id=' + tempFile.id + '&exportFormat=txt',
      { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true }
    );
    text = resp.getContentText('UTF-8');
  } finally { DriveApp.getFileById(tempFile.id).setTrashed(true); }
  var poMatch = text.match(/P(?:OG|OR)\d+/) || text.match(/(\d+)P(?:OG|OR)/);
  var poNumber = poMatch ? poMatch[0] : null;
  if (poNumber && !poNumber.match(/^P(?:OG|OR)/)) {
    poNumber = poNumber.match(/P(?:OG|OR)/)[0] + poNumber.replace(/P(?:OG|OR)/g,'');
  }
  if (!poNumber) { Logger.log('No PO: ' + fileName); return rows; }
  var isGolmat = poNumber.indexOf('POG') !== -1;
  var sheetName = isGolmat ? 'GOLMAT' : 'ROLLMAT';
  if (processedThisRun[poNumber]) return rows;
  processedThisRun[poNumber] = true;
  var items = parsePOLineItems(text);
  if (!items.length) { Logger.log('No items: ' + fileName); return rows; }
  var ss2 = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss2.getSheetByName(sheetName);
  if (!sheet) { Logger.log('No sheet: ' + sheetName); return rows; }
  items.forEach(function(item) {
    var jobId = addPORowAndReturn(sheet, sheetName, item.description, item.price, poNumber);
    if (jobId) rows.push({ jobId: jobId, client: sheetName, desc: item.description, price: item.price, poNumber: poNumber });
  });
  return rows;
}


function parsePOLineItems(text) {
  var items = [], seen = {};
  function addItem(desc, price) {
    desc = desc.replace(/\s{2,}/g, ' ').trim();
    var key = desc.toLowerCase() + '|' + price;
    if (seen[key] || desc.length < 2 || price <= 0) return;
    seen[key] = true;
    items.push({ description: desc, price: price });
  }
  var m;
  var re1 = /(\d+)\s+([A-Z0-9]+EX|[A-Z0-9]{4,})\s+([^0-9]+?)\s+\d{2}\/\d{2}\/\d{2}\s+[\d.]+\s+יח'\s+([\d,]+\.\d+)\s+ILS/g;
  while ((m = re1.exec(text)) !== null) { addItem(m[3], parseFloat(m[4].replace(/,/g,''))); }
  var re3 = /(\d+)\s+([A-Z0-9]{4,})\s+(.+?)\s+([\d,.]+)\s+יח'\s+([\d,]+\.\d{3})\s+ILS\s+([\d,]+\.\d{2})(?:\s|$)/g;
  while ((m = re3.exec(text)) !== null) {
    var desc = m[3].trim().replace(/\s+\d{2}\/\d{2}\/\d{2}$/,'').trim();
    if (/מחיר כולל|מע"מ|סה"כ|תנאי תשלום/.test(desc)) continue;
    addItem(desc, parseFloat(m[6].replace(/,/g,'')));
  }
  if (items.length === 0) {
    text.split(/\s+(?=\d+\s+[A-Z0-9]{3,})/).forEach(function(seg) {
      seg = seg.trim();
      if (!seg || !/ILS/.test(seg) || /מחיר כולל|מע"מ|סה"כ|תנאי תשלום/.test(seg)) return;
      var pm = seg.match(/([\d,]+\.\d+)\s+ILS/); if (!pm) return;
      var price = parseFloat(pm[1].replace(/,/g,'')); if (!price) return;
      var d = seg.replace(/^\d+\s+/,'').replace(/[A-Z0-9]{4,}EX\s+/g,'').replace(/[A-Z0-9]{4,}\s+/g,'')
               .replace(/\d{2}\/\d{2}\/\d{2}\s+/,'').replace(/[\d.]+\s+יח'\s+/,'')
               .replace(/[\d,]+\.\d+\s+ILS.*$/g,'').replace(/\s{2,}/g,' ').trim();
      if (d.length >= 3) addItem(d, price);
    });
  }
  return items;
}


// ── Pal-Yam PO import ────────────────────────────────────────────────────────
var PAL_YAM_SENDER  = 'shira@t-p-y.co.il';
var PAL_YAM_SHEET   = 'PAL-YAM';
var PAL_YAM_LABEL   = 'PO_PalYam_Processed';


function scanPalYamPOEmails() {
  var found = [], threadIds = [];
  var threads = GmailApp.search('from:' + PAL_YAM_SENDER + ' has:attachment -label:' + PAL_YAM_LABEL, 0, 20);
  if (!threads.length) return { found: found, threadIds: threadIds };
  threads.forEach(function(thread) {
    threadIds.push(thread.getId());
    thread.getMessages().forEach(function(msg) {
      var subj = msg.getSubject() || '';
      var poMatch = subj.match(/(\d{8,12})/);
      var poNumber = poMatch ? 'PAY-' + poMatch[1] : 'PAY-' + thread.getId().slice(0,8);
      msg.getAttachments().forEach(function(att) {
        var ct = att.getContentType();
        if (ct === 'application/pdf' || att.getName().toLowerCase().endsWith('.pdf')) {
          // Lightweight scan: don't parse PDF — just register the email exists
          found.push({ poNumber: poNumber, client: PAL_YAM_SHEET, desc: 'הזמנת רכש פל ים — ' + att.getName().replace(/\.pdf$/i,''), price: 0, isPalYam: true });
        }
      });
    });
  });
  return { found: found, threadIds: threadIds };
}


function parsePalYamPDF(pdfBlob, processedThisRun) {
  var text = '';
  var tempFile = Drive.Files.insert(
    { title: 'temp_palyam_' + Date.now(), mimeType: 'application/vnd.google-apps.document' },
    pdfBlob, { convert: true }
  );
  try {
    var resp = UrlFetchApp.fetch(
      'https://docs.google.com/feeds/download/documents/export/Export?id=' + tempFile.id + '&exportFormat=txt',
      { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true }
    );
    text = resp.getContentText('UTF-8');
  } finally { DriveApp.getFileById(tempFile.id).setTrashed(true); }


  // Extract PO number: "הזמנת רכש מספר 2601002670"
  var poMatch = text.match(/הזמנת רכש מספר\s+(\d+)/);
  var poNumber = poMatch ? 'PAY-' + poMatch[1] : 'PAY-' + Date.now();
  if (processedThisRun && processedThisRun[poNumber]) return { poNumber: poNumber, items: [] };
  if (processedThisRun) processedThisRun[poNumber] = true;


  // Parse line items: "1 10zzz תיאור העבודה 1.00 יח' 1,500.0000 ש"ח 1,500.00"
  var items = [], seen = {};
  var re = /\d+\s+\S+\s+(.+?)\s+[\d.]+\s+יח['׳]\s+([\d,]+\.\d+)\s+ש["״]ח/g;
  var m;
  while ((m = re.exec(text)) !== null) {
    var desc = m[1].trim();
    var price = parseFloat(m[2].replace(/,/g, ''));
    if (!desc || desc.length < 2 || !price) continue;
    if (/מחיר כולל|מע"מ|סה"כ|תנאי/.test(desc)) continue;
    var key = desc.toLowerCase() + '|' + price;
    if (seen[key]) continue;
    seen[key] = true;
    items.push({ description: desc, price: price });
  }
  // Fallback: simpler pattern
  if (!items.length) {
    var re2 = /([\d,]+\.00)\s*ש["״]ח/g, m2;
    var descRe = /\d+\s+\S+\s+(.{5,60}?)\s+\d+\.\d+\s+יח/g, dm;
    var prices = [], descs = [];
    while ((m2 = re2.exec(text)) !== null) prices.push(parseFloat(m2[1].replace(/,/g,'')));
    while ((dm = descRe.exec(text)) !== null) descs.push(dm[1].trim());
    for (var pi = 0; pi < Math.min(prices.length, descs.length); pi++) {
      if (prices[pi] && descs[pi] && descs[pi].length > 3) items.push({ description: descs[pi], price: prices[pi] });
    }
  }
  return { poNumber: poNumber, items: items };
}


function labelPalYamThreads(threadIds) {
  var label = GmailApp.getUserLabelByName(PAL_YAM_LABEL) || GmailApp.createLabel(PAL_YAM_LABEL);
  threadIds.forEach(function(id) { try { var t=GmailApp.getThreadById(id); if(t) t.addLabel(label); } catch(e){} });
}


function importPalYamPOsAndReturn() {
  var results = [], processedThisRun = {};
  var label = GmailApp.getUserLabelByName(PAL_YAM_LABEL) || GmailApp.createLabel(PAL_YAM_LABEL);
  var threads = GmailApp.search('from:' + PAL_YAM_SENDER + ' has:attachment -label:' + PAL_YAM_LABEL, 0, 20);
  if (!threads.length) return results;
  var ss2 = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss2.getSheetByName(PAL_YAM_SHEET);
  if (!sheet) { Logger.log('PAL-YAM sheet not found'); return results; }
  threads.forEach(function(thread) {
    thread.getMessages().forEach(function(msg) {
      msg.getAttachments().forEach(function(att) {
        var ct = att.getContentType();
        if (ct === 'application/pdf' || att.getName().toLowerCase().endsWith('.pdf')) {
          try {
            var parsed = parsePalYamPDF(att.copyBlob(), processedThisRun);
            parsed.items.forEach(function(item) {
              var jobId = addPORowAndReturn(sheet, PAL_YAM_SHEET, item.description, item.price, parsed.poNumber);
              if (jobId) results.push({ jobId: jobId, client: PAL_YAM_SHEET, desc: item.description, price: item.price, poNumber: parsed.poNumber });
            });
          } catch(err) { Logger.log('Pal-Yam import error: ' + err); }
        }
      });
    });
    thread.addLabel(label);
  });
  return results;
}
// ── End Pal-Yam PO import ──────────────────────────────────────────────────


function addPORowAndReturn(sheet, clientName, description, price, poNumber, qty) {
  qty = (qty && qty > 0) ? qty : 1;
  var data = sheet.getDataRange().getValues();
  var cols = findColumns(data);
  if (cols.headerRow === -1) return null;
  var targetRow = -1;
  for (var r = cols.headerRow + 1; r < data.length; r++) {
    var ri = String(data[r][cols.jobId]||'').trim();
    var rd = cols.desc !== -1 ? String(data[r][cols.desc]||'').trim() : 'x';
    var rp = cols.po   !== -1 ? String(data[r][cols.po]||'').trim()   : '';
    if (ri && !rd && !rp) { targetRow = r; break; }
  }
  var newId;
  if (targetRow !== -1) {
    newId = String(data[targetRow][cols.jobId]).trim();
    var wRow = targetRow + 1;
    if (cols.desc   !== -1) sheet.getRange(wRow, cols.desc+1).setValue(description);
    if (cols.price  !== -1) sheet.getRange(wRow, cols.price+1).setValue(price);
    if (cols.qty    !== -1) sheet.getRange(wRow, cols.qty+1).setValue(qty);
    if (cols.status !== -1) sheet.getRange(wRow, cols.status+1).setValue('ממתין להצעה');
    if (cols.po     !== -1) sheet.getRange(wRow, cols.po+1).setValue(poNumber);
  } else {
    var pfx = clientName === 'GOLMAT' ? 'GO' : 'RO';
    for (var r=cols.headerRow+1;r<data.length;r++){var e=String(data[r][cols.jobId]||'').trim();if(e){pfx=e.replace(/[0-9]/g,'');break;}}
    var maxN = 0;
    for (var r=cols.headerRow+1;r<data.length;r++){var mx=String(data[r][cols.jobId]||'').match(/\d+/);if(mx)maxN=Math.max(maxN,parseInt(mx[0]));}
    newId = pfx + String(maxN + 1).padStart(4, '0');
    var lastR = cols.headerRow;
    for (var r=cols.headerRow+1;r<data.length;r++) if(String(data[r][cols.jobId]||'').trim()) lastR=r;
    var newR = lastR + 2;
    if (lastR > cols.headerRow)
      sheet.getRange(lastR+1,1,1,sheet.getLastColumn()).copyTo(sheet.getRange(newR,1,1,sheet.getLastColumn()),SpreadsheetApp.CopyPasteType.PASTE_FORMAT,false);
    var maxC = 0;
    [cols.jobId,cols.desc,cols.price,cols.qty,cols.status,cols.po].forEach(function(c){if(c!==-1&&c>maxC)maxC=c;});
    var row = []; for(var i=0;i<=maxC;i++) row.push('');
    row[cols.jobId]=newId;
    if(cols.desc!==-1)row[cols.desc]=description;
    if(cols.price!==-1)row[cols.price]=price;
    if(cols.qty!==-1)row[cols.qty]=qty;
    if(cols.status!==-1)row[cols.status]='ממתין להצעה';
    if(cols.po!==-1)row[cols.po]=poNumber;
    sheet.getRange(newR,1,1,row.length).setValues([row]);
  }
  return newId;
}
