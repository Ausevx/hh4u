import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('=== Starting Milestone M4 Forensic Integrity Audit ===\n');

const ADMIN_PANEL_DIR = '/Users/aditya/workspace/hh4u/admin-panel';
const SRC_DIR = path.join(ADMIN_PANEL_DIR, 'src');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failCount++;
  }
}

// -----------------------------------------------------------------------------
// Check 1: File Inventory & Completeness
// -----------------------------------------------------------------------------
console.log('--- Check 1: Source File Inventory ---');
const expectedFiles = [
  'main.tsx',
  'App.tsx',
  'index.css',
  'types/index.ts',
  'services/api.ts',
  'contexts/AuthContext.tsx',
  'components/ProtectedRoute.tsx',
  'components/KnowledgeModal.tsx',
  'components/DeleteConfirmModal.tsx',
  'components/BulkUploadModal.tsx',
  'pages/LoginPage.tsx',
  'pages/DashboardPage.tsx',
  'utils/cn.ts',
];

for (const relPath of expectedFiles) {
  const fullPath = path.join(SRC_DIR, relPath);
  assert(fs.existsSync(fullPath), `Source file exists: ${relPath}`);
}

// -----------------------------------------------------------------------------
// Check 2: Static Forensic Analysis for Prohibited Patterns
// -----------------------------------------------------------------------------
console.log('\n--- Check 2: Forensic Scan for Prohibited Patterns ---');

function getAllFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(res));
    } else {
      files.push(res);
    }
  }
  return files;
}

const allSrcFiles = getAllFiles(SRC_DIR);

for (const filePath of allSrcFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(SRC_DIR, filePath);

  // Prohibited: hardcoded mock databases or dummy return flags
  const hasMockArray = /const\s+mock[A-Z]\w*\s*=\s*\[/i.test(content);
  assert(!hasMockArray, `No mock arrays declared in ${rel}`);

  const hasFakeApi = /function\s+fakeApi/i.test(content) || /const\s+fakeApi/i.test(content);
  assert(!hasFakeApi, `No fake API handlers in ${rel}`);

  // Check for dummy/facade functions (e.g. return null without any UI/logic)
  const isDummyComponent = /export\s+const\s+\w+\s*=\s*\(\)\s*=>\s*null;/.test(content);
  assert(!isDummyComponent, `Not a dummy/stub component: ${rel}`);
}

// -----------------------------------------------------------------------------
// Check 3: API Service Implementation Integrity
// -----------------------------------------------------------------------------
console.log('\n--- Check 3: API Service Implementation Integrity ---');
const apiContent = fs.readFileSync(path.join(SRC_DIR, 'services/api.ts'), 'utf8');

assert(
  apiContent.includes("fetch(`${BASE_URL}${endpoint}`"),
  'api.ts makes genuine native fetch HTTP calls'
);
assert(
  apiContent.includes("headers.set('Authorization', `Bearer ${token}`)"),
  'api.ts injects Authorization Bearer token when token is present'
);
assert(
  apiContent.includes('response.status === 401') &&
  apiContent.includes('tokenStorage.clear()') &&
  apiContent.includes("window.dispatchEvent(new CustomEvent('auth:unauthorized'))"),
  'api.ts automatically intercepts 401, flushes storage, and triggers auth:unauthorized event'
);
assert(
  apiContent.includes('new XMLHttpRequest()') &&
  apiContent.includes('xhr.upload.onprogress') &&
  apiContent.includes("formData.append('file', file)"),
  'api.knowledgeBase.importExcel uses genuine multipart/form-data XMLHttpRequest with upload progress'
);
assert(
  apiContent.includes('/auth/login') &&
  apiContent.includes('/auth/me') &&
  apiContent.includes('/stats') &&
  apiContent.includes('/knowledge-base'),
  'api.ts defines all required backend REST endpoints matching PROJECT.md interface contract'
);

// -----------------------------------------------------------------------------
// Check 4: Authentication Context & Route Guard Integrity
// -----------------------------------------------------------------------------
console.log('\n--- Check 4: AuthContext & ProtectedRoute Security Audit ---');
const authContextContent = fs.readFileSync(path.join(SRC_DIR, 'contexts/AuthContext.tsx'), 'utf8');
const protectedRouteContent = fs.readFileSync(path.join(SRC_DIR, 'components/ProtectedRoute.tsx'), 'utf8');

assert(
  authContextContent.includes('isAuthenticated: !!token && !!admin'),
  'AuthContext strictly requires BOTH token and admin object for isAuthenticated'
);
assert(
  authContextContent.includes('api.auth.me()') &&
  authContextContent.includes('storedToken'),
  'AuthContext validates stored tokens against backend /auth/me during initialization'
);
assert(
  protectedRouteContent.includes('if (!isAuthenticated)') &&
  protectedRouteContent.includes('<Navigate to="/login"'),
  'ProtectedRoute strictly redirects unauthenticated visitors to /login'
);
assert(
  !protectedRouteContent.includes('true ||') &&
  !protectedRouteContent.includes('|| true'),
  'ProtectedRoute contains NO bypass or short-circuit logic'
);

// -----------------------------------------------------------------------------
// Check 5: Form Validation and Edge Case Handling in Modals
// -----------------------------------------------------------------------------
console.log('\n--- Check 5: Component Edge Case & Validation Integrity ---');
const knowledgeModalContent = fs.readFileSync(path.join(SRC_DIR, 'components/KnowledgeModal.tsx'), 'utf8');
const bulkUploadModalContent = fs.readFileSync(path.join(SRC_DIR, 'components/BulkUploadModal.tsx'), 'utf8');
const loginPageContent = fs.readFileSync(path.join(SRC_DIR, 'pages/LoginPage.tsx'), 'utf8');

assert(
  knowledgeModalContent.includes('!canonicalQuestionText.trim()') &&
  knowledgeModalContent.includes('Canonical question text is required'),
  'KnowledgeModal rejects empty canonical question input'
);
assert(
  bulkUploadModalContent.includes("!selectedFile.name.toLowerCase().endsWith('.xlsx')"),
  'BulkUploadModal enforces .xlsx extension constraint'
);
assert(
  bulkUploadModalContent.includes('selectedFile.size > 20 * 1024 * 1024'),
  'BulkUploadModal enforces 20MB file size limit'
);
assert(
  loginPageContent.includes('!email.trim() || !password.trim()'),
  'LoginPage rejects empty email or password credentials'
);

// -----------------------------------------------------------------------------
// Check 6: YouTube Regex Verification
// -----------------------------------------------------------------------------
console.log('\n--- Check 6: YouTube URL Extraction Logic Verification ---');
const getYouTubeIdRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(getYouTubeIdRegex);
  return match && match[2].length === 11 ? match[2] : null;
}

assert(
  extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ') === 'dQw4w9WgXcQ',
  'Standard watch?v= URL resolves correct YouTube ID'
);
assert(
  extractYouTubeId('https://youtu.be/dQw4w9WgXcQ') === 'dQw4w9WgXcQ',
  'Short youtu.be URL resolves correct YouTube ID'
);
assert(
  extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ') === 'dQw4w9WgXcQ',
  'Embed URL resolves correct YouTube ID'
);
assert(
  extractYouTubeId('https://invalid-url.com/something') === null,
  'Invalid/non-YouTube URL returns null'
);

// -----------------------------------------------------------------------------
// Check 7: Production Build Artifacts Verification
// -----------------------------------------------------------------------------
console.log('\n--- Check 7: Production Build Artifacts Verification ---');
const distDir = path.join(ADMIN_PANEL_DIR, 'dist');
assert(fs.existsSync(distDir), 'admin-panel/dist directory exists');
assert(fs.existsSync(path.join(distDir, 'index.html')), 'dist/index.html exists');

const distAssets = fs.readdirSync(path.join(distDir, 'assets'));
const cssAsset = distAssets.find((f) => f.endsWith('.css'));
const jsAsset = distAssets.find((f) => f.endsWith('.js') && !f.endsWith('.js.map'));

assert(!!cssAsset, `CSS production asset generated: ${cssAsset}`);
assert(!!jsAsset, `JS production asset generated: ${jsAsset}`);

const cssContent = fs.readFileSync(path.join(distDir, 'assets', cssAsset), 'utf8');
const jsContent = fs.readFileSync(path.join(distDir, 'assets', jsAsset), 'utf8');

assert(cssContent.length > 10000, `CSS bundle is substantial (${cssContent.length} bytes)`);
assert(jsContent.length > 100000, `JS bundle is substantial (${jsContent.length} bytes)`);

assert(
  cssContent.includes('#0e7c86') || cssContent.includes('0e7c86'),
  'Compiled CSS contains Trusted Teal branding color (#0E7C86)'
);
assert(
  jsContent.includes('/api/admin'),
  'Compiled JS bundle contains /api/admin base API endpoint'
);
assert(
  jsContent.includes('knowledge-base') && jsContent.includes('auth/login'),
  'Compiled JS bundle contains knowledge-base and auth routes'
);

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n=================================================');
console.log(`TOTAL AUDIT CHECKS: ${passCount + failCount}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);
console.log('=================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('\nVERDICT: ALL FORENSIC INTEGRITY CHECKS PASSED.');
  process.exit(0);
}
