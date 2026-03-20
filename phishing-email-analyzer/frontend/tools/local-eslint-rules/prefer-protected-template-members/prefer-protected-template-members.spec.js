const fs = require('fs');
const path = require('path');
const os = require('os');
const { RuleTester } = require('eslint');
const rule = require('./prefer-protected-template-members');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const { Linter } = require('eslint');
const tsParser = require('@typescript-eslint/parser');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eslint-test-'));
const tmpTemplatePath = path.join(tmpDir, 'test.component.html');
const tmpComponentPath = path.join(tmpDir, 'test.component.ts');
fs.writeFileSync(tmpTemplatePath, '<p>{{ value }}</p>');

const typedTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eslint-test-typed-'));
fs.writeFileSync(
  path.join(typedTmpDir, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'node',
      experimentalDecorators: true,
      strict: false,
    },
    include: ['*.ts'],
  })
);

/* eslint-disable-next-line no-undef */
afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(typedTmpDir, { recursive: true, force: true });
});

ruleTester.run('prefer-protected-template-members', rule, {
  valid: [
    // ───────────────────────────────────────────────
    // Core non-violations
    // ───────────────────────────────────────────────
    {
      name: 'protected member used in template',
      code: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  protected value = 'hello';
}`,
    },
    {
      name: 'private member (rule only checks public)',
      code: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  private value = 'hello';
}`,
    },
    {
      name: 'public member used in both template and class code',
      code: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  value = 'hello';
  update() { this.value = 'world'; }
}`,
    },
    {
      name: 'public member NOT used in template',
      code: `
@Component({ template: '<p>static</p>' })
class TestComponent {
  value = 'hello';
}`,
    },
    {
      name: 'non-component class (no @Component decorator)',
      code: `
@Injectable()
class MyService {
  value = 'hello';
}`,
    },
    {
      name: 'class without any decorators',
      code: `
class PlainClass {
  value = 'hello';
}`,
    },

    // ───────────────────────────────────────────────
    // Signal function exemptions
    // ───────────────────────────────────────────────
    {
      name: 'input() signal is exempt',
      code: `
@Component({ template: '<p>{{ name() }}</p>' })
class TestComponent {
  name = input<string>();
}`,
    },
    {
      name: 'input.required() signal is exempt',
      code: `
@Component({ template: '<p>{{ name() }}</p>' })
class TestComponent {
  name = input.required<string>();
}`,
    },
    {
      name: 'input<T>() with generic is exempt',
      code: `
@Component({ template: '<p>{{ items() }}</p>' })
class TestComponent {
  items = input<string[]>([]);
}`,
    },
    {
      name: 'output() signal is exempt',
      code: `
@Component({ template: '<button (click)="clicked.emit()">go</button>' })
class TestComponent {
  clicked = output<void>();
}`,
    },
    {
      name: 'model() signal is exempt',
      code: `
@Component({ template: '<p>{{ value() }}</p>' })
class TestComponent {
  value = model<string>();
}`,
    },
    {
      name: 'viewChild() query is exempt',
      code: `
@Component({ template: '<div #ref>{{ ref }}</div>' })
class TestComponent {
  ref = viewChild('ref');
}`,
    },
    {
      name: 'viewChildren() query is exempt',
      code: `
@Component({ template: '<p>{{ items() }}</p>' })
class TestComponent {
  items = viewChildren('item');
}`,
    },
    {
      name: 'contentChild() query is exempt',
      code: `
@Component({ template: '<p>{{ child() }}</p>' })
class TestComponent {
  child = contentChild('child');
}`,
    },
    {
      name: 'contentChildren() query is exempt',
      code: `
@Component({ template: '<p>{{ children() }}</p>' })
class TestComponent {
  children = contentChildren('child');
}`,
    },

    // ───────────────────────────────────────────────
    // Decorator exemptions
    // ───────────────────────────────────────────────
    {
      name: '@Input() property is exempt',
      code: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  @Input() value = '';
}`,
    },
    {
      name: '@Input (no parens) is exempt',
      code: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  @Input value = '';
}`,
    },
    {
      name: '@Input({ required: true }) is exempt',
      code: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  @Input({ required: true }) value = '';
}`,
    },
    {
      name: '@Output() property is exempt',
      code: `
@Component({ template: '<button (click)="clicked.emit()">go</button>' })
class TestComponent {
  @Output() clicked = new EventEmitter();
}`,
    },

    // ───────────────────────────────────────────────
    // Host decorator exemptions
    // ───────────────────────────────────────────────
    {
      name: '@HostBinding() getter is exempt',
      code: `
@Component({ template: '<p [class]="hostClass">text</p>' })
class TestComponent {
  @HostBinding('class')
  get hostClass() { return 'active'; }
}`,
    },
    {
      name: '@HostListener() method is exempt',
      code: `
@Component({ template: '<button (click)="onKeyDown($event)">go</button>' })
class TestComponent {
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {}
}`,
    },
    {
      name: '@Input() setter is exempt (MethodDefinition)',
      code: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  @Input() set value(v: string) { this._v = v; }
  get value() { return this._v; }
}`,
    },
    {
      name: '@HostBinding property (not getter) is exempt',
      code: `
@Component({ template: '<p [attr.role]="role">text</p>' })
class TestComponent {
  @HostBinding('attr.role') role = 'button';
}`,
    },
    {
      name: '@HostBinding without parens is exempt',
      code: `
@Component({ template: '<p [class]="isActive">text</p>' })
class TestComponent {
  @HostBinding isActive = false;
}`,
    },
    {
      name: '@HostListener without parens is exempt',
      code: `
@Component({ template: '<button (click)="onClick()">go</button>' })
class TestComponent {
  @HostListener onClick() {}
}`,
    },
    {
      name: '@Output() on setter is exempt',
      code: `
@Component({ template: '<p>{{ clicked }}</p>' })
class TestComponent {
  @Output() set clicked(v: any) { this._v = v; }
}`,
    },

    // ───────────────────────────────────────────────
    // JSDoc tag exemptions
    // ───────────────────────────────────────────────
    {
      name: '/** @public */ JSDoc tag exempts member',
      code: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  /** @public */
  value = 'hello';
}`,
    },
    {
      name: '/** @publicApi */ JSDoc tag exempts member',
      code: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  /** @publicApi */
  value = 'hello';
}`,
    },

    // ───────────────────────────────────────────────
    // Special member exemptions
    // ───────────────────────────────────────────────
    {
      name: 'constructor is exempt',
      code: `
@Component({ template: '<p>test</p>' })
class TestComponent {
  constructor() {}
}`,
    },
    {
      name: 'static member is exempt',
      code: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  static value = 'hello';
  protected otherValue = '';
}`,
    },

    // ───────────────────────────────────────────────
    // Edge cases from real code
    // ───────────────────────────────────────────────
    {
      name: 'member used in class code via this.member inside computed()',
      code: `
@Component({ template: '<p>{{ display() }}</p>' })
class TestComponent {
  value = 'hello';
  protected display = computed(() => this.value.toUpperCase());
}`,
    },
    {
      name: 'member name in single-quoted string literal in template (blanked, no false positive)',
      code: `
@Component({ template: '<div (click)="navigate()">go</div>' })
class TestComponent {
  protected navigate() {}
  memberName = 'test';
}`,
    },
    {
      name: 'member name inside HTML comment in template (stripped)',
      code: `
@Component({ template: '<!-- value -->\\n<p>static</p>' })
class TestComponent {
  value = 'hello';
}`,
    },
    {
      name: 'non-component class alongside component in same file',
      code: `
class Helper {
  value = 'hello';
}
@Component({ template: '<p>static</p>' })
class TestComponent {}`,
    },
    {
      name: '@Component without template or templateUrl',
      code: `
@Component({ selector: 'app-test' })
class TestComponent {
  value = 'hello';
}`,
    },
    {
      name: '@Component without parentheses (identifier decorator) is handled safely',
      code: `
@Component
class TestComponent {
  value = 'hello';
}`,
    },
    {
      name: 'templateUrl happy path: protected member in external template is valid',
      filename: tmpComponentPath,
      code: `
@Component({ templateUrl: './test.component.html' })
class TestComponent {
  protected value = 'hello';
}`,
    },
    {
      name: 'word boundary prevents partial match (memberX vs member)',
      code: `
@Component({ template: '<p>{{ memberExtra }}</p>' })
class TestComponent {
  protected memberExtra = '';
  member = 'hello';
}`,
    },
    {
      name: 'TemplateLiteral node for inline template',
      code: `\
@Component({ template: \`<p>{{ value }}</p>\` })
class TestComponent {
  protected value = 'hello';
}`,
    },
    {
      name: 'this.member in comment does not count as class code usage',
      code: `
@Component({ template: '<p>static</p>' })
class TestComponent {
  value = 'hello';
  // this.value is referenced in a comment
}`,
    },
    {
      name: 'this.member in string literal does not count as class code usage',
      code: `
@Component({ template: '<p>static</p>' })
class TestComponent {
  value = 'hello';
  label = 'this.value is a string';
}`,
    },
    {
      name: 'computed property name is ignored',
      code: `
@Component({ template: '<p>{{ test }}</p>' })
class TestComponent {
  protected test = '';
  ['computed'] = 'hello';
}`,
    },
    {
      name: 'multiple component classes in one file',
      code: `
@Component({ template: '<p>{{ a }}</p>' })
class CompA {
  protected a = '';
}
@Component({ template: '<p>{{ b }}</p>' })
class CompB {
  protected b = '';
}`,
    },

    // ───────────────────────────────────────────────
    // Regex special characters in member names
    // ───────────────────────────────────────────────
    {
      name: 'member name starting with $ used in class code stays public',
      code: `
@Component({ template: '<p>{{ $count }}</p>' })
class TestComponent {
  $count = 0;
  increment() { this.$count++; }
}`,
    },

    // ───────────────────────────────────────────────
    // Inheritance GAPs
    // ───────────────────────────────────────────────
    {
      name: 'GAP: overridden method from base class — rule cannot see parent accessibility',
      code: `
@Component({ template: '<p>{{ label }}</p>' })
class TestComponent extends BaseComponent {
  protected label = 'hello';
}`,
    },

    // ───────────────────────────────────────────────
    // exemptInterfaces option
    // ───────────────────────────────────────────────
    {
      name: 'exemptInterfaces option: custom interface method exempt',
      options: [{ exemptInterfaces: { WithDiscardChangesComponent: ['openDiscardChangesModal'] } }],
      code: `
@Component({ template: '<button (click)="openDiscardChangesModal()">go</button>' })
class TestComponent implements WithDiscardChangesComponent {
  openDiscardChangesModal() { return of(true); }
}`,
    },

    // ───────────────────────────────────────────────
    // Gap documentation (valid because rule does NOT detect)
    // ───────────────────────────────────────────────
    {
      name: 'GAP: @Directive class is ignored by rule',
      code: `
@Directive({ selector: '[appHighlight]' })
class HighlightDirective {
  color = 'yellow';
}`,
    },
    {
      name: 'GAP: template literal expression content is lost',
      code: `\
@Component({ template: \`\${dynamicTemplate}\` })
class TestComponent {
  member = "hello";
}`,
    },
    {
      name: 'GAP: cross-file usage is invisible (by design)',
      code: `
@Component({ template: '<p>static</p>' })
class TestComponent {
  value = 'hello';
}`,
    },
    {
      name: 'GAP: single-quoted property binding blanked by preprocessTemplate',
      code: `
@Component({ template: "<p [title]='member'>text</p>" })
class TestComponent {
  member = 'hello';
}`,
    },
    {
      name: 'GAP: single-quoted event binding blanked by preprocessTemplate',
      code: `
@Component({ template: "<button (click)='doIt()'>go</button>" })
class TestComponent {
  doIt() {}
}`,
    },
  ],

  invalid: [
    // ───────────────────────────────────────────────
    // Core violations
    // ───────────────────────────────────────────────
    {
      name: 'implicit public property used only in template (interpolation)',
      code: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  value = 'hello';
}`,
      output: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  protected value = 'hello';
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'value' } }],
    },
    {
      name: 'explicit public property used only in template',
      code: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  public value = 'hello';
}`,
      output: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  protected value = 'hello';
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'value' } }],
    },
    {
      name: 'public method used only in template via event binding',
      code: `
@Component({ template: '<button (click)="doIt()">go</button>' })
class TestComponent {
  doIt() {}
}`,
      output: `
@Component({ template: '<button (click)="doIt()">go</button>' })
class TestComponent {
  protected doIt() {}
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'doIt' } }],
    },
    {
      name: 'public getter used only in template',
      code: `
@Component({ template: '<p>{{ label }}</p>' })
class TestComponent {
  get label() { return 'hi'; }
}`,
      output: `
@Component({ template: '<p>{{ label }}</p>' })
class TestComponent {
  protected get label() { return 'hi'; }
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'label' } }],
    },
    {
      name: 'multiple public members used only in template',
      code: `
@Component({ template: '<p>{{ a }} {{ b }}</p>' })
class TestComponent {
  a = 1;
  b = 2;
}`,
      output: `
@Component({ template: '<p>{{ a }} {{ b }}</p>' })
class TestComponent {
  protected a = 1;
  protected b = 2;
}`,
      errors: [
        { messageId: 'shouldBeProtected', data: { name: 'a' } },
        { messageId: 'shouldBeProtected', data: { name: 'b' } },
      ],
    },

    // ───────────────────────────────────────────────
    // Template binding patterns (one per regex branch)
    // ───────────────────────────────────────────────
    {
      name: 'interpolation {{ member }}',
      code: `
@Component({ template: '<p>{{ member }}</p>' })
class TestComponent {
  member = '';
}`,
      output: `
@Component({ template: '<p>{{ member }}</p>' })
class TestComponent {
  protected member = '';
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: 'property binding [prop]="member"',
      code: `
@Component({ template: '<p [title]="member">text</p>' })
class TestComponent {
  member = '';
}`,
      output: `
@Component({ template: '<p [title]="member">text</p>' })
class TestComponent {
  protected member = '';
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: 'event binding (event)="member()"',
      code: `
@Component({ template: '<button (click)="member()">go</button>' })
class TestComponent {
  member() {}
}`,
      output: `
@Component({ template: '<button (click)="member()">go</button>' })
class TestComponent {
  protected member() {}
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: 'two-way binding [(ngModel)]="member"',
      code: `
@Component({ template: '<input [(ngModel)]="member">' })
class TestComponent {
  member = '';
}`,
      output: `
@Component({ template: '<input [(ngModel)]="member">' })
class TestComponent {
  protected member = '';
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: 'control flow @if (member)',
      code: `
@Component({ template: '@if (member) { <p>yes</p> }' })
class TestComponent {
  member = true;
}`,
      output: `
@Component({ template: '@if (member) { <p>yes</p> }' })
class TestComponent {
  protected member = true;
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: 'control flow @if with signal call inside parens',
      code: `
@Component({ template: '@if (fn() && member) { <p>yes</p> }' })
class TestComponent {
  member = true;
}`,
      output: `
@Component({ template: '@if (fn() && member) { <p>yes</p> }' })
class TestComponent {
  protected member = true;
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: 'control flow @for (item of member)',
      code: `
@Component({ template: '@for (item of member; track $index) { <p>{{ item }}</p> }' })
class TestComponent {
  member = [];
}`,
      output: `
@Component({ template: '@for (item of member; track $index) { <p>{{ item }}</p> }' })
class TestComponent {
  protected member = [];
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: 'control flow @for with trackBy function',
      code: `
@Component({ template: '@for (item of items; track trackFn(item)) { <p>{{ item }}</p> }' })
class TestComponent {
  items = input<string[]>();
  trackFn = (item: any) => item.id;
}`,
      output: `
@Component({ template: '@for (item of items; track trackFn(item)) { <p>{{ item }}</p> }' })
class TestComponent {
  items = input<string[]>();
  protected trackFn = (item: any) => item.id;
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'trackFn' } }],
    },
    {
      name: 'control flow @switch (member)',
      code: `
@Component({ template: '@switch (member) { @case (1) { <p>one</p> } }' })
class TestComponent {
  member = 1;
}`,
      output: `
@Component({ template: '@switch (member) { @case (1) { <p>one</p> } }' })
class TestComponent {
  protected member = 1;
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: 'control flow @defer (when member)',
      code: `
@Component({ template: '@defer (when member) { <p>loaded</p> }' })
class TestComponent {
  member = false;
}`,
      output: `
@Component({ template: '@defer (when member) { <p>loaded</p> }' })
class TestComponent {
  protected member = false;
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: 'control flow @else if (member)',
      code: `
@Component({ template: '@if (false) { <p>no</p> } @else if (member) { <p>yes</p> }' })
class TestComponent {
  member = true;
}`,
      output: `
@Component({ template: '@if (false) { <p>no</p> } @else if (member) { <p>yes</p> }' })
class TestComponent {
  protected member = true;
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: 'control flow @case (member)',
      code: `
@Component({ template: '@switch (1) { @case (member) { <p>match</p> } }' })
class TestComponent {
  member = 1;
}`,
      output: `
@Component({ template: '@switch (1) { @case (member) { <p>match</p> } }' })
class TestComponent {
  protected member = 1;
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: 'control flow @let x = member',
      code: `
@Component({ template: '@let x = member;\\n<p>{{ x }}</p>' })
class TestComponent {
  member = 'hello';
}`,
      output: `
@Component({ template: '@let x = member;\\n<p>{{ x }}</p>' })
class TestComponent {
  protected member = 'hello';
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: 'attribute binding [attr.role]="member"',
      code: `
@Component({ template: '<p [attr.role]="member">text</p>' })
class TestComponent {
  member = 'button';
}`,
      output: `
@Component({ template: '<p [attr.role]="member">text</p>' })
class TestComponent {
  protected member = 'button';
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: 'class binding [class.active]="member"',
      code: `
@Component({ template: '<p [class.active]="member">text</p>' })
class TestComponent {
  member = true;
}`,
      output: `
@Component({ template: '<p [class.active]="member">text</p>' })
class TestComponent {
  protected member = true;
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: 'style binding [style.color]="member"',
      code: `
@Component({ template: '<p [style.color]="member">text</p>' })
class TestComponent {
  member = 'red';
}`,
      output: `
@Component({ template: '<p [style.color]="member">text</p>' })
class TestComponent {
  protected member = 'red';
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },

    // ───────────────────────────────────────────────
    // Real codebase patterns that should be flagged
    // ───────────────────────────────────────────────
    {
      name: 'enum alias exposed as class property',
      code: `\
@Component({ template: '<p>{{ SortColumnName.Name }}</p>' })
class TestComponent {
  SortColumnName = SortColumnName;
}`,
      output: `\
@Component({ template: '<p>{{ SortColumnName.Name }}</p>' })
class TestComponent {
  protected SortColumnName = SortColumnName;
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'SortColumnName' } }],
    },
    {
      name: 'readonly translations used only in template',
      code: `
@Component({ template: '<p>{{ translations.title }}</p>' })
class TestComponent {
  readonly translations = translations;
}`,
      output: `
@Component({ template: '<p>{{ translations.title }}</p>' })
class TestComponent {
  protected readonly translations = translations;
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'translations' } }],
    },
    {
      name: 'readonly type enum used only in template',
      code: `
@Component({ template: '<p>{{ FunctionGroupType.Regular }}</p>' })
class TestComponent {
  readonly FunctionGroupType = FunctionGroupType;
}`,
      output: `
@Component({ template: '<p>{{ FunctionGroupType.Regular }}</p>' })
class TestComponent {
  protected readonly FunctionGroupType = FunctionGroupType;
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'FunctionGroupType' } }],
    },
    {
      name: 'arrow function property used only in template',
      code: `
@Component({ template: '<p>{{ trackById }}</p>' })
class TestComponent {
  trackById = (item: any) => item.id;
}`,
      output: `
@Component({ template: '<p>{{ trackById }}</p>' })
class TestComponent {
  protected trackById = (item: any) => item.id;
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'trackById' } }],
    },
    {
      name: 'computed() member used only in template (NOT an input signal)',
      code: `
@Component({ template: '<p>{{ fullName() }}</p>' })
class TestComponent {
  firstName = input<string>();
  lastName = input<string>();
  fullName = computed(() => this.firstName() + ' ' + this.lastName());
}`,
      output: `
@Component({ template: '<p>{{ fullName() }}</p>' })
class TestComponent {
  firstName = input<string>();
  lastName = input<string>();
  protected fullName = computed(() => this.firstName() + ' ' + this.lastName());
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'fullName' } }],
    },
    {
      name: 'observable with $ suffix used only in template',
      code: `
@Component({ template: '<p>{{ data$ | async }}</p>' })
class TestComponent {
  data$ = new Observable();
}`,
      output: `
@Component({ template: '<p>{{ data$ | async }}</p>' })
class TestComponent {
  protected data$ = new Observable();
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'data$' } }],
    },
    {
      name: 'utility method used only in template',
      code: `
@Component({ template: '<button (click)="onViewJobRole(role)">view</button>' })
class TestComponent {
  onViewJobRole(role: any) { this.router.navigate([role.id]); }
}`,
      output: `
@Component({ template: '<button (click)="onViewJobRole(role)">view</button>' })
class TestComponent {
  protected onViewJobRole(role: any) { this.router.navigate([role.id]); }
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'onViewJobRole' } }],
    },

    // ───────────────────────────────────────────────
    // Edge cases from real template patterns
    // ───────────────────────────────────────────────
    {
      name: 'negation in @if: @if (!member)',
      code: `
@Component({ template: '@if (!member) { <p>empty</p> }' })
class TestComponent {
  member = false;
}`,
      output: `
@Component({ template: '@if (!member) { <p>empty</p> }' })
class TestComponent {
  protected member = false;
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: 'safe navigation {{ member?.property }}',
      code: `
@Component({ template: '<p>{{ member?.name }}</p>' })
class TestComponent {
  member = null;
}`,
      output: `
@Component({ template: '<p>{{ member?.name }}</p>' })
class TestComponent {
  protected member = null;
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: 'non-null assertion {{ member! }}',
      code: `
@Component({ template: '<p>{{ member!.name }}</p>' })
class TestComponent {
  member = null;
}`,
      output: `
@Component({ template: '<p>{{ member!.name }}</p>' })
class TestComponent {
  protected member = null;
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: '@if with pipe and as keyword: @if (member$ | async; as data)',
      code: `
@Component({ template: '@if (member$ | async; as data) { <p>{{ data }}</p> }' })
class TestComponent {
  member$ = new Observable();
}`,
      output: `
@Component({ template: '@if (member$ | async; as data) { <p>{{ data }}</p> }' })
class TestComponent {
  protected member$ = new Observable();
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member$' } }],
    },
    {
      name: 'async method used only in template event binding',
      code: `
@Component({ template: '<button (click)="onSubmit()">go</button>' })
class TestComponent {
  async onSubmit() { await fetch('/api'); }
}`,
      output: `
@Component({ template: '<button (click)="onSubmit()">go</button>' })
class TestComponent {
  protected async onSubmit() { await fetch('/api'); }
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'onSubmit' } }],
    },
    {
      name: '*ngTemplateOutlet context expression containing member',
      code: `
@Component({ template: '<ng-container *ngTemplateOutlet="tpl; context: { $implicit: member }"></ng-container>' })
class TestComponent {
  member = 'hello';
}`,
      output: `
@Component({ template: '<ng-container *ngTemplateOutlet="tpl; context: { $implicit: member }"></ng-container>' })
class TestComponent {
  protected member = 'hello';
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: '@let with pipe expression',
      code: `
@Component({ template: '@let x = member | somePipe;\\n<p>{{ x }}</p>' })
class TestComponent {
  member = 'hello';
}`,
      output: `
@Component({ template: '@let x = member | somePipe;\\n<p>{{ x }}</p>' })
class TestComponent {
  protected member = 'hello';
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },
    {
      name: '[ngClass] object expression containing member',
      code: `
@Component({ template: '<p [ngClass]="{ active: member }">text</p>' })
class TestComponent {
  member = true;
}`,
      output: `
@Component({ template: '<p [ngClass]="{ active: member }">text</p>' })
class TestComponent {
  protected member = true;
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'member' } }],
    },

    // ───────────────────────────────────────────────
    // Regex special characters in member names
    // ───────────────────────────────────────────────
    {
      name: 'member name starting with $ used only in template',
      code: `
@Component({ template: '<p>{{ $count }}</p>' })
class TestComponent {
  $count = 0;
}`,
      output: `
@Component({ template: '<p>{{ $count }}</p>' })
class TestComponent {
  protected $count = 0;
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: '$count' } }],
    },

    // ───────────────────────────────────────────────
    // Autofix edge cases (unique fix branches only;
    // implicit/explicit public, getter, readonly, and
    // method fixes are already verified above)
    // ───────────────────────────────────────────────
    {
      name: 'autofix: setter -> inserts protected before set',
      code: `
@Component({ template: '<input [(ngModel)]="value">' })
class TestComponent {
  set value(v: string) { this._v = v; }
}`,
      output: `
@Component({ template: '<input [(ngModel)]="value">' })
class TestComponent {
  protected set value(v: string) { this._v = v; }
}`,
      errors: [{ messageId: 'shouldBeProtected' }],
    },
    {
      name: 'autofix: member with decorator -> inserts protected after decorator',
      code: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  @SomeDecorator()
  value = 'hello';
}`,
      output: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  @SomeDecorator()
  protected value = 'hello';
}`,
      errors: [{ messageId: 'shouldBeProtected' }],
    },

    // ───────────────────────────────────────────────
    // templateUrl paths (happy + error)
    // ───────────────────────────────────────────────
    {
      name: 'templateUrl happy path: public member flagged via external template file',
      filename: tmpComponentPath,
      code: `
@Component({ templateUrl: './test.component.html' })
class TestComponent {
  value = 'hello';
}`,
      output: `
@Component({ templateUrl: './test.component.html' })
class TestComponent {
  protected value = 'hello';
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'value' } }],
    },
    {
      name: 'templateUrl with non-existent file reports templateNotFound',
      filename: '/fake/dir/test.component.ts',
      code: `
@Component({ templateUrl: './test.component.html' })
class TestComponent {
  value = 'hello';
}`,
      output: null,
      errors: [{ messageId: 'templateNotFound' }],
    },

    // ───────────────────────────────────────────────
    // Interface methods flagged without type info
    // ───────────────────────────────────────────────
    {
      name: 'ControlValueAccessor: writeValue flagged without type info',
      code: `
@Component({ template: '<button (click)="writeValue(null)">clear</button>' })
class TestComponent implements ControlValueAccessor {
  writeValue(value: any) {}
  registerOnChange(fn: any) {}
  registerOnTouched(fn: any) {}
}`,
      output: `
@Component({ template: '<button (click)="writeValue(null)">clear</button>' })
class TestComponent implements ControlValueAccessor {
  protected writeValue(value: any) {}
  registerOnChange(fn: any) {}
  registerOnTouched(fn: any) {}
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'writeValue' } }],
    },
    {
      name: 'Validator: validate flagged without type info',
      code: `
@Component({ template: '<p>{{ validate(ctrl) }}</p>' })
class TestComponent implements Validator {
  validate(control: AbstractControl) { return null; }
  registerOnValidatorChange(fn: any) {}
}`,
      output: `
@Component({ template: '<p>{{ validate(ctrl) }}</p>' })
class TestComponent implements Validator {
  protected validate(control: AbstractControl) { return null; }
  registerOnValidatorChange(fn: any) {}
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'validate' } }],
    },
    {
      name: 'AsyncValidator: validate flagged without type info',
      code: `
@Component({ template: '<p>{{ validate(ctrl) }}</p>' })
class TestComponent implements AsyncValidator {
  validate(control: AbstractControl) { return null; }
}`,
      output: `
@Component({ template: '<p>{{ validate(ctrl) }}</p>' })
class TestComponent implements AsyncValidator {
  protected validate(control: AbstractControl) { return null; }
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'validate' } }],
    },
    {
      name: 'method with interface-like name flagged when class does NOT implement the interface',
      code: `
@Component({ template: '<button (click)="writeValue(null)">clear</button>' })
class TestComponent {
  writeValue(value: any) {}
}`,
      output: `
@Component({ template: '<button (click)="writeValue(null)">clear</button>' })
class TestComponent {
  protected writeValue(value: any) {}
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'writeValue' } }],
    },
    {
      name: 'non-interface method still flagged on class that implements ControlValueAccessor',
      code: `
@Component({ template: '<button (click)="customHandler()">go</button>' })
class TestComponent implements ControlValueAccessor {
  writeValue(value: any) {}
  registerOnChange(fn: any) {}
  registerOnTouched(fn: any) {}
  customHandler() {}
}`,
      output: `
@Component({ template: '<button (click)="customHandler()">go</button>' })
class TestComponent implements ControlValueAccessor {
  writeValue(value: any) {}
  registerOnChange(fn: any) {}
  registerOnTouched(fn: any) {}
  protected customHandler() {}
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'customHandler' } }],
    },

    // ───────────────────────────────────────────────
    // Regression guard
    // ───────────────────────────────────────────────
    {
      name: 'line comment // @public does NOT exempt (only block comments)',
      code: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  // @public
  value = 'hello';
}`,
      output: `
@Component({ template: '<p>{{ value }}</p>' })
class TestComponent {
  // @public
  protected value = 'hello';
}`,
      errors: [{ messageId: 'shouldBeProtected', data: { name: 'value' } }],
    },
  ],
});

// ─────────────────────────────────────────────────────────────
// Type-aware tests: verify automatic interface member resolution
// via the TypeScript type checker (requires parserOptions.project)
// ─────────────────────────────────────────────────────────────

const { describe, it, expect } = require('@jest/globals');

function lintTyped(code, filename, options) {
  const filePath = path.join(typedTmpDir, filename);
  fs.writeFileSync(filePath, code);

  const linter = new Linter();
  linter.defineRule('prefer-protected-template-members', rule);
  linter.defineParser('ts-parser', tsParser);

  return linter.verify(
    code,
    {
      parser: 'ts-parser',
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: typedTmpDir,
      },
      rules: {
        'prefer-protected-template-members': options ? ['warn', options] : 'warn',
      },
    },
    { filename: filePath }
  );
}

describe('type-aware interface resolution', () => {
  it('exempts members required by a locally-defined interface', () => {
    const msgs = lintTyped(
      `
interface Submittable {
  onSubmit(): void;
  label: string;
}

@Component({ template: '<button (click)="onSubmit()">{{ label }}</button>' })
class TestComponent implements Submittable {
  onSubmit() {}
  label = 'go';
}`,
      'local-iface.component.ts'
    );

    const ruleMessages = msgs.filter((m) => m.ruleId === 'prefer-protected-template-members');
    expect(ruleMessages).toHaveLength(0);
  });

  it('still flags non-interface members on a class that implements an interface', () => {
    const msgs = lintTyped(
      `
interface Submittable {
  onSubmit(): void;
}

@Component({ template: '<button (click)="onSubmit()">{{ helperValue }}</button>' })
class TestComponent implements Submittable {
  onSubmit() {}
  helperValue = 'hi';
}`,
      'non-iface-member.component.ts'
    );

    const ruleMessages = msgs.filter((m) => m.ruleId === 'prefer-protected-template-members');
    expect(ruleMessages).toHaveLength(1);
    expect(ruleMessages[0].message).toContain('helperValue');
  });

  it('resolves members from an extended interface hierarchy', () => {
    const msgs = lintTyped(
      `
interface Base {
  baseMethod(): void;
}
interface Child extends Base {
  childMethod(): void;
}

@Component({ template: '<div (click)="baseMethod()">{{ childMethod() }}</div>' })
class TestComponent implements Child {
  baseMethod() {}
  childMethod() { return ''; }
}`,
      'extended-iface.component.ts'
    );

    const ruleMessages = msgs.filter((m) => m.ruleId === 'prefer-protected-template-members');
    expect(ruleMessages).toHaveLength(0);
  });

  it('resolves members from a generic interface', () => {
    const msgs = lintTyped(
      `
interface DataProvider<T> {
  getData(): T;
}

@Component({ template: '<p>{{ getData() }}</p>' })
class TestComponent implements DataProvider<string> {
  getData() { return 'hello'; }
}`,
      'generic-iface.component.ts'
    );

    const ruleMessages = msgs.filter((m) => m.ruleId === 'prefer-protected-template-members');
    expect(ruleMessages).toHaveLength(0);
  });

  it('resolves members from multiple implemented interfaces', () => {
    const msgs = lintTyped(
      `
interface Openable {
  open(): void;
}
interface Closable {
  close(): void;
}

@Component({ template: '<button (click)="open()">open</button><button (click)="close()">close</button>' })
class TestComponent implements Openable, Closable {
  open() {}
  close() {}
}`,
      'multi-iface.component.ts'
    );

    const ruleMessages = msgs.filter((m) => m.ruleId === 'prefer-protected-template-members');
    expect(ruleMessages).toHaveLength(0);
  });

  it('resolves interface properties (not just methods)', () => {
    const msgs = lintTyped(
      `
interface Labeled {
  label: string;
  description: string;
}

@Component({ template: '<p>{{ label }} - {{ description }}</p>' })
class TestComponent implements Labeled {
  label = 'title';
  description = 'desc';
}`,
      'iface-props.component.ts'
    );

    const ruleMessages = msgs.filter((m) => m.ruleId === 'prefer-protected-template-members');
    expect(ruleMessages).toHaveLength(0);
  });
});
