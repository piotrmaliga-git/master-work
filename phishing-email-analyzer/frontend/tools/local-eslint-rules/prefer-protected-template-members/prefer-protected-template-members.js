/**
 * ESLint rule to enforce that class members only used in templates should be protected
 *
 * This rule implements the Angular style guide recommendation:
 * https://angular.dev/style-guide#use-protected-on-class-members-that-are-only-used-by-a-components-template
 *
 * The rule checks for public class members that are:
 * - Referenced in the component's template
 * - NOT referenced elsewhere in the same file via `this.memberName`
 *   (cross-file usage is invisible to a single-file lint rule, so the rule
 *   stays silent when it cannot confirm a member is template-only)
 *
 * Exemptions (automatically public):
 * - input() / input.required() signals
 * - output() signals
 * - model() signals
 * - viewChild() / viewChildren() signal queries
 * - contentChild() / contentChildren() signal queries
 * - @Input() decorated properties/setters
 * - @Output() decorated properties/setters
 * - @HostBinding() decorated properties/getters
 * - @HostListener() decorated methods
 * - Members with @public or @publicApi JSDoc tags
 * - All members declared by any interface in the `implements` clause,
 *   when TypeScript type information is available (type-aware linting)
 * - Methods from user-supplied `exemptInterfaces` option
 *
 * Performance Note:
 * - Uses synchronous file I/O to read external templates (templateUrl)
 * - This is necessary as ESLint rules run synchronously
 * - For large projects, consider using inline templates or accepting slight linting delay
 *
 * @example
 * // ❌ Bad - public member only used in template
 * @Component({
 *   template: `<p>{{ fullName() }}</p>`
 * })
 * export class UserProfile {
 *   firstName = input();
 *   lastName = input();
 *   fullName = computed(() => `${this.firstName()} ${this.lastName()}`); // Should be protected
 * }
 *
 * // ✅ Good
 * @Component({
 *   template: `<p>{{ fullName() }}</p>`
 * })
 * export class UserProfile {
 *   firstName = input(); // Public API - OK
 *   lastName = input(); // Public API - OK
 *   protected fullName = computed(() => `${this.firstName()} ${this.lastName()}`); // Protected
 * }
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_SIGNAL_FUNCTIONS = new Set([
  'input',
  'output',
  'model',
  'viewChild',
  'viewChildren',
  'contentChild',
  'contentChildren',
]);
const EXEMPT_DECORATORS = new Set(['Input', 'Output', 'HostBinding', 'HostListener']);

/**
 * Return the text position right after the last decorator (on the next line),
 * or fall back to `fallbackPosition` when the node has no decorators.
 */
function getInsertPositionAfterDecorators(node, sourceCode, fallbackPosition) {
  if (!node.decorators || node.decorators.length === 0) {
    return fallbackPosition;
  }

  const lastDecorator = node.decorators[node.decorators.length - 1];
  let position = lastDecorator.range[1];
  const textAfterDecorator = sourceCode.getText().substring(position);
  const newlineMatch = textAfterDecorator.match(/\n\s*/);
  if (newlineMatch) {
    position += newlineMatch[0].length;
  }
  return position;
}

/**
 * Check whether an initializer AST node is an `input.required()` call.
 */
function isInputRequiredCall(init) {
  if (!init || init.type !== 'CallExpression') return false;

  const { callee } = init;
  if (callee.type !== 'MemberExpression') return false;

  const { object, property } = callee;
  const isInputRequired =
    object.type === 'Identifier' &&
    object.name === 'input' &&
    property.type === 'Identifier' &&
    property.name === 'required';

  return isInputRequired;
}

/**
 * Blank template-literal static text but preserve `${…}` expression content,
 * so `this.member` inside expressions is still visible to `isUsedInClassCode`.
 */
function blankTemplateLiteralPreservingExpressions(match) {
  let result = '';
  let exprDepth = 0;
  for (let i = 0; i < match.length; i++) {
    if (exprDepth === 0) {
      if (match[i] === '\\' && i + 1 < match.length) {
        result += '  ';
        i++;
      } else if (match[i] === '$' && match[i + 1] === '{') {
        result += '  ';
        exprDepth = 1;
        i++;
      } else {
        result += ' ';
      }
    } else {
      if (match[i] === '{') {
        exprDepth++;
      } else if (match[i] === '}') {
        exprDepth--;
      }
      result += exprDepth === 0 ? ' ' : match[i];
    }
  }
  return result;
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce that class members only used in templates should be protected per Angular style guide',
      category: 'Best Practices',
      recommended: false,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          exemptInterfaces: {
            type: 'object',
            description: 'Map of interface names to arrays of method names that must stay public.',
            additionalProperties: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      shouldBeProtected:
        'Member "{{name}}" is only used in the template and should be marked as protected.',
      templateNotFound: 'Could not read template file "{{path}}": {{error}}',
    },
  },

  create(context) {
    // context.sourceCode / context.filename are the ESLint v9 API.
    // context.getSourceCode() / context.getFilename() are the v8 equivalents (deprecated in v9).
    // The ?? fallback keeps this rule compatible with both versions.
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const userExemptInterfaces = (context.options[0] && context.options[0].exemptInterfaces) || {};
    const parserServices = context.parserServices ?? context.sourceCode?.parserServices;
    const hasTypeInfo = !!(parserServices?.program && parserServices?.esTreeNodeToTSNodeMap);

    function buildExemptMethodNames(classNode) {
      if (!classNode.implements || classNode.implements.length === 0) return null;

      const names = new Set();

      if (hasTypeInfo) {
        try {
          const checker = parserServices.program.getTypeChecker();
          for (const impl of classNode.implements) {
            const tsNode =
              parserServices.esTreeNodeToTSNodeMap.get(impl) ??
              parserServices.esTreeNodeToTSNodeMap.get(impl.expression);
            if (!tsNode) continue;
            const type = checker.getTypeAtLocation(tsNode);
            if (!type) continue;
            for (const prop of type.getProperties()) {
              names.add(prop.name);
            }
          }
        } catch {
          // Type resolution failed — no fallback available.
        }
      }

      for (const impl of classNode.implements) {
        const expr = impl.expression;
        const ifaceName = expr && expr.type === 'Identifier' ? expr.name : null;
        if (!ifaceName) continue;

        const user = userExemptInterfaces[ifaceName];
        if (user) user.forEach((m) => names.add(m));
      }
      return names.size > 0 ? names : null;
    }

    /**
     * Check if a property has @public or @publicApi JSDoc tag
     */
    function hasPublicJSDocTag(node) {
      const comments = sourceCode.getCommentsBefore(node);

      return comments.some((comment) => {
        if (comment.type !== 'Block') return false;
        const text = comment.value;
        return /@public\b|@publicApi\b/.test(text);
      });
    }

    /**
     * Check if a property is initialized with an Angular signal function that should be public
     */
    function isPublicSignalFunction(node) {
      if (!node.value) return false;

      const init = node.value;

      if (init.type === 'CallExpression' && init.callee.type === 'Identifier') {
        return PUBLIC_SIGNAL_FUNCTIONS.has(init.callee.name);
      }

      return isInputRequiredCall(init);
    }

    /**
     * Check if a property has @Input or @Output decorator
     */
    function hasExemptDecorator(node) {
      if (!node.decorators) return false;

      return node.decorators.some((decorator) => {
        if (decorator.expression.type === 'Identifier') {
          return EXEMPT_DECORATORS.has(decorator.expression.name);
        }
        if (
          decorator.expression.type === 'CallExpression' &&
          decorator.expression.callee.type === 'Identifier'
        ) {
          return EXEMPT_DECORATORS.has(decorator.expression.callee.name);
        }
        return false;
      });
    }

    /**
     * Get the template content for a component
     */
    function getTemplateContent(componentNode) {
      const componentDecorator = componentNode.decorators?.find((decorator) => {
        if (decorator.expression.type === 'Identifier') {
          return decorator.expression.name === 'Component';
        }
        if (
          decorator.expression.type === 'CallExpression' &&
          decorator.expression.callee.type === 'Identifier'
        ) {
          return decorator.expression.callee.name === 'Component';
        }
        return false;
      });

      if (!componentDecorator) {
        return null;
      }

      const decoratorExpression = componentDecorator.expression;
      if (decoratorExpression.type === 'Identifier') {
        // Bare @Component has no inline metadata argument to extract template from.
        return null;
      }

      if (decoratorExpression.type !== 'CallExpression' || !decoratorExpression.arguments[0]) {
        return null;
      }

      const config = decoratorExpression.arguments[0];
      if (config.type !== 'ObjectExpression') return null;

      const templateProp = config.properties.find(
        (prop) => prop.key && (prop.key.name === 'template' || prop.key.name === 'templateUrl')
      );

      if (!templateProp) return null;

      if (templateProp.key.name === 'template') {
        if (templateProp.value.type === 'Literal') {
          return templateProp.value.value;
        }
        if (templateProp.value.type === 'TemplateLiteral') {
          return templateProp.value.quasis.map((q) => q.value.raw).join('');
        }
      }

      if (templateProp.key.name === 'templateUrl' && templateProp.value.type === 'Literal') {
        const templateUrl = templateProp.value.value;
        const currentFilePath = context.filename ?? context.getFilename();
        const templatePath = path.resolve(path.dirname(currentFilePath), templateUrl);

        try {
          return fs.readFileSync(templatePath, 'utf8');
        } catch (error) {
          context.report({
            node: templateProp,
            messageId: 'templateNotFound',
            data: {
              path: templatePath,
              error: error.message,
            },
          });
          return null;
        }
      }

      return null;
    }

    /**
     * Strip HTML comments and string literals from a template once,
     * so every per-member check can reuse the cleaned text.
     */
    function preprocessTemplate(content) {
      if (!content) return null;

      const withoutComments = content.replace(/<!--[\s\S]*?-->/g, '');

      // Only blank single-quoted strings. Double-quoted strings must NOT be
      // blanked because Angular binding attributes use double quotes to delimit
      // expressions (e.g. [prop]="expr", (event)="expr"). Blanking them would
      // erase the very expressions the rule needs to inspect.
      // Single-quoted strings inside those expressions are actual string
      // literals (Angular convention) and should be blanked to avoid false
      // positives like (click)="navigate('memberName')".
      return withoutComments.replace(
        /'(?:[^'\\]|\\.)*'/g,
        (match) => "'" + ' '.repeat(Math.max(0, match.length - 2)) + "'"
      );
    }

    /**
     * Single-pass extraction of all identifiers that appear inside Angular
     * expression contexts (bindings, interpolations, control flow, @let).
     * Returns a Set for O(1) per-member lookups.
     */
    function collectTemplateIdentifiers(cleanedTemplate) {
      if (!cleanedTemplate) return null;

      const exprParts = [];

      // Interpolation: {{ expr }}
      for (const m of cleanedTemplate.matchAll(/\{\{([^}]*)\}\}/g)) {
        exprParts.push(m[1]);
      }

      // Property / attr / class / style binding: [prop]="expr", [attr.x]="expr", etc.
      // Also matches two-way: [(prop)]="expr"
      for (const m of cleanedTemplate.matchAll(/\[[^\]]+\]="([^"]*)"/g)) {
        exprParts.push(m[1]);
      }

      // Event binding: (event)="expr"
      for (const m of cleanedTemplate.matchAll(/\([^)]+\)="([^"]*)"/g)) {
        exprParts.push(m[1]);
      }

      // Structural directive: *ngTemplateOutlet="expr", *appCustomDirective="expr", etc.
      for (const m of cleanedTemplate.matchAll(/\*[a-zA-Z]+="([^"]*)"/g)) {
        exprParts.push(m[1]);
      }

      // Control flow: @if (...) {, @for (...) {, @switch (...) {, @defer (...) {
      // @else if (...) {, @case (...) {
      // Uses a paren-depth-aware extraction to handle nested fn() calls.
      for (const m of cleanedTemplate.matchAll(/@(?:if|for|switch|defer|case)\s*\(/g)) {
        exprParts.push(extractParenContent(cleanedTemplate, m.index + m[0].length));
      }
      for (const m of cleanedTemplate.matchAll(/@else\s+if\s*\(/g)) {
        exprParts.push(extractParenContent(cleanedTemplate, m.index + m[0].length));
      }

      // @let variable = expr;
      for (const m of cleanedTemplate.matchAll(/@let\s+\w+\s*=\s*([^;]*)/g)) {
        exprParts.push(m[1]);
      }

      const allExprs = exprParts.join(' ');

      const identifiers = new Set();
      for (const m of allExprs.matchAll(/[$\w]+/g)) {
        identifiers.add(m[0]);
      }
      return identifiers.size > 0 ? identifiers : null;
    }

    /**
     * Extract the content between balanced parentheses starting at `startIdx`
     * (the char right after the opening `(`).
     */
    function extractParenContent(text, startIdx) {
      let depth = 1;
      let i = startIdx;
      while (i < text.length && depth > 0) {
        if (text[i] === '(') depth++;
        else if (text[i] === ')') depth--;
        i++;
      }
      return text.substring(startIdx, i - 1);
    }

    function isUsedInTemplate(memberName, templateIdentifiers) {
      if (!templateIdentifiers) return false;
      return templateIdentifiers.has(memberName);
    }

    /**
     * Strip comments and string literals from the source text once per file,
     * preserving character positions so range checks remain valid.
     */
    function preprocessSourceText() {
      return sourceCode
        .getText()
        .replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
        .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length))
        .replace(/"(?:[^"\\]|\\.)*"/g, (m) => ' '.repeat(m.length))
        .replace(/'(?:[^'\\]|\\.)*'/g, (m) => ' '.repeat(m.length))
        .replace(/`(?:[^`\\]|\\.)*`/g, blankTemplateLiteralPreservingExpressions);
    }

    /**
     * Scan the preprocessed source once and collect every `this.<name>` reference
     * as { name, index } so per-member lookups are O(1) on the collected set
     * instead of O(source_length) per member.
     */
    function collectThisReferences() {
      const refs = new Map();
      const pattern = /\bthis\.([\w$]+)/g;
      let match;
      while ((match = pattern.exec(preprocessedSource)) !== null) {
        const name = match[1];
        if (!refs.has(name)) refs.set(name, []);
        refs.get(name).push(match.index);
      }
      return refs;
    }

    /**
     * Check if a member is used elsewhere within the same class body.
     *
     * Scoped to the current class body so that `this.memberName` references
     * in other classes sharing the same file do not cause false negatives.
     *
     * Uses the pre-collected `thisReferences` map (built once per file) and
     * filters by class body range, skipping matches inside the member's own range.
     */
    function isUsedInClassCode(memberName, classNode, currentMember) {
      const positions = thisReferences.get(memberName);
      if (!positions) return false;

      const [classStart, classEnd] = classNode.body.range;
      const [memberStart, memberEnd] = currentMember.range;

      return positions.some(
        (idx) => idx >= classStart && idx < classEnd && (idx < memberStart || idx >= memberEnd)
      );
    }

    function isPublicMember(node) {
      return !node.accessibility || node.accessibility === 'public';
    }

    function isComponentClass(node) {
      return node.decorators?.some((decorator) => {
        if (decorator.expression.type === 'Identifier') {
          return decorator.expression.name === 'Component';
        }
        if (
          decorator.expression.type === 'CallExpression' &&
          decorator.expression.callee.type === 'Identifier'
        ) {
          return decorator.expression.callee.name === 'Component';
        }
        return false;
      });
    }

    /**
     * Create a fixer to insert 'protected' keyword before a property or method
     */
    function createProtectedFix(node, fixer) {
      const tokens = sourceCode.getTokens(node);

      const publicToken = tokens.find(
        (token) => token.type === 'Keyword' && token.value === 'public'
      );
      if (publicToken) return fixer.replaceText(publicToken, 'protected');

      if (node.kind === 'get' || node.kind === 'set') {
        const getSetToken = tokens.find((token) => token.value === 'get' || token.value === 'set');
        if (getSetToken) return fixer.insertTextBefore(getSetToken, 'protected ');
      }

      const insertPosition = getInsertPositionAfterDecorators(node, sourceCode, node.range[0]);
      return fixer.insertTextBeforeRange([insertPosition, insertPosition], 'protected ');
    }

    /**
     * When a getter/setter pair exists and the counterpart carries an exempt
     * decorator (e.g. @Input() on the setter), both accessors should stay public.
     */
    function hasPairedAccessorWithExemptDecorator(node) {
      if (node.type !== 'MethodDefinition' || (node.kind !== 'get' && node.kind !== 'set'))
        return false;
      const pairedKind = node.kind === 'get' ? 'set' : 'get';
      const paired = node.parent.body.find(
        (n) =>
          n.type === 'MethodDefinition' &&
          n.kind === pairedKind &&
          n.key.type === 'Identifier' &&
          n.key.name === node.key.name
      );
      return paired ? hasExemptDecorator(paired) : false;
    }

    let currentComponentClass = null;
    let preprocessedTemplate = null;
    let preprocessedSource = null;
    let thisReferences = null;
    let exemptInterfaceMethods = null;

    function checkMember(node) {
      if (!currentComponentClass || node.parent !== currentComponentClass.body) return;
      if (node.type === 'MethodDefinition' && node.kind === 'constructor') return;
      if (node.static) return;
      if (!isPublicMember(node)) return;
      if (!node.key || node.key.type !== 'Identifier') return;

      const memberName = node.key.name;

      if (hasPublicJSDocTag(node)) return;
      if (node.type === 'PropertyDefinition' && isPublicSignalFunction(node)) return;
      if (hasExemptDecorator(node)) return;
      if (hasPairedAccessorWithExemptDecorator(node)) return;
      if (exemptInterfaceMethods && exemptInterfaceMethods.has(memberName)) return;

      const usedInTemplate = isUsedInTemplate(memberName, preprocessedTemplate);
      const usedInClass = isUsedInClassCode(memberName, currentComponentClass, node);

      if (usedInTemplate && !usedInClass) {
        context.report({
          node,
          messageId: 'shouldBeProtected',
          data: { name: memberName },
          fix(fixer) {
            return createProtectedFix(node, fixer);
          },
        });
      }
    }

    function enterComponentClass(node) {
      if (isComponentClass(node)) {
        currentComponentClass = node;
        preprocessedTemplate = collectTemplateIdentifiers(
          preprocessTemplate(getTemplateContent(node))
        );
        exemptInterfaceMethods = buildExemptMethodNames(node);
        if (!preprocessedSource) {
          preprocessedSource = preprocessSourceText();
          thisReferences = collectThisReferences();
        }
      }
    }

    function exitComponentClass(node) {
      if (node === currentComponentClass) {
        currentComponentClass = null;
        preprocessedTemplate = null;
        exemptInterfaceMethods = null;
      }
    }

    const listeners = {
      'ClassDeclaration[decorators]': enterComponentClass,
      'ClassDeclaration:exit': exitComponentClass,
      'ClassExpression[decorators]': enterComponentClass,
      'ClassExpression:exit': exitComponentClass,

      PropertyDefinition: checkMember,
      MethodDefinition: checkMember,
    };

    return listeners;
  },
};
