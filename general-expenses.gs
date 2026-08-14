/* ═══════════════════════════════════════════════════════════════════════════
   general-expenses.gs — YB Tracker · general business expenses (overhead)
   Stage 1 · 12/08/2026 · spec: SPEC-general-expenses.md

   ISOLATION CONTRACT — read before editing:
   1. This file owns TWO sheets and touches nothing else:
        'General Expenses'  ·  'General Expense Categories'
      It never opens a client sheet, never calls createExpenseRow,
      _syncExpenseRollup, copyProfitFormulasDown, addJob, or any billing code.
   2. Expense rows are APPEND-ONLY. No setValue on an existing expense row,
      no deleteRow, ever. "Delete" flips a status cell to 'deleted'.
      => this file contains no code path that can destroy financial data.
   3. Expense rows carry an immutable categoryId. Renaming a category is a
      display-level change only; history is never rewritten.
   4. Code.gs calls GEROUTE(e) as its FIRST statement in doGet/doPost.
      GEROUTE returns null for any action it does not own, so the existing
      dispatch runs unchanged. DELETE THIS FILE and the app reverts exactly
      to its previous behaviour — no edit of Code.gs required.
   ═══════════════════════════════════════════════════════════════════════════ */

var GE_SHEET      = 'General Expenses';
var GE_CAT_SHEET  = 'General Expense Categories';
var GE_VAT_DEFAULT = 18;

/* Expense row layout — index = column - 1 */
var GE_COL = { id:0, date:1, categoryId:2, categoryName:3, desc:4,
               amountExVat:5, vat:6, total:7, vatRate:8, link:9,
               createdAt:10, status:11 };
var GE_HEADERS = ['id','date','categoryId','categoryName','desc',
                  'amountExVat','vat','total','vatRate','link',
                  'createdAt','status'];

var GE_CAT_COL = { id:0, name:1, active:2, sort:3, createdAt:4 };
var GE_CAT_HEADERS = ['id','name','active','sort','createdAt'];

var GE_SEED_CATEGORIES = [
  'רכב — דלק, תחזוקת רכב, ביטוח רכב, כביש',
  'כלים וציוד — כלי עבודה, ציוד, בגדי עבודה',
  'משרד וניהול — טלפון, רואה חשבון, ביטוחים, אגרות',
  'פיתוח עסקי',
  'שונות — פרסום, כיבוד, נסיעות'
];

/* ── plumbing ─────────────────────────────────────────────────────────────── */

function _geJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function _geSS() { return SpreadsheetApp.openById(SPREADSHEET_ID); }

function _geId(prefix) {
  return prefix + Date.now() + Math.floor(Math.random() * 1000);
}

function _geNum(v) {
  var n = parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function _geRound(n) { return Math.round((_geNum(n) + Number.EPSILON) * 100) / 100; }

function _geSheet() {
  var ss = _geSS();
  var sh = ss.getSheetByName(GE_SHEET);
  if (!sh) {
    sh = ss.insertSheet(GE_SHEET);
    sh.appendRow(GE_HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function _geCatSheet() {
  var ss = _geSS();
  var sh = ss.getSheetByName(GE_CAT_SHEET);
  if (!sh) {
    sh = ss.insertSheet(GE_CAT_SHEET);
    sh.appendRow(GE_CAT_HEADERS);
    sh.setFrozenRows(1);
    var now = new Date();
    for (var i = 0; i < GE_SEED_CATEGORIES.length; i++) {
      sh.appendRow([_geId('GC') + '-' + i, GE_SEED_CATEGORIES[i], true, (i + 1) * 10, now]);
    }
  }
  return sh;
}

function _geFmtDate(d) {
  if (!d) return '';
  if (Object.prototype.toString.call(d) === '[object Date]') {
    return Utilities.formatDate(d, 'Asia/Jerusalem', 'yyyy-MM-dd');
  }
  var s = String(d).trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    var y = m[3].length === 2 ? '20' + m[3] : m[3];
    return y + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  return s;
}

/* Period window. Week starts SUNDAY — same rule as getGrossProfitSummary (v206). */
function _geWindow(period) {
  var now = new Date();
  var end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  var start;
  switch (String(period || 'all')) {
    case 'day':   start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
    case 'week':  start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); break;
    case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
    default:      return null;   /* 'all' */
  }
  return { start: _geFmtDate(start), end: _geFmtDate(end) };
}


/* ── categories ───────────────────────────────────────────────────────────── */

function _geReadCategories() {
  var sh = _geCatSheet();
  var vals = sh.getDataRange().getValues();
  var out = [];
  for (var r = 1; r < vals.length; r++) {
    var row = vals[r];
    if (!String(row[GE_CAT_COL.id] || '').trim()) continue;
    out.push({
      id:     String(row[GE_CAT_COL.id]).trim(),
      name:   String(row[GE_CAT_COL.name] || '').trim(),
      active: String(row[GE_CAT_COL.active]).toUpperCase() !== 'FALSE',
      sort:   _geNum(row[GE_CAT_COL.sort]),
      row:    r + 1
    });
  }
  out.sort(function (a, b) { return a.sort - b.sort; });
  return out;
}

function geGetCategories() {
  return { status: 'OK', ok: true, categories: _geReadCategories() };
}

/* Writes name/active/sort ONLY. id is never reassigned, so history never breaks. */
function geSaveCategory(p) {
  var sh   = _geCatSheet();
  var id   = String(p.id   || '').trim();
  var name = String(p.name || '').trim();

  if (!id) {
    if (!name) return { status: 'ERROR', ok: false, error: 'name required' };
    var cats = _geReadCategories();
    var maxSort = 0;
    for (var i = 0; i < cats.length; i++) if (cats[i].sort > maxSort) maxSort = cats[i].sort;
    var newId = _geId('GC');
    sh.appendRow([newId, name, true, maxSort + 10, new Date()]);
    return { status: 'OK', ok: true, id: newId, created: true };
  }

  var list = _geReadCategories(), target = null;
  for (var j = 0; j < list.length; j++) if (list[j].id === id) { target = list[j]; break; }
  if (!target) return { status: 'ERROR', ok: false, error: 'category not found: ' + id };

  if (name) sh.getRange(target.row, GE_CAT_COL.name + 1).setValue(name);
  if (p.active !== undefined && p.active !== '') {
    sh.getRange(target.row, GE_CAT_COL.active + 1)
      .setValue(!(p.active === false || String(p.active).toLowerCase() === 'false'));
  }
  if (p.sort !== undefined && p.sort !== '') {
    sh.getRange(target.row, GE_CAT_COL.sort + 1).setValue(_geNum(p.sort));
  }
  return { status: 'OK', ok: true, id: id, updated: true };
}

/* ── expenses ─────────────────────────────────────────────────────────────── */

function geAdd(p) {
  var total = _geNum(p.total);
  if (!(total > 0)) return { status: 'ERROR', ok: false, error: 'total must be > 0' };

  var rate = (p.vatRate === undefined || p.vatRate === '') ? GE_VAT_DEFAULT : _geNum(p.vatRate);
  if (rate < 0 || rate > 100) return { status: 'ERROR', ok: false, error: 'bad vatRate' };

  var catId = String(p.categoryId || '').trim();
  if (!catId) return { status: 'ERROR', ok: false, error: 'categoryId required' };
  var cats = _geReadCategories(), cat = null;
  for (var i = 0; i < cats.length; i++) if (cats[i].id === catId) { cat = cats[i]; break; }
  if (!cat) return { status: 'ERROR', ok: false, error: 'unknown categoryId: ' + catId };

  var exVat = _geRound(total / (1 + rate / 100));
  var vat   = _geRound(total - exVat);          /* derived so the three always reconcile */

  var id  = _geId('GE');
  var row = [];
  row[GE_COL.id]           = id;
  row[GE_COL.date]         = p.date ? _geFmtDate(p.date) : _geFmtDate(new Date());
  row[GE_COL.categoryId]   = cat.id;
  row[GE_COL.categoryName] = cat.name;          /* snapshot — readability only */
  row[GE_COL.desc]         = String(p.desc || '').trim();
  row[GE_COL.amountExVat]  = exVat;
  row[GE_COL.vat]          = vat;
  row[GE_COL.total]        = _geRound(total);
  row[GE_COL.vatRate]      = rate;
  row[GE_COL.link]         = String(p.link || '').trim();
  row[GE_COL.createdAt]    = new Date();
  row[GE_COL.status]       = 'active';
  for (var c = 0; c < GE_HEADERS.length; c++) if (row[c] === undefined) row[c] = '';

  _geSheet().appendRow(row);
  return { status: 'OK', ok: true, id: id, amountExVat: exVat, vat: vat, total: _geRound(total) };
}

/* catsIn lets the caller pass categories it has already read. Without it this
   function re-reads the categories sheet on every call, and geGet used to call it
   twice — six sheet reads to open one panel, which is what made it slow. */
function _geReadRows(period, from, to, catsIn) {
  var sh = _geSheet();
  var vals = sh.getDataRange().getValues();
  var win = (from || to) ? { start: _geFmtDate(from), end: _geFmtDate(to) } : _geWindow(period);
  var cats = catsIn || _geReadCategories(), nameById = {};
  for (var c = 0; c < cats.length; c++) nameById[cats[c].id] = cats[c].name;

  var rows = [];
  for (var r = 1; r < vals.length; r++) {
    var v = vals[r];
    if (!String(v[GE_COL.id] || '').trim()) continue;
    if (String(v[GE_COL.status] || '').toLowerCase() === 'deleted') continue;

    var d = _geFmtDate(v[GE_COL.date]);
    if (win) {
      if (!d) continue;                                  /* undated: surfaced separately below */
      if (win.start && d < win.start) continue;
      if (win.end   && d > win.end)   continue;
    }
    var cid = String(v[GE_COL.categoryId] || '').trim();
    rows.push({
      id: String(v[GE_COL.id]),
      date: d,
      categoryId: cid,
      /* CURRENT name wins; snapshot is the fallback if the category row vanished */
      category: nameById[cid] || String(v[GE_COL.categoryName] || '') || '—',
      desc: String(v[GE_COL.desc] || ''),
      amountExVat: _geNum(v[GE_COL.amountExVat]),
      vat: _geNum(v[GE_COL.vat]),
      total: _geNum(v[GE_COL.total]),
      vatRate: _geNum(v[GE_COL.vatRate]),
      link: String(v[GE_COL.link] || '')
    });
  }
  return rows;
}
function _geTotals(rows) {
  var t = { count: rows.length, amountExVat: 0, vat: 0, total: 0 };
  for (var i = 0; i < rows.length; i++) {
    t.amountExVat += rows[i].amountExVat;
    t.vat         += rows[i].vat;
    t.total       += rows[i].total;
  }
  t.amountExVat = _geRound(t.amountExVat);
  t.vat         = _geRound(t.vat);
  t.total       = _geRound(t.total);
  return t;
}

function geGet(p) {
  var _cats = _geReadCategories();
  var rows = _geReadRows(p.period, p.from, p.to, _cats);
  var byCat = {}, order = [];
  for (var i = 0; i < rows.length; i++) {
    var k = rows[i].category;
    if (!byCat[k]) { byCat[k] = { category: k, count: 0, amountExVat: 0, vat: 0, total: 0, rows: [] }; order.push(k); }
    var g = byCat[k];
    g.count++;
    g.amountExVat = _geRound(g.amountExVat + rows[i].amountExVat);
    g.vat         = _geRound(g.vat         + rows[i].vat);
    g.total       = _geRound(g.total       + rows[i].total);
    g.rows.push(rows[i]);
  }
  var groups = [];
  for (var j = 0; j < order.length; j++) groups.push(byCat[order[j]]);
  groups.sort(function (a, b) { return b.amountExVat - a.amountExVat; });

  /* v2: categories and today's totals ride along in THIS response. The UI used to
     fire three parallel requests; Apps Script throttles concurrent calls from the
     same user and answers one of them with an HTML error page ("Unexpected token
     '<'"). One request also makes the panel roughly three times faster to open. */
  /* The panel opens on 'day', so in the common case today's totals ARE the rows we
     already have — no second pass over the sheet. */
  var _today = (String(p.period || '') === 'day' && !p.from && !p.to)
    ? _geTotals(rows)
    : _geTotals(_geReadRows('day', null, null, _cats));
  return { status: 'OK', ok: true, period: p.period || 'all',
           totals: _geTotals(rows), groups: groups, rows: rows,
           categories: _cats, today: _today };
}

function geSummary(p) {
  return { status: 'OK', ok: true, period: p.period || 'all',
           totals: _geTotals(_geReadRows(p.period, p.from, p.to)) };
}

/* SOFT delete — the row is never removed, only flagged. */
function geDelete(p) {
  var id = String(p.id || '').trim();
  if (!id) return { status: 'ERROR', ok: false, error: 'id required' };
  var sh = _geSheet();
  var vals = sh.getDataRange().getValues();
  for (var r = 1; r < vals.length; r++) {
    if (String(vals[r][GE_COL.id]).trim() === id) {
      sh.getRange(r + 1, GE_COL.status + 1).setValue('deleted');
      return { status: 'OK', ok: true, id: id, deleted: true };
    }
  }
  return { status: 'ERROR', ok: false, error: 'not found: ' + id };
}

/* ── router ───────────────────────────────────────────────────────────────── */

var GE_ACTIONS = {
  addGeneralExpense:        geAdd,
  getGeneralExpenses:       geGet,
  getGeneralExpensesSummary: geSummary,
  deleteGeneralExpense:     geDelete,
  getGECategories:          geGetCategories,
  saveGECategory:           geSaveCategory
};

/**
 * Called as the FIRST statement of doGet/doPost in Code.gs.
 * Returns a ContentService response for actions this file owns, else null
 * so the existing dispatch continues untouched.
 */
function GEROUTE(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    if (e && e.postData && e.postData.contents) {
      try {
        var body = JSON.parse(e.postData.contents);
        for (var k in body) if (p[k] === undefined) p[k] = body[k];
      } catch (ignore) {}
    }
    var action = String(p.action || '');
    if (!action || !GE_ACTIONS[action]) return null;      /* not ours — fall through */
    return _geJson(GE_ACTIONS[action](p));
  } catch (err) {
    /* Never let this feature break an unrelated action. */
    try {
      var a = String(((e && e.parameter) || {}).action || '');
      if (a && GE_ACTIONS[a]) return _geJson({ status: 'ERROR', ok: false, error: String(err) });
    } catch (ignore2) {}
    return null;
  }
}

/* ── self-test (READ-ONLY — writes nothing) ───────────────────────────────── */

function GESELFTEST() {
  var out = [];
  function ok(c, m) { out.push((c ? 'PASS  ' : 'FAIL  ') + m); return c; }
  try {
    var ss = _geSS();
    var sh = ss.getSheetByName(GE_SHEET), cs = ss.getSheetByName(GE_CAT_SHEET);
    ok(!!cs, 'categories sheet exists');
    /* NOT a pass/fail: the expenses sheet is created lazily on the first geAdd,
       so its absence before any expense is logged is the correct state. */
    out.push((sh ? 'PASS  ' : 'INFO  ') + 'expenses sheet ' +
             (sh ? 'exists' : 'not created yet — normal until the first expense'));

    var cats = cs ? _geReadCategories() : [];
    ok(cats.length > 0, 'categories present: ' + cats.length);

    var seen = {}, dupes = 0;
    for (var i = 0; i < cats.length; i++) { if (seen[cats[i].id]) dupes++; seen[cats[i].id] = 1; }
    ok(dupes === 0, 'no duplicate category ids (' + dupes + ' dupes)');

    if (sh) {
      var hdr = sh.getRange(1, 1, 1, GE_HEADERS.length).getValues()[0];
      var hdrOk = true;
      for (var h = 0; h < GE_HEADERS.length; h++) if (String(hdr[h]) !== GE_HEADERS[h]) hdrOk = false;
      ok(hdrOk, 'expense headers match spec');

      var vals = sh.getDataRange().getValues();
      var bad = 0, orphans = 0, live = 0;
      for (var r = 1; r < vals.length; r++) {
        var v = vals[r];
        if (!String(v[GE_COL.id] || '').trim()) continue;
        if (String(v[GE_COL.status] || '').toLowerCase() === 'deleted') continue;
        live++;
        var ex = _geNum(v[GE_COL.amountExVat]), va = _geNum(v[GE_COL.vat]), to = _geNum(v[GE_COL.total]);
        if (Math.abs((ex + va) - to) > 0.011) bad++;                    /* one agorah tolerance */
        if (!seen[String(v[GE_COL.categoryId] || '').trim()]) orphans++;
      }
      ok(bad === 0, 'every row: amountExVat + vat = total (' + bad + ' bad of ' + live + ')');
      ok(orphans === 0, 'every categoryId resolves (' + orphans + ' orphans)');
      ok(GE_HEADERS.indexOf('client') === -1 && GE_HEADERS.indexOf('jobId') === -1,
         'no client/jobId column exists — cannot be billed');
    }
  } catch (err) {
    out.push('FAIL  threw: ' + err);
  }
  var msg = out.join('\n');
  Logger.log(msg);
  return msg;
}
