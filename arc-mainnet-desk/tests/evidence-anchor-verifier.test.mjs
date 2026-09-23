import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  decodeAnchorResult,
  normalizeAddress,
  normalizeDigest,
  runtimeHash,
  verifyAnchor,
  EXPECTED_RUNTIME_SHA256,
  DEPLOYED_ANCHOR_ADDRESS,
} from '../evidence-anchor.mjs';

const artifactPath = fileURLToPath(new URL('../onchain/out/EvidenceAnchor.sol/EvidenceAnchor.json', import.meta.url));
const artifact = await readFile(artifactPath, 'utf8')
  .then(contents => JSON.parse(contents))
  .catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
const deployedRuntime = (await readFile(new URL('./fixtures/arc-mainnet-evidence-anchor-runtime.hex', import.meta.url), 'utf8')).trim();
const contract = '0x1234567890123456789012345678901234567890';
const digest = `0x${'ab'.repeat(32)}`;
const submitter = '1234567890123456789012345678901234567890';
const word = value => BigInt(value).toString(16).padStart(64, '0');
const positive = `0x${word(1)}${submitter.padStart(64, '0')}${word(1_800_000_000)}`;

test('the verifier pins the deployed runtime', async () => {
  assert.equal(DEPLOYED_ANCHOR_ADDRESS, '0xC32a4B49c39856c3ecf6005EE44351e9E727d03d');
  assert.match(EXPECTED_RUNTIME_SHA256, /^[0-9a-f]{64}$/);
  assert.equal(await runtimeHash(deployedRuntime), EXPECTED_RUNTIME_SHA256);
});

test('a local Foundry build differs from the deployed runtime only in metadata when available', async t => {
  if (!artifact) return t.skip('Run forge build to compare local compiler metadata.');
  assert.equal(await runtimeHash(artifact.deployedBytecode.object), '4162999d93de217d492ad059fd63288ab2b905f27c34a8f0704182c4598c7315');
  assert.notEqual(await runtimeHash(artifact.deployedBytecode.object), EXPECTED_RUNTIME_SHA256);
  const withoutMetadata = code => {
    const hex = code.slice(2);
    const metadataBytes = Number.parseInt(hex.slice(-4), 16) + 2;
    return hex.slice(0, -metadataBytes * 2);
  };
  assert.equal(withoutMetadata(deployedRuntime), withoutMetadata(artifact.deployedBytecode.object));
});

test('inputs and ABI response are strict', () => {
  assert.equal(normalizeAddress(contract), contract);
  assert.equal(normalizeAddress('0x1234'), null);
  assert.equal(normalizeDigest(digest.toUpperCase().replace('0X', '0x')), digest);
  assert.equal(normalizeDigest('0x12'), null);
  assert.deepEqual(decodeAnchorResult(positive), {
    exists: true,
    submitter: `0x${submitter}`,
    anchoredAt: 1_800_000_000,
  });
  assert.throws(() => decodeAnchorResult('0x00'));
});

test('reads one fixed Arc Mainnet block and never sends a write call', async () => {
  const calls = [];
  const results = {
    eth_chainId: '0x13b2',
    eth_blockNumber: '0x1234',
    eth_getCode: deployedRuntime,
    eth_call: positive,
  };
  const rpc = async (method, params) => {
    calls.push({ method, params });
    return results[method];
  };
  const result = await verifyAnchor(contract, digest, rpc);
  assert.equal(result.exists, true);
  assert.equal(result.submitter, `0x${submitter}`);
  assert.equal(result.block, '4660');
  assert.deepEqual(calls.map(call => call.method), ['eth_chainId', 'eth_blockNumber', 'eth_getCode', 'eth_call']);
  assert.equal(calls[2].params[1], '0x1234');
  assert.equal(calls[3].params[1], '0x1234');
  assert.equal(calls[3].params[0].data, `0x7feb51d9${digest.slice(2)}`);
});

test('rejects wrong chain or unrelated bytecode before eth_call', async () => {
  const wrongChain = async method => method === 'eth_chainId' ? '0x1' : '0x1234';
  await assert.rejects(verifyAnchor(contract, digest, wrongChain), /not reporting Arc Mainnet/);
  const calls = [];
  const wrongCode = async method => {
    calls.push(method);
    return { eth_chainId: '0x13b2', eth_blockNumber: '0x1234', eth_getCode: '0x6000' }[method];
  };
  await assert.rejects(verifyAnchor(contract, digest, wrongCode), /does not match/);
  assert.deepEqual(calls, ['eth_chainId', 'eth_blockNumber', 'eth_getCode']);
});
