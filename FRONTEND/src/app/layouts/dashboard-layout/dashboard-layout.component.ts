import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-layout',
  standalone: false,
  template: `
    <!-- Global Toast Notification Center -->
    <app-toast></app-toast>

    <div class="app-shell">
      <!-- Fixed Left Sidebar with Role-Based Navigation -->
      <app-sidebar></app-sidebar>

      <!-- Main Scrollable Content Area -->
      <div class="main-content">
        <!-- Sticky Top Navigation Bar -->
        <app-topbar></app-topbar>

        <!-- Routed Page View -->
        <main class="page-container animate-fade-in" id="main-content-viewport">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background-color: var(--color-bg-base);
    }
  `]
})
export class DashboardLayoutComponent {}
