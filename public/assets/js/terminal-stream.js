/**
 * public/assets/js/terminal-stream.js
 * پایانه پایش زنده امنیتی و کارآگاهی (Streaming Terminal)
 * چاپ پیوسته ۱۰۰ لاگ ترکیبی انگلیسی/فارسی با تاخیر تصادفی ۰.۵ تا ۱.۵ ثانیه
 */

(function () {
  'use strict';

  // بانک لاگ‌های اختصاصی و فوق پیشرفته پایانه پایش سایبری و شبکه امنیتی نکسوس
  const LOG_POOL = [
    // --- KERNEL & SYSTEM CORE (SYS) ---
    { type: 'sys', tag: 'KERNEL', text: 'Quantum cryptographic ring-0 initialized [entropy: 99.98%]' },
    { type: 'sys', tag: 'SYS-CORE', text: 'Hypervisor vCPU allocation balanced: core_affinity [0-7] nominal' },
    { type: 'sys', tag: 'DAEMON', text: 'nexus-security-daemon v4.8 active on pid 1048 [IPC ready]' },
    { type: 'sys', tag: 'MEMORY', text: 'ASLR entropy pool replenished // zero buffer overflow vectors detected' },
    { type: 'sys', tag: 'THREAD', text: 'Spawning concurrent telemetry worker thread #08 [stack: 64MB heap]' },
    { type: 'sys', tag: 'BOOT', text: 'Microkernel verified boot signature: 0x9AF4E12C SHA-512 validated' },
    { type: 'sys', tag: 'CORE', text: 'Hardware security module (HSM) state: ARMED & LOCKED' },
    { type: 'sys', tag: 'QUANTUM', text: 'QKD (Quantum Key Distribution) entanglement matrix stabilized' },
    { type: 'sys', tag: 'HOST', text: 'Node cluster consensus: 8/8 nodes healthy // zero drift across peers' },
    { type: 'sys', tag: 'DAEMON', text: 'Garbage collector flushed 142 orphaned socket descriptors' },

    // --- NETWORK & TRAFFIC TELEMETRY (NET) ---
    { type: 'net', tag: 'SOCKET', text: 'WSS secure transport established: wss://relay-04.nexus.internal:8443' },
    { type: 'net', tag: 'PACKET', text: 'Inbound stream packet inspection: 1,420 pkts/sec // jitter < 0.12ms' },
    { type: 'net', tag: 'TLS-1.3', text: 'TLS 1.3 handshake: CipherSuite TLS_AES_256_GCM_SHA384 negotiated' },
    { type: 'net', tag: 'ROUTING', text: 'BGP path update received from AS64512: latency optimized -4.2ms' },
    { type: 'net', tag: 'GATEWAY', text: 'Encrypted multi-hop mesh tunnel active via relay node #714-DELTA' },
    { type: 'net', tag: 'DNS-SEC', text: 'DNS-over-HTTPS query resolved with valid RRSIG cryptographic proof' },
    { type: 'net', tag: 'PROXY', text: 'Reverse proxy traffic scrubbed: 0 malicious headers across 420 requests' },
    { type: 'net', tag: 'TELEMETRY', text: 'Bandwidth utilization: 12.4 Mbps Rx / 4.8 Mbps Tx // signal SNR: 38dB' },
    { type: 'net', tag: 'DARKNET', text: 'P2P shadow relay heartbeat: 34 active peering nodes responding' },
    { type: 'net', tag: 'SNIFFER', text: 'Passive promiscuous packet filter online: listening on interface eno1' },

    // --- CYBER DEFENSE, FIREWALL & BREACH DETECTION (SEC) ---
    { type: 'sec', tag: 'FIREWALL', text: 'Inbound SYN flood mitigated: 185.220.101.45 dropped at perimeter' },
    { type: 'sec', tag: 'INTRUSION', text: 'Heuristic IDS: Port sweep detected on TCP ports 22, 80, 8080 [BLOCKED]' },
    { type: 'sec', tag: 'HONEYPOT', text: 'Brute-force auth attempt trapped in sandbox container [IP: 194.26.29.112]' },
    { type: 'sec', tag: 'ZERO-DAY', text: 'Shadow sandbox executed unknown binary payload: 0 privilege escape' },
    { type: 'sec', tag: 'OVERRIDE', text: 'Unauthorized sudo escalation attempt intercepted on /dev/pts/3' },
    { type: 'sec', tag: 'WAF', text: 'SQLi & XSS payload signatures neutralized in incoming POST stream' },
    { type: 'sec', tag: 'BREACH-DEF', text: 'Zero-trust perimeter enforced: non-whitelisted MAC address isolated' },
    { type: 'sec', tag: 'THREAT', text: 'Known threat actor fingerprint (APT-44) checked against telemetry: Negative' },
    { type: 'sec', tag: 'ISOLATION', text: 'Subsystem memory enclosure sealed: air-gap boundaries verified' },
    { type: 'sec', tag: 'INTEGRITY', text: 'System binary tripwire audit: all 1,280 checksums match origin manifest' },

    // --- CRYPTOGRAPHY, CIPHERS & PROBES (DET) ---
    { type: 'det', tag: 'CIPHER', text: 'Rotating ephemeral Diffie-Hellman (ECDH) session keys on curve X25519' },
    { type: 'det', tag: 'HASH', text: 'Merkle tree root recalculation completed: 0x8D3C4B... verified' },
    { type: 'det', tag: 'SCANNER', text: 'Memory vulnerability probe finished: zero dangling pointers detected' },
    { type: 'det', tag: 'CRYPTO', text: 'RSA-4096 signature verification succeeded: cert authority #NexusRoot' },
    { type: 'det', tag: 'PROBE', text: 'Sub-millisecond probe dispatched to node sector 7: RTT = 0.88ms' },
    { type: 'det', tag: 'DECRYPT', text: 'Deciphering classified payload chunk #104: stream integrity 100%' },
    { type: 'det', tag: 'ENTROPY', text: 'Hardware True Random Number Generator (TRNG) pool refreshed' },
    { type: 'det', tag: 'CIPHER', text: 'ChaCha20-Poly1305 authenticated stream active for agent comms' },
    { type: 'det', tag: 'TRACE', text: 'Tracing anomalous packet TTL decrement across intermediate hops' },
    { type: 'det', tag: 'AUDIT', text: 'Cryptographic keystore audited: zero expired certificates' },

    // --- CYBER / HACKER PERSPECTIVE & MYSTERY SIGNALS ---
    { type: 'sys', tag: 'MAINFRAME', text: 'Mainframe consciousness sync: latency 1.4ms // quantum coherence 99.7%' },
    { type: 'sec', tag: 'ALERT', text: 'Deep packet inspection: malformed protocol header stripped & logged' },
    { type: 'net', tag: 'RF-SCAN', text: 'Software Defined Radio (SDR): 433.92 MHz carrier signal detected' },
    { type: 'det', tag: 'NEURAL-BUS', text: 'Neural processing bus: anomaly score = 0.004 [Status: NOMINAL]' },
    { type: 'sys', tag: 'WATCHDOG', text: 'Watchdog timer reset: heartbeat received from core microservice' },
    { type: 'sec', tag: 'EVASION', text: 'Anti-debugging hook engaged: ptrace denial activated on sandbox' },
    { type: 'net', tag: 'UPLINK', text: 'Satellite downlink telemetry frame synchronized: sector 14-B' },
    { type: 'det', tag: 'FINGERPRINT', text: 'TCP/IP stack OS fingerprinting: client matched authorized workstation' },
    { type: 'sys', tag: 'CACHE', text: 'L3 cache line prefetch calibrated: zero speculative execution leaks' },
    { type: 'sec', tag: 'DEFCON', text: 'Cyber readiness condition set to DEFCON 2: maximum perimeter vigilance' },

    // --- DUAL CYBER (ENGLISH + PERSIAN TECH ACCENTS) ---
    { type: 'sys', tag: 'سایبر', text: 'کانال ارتباطی فوق امن فعال گردید // End-to-End Encryption Armed' },
    { type: 'sec', tag: 'دیواره آتش', text: 'تلاش برای نفوذ به پورت ۸۴۴۳ دفع شد // Inbound Exploit Blocked' },
    { type: 'net', tag: 'پایش پورت', text: 'بررسی درگاه‌های باز: تمامی پورت‌ها در حالت Stealth قرار دارند' },
    { type: 'det', tag: 'رمزنگاری', text: 'کلیدهای نشست کاربری به‌روزرسانی شد // Session Keys Rotated' },
    { type: 'sys', tag: 'هسته سیستم', text: 'پایش بلادرنگ پردازنده: مصرف بهینه، وضعیت امنیتی پایدار' },
    { type: 'sec', tag: 'هشدار امنیتی', text: 'شناسایی و خنثی‌سازی بسته‌های نفوذی فاقد امضای دیجیتال معتبر' },
    { type: 'net', tag: 'ترافیک زنده', text: 'رهگیری بسته داده رمزنگاری‌شده در مسیر سرور مرکزی' },
    { type: 'det', tag: 'آنالیز داده', text: 'تحلیل هگزادسیمال بسته‌های مشکوک تکمیل گردید: بدون خطر' },
    { type: 'sys', tag: 'کوانتوم', text: 'الگوریتم رمزنگاری پساکوانتومی (Kyber-1024) با موفقیت فعال شد' },
    { type: 'sec', tag: 'سپر دفاعی', text: 'دیواره دفاعی چندلایه نکسوس: پایش پیوسته خطوط ارتباطی دستیاران' }
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
