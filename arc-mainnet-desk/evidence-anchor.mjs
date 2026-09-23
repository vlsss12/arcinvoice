export const ARC_MAINNET_RPC = 'https://rpc.mainnet.arc.io';
export const ARC_MAINNET_CHAIN_ID = '0x13b2';
export const DEPLOYED_ANCHOR_ADDRESS = '0xC32a4B49c39856c3ecf6005EE44351e9E727d03d';
// SHA-256 of eth_getCode for the Arc Mainnet deployment, including Remix compiler metadata.
export const EXPECTED_RUNTIME_SHA256 = '981d76375e468ba7854a59db496b7f84e9ee6fcdcd32749e9ba15b8041836a0b';
const GET_ANCHOR_SELECTOR = '0x7feb51d9';

export function normalizeAddress(value) {
  const text = String(value || '').trim();
  return /^0x[0-9a-fA-F]{40}$/.test(text) ? text : null;
}

export function normalizeDigest(value) {
  const text = String(value || '').trim();
  return /^0x[0-9a-fA-F]{64}$/.test(text) ? text.toLowerCase() : null;
}

function hexBytes(value) {
  if (typeof value !== 'string' || !/^0x(?:[0-9a-fA-F]{2})*$/.test(value)) {
    throw new Error('The RPC returned invalid hexadecimal bytecode.');
  }
  return Uint8Array.from(value.slice(2).match(/.{2}/g) || [], pair => Number.parseInt(pair, 16));
}

export async function runtimeHash(code) {
  if (!globalThis.crypto?.subtle) throw new Error('Secure browser SHA-256 is unavailable.');
  const hash = await globalThis.crypto.subtle.digest('SHA-256', hexBytes(code));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function decodeAnchorResult(result) {
  if (typeof result !== 'string' || !/^0x[0-9a-fA-F]{192}$/.test(result)) {
    throw new Error('The contract returned an invalid anchor response.');
  }
  const words = [result.slice(2, 66), result.slice(66, 130), result.slice(130, 194)];
  const existsWord = BigInt(`0x${words[0]}`);
  if (existsWord !== 0n && existsWord !== 1n) throw new Error('The contract returned an invalid existence flag.');
  if (!/^0{24}[0-9a-fA-F]{40}$/.test(words[1])) throw new Error('The contract returned an invalid submitter.');
  const timestamp = BigInt(`0x${words[2]}`);
  if (timestamp > 0xffffffffffffffffn) throw new Error('The contract returned an invalid timestamp.');
  if (existsWord === 0n && (timestamp !== 0n || BigInt(`0x${words[1]}`) !== 0n)) {
    throw new Error('The contract returned inconsistent empty-anchor data.');
  }
  return {
    exists: existsWord === 1n,
    submitter: `0x${words[1].slice(24)}`,
    anchoredAt: Number(timestamp),
  };
}

export async function publicRpc(method, params) {
  const response = await fetch(ARC_MAINNET_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`Arc RPC returned HTTP ${response.status}.`);
  const body = await response.json();
  if (body.error) throw new Error(body.error.message || 'Arc RPC error.');
  if (body.result === undefined || body.result === null) throw new Error('Arc RPC returned no result.');
  return body.result;
}

export async function verifyAnchor(addressInput, digestInput, rpc = publicRpc) {
  const address = normalizeAddress(addressInput);
  const digest = normalizeDigest(digestInput);
  if (!address) throw new Error('Enter a valid 20-byte contract address.');
  if (!digest) throw new Error('Enter a 32-byte SHA-256 digest beginning with 0x.');
  const chainId = await rpc('eth_chainId', []);
  if (String(chainId).toLowerCase() !== ARC_MAINNET_CHAIN_ID) {
    throw new Error('The RPC is not reporting Arc Mainnet (chain ID 5042).');
  }
  const block = await rpc('eth_blockNumber', []);
  if (!/^0x[0-9a-fA-F]+$/.test(String(block))) throw new Error('The RPC returned an invalid block number.');
  const code = await rpc('eth_getCode', [address, block]);
  if (code === '0x') throw new Error('No contract bytecode exists at this address on Arc Mainnet.');
  if (await runtimeHash(code) !== EXPECTED_RUNTIME_SHA256) {
    throw new Error('The contract bytecode does not match the reviewed EvidenceAnchor build.');
  }
  const response = await rpc('eth_call', [{ to: address, data: `${GET_ANCHOR_SELECTOR}${digest.slice(2)}` }, block]);
  return { address, digest, block: BigInt(block).toString(), ...decodeAnchorResult(response) };
}

const form = typeof document === 'undefined' ? null : document.querySelector('#anchor-form');
if (form) {
  const status = document.querySelector('#anchor-status');
  const button = document.querySelector('#verify-anchor');
  const params = new URLSearchParams(location.search);
  const suggestedDigest = normalizeDigest(params.get('digest'));
  let localDigest = null;
  try {
    localDigest = normalizeDigest(sessionStorage.getItem('arc-desk-evidence-digest'));
    sessionStorage.removeItem('arc-desk-evidence-digest');
  } catch { /* Manual paste remains available. */ }
  document.querySelector('#anchor-contract').value = DEPLOYED_ANCHOR_ADDRESS;
  if (suggestedDigest || localDigest) document.querySelector('#evidence-digest').value = suggestedDigest || localDigest;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    button.disabled = true;
    status.className = 'anchor-status';
    status.textContent = 'Reading Arc Mainnet at a fixed block…';
    try {
      const result = await verifyAnchor(
        document.querySelector('#anchor-contract').value,
        document.querySelector('#evidence-digest').value,
      );
      status.className = `anchor-status ${result.exists ? 'found' : 'missing'}`;
      status.replaceChildren();
      const heading = document.createElement('strong');
      heading.textContent = result.exists ? 'Anchor found' : 'No anchor found';
      const detail = document.createElement('p');
      detail.textContent = result.exists
        ? `Submitted by ${result.submitter} at ${new Date(result.anchoredAt * 1000).toISOString()}. Observed at block ${result.block}.`
        : `This digest was not recorded by this contract at block ${result.block}.`;
      const boundary = document.createElement('small');
      boundary.textContent = 'A matching digest proves only that this contract recorded that digest. It does not prove that a report is accurate, safe, final, or approved by Arc/Circle.';
      status.append(heading, detail, boundary);
    } catch (error) {
      status.className = 'anchor-status error';
      status.textContent = error.message || 'Verification could not complete. No chain-state conclusion was made.';
    } finally {
      button.disabled = false;
    }
  });
}
