const { execSync, spawn } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Kill any existing process on port 4173
try {
  if (process.platform === 'darwin' || process.platform === 'linux') {
    execSync('lsof -ti:4173 | xargs kill -9 2>/dev/null || true');
  }
} catch {}

// Start vite preview
const preview = spawn('npx', ['vite', 'preview', '--port', '4173'], {
  cwd: ROOT,
  stdio: 'pipe',
  shell: true,
});

let electronStarted = false;

preview.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);

  if (!electronStarted && text.includes('localhost:4173')) {
    electronStarted = true;

    const electron = spawn(
      path.join(ROOT, 'node_modules', '.bin', 'electron'),
      [path.join(__dirname, 'main.cjs')],
      {
        cwd: ROOT,
        stdio: 'inherit',
        env: { ...process.env, ELECTRON_DEV: 'true', VITE_PREVIEW_PORT: '4173' },
      }
    );

    electron.on('close', () => {
      preview.kill();
      process.exit();
    });
  }
});

preview.stderr.on('data', (data) => {
  process.stderr.write(data);
});

preview.on('close', () => {
  if (!electronStarted) process.exit();
});
