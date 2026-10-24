import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy } from '@angular/core';
import { TranslocoService, Translation } from '@jsverse/transloco';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[translocoAuto]',
  standalone: false
})
export class TranslocoAutoDirective implements AfterViewInit, OnDestroy {
  private readonly textKeys = new WeakMap<Text, string>();
  private readonly attributeKeys = new WeakMap<Element, Map<string, string>>();
  private readonly subscriptions = new Subscription();
  private observer?: MutationObserver;
  private translating = false;
  private englishKeys = new Map<string, string>();
  private englishValues = new Map<string, string>();
  private activeValues = new Map<string, string>();
  private activeKeys = new Map<string, string>();

  constructor(
    private readonly element: ElementRef<HTMLElement>,
    private readonly transloco: TranslocoService,
    private readonly zone: NgZone
  ) {}

  ngAfterViewInit(): void {
    this.subscriptions.add(this.transloco.langChanges$.subscribe(lang => {
      this.loadCatalogs(lang);
    }));
    this.loadCatalogs(this.transloco.getActiveLang());
    this.observer = new MutationObserver(() => {
      if (!this.translating) this.translateTree();
    });
    // Angular adds/removes view nodes as routes change. Language changes are
    // handled by langChanges$ above; observing characterData would observe our
    // own text replacements and can create a mutation loop.
    this.observer.observe(this.element.nativeElement, { childList: true, subtree: true });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.subscriptions.unsubscribe();
  }

  private loadCatalogs(activeLang: string): void {
    this.zone.runOutsideAngular(() => {
      this.transloco.load('en').subscribe((english: Translation) => {
        this.englishValues = this.flatten(english);
        this.englishKeys = this.reverse(this.englishValues);
        this.transloco.load(activeLang).subscribe((active: Translation) => {
          this.activeValues = this.flatten(active);
          this.activeKeys = this.reverse(this.activeValues);
          this.translateTree();
        });
      });
    });
  }

  private translateTree(): void {
    const root = this.element.nativeElement;
    this.translating = true;
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node as Text;
        const parent = text.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'INPUT', 'TEXTAREA'].includes(parent.tagName)) continue;
        const original = this.textKeys.get(text);
        const raw = original ? this.englishValues.get(original) || text.data : text.data;
        const key = original || this.englishKeys.get(raw.trim()) || this.activeKeys.get(text.data.trim());
        if (!key) continue;
        this.textKeys.set(text, key);
        const translated = this.activeValues.get(key);
        if (translated) {
          const nextText = raw.replace(raw.trim(), translated);
          if (text.data !== nextText) text.data = nextText;
        }
      }

      root.querySelectorAll<HTMLElement>('*').forEach(node => {
        const attributes = ['title', 'placeholder', 'aria-label', 'alt'];
        const known = this.attributeKeys.get(node) || new Map<string, string>();
        attributes.forEach(attribute => {
          const value = node.getAttribute(attribute);
          if (!value) return;
          const key = known.get(attribute) || this.englishKeys.get(value.trim()) || this.activeKeys.get(value.trim());
          if (!key) return;
          known.set(attribute, key);
          const translated = this.activeValues.get(key);
          if (translated && value !== translated) node.setAttribute(attribute, translated);
        });
        if (known.size) this.attributeKeys.set(node, known);
      });
    } finally {
      this.translating = false;
    }
  }

  private flatten(value: Translation, prefix = ''): Map<string, string> {
    const result = new Map<string, string>();
    Object.entries(value || {}).forEach(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof child === 'string') result.set(path, child);
      else if (child && typeof child === 'object') {
        this.flatten(child as Translation, path).forEach((entry, nestedKey) => result.set(nestedKey, entry));
      }
    });
    return result;
  }

  private reverse(values: Map<string, string>): Map<string, string> {
    const result = new Map<string, string>();
    values.forEach((text, key) => result.set(text, key));
    return result;
  }
}
