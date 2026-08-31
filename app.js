const walletButton=document.querySelector('#walletButton');
const disconnectButton=document.querySelector('#disconnectButton');
const payButton=document.querySelector('#payButton');
const createButton=document.querySelector('#createButton');
const status=document.querySelector('#status');
const receipt=document.querySelector('#receipt');
const receiptEyebrow=document.querySelector('#receiptEyebrow');
const receiptTitle=document.querySelector('#receiptTitle');
const receiptMessage=document.querySelector('#receiptMessage');
const receiptLink=document.querySelector('#receiptLink');
const copyReportButton=document.querySelector('#copyReportButton');
const recipientInput=document.querySelector('#recipient');
const amountInput=document.querySelector('#amount');
const memoInput=document.querySelector('#memo');
const notice=document.querySelector('#notice');
const shareButton=document.querySelector('#shareButton');
const shareLink=document.querySelector('#shareLink');
const shareMessage=document.querySelector('#shareMessage');
const latestBlock=document.querySelector('#latestBlock');
const rpcStatus=document.querySelector('#rpcStatus');
const networkMessage=document.querySelector('#networkMessage');
const verifyButton=document.querySelector('#verifyButton');
const verifyForm=document.querySelector('#verifyForm');
const txHashInput=document.querySelector('#txHash');
const verifyResult=document.querySelector('#verifyResult');
const testCaseSelect=document.querySelector('#testCase');
// Wallets require 18 native decimals for Arc's EVM network configuration.
// The USDC ERC-20 transfer below still uses the token's 6 display decimals.
const arcChain={chainId:'0x4cef52',chainName:'Arc Testnet',nativeCurrency:{name:'USDC',symbol:'USDC',decimals:18},rpcUrls:['https://rpc.drpc.testnet.arc.network'],blockExplorerUrls:['https://testnet.arcscan.app']};
const arcRpc='https://rpc.testnet.arc.network';
const nativeUsdcContract='0x3600000000000000000000000000000000000000';
let account;
let latestTestReport='';

function isAddress(value){return /^0x[a-fA-F0-9]{40}$/.test(value);}
function isTransactionHash(value){return /^0x[a-fA-F0-9]{64}$/.test(value);}
function shortenAddress(value){return value?`${value.slice(0,8)}…${value.slice(-6)}`:'—';}
function formatNativeUsdc(value){const units=BigInt(value||'0x0');const whole=units/10n**18n;const fraction=(units%10n**18n).toString().padStart(18,'0').slice(0,6).replace(/0+$/,'');return `${whole.toLocaleString()}${fraction?`.${fraction}`:''} USDC`;}
function formatTokenUsdc(value){const units=BigInt(value||'0x0');const whole=units/10n**6n;const fraction=(units%10n**6n).toString().padStart(6,'0').replace(/0+$/,'');return `${whole.toLocaleString()}${fraction?`.${fraction}`:''} USDC`;}
function usdcTransfer(transaction){if(transaction?.to?.toLowerCase()!==nativeUsdcContract||!transaction.input?.startsWith('0xa9059cbb')||transaction.input.length<138)return null;return {to:`0x${transaction.input.slice(34,74)}`,amount:`0x${transaction.input.slice(74,138)}`};}
async function rpc(method,params){const response=await fetch(arcRpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});if(!response.ok)throw new Error('Arc RPC is temporarily unavailable.');const payload=await response.json();if(payload.error)throw new Error(payload.error.message||'Arc RPC returned an error.');return payload.result;}
function buildInvoiceLink(){const recipient=recipientInput.value.trim();const amount=amountInput.value.trim();if(!isAddress(recipient)||!/^\d+(\.\d{1,6})?$/.test(amount))return null;const params=new URLSearchParams({to:recipient,amount});const memo=memoInput.value.trim();if(memo)params.set('memo',memo);return `${window.location.origin}${window.location.pathname}?${params.toString()}#invoice`;}
function renderInvoiceLink(){const link=buildInvoiceLink();shareLink.textContent=link||'Enter a valid recipient and amount to create a shareable invoice link.';return link;}
async function copyInvoiceLink(){const link=renderInvoiceLink();if(!link){shareMessage.textContent='Enter a valid 0x recipient and positive USDC amount first.';return;}try{await navigator.clipboard.writeText(link);shareMessage.textContent='Invoice link copied. Share it with the payer.';}catch(error){shareMessage.textContent='Copy was blocked by this browser. Select the link above and copy it manually.';}}
function loadInvoiceFromLink(){const params=new URLSearchParams(window.location.search);const recipient=params.get('to');const amount=params.get('amount');const memo=params.get('memo');if(recipient&&isAddress(recipient))recipientInput.value=recipient;if(amount&&/^\d+(\.\d{1,6})?$/.test(amount))amountInput.value=amount;if(memo)memoInput.value=memo.slice(0,120);renderInvoiceLink();}
async function loadNetworkStatus(){try{const block=await rpc('eth_blockNumber',[]);latestBlock.textContent=Number(BigInt(block)).toLocaleString();rpcStatus.textContent='Online';networkMessage.textContent='Public RPC connected. Read-only data is loaded directly from Arc Testnet.';}catch(error){rpcStatus.textContent='Unavailable';rpcStatus.style.color='#b34b56';networkMessage.textContent='The public RPC is temporarily unavailable. Payments may still work through your wallet.';}}
function sleep(milliseconds){return new Promise(resolve=>setTimeout(resolve,milliseconds));}
async function waitForFinality(txHash,submittedAt,amount,recipient){
  receipt.classList.remove('hidden');
  receiptEyebrow.textContent='ARC TESTNET PAYMENT';
  receiptTitle.textContent='Checking finality…';
  receiptMessage.textContent='Submitted successfully. Arc finality is being checked from the public RPC.';
  receiptLink.href=`https://testnet.arcscan.app/tx/${txHash}`;
  receipt.scrollIntoView({behavior:'smooth',block:'center'});
  for(let attempt=0;attempt<25;attempt+=1){
    try{
      const transactionReceipt=await rpc('eth_getTransactionReceipt',[txHash]);
      if(transactionReceipt){
        const milliseconds=Math.max(1,Math.round(performance.now()-submittedAt));
        const finalized=transactionReceipt.status==='0x1';
        receiptEyebrow.textContent=finalized?'PAYMENT FINALIZED':'PAYMENT FAILED';
        receiptTitle.textContent=finalized?`Finalized in ${milliseconds} ms`:'Transaction failed';
        receiptMessage.textContent=finalized?`${amount} test USDC to ${shortenAddress(recipient)} is final on Arc Testnet. This timing is observed from this browser after submission.`:'Arc Testnet returned a failed transaction receipt.';
        latestTestReport=`Arc Testnet payment test\nChain ID: 5042002\nTransaction: ${txHash}\nRecipient: ${recipient}\nAmount: ${amount} test USDC\nResult: ${finalized?'Finalized':'Failed'}\nObserved finality: ${milliseconds} ms\nArcScan: https://testnet.arcscan.app/tx/${txHash}`;
        copyReportButton.classList.remove('hidden');
        status.textContent=finalized?'Finalized':'Failed';
        status.style.background=finalized?'#e8fbf4':'#fff0f1';
        status.style.color=finalized?'#16805d':'#b34b56';
        payButton.textContent=finalized?'Payment finalized ✓':'Payment failed';
        payButton.disabled=false;
        return;
      }
    }catch(error){console.info('Finality check retrying.',error);}
    await sleep(400);
  }
  receiptTitle.textContent='Still pending';
  receiptMessage.textContent='The transaction was submitted, but finality was not observed yet. Open ArcScan to check its current status.';
  payButton.textContent='Pay test USDC';
  payButton.disabled=false;
}
async function copyTestReport(button=copyReportButton){if(!latestTestReport)return;try{await navigator.clipboard.writeText(latestTestReport);button.textContent='Test report copied ✓';}catch(error){button.textContent='Copy blocked by browser';}}
function showVerification(message,type='info'){verifyResult.className=`verify-result ${type}`;verifyResult.innerHTML=message;}
function createVerifiedReport({hash,amount,status,from,to,block,timestamp}){return `Arc Testnet verification report\nTest case: ${testCaseSelect.value}\nChecked at: ${new Date().toISOString()}\nChain ID: 5042002\nRPC: ${arcRpc}\nTransaction: ${hash}\nStatus: ${status}\nAmount: ${amount}\nFrom: ${from}\nTo: ${to||'—'}\nBlock: ${block}\nBlock time: ${timestamp}\nArcScan: https://testnet.arcscan.app/tx/${hash}\n\nRead-only verification: no wallet connection or signature was requested.`;}
async function verifyTransaction(event){event.preventDefault();const hash=txHashInput.value.trim();if(!isTransactionHash(hash)){showVerification('<strong>Enter a valid transaction hash.</strong><span>It must start with 0x and contain 64 hexadecimal characters.</span>','error');return;}const submitButton=verifyForm.querySelector('button');submitButton.disabled=true;submitButton.textContent='Checking…';showVerification('<strong>Checking Arc Testnet…</strong><span>Looking up the transaction and final receipt.</span>','loading');try{const [transaction,receipt]=await Promise.all([rpc('eth_getTransactionByHash',[hash]),rpc('eth_getTransactionReceipt',[hash])]);if(!transaction){showVerification('<strong>No Arc Testnet transaction found.</strong><span>Check the hash and make sure the transaction was sent on Arc Testnet.</span>','error');return;}const successful=receipt?.status==='0x1';const pending=!receipt;const blockData=receipt?await rpc('eth_getBlockByNumber',[receipt.blockNumber,false]):null;const title=pending?'Transaction pending':successful?'Payment confirmed':'Transaction failed';const statusClass=pending?'pending':successful?'success':'error';const statusLabel=pending?'Pending':successful?'Finalized':'Failed';const timestamp=blockData?.timestamp?new Date(Number(BigInt(blockData.timestamp))*1000).toLocaleString():'Awaiting confirmation';const tokenTransfer=usdcTransfer(transaction);const paidTo=tokenTransfer?.to||transaction.to;const amount=tokenTransfer?formatTokenUsdc(tokenTransfer.amount):formatNativeUsdc(transaction.value);const blockNumber=receipt?Number(BigInt(receipt.blockNumber)).toLocaleString():'—';latestTestReport=createVerifiedReport({hash,amount,status:statusLabel,from:transaction.from,to:paidTo,block:blockNumber,timestamp});showVerification(`<div class="verify-heading"><strong>${title}</strong><a href="https://testnet.arcscan.app/tx/${hash}" target="_blank" rel="noreferrer">View on ArcScan ↗</a></div><dl><div><dt>Amount</dt><dd>${amount}</dd></div><div><dt>Status</dt><dd>${statusLabel}</dd></div><div><dt>From</dt><dd title="${transaction.from}">${shortenAddress(transaction.from)}</dd></div><div><dt>To</dt><dd title="${paidTo||''}">${shortenAddress(paidTo)}</dd></div><div><dt>Block</dt><dd>${blockNumber}</dd></div><div><dt>Time</dt><dd>${timestamp}</dd></div></dl><div class="test-report"><p>Structured test report · public RPC data only</p><button type="button" id="copyVerifiedReport">Copy test report</button></div>`,statusClass);}catch(error){console.error(error);showVerification('<strong>Could not check this payment right now.</strong><span>Please try again in a moment. No wallet action was requested.</span>','error');}finally{submitButton.disabled=false;submitButton.textContent='Verify';}}
async function disconnectWallet(revokePermission=true){
  if(revokePermission&&window.ethereum){
    disconnectButton.textContent='Disconnecting…';
    try{await window.ethereum.request({method:'wallet_revokePermissions',params:[{eth_accounts:{}}]});}catch(error){console.info('Wallet permission revoke is not available in this wallet.',error);}
  }
  account=undefined;
  walletButton.textContent='Connect wallet';
  payButton.textContent='Connect wallet to pay';
  disconnectButton.classList.add('hidden');
  disconnectButton.textContent='Disconnect';
  status.textContent='Ready';
  status.style.background='';
  status.style.color='';
}
function showFriendlyError(error){
  const message=String(error?.message||'');
  status.textContent='Action needed';
  if(message.includes('same RPC endpoint')||message.includes('invalid chain ID')){
    notice.innerHTML='Your wallet has an older Arc Testnet entry saved. Remove that old network from wallet settings, refresh this page, then connect again. The correct chain ID is <b>5042002</b>.';
    return;
  }
  if(error?.code===4001){notice.textContent='Connection cancelled. You can try again whenever you are ready.';return;}
  if(message.includes('Install MetaMask')){notice.textContent='Install an EVM wallet such as MetaMask, then return here to connect.';return;}
  notice.textContent='The wallet did not complete this action. Check that Arc Testnet is selected, then try again.';
}
function toNativeValue(value){
  if(!/^\d+(\.\d{1,6})?$/.test(value))throw new Error('Enter a positive USDC amount with up to 6 decimals.');
  const [whole,fraction='']=value.split('.');
  const displayUnits=BigInt(whole)*10n**6n+BigInt((fraction+'0'.repeat(6)).slice(0,6));
  if(displayUnits<=0n)throw new Error('Enter a valid positive USDC amount.');
  return `0x${(displayUnits*10n**12n).toString(16)}`;
}
async function connectWallet(){
  if(!window.ethereum)throw new Error('Install MetaMask or another EVM wallet first.');
  try{
    await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:arcChain.chainId}]});
  }catch(error){
    if(error.code!==4902)throw error;
    await window.ethereum.request({method:'wallet_addEthereumChain',params:[arcChain]});
  }
  const accounts=await window.ethereum.request({method:'eth_requestAccounts'});
  account=accounts[0];
  walletButton.textContent=`${account.slice(0,6)}…${account.slice(-4)}`;
  disconnectButton.classList.remove('hidden');
  payButton.textContent='Pay test USDC';
  status.textContent='Wallet connected';
  return account;
}
walletButton.addEventListener('click',async()=>{try{await connectWallet();}catch(error){walletButton.textContent='Connect wallet';showFriendlyError(error);}});
disconnectButton.addEventListener('click',()=>{void disconnectWallet();});
createButton.addEventListener('click',()=>document.querySelector('#invoice').scrollIntoView({behavior:'smooth'}));
verifyButton.addEventListener('click',()=>document.querySelector('#verifier').scrollIntoView({behavior:'smooth',block:'center'}));
verifyForm.addEventListener('submit',verifyTransaction);
verifyResult.addEventListener('click',event=>{if(event.target.id==='copyVerifiedReport')void copyTestReport(event.target);});
shareButton.addEventListener('click',()=>{void copyInvoiceLink();});
copyReportButton.addEventListener('click',()=>{void copyTestReport();});
[recipientInput,amountInput,memoInput].forEach(input=>input.addEventListener('input',renderInvoiceLink));
loadInvoiceFromLink();
void loadNetworkStatus();
if(window.ethereum){
  window.ethereum.on('accountsChanged',accounts=>{
    account=accounts[0];
    if(!account){void disconnectWallet(false);return;}
    walletButton.textContent=account?`${account.slice(0,6)}…${account.slice(-4)}`:'Connect wallet';
    payButton.textContent=account?'Pay test USDC':'Connect wallet to pay';
    disconnectButton.classList.remove('hidden');
  });
  window.ethereum.on('chainChanged',()=>window.location.reload());
}
payButton.addEventListener('click',async()=>{
  try{
    if(!account)await connectWallet();
    const recipient=recipientInput.value.trim();
    const amount=amountInput.value.trim();
    if(!isAddress(recipient))throw new Error('Enter a valid 0x recipient wallet address.');
    const value=toNativeValue(amount);
    payButton.textContent='Confirm in wallet…';payButton.disabled=true;
    const submittedAt=performance.now();
    const txHash=await window.ethereum.request({method:'eth_sendTransaction',params:[{from:account,to:recipient,value}]});
    status.textContent='Submitted';status.style.background='#fff3dd';status.style.color='#b46d00';
    payButton.textContent='Checking finality…';
    void waitForFinality(txHash,submittedAt,amount,recipient);
  }catch(error){console.error(error);payButton.textContent=account?'Pay test USDC':'Connect wallet to pay';payButton.disabled=false;showFriendlyError(error);}
});
