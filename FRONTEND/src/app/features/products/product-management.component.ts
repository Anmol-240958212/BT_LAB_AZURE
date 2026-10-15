import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ProductPricingApiService } from '../../core/api/product-pricing-api.service';
import { CategoryRate, ProductRecord, ProductStatus } from '../../core/models/product.models';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-product-management',
  standalone: false,
  template: `
    <div class="product-page animate-fade-in">
      <header class="page-heading">
        <div>
          <span class="section-tag">PRODUCT & PRICING</span>
          <h1 class="card-title">Product catalogue</h1>
          <p class="card-subtitle">Maintain bank products, rate limits, and customer-category bonuses.</p>
        </div>
        <button class="primary-button" type="button" (click)="startCreate()">Add product</button>
      </header>

      <div *ngIf="pageError" class="error-banner" role="alert">{{ pageError }}</div>

      <section class="toolbar card">
        <label>Type
          <select [(ngModel)]="productTypeFilter" name="productTypeFilter" (change)="loadProducts(0)">
          <option value="">All types</option><option value="FD">Fixed deposit</option><option value="RD">Recurring deposit</option><option value="SB">Savings</option><option value="CA">Current account</option>
          </select>
        </label>
        <label>Status
          <select [(ngModel)]="statusFilter" name="statusFilter" (change)="loadProducts(0)">
            <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <button class="secondary-button" type="button" (click)="loadProducts(0)" [disabled]="loading">Refresh</button>
        <span class="toolbar-count">{{ totalElements }} product{{ totalElements === 1 ? '' : 's' }}</span>
      </section>

      <div class="content-grid">
        <section class="card catalogue-card">
          <div class="section-header"><h2>Products</h2><span *ngIf="loading">Loading…</span></div>
          <div *ngIf="!loading && products.length === 0" class="empty-state">No products match these filters.</div>
          <button *ngFor="let product of products" type="button" class="product-row"
                  [class.selected]="selected?.productCode === product.productCode" (click)="selectProduct(product)">
            <span class="product-row-main">
              <strong>{{ product.productName }}</strong><small>{{ product.productCode }} · {{ product.productTypeName || product.productType }}</small>
            </span>
            <span class="product-row-meta">
              <b>{{ product.baseRate == null ? 'Tiered' : (product.baseRate | number:'1.2-2') + '%' }}</b>
              <span class="status-pill" [class.inactive]="product.status !== 'ACTIVE'">{{ product.status }}</span>
            </span>
          </button>
          <footer class="pager" *ngIf="totalPages > 1">
            <button type="button" class="secondary-button" (click)="loadProducts(page - 1)" [disabled]="page <= 0 || loading">Previous</button>
            <span>Page {{ page + 1 }} of {{ totalPages }}</span>
            <button type="button" class="secondary-button" (click)="loadProducts(page + 1)" [disabled]="page + 1 >= totalPages || loading">Next</button>
          </footer>
        </section>

        <section class="card editor-card">
          <ng-container *ngIf="editorMode === 'create'; else selectedProductPanel">
            <div class="section-header"><div><h2>New product</h2><p>Product code and type become permanent after creation.</p></div>
              <button class="text-button" type="button" (click)="editorMode = 'view'">Close</button></div>
            <form [formGroup]="createForm" (ngSubmit)="createProduct()" class="editor-form">
              <div class="form-grid">
                <label>Product code<input formControlName="productCode" placeholder="FD001" maxlength="30" /></label>
                <label>Product type<select formControlName="productType"><option value="FD">Fixed deposit</option><option value="RD">Recurring deposit</option><option value="SB">Savings account</option><option value="CA">Current account</option></select></label>
                <label class="wide">Product name<input formControlName="productName" placeholder="Fixed Deposit - Short Term" maxlength="100" /></label>
                <label>Currency<input formControlName="currency" maxlength="3" /></label>
                <label>Effective from<input type="date" formControlName="effectiveDate" /></label>
                <label class="wide">Description<input formControlName="description" maxlength="255" /></label>
                <label>Minimum term (months)<input type="number" min="1" formControlName="termMin" /></label>
                <label>Maximum term (months)<input type="number" min="1" formControlName="termMax" /></label>
                <label>Minimum rate (%)<input type="number" min="0" max="100" step="0.01" formControlName="rateMin" /></label>
                <label>Maximum rate (%)<input type="number" min="0" max="100" step="0.01" formControlName="rateMax" /></label>
                <label>Base rate (%)<input type="number" min="0" max="100" step="0.01" formControlName="baseRate" /></label>
                <label>Maximum category add-on (%)<input type="number" min="0" max="100" step="0.01" formControlName="maxAdditionalPercent" /></label>
                <label>Interest calculation
                  <select formControlName="rateType"><option value="COMPOUND">Compound</option><option value="SIMPLE">Simple</option></select>
                </label>
                <label>Compounding frequency
                  <select formControlName="frequency"><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="HALF_YEARLY">Half-yearly</option><option value="ANNUALLY">Annually</option></select>
                </label>
              </div>
              <div class="matrix-config">
                <label class="matrix-toggle"><input type="checkbox" formControlName="chargeEnabled" /> Attach a product charge</label>
                <div *ngIf="createForm.get('chargeEnabled')?.value" class="charge-row">
                  <label>Charge code<select formControlName="chargeCode"><option value="TDS">TDS</option><option value="PREMAT_WD_FEE">Premature withdrawal fee</option><option value="PREMAT_PENALTY">Premature withdrawal penalty</option><option value="PROCESSING_FEE">Processing fee</option><option value="INT_CREDIT">Interest credit</option></select></label>
                  <label>Calculation<select formControlName="chargeCalculationType"><option value="PERCENTAGE">Percentage</option><option value="FLAT">Fixed amount</option></select></label>
                  <label *ngIf="createForm.get('chargeCalculationType')?.value === 'PERCENTAGE'">Percent<input type="number" min="0" max="100" step="0.01" formControlName="chargePercentage" /></label>
                  <label *ngIf="createForm.get('chargeCalculationType')?.value === 'FLAT'">Amount<input type="number" min="0" step="0.01" formControlName="chargeAmount" /></label>
                  <label>Frequency<select formControlName="chargeFrequency"><option value="ONE_TIME">One time</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="AT_MATURITY">At maturity</option></select></label>
                </div>
              </div>
              <div class="matrix-config">
                <label class="matrix-toggle"><input type="checkbox" formControlName="rateMatrixEnabled" /> Add amount and term based rate tiers</label>
                <div *ngIf="createForm.get('rateMatrixEnabled')?.value" class="matrix-rows">
                  <p class="field-note">A base rate or at least one tier is required. The base rate remains the fallback when no tier matches.</p>
                  <div *ngFor="let row of rateMatrixGroups; let i = index" class="matrix-row" [formGroup]="row">
                    <label>Minimum amount<input type="number" min="0" formControlName="minAmount" /></label>
                    <label>Maximum amount<input type="number" min="0" formControlName="maxAmount" /></label>
                    <label>From term<input type="number" min="1" formControlName="durationFrom" /></label>
                    <label>To term<input type="number" min="1" formControlName="durationTo" /></label>
                    <label>Term unit<select formControlName="durationUnit"><option value="MONTHS">Months</option><option value="DAYS">Days</option><option value="YEARS">Years</option></select></label>
                    <label>Tier rate (%)<input type="number" min="0" max="100" step="0.01" formControlName="rate" /></label>
                    <label>Effective from<input type="date" formControlName="effectiveFrom" /></label>
                    <label>Effective to<input type="date" formControlName="effectiveTo" /></label>
                    <button class="text-button remove-tier" type="button" (click)="removeRateMatrixRow(i)">Remove tier</button>
                  </div>
                  <button class="secondary-button" type="button" (click)="addRateMatrixRow()">Add rate tier</button>
                </div>
              </div>
              <div class="form-actions"><button class="primary-button" type="submit" [disabled]="createForm.invalid || saving">{{ saving ? 'Saving…' : 'Create product' }}</button></div>
            </form>
          </ng-container>

          <ng-template #selectedProductPanel>
            <ng-container *ngIf="selected; else selectPrompt">
              <div class="section-header"><div><h2>{{ selected.productName }}</h2><p>{{ selected.productCode }} · {{ selected.productTypeName || selected.productType }}</p></div>
                <button class="secondary-button" type="button" (click)="beginEdit()" [disabled]="editorMode === 'edit'">Edit product</button></div>
              <div *ngIf="editorMode === 'edit'" class="edit-panel">
                <form [formGroup]="editForm" (ngSubmit)="saveProduct()" class="editor-form">
                  <div class="form-grid">
                    <label class="wide">Name<input formControlName="productName" maxlength="100" /></label>
                    <label class="wide">Description<input formControlName="description" maxlength="255" /></label>
                    <label>Status<select formControlName="status"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
                    <label>Effective from<input type="date" formControlName="effectiveDate" /></label>
                    <label>Minimum term<input type="number" min="1" formControlName="termMin" /></label>
                    <label>Maximum term<input type="number" min="1" formControlName="termMax" /></label>
                    <label>Minimum rate (%)<input type="number" min="0" max="100" step="0.01" formControlName="rateMin" /></label>
                    <label>Maximum rate (%)<input type="number" min="0" max="100" step="0.01" formControlName="rateMax" /></label>
                    <label>Base rate (%)<input type="number" min="0" max="100" step="0.01" formControlName="baseRate" /></label>
                    <label>Maximum add-on (%)<input type="number" min="0" max="100" step="0.01" formControlName="maxAdditionalPercent" /></label>
                  </div>
                  <div class="form-actions"><button class="secondary-button" type="button" (click)="editorMode = 'view'">Cancel</button><button class="primary-button" type="submit" [disabled]="editForm.invalid || saving">{{ saving ? 'Saving…' : 'Save changes' }}</button></div>
                </form>
              </div>

              <div class="detail-grid">
                <div><small>Status</small><strong>{{ selected.status }}</strong></div>
                <div><small>Base rate</small><strong>{{ selected.baseRate == null ? 'Rate matrix' : (selected.baseRate | number:'1.2-2') + '%' }}</strong></div>
                <div><small>Rate range</small><strong>{{ selected.rateLimit.min }}% – {{ selected.rateLimit.max }}%</strong></div>
                <div><small>Term range</small><strong>{{ selected.termLimit.min }} – {{ selected.termLimit.max }} months</strong></div>
              </div>

              <section class="category-panel">
                <div class="section-header"><div><h3>Category rate adjustments</h3><p>These are used by live FD quotes.</p></div></div>
                <div *ngIf="categoryRatesLoading" class="empty-state">Loading category rates…</div>
                <div *ngIf="!categoryRatesLoading && categoryRates.length === 0" class="empty-state">No active category adjustments.</div>
                <div *ngFor="let rate of categoryRates" class="category-row">
                  <span><strong>{{ rate.displayName }}</strong><small>{{ rate.categoryCode }}<ng-container *ngIf="rate.minAge != null"> · age {{ rate.minAge }}+</ng-container><ng-container *ngIf="rate.gender"> · {{ rate.gender }}</ng-container></small></span>
                  <b>+{{ rate.adjustmentPercent | number:'1.2-2' }}%</b>
                </div>
                <form [formGroup]="categoryForm" (ngSubmit)="addCategoryRate()" class="category-form">
                  <label>Category code<input formControlName="categoryCode" placeholder="SENIOR_CITIZEN" maxlength="30" /></label>
                  <label>Display name<input formControlName="displayName" placeholder="Senior citizen" maxlength="100" /></label>
                  <label>Adjustment (%)<input type="number" min="0" max="100" step="0.01" formControlName="adjustmentPercent" /></label>
                  <label>Minimum age<input type="number" min="0" max="130" formControlName="minAge" /></label>
                  <label>Maximum age<input type="number" min="0" max="130" formControlName="maxAge" /></label>
                  <label>Gender<select formControlName="gender"><option value="">Any</option><option value="F">Female</option><option value="M">Male</option><option value="X">Other</option></select></label>
                  <label>Effective from<input type="date" formControlName="effectiveFrom" /></label>
                  <button class="primary-button" type="submit" [disabled]="categoryForm.invalid || saving">Add adjustment</button>
                </form>
              </section>
            </ng-container>
            <ng-template #selectPrompt><div class="empty-state large">Choose a product to view its terms, or add a product.</div></ng-template>
          </ng-template>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .product-page { display:flex; flex-direction:column; gap:var(--space-5); }
    .page-heading,.section-header,.form-actions,.pager { display:flex; align-items:center; justify-content:space-between; gap:var(--space-3); }
    .page-heading h1,.section-header h2,.section-header h3 { margin:.2rem 0; color:var(--color-text-primary); }
    .section-header p,.page-heading p { margin:.2rem 0 0; color:var(--color-text-muted); font-size:var(--text-sm); }
    .section-tag { color:var(--color-text-muted); font-size:10px; font-weight:700; letter-spacing:.08em; }
    .card { background:var(--color-bg-surface); border:1px solid var(--color-border-subtle); border-radius:var(--radius-card); padding:var(--space-5); }
    .toolbar { display:flex; align-items:end; gap:var(--space-4); flex-wrap:wrap; }
    label { display:flex; flex-direction:column; gap:6px; color:var(--color-text-secondary); font-size:var(--text-xs); font-weight:600; }
    input,select { min-height:38px; width:100%; border:1px solid var(--color-border-default); border-radius:var(--radius-input); background:var(--color-bg-base); color:var(--color-text-primary); padding:8px 10px; font:inherit; }
    .toolbar label { min-width:150px; }
    .toolbar-count { margin-left:auto; padding-bottom:9px; color:var(--color-text-muted); font-size:var(--text-sm); }
    .content-grid { display:grid; grid-template-columns:minmax(280px,.75fr) minmax(0,1.6fr); gap:var(--space-5); align-items:start; }
    .catalogue-card,.editor-card { min-width:0; }
    .product-row { width:100%; border:0; border-top:1px solid var(--color-border-subtle); background:transparent; color:var(--color-text-primary); padding:14px 6px; text-align:left; display:flex; align-items:center; justify-content:space-between; gap:12px; cursor:pointer; }
    .product-row.selected { background:var(--color-bg-elevated); }
    .product-row-main,.product-row-meta,.category-row span { display:flex; flex-direction:column; gap:5px; }
    .product-row small,.category-row small { color:var(--color-text-muted); }
    .product-row-meta { align-items:flex-end; white-space:nowrap; }
    .status-pill { border-radius:99px; padding:3px 8px; color:#16734c; background:rgba(22,115,76,.12); font-size:10px; font-weight:700; }
    .status-pill.inactive { color:#9b4b18; background:rgba(155,75,24,.12); }
    .primary-button,.secondary-button,.text-button { min-height:36px; border-radius:var(--radius-button); padding:8px 13px; font:inherit; font-size:var(--text-sm); font-weight:600; cursor:pointer; }
    .primary-button { background:var(--color-accent); color:#fff; border:1px solid var(--color-accent); }
    .secondary-button { background:var(--color-bg-elevated); color:var(--color-text-primary); border:1px solid var(--color-border-default); }
    .text-button { color:var(--color-text-secondary); border:0; background:transparent; }
    button:disabled { opacity:.55; cursor:not-allowed; }
    .editor-form { margin-top:var(--space-4); }
    .form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:var(--space-3); }
    .wide { grid-column:1/-1; }
    .form-actions { justify-content:flex-end; margin-top:var(--space-4); }
    .detail-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:var(--space-3); margin:var(--space-5) 0; }
    .detail-grid div { display:flex; flex-direction:column; gap:5px; padding:12px; border-radius:var(--radius-input); background:var(--color-bg-elevated); }
    .detail-grid small { color:var(--color-text-muted); }
    .category-panel { border-top:1px solid var(--color-border-subtle); padding-top:var(--space-4); }
    .category-row { display:flex; justify-content:space-between; align-items:center; gap:var(--space-3); padding:10px 3px; border-bottom:1px solid var(--color-border-subtle); }
    .category-form { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:var(--space-3); align-items:end; margin-top:var(--space-4); }
    .matrix-config { margin-top:var(--space-4); padding:var(--space-3); border:1px solid var(--color-border-subtle); border-radius:var(--radius-input); }
    .matrix-toggle { flex-direction:row; align-items:center; }
    .matrix-toggle input { width:auto; min-height:auto; }
    .matrix-rows { margin-top:var(--space-3); }
    .charge-row { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:var(--space-3); margin-top:var(--space-3); }
    .matrix-row { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:var(--space-3); align-items:end; margin:var(--space-3) 0; padding:var(--space-3); background:var(--color-bg-elevated); border-radius:var(--radius-input); }
    .field-note { color:var(--color-text-muted); font-size:var(--text-xs); }
    .remove-tier { grid-column:1/-1; justify-self:end; }
    .empty-state { color:var(--color-text-muted); padding:18px 4px; font-size:var(--text-sm); }
    .empty-state.large { padding:60px 10px; text-align:center; }
    .pager { margin-top:var(--space-3); color:var(--color-text-muted); font-size:var(--text-sm); }
    .error-banner { border:1px solid #d97a7a; background:rgba(217,122,122,.12); color:var(--color-text-primary); border-radius:var(--radius-input); padding:12px 15px; }
    @media (max-width:900px) { .content-grid { grid-template-columns:1fr; } .detail-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @media (max-width:600px) { .form-grid,.category-form { grid-template-columns:1fr; } .wide { grid-column:auto; } .toolbar-count { margin-left:0; } .page-heading { align-items:flex-start; } }
  `]
})
export class ProductManagementComponent implements OnInit {
  products: ProductRecord[] = [];
  selected: ProductRecord | null = null;
  categoryRates: CategoryRate[] = [];
  productTypeFilter = '';
  statusFilter: ProductStatus | '' = 'ACTIVE';
  page = 0;
  totalPages = 0;
  totalElements = 0;
  loading = false;
  saving = false;
  categoryRatesLoading = false;
  pageError = '';
  editorMode: 'view' | 'create' | 'edit' = 'view';
  readonly today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  readonly createForm: FormGroup;
  readonly editForm: FormGroup;
  readonly categoryForm: FormGroup;
  readonly rateMatrixRows: FormArray;

  get rateMatrixGroups(): FormGroup[] { return this.rateMatrixRows.controls as FormGroup[]; }

  constructor(private readonly fb: FormBuilder, private readonly api: ProductPricingApiService,
              private readonly toast: ToastService) {
    this.createForm = this.fb.group({
    productCode: ['', [Validators.required, Validators.maxLength(30), Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
    productName: ['', [Validators.required, Validators.maxLength(100)]],
    productType: ['FD', [Validators.required, Validators.maxLength(30)]],
    currency: ['INR', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    description: [''], effectiveDate: [this.today, Validators.required],
    termMin: [1, [Validators.required, Validators.min(1)]], termMax: [60, [Validators.required, Validators.min(1)]],
    rateMin: [1, [Validators.required, Validators.min(0), Validators.max(100)]],
    rateMax: [8.5, [Validators.required, Validators.min(0), Validators.max(100)]],
    baseRate: [7.1, [Validators.min(0), Validators.max(100)]],
    maxAdditionalPercent: [2, [Validators.required, Validators.min(0), Validators.max(100)]],
    rateType: ['COMPOUND', Validators.required], frequency: ['QUARTERLY', Validators.required], rateMatrixEnabled: [false],
    chargeEnabled: [false], chargeCode: ['TDS'], chargeCalculationType: ['PERCENTAGE'],
    chargeAmount: [200, [Validators.min(0)]], chargePercentage: [10, [Validators.min(0), Validators.max(100)]], chargeFrequency: ['AT_MATURITY']
    });
    this.rateMatrixRows = this.fb.array([]);
    this.editForm = this.fb.group({
    productName: ['', [Validators.required, Validators.maxLength(100)]], description: [''],
    status: ['ACTIVE' as ProductStatus, Validators.required], effectiveDate: [this.today, Validators.required],
    termMin: [1, [Validators.required, Validators.min(1)]], termMax: [60, [Validators.required, Validators.min(1)]],
    rateMin: [1, [Validators.required, Validators.min(0), Validators.max(100)]],
    rateMax: [8.5, [Validators.required, Validators.min(0), Validators.max(100)]],
    baseRate: [null as number | null, [Validators.min(0), Validators.max(100)]],
    maxAdditionalPercent: [2, [Validators.required, Validators.min(0), Validators.max(100)]]
    });
    this.categoryForm = this.fb.group({
    categoryCode: ['', [Validators.required, Validators.maxLength(30), Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
    displayName: ['', [Validators.required, Validators.maxLength(100)]],
    adjustmentPercent: [0.5, [Validators.required, Validators.min(0), Validators.max(100)]],
    minAge: [null as number | null], maxAge: [null as number | null], gender: [''], effectiveFrom: [this.today, Validators.required]
    });
  }

  ngOnInit(): void { this.loadProducts(); }

  loadProducts(page = this.page): void {
    this.loading = true;
    this.pageError = '';
    this.api.search({ productType: this.productTypeFilter || undefined,
      status: this.statusFilter || undefined, page, size: 20 }).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: response => {
        this.products = response.content || [];
        this.page = response.page;
        this.totalPages = response.totalPages;
        this.totalElements = response.totalElements;
        if (this.selected) {
          this.selected = this.products.find(item => item.productCode === this.selected?.productCode) || null;
        }
        if (!this.selected && this.products.length && this.editorMode === 'view') this.selectProduct(this.products[0]);
        if (this.selected) this.loadCategoryRates(this.selected.productCode);
      },
      error: err => this.pageError = this.errorText(err, 'Could not load products. Check that Product Pricing is running.')
    });
  }

  selectProduct(product: ProductRecord): void {
    this.selected = product;
    this.editorMode = 'view';
    this.loadCategoryRates(product.productCode);
  }

  loadCategoryRates(productCode: string): void {
    this.categoryRatesLoading = true;
    this.api.getCategoryRates(productCode).pipe(finalize(() => this.categoryRatesLoading = false)).subscribe({
      next: rates => this.categoryRates = rates,
      error: err => {
        this.categoryRates = [];
        this.pageError = this.errorText(err, 'Could not load category rates.');
      }
    });
  }

  startCreate(): void {
    this.editorMode = 'create';
    this.selected = null;
    this.categoryRates = [];
    this.createForm.reset({ productCode: '', productName: '', productType: 'FD', currency: 'INR',
      description: '', effectiveDate: this.today, termMin: 1, termMax: 60, rateMin: 1, rateMax: 8.5,
      baseRate: 7.1, maxAdditionalPercent: 2, rateType: 'COMPOUND', frequency: 'QUARTERLY', rateMatrixEnabled: false,
      chargeEnabled: false, chargeCode: 'TDS', chargeCalculationType: 'PERCENTAGE', chargeAmount: 200, chargePercentage: 10, chargeFrequency: 'AT_MATURITY' });
    this.rateMatrixRows.clear();
  }

  addRateMatrixRow(): void {
    this.rateMatrixRows.push(this.fb.group({
      minAmount: [1000, [Validators.required, Validators.min(0)]], maxAmount: [100000, [Validators.required, Validators.min(0)]],
      durationFrom: [1, [Validators.required, Validators.min(1)]], durationTo: [12, [Validators.required, Validators.min(1)]],
      durationUnit: ['MONTHS', Validators.required], rate: [7.1, [Validators.required, Validators.min(0), Validators.max(100)]],
      effectiveFrom: [this.today, Validators.required], effectiveTo: ['']
    }));
  }

  removeRateMatrixRow(index: number): void { this.rateMatrixRows.removeAt(index); }

  createProduct(): void {
    if (this.createForm.invalid || this.saving) { this.createForm.markAllAsTouched(); return; }
    const value = this.createForm.getRawValue();
    const hasBaseRate = value.baseRate !== '' && value.baseRate != null;
    const useRateMatrix = !!value.rateMatrixEnabled;
    if (!hasBaseRate && (!useRateMatrix || this.rateMatrixRows.length === 0)) {
      this.pageError = 'Provide a base rate or add at least one rate tier.';
      return;
    }
    if (value.chargeEnabled && value.chargeCalculationType === 'FLAT' && (value.chargeAmount == null || Number(value.chargeAmount) < 0)) {
      this.pageError = 'Enter a non-negative fixed charge amount.';
      return;
    }
    if (value.chargeEnabled && value.chargeCalculationType === 'PERCENTAGE'
        && (value.chargePercentage == null || Number(value.chargePercentage) < 0 || Number(value.chargePercentage) > 100)) {
      this.pageError = 'Enter a charge percentage between 0 and 100.';
      return;
    }
    if (useRateMatrix && (this.rateMatrixRows.length === 0 || this.rateMatrixRows.invalid)) {
      this.pageError = 'Complete at least one valid rate tier, or turn off tiered rates.';
      return;
    }
    this.saving = true;
    this.api.create({
      productCode: String(value.productCode).trim().toUpperCase(), productName: String(value.productName).trim(),
      productType: String(value.productType).trim().toUpperCase(), currency: String(value.currency).trim().toUpperCase(),
      description: value.description || undefined, effectiveDate: value.effectiveDate!,
      termLimit: { min: Number(value.termMin), max: Number(value.termMax) },
      rateLimit: { min: Number(value.rateMin), max: Number(value.rateMax) },
      baseRate: hasBaseRate ? Number(value.baseRate) : undefined,
      maxAdditionalPercent: Number(value.maxAdditionalPercent), rateType: value.rateType as 'SIMPLE' | 'COMPOUND',
      frequency: value.frequency!, allowedCustomerRoles: ['OWNER', 'CO_OWNER', 'NOMINEE'],
      transactionTypes: ['DEPOSIT', 'WITHDRAWAL', 'RENEWAL'],
      charges: value.chargeEnabled ? [{
        chargeCode: value.chargeCode!, calculationType: value.chargeCalculationType!,
        amount: value.chargeCalculationType === 'FLAT' ? Number(value.chargeAmount) : undefined,
        percentage: value.chargeCalculationType === 'PERCENTAGE' ? Number(value.chargePercentage) : undefined,
        currencyCode: 'INR', frequency: value.chargeFrequency!
      }] : [],
      rateMatrix: useRateMatrix ? this.rateMatrixRows.getRawValue().map((row: any) => ({
        ...row, minAmount: Number(row.minAmount), maxAmount: Number(row.maxAmount),
        durationFrom: Number(row.durationFrom), durationTo: Number(row.durationTo), rate: Number(row.rate),
        effectiveTo: row.effectiveTo || undefined
      })) : []
    }).pipe(finalize(() => this.saving = false)).subscribe({
      next: created => {
        this.toast.success(`Product ${created.productCode} created.`, 'Product saved');
        this.editorMode = 'view'; this.selected = created; this.statusFilter = 'ACTIVE';
        this.loadProducts(0);
      },
      error: err => this.pageError = this.errorText(err, 'Could not create product.')
    });
  }

  beginEdit(): void {
    if (!this.selected) return;
    this.editForm.reset({
      productName: this.selected.productName, description: this.selected.description || '', status: this.selected.status,
      effectiveDate: this.selected.effectiveDate, termMin: this.selected.termLimit.min, termMax: this.selected.termLimit.max,
      rateMin: this.selected.rateLimit.min, rateMax: this.selected.rateLimit.max,
      baseRate: this.selected.baseRate ?? null, maxAdditionalPercent: this.selected.maxAdditionalPercent ?? 0
    });
    this.editorMode = 'edit';
  }

  saveProduct(): void {
    if (!this.selected || this.editForm.invalid || this.saving) { this.editForm.markAllAsTouched(); return; }
    const productCode = this.selected.productCode;
    const value = this.editForm.getRawValue();
    this.saving = true;
    this.api.update(productCode, {
      productName: String(value.productName).trim(), description: value.description || '', status: value.status!,
      effectiveDate: value.effectiveDate!, termLimit: { min: Number(value.termMin), max: Number(value.termMax) },
      rateLimit: { min: Number(value.rateMin), max: Number(value.rateMax) },
      baseRate: value.baseRate == null || value.baseRate === '' ? undefined : Number(value.baseRate),
      maxAdditionalPercent: Number(value.maxAdditionalPercent)
    }).pipe(finalize(() => this.saving = false)).subscribe({
      next: updated => {
        this.selected = updated; this.editorMode = 'view'; this.toast.success(`Product ${productCode} updated.`, 'Changes saved');
        this.loadProducts(this.page);
      },
      error: err => this.pageError = this.errorText(err, 'Could not update product.')
    });
  }

  addCategoryRate(): void {
    if (!this.selected || this.categoryForm.invalid || this.saving) { this.categoryForm.markAllAsTouched(); return; }
    const value = this.categoryForm.getRawValue();
    this.saving = true;
    this.api.addCategoryRate(this.selected.productCode, {
      categoryCode: String(value.categoryCode).trim().toUpperCase(), displayName: String(value.displayName).trim(),
        adjustmentPercent: Number(value.adjustmentPercent), minAge: value.minAge == null ? null : Number(value.minAge),
        maxAge: value.maxAge == null ? null : Number(value.maxAge),
      gender: value.gender ? value.gender as 'M' | 'F' | 'X' : null, effectiveFrom: value.effectiveFrom!
    }).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => {
        this.toast.success('Category adjustment added.', 'Pricing updated');
        this.categoryForm.reset({ categoryCode: '', displayName: '', adjustmentPercent: 0.5, minAge: null, maxAge: null, gender: '', effectiveFrom: this.today });
        this.loadCategoryRates(this.selected!.productCode);
      },
      error: err => this.pageError = this.errorText(err, 'Could not add category adjustment.')
    });
  }

  private errorText(err: any, fallback: string): string {
    const body = err?.error;
    if (body?.validationErrors && typeof body.validationErrors === 'object') {
      return Object.values(body.validationErrors).map(value => String(value)).join(' · ');
    }
    return body?.message || body?.detail || fallback;
  }
}
