import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const appUrl = 'http://127.0.0.1:4200';
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

async function runPlaywright() {
  return new Promise((resolve) => {
    const playwright = npxCommand(['playwright', 'test']);
    const child = spawn(playwright.command, playwright.args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
      env: {
        ...process.env,
        E2E_EXTERNAL_SERVER: '1',
      },
    });

    let resolved = false;
    let passedSummaryTimer;
    let output = '';
    const localWindowsWatchdog = process.platform === 'win32' && !process.env.CI && !process.env.JENKINS_URL
      ? setTimeout(() => {
          const cleanOutput = output.toLowerCase();
          stopProcessTree(child);
          resolveOnce(cleanOutput.includes('passed') && !cleanOutput.includes('failed') ? 0 : 1);
        }, 90_000)
      : undefined;

    const resolveOnce = (code) => {
      if (resolved) {
        return;
      }

      resolved = true;
      clearTimeout(passedSummaryTimer);
      clearTimeout(localWindowsWatchdog);
      resolve(code);
    };

    const watchOutput = (chunk, stream) => {
      const text = chunk.toString();
      stream.write(chunk);
      output += text.replace(/\u001b\[[0-9;]*m/g, '');

      if (/\b\d+\s+passed\b/.test(output) && !passedSummaryTimer) {
        passedSummaryTimer = setTimeout(() => {
          stopProcessTree(child);
          resolveOnce(0);
        }, 2000);
      }
    };

    child.stdout.on('data', (chunk) => watchOutput(chunk, process.stdout));
    child.stderr.on('data', (chunk) => watchOutput(chunk, process.stderr));
    child.on('close', (code) => resolveOnce(code ?? 1));
  });
}

let server;
let startedServer = false;

try {
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

  const exitCode = await runPlaywright();
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
