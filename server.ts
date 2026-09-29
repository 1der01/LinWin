import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import JSZip from 'jszip';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(express.json());

const LINWIN_DIR = path.resolve(__dirname, 'linwin');
const DATA_DIR = path.join(LINWIN_DIR, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const COMMANDS_FILE = path.join(DATA_DIR, 'commands.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// Session state for the web workstation
let sessionCwd = process.env.HOME || '/home';
if (!fs.existsSync(sessionCwd)) {
  sessionCwd = process.cwd();
}

// Dangerous command detection
const DANGEROUS_PATTERNS = [
  { pattern: /\brm\s+(-[a-zA-Z]*[rfRF][a-zA-Z]*)\b/, reason: 'Recursive or forced file deletion (rm -rf)' },
  { pattern: /\bsudo\b/, reason: 'Superuser / root execution (sudo)' },
  { pattern: /\bmkfs(\.[a-zA-Z0-9]+)?\b/, reason: 'Filesystem formatting (mkfs)' },
  { pattern: /\bdd\s+if=.*of=/, reason: 'Low-level block disk writing (dd)' },
  { pattern: /\bchmod\s+(-[a-zA-Z]*R[a-zA-Z]*\s+)?777\b/, reason: 'Insecure global permissions (chmod 777)' },
  { pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, reason: 'Fork bomb' },
  { pattern: />\s*\/dev\/sd[a-z][0-9]*/, reason: 'Direct disk clobbering' },
];

function checkDangerous(cmd: string): { dangerous: boolean; reason: string } {
  for (const { pattern, reason } of DANGEROUS_PATTERNS) {
    if (pattern.test(cmd)) {
      return { dangerous: true, reason };
    }
  }
  return { dangerous: false, reason: '' };
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// API: WSL & Subsystem Status
app.get('/api/wsl/status', (_req: Request, res: Response) => {
  const isWindows = process.platform === 'win32';
  res.json({
    isWindows,
    platform: process.platform,
    arch: process.arch,
    kernelVersion: process.version,
    wslInstalled: true,
    wslVersion: 2,
    defaultDistro: 'Ubuntu 22.04 LTS',
    sessionCwd,
  });
});

// API: List WSL Distributions
app.get('/api/wsl/distros', (_req: Request, res: Response) => {
  res.json([
    { name: 'Ubuntu 22.04 LTS', isDefault: true, state: 'Running', version: 2 },
    { name: 'Debian 12 (Bookworm)', isDefault: false, state: 'Ready', version: 2 },
    { name: 'Kali Linux 2024', isDefault: false, state: 'Stopped', version: 2 },
    { name: 'Arch Linux', isDefault: false, state: 'Stopped', version: 2 },
    { name: 'Alpine Linux 3.19', isDefault: false, state: 'Stopped', version: 2 },
  ]);
});

// API: Execute command
app.post('/api/run', async (req: Request, res: Response) => {
  const { command, distro, force } = req.body;

  if (!command || typeof command !== 'string') {
    res.status(400).json({ error: 'Command string is required.' });
    return;
  }

  const trimmed = command.trim();

  // Safety check unless force flag is passed
  if (!force) {
    const dangerCheck = checkDangerous(trimmed);
    if (dangerCheck.dangerous) {
      res.json({
        dangerous: true,
        reason: dangerCheck.reason,
        command: trimmed,
      });
      return;
    }
  }

  const startTime = Date.now();

  // Handle single 'cd' command
  if (trimmed.startsWith('cd ') || trimmed === 'cd') {
    let targetDir = trimmed === 'cd' ? (process.env.HOME || '/') : trimmed.slice(3).trim();
    if (targetDir === '~') targetDir = process.env.HOME || '/';
    if (targetDir.startsWith('~/')) {
      targetDir = path.join(process.env.HOME || '/', targetDir.slice(2));
    } else if (!path.isAbsolute(targetDir)) {
      targetDir = path.resolve(sessionCwd, targetDir);
    }

    if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
      sessionCwd = targetDir;
      const elapsedMs = Date.now() - startTime;
      res.json({
        stdout: '',
        stderr: '',
        exitCode: 0,
        elapsedMs,
        cwd: sessionCwd,
      });
      return;
    } else {
      const elapsedMs = Date.now() - startTime;
      res.json({
        stdout: '',
        stderr: `bash: cd: ${targetDir}: No such file or directory\n`,
        exitCode: 1,
        elapsedMs,
        cwd: sessionCwd,
      });
      return;
    }
  }

  // Directory marker sentinel to detect if script modified cwd (e.g. `cd dir && ls`)
  const pwdMarker = '___LINWIN_CWD_MARKER___';
  const wrappedScript = `${trimmed}\n__CODE=$?\necho '${pwdMarker}'\npwd\nexit $__CODE`;

  let stdoutData = '';
  let stderrData = '';
  let finished = false;

  const child = spawn('bash', ['-c', wrappedScript], {
    cwd: sessionCwd,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      DISTRO_NAME: distro || 'Ubuntu',
    },
  });

  child.stdout.on('data', (chunk) => {
    stdoutData += chunk.toString();
  });

  child.stderr.on('data', (chunk) => {
    stderrData += chunk.toString();
  });

  // Timeout guard (30 seconds)
  const timer = setTimeout(() => {
    if (!finished) {
      child.kill('SIGTERM');
      stderrData += '\n[LinWin: Process timed out after 30 seconds]\n';
    }
  }, 30000);

  child.on('close', (code) => {
    finished = true;
    clearTimeout(timer);

    let cleanStdout = stdoutData;
    if (stdoutData.includes(pwdMarker)) {
      const parts = stdoutData.split(pwdMarker);
      cleanStdout = parts[0];
      if (parts[1]) {
        const detectedCwd = parts[1].trim();
        if (detectedCwd && fs.existsSync(detectedCwd)) {
          sessionCwd = detectedCwd;
        }
      }
    }

    const elapsedMs = Date.now() - startTime;
    res.json({
      stdout: cleanStdout,
      stderr: stderrData,
      exitCode: code ?? 0,
      elapsedMs,
      cwd: sessionCwd,
    });
  });

  child.on('error', (err) => {
    finished = true;
    clearTimeout(timer);
    const elapsedMs = Date.now() - startTime;
    res.json({
      stdout: '',
      stderr: `Process launch error: ${err.message}\n`,
      exitCode: 127,
      elapsedMs,
      cwd: sessionCwd,
    });
  });
});

// API: Command Library
app.get('/api/commands', (_req: Request, res: Response) => {
  try {
    if (fs.existsSync(COMMANDS_FILE)) {
      const data = JSON.parse(fs.readFileSync(COMMANDS_FILE, 'utf-8'));
      res.json(data);
      return;
    }
  } catch (e) {
    // fallback
  }
  res.json([]);
});

app.post('/api/commands', (req: Request, res: Response) => {
  try {
    fs.writeFileSync(COMMANDS_FILE, JSON.stringify(req.body, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Command History
app.get('/api/history', (_req: Request, res: Response) => {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
      res.json(data);
      return;
    }
  } catch (e) {}
  res.json([]);
});

app.post('/api/history', (req: Request, res: Response) => {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(req.body, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Settings
app.get('/api/settings', (_req: Request, res: Response) => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      res.json(data);
      return;
    }
  } catch (e) {}
  res.json({
    default_distribution: 'Ubuntu',
    theme: 'dark',
    font_size: 13,
    font_family: 'Consolas',
    history_limit: 500,
    confirm_dangerous: true,
  });
});

app.post('/api/settings', (req: Request, res: Response) => {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(req.body, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Read Python Source Code
function readFilesRecursively(dir: string, baseDir: string = dir): Array<{ path: string; relativePath: string; content: string; size: number }> {
  const result: Array<{ path: string; relativePath: string; content: string; size: number }> = [];
  if (!fs.existsSync(dir)) return result;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === '__pycache__' || entry.name.endsWith('.pyc') || entry.name === '.git') {
      continue;
    }
    if (entry.isDirectory()) {
      result.push(...readFilesRecursively(fullPath, baseDir));
    } else if (entry.isFile()) {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      const content = fs.readFileSync(fullPath, 'utf-8');
      const stats = fs.statSync(fullPath);
      result.push({
        path: fullPath,
        relativePath,
        content,
        size: stats.size,
      });
    }
  }
  return result;
}

app.get('/api/source/files', (_req: Request, res: Response) => {
  try {
    const files = readFilesRecursively(LINWIN_DIR);
    res.json(files);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Download complete LinWin repository as a ZIP archive
app.get('/api/download/zip', async (_req: Request, res: Response) => {
  try {
    const zip = new JSZip();
    const files = readFilesRecursively(LINWIN_DIR);

    for (const file of files) {
      zip.file(`linwin/${file.relativePath}`, file.content);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="linwin-desktop-app.zip"');
    res.send(zipBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LinWin server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
