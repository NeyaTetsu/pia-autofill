(() => {
  'use strict';

  // ── 全角カタカナ検証 ──
  const ZENKAKU_KANA_RE = /^[ァ-ヶー　\s]*$/;

  function isZenkakuKana(str) {
    return str === '' || ZENKAKU_KANA_RE.test(str);
  }

  // ── DOM refs ──
  const form         = document.getElementById('settings-form');
  const lastNameEl   = document.getElementById('last_name');
  const firstNameEl  = document.getElementById('first_name');
  const lastKanaEl   = document.getElementById('last_kana');
  const firstKanaEl  = document.getElementById('first_kana');
  const lastKanaErr  = document.getElementById('last_kana_err');
  const firstKanaErr = document.getElementById('first_kana_err');
  const genderEls    = document.querySelectorAll('input[name="gender"]');
  const birthYearEl  = document.getElementById('birth_year');
  const birthMonthEl = document.getElementById('birth_month');
  const birthDayEl   = document.getElementById('birth_day');
  const tel1El       = document.getElementById('tel1');
  const tel2El       = document.getElementById('tel2');
  const tel3El       = document.getElementById('tel3');
  const emailEl      = document.getElementById('email');
  const zip1El       = document.getElementById('zip1');
  const zip2El       = document.getElementById('zip2');
  const addressEl    = document.getElementById('address');
  const addrCount    = document.getElementById('address_count');
  const addressErr   = document.getElementById('address_err');
  const passwordEl   = document.getElementById('password');
  const passwordErr  = document.getElementById('password_err');
  const togglePwBtn  = document.getElementById('toggle_pw');
  const clearBtn     = document.getElementById('clear_btn');
  const saveMsg      = document.getElementById('save_msg');
  const charCounter  = document.querySelector('.char-counter');

  // ── 文字数カウンタ ──
  function updateCharCount() {
    const len = addressEl.value.length;
    addrCount.textContent = len;
    charCounter.className = 'char-counter' + (len > 26 ? ' full' : len >= 20 ? ' warn' : '');
    if (len > 26) {
      addressErr.textContent = '26文字を超えています';
      addressEl.classList.add('error');
    } else {
      addressErr.textContent = '';
      addressEl.classList.remove('error');
    }
  }
  addressEl.addEventListener('input', updateCharCount);

  // ── フリガナ検証 ──
  function validateKana(inputEl, errEl) {
    if (!isZenkakuKana(inputEl.value)) {
      errEl.textContent = '全角のカタカナで入力してください';
      inputEl.classList.add('error');
      return false;
    }
    errEl.textContent = '';
    inputEl.classList.remove('error');
    return true;
  }

  lastKanaEl.addEventListener('input',  () => validateKana(lastKanaEl,  lastKanaErr));
  firstKanaEl.addEventListener('input', () => validateKana(firstKanaEl, firstKanaErr));

  // ── パスワード検証 ──
  const PW_RE = /^[a-zA-Z0-9]{6,16}$/;
  const PW_ERR_MSG = '6桁以上16桁以内の半角英数字で入力してください';

  function validatePassword() {
    const val = passwordEl.value;
    if (val === '') {
      passwordErr.textContent = '';
      passwordEl.classList.remove('error');
      return true; // 空欄は保存時に別途判断
    }
    if (!PW_RE.test(val)) {
      passwordErr.textContent = PW_ERR_MSG;
      passwordEl.classList.add('error');
      return false;
    }
    passwordErr.textContent = '';
    passwordEl.classList.remove('error');
    return true;
  }

  passwordEl.addEventListener('input', validatePassword);

  // ── パスワード表示切替 ──
  togglePwBtn.addEventListener('click', () => {
    const isHidden = passwordEl.type === 'password';
    passwordEl.type = isHidden ? 'text' : 'password';
    const eyeIcon = document.getElementById('eye_icon');
    eyeIcon.innerHTML = isHidden
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  });

  // ── ストレージから読み込み ──
  function loadSettings() {
    chrome.storage.local.get('piaSettings', (result) => {
      const s = result.piaSettings || {};

      lastNameEl.value   = s.last_name   || '';
      firstNameEl.value  = s.first_name  || '';
      lastKanaEl.value   = s.last_kana   || '';
      firstKanaEl.value  = s.first_kana  || '';
      birthYearEl.value  = s.birth_year  || '';
      birthMonthEl.value = s.birth_month || '';
      birthDayEl.value   = s.birth_day   || '';
      tel1El.value       = s.tel1        || '';
      tel2El.value       = s.tel2        || '';
      tel3El.value       = s.tel3        || '';
      emailEl.value      = s.email       || '';
      zip1El.value       = s.zip1        || '';
      zip2El.value       = s.zip2        || '';
      addressEl.value    = s.address     || '';
      passwordEl.value   = s.password    || '';

      if (s.gender) {
        const target = document.querySelector(`input[name="gender"][value="${s.gender}"]`);
        if (target) target.checked = true;
      }

      updateCharCount();
    });
  }

  // ── ストレージへ保存 ──
  function saveSettings(e) {
    e.preventDefault();

    // フリガナ検証
    const lastKanaOk  = validateKana(lastKanaEl,  lastKanaErr);
    const firstKanaOk = validateKana(firstKanaEl, firstKanaErr);

    // 住所文字数検証
    const addrOk = addressEl.value.length <= 26;
    if (!addrOk) {
      addressErr.textContent = '26文字を超えています';
      addressEl.classList.add('error');
    }

    // パスワード検証
    const pwOk = validatePassword();

    if (!lastKanaOk || !firstKanaOk || !addrOk || !pwOk) {
      showMsg('入力内容を確認してください', 'error-text');
      return;
    }

    const selectedGender = document.querySelector('input[name="gender"]:checked');

    // 月・日のゼロパディング
    const monthVal = birthMonthEl.value ? String(birthMonthEl.value).padStart(2, '0') : '';
    const dayVal   = birthDayEl.value   ? String(birthDayEl.value).padStart(2, '0')   : '';

    const settings = {
      last_name:   lastNameEl.value.trim(),
      first_name:  firstNameEl.value.trim(),
      last_kana:   lastKanaEl.value.trim(),
      first_kana:  firstKanaEl.value.trim(),
      gender:      selectedGender ? selectedGender.value : '',
      birth_year:  birthYearEl.value,
      birth_month: monthVal,
      birth_day:   dayVal,
      tel1:        tel1El.value.trim(),
      tel2:        tel2El.value.trim(),
      tel3:        tel3El.value.trim(),
      email:       emailEl.value.trim(),
      zip1:        zip1El.value.trim(),
      zip2:        zip2El.value.trim(),
      address:     addressEl.value,
      password:    passwordEl.value
    };

    chrome.storage.local.set({ piaSettings: settings }, () => {
      if (chrome.runtime.lastError) {
        showMsg('保存に失敗しました', 'error-text');
      } else {
        showMsg('✓ 保存しました', 'success');
      }
    });
  }

  // ── クリア ──
  function clearSettings() {
    if (!confirm('すべての設定をクリアしますか？')) return;
    chrome.storage.local.remove('piaSettings', () => {
      form.reset();
      lastKanaErr.textContent  = '';
      firstKanaErr.textContent = '';
      addressErr.textContent   = '';
      passwordErr.textContent  = '';
      lastKanaEl.classList.remove('error');
      firstKanaEl.classList.remove('error');
      addressEl.classList.remove('error');
      passwordEl.classList.remove('error');
      updateCharCount();
      showMsg('クリアしました', 'success');
    });
  }

  // ── メッセージ表示 ──
  function showMsg(text, cls) {
    saveMsg.textContent = text;
    saveMsg.className   = `save-msg ${cls}`;
    setTimeout(() => {
      saveMsg.textContent = '';
      saveMsg.className   = 'save-msg';
    }, 2500);
  }

  // ── イベント登録 ──
  form.addEventListener('submit', saveSettings);
  clearBtn.addEventListener('click', clearSettings);

  // ── 初期読み込み ──
  loadSettings();
})();
