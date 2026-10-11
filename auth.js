// Optional player accounts. Only the public browser key belongs in this file.
(() => {
  'use strict';
  const PROJECT_URL = 'https://fbyunqsogobillcjnwxe.supabase.co';
  const PUBLIC_KEY = 'sb_publishable_Nk2vJoJnNkUqNtWpieJGtA_aeKfFeLd';
  const RETURN_URL = 'https://jakeearls1.github.io/Wire-to-Wire/';
  const style = document.createElement('style');
  style.textContent = `
    .wtw-auth-dialog [hidden]{display:none!important}
    .wtw-account{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px;padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}
    .wtw-account-name{font-size:13px;font-weight:850;overflow-wrap:anywhere;min-width:0}.wtw-account small{display:block;font-size:11px;font-weight:400;color:var(--muted);margin-top:3px}
    .wtw-account button{flex-shrink:0}.wtw-auth-dialog{width:min(440px,calc(100% - 24px));max-height:90dvh;overflow:auto;padding:20px;border:1px solid var(--line);border-radius:20px;background:var(--panel);color:var(--text)}
    .wtw-auth-dialog::backdrop{background:#02070dcc}.wtw-auth-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.wtw-auth-head h2{margin:0;font-size:23px}.wtw-auth-dialog p{font-size:13px;line-height:1.5;color:var(--muted)}
    .wtw-auth-tabs{display:flex;gap:8px;margin:16px 0}.wtw-auth-tabs button{flex:1}.wtw-auth-tabs button[aria-pressed=true]{border-color:var(--orange);color:var(--orange)}
    .wtw-auth-dialog fieldset{padding:0;margin:0;border:0;min-width:0}.wtw-auth-dialog label{display:block;font-size:13px;font-weight:800;margin-bottom:14px}
    .wtw-auth-dialog input{display:block;width:100%;min-height:46px;margin-top:6px;padding:11px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font:inherit;font-size:16px}
    .wtw-auth-dialog button:disabled{opacity:.55;cursor:wait}.wtw-auth-message{min-height:22px;margin:12px 0;font-size:13px;line-height:1.5;overflow-wrap:anywhere}.wtw-auth-message[data-error=true]{color:light-dark(#a61919,#ff9292)}
    .wtw-auth-footer{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;margin-top:12px}.wtw-auth-footer button{font-size:12px}.wtw-auth-dialog :focus-visible{outline:2px solid var(--orange);outline-offset:3px}
  `;
  document.head.appendChild(style);
  const bar = document.createElement('div');
  bar.className = 'wtw-account';
  bar.innerHTML = '<div class="wtw-account-name"><span id="wtwAccountName">Playing as a guest</span><small id="wtwAccountHint">Create your player account whenever you’re ready.</small></div><button type="button" class="secondary" id="wtwAccountButton">Log in / Sign up</button>';
  document.querySelector('.top').after(bar);
  const dialog = document.createElement('dialog');
  dialog.className = 'wtw-auth-dialog';
  dialog.setAttribute('aria-labelledby', 'wtwAuthTitle');
  dialog.innerHTML = `
    <div class="wtw-auth-head"><h2 id="wtwAuthTitle">Player login</h2><button type="button" class="secondary" id="wtwAuthClose" aria-label="Close account form">✕</button></div>
    <p id="wtwAuthIntro">Log in to your Wire to Wire account. You can also keep playing as a guest.</p>
    <div class="wtw-auth-tabs" id="wtwAuthTabs"><button type="button" class="secondary" id="wtwLoginTab" aria-pressed="true">Log in</button><button type="button" class="secondary" id="wtwSignupTab" aria-pressed="false">Sign up</button></div>
    <form id="wtwAuthForm"><fieldset id="wtwAuthFields">
      <label id="wtwNameLabel" hidden>Player name<input id="wtwPlayerName" type="text" minlength="2" maxlength="24" autocomplete="nickname"></label>
      <label id="wtwEmailLabel">Email<input id="wtwAuthEmail" type="email" autocomplete="email" required maxlength="254"></label>
      <label id="wtwPasswordLabel">Password<input id="wtwAuthPassword" type="password" autocomplete="current-password" required maxlength="128"></label>
      <label id="wtwConfirmLabel" hidden>Confirm password<input id="wtwAuthConfirm" type="password" autocomplete="new-password" maxlength="128"></label>
      <button type="submit" class="primary" id="wtwAuthSubmit">Log in</button>
    </fieldset></form>
    <div class="wtw-auth-message" id="wtwAuthMessage" role="status" aria-live="polite"></div>
    <div class="wtw-auth-footer"><button type="button" class="secondary" id="wtwForgotPassword">Forgot password?</button><button type="button" class="secondary" id="wtwGuest">Keep playing</button></div>
  `;
  document.body.appendChild(dialog);
  const el = id => document.getElementById(id);
  let client = null, loading = null, session = null, mode = 'login', busy = false;
  let recovery = new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
  const callbackError = new URLSearchParams(location.hash.slice(1)).get('error_description') || new URLSearchParams(location.search).get('error_description');
  function message(text = '', error = false) {
    el('wtwAuthMessage').textContent = text;
    el('wtwAuthMessage').dataset.error = String(error);
  }
  function paintAccount() {
    const user = session && session.user;
    el('wtwAccountName').textContent = user ? '⚾ ' + (user.user_metadata?.player_name || 'Player') : 'Playing as a guest';
    el('wtwAccountHint').textContent = user ? 'You’re logged in. Enjoy your next draft!' : 'Create your player account whenever you’re ready.';
    el('wtwAccountButton').textContent = user ? 'Log out' : 'Log in / Sign up';
    window.dispatchEvent(new CustomEvent('wtw:auth-change', {detail:{userId:user?.id || null}}));
  }
  function setMode(next) {
    mode = next;
    message();
    const signup = mode === 'signup', reset = mode === 'reset', update = mode === 'update';
    el('wtwAuthTitle').textContent = signup ? 'Create your account' : reset ? 'Reset password' : update ? 'Choose a new password' : 'Player login';
    el('wtwAuthIntro').textContent = signup ? 'Pick a player name and create your account. Season history and leaderboards are coming next.' : reset ? 'Enter your email and we’ll send you a password-reset link.' : update ? 'Enter your new password below.' : 'Log in to your Wire to Wire account. You can also keep playing as a guest.';
    el('wtwAuthTabs').hidden = reset || update;
    el('wtwNameLabel').hidden = !signup;
    el('wtwPlayerName').required = signup;
    el('wtwPlayerName').disabled = !signup;
    el('wtwEmailLabel').hidden = update;
    el('wtwAuthEmail').required = !update;
    el('wtwAuthEmail').disabled = update;
    el('wtwPasswordLabel').hidden = reset;
    el('wtwAuthPassword').required = !reset;
    el('wtwAuthPassword').disabled = reset;
    el('wtwAuthPassword').minLength = signup || update ? 8 : 1;
    el('wtwAuthPassword').autocomplete = signup || update ? 'new-password' : 'current-password';
    el('wtwConfirmLabel').hidden = !(signup || update);
    el('wtwAuthConfirm').required = signup || update;
    el('wtwAuthConfirm').disabled = !(signup || update);
    el('wtwAuthPassword').value = '';
    el('wtwAuthConfirm').value = '';
    el('wtwAuthSubmit').textContent = signup ? 'Create account' : reset ? 'Send reset link' : update ? 'Save password' : 'Log in';
    el('wtwLoginTab').setAttribute('aria-pressed', String(!signup));
    el('wtwSignupTab').setAttribute('aria-pressed', String(signup));
    el('wtwForgotPassword').textContent = reset ? 'Back to login' : 'Forgot password?';
    el('wtwForgotPassword').hidden = update;
  }
  function open(next = recovery ? 'update' : 'login') {
    setMode(next);
    if (!dialog.open) dialog.showModal();
    (next === 'signup' ? el('wtwPlayerName') : next === 'update' ? el('wtwAuthPassword') : el('wtwAuthEmail')).focus();
  }
  function clearCallback() {
    const url = new URL(location.href);
    url.hash = '';
    for (const key of ['error', 'error_code', 'error_description']) url.searchParams.delete(key);
    history.replaceState(null, '', url);
  }
  function ensureClient() {
    if (client) return Promise.resolve(client);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      script.async = true;
      const fail = () => { script.remove(); reject(new Error('Account services couldn’t load. Check your connection and try again. Guest play is still available.')); };
      const timer = setTimeout(fail, 15000);
      script.onerror = () => { clearTimeout(timer); fail(); };
      script.onload = () => {
        clearTimeout(timer);
        try {
          client = window.supabase.createClient(PROJECT_URL, PUBLIC_KEY, {auth: {persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:'implicit'}});
          client.auth.onAuthStateChange((event, nextSession) => {
            session = nextSession;
            paintAccount();
            if (event === 'PASSWORD_RECOVERY') {
              recovery = true;
              open('update');
            }
          });
          resolve(client);
        } catch (error) { client = null; reject(error); }
      };
      document.head.appendChild(script);
    }).catch(error => { loading = null; throw error; });
    return loading;
  }
  function setBusy(value) {
    busy = value;
    el('wtwAuthFields').disabled = value;
    for (const id of ['wtwLoginTab', 'wtwSignupTab', 'wtwForgotPassword', 'wtwAuthClose', 'wtwGuest', 'wtwAccountButton']) el(id).disabled = value;
    el('wtwAuthForm').setAttribute('aria-busy', String(value));
  }
  el('wtwLoginTab').onclick = () => setMode('login');
  el('wtwSignupTab').onclick = () => setMode('signup');
  el('wtwForgotPassword').onclick = () => setMode(mode === 'reset' ? 'login' : 'reset');
  el('wtwAuthClose').onclick = el('wtwGuest').onclick = () => dialog.close();
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => {
    el('wtwAuthPassword').value = '';
    el('wtwAuthConfirm').value = '';
    el('wtwAccountButton').focus();
  });
  el('wtwAccountButton').onclick = async () => {
    if (!session) { open(); return; }
    setBusy(true);
    try {
      const authClient = await ensureClient();
      const {error} = await authClient.auth.signOut({scope:'local'});
      if (error) throw error;
      session = null; recovery = false; paintAccount();
    } catch (error) { open('login'); message(error.message || 'Couldn’t log out. Please try again.', true); }
    finally { setBusy(false); }
  };
  el('wtwAuthForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const email = el('wtwAuthEmail').value.trim();
    const password = el('wtwAuthPassword').value;
    const playerName = el('wtwPlayerName').value.trim();
    if (mode === 'signup' && playerName.length < 2) { message('Enter a player name of 2–24 characters.', true); return; }
    if ((mode === 'signup' || mode === 'update') && password !== el('wtwAuthConfirm').value) { message('Your passwords don’t match.', true); return; }
    const action = mode;
    setBusy(true); message('Connecting…');
    try {
      const authClient = await ensureClient();
      if (action === 'signup') {
        const {data, error} = await authClient.auth.signUp({email, password, options:{emailRedirectTo:RETURN_URL, data:{player_name:playerName}}});
        if (error) throw error;
        if (data.session) { session = data.session; paintAccount(); dialog.close(); }
        else { setMode('login'); message('Check your email for a confirmation link, then return here to log in. If you already have an account, use Log in or Forgot password.'); }
      } else if (action === 'reset') {
        const {error} = await authClient.auth.resetPasswordForEmail(email, {redirectTo:RETURN_URL});
        if (error) throw error;
        message('If an account exists for that email, you’ll receive a password-reset link. Check your inbox and spam folder.');
      } else if (action === 'update') {
        if (!recovery || !session) throw new Error('Open a valid password-reset link from your email first.');
        const {error} = await authClient.auth.updateUser({password});
        if (error) throw error;
        recovery = false; clearCallback(); setMode('login'); message('Password saved. You’re logged in and ready to play.');
      } else {
        const {data, error} = await authClient.auth.signInWithPassword({email, password});
        if (error) throw error;
        session = data.session; recovery = false; paintAccount(); dialog.close();
      }
    } catch (error) { message(error.message || 'Something went wrong. Please try again.', true); }
    finally { setBusy(false); }
  });
  window.WTWAccounts = Object.freeze({
    getClient: ensureClient,
    getUser: () => session?.user || null,
    openLogin: () => open('login')
  });
  setMode('login');
  if (callbackError) { recovery = false; clearCallback(); open('login'); message(callbackError, true); }
  ensureClient().then(async authClient => {
    const {data, error} = await authClient.auth.getSession();
    if (error) { recovery = false; open('reset'); message('That login link couldn’t be used. Please request a new link.', true); return; }
    session = data.session; paintAccount();
    if (recovery && session) open('update');
    else if (recovery) { recovery = false; open('reset'); message('That reset link has expired. Please request another one.', true); }
  }).catch(() => { el('wtwAccountHint').textContent = 'Accounts need a connection. Guest play is available.'; });
})();

