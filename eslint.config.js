// @ts-check
import eslint from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  // Base configurations
  eslint.configs.recommended,
  
  // Global configuration
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // TypeScript recommended rules
      ...typescriptEslint.configs.recommended.rules,
      
      // React rules
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      
      // Custom TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-console': 'off',
      'prefer-const': 'warn',
    },
  },
  
  // Frontend-specific configuration
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
      },
    },
  },
  
  // Backend-specific configuration  
  {
    files: ['backend/**/*.ts'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      // Backend permite mais uso de any em alguns casos
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off',
    },
  },
  
  // Ignored patterns
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'build/**',
      '*.config.js',
      'vite.config.ts',
      'postcss.config.js',
      'tailwind.config.js',
      // Ignorar TODOS os arquivos que não sejam do projeto principal
      '*.cjs',
      '*.js',
      '!src/**',
      '!backend/src/**',
      '*.md',
      'backup/**',
      'supabase/**',
      'scripts/**',
      'backend/dist/**',
      'backend/*.js',
      'test-*',
      'debug-*',
      'verify-*',
      'apply-*',
      'fix-*',
      'quick-*',
    ],
  }
];