import { ChangeDetectorRef, Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: false,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="form-group" [class.has-error]="!!error">
      <label *ngIf="label" [attr.for]="id" class="form-label">
        {{ label }}
        <span *ngIf="required" class="required-star">*</span>
      </label>

      <div class="input-wrapper">
        <input
          [id]="id"
          [name]="name || id"
          [type]="type"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [readOnly]="readonly"
          [required]="required"
          [min]="min"
          [value]="value"
          [class.is-invalid]="!!error"
          class="form-input"
          (input)="onInput($event)"
          (blur)="onBlur()"
          (focus)="onFocus()"
        />
      </div>

      <div *ngIf="error" class="form-error" [id]="id + '-error'" role="alert">
        {{ error }}
      </div>

      <div *ngIf="hint && !error" class="form-hint" [id]="id + '-hint'">
        {{ hint }}
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .required-star {
      color: var(--color-error);
      margin-left: 2px;
    }
    .input-wrapper {
      position: relative;
      width: 100%;
    }
  `]
})
export class AppInputComponent implements ControlValueAccessor {
  constructor(private readonly cdr: ChangeDetectorRef) {}

  @Input() id = 'input-' + Math.random().toString(36).substring(2, 9);
  @Input() name = '';
  @Input() label = '';
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() required = false;
  @Input() min: number | string | null = null;
  @Input() error: string | null = null;
  @Input() hint: string | null = null;

  @Input() value: string | number = '';

  onChange: (val: any) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: any): void {
    this.value = value ?? '';
    this.cdr.markForCheck();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  onBlur(): void {
    this.onTouched();
  }

  onFocus(): void {}
}
