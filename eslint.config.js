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
        // Browser globals
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        location: 'readonly',
        navigator: 'readonly',
        history: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        crypto: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        // DOM types
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLOptionElement: 'readonly',
        HTMLImageElement: 'readonly',
        HTMLAnchorElement: 'readonly',
        HTMLHeadingElement: 'readonly',
        HTMLParagraphElement: 'readonly',
        HTMLSpanElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLVideoElement: 'readonly',
        HTMLAudioElement: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        FocusEvent: 'readonly',
        TouchEvent: 'readonly',
        // Node.js types
        NodeJS: 'readonly',
        Buffer: 'readonly',
        // Web APIs
        ResizeObserver: 'readonly',
        IntersectionObserver: 'readonly',
        MutationObserver: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        getComputedStyle: 'readonly',
        // More DOM types
        HTMLTableElement: 'readonly',
        HTMLTableCaptionElement: 'readonly',
        HTMLTableRowElement: 'readonly',
        HTMLTableCellElement: 'readonly',
        HTMLTableSectionElement: 'readonly',
        HTMLLabelElement: 'readonly',
        HTMLFieldSetElement: 'readonly',
        HTMLLegendElement: 'readonly',
        HTMLOptGroupElement: 'readonly',
        HTMLDataListElement: 'readonly',
        HTMLOutputElement: 'readonly',
        HTMLProgressElement: 'readonly',
        HTMLMeterElement: 'readonly',
        HTMLDetailsElement: 'readonly',
        HTMLSummaryElement: 'readonly',
        // React (for files that use React without import)
        React: 'readonly',
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