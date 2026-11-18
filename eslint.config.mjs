import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const code = '**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}';
const reactCode = ['src/**/*.{js,jsx,ts,tsx}', 'tests/**/*.{js,jsx,mjs,cjs,ts,tsx}'];

export default defineConfig(
  globalIgnores(['dist/', 'coverage/', 'playwright-report/', 'test-results/', '.cali-db-schema.local/']),
  {
    files: [code],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
    plugins: { import: importPlugin, 'unused-imports': unusedImports },
    rules: {
      'import/no-anonymous-default-export': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-assertions': ['error', {
        assertionStyle: 'as',
        objectLiteralTypeAssertions: 'never',
        arrayLiteralTypeAssertions: 'never',
      }],
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['error', {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'all',
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      'no-alert': 'error',
      'no-restricted-syntax': ['error',
        {
          selector: 'TSUnknownKeyword',
          message: 'Avoid `unknown`; model the boundary with explicit types, guards, or typed decoders.',
        },
        {
          selector: "CallExpression[callee.object.object.name='window'][callee.object.property.name='location'][callee.property.name='reload']",
          message: 'Avoid full reload; prefer query invalidation/state refresh.',
        },
        {
          selector: "JSXAttribute[name.name='key'] > JSXExpressionContainer > Identifier[name=/^(index|idx|i)$/]",
          message: 'Avoid array index React keys in mutable lists; use a stable row/domain id.',
        },
        {
          selector: "JSXAttribute[name.name='key'] JSXExpressionContainer TemplateLiteral Identifier[name=/^(index|idx|i)$/]",
          message: 'Avoid array index React keys in mutable lists; use a stable row/domain id.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}', 'public/**/*.js', 'tests/**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['scripts/check-*.cjs', 'scripts/verify-workspace-visual-migration.cjs'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['**/*.{cjs,cts}'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['supabase/functions/**/*.{js,ts}'],
    languageOptions: { globals: { ...globals.browser, Deno: 'readonly', EdgeRuntime: 'readonly' } },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    extends: [react.configs.flat.recommended, react.configs.flat['jsx-runtime']],
    plugins: { 'jsx-a11y': jsxA11y },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/jsx-no-target-blank': 'off',
      'react/no-unknown-property': 'off',
      'react/no-unsafe': 'off',
      'react/prop-types': 'off',
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/aria-proptypes': 'warn',
      'jsx-a11y/aria-unsupported-elements': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/role-supports-aria-props': 'warn',
    },
  },
  {
    files: reactCode,
    extends: [reactHooks.configs.flat.recommended],
    rules: {
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['tests/**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'no-empty-pattern': 'off',
      'no-useless-assignment': 'off',
    },
  },
);
