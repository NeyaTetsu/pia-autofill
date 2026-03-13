(() => {
  'use strict';

  // ── 必須フィールドが存在するか確認 ──
  function getInput(name) {
    return document.querySelector(`input[name="${name}"], select[name="${name}"], textarea[name="${name}"]`);
  }

  function hasRequiredFields() {
    return !!getInput('cstmr_lnm') && !!getInput('cstmr_fnm');
  }

  // ── inputに値をセットし、React/Vue等フレームワーク向けにイベントを発火 ──
  function setInputValue(el, value) {
    if (!el) return;

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(el) === HTMLInputElement.prototype
        ? HTMLInputElement.prototype
        : el.tagName === 'SELECT'
          ? HTMLSelectElement.prototype
          : HTMLTextAreaElement.prototype,
      'value'
    );

    if (nativeInputValueSetter && nativeInputValueSetter.set) {
      nativeInputValueSetter.set.call(el, value);
    } else {
      el.value = value;
    }

    ['input', 'change', 'blur'].forEach(evt => {
      el.dispatchEvent(new Event(evt, { bubbles: true }));
    });
  }

  // ── ラジオボタン / セレクトの選択 ──
  function setRadioOrSelect(name, value) {
    // radio
    const radio = document.querySelector(`input[type="radio"][name="${name}"][value="${value}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    // select
    const sel = document.querySelector(`select[name="${name}"]`);
    if (sel) {
      setInputValue(sel, value);
    }
  }

  // ── 自動入力メイン処理 ──
  function autofill(settings) {
    const map = [
      ['cstmr_lnm',         settings.last_name],
      ['cstmr_fnm',         settings.first_name],
      ['cstmr_lkn',         settings.last_kana],
      ['cstmr_fkn',         settings.first_kana],
      ['birth_yyyy',        settings.birth_year],
      ['birth_mm',          settings.birth_month],
      ['birth_dd',          settings.birth_day],
      ['telno1',            settings.tel1],
      ['telno2',            settings.tel2],
      ['telno3',            settings.tel3],
      ['ml_addr',           settings.email],
      ['ml_addr_cnfm',      settings.email],
      ['cmnt01',            settings.zip1],
      ['cmnt02',            settings.zip2],
      ['cmnt14',            settings.address],
      ['gnrl_cstmr_passwd', settings.password],
    ];

    map.forEach(([name, value]) => {
      if (!value) return;
      const el = getInput(name);
      if (el) setInputValue(el, value);
    });

    // 性別（radio or select）
    if (settings.gender) {
      setRadioOrSelect('sex_typ', settings.gender);
    }

    // 郵便番号検索ボタンをクリック
    const zipSearchBtn = document.getElementById('zip_search');
    if (zipSearchBtn) {
      setTimeout(() => {
        zipSearchBtn.click();
      }, 300);
    }

    showToast('✓ フォームに入力しました');
  }

  // ── トースト通知 ──
  function showToast(message) {
    let toast = document.getElementById('pia-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pia-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // ── フローティングボタンを作成 ──
  function createFloatingButton() {
    if (document.getElementById('pia-autofill-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'pia-autofill-btn';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', 'Pia Autofill: フォームに自動入力する');
    btn.innerHTML = `
      <svg class="pia-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      フォームに自動入力する
    `;

    btn.addEventListener('click', () => {
      chrome.storage.local.get('piaSettings', (result) => {
        const settings = result.piaSettings;
        if (!settings || Object.keys(settings).length === 0) {
          showToast('⚠ 設定が保存されていません');
          return;
        }
        autofill(settings);
      });
    });

    document.body.appendChild(btn);
  }

  // ── DOM監視（SPA対応） ──
  let observer = null;

  function checkAndInit() {
    if (hasRequiredFields()) {
      createFloatingButton();
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }
  }

  // 初回チェック
  checkAndInit();

  // DOM変化を監視（ページが動的に変わる場合に対応）
  if (!hasRequiredFields()) {
    observer = new MutationObserver(() => {
      checkAndInit();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 10秒後に監視終了
    setTimeout(() => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }, 10000);
  }
})();
