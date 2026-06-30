import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, createWriteStream, existsSync, mkdirSync, rmSync } from 'node:fs';
import { get } from 'node:https';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const appUrl = process.env.K6_TARGET_URL || 'http://127.0.0.1:4200';
const serverStartupTimeoutMs = 120_000;
const k6Version = process.env.K6_VERSION || '0.54.0';
const k6InstallDir = join(process.cwd(), '.ci-tools', 'k6', k6Version);
const k6Executable = process.platform === 'win32' ? join(k6InstallDir, 'k6.exe') : join(k6InstallDir, 'k6');
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

function downloadWithSystemTool(url, destination) {
  if (commandExists('curl')) {
    const result = spawnSync('curl', [
      '--fail',
      '--location',
      '--silent',
      '--show-error',
      '--connect-timeout',
      '30',
      '--max-time',
      '180',
      '--retry',
      '3',
      '--output',
      destination,
      url,
    ], {
      stdio: 'inherit',
    });
    return result.status === 0;
  }

  if (commandExists('wget')) {
    const result = spawnSync('wget', [
      '--quiet',
      '--timeout=30',
      '--tries=3',
      '--output-document',
      destination,
      url,
    ], {
      stdio: 'inherit',
    });
    return result.status === 0;
  }

  return false;
}

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destination);
    let settled = false;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      file.close(() => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    };

    const followRedirect = (location) => {
      if (settled) return;
      settled = true;
      file.close(() => {
        downloadFile(location, destination).then(resolve, reject);
      });
    };

    const request = get(url, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        followRedirect(response.headers.location);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        finish(new Error(`Unable to download ${url}. HTTP status: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => finish());
    });

    request.setTimeout(90_000, () => {
      request.destroy(new Error(`Timed out downloading ${url}`));
    });
    request.on('error', (error) => finish(error));
    file.on('error', (error) => finish(error));
  });
}

async function ensureK6() {
  if (commandExists('k6')) {
    return 'k6';
  }

  if (existsSync(k6Executable)) {
    return k6Executable;
  }

  if (process.env.K6_REQUIRED !== 'true') {
    console.warn('k6 is not installed or is not available in PATH. Skipping optional K6 performance smoke test.');
    process.exit(0);
  }

  if (process.platform !== 'linux' || process.arch !== 'x64') {
    throw new Error('k6 is not installed and automatic install is only configured for Linux x64 Jenkins agents.');
  }

  mkdirSync(k6InstallDir, { recursive: true });

  const archive = join(k6InstallDir, `k6-v${k6Version}-linux-amd64.tar.gz`);
  const downloadUrl = `https://github.com/grafana/k6/releases/download/v${k6Version}/k6-v${k6Version}-linux-amd64.tar.gz`;

  console.log(`k6 is not installed. Downloading k6 v${k6Version} for this CI workspace...`);
  rmSync(archive, { force: true });

  if (!downloadWithSystemTool(downloadUrl, archive)) {
    await downloadFile(downloadUrl, archive);
  }

  const extractResult = spawnSync('tar', ['-xzf', archive, '--strip-components=1', '-C', k6InstallDir], {
    stdio: 'inherit',
  });

  if (extractResult.status !== 0) {
    throw new Error(`Unable to extract k6 archive. tar exited with code ${extractResult.status}.`);
  }

  chmodSync(k6Executable, 0o755);
  return k6Executable;
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

async function runK6(k6Command) {
  mkdirSync('test-results', { recursive: true });

  return new Promise((resolve) => {
    const child = spawn(k6Command, ['run', '--summary-export', 'test-results/k6-summary.json', 'k6/frontend-smoke.js'], {
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

async function main() {
  let server;
  let startedServer = false;

  try {
    const k6Command = await ensureK6();

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

    process.exitCode = await runK6(k6Command);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (startedServer) {
      stopProcessTree(server);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));
