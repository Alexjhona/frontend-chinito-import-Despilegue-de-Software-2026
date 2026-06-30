import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const appUrl = process.env.K6_TARGET_URL || 'http://127.0.0.1:4200';
const serverStartupTimeoutMs = 120_000;
let serverOutput = '';

function npxCommand(args) {
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', `npx ${args.join(' ')}`],
    };
  }

  return {
    command: 'npx',
    args,
  };
}

function nodeCommand(args) {
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', `node ${args.join(' ')}`],
    };
  }

  return {
    command: 'node',
    args,
  };
}

function commandExists(command) {
  const lookup = process.platform === 'win32' ? 'where' : 'command';
  const args = process.platform === 'win32' ? [command] : ['-v', command];
  return spawnSync(lookup, args, { stdio: 'ignore', shell: process.platform !== 'win32' }).status === 0;
}

async function isReady() {
  try {
    const response = await fetch(appUrl, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(child, timeoutMs = serverStartupTimeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isReady()) {
      return;
    }

    if (child?.exitCode !== null) {
      throw new Error(
        `CI web server exited before responding at ${appUrl}.\n` +
        `Exit code: ${child.exitCode}\n` +
        `Server output:\n${serverOutput || '(no output captured)'}`,
      );
    }

    await delay(1000);
  }

  throw new Error(
    `CI web server did not respond at ${appUrl} after ${timeoutMs / 1000}s.\n` +
    `Server output:\n${serverOutput || '(no output captured)'}`,
  );
}

function captureServerOutput(chunk, stream) {
  const text = chunk.toString();
  stream.write(chunk);
  serverOutput = `${serverOutput}${text}`.slice(-8000);
}

function stopProcessTree(child) {
  if (!child || child.exitCode !== null || child.killed) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    return;
  }

  child.kill('SIGTERM');
}

async function runK6() {
  mkdirSync('test-results', { recursive: true });

  return new Promise((resolve) => {
    const child = spawn('k6', ['run', '--summary-export', 'test-results/k6-summary.json', 'k6/frontend-smoke.js'], {
      stdio: 'inherit',
      shell: false,
      env: {
        ...process.env,
        K6_TARGET_URL: appUrl,
      },
    });

    child.on('close', (code) => resolve(code ?? 1));
  });
}

let server;
let startedServer = false;

try {
  if (!commandExists('k6')) {
    if (process.env.K6_REQUIRED !== 'true') {
      console.warn('k6 is not installed or is not available in PATH. Skipping optional K6 performance smoke test.');
      process.exit(0);
    }

    throw new Error('k6 is not installed or is not available in PATH on this Jenkins agent.');
  }

  if (!(await isReady())) {
    startedServer = true;
    const staticServer = nodeCommand(['scripts/serve-dist-ci.mjs']);
    server = spawn(staticServer.command, staticServer.args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
    });
    server.stdout.on('data', (chunk) => captureServerOutput(chunk, process.stdout));
    server.stderr.on('data', (chunk) => captureServerOutput(chunk, process.stderr));

    await waitForServer(server);
  }

  const exitCode = await runK6();
  process.exitCode = exitCode;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (startedServer) {
    stopProcessTree(server);
  }

  process.exit(process.exitCode ?? 0);
}
