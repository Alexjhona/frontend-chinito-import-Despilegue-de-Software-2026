import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const appUrl = 'http://127.0.0.1:4200';

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

async function isReady() {
  try {
    const response = await fetch(appUrl, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs = 120_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isReady()) {
      return;
    }

    await delay(1000);
  }

  throw new Error(`Angular dev server did not respond at ${appUrl}`);
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
    const angular = npxCommand(['ng', 'serve', '--host', '127.0.0.1', '--port', '4200']);
    server = spawn(angular.command, angular.args, {
      stdio: 'inherit',
      shell: false,
    });

    await waitForServer();
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
