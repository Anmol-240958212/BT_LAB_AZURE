import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ThemeService, ThemeMode } from '../../core/theme.service';

interface ChartTimeframe {
  key: 'day' | 'week' | 'month' | 'year';
  label: string;
  balanceInr: number;
  accruedInr: number;
  balanceJpy: number;
  accruedJpy: number;
  growthPct: string;
  points: string;
  fillPoints: string;
  hoverPoint: { x: number; y: number; label: string };
}

@Component({
  selector: 'app-landing',
  standalone: false,
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit, OnDestroy {
  isScrolled = false;
  mobileMenuOpen = false;
  currency: 'INR' | 'JPY' = 'INR';
  activeNavSection = 'hero';

  // Single Collapsible Theme Switcher State
  currentThemeMode: ThemeMode = 'dark';
  isDark = true;
  themeMenuOpen = false;
  private themeSub?: Subscription;

  // Hero Phone Mockup State
  activeTimeframeKey: 'day' | 'week' | 'month' | 'year' = 'week';
  tfList: ('day' | 'week' | 'month' | 'year')[] = ['day', 'week', 'month', 'year'];
  timeframes: Record<string, ChartTimeframe> = {
    day: {
      key: 'day',
      label: 'Day',
      balanceInr: 1248500,
      accruedInr: 285.50,
      balanceJpy: 2250000,
      accruedJpy: 520,
      growthPct: '+0.12%',
      points: '10,75 55,68 100,72 145,55 190,62 235,45 280,50 325,35 370,42 415,28',
      fillPoints: '10,75 55,68 100,72 145,55 190,62 235,45 280,50 325,35 370,42 415,28 415,95 10,95',
      hoverPoint: { x: 235, y: 45, label: '+₹285.50' }
    },
    week: {
      key: 'week',
      label: 'Week',
      balanceInr: 1248500,
      accruedInr: 1998.50,
      balanceJpy: 9580000,
      accruedJpy: 10300,
      growthPct: '+1.45%',
      points: '10,70 55,58 100,64 145,46 190,52 235,32 280,38 325,22 370,30 415,18',
      fillPoints: '10,70 55,58 100,64 145,46 190,52 235,32 280,38 325,22 370,30 415,18 415,95 10,95',
      hoverPoint: { x: 235, y: 32, label: '¥ 10,300' }
    },
    month: {
      key: 'month',
      label: 'Month',
      balanceInr: 1248500,
      accruedInr: 8560.00,
      balanceJpy: 9710000,
      accruedJpy: 44000,
      growthPct: '+3.40%',
      points: '10,80 55,62 100,50 145,42 190,48 235,26 280,34 325,18 370,24 415,12',
      fillPoints: '10,80 55,62 100,50 145,42 190,48 235,26 280,34 325,18 370,24 415,12 415,95 10,95',
      hoverPoint: { x: 235, y: 26, label: '+₹8,560.00' }
    },
    year: {
      key: 'year',
      label: 'Year',
      balanceInr: 1248500,
      accruedInr: 106122.50,
      balanceJpy: 10370000,
      accruedJpy: 543000,
      growthPct: '+8.50%',
      points: '10,85 55,70 100,55 145,38 190,44 235,20 280,28 325,14 370,18 415,8',
      fillPoints: '10,85 55,70 100,55 145,38 190,44 235,20 280,28 325,14 370,18 415,8 415,95 10,95',
      hoverPoint: { x: 235, y: 20, label: '+8.50% APY' }
    }
  };

  get activeTimeframe(): ChartTimeframe {
    return this.timeframes[this.activeTimeframeKey];
  }

  // Interactive Live Calculator State
  depositAmount: number = 200000;
  tenureMonths: number = 36;
  selectedInterestRate: number = 7.60;
  customerType: 'GENERAL' | 'SENIOR' | 'STAFF' = 'GENERAL';
  schemeType: 'COMPOUND' | 'SIMPLE' = 'COMPOUND';
  rateCapWarning: boolean = false;

  // Solutions showcase active tab
  activeRoleTab: 'PERSONAL' | 'WEALTH' | 'INSTITUTIONAL' = 'PERSONAL';

  // Auth Status
  isLoggedIn: boolean = false;
  userRole: string | null = null;
  displayName: string = '';

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    if (this.isLoggedIn) {
      this.userRole = this.authService.getRole();
      this.displayName = this.authService.getDisplayName();
    }

    this.themeSub = this.themeService.themeMode$.subscribe(mode => {
      this.currentThemeMode = mode;
      this.isDark = this.themeService.isDark;
    });
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 40;
    this.updateActiveNavSection();
  }

  @HostListener('document:click', [])
  onDocumentClick(): void {
    this.themeMenuOpen = false;
  }

  toggleThemeMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.themeMenuOpen = !this.themeMenuOpen;
  }

  selectTheme(mode: ThemeMode): void {
    this.themeService.setTheme(mode);
    this.themeMenuOpen = false;
  }

  toggleThemeQuick(event: MouseEvent): void {
    event.stopPropagation();
    this.themeService.setTheme(this.isDark ? 'light' : 'dark');
  }

  setTimeframe(key: string): void {
    if (key === 'day' || key === 'week' || key === 'month' || key === 'year') {
      this.activeTimeframeKey = key;
    }
  }

  toggleCurrency(): void {
    this.currency = this.currency === 'INR' ? 'JPY' : 'INR';
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  scrollTo(sectionId: string): void {
    this.closeMobileMenu();
    this.activeNavSection = sectionId;
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }


  private updateActiveNavSection(): void {
    const sections = ['hero', 'features', 'calculator', 'rates', 'solutions'];
    const marker = window.scrollY + 140;
    let activeSection = 'hero';

    for (const sectionId of sections) {
      const section = document.getElementById(sectionId);
      if (section && section.offsetTop <= marker) {
        activeSection = sectionId;
      }
    }

    this.activeNavSection = activeSection;
  }

  // Calculator Logic adhering to commercial deposit pricing
  get suggestedInterestRate(): number {
    const months = this.tenureMonths;
    if (months < 3) return 4.50;
    if (months < 6) return 5.25;
    if (months < 12) return 6.00;
    if (months < 24) return 6.80;
    if (months < 36) return 7.25;
    if (months < 60) return 7.60;
    return 7.90;
  }

  get appliedInterestRate(): number {
    let rate = Math.min(8.50, Math.max(0, Number(this.selectedInterestRate) || 0));
    if (this.customerType === 'SENIOR') {
      rate += 0.50; // +50 bps for senior citizens
    } else if (this.customerType === 'STAFF') {
      rate += 0.75; // +75 bps for preferred / corporate clients
    }

    if (rate > 8.50) {
      this.rateCapWarning = true;
      return 8.50;
    }
    this.rateCapWarning = false;
    return Number(rate.toFixed(2));
  }

  setInterestRate(rate: number): void {
    this.selectedInterestRate = Number(Math.min(8.50, Math.max(0, rate)).toFixed(2));
  }

  get maturityAmount(): number {
    const P = this.depositAmount;
    const r = this.appliedInterestRate / 100;
    const t = this.tenureMonths / 12;

    if (this.schemeType === 'SIMPLE') {
      return Math.round(P + P * r * t);
    } else {
      const n = 4;
      const amount = P * Math.pow(1 + r / n, n * t);
      return Math.round(amount);
    }
  }

  get totalInterest(): number {
    return Math.max(0, this.maturityAmount - this.depositAmount);
  }

  get effectiveApy(): number {
    const P = this.depositAmount;
    const t = this.tenureMonths / 12;
    if (P <= 0 || t <= 0) return this.appliedInterestRate;
    const totalGain = this.maturityAmount - P;
    const annualizedGain = (totalGain / P) / t * 100;
    return Number(annualizedGain.toFixed(2));
  }

  setDepositPreset(amount: number): void {
    this.depositAmount = amount;
  }

  setTenurePreset(months: number): void {
    this.tenureMonths = months;
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToCalculator(): void {
    this.router.navigate(['/fixed-deposit/calculator']);
  }
}
