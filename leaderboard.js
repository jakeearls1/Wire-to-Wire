// Vintage scoreboard + optional authenticated season posting.
(() => {
  'use strict';
  const MODES = {classic:'CLASSIC', modern:'MODERN BALL', challenge:'CHALLENGE'};
  const style = document.createElement('style');
  style.textContent = `
    .wtw-board-dialog{width:min(760px,calc(100% - 16px));max-height:94dvh;overflow:auto;margin:auto;padding:0;border:2px solid #58665a;border-radius:12px;background:#0a1811;color:#eee9cd;box-shadow:0 24px 80px #000b;color-scheme:dark}
    .wtw-board-dialog::backdrop{background:#010806db}.wtw-board-dialog [hidden]{display:none!important}
    .wtw-board{position:relative;padding:22px 20px 18px;background:repeating-linear-gradient(0deg,#ffffff02 0 1px,transparent 1px 5px),radial-gradient(ellipse at top,#244532 0%,#112b1d 52%,#0b1d14 100%);border:8px solid #1b2b21;box-shadow:inset 0 0 0 1px #76857677,inset 0 0 40px #0008}
    .wtw-board:before,.wtw-board:after{content:'';position:absolute;top:8px;bottom:8px;width:6px;background:radial-gradient(circle,#c0c7a1 0 2px,#263729 2px 3px,transparent 3px) center top/6px 80px repeat-y;pointer-events:none}.wtw-board:before{left:3px}.wtw-board:after{right:3px}
    .wtw-board-topline{display:flex;align-items:center;justify-content:space-between;gap:8px;font:800 10px/1.4 ui-monospace,monospace;letter-spacing:2px;color:#adbc9c}
    .wtw-board-close{border:1px solid #83917666;border-radius:5px;background:#06120c;color:#eee9cd;font:900 22px monospace;width:44px;min-height:44px}
    .wtw-board-masthead{text-align:center;padding:4px 0 18px;border-bottom:2px solid #d5d5ae88}.wtw-board-masthead h2{margin:4px 0;color:#eee9cd;font:1000 clamp(26px,6vw,43px)/1.02 'Arial Narrow',Impact,sans-serif;letter-spacing:3px;text-shadow:2px 3px #030d08}
    .wtw-board-masthead h2 span{display:block;font:800 10px/2 ui-monospace,monospace;letter-spacing:5px;color:#a9b99b}.wtw-board-sub{font:700 10px ui-monospace,monospace;letter-spacing:3px;color:#c6ceac}
    .wtw-board-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:16px 0}.wtw-board-controls button{min-width:0;padding:9px 4px;border:1px solid #667960;border-radius:4px;background:#0a1b12;color:#b3c2a5;font:900 11px/1.25 ui-monospace,monospace;letter-spacing:.5px}
    .wtw-board-controls button[aria-pressed=true]{background:#e2d9b8;color:#13261a;box-shadow:0 2px 0 #887e5f,inset 0 1px #fff8;border-color:#eee7c9}
    .wtw-board-table{width:100%;border-collapse:separate;border-spacing:4px 7px;table-layout:fixed;margin:0 -2px}.wtw-board-table th{padding:3px 0 5px;font:900 11px ui-monospace,monospace;letter-spacing:1px;color:#cbd2ae;border-bottom:1px solid #7e917455}.wtw-board-table th:nth-child(2){text-align:left;padding-left:8px}
    .wtw-board-table td{background:#06110b;border:1px solid #42574177;padding:9px 4px;text-align:center;border-radius:3px;box-shadow:inset 0 2px 5px #0009}.wtw-board-table tr.wtw-board-me td{border-color:#e1b349;box-shadow:inset 0 2px 5px #0009,0 0 8px #ffb02c22}
    .wtw-board-number{color:#ffd068;text-shadow:0 0 5px #ffae4d66,0 1px #fff3;font:900 clamp(17px,4vw,25px)/1 ui-monospace,'Courier New',monospace;font-variant-numeric:tabular-nums;letter-spacing:.5px}
    .wtw-board-table td.wtw-board-player{text-align:left;padding-left:8px;color:#e5e6cb;font:800 13px/1.3 ui-monospace,monospace;overflow-wrap:anywhere}.wtw-board-player small{display:block;color:#ffd068;font:800 8px/1.8 ui-monospace,monospace;letter-spacing:1px}
    .wtw-board-crown{font-size:16px;color:#ffd068}.wtw-board-table tr:first-child .wtw-board-player{color:#ffd068}.wtw-board-place{color:#8ea082;font:800 13px ui-monospace,monospace}
    .wtw-board-status{padding:22px 10px;text-align:center;font:800 13px/1.6 ui-monospace,monospace;color:#bfccac}.wtw-board-personal{padding:12px;margin-top:12px;border:1px dashed #88976e;color:#d7dbbd;font:700 12px/1.65 ui-monospace,monospace;background:#06110b77}
    .wtw-board-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:14px;padding-top:13px;border-top:2px solid #d5d5ae88}.wtw-board-note{font:700 10px/1.6 ui-monospace,monospace;color:#97ac8d}.wtw-board-refresh{flex-shrink:0;min-height:44px;padding:8px 12px;border:1px solid #6c815e;background:#0a1b12;border-radius:4px;color:#e0e4c4;font:800 11px ui-monospace,monospace}.wtw-board-refresh:disabled{opacity:.55}
    .wtw-board-dialog :focus-visible{outline:2px solid #ffd068;outline-offset:3px}.wtw-board-launch{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:12px;padding:12px;border:1px solid #58704f;border-radius:10px;background:linear-gradient(#25422e,#14271b);color:#ede7c6;font-weight:900;letter-spacing:1px}
    .wtw-season-post{margin:14px 0;padding:12px;border:1px solid var(--line);border-radius:12px;text-align:left;font-size:13px;line-height:1.5}.wtw-season-post p{margin:0 0 8px;color:var(--muted)}.wtw-season-post button{width:100%}
    @media(max-width:440px){.wtw-board{padding:12px 7px 14px;border-width:6px}.wtw-board-table{border-spacing:3px 6px}.wtw-board-table td{padding:9px 2px}.wtw-board-table td.wtw-board-player{font-size:11px;padding-left:5px}.wtw-board-table th{font-size:9px;letter-spacing:0}.wtw-board-topline{font-size:8px;letter-spacing:1px}.wtw-board-controls button{font-size:9px}.wtw-board-footer{gap:6px}.wtw-board-note{font-size:9px}.wtw-board-personal{padding:9px;font-size:11px}}
  `;
  document.head.appendChild(style);
  const launch = document.createElement('button');
  launch.type = 'button'; launch.className = 'wtw-board-launch';
  launch.textContent = '🏆 THE LEADERBOARD'; launch.setAttribute('aria-haspopup','dialog');
  document.getElementById('home').appendChild(launch);
  const resultLaunch = launch.cloneNode(true);
  resultLaunch.textContent = '🏆 VIEW THE SCOREBOARD';
  document.getElementById('result').appendChild(resultLaunch);
  const post = document.createElement('div');
  post.className = 'wtw-season-post'; post.hidden = true;
  post.innerHTML = '<p id="wtwSeasonStatus" role="status" aria-live="polite"></p><button type="button" class="secondary" id="wtwPostSeason">Post this season</button>';
  document.getElementById('again').before(post);
  const dialog = document.createElement('dialog');
  dialog.className = 'wtw-board-dialog'; dialog.setAttribute('aria-labelledby','wtwBoardTitle');
  dialog.innerHTML = `
    <div class="wtw-board">
      <div class="wtw-board-topline"><span>EST. 2026 · 162 GAMES</span><button class="wtw-board-close" type="button" id="wtwBoardClose" aria-label="Close leaderboard">×</button></div>
      <div class="wtw-board-masthead"><h2 id="wtwBoardTitle"><span>WIRE TO WIRE</span>THE LEADERBOARD</h2><div class="wtw-board-sub">BEST SEASONS · ALL TIME</div></div>
      <div class="wtw-board-controls" role="group" aria-label="Leaderboard game mode">
        <button type="button" data-board-mode="classic" aria-pressed="true">CLASSIC</button><button type="button" data-board-mode="modern" aria-pressed="false">MODERN BALL</button><button type="button" data-board-mode="challenge" aria-pressed="false">CHALLENGE</button>
      </div>
      <div id="wtwBoardStatus" class="wtw-board-status" role="status" aria-live="polite">Loading the scoreboard…</div>
      <table class="wtw-board-table" id="wtwBoardTable" hidden aria-label="Top 25 player seasons">
        <colgroup><col style="width:7%"><col style="width:39%"><col style="width:13%"><col style="width:13%"><col style="width:15%"><col style="width:13%"></colgroup>
        <thead><tr><th scope="col">#</th><th scope="col">PLAYER</th><th scope="col">W</th><th scope="col">L</th><th scope="col">OVR</th><th scope="col">WTW</th></tr></thead><tbody id="wtwBoardRows"></tbody>
      </table>
      <div id="wtwBoardPersonal" class="wtw-board-personal"></div>
      <div class="wtw-board-footer"><div class="wtw-board-note">ONE BEST SEASON PER PLAYER<br>WINS → EXACT TEAM RATING → EARLIEST POST<br><span id="wtwBoardCount">TOP 25</span></div><button type="button" class="wtw-board-refresh" id="wtwBoardRefresh">↻ REFRESH</button></div>
    </div>
  `;
  document.body.appendChild(dialog);
  const el = id => document.getElementById(id);
  let boardMode = 'classic', loadToken = 0, lastTrigger = launch;
  let season = null, submitting = false;
  function account() { return window.WTWAccounts?.getUser() || null; }
  function backendMissing(error) {
    return ['PGRST202','PGRST205','42883','42P01'].includes(error?.code);
  }
  function renderRows(rows) {
    const body = el('wtwBoardRows'); body.replaceChildren();
    for (const entry of rows) {
      const tr = document.createElement('tr');
      if (entry.is_me) tr.className = 'wtw-board-me';
      const values = [entry.rank, entry.player_name || 'Player', entry.wins, entry.losses, entry.rating, entry.wire_to_wire ? '★' : '—'];
      values.forEach((value, i) => {
        const td = document.createElement('td');
        td.className = i === 1 ? 'wtw-board-player' : i === 0 ? 'wtw-board-place' : i === 5 ? 'wtw-board-crown' : 'wtw-board-number';
        td.textContent = String(value);
        if (i === 1 && entry.is_me) { const marker = document.createElement('small'); marker.textContent = 'YOUR BEST SEASON'; td.appendChild(marker); }
        if (i === 5) td.setAttribute('aria-label', entry.wire_to_wire ? 'Wire to Wire season' : 'No Wire to Wire title');
        tr.appendChild(td);
      });
      body.appendChild(tr);
    }
  }
  async function loadBoard() {
    const token = ++loadToken;
    el('wtwBoardStatus').hidden = false; el('wtwBoardTable').hidden = true;
    el('wtwBoardStatus').textContent = 'Loading the scoreboard…';
    el('wtwBoardPersonal').textContent = '';
    el('wtwBoardRefresh').disabled = true;
    el('wtwBoardCount').textContent = 'TOP 25';
    dialog.querySelectorAll('[data-board-mode]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.boardMode === boardMode)));
    try {
      if (!window.WTWAccounts) throw new Error('Account services are unavailable. Reload the game and try again.');
      const client = await window.WTWAccounts.getClient();
      const {data, error} = await client.rpc('wtw_get_leaderboard', {p_mode:boardMode});
      if (token !== loadToken) return;
      if (error) throw error;
      const rows = Array.isArray(data?.entries) ? data.entries : [];
      renderRows(rows);
      el('wtwBoardTable').hidden = !rows.length;
      el('wtwBoardStatus').hidden = !!rows.length;
      if (!rows.length) el('wtwBoardStatus').textContent = 'NO SEASONS ON THE BOARD YET.\nFinish a draft and claim the first spot.';
      el('wtwBoardCount').textContent = `${Number(data?.total_players) || 0} PLAYERS · TOP 25`;
      const personal = data?.personal;
      el('wtwBoardPersonal').textContent = personal ? `YOUR BEST ${MODES[boardMode]} SEASON · #${personal.rank} · ${personal.wins}–${personal.losses} · ${personal.rating} OVR${personal.wire_to_wire ? ' · ★ WIRE TO WIRE' : ''}` : account() ? `No ${MODES[boardMode]} season posted yet. Finish a draft to get on the board.` : 'Log in to post your seasons and see your personal rank. Guest play is always available.';
    } catch (error) {
      if (token !== loadToken) return;
      el('wtwBoardStatus').textContent = backendMissing(error) ? 'THE SCOREBOARD IS WARMING UP.\nDatabase setup is still needed. Please try again soon.' : 'Couldn’t load the scoreboard. Check your connection and tap Refresh.';
      el('wtwBoardPersonal').textContent = 'Your game is still ready to play.';
    } finally { if (token === loadToken) el('wtwBoardRefresh').disabled = false; }
  }
  function openBoard(trigger) {
    lastTrigger = trigger;
    if (season) boardMode = season.mode;
    dialog.showModal(); loadBoard();
  }
  launch.onclick = () => openBoard(launch);
  resultLaunch.onclick = () => openBoard(resultLaunch);
  el('wtwBoardClose').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { loadToken++; lastTrigger.focus(); });
  el('wtwBoardRefresh').onclick = loadBoard;
  dialog.querySelectorAll('[data-board-mode]').forEach(b => { b.onclick = () => { boardMode = b.dataset.boardMode; loadBoard(); }; });
  function paintPost() {
    post.hidden = !season;
    if (!season) return;
    const user = account(), button = el('wtwPostSeason');
    button.disabled = submitting;
    if (season.saved) { el('wtwSeasonStatus').textContent = '✓ Season posted. The scoreboard keeps your best result in each mode.'; button.hidden = true; }
    else if (submitting) { el('wtwSeasonStatus').textContent = 'Posting your season…'; button.hidden = false; button.textContent = 'POSTING…'; }
    else if (season.ownerId && user?.id !== season.ownerId) { el('wtwSeasonStatus').textContent = 'Log back into the account that finished this season to post it.'; button.hidden = false; button.textContent = 'LOG IN TO POST'; }
    else { el('wtwSeasonStatus').textContent = season.error || (user ? 'Ready to post this season to the leaderboard.' : 'Nice season! Log in to put your name on the scoreboard.'); button.hidden = false; button.textContent = user ? 'POST THIS SEASON' : 'LOG IN TO POST'; }
  }
  async function submitSeason() {
    if (!season || season.saved || submitting) return;
    const user = account();
    if (!user || (season.ownerId && season.ownerId !== user.id)) { window.WTWAccounts?.openLogin(); return; }
    const target = season;
    target.ownerId = user.id;
    submitting = true; target.error = ''; paintPost();
    try {
      const client = await window.WTWAccounts.getClient();
      if (account()?.id !== target.ownerId) throw new Error('Your account changed. Log back in and try again.');
      const {error} = await client.rpc('wtw_submit_season', {p_run_id:target.runId, p_mode:target.mode, p_wins:target.wins, p_average:target.average});
      if (error) throw error;
      target.saved = true;
      if (dialog.open) loadBoard();
    } catch (error) {
      target.error = backendMissing(error) ? 'The leaderboard database isn’t set up yet. Your result is here; tap Post this season after setup.' : error?.code === 'P0001' ? error.message : 'Couldn’t post this season. Check your connection and try again.';
    } finally { submitting = false; paintPost(); }
  }
  el('wtwPostSeason').onclick = submitSeason;
  window.addEventListener('wtw:season-start', () => { season = null; paintPost(); });
  window.addEventListener('wtw:season-finished', event => {
    const d = event.detail;
    if (!d || !MODES[d.mode] || !Number.isInteger(d.wins) || !Number.isFinite(d.average)) return;
    season = {runId:d.runId, mode:d.mode, wins:d.wins, average:Math.round(d.average*10)/10, ownerId:account()?.id || null, saved:false, error:''};
    paintPost();
    if (account()) submitSeason();
  });
  window.addEventListener('wtw:auth-change', () => {
    paintPost();
    if (dialog.open) loadBoard();
    if (season && !season.saved && account() && (!season.ownerId || account().id === season.ownerId)) submitSeason();
  });
})();
