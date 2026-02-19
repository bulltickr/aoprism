import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import Arweave from 'arweave';
import mime from 'mime-types';

const root = process.cwd();
const distDir = path.join(root, 'dist');

function parseArg(name) {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!raw) return '';
  return raw.slice(name.length + 3).trim();
}

function buildGatewayConfig(gateway) {
  const parsed = new URL(gateway);
  return {
    host: parsed.hostname,
    port: parsed.port
      ? Number.parseInt(parsed.port, 10)
      : parsed.protocol === 'https:'
        ? 443
        : 80,
    protocol: parsed.protocol.replace(':', '')
  };
}

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(absolutePath);
      return [absolutePath];
    })
  );
  return nested.flat();
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function runBinary(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const stdoutChunks = [];
    let stderr = '';

    child.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(`${command} exited with code ${code}${stderr ? `: ${stderr.trim()}` : ''}`)
        );
        return;
      }

      resolve({ stdout: Buffer.concat(stdoutChunks), stderr });
    });
  });
}

async function createCodeArchiveBuffer() {
  // Creates a forkable source snapshot that can be downloaded from Arweave.
  // Windows typically ships a `tar` binary (bsdtar). If missing, install one or use WSL.
  const { stdout } = await runBinary(
    'tar',
    ['--exclude=./node_modules', '--exclude=./wallet.json', '--exclude=./.git', '-cf', '-', '.'],
    root
  );
  return gzipSync(stdout);
}

async function loadWallet(arweave, walletArg) {
  const envWallet = process.env.ARWEAVE_WALLET?.trim();

  if (walletArg) {
    const absoluteWalletPath = path.resolve(root, walletArg);
    if (!(await pathExists(absoluteWalletPath))) {
      throw new Error(`Wallet file not found: ${absoluteWalletPath}`);
    }
    const jwkRaw = await fs.readFile(absoluteWalletPath, 'utf8');
    return {
      walletPath: absoluteWalletPath,
      generated: false,
      jwk: JSON.parse(jwkRaw)
    };
  }

  if (envWallet) {
    const absoluteWalletPath = path.resolve(root, envWallet);
    if (!(await pathExists(absoluteWalletPath))) {
      throw new Error(`ARWEAVE_WALLET points to a missing file: ${absoluteWalletPath}`);
    }
    const jwkRaw = await fs.readFile(absoluteWalletPath, 'utf8');
    return {
      walletPath: absoluteWalletPath,
      generated: false,
      jwk: JSON.parse(jwkRaw)
    };
  }

  const defaultWalletPath = path.join(root, 'wallet.json');
  if (!(await pathExists(defaultWalletPath))) {
    const jwk = await arweave.wallets.generate();
    await fs.writeFile(defaultWalletPath, `${JSON.stringify(jwk, null, 2)}\n`, 'utf8');
    return {
      walletPath: defaultWalletPath,
      generated: true,
      jwk
    };
  }

  const jwkRaw = await fs.readFile(defaultWalletPath, 'utf8');
  return {
    walletPath: defaultWalletPath,
    generated: false,
    jwk: JSON.parse(jwkRaw)
  };
}

async function uploadTransaction(arweave, jwk, data, tags) {
  const tx = await arweave.createTransaction({ data }, jwk);
  for (const [key, value] of tags) {
    tx.addTag(key, value);
  }

  await arweave.transactions.sign(tx, jwk);
  const uploader = await arweave.transactions.getUploader(tx);

  while (!uploader.isComplete) {
    await uploader.uploadChunk();
  }

  return tx.id;
}

async function main() {
  const walletArg = parseArg('wallet');
  const gatewayArg = parseArg('gateway');
  const forkedFromArg = parseArg('forked-from');
  const appNameArg = parseArg('app-name');
  const appVersionArg = parseArg('app-version');

  const gateway = gatewayArg || process.env.ARWEAVE_GATEWAY || 'https://arweave.net';
  const forkedFrom = (forkedFromArg || process.env.FORKED_FROM || '').trim();
  const appName = (appNameArg || process.env.APP_NAME || 'Permaweb-Demo-Starter').trim();
  const appVersion = (appVersionArg || process.env.APP_VERSION || '0.0.0').trim();

  await fs.access(distDir);

  const arweave = Arweave.init({
    ...buildGatewayConfig(gateway),
    timeout: 30_000,
    logging: false
  });

  const { walletPath, generated, jwk } = await loadWallet(arweave, walletArg);
  console.log(generated ? `Generated wallet: ${walletPath}` : `Using wallet: ${walletPath}`);
  console.log(`Gateway: ${gateway}`);
  if (forkedFrom) console.log(`Forked from: ${forkedFrom}`);

  // Check balance before proceeding
  const address = await arweave.wallets.jwkToAddress(jwk);
  const balanceWinston = await arweave.wallets.getBalance(address);
  const balanceAr = arweave.ar.winstonToAr(balanceWinston);

  console.log(`Address: ${address}`);
  console.log(`Balance: ${balanceAr} AR`);

  if (Number(balanceAr) < 0.0000001) {
    throw new Error(
      `\n❌ Insufficient Funds for Deployment\n` +
      `   You have ${balanceAr} AR.\n` +
      `   Deployment requires a small amount of AR tokens to store data permanently.\n` +
      `   Get free tokens here: https://faucet.arweave.net/`
    );
  }

  const filePaths = await listFiles(distDir);
  if (!filePaths.length) {
    throw new Error('dist/ is empty. Run npm run build first.');
  }

  const codeArchiveData = await createCodeArchiveBuffer();
  const codeArchiveId = await uploadTransaction(arweave, jwk, codeArchiveData, [
    ['Content-Type', 'application/gzip'],
    ['Content-Encoding', 'gzip'],
    ['App-Name', appName],
    ['App-Version', appVersion],
    ['Type', 'code-archive'],
    ['Archive-Root', '.'],
    ...(forkedFrom ? [['forked-from', forkedFrom]] : [])
  ]);
  console.log(`Uploaded code archive: ${codeArchiveId}`);

  const pathMap = {};

  for (const absolutePath of filePaths) {
    const relativePath = path.relative(distDir, absolutePath).replace(/\\/g, '/');
    const contentType = mime.lookup(relativePath) || 'application/octet-stream';
    const data = await fs.readFile(absolutePath);

    const txId = await uploadTransaction(arweave, jwk, data, [
      ['Content-Type', String(contentType)],
      ['App-Name', appName],
      ['App-Version', appVersion],
      ['Type', 'app-asset'],
      ['File-Path', relativePath],
      ['code', codeArchiveId],
      ...(forkedFrom ? [['forked-from', forkedFrom]] : [])
    ]);

    pathMap[relativePath] = { id: txId };
    console.log(`Uploaded ${relativePath}: ${txId}`);
  }

  const manifest = {
    manifest: 'arweave/paths',
    version: '0.2.0',
    index: { path: 'index.html' },
    paths: pathMap
  };

  const manifestId = await uploadTransaction(arweave, jwk, JSON.stringify(manifest), [
    ['Content-Type', 'application/x.arweave-manifest+json'],
    ['App-Name', appName],
    ['App-Version', appVersion],
    ['Type', 'manifest'],
    ['code', codeArchiveId],
    ...(forkedFrom ? [['forked-from', forkedFrom]] : [])
  ]);

  const appUrl = `${gateway.replace(/\/+$/, '')}/${manifestId}/`;
  const codeArchiveUrl = `${gateway.replace(/\/+$/, '')}/${codeArchiveId}`;

  console.log('');
  console.log(`Code Archive ID: ${codeArchiveId}`);
  console.log(`Code Archive URL: ${codeArchiveUrl}`);
  console.log(`Manifest ID (App ID): ${manifestId}`);
  console.log(`App URL: ${appUrl}`);
  console.log('');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
