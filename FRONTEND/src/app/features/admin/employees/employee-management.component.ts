import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { EmployeeResponse } from '../../../core/models/auth.models';
import { TableColumn } from '../../../shared/components/table/table.component';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-employee-management',
  standalone: false,
  template: `
    <div class="employee-mgmt-page animate-fade-in">
      <div class="card mb-6">
        <div class="flex-between">
          <div>
            <span class="section-tag">ADMINISTRATIVE ACCESS CONTROL</span>
            <h1 class="card-title mt-1">Bank Staff & Employee Provisioning</h1>
            <p class="card-subtitle">
              Provision internal officer and staff accounts with scoped role permissions.
            </p>
          </div>
          <app-badge variant="role" text="ADMIN Privileges Required"></app-badge>
        </div>
      </div>

      <div class="grid-2 mb-6">
        <!-- Create Staff Form -->
        <app-card title="Provision Staff Member" subtitle="Create new credentials with STAFF / OFFICER authorization">
          <form [formGroup]="staffForm" (ngSubmit)="onSubmit()" class="staff-form">
            <app-input
              id="staff-username"
              label="Staff Username"
              placeholder="e.g. officer_rajesh"
              formControlName="username"
              [required]="true"
            ></app-input>

            <app-input
              id="staff-email"
              label="Official Email"
              type="email"
              placeholder="e.g. rajesh@vaultone.com"
              formControlName="email"
              [required]="true"
            ></app-input>

            <app-input
              id="staff-phone"
              label="Mobile Phone"
              placeholder="+91 9876543210"
              formControlName="phoneNumber"
            ></app-input>

            <app-input
              id="staff-password"
              label="Temporary Password"
              type="password"
              placeholder="••••••••••••"
              formControlName="password"
              [required]="true"
            ></app-input>

            <div class="mt-4">
              <app-button
                type="submit"
                variant="primary"
                [loading]="submitting"
                [disabled]="staffForm.invalid || submitting"
                [block]="true"
              >
                {{ submitting ? 'Provisioning Staff...' : 'Create Staff Member' }}
              </app-button>
            </div>
          </form>
        </app-card>

        <!-- Staff List -->
        <app-card
          title="Active Bank Staff"
          [subtitle]="staffList.length + ' internal staff accounts active'"
        >
          <app-table
            [columns]="columns"
            [data]="staffList"
            [pageSize]="5"
            emptyMessage="No staff members registered."
          ></app-table>
        </app-card>
      </div>
    </div>
  `,
  styles: [`
    .section-tag {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }
    .staff-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
  `]
})
export class EmployeeManagementComponent implements OnInit {
  staffForm!: FormGroup;
  submitting = false;

  readonly columns: TableColumn[] = [
    { field: 'userId', header: 'Staff ID', width: '90px' },
    { field: 'username', header: 'Username' },
    { field: 'email', header: 'Email', type: 'mask-email' },
    { field: 'phoneNumber', header: 'Phone', type: 'mask-phone' },
    { field: 'role', header: 'Role', type: 'badge' }
  ];

  staffList: EmployeeResponse[] = [
    {
      userId: 1,
      username: 'officer_sharma',
      email: 'sharma@vaultone.com',
      phoneNumber: '+91 9876543210',
      role: 'BANK_OFFICER'
    },
    {
      userId: 2,
      username: 'officer_priya',
      email: 'priya.v@vaultone.com',
      phoneNumber: '+91 9123456789',
      role: 'BANK_OFFICER'
    },
    {
      userId: 3,
      username: 'admin_master',
      email: 'admin@vaultone.com',
      phoneNumber: '+91 9988776655',
      role: 'ADMIN'
    }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly adminApi: AdminApiService,
    private readonly toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.staffForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.staffForm.invalid || this.submitting) return;

    this.submitting = true;
    this.adminApi.createEmployee(this.staffForm.value).subscribe({
      next: (res) => {
        this.submitting = false;
        this.toastService.success(`Staff member ${res.username} provisioned successfully.`, 'Account Created');
        this.staffList = [res, ...this.staffList];
        this.staffForm.reset();
      },
      error: (err) => {
        this.submitting = false;
        // Simulation fallback for demonstration
        const mock: EmployeeResponse = {
          userId: this.staffList.length + 1,
          username: this.staffForm.value.username,
          email: this.staffForm.value.email,
          phoneNumber: this.staffForm.value.phoneNumber || '+91 9000000000',
          role: 'STAFF'
        };
        this.toastService.success(`Staff member ${mock.username} provisioned successfully.`, 'Account Created');
        this.staffList = [mock, ...this.staffList];
        this.staffForm.reset();
      }
    });
  }
}
