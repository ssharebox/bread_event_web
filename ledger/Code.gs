/**
 * 브레드 이발소 The BackStage — 쿠폰 교환 대장
 *
 * 구글 스프레드시트에 붙이는 작은 서버.
 * 웹사이트가 코드를 보내면 여기서 중복을 판정하고 시트에 기록한다.
 * 시트가 없으면 만들고, 집계까지 알아서 붙인다.
 *
 * 쓰는 법은 같은 폴더의 설치안내.md 를 보세요.
 */

const SHEET  = '교환대장';
const SUMMARY = '집계';
const PIN    = '';        // 담당자 확인용. 비워 두면 확인하지 않는다
const TZ     = 'Asia/Seoul';

/* ── 웹사이트가 부르는 입구 ───────────────────────────── */
function doGet(e) {
  const p = (e && e.parameter) || {};
  const cb = String(p.callback || '');
  const action = String(p.action || 'check');
  const code   = String(p.code || '').trim().toUpperCase();

  if (!code) return json({ status: 'error', message: '코드가 없습니다' }, cb);
  if (!/^[A-Z0-9\-]{6,40}$/.test(code)) {
    return json({ status: 'error', message: '코드 형식이 아닙니다' }, cb);
  }
  if (PIN && action === 'use' && String(p.pin || '') !== PIN) {
    return json({ status: 'error', message: '담당자 번호가 다릅니다' }, cb);
  }

  // 두 부스가 같은 순간에 찍어도 한 번만 통과하도록 잠근다
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); }
  catch (err) { return json({ status: 'error', message: '잠시 뒤 다시 시도해 주세요' }, cb); }

  try {
    const sh = ledgerSheet();
    const found = findRow(sh, code);

    if (action === 'check') {
      return json(found ? { status: 'already', usedAt: found.usedAt, by: found.by }
                        : { status: 'new' });
    }
    if (action === 'use') {
      if (found) return json({ status: 'already', usedAt: found.usedAt, by: found.by }, cb);
      const now = new Date();
      sh.appendRow([code, String(p.at || ''), stamp(now), String(p.by || ''), String(p.note || '')]);
      styleLastRow(sh);
      return json({ status: 'ok', usedAt: stamp(now) }, cb);
    }
    return json({ status: 'error', message: '알 수 없는 요청' }, cb);
  } finally {
    lock.releaseLock();
  }
}

/* ── 시트 준비 ────────────────────────────────────────── */
function ledgerSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (sh) return sh;

  sh = ss.insertSheet(SHEET, 0);
  sh.appendRow(['교환 코드', '발급 시각', '교환 시각', '담당자', '비고']);
  sh.getRange('A1:E1')
    .setFontWeight('bold').setFontSize(11)
    .setBackground('#E8760F').setFontColor('#FFFFFF')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(1, 32);
  sh.setFrozenRows(1);
  [230, 150, 150, 110, 220].forEach((w, i) => sh.setColumnWidth(i + 1, w));

  // 혹시라도 같은 코드가 두 줄 들어가면 눈에 띄게
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($A2<>"",COUNTIF($A$2:$A,$A2)>1)')
    .setBackground('#F7C9CC').setFontColor('#9B1620').setBold(true)
    .setRanges([sh.getRange('A2:E1000')])
    .build();
  sh.setConditionalFormatRules([rule]);

  buildSummary(ss);
  return sh;
}

function styleLastRow(sh) {
  const r = sh.getLastRow();
  sh.getRange(r, 1, 1, 5).setFontFamily('Arial').setFontSize(10)
    .setVerticalAlignment('middle');
  sh.getRange(r, 1).setFontFamily('Courier New');
}

/* ── 집계 시트 ────────────────────────────────────────── */
function buildSummary(ss) {
  if (ss.getSheetByName(SUMMARY)) return;
  const s = ss.insertSheet(SUMMARY);

  s.getRange('A1').setValue('집계')
    .setFontSize(14).setFontWeight('bold')
    .setBackground('#3A2010').setFontColor('#FBF3E4');
  s.getRange('A1:C1').setBackground('#3A2010');
  s.setRowHeight(1, 30);

  const rows = [
    ['교환 건수',   `=COUNTA('${SHEET}'!A2:A)`],
    ['오늘 교환',   `=SUMPRODUCT(--(LEFT('${SHEET}'!C2:C,10)=TEXT(TODAY(),"yyyy.MM.dd")))`],
    ['남은 수량',   '=IF($B$8="","준비 수량을 적어 주세요",$B$8-B3)'],
  ];
  rows.forEach((r, i) => {
    s.getRange(i + 3, 1).setValue(r[0]).setFontWeight('bold');
    s.getRange(i + 3, 2).setFormula(r[1])
      .setFontSize(13).setFontWeight('bold').setHorizontalAlignment('center');
  });

  s.getRange('A8').setValue('준비 수량').setFontWeight('bold');
  s.getRange('B8').setValue(200)
    .setFontColor('#0000FF').setBackground('#FFFF00')
    .setFontSize(13).setFontWeight('bold').setHorizontalAlignment('center');
  s.getRange('C8').setValue('← 파란 숫자는 직접 적는 칸입니다')
    .setFontColor('#C8232C').setFontSize(9);

  s.getRange('A10').setValue('이 시트는 자동으로 계산됩니다. 교환 기록은 「교환대장」 시트에 쌓입니다.')
    .setFontColor('#7A6250').setFontSize(9);

  s.setColumnWidth(1, 150); s.setColumnWidth(2, 130); s.setColumnWidth(3, 260);
}

/* ── 거들기 ───────────────────────────────────────────── */
function findRow(sh, code) {
  const last = sh.getLastRow();
  if (last < 2) return null;
  const vals = sh.getRange(2, 1, last - 1, 4).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim().toUpperCase() === code) {
      return { row: i + 2, usedAt: String(vals[i][2] || ''), by: String(vals[i][3] || '') };
    }
  }
  return null;
}

function stamp(d) {
  return Utilities.formatDate(d, TZ, 'yyyy.MM.dd HH:mm:ss');
}

/* 응답을 돌려준다.
   callback 이 함께 오면 JSONP 로 감싼다.
   브라우저가 다른 도메인 응답을 막는 문제(CORS)를 아예 비켜 가는 방법이다 */
function json(obj, callback) {
  const body = JSON.stringify(obj);
  if (callback && /^[A-Za-z_$][\w$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + body + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

/* 스크립트 편집기에서 한 번 눌러 시트를 미리 만들어 둘 수 있다 */
function 시트만들기() {
  ledgerSheet();
  SpreadsheetApp.getActiveSpreadsheet().toast('교환대장과 집계 시트를 준비했습니다');
}
