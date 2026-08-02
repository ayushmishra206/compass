import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist',
      '.output',
      'coverage',
      'node_modules',
      'web/',
      'packages/*/dist',
      // Reference JSX/TS extracted from design bundles (via scripts/extract-design-bundle.mjs)
      // — uses Babel-only globals (React, window.MOCK, window.__resources) that fail normal lint.
      'docs/superpowers/specs/',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        // WXT auto-imports
        defineBackground: 'readonly',
        defineContentScript: 'readonly',
        defineUnlistedScript: 'readonly',
        definePopup: 'readonly',
        defineOptions: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslintPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...typescriptEslintPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...prettier.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-undef': 'off', // TypeScript handles undefined identifiers
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [
      'packages/core/src/crypto/credentials.ts',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.property.name='local'] Literal[value=/llm\\.creds/]",
          message:
            'Use getActiveCredentials() from @compass/core/crypto instead of direct chrome.storage.local access.',
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [
      'packages/core/src/profile/userProfile.ts',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.property.name='local'] Literal[value=/profile\\.user/]",
          message:
            'Use getUserProfile() / setUserProfile() from @compass/core/profile instead of direct chrome.storage.local access.',
        },
      ],
    },
  },
  // Design-system guardrail: no direct `style={{ color: ... }}` in shell or
  // drawer components. Color decisions must go through @compass/ui's <Text>,
  // <OverlayText>, <Pill> primitives so the canonical ink-ladder + accent
  // tokens stay consistent — see PR #11's contrast bugs and the UI primitives
  // refactor plan at docs/superpowers/plans/2026-05-14-ui-design-system-refactor.md.
  // Scope: apps/extension/app/components/ + apps/extension/app/drawers/.
  // Exempt: packages/ui/** (primitives + UI components own color), test files.
  {
    files: [
      'apps/extension/app/components/**/*.{ts,tsx}',
      'apps/extension/app/drawers/**/*.{ts,tsx}',
    ],
    ignores: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // `color: 'inherit'` is exempt: it defers to the surrounding ink
          // tone rather than picking one, which is exactly what the rule wants.
          selector:
            "JSXAttribute[name.name='style'] ObjectExpression > Property[key.name='color']:not([value.value='inherit'])",
          message:
            "Don't set `color` inline. Use <Text variant tone> / <OverlayText> / <Pill tone> / <Ink tone> from @compass/ui — the ink ladder (primary/secondary/muted/dim/accent) is the only source of color for shell text.",
        },
      ],
    },
  },
  // Notes pipeline must not leak content into logs. Blocks console.{log,warn,...}
  // calls whose arguments reach into `.body`, `.title`, `.text`, `.context`,
  // `.answer`, `.rationale`, or `.query` member access. Scoped to notes
  // pipeline files; tests exempt.
  {
    files: [
      'apps/extension/entrypoints/offscreen/notes.ts',
      'apps/extension/entrypoints/offscreen/main.ts',
      'apps/extension/app/drawers/notes/**/*.{ts,tsx}',
      'apps/extension/app/drawers/NotesDrawer.tsx',
      'apps/extension/app/components/CmdK.tsx',
      'apps/extension/app/hooks/useNotes.ts',
      'packages/agents/src/notes.*.ts',
      'packages/db/src/repositories/notes.ts',
    ],
    ignores: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='console'][callee.property.name=/^(log|warn|error|info|debug)$/] MemberExpression[property.name=/^(body|title|text|context|answer|rationale|query)$/]",
          message:
            'Notes pipeline must not log content fields (body/title/text/context/answer/rationale/query). Strip content fields before logging.',
        },
      ],
    },
  },
];
