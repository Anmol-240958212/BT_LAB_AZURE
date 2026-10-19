import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface BankingVideo {
  id: string;
  title: string;
  tag: string;
  desc: string;
}

@Component({
  selector: 'app-auth-layout',
  standalone: false,
  template: `
    <app-toast></app-toast>

    <div class="auth-layout-container">
      <!-- Static VaultOne background shared by every authentication route -->
      <div class="video-background-layer" aria-hidden="true">
        <img src="/assets/login-bg.png" alt="" class="auth-background-image" />

        <!-- Transparent Black Vignette Overlay -->
        <div class="video-ambient-overlay"></div>
      </div>

      <!-- Top Left Back to Home Button -->
      <div class="auth-home-corner">
        <a routerLink="/" class="back-home-btn" id="auth-back-home-btn" title="Return to Home Page">
          <app-icon name="arrow-left" [size]="14"></app-icon>
          <span>Back to Home</span>
        </a>
      </div>

      <!-- Top Corner Theme Switcher -->
      <div class="auth-theme-corner">
        <app-theme-toggle [compact]="false"></app-theme-toggle>
      </div>

      <!-- Main Floating Authentication Card -->
      <div class="auth-card-wrapper animate-fade-in">
        <!-- Brand Header (clickable to home) -->
        <header class="auth-header">
          <a routerLink="/" class="auth-brand-link" title="Return to Home Page">
            <div class="auth-logo-box">
              <img src="/logo.png" alt="vaultOne Logo" class="auth-logo-img" />
            </div>
            <h1 class="auth-brand-title">vaultOne</h1>
            <p class="auth-brand-tagline">Enterprise Core Banking Platform</p>
          </a>
        </header>

        <!-- Routed Content (Login, Register, Password Reset) -->
        <div class="auth-body">
          <router-outlet></router-outlet>
        </div>

        <!-- Card Footer Return to Home link -->
        <div class="auth-card-footer">
          <a routerLink="/" class="card-home-link" id="auth-card-home-link" title="Return to Home Page">
            <app-icon name="home" [size]="13"></app-icon>
            <span>Back to Home Page</span>
          </a>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
    }

    /* Fixed 100vh viewport container — Strictly non-scrollable */
    .auth-layout-container {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      max-height: 100vh;
      background-color: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px 16px 50px 16px;
      overflow: hidden;
      box-sizing: border-box;
      user-select: none;
    }

    /* Fixed Fullscreen Background Video Layer */
    .video-background-layer {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      z-index: 0;
      pointer-events: none;
      background-color: #000000;
    }

    .auth-background-image {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 100vw;
      height: 100vh;
      min-height: 100vh;
      object-fit: cover;
      transform: translate(-50%, -50%);
      pointer-events: none;
      user-select: none;
      filter: brightness(.78) saturate(1.08);
    }

    /* Transparent Black Vignette Overlay: 
       Leaves video vivid and clearly visible while ensuring text contrast */
    .video-ambient-overlay {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.075) 0%, rgba(0, 0, 0, 0.0) 100%);
      pointer-events: none;
    }

    .auth-home-corner {
      position: absolute;
      top: 14px;
      left: 18px;
      z-index: 10;
    }
    .back-home-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      font-size: var(--text-xs);
      font-weight: 500;
      color: #f1f5f9;
      background-color: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: var(--radius-button);
      text-decoration: none;
      transition: all var(--transition-fast);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
    }
    .back-home-btn:hover {
      color: #ffffff;
      background-color: rgba(15, 23, 42, 0.95);
      border-color: rgba(255, 255, 255, 0.35);
      transform: translateX(-2px);
    }
    .auth-theme-corner {
      position: absolute;
      top: 14px;
      right: 18px;
      z-index: 10;
    }

    /* Floating Auth Card: Compact height to guarantee no page overflow */
    .auth-card-wrapper {
      position: relative;
      z-index: 10;
      max-width: 440px;
      width: 100%;
      max-height: calc(100vh - 80px);
      overflow-y: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      background-color: rgba(20, 28, 24, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: var(--radius-card);
      padding: 16px 24px;
      box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      color: #e2e8f0;
      user-select: text;
    }
    .auth-card-wrapper::-webkit-scrollbar {
      display: none;
    }

    :host-context([data-theme="light"]) .auth-card-wrapper {
      background-color: rgba(255, 255, 255, 0.94);
      border: 1px solid rgba(0, 0, 0, 0.12);
      box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.55);
      color: var(--color-text-primary);
    }

    .auth-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--color-border-subtle);
    }
    .auth-brand-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-decoration: none;
      color: inherit;
      cursor: pointer;
    }
    .auth-brand-link:hover .auth-brand-title {
      color: var(--color-accent);
    }
    .auth-logo-box {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-button);
      background-color: #ffffff;
      border: 1px solid var(--color-border-default);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
      padding: 3px;
    }
    .auth-logo-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .auth-brand-title {
      font-size: var(--text-base);
      font-weight: 600;
      color: var(--color-text-primary);
      transition: color var(--transition-fast);
      line-height: 1.2;
    }
    .auth-brand-tagline {
      font-size: 10px;
      color: var(--color-text-muted);
      margin-top: 1px;
    }
    .auth-body {
      margin-bottom: 4px;
    }
    .auth-card-footer {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid var(--color-border-subtle);
      display: flex;
      justify-content: center;
    }
    .card-home-link {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: var(--color-text-muted);
      text-decoration: none;
      transition: all var(--transition-fast);
      padding: 3px 8px;
      border-radius: var(--radius-input);
    }
    .card-home-link:hover {
      color: var(--color-accent);
      background-color: var(--color-bg-hover);
    }

    /* Minimalist Floating Source Attribution & Audio Capsule */
    .rbi-source-pill {
      position: fixed;
      bottom: 14px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 20;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 0, 0, 0.84);
      border: 1px solid rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      padding: 4px 12px;
      border-radius: 9999px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 400;
      letter-spacing: 0.01em;
      transition: all var(--transition-fast);
      white-space: nowrap;
    }
    .rbi-source-pill:hover {
      background: rgba(0, 0, 0, 0.94);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .source-label {
      opacity: 0.88;
      font-size: 11px;
    }

    .source-divider {
      opacity: 0.35;
      font-size: 9px;
    }

    .source-audio-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 9px;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.22);
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .source-audio-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .source-audio-btn.unmuted {
      background: #0d9488;
      border-color: #0d9488;
      color: #ffffff;
      box-shadow: 0 0 10px rgba(13, 148, 136, 0.55);
    }

    @media (max-width: 640px) {
      .auth-layout-container {
        padding: 8px 12px 50px 12px;
      }
      .rbi-source-pill {
        bottom: 10px;
        font-size: 10px;
        padding: 3px 10px;
      }
    }
  `]
})
export class AuthLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('videoIframe') videoIframe?: ElementRef<HTMLIFrameElement>;

  readonly videos: BankingVideo[] = [
    {
      id: '7p1oYLIp890',
      title: 'RBI Guidelines: Unclaimed Deposits (DEA Fund)',
      tag: 'Deposit Safety',
      desc: 'Reserve Bank of India awareness on recovering dormant bank deposits through the UDGAM portal.'
    },
    {
      id: 'PWfOqq6wY44',
      title: 'RBI Kehta Hai: Never Share OTP, PIN or Passwords',
      tag: 'Cyber Hygiene',
      desc: 'Official advisory warning customers to keep their confidential banking credentials secure.'
    },
    {
      id: '-gjxm8Cqx_s',
      title: 'RBI Kehta Hai: Beware of Fraudulent Schemes & Links',
      tag: 'Fraud Alert',
      desc: 'Guidance against unsolicited links, lottery scams, and unofficial APK downloads.'
    }
  ];

  isPaused = false;
  isMuted = true;
  safeVideoUrl!: SafeResourceUrl;

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.buildSafeVideoUrl();
  }

  ngOnDestroy(): void {}

  private buildSafeVideoUrl(): void {
    const playlistIds = this.videos.map(v => v.id).join(',');
    const initialId = this.videos[0].id;
    // URL with autoplay, muted start, 3-video playlist loop, and JS API enabled
    const rawUrl = `https://www.youtube-nocookie.com/embed/${initialId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${playlistIds}&enablejsapi=1&playsinline=1&modestbranding=1&rel=0`;
    this.safeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
  }

  onIframeLoad(): void {
    this.sendCommand('listening', []);
  }

  toggleAudio(): void {
    this.isMuted = !this.isMuted;
    this.sendCommand(this.isMuted ? 'mute' : 'unMute', []);
    this.cdr.detectChanges();
  }

  togglePause(): void {
    this.isPaused = !this.isPaused;
    this.sendCommand(this.isPaused ? 'pauseVideo' : 'playVideo', []);
    this.cdr.detectChanges();
  }

  getPauseIcon(): string {
    return this.isPaused ? 'play' : 'pause';
  }

  getPlayPauseText(): string {
    return this.isPaused ? 'Play' : 'Pause';
  }

  private sendCommand(func: string, args: any[] = []): void {
    const iframe = this.videoIframe?.nativeElement || (document.getElementById('rbi-bg-video') as HTMLIFrameElement);
    if (!iframe || !iframe.contentWindow) return;

    if (func === 'listening') {
      iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
    } else {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    }
  }
}
