import fs from 'node:fs/promises';
import path from 'node:path';
import { generateKeyPairSync } from 'node:crypto';

const root = process.cwd();

function parseArg(name) {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!raw) return '';
  return raw.slice(name.length + 3).trim();
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function buildWalletJwk() {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicExponent: 0x10001
  });
  const exported = privateKey.export({ format: 'jwk' });

  const wallet = {
    kty: exported.kty,
    n: exported.n,
    e: exported.e,
    d: exported.d,
    p: exported.p,
    q: exported.q,
    dp: exported.dp,
    dq: exported.dq,
    qi: exported.qi
  };

  for (const [key, value] of Object.entries(wallet)) {
    if (typeof value !== 'string' || !value.length) {
      throw new Error(`Generated JWK is missing field: ${key}`);
    }
  }

  if (wallet.kty !== 'RSA') {
    throw new Error(`Unexpected key type: ${wallet.kty}`);
  }

  return wallet;
}

async function main() {
  const outArg = parseArg('out');
  const force = process.argv.includes('--force');
  const outPath = path.resolve(root, outArg || 'wallet.json');

  if (!force && (await exists(outPath))) {
    throw new Error(
      `Wallet already exists at ${outPath}. Use --force or pass --out=/absolute/path/new-wallet.json.`
    );
  }

  const wallet = buildWalletJwk();
  await fs.writeFile(outPath, `${JSON.stringify(wallet, null, 2)}\n`, 'utf8');

  console.log(`Generated wallet: ${outPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
