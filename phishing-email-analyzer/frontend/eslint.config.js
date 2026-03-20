// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const globals = require('globals');
const eslintConfigPrettier = require('eslint-config-prettier');
/** @type {any} */
const preferProtectedTemplateMembersRule = require('./tools/local-eslint-rules/prefer-protected-template-members/prefer-protected-template-members');

module.exports = defineConfig([
  {
    ignores: [
      '.angular/**',
      'coverage/**',
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'tools/**',
      'test-results/**',
    ],
  },
  {
    files: ['src/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
      eslintConfigPrettier,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      local: {
        rules: {
          'prefer-protected-template-members': preferProtectedTemplateMembersRule,
        },
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': 'off',
      '@angular-eslint/directive-selector': 'off',
      '@angular-eslint/prefer-inject': 'off',
      'local/prefer-protected-template-members': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/**/*.spec.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['e2e/**/*.ts', 'playwright.config.ts'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended, eslintConfigPrettier],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
      eslintConfigPrettier,
    ],
    rules: {
      '@angular-eslint/template/elements-content': 'off',
      '@angular-eslint/template/prefer-control-flow': 'off',
    },
  },
]);
