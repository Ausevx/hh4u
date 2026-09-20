# Milestone M4: Scaffolding & Toolchain Architecture Report

## 1. Observation

Direct observations from examining the codebase, specifications, and environment:

1. **Working Directory & Agent Target**:
   - Agent working directory: `/Users/aditya/workspace/hh4u/.agents/explorer_m4_scaffold/`.
   - Admin Panel target root: `/Users/aditya/workspace/hh4u/admin-panel/`.
   - Dispatch instruction in `DISPATCH.md` lines 16-24:
     > "3. Design the scaffolding for React + Vite + TypeScript + Tailwind CSS in `admin-panel/`:
     >    - `package.json` with scripts (`dev`, `build`, `preview`), dependencies (`react`, `react-dom`, `lucide-react`, `clsx`, `tailwind-merge`), and devDependencies (`vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`, `@types/react`, `@types/react-dom`).
     >    - `vite.config.ts` configured with proxy to backend (`http://localhost:5000` for `/api`).
     >    - `tsconfig.json` and `tsconfig.node.json` tailored for React + Vite.
     >    - `tailwind.config.js` and `postcss.config.js` configured with 'Trusted Teal' color theme per requirements.
     >    - `index.html` with title and root div.
     >    - Verification command for production build: `npm run build` resulting in clean `dist/`."

2. **Current `admin-panel/` File Tree**:
   - Existing structure: `admin-panel/src/components/`, `admin-panel/src/contexts/`, `admin-panel/src/pages/`, `admin-panel/src/services/`.
   - All subdirectories are currently empty. No `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, or entry point files exist yet.

3. **Backend API Contract and Mounting**:
   - Inspected `backend/src/app.ts:26`: `app.use('/api/admin', adminRoutes);`.
   - Inspected `backend/src/index.ts:4`: `const port = process.env.PORT || 5000;`.
   - Inspected `backend/src/routes/adminRoutes.ts:12-37`:
     - `POST /api/admin/auth/login` (admin credential auth)
     - `GET /api/admin/auth/me`
     - `GET /api/admin/stats`
     - `GET /api/admin/knowledge-base` (listing with `search`, `page`, `limit`)
     - `GET /api/admin/knowledge-base/:id`
     - `POST /api/admin/knowledge-base`
     - `PUT /api/admin/knowledge-base/:id`
     - `DELETE /api/admin/knowledge-base/:id`
     - `POST /api/admin/knowledge-base/import` (multipart `.xlsx` upload)
   - Proxy configuration in Vite must route `/api` to `http://localhost:5000` to prevent CORS issues during development.

4. **Runtime & Toolchain Versions**:
   - `node -v` output: `v25.2.1`.
   - `npm -v` output: `11.6.2`.
   - `backend/package.json:41` uses `"typescript": "^5.9.3"`.
   - Tailwind CSS v3 (`^3.4.17`) provides full standard support for `tailwind.config.js`, PostCSS plugins (`postcss`, `autoprefixer`), and class-based theme extension.

5. **"Trusted Teal" Design Tokens**:
   - Inspected `app/src/main/java/com/healinghands4u/presentation/theme/Color.kt:12-33`:
     - Light Mode:
       - `LightBg = Color(0xFFFFFFFF)` (`#FFFFFF`)
       - `LightSurface = Color(0xFFF7F9FB)` (`#F7F9FB`)
       - `LightSurfaceTint = Color(0xFFEAF5F6)` (`#EAF5F6`)
       - `LightInk = Color(0xFF0F2027)` (`#0F2027`)
       - `LightInkDim = Color(0xFF5C7480)` (`#5C7480`)
       - `LightAccent = Color(0xFF0E7C86)` (`#0E7C86` - Primary Trusted Teal)
       - `LightAccentInk = Color(0xFFFFFFFF)` (`#FFFFFF`)
       - `LightLine = Color(0x140F2027)` (`rgba(15, 32, 39, 0.08)`)
       - `LightWarnBg = Color(0xFFFFF0EC)` (`#FFF0EC`)
       - `LightWarnInk = Color(0xFFA14A2A)` (`#A14A2A`)
     - Dark Mode:
       - `DarkBg = Color(0xFF0A1418)` (`#0A1418`)
       - `DarkSurface = Color(0xFF101E22)` (`#101E22`)
       - `DarkSurfaceTint = Color(0x1A2DD4C8)` (`rgba(45, 212, 200, 0.10)`)
       - `DarkInk = Color(0xFFE7F1F3)` (`#E7F1F3`)
       - `DarkInkDim = Color(0xFF7E97A0)` (`#7E97A0`)
       - `DarkAccent = Color(0xFF2DD4C8)` (`#2DD4C8`)
       - `DarkAccentInk = Color(0xFF04211E)` (`#04211E`)
       - `DarkLine = Color(0x1AE7F1F3)` (`rgba(231, 241, 243, 0.10)`)
       - `DarkWarnBg = Color(0x24E67E22)` (`rgba(230, 126, 34, 0.14)`)
       - `DarkWarnInk = Color(0xFFF0B074)` (`#F0B074`)
     - Universal Action Colors:
       - WhatsApp Green: `#25D366`
       - Phone Blue: `#1976D2`
     - Typography (from PRD v3 & `ORIGINAL_REQUEST.md:77`):
       - Headings: `Sora`
       - Body: `IBM Plex Sans`

6. **Project Scope & Architecture Constraints**:
   - `PROJECT.md:16-23`:
     - React + Vite + TypeScript SPA located in `admin-panel/`.
     - Tailwind CSS design system with "Trusted Teal" color palette.
     - Client-side routing with `ProtectedRoute` redirecting unauthenticated users to `/login`.
     - Dashboard with KPI stats, searchable & paginated knowledge base table, expandable diagnostic query & remedy details, Add/Edit/Delete modals, and drag-and-drop `.xlsx` uploader.

---

## 2. Logic Chain

1. **Toolchain Foundation**:
   - Given Node v25 and npm v11, Vite 5.4.x combined with `@vitejs/plugin-react` provides sub-second HMR and deterministic production rollups.
   - Using React 18.3.1 guarantees compatibility with UI libraries (`lucide-react`, `clsx`, `tailwind-merge`) and routing (`react-router-dom`), avoiding React 19 canary peer-dependency warnings.
   - Typescript 5.7+ enables bundler module resolution (`"moduleResolution": "bundler"`) and strict type checks.

2. **Vite Development Proxy**:
   - The backend runs on `http://localhost:5000` exposing `/api/admin/*`.
   - Configuring `vite.config.ts` with:
     ```ts
     proxy: {
       '/api': {
         target: 'http://localhost:5000',
         changeOrigin: true,
         secure: false,
       }
     }
     ```
     allows all frontend calls to `/api/admin/...` to work transparently in development without requiring cross-origin headers or hardcoded backend port numbers.
   - Adding `@` path alias resolving to `path.resolve(__dirname, './src')` enables clean module imports across `components/`, `pages/`, `services/`, and `contexts/`.

3. **Design System & Theme Integration**:
   - `tailwind.config.js` must extend the color palette with the exact PRD tokens identified in `Color.kt` under the `trusted` namespace.
   - Fonts `Sora` and `IBM Plex Sans` must be imported in `index.html` via Google Fonts CDN, and mapped into `theme.extend.fontFamily`.
   - Setting `darkMode: 'class'` supports both light and dark mode surfaces specified in the PRD.
   - Including `clsx` and `tailwind-merge` with a standard `cn()` utility (`src/utils/cn.ts`) allows safe dynamic Tailwind class merging across modals and UI components.

4. **Production Build Verification**:
   - The build pipeline must run `tsc -b && vite build` so that type errors break the build before emitting bundles.
   - A clean production build must output static HTML, JS, and CSS to `dist/`, verified with zero compilation warnings, exit code 0, and preview capability via `vite preview`.

---

## 3. Caveats

1. **Read-Only Explorer Scope**:
   - In accordance with the Teamwork Explorer protocol, this report provides the blueprint, complete configuration templates, and verification strategy. The actual creation and execution of files in `admin-panel/` will be performed by the implementation worker.
2. **Backend Dependency for Live E2E**:
   - In development mode, proxying `/api` requires the backend server running on port 5000 (`npm run dev` in `backend/`). The production build itself (`npm run build`) is fully static and does not require a running backend.
3. **Tailwind CSS Major Version**:
   - Tailwind CSS v3.4.x is chosen over Tailwind v4.0 alpha/beta because v3.4 uses standard `tailwind.config.js` and PostCSS plugins, fulfilling the explicit requirement in `DISPATCH.md`.

---

## 4. Conclusion & Complete Scaffold Specifications

The following 10 configuration and foundation files constitute the exact scaffolding for `admin-panel/`:

### File 1: `admin-panel/package.json`
```json
{
  "name": "admin-panel",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "tsc --noEmit",
    "preview": "vite preview"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "lucide-react": "^0.475.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.2",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@types/node": "^22.13.4",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vite": "^5.4.14"
  }
}
```

### File 2: `admin-panel/vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
```

### File 3: `admin-panel/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolvePackageJsonExports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path Aliasing */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### File 4: `admin-panel/tsconfig.node.json`
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

### File 5: `admin-panel/tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Trusted Teal Medical Theme Design Tokens
        trusted: {
          accent: {
            DEFAULT: '#0E7C86',
            hover: '#0B646D',
            light: '#EAF5F6',
            dark: '#2DD4C8',
            darkInk: '#04211E',
          },
          bg: {
            DEFAULT: '#FFFFFF',
            dark: '#0A1418',
          },
          surface: {
            DEFAULT: '#F7F9FB',
            tint: '#EAF5F6',
            dark: '#101E22',
            darkTint: 'rgba(45, 212, 200, 0.10)',
          },
          ink: {
            DEFAULT: '#0F2027',
            dim: '#5C7480',
            dark: '#E7F1F3',
            darkDim: '#7E97A0',
          },
          line: {
            DEFAULT: 'rgba(15, 32, 39, 0.08)',
            dark: 'rgba(231, 241, 243, 0.10)',
          },
          warn: {
            bg: '#FFF0EC',
            ink: '#A14A2A',
            darkBg: 'rgba(230, 126, 34, 0.14)',
            darkInk: '#F0B074',
          },
          whatsapp: '#25D366',
          phone: '#1976D2',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['"Sora"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(15, 32, 39, 0.05), 0 1px 2px -1px rgba(15, 32, 39, 0.05)',
        modal: '0 20px 25px -5px rgba(15, 32, 39, 0.1), 0 8px 10px -6px rgba(15, 32, 39, 0.1)',
      },
    },
  },
  plugins: [],
};
```

### File 6: `admin-panel/postcss.config.js`
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### File 7: `admin-panel/index.html`
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Healing Hands4U - Admin Portal</title>
    <!-- Google Fonts: Sora (Headings) & IBM Plex Sans (Body) -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Sora:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body class="bg-trusted-surface text-trusted-ink font-sans antialiased min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### File 8: `admin-panel/src/index.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-trusted-surface text-trusted-ink font-sans;
    margin: 0;
    padding: 0;
  }

  h1, h2, h3, h4, h5, h6 {
    @apply font-heading;
  }
}
```

### File 9: `admin-panel/src/vite-env.d.ts`
```typescript
/// <reference types="vite/client" />
```

### File 10: `admin-panel/src/utils/cn.ts`
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### File 11: `admin-panel/src/main.tsx`
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### File 12: `admin-panel/src/App.tsx` (Initial Scaffold Mount)
```tsx
import React from 'react';
import { BrowserRouter } from 'react-router-dom';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-trusted-surface flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-card border border-trusted-line p-8">
          <div className="w-16 h-16 bg-trusted-surface-tint rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-trusted-accent">H4U</span>
          </div>
          <h1 className="text-2xl font-bold text-trusted-ink mb-2">Healing Hands4U</h1>
          <p className="text-sm text-trusted-ink-dim mb-6">
            Admin Knowledge Base Portal & Ingestion System
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-trusted-accent text-white font-medium text-sm rounded-lg hover:bg-trusted-accent-hover transition-colors">
            Scaffolding Ready
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}
```

---

## 5. Verification Method

To verify the scaffolding independently:

### Step 1: Install Dependencies
```bash
cd /Users/aditya/workspace/hh4u/admin-panel
npm install
```
*Expected Outcome*: Successful installation of all dependencies, `node_modules` populated, `package-lock.json` generated with 0 critical errors.

### Step 2: TypeScript Compilation Check
```bash
cd /Users/aditya/workspace/hh4u/admin-panel
npx tsc --noEmit
```
*Expected Outcome*: Clean exit code 0 with no syntax or type errors.

### Step 3: Production Build
```bash
cd /Users/aditya/workspace/hh4u/admin-panel
npm run build
```
*Expected Outcome*:
- Command exits with code 0.
- `dist/` directory created with:
  - `dist/index.html`
  - `dist/assets/*.js`
  - `dist/assets/*.css`
- Verified by:
  ```bash
  test -f /Users/aditya/workspace/hh4u/admin-panel/dist/index.html && echo "BUILD VERIFIED"
  ```

### Step 4: Preview Server Verification
```bash
cd /Users/aditya/workspace/hh4u/admin-panel
npm run preview -- --port 4173 &
PID=$!
sleep 2
curl -I http://localhost:4173
kill $PID
```
*Expected Outcome*: HTTP `200 OK` header returned.

### Invalidation Conditions
- Missing or incompatible TypeScript compiler settings causing `@/*` alias resolution failures.
- Missing Tailwind directives leading to unstyled UI.
- Broken Vite proxy resulting in HTTP 404 or CORS errors when hitting `/api` endpoints.
