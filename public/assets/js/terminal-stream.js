/**
 * public/assets/js/terminal-stream.js
 * پایانه پایش زنده امنیتی و کارآگاهی (Streaming Terminal)
 * چاپ پیوسته لاگ‌های پایش عملیاتی ترکیبی انگلیسی/فارسی با تاخیر تصادفی ۰.۵ تا ۱.۵ ثانیه
 * کلیه لاگ‌های روتین در وضعیت ۱۰۰٪ سالم، بدون خطا و بدون هشدارهای کاذب اجرا می‌شوند.
 */

(function () {
  'use strict';

  // بانک لاگ‌های اختصاصی و استاندارد پایانه پایش امنیتی پایگاه (وضعیت عادی و بدون ارور)
  const LOG_POOL = [
    // --- KERNEL & SYSTEM CORE (SYS) ---
    { type: 'sys', tag: 'KERNEL', text: 'Quantum cryptographic ring-0 operational [entropy: 99.98%]' },
    { type: 'sys', tag: 'SYS-CORE', text: 'Hypervisor vCPU allocation balanced: core_affinity [0-7] nominal' },
    { type: 'sys', tag: 'DAEMON', text: 'nexus-security-daemon v4.8 active on pid 1048 [IPC ready]' },
    { type: 'sys', tag: 'MEMORY', text: 'ASLR entropy pool replenished // system memory healthy' },
    { type: 'sys', tag: 'THREAD', text: 'Telemetry worker thread pool active [8 workers running nominal]' },
    { type: 'sys', tag: 'BOOT', text: 'Microkernel verified boot signature: 0x9AF4E12C SHA-512 validated' },
    { type: 'sys', tag: 'STATUS', text: 'System integrity monitor: all services operational [Status: HEALTHY]' },
    { type: 'sys', tag: 'QUANTUM', text: 'QKD (Quantum Key Distribution) entanglement matrix stabilized' },
    { type: 'sys', tag: 'HOST', text: 'Node cluster consensus: 8/8 nodes healthy // zero drift across peers' },
    { type: 'sys', tag: 'UPTIME', text: 'Mainframe core online: 99.99% availability // all subsystems OK' },
    { type: 'sys', tag: 'DB-SYNC', text: 'PostgreSQL database connection pool: 12/12 active [latency: 0.8ms]' },
    { type: 'sys', tag: 'PROCESS', text: 'Background job scheduler: heartbeat acknowledged by core services' },

    // --- NETWORK & TRAFFIC TELEMETRY (NET) ---
    { type: 'net', tag: 'SOCKET', text: 'WSS secure transport established: wss://relay-04.nexus.internal:8443' },
    { type: 'net', tag: 'PACKET', text: 'Inbound stream packet inspection: 1,420 pkts/sec // latency < 0.12ms' },
    { type: 'net', tag: 'TLS-1.3', text: 'TLS 1.3 handshake: CipherSuite TLS_AES_256_GCM_SHA384 active' },
    { type: 'net', tag: 'ROUTING', text: 'BGP path update verified from AS64512: optimal route confirmed' },
    { type: 'net', tag: 'GATEWAY', text: 'Encrypted multi-hop mesh tunnel active via relay node #714-DELTA' },
    { type: 'net', tag: 'DNS-SEC', text: 'DNS-over-HTTPS query resolved with valid RRSIG cryptographic proof' },
    { type: 'net', tag: 'STREAM', text: 'Telemetry packet relay verified: 0 dropped packets across session' },
    { type: 'net', tag: 'BANDWIDTH', text: 'Network throughput: 12.4 Mbps Rx / 4.8 Mbps Tx // signal SNR: 38dB' },
    { type: 'net', tag: 'PEERS', text: 'P2P secure relay heartbeat: 34 active peering nodes responding' },
    { type: 'net', tag: 'LINK', text: 'Duplex telemetry link synchronized: packet loss 0.00% // jitter 0.08ms' },
    { type: 'net', tag: 'HEARTBEAT', text: 'Command center relay heartbeat: round-trip latency 1.1ms' },
    { type: 'net', tag: 'CHANNEL', text: 'End-to-end encrypted channel established between station and server' },

    // --- SECURITY & PERIMETER HEALTH (NET/SYS) ---
    { type: 'net', tag: 'FIREWALL', text: 'Stateful firewall active: all inbound ports operating in stealth mode' },
    { type: 'sys', tag: 'SHIELD', text: 'Zero-trust perimeter verified: all authorized endpoints authenticated' },
    { type: 'net', tag: 'PROXY', text: 'Reverse proxy health check: 200 OK across all upstream clusters' },
    { type: 'sys', tag: 'ACCESS', text: 'Role-based access control (RBAC): user session token verified' },
    { type: 'net', tag: 'NETWORK', text: 'Traffic scrubbing filter: all incoming packets conform to protocol' },
    { type: 'sys', tag: 'INTEGRITY', text: 'System binary tripwire audit: all 1,280 checksums match origin manifest' },
    { type: 'net', tag: 'ENCRYPT', text: 'Secure communication envelope armed: AES-256-GCM authenticated' },
    { type: 'sys', tag: 'ISOLATION', text: 'Sandbox security boundaries intact: memory protection active' },
    { type: 'net', tag: 'PROTOCOL', text: 'WebSocket frame verification: continuous keep-alive ping acknowledged' },
    { type: 'sys', tag: 'DEFENSE', text: 'Nexus security subsystem: normal operational mode [Status: SECURE]' },

    // --- CRYPTOGRAPHY, CIPHERS & PROBES (DET) ---
    { type: 'det', tag: 'CIPHER', text: 'Rotating ephemeral Diffie-Hellman (ECDH) session keys on curve X25519' },
    { type: 'det', tag: 'HASH', text: 'Merkle tree root recalculation completed: 0x8D3C4B... verified' },
    { type: 'det', tag: 'EVIDENCE', text: 'Case file digital signatures verified: 100% document authenticity' },
    { type: 'det', tag: 'CRYPTO', text: 'RSA-4096 signature verification succeeded: cert authority #NexusRoot' },
    { type: 'det', tag: 'PROBE', text: 'Sub-millisecond probe dispatched to class workstation: RTT = 0.88ms' },
    { type: 'det', tag: 'DECRYPT', text: 'Stream payload validation completed: data integrity 100%' },
    { type: 'det', tag: 'ENTROPY', text: 'Hardware True Random Number Generator (TRNG) pool refreshed' },
    { type: 'det', tag: 'VAULT-HUD', text: 'Classified vault biometric lock telemetry: mechanism secured' },
    { type: 'det', tag: 'ASSIST', text: 'Class assistant nodes connected: real-time telemetry streaming' },
    { type: 'det', tag: 'AUDIT', text: 'Cryptographic keystore audited: zero expired certificates' },
    { type: 'det', tag: 'NEURAL-BUS', text: 'Neural processing bus: telemetry latency 1.4ms [Status: NOMINAL]' },
    { type: 'det', tag: 'DOSSIER', text: 'Case dossier index synchronized with command headquarters' },

    // --- DUAL CYBER (ENGLISH + PERSIAN TECH ACCENTS) ---
    { type: 'sys', tag: 'سایبر', text: 'کانال ارتباطی پایگاه فعال و ایمن است // End-to-End Encryption Armed' },
    { type: 'net', tag: 'پایش شبکه', text: 'بررسی درگاه‌های ارتباطی: تمامی پورت‌ها در وضعیت عادی و پایدار' },
    { type: 'det', tag: 'رمزنگاری', text: 'کلیدهای نشست کاربری به‌روزرسانی شد // Session Keys Rotated' },
    { type: 'sys', tag: 'هسته سیستم', text: 'پایش بلادرنگ پردازنده: مصرف بهینه، وضعیت پایدار و نرمال' },
    { type: 'det', tag: 'پایگاه داده', text: 'همگام‌سازی اسناد پرونده با سرور مرکزی تکمیل گردید // Sync Complete' },
    { type: 'net', tag: 'ترافیک زنده', text: 'رهگیری بسته داده رمزنگاری‌شده در مسیر سرور مرکزی // Stream OK' },
    { type: 'det', tag: 'آنالیز داده', text: 'تحلیل داده‌های دریافتی پرونده: وضعیت عملیاتی کاملاً عادی' },
    { type: 'sys', tag: 'کوانتوم', text: 'الگوریتم رمزنگاری پساکوانتومی (Kyber-1024) با موفقیت فعال شد' },
    { type: 'net', tag: 'سامانه امن', text: 'دیواره دفاعی چندلایه نکسوس: پایش پیوسته خطوط ارتباطی دستیاران' },
    { type: 'det', tag: 'اتاق تحقیقات', text: 'پرونده‌های فعال و شواهد مکشوفه در وضعیت هماهنگ با مرکز فرماندهی' }
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

      // بارگذاری اولیه ۶ خط لاگ تا از همان ابتدا چندین خط در ترمینال دیده شود
      this.addLog({
        type: 'sys',
        tag: 'BOOT',
        text: 'NEXUS SECURITY SUBSYSTEM ONLINE // QUANTUM ENCRYPTION ACTIVE'
      });
      for (let i = 0; i < 5; i++) {
        const item = LOG_POOL[this.currentIndex % LOG_POOL.length];
        this.currentIndex++;
        this.addLog(item);
      }

      this.scheduleNextLog();

      // رویداد هاور یا اسکرول دستی برای توقف موقت در صورت تمایل
      this.containerEl.addEventListener('mouseenter', () => { this.isPaused = true; });
      this.containerEl.addEventListener('mouseleave', () => { this.isPaused = false; });
    }

    stop() {
      if (this.timerId) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
      this.isPaused = true;
    }

    start() {
      if (this.timerId) return;
      this.isPaused = false;
      this.scheduleNextLog();
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
      const timeStr = now.toTimeString().split(' ')[0];

      const line = document.createElement('div');
      line.className = `term-line term-${item.type || 'sys'}`;

      line.innerHTML = `
        <span class="term-time">${timeStr}</span>
        <span class="term-badge">${item.tag}</span>
        <span class="term-msg" title="${this.escape(item.text)}">${this.escape(item.text)}</span>
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
