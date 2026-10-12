// Account wallets live in Supabase. Guest coins stay separate on this device.
(() => {
  'use strict';
  const GUEST_KEY='wtwGuestCoinsV1', PENDING_KEY='wtwPendingRerollV1';
  let balance=10, ready=false, userId=null, generation=0, spending=false;
  let currentRefresh=null;
  const user=()=>window.WTWAccounts?.getUser() || null;
  function getStored(key,fallback) { try{return JSON.parse(localStorage.getItem(key)) ?? fallback;}catch{return fallback;} }
  function putStored(key,value) { try{localStorage.setItem(key,JSON.stringify(value));}catch{} }
  function guestBalance() { const n=getStored(GUEST_KEY,10);return Number.isSafeInteger(n)&&n>=0&&n<=1000000?n:10; }
  function pendingAction(id) {const p=getStored(PENDING_KEY,{});return p&&typeof p[id]==='string'&&/^[0-9a-f-]{36}$/i.test(p[id])?p[id]:null;}
  const notice=document.createElement('p');
  notice.id='wtwWalletNotice'; notice.hidden=true;
  notice.setAttribute('role','status'); notice.setAttribute('aria-live','polite');
  notice.style.cssText='margin:0 0 12px;padding:9px 12px;border:1px solid var(--line);border-radius:10px;color:var(--muted);font-size:12px;line-height:1.5';
  document.querySelector('.wtw-account').after(notice);
  function say(text='') {notice.textContent=text;notice.hidden=!text;if(text)notice.appendChild(retry);}
  function emit() {
    window.dispatchEvent(new CustomEvent('wtw:coins-change',{detail:{balance:ready?balance:null,ready,userId}}));
  }
  function hint() {
    const h=document.getElementById('wtwAccountHint');
    if(h)h.textContent=userId?'Your coins are saved to your account.':'Guest coins are saved on this device.';
  }
  async function refresh() {
    const nextId=user()?.id || null;
    const token=++generation;
    userId=nextId;ready=false;emit();
    if(!nextId) {balance=guestBalance();ready=true;say();hint();emit();return balance;}
    try {
      const client=await window.WTWAccounts.getClient();
      const {data,error}=await client.rpc('wtw_get_coin_balance');
      if(token!==generation || user()?.id!==nextId)return null;
      if(error)throw error;
      const n=Number(data);
      if(!Number.isSafeInteger(n)||n<0)throw new Error('Invalid balance');
      balance=n;ready=true;say();hint();emit();return balance;
    } catch(error) {
      if(token===generation) {
        say(['PGRST202','42883','42P01'].includes(error?.code)?'Coin saving needs its database setup. Your balance will load after setup.':'Couldn’t load your saved coins. Reconnect and tap Retry coins.');
        ready=false;emit();
      }
      return null;
    }
  }
  function load() {currentRefresh=refresh();return currentRefresh;}
  const retry=document.createElement('button');
  retry.type='button';retry.className='secondary';retry.textContent='Retry coins';
  retry.style.cssText='margin-left:8px;font-size:12px;';
  // Keep a retry available without replacing the account's login/logout control.
  notice.appendChild(retry);
  retry.onclick=load;
  window.WTWWallet=Object.freeze({
    isReady:()=>ready,
    canSpend:()=>ready&&(balance>0||!!pendingAction(userId)),
    isSignedIn:()=>!!user(),
    getBalance:()=>ready?balance:null,
    refresh:load,
    awardGuest(amount) {
      if(user() || !Number.isSafeInteger(amount) || amount<0)return;
      balance=guestBalance()+amount;putStored(GUEST_KEY,balance);ready=true;userId=null;emit();
    },
    async spendCoin() {
      if(spending)return false;
      spending=true;
      try {
        // Initial-session restoration must finish before deciding which wallet to use.
        let client;
        try {
          client=await window.WTWAccounts.getClient();
          await client.auth.getSession();
        } catch(error) { if(user())throw error; }
        const active=user()?.id || null;
        if(userId!==active || !ready)await load();
        if(!ready) {say('Your saved coins haven’t loaded. Tap Retry coins before rerolling.');return false;}
        if(!active) {
          if(guestBalance()<1){say('No coins left. Finish a season to earn more.');return false;}
          balance=guestBalance()-1;putStored(GUEST_KEY,balance);say();emit();return true;
        }
        let pending=getStored(PENDING_KEY,{});
        if(!pending || typeof pending!=='object' || Array.isArray(pending))pending={};
        let action=pending[active];
        if(typeof action!=='string' || !/^[0-9a-f-]{36}$/i.test(action)) {
          if(balance<1){say('No coins left. Finish a season to earn more.');return false;}
          action=crypto.randomUUID();
        }
        pending[active]=action;putStored(PENDING_KEY,pending);
        const spendToken=++generation;
        const {data,error}=await client.rpc('wtw_spend_coin',{p_action_id:action});
        if(error) {
          if(error.code==='P0001'){delete pending[active];putStored(PENDING_KEY,pending);await load();say(error.message);}
          else say('Reroll couldn’t be confirmed. Try again; a retry won’t charge twice.');
          return false;
        }
        delete pending[active];putStored(PENDING_KEY,pending);
        if(user()?.id!==active)return false;
        if(spendToken!==generation){await load();return true;}
        balance=Number(data);ready=true;say();emit();return true;
      } catch {say('Reroll needs a connection. Try again when you’re online.');return false;}
      finally {spending=false;}
    }
  });
  window.addEventListener('wtw:auth-change',()=>{
    const next=user()?.id || null;
    if(next!==userId || !ready)load();
    else {hint();emit();}
  });
  window.addEventListener('wtw:season-posted',event=>{
    if(event.detail?.userId===user()?.id)load();
  });
  window.addEventListener('online',load);
  window.addEventListener('storage',event=>{if(event.key===GUEST_KEY&&!user())load();});
  window.addEventListener('focus',()=>{if(user())load();});
  load();
})();
