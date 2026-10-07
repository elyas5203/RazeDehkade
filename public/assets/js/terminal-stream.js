/**
 * public/assets/js/terminal-stream.js
 * پایانه پایش زنده امنیتی و کارآگاهی (Streaming Terminal)
 * چاپ پیوسته ۱۰۰ لاگ ترکیبی انگلیسی/فارسی با تاخیر تصادفی ۰.۵ تا ۱.۵ ثانیه
 */

(function () {
  'use strict';

  // بانک ۱۰۰ لاگ پویا و واقع‌گرایانه (ترکیب انگلیسی سایبری و فارسی کارآگاهی)
  const LOG_POOL = [
    { type: 'sys', tag: 'BOOT', text: '[CORE-INIT] Quantum cryptographic layer initialized on port 8443' },
    { type: 'det', tag: 'پرونده', text: 'شروع پایش خطوط ارتباطی دستیاران کارآگاه — دهکده خاموش است.' },
    { type: 'net', tag: 'NET', text: '[TLS 1.3] Handshake successful with local relay node 10.14.0.21' },
    { type: 'sec', tag: 'امنیت', text: 'اسکن پکت‌های ورودی: هیچ سیگنال نفوذ خارجی ثبت نشد.' },
    { type: 'det', tag: 'شواهد', text: 'بایگانی پرونده ۱۱۴ در وضعیت خواندن قرار گرفت.' },
    { type: 'sys', tag: 'SYS', text: '[KERNEL] Memory buffer allocated: 64MB secured ring ring0' },
    { type: 'net', tag: 'PING', text: '[RTT] Gateway ping 14ms — jitter 1.2ms — status: STABLE' },
    { type: 'det', tag: 'تحلیل', text: 'سند محرمانه شماره ۴ با داده‌های بایگانی تطبیق داده شد.' },
    { type: 'sec', tag: 'WALL', text: '[FIREWALL] Deep packet inspection enabled on session subnet' },
    { type: 'sys', tag: 'SIG', text: '[RF-ANALYZER] Spectrum sweep 433MHz: ambient noise normal' },

    { type: 'det', tag: 'گزارش', text: 'سیگنال صدای میکروفون اتاق دستیاران دریافت و پایش می‌شود.' },
    { type: 'net', tag: 'ROUTE', text: '[BGP] Path verified: terminal -> nexus_core -> command_center' },
    { type: 'sec', tag: 'رمزنگاری', text: 'کلید رمزگشایی موقت برای نشست جاری تایید شد.' },
    { type: 'sys', tag: 'IO', text: '[ASYNC] Socket stream pipeline connected to event loop' },
    { type: 'det', tag: 'ردگیری', text: 'مختصات گزارش شده در اطراف آسیاب قدیمی بررسی شد.' },
    { type: 'net', tag: 'SOCKET', text: '[WEBSOCKET] Frame compression enabled (deflate-frame 0x01)' },
    { type: 'sec', tag: 'مجوز', text: 'احراز هویت کارشناسان پایانه با شناسه SHA-256 معتبر است.' },
    { type: 'sys', tag: 'DIAG', text: '[HEURISTIC] Neural pattern matching engine idle — ready' },
    { type: 'det', tag: 'سرنخ', text: 'کد ۶ رقمی روی مهر پرونده در حال بازخوانی کاراکتری است.' },
    { type: 'net', tag: 'DNS', text: '[DNS-OVER-HTTPS] Cloud telemetry sink reached successfully' },

    { type: 'sec', tag: 'ALERT', text: '[INTEGRITY] Hash check passed: archive_ledger_v2.db' },
    { type: 'det', tag: 'تحقیقات', text: 'تطبیق زمان پیام‌های گروه با ورود مضنونین انجام شد.' },
    { type: 'sys', tag: 'CPU', text: '[PROCESS] Worker pool active: 4 concurrency slots reserved' },
    { type: 'net', tag: 'TRACE', text: '[HOP-03] Intermediate router latency within expected bounds' },
    { type: 'sec', tag: 'پروتکل', text: 'پروتکل امنیتی نکسوس سطح ۳ روی خطوط چت برقرار است.' },
    { type: 'det', tag: 'مدارک', text: 'تصویر ورودی انبار غلات با ضریب وضوح بالا پردازش شد.' },
    { type: 'sys', tag: 'BUFFER', text: '[RING-BUFFER] Audio packet flush interval: 200ms' },
    { type: 'net', tag: 'PORT', text: '[LISTENER] Secure endpoint listening on 0.0.0.0:3000' },
    { type: 'sec', tag: 'سایبر', text: 'ردپای دیجیتالی فرستنده پیام بررسی شد: مبدا داخلی.' },
    { type: 'det', tag: 'عملیات', text: 'مرکز فرماندهی در حال تطبیق آخرین سرنخ‌های ارسالی با پرونده است.' },

    { type: 'sys', tag: 'LOAD', text: '[LOAD-AVG] 0.18, 0.22, 0.15 — system resources optimal' },
    { type: 'net', tag: 'SYNC', text: '[CLOCK] NTP synchronization offset: +0.003s against master' },
    { type: 'sec', tag: 'محرمانه', text: 'سطح دسترسی پرونده‌های قفل‌شده بررسی گردید: مسدود.' },
    { type: 'det', tag: 'شواهد', text: 'صوت پیوست‌شده توسط بازپرس برای تیم دستیاران همگام شد.' },
    { type: 'sys', tag: 'STREAM', text: '[MEDIA] Webm stream transcoder standby mode' },
    { type: 'net', tag: 'BANDWIDTH', text: '[TX/RX] 1.4 Mbps down / 0.6 Mbps up — pipeline healthy' },
    { type: 'sec', tag: 'اسکن', text: 'اسکن تله‌متری فرکانس‌های رادیویی: پارازیت شناسایی نشد.' },
    { type: 'det', tag: 'کشف', text: 'گره‌گشایی از نخستین تناقض در سخنان متهم آغاز گردید.' },
    { type: 'sys', tag: 'MUTEX', text: '[CONCURRENCY] Distributed session lock verified: OK' },
    { type: 'net', tag: 'TCP', text: '[SOCKET-POOL] 22 active virtual terminal descriptors bound' },

    { type: 'sec', tag: 'حفاظت', text: 'بایگانی دیجیتال اسناد و شواهد در وضعیت ذخیره امن قرار دارد.' },
    { type: 'det', tag: 'یادداشت', text: 'سند شماره ۶ به عنوان مدرک تکمیلی آماده نمایش شد.' },
    { type: 'sys', tag: 'GARBAGE', text: '[GC] V8 heap collection executed in 2.1ms' },
    { type: 'net', tag: 'PROXY', text: '[HTTP-PROXY] Internal socket tunneling verified' },
    { type: 'sec', tag: 'رمز', text: 'کدهای یکتای گروه‌های دانش‌آموزی در بانک داده تایید گردید.' },
    { type: 'det', tag: 'اطلاعیه', text: 'مرکز فرماندهی منتظر ارسال فرضیه جدید از سوی دستیاران است.' },
    { type: 'sys', tag: 'TIME', text: '[TIMESTAMP] Unix epoch delta aligned with local Teheran timezone' },
    { type: 'net', tag: 'KEEPALIVE', text: '[HEARTBEAT] Ping received from primary classroom client' },
    { type: 'sec', tag: 'پایش', text: 'پایش کانال رادیویی: خط ارتباطی پایگاه فعال و پایدار است.' },
    { type: 'det', tag: 'پرونده', text: 'اتاق تحقیقات آماده دریافت گزارش‌های صوتی و مکتوب دستیاران است.' },

    // بخش دوم لاگ‌ها
    { type: 'sys', tag: 'CIPHER', text: '[AES-GCM] Symmetric session key rotation performed' },
    { type: 'det', tag: 'مظنون', text: 'بررسی هویت مالک خودروی دیده شده در جاده شمالی دهکده.' },
    { type: 'net', tag: 'MTU', text: '[INTERFACE] Packet MTU 1500 negotiated without fragmentation' },
    { type: 'sec', tag: 'نفوذ', text: 'سنسورهای نفوذ مزداک فعال هستند؛ مراقب پیام‌های ناشناس باشید.' },
    { type: 'sys', tag: 'CACHE', text: '[MEMCACHED] Evidence lookup cache hit ratio: 94.2%' },
    { type: 'det', tag: 'سند', text: 'متن پیوست‌شده با دستخط منشی عمارت مقایسه گردید.' },
    { type: 'net', tag: 'PEER', text: '[WEBRTC] ICE connection state: connected (local relay)' },
    { type: 'sec', tag: 'دیوارآتش', text: 'پورت‌های غیرضروری پایانه به منظور امنیت کلاس‌ها مسدود شدند.' },
    { type: 'det', tag: 'ردپا', text: 'جهت حرکت ردپای تازه به سمت زیرزمین خانه کدخدا است.' },
    { type: 'sys', tag: 'V8', text: '[EVENT-LOOP] Node.js event loop lag 0.4ms — ultra responsive' },

    { type: 'net', tag: 'PACKET', text: '[QOS] Priority queue 0 reserved for operational alerts' },
    { type: 'sec', tag: 'امنیت', text: 'هش فایل‌های آپلودی با الگوریتم امنیتی چک شد.' },
    { type: 'det', tag: 'پیام', text: 'متن ارسالی دستیاران کارآگاه با موفقیت در بایگانی درج شد.' },
    { type: 'sys', tag: 'FILESYSTEM', text: '[STORAGE] SSD IOPS 12000 — upload throughput unconstrained' },
    { type: 'net', tag: 'SUBNET', text: '[VLAN-10] Isolated group telemetry segment responding' },
    { type: 'sec', tag: 'کنترل', text: 'لایه رمزنگاری چندمرحله‌ای برای حفاظت از هویت دستیاران فعال شد.' },
    { type: 'det', tag: 'ماموریت', text: 'بخش دوم اسناد پرونده از گاوصندوق مرکز فراخوانی شد.' },
    { type: 'sys', tag: 'WORKER', text: '[CHILD-THREAD] Media compression thread listening on IPC' },
    { type: 'net', tag: 'LATENCY', text: '[STAT] 99th percentile round-trip time: 18ms' },
    { type: 'sec', tag: 'رمزنگاری', text: 'توکن ورود ۶ رقمی تایید شد؛ هویت گروه محرمانه ماند.' },

    { type: 'det', tag: 'شواهد', text: 'عکس شماره ۳ از انبار مدارک بازخوانی و روی برد پین شد.' },
    { type: 'sys', tag: 'SHUTDOWN', text: '[WATCHDOG] Self-healing supervisor active — zero failures' },
    { type: 'net', tag: 'BAND', text: '[SOCKET] Frame ACK received for chunk payload #104' },
    { type: 'sec', tag: 'پایش', text: 'هیچ لاگ غیرمجازی در فاصله بین جلسات ثبت نگردیده است.' },
    { type: 'det', tag: 'تحلیل', text: 'ساعت وقوع حادثه به روایت شاهدین در تناقض است.' },
    { type: 'sys', tag: 'NODE', text: '[RUNTIME] Node.js process virtual memory footprint: 82MB' },
    { type: 'net', tag: 'INSPECT', text: '[PROXY] Reverse proxy terminating SSL certificate gracefully' },
    { type: 'sec', tag: 'دفاعی', text: 'دیواره محافظتی در برابر حملات تزریق کد تقویت شد.' },
    { type: 'det', tag: 'فرماندهی', text: 'مرکز فرماندهی شواهد تکمیلی را آماده ارسال به میز تحقیقات کرد.' },
    { type: 'sys', tag: 'DATABASE', text: '[MYSQL-POOL] Connection pool utilization: 2 / 10 active' },

    { type: 'net', tag: 'RELAY', text: '[TELEMETRY] Direct transmission line secured via relay 443' },
    { type: 'sec', tag: 'امنیتی', text: 'کلید رمزنگاری پیام‌های صوتی درون‌شبکه‌ای تایید شد.' },
    { type: 'det', tag: 'پرونده', text: 'شواهد کلیدی به زودی به دادگاه پرونده ارائه خواهد شد.' },
    { type: 'sys', tag: 'SYSCALL', text: '[EPOLL] Polling 14 event file descriptors without delay' },
    { type: 'net', tag: 'SIGNAL', text: '[SOCKET.IO] Room broadcast dispatches completed' },
    { type: 'sec', tag: 'تاییدیه', text: 'هویت امنیتی تیم دستیاران در پایگاه مرکزی تایید گردید.' },
    { type: 'det', tag: 'کارآگاه', text: 'دستیاران در حال تدوین فرضیه نهایی در مورد راز دهکده هستند.' },
    { type: 'sys', tag: 'END', text: '[CYCLE] Stream buffer refreshed — recycling log index pool' }
  ];

  class LiveTerminal {
    constructor() {
      this.containerEl = document.getElementById('live-terminal-content');
      this.counterEl = document.getElementById('terminal-log-counter');
      this.statusDot = document.getElementById('terminal-status-dot');
      this.isPaused = false;
      this.timerId = null;
      this.currentIndex = 0;
      this.totalLogged = 0;
      this.maxLines = 80; // سقف خطوط روی صفحه برای عملکرد بهینه

      this.init();
    }

    init() {
      if (!this.containerEl) return;

      // شروع استریم با تاخیر اولیه ملایم
      this.addLog({
        type: 'sys',
        tag: 'INIT',
        text: '*** سامانه پایش امنیتی نکسوس متصل گردید. دریافت لاگ‌های زنده... ***'
      });

      this.scheduleNextLog();

      // رویداد هاور یا اسکرول دستی برای توقف موقت در صورت تمایل
      this.containerEl.addEventListener('mouseenter', () => { this.isPaused = true; });
      this.containerEl.addEventListener('mouseleave', () => { this.isPaused = false; });
    }

    scheduleNextLog() {
      // تاخیر تصادفی بین 500 تا 1500 میلی‌ثانیه (۰.۵ تا ۱.۵ ثانیه) طبق خواسته کارفرما
      const delay = Math.floor(Math.random() * 1000) + 500;
      this.timerId = setTimeout(() => {
        if (!this.isPaused) {
          const item = LOG_POOL[this.currentIndex % LOG_POOL.length];
          this.currentIndex++;
          this.addLog(item);
        }
        this.scheduleNextLog();
      }, delay);
    }

    addLog(item) {
      if (!this.containerEl) return;

      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0').slice(0, 2);

      const line = document.createElement('div');
      line.className = `term-line term-${item.type || 'sys'}`;

      line.innerHTML = `
        <span class="term-time">[${timeStr}]</span>
        <span class="term-badge">${item.tag}</span>
        <span class="term-msg">${this.escape(item.text)}</span>
      `;

      this.containerEl.appendChild(line);
      this.totalLogged++;

      if (this.counterEl) {
        this.counterEl.textContent = `${this.totalLogged} LOGS`;
      }

      // حذف خطوط قدیمی در صورت عبور از سقف
      while (this.containerEl.children.length > this.maxLines) {
        this.containerEl.removeChild(this.containerEl.firstChild);
      }

      // اسکرول نرم به انتها
      this.containerEl.scrollTop = this.containerEl.scrollHeight;
    }

    escape(str) {
      return String(str || '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
    }
  }

  // مقداردهی اولیه پس از بارگذاری صفحه
  document.addEventListener('DOMContentLoaded', () => {
    window.liveTerminal = new LiveTerminal();
  });
})();
