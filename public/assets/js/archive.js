document.addEventListener('DOMContentLoaded', () => {
    const casesWrapper = document.getElementById('cases-wrapper');
    const authData = { token: sessionStorage.getItem('userToken'), session: JSON.parse(sessionStorage.getItem('userSession') || 'null') };

    if (!authData.token || !authData.session) {
        window.location.href = '/enter-code.html';
        return;
    }

    const session = authData.session;
    const cases = session.cases || [];
    const activeCaseKey = session.active_case || 'village';

    const caseDefinitions = [
        { key: 'syndrome', code: 'DOC-01', title: 'سندروم فراموشی', subtitle: 'ردیابی یک حافظه دست‌کاری‌شده', brief: 'پرونده بسته‌شده مرکز درباره نشانه‌هایی که از ذهن شاهدان پاک شده بود.' },
        { key: 'village', code: 'DOC-02', title: 'راز دهکده', subtitle: 'ناپدیدشدن پیام‌رسان روستای حصار', brief: 'آخرین گزارش از حوالی آسیاب سنگی رسیده؛ مسیر نامه‌ها و نشانه‌های تازه را بررسی کنید.' },
        { key: 'court', code: 'DOC-03', title: 'دادگاه عدالت', subtitle: 'حقیقت پشت یک حکم ناتمام', brief: 'دسترسی پس از پایان پرونده جاری و تأیید مرکز فرماندهی آزاد می‌شود.' }
    ];

    caseDefinitions.forEach(def => {
        const folder = document.createElement('div');
        
        let status = 'locked';
        const caseRecord = cases.find(c => c.case_key === def.key);
        
        if (def.key === activeCaseKey) {
            status = 'active';
        } else if (caseRecord && caseRecord.status === 'solved') {
            status = 'solved';
        }

        const labels = { active: 'پرونده فعال', solved: 'مختومه', locked: 'مسدود' };
        folder.className = `case-folder ${status}`;
        folder.tabIndex = status === 'active' ? 0 : -1;
        folder.setAttribute('role', 'button');
        folder.setAttribute('aria-disabled', String(status !== 'active'));
        folder.setAttribute('aria-label', `${def.title}؛ ${labels[status]}`);
        const images = { syndrome: 'stranger', village: 'mill', court: 'document' };

        let lockOverlayHtml = '';
        if (status === 'locked') {
            lockOverlayHtml = `
              <div class="locked-overlay" aria-hidden="true">
                <div class="big-lock-icon">
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="5" y="11" width="14" height="10" rx="2"/>
                    <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                  </svg>
                </div>
                <strong class="locked-text">پرونده مسدود است</strong>
                <span class="locked-subtext">نیازمند مجوز فرماندهی و اتمام پرونده جاری</span>
              </div>
            `;
        }

        let solvedStampHtml = '';
        if (status === 'solved') {
            solvedStampHtml = `
              <div class="solved-stamp" aria-hidden="true">
                <div class="stamp-inner">
                  <span class="stamp-top">مرکز تحقیقات</span>
                  <strong class="stamp-main">حل‌شده</strong>
                  <span class="stamp-bottom">SOLVED</span>
                </div>
              </div>
            `;
        }

        folder.innerHTML = `
          <div class="folder-inside" aria-hidden="true">
            <span>مرکز اسناد جنایی و عملیات ویژه / ${def.code}</span>
            <img src="/assets/scene/${images[def.key]}.jpg" alt="">
          </div>
          <div class="folder-cover">
            ${lockOverlayHtml}
            ${solvedStampHtml}
            <div class="folder-tab">${def.code} / CLASSIFIED</div>
            <div class="folder-meta">
              <code>CASE FILE / ${def.code.slice(-2)}</code>
              <span class="folder-status">${labels[status]}</span>
            </div>
            <div class="case-title">
              <small>CLASSIFIED DOSSIER</small>
              <strong>${def.title}</strong>
              <span>${def.subtitle}</span>
            </div>
            <img class="folder-photo" src="/assets/scene/${images[def.key]}.jpg" alt="" width="320" height="150">
            <p class="folder-description">${def.brief}</p>
            <div class="folder-action">
              <span>${status === 'active' ? 'ورود به پرونده و بررسی شواهد' : labels[status]}</span>
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                ${status === 'active' ? '<path d="M20 12H4m6-6-6 6 6 6"/>' : status === 'solved' ? '<path d="m5 12 4 4L19 6"/>' : '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>'}
              </svg>
            </div>
          </div>
        `;

        if (status === 'active') {
            folder.addEventListener('click', () => {
                if (document.body.classList.contains('entering')) return;
                folder.classList.add('opening');
                document.body.classList.add('entering');
                folder.setAttribute('aria-busy', 'true');
                document.getElementById('entry-title').textContent = def.title;
                const entry = document.getElementById('case-entry');
                entry.setAttribute('aria-hidden', 'false');
                entry.setAttribute('role', 'status');
                entry.querySelector('.entry-scene').style.backgroundImage = `linear-gradient(#07100cab,#07100c88 40%,#07100cf5),url('/assets/scene/${images[def.key]}.jpg')`;
                sessionStorage.setItem('caseEntrance', def.key);
                setTimeout(() => { window.location.href = '/chat.html'; }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 2300);
            });
            folder.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); folder.click(); } });
        }

        casesWrapper.appendChild(folder);
    });
});

window.addEventListener('pageshow', event => {
    if (event.persisted) {
        document.body.classList.remove('entering');
        document.querySelector('.opening')?.classList.remove('opening');
        document.querySelector('[aria-busy]')?.removeAttribute('aria-busy');
        document.getElementById('case-entry').setAttribute('aria-hidden', 'true');
    }
});
