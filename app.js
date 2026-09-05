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
const diagnosticMessage=document.querySelector('#diagnosticMessage');
const runDiagnosticButton=document.querySelector('#runDiagnosticButton');
const copyDiagnosticButton=document.querySelector('#copyDiagnosticButton');
const qaRuns=document.querySelector('#qaRuns');
const qaEmpty=document.querySelector('#qaEmpty');
const exportRunsButton=document.querySelector('#exportRunsButton');
const clearRunsButton=document.querySelector('#clearRunsButton');
const verifyButton=document.querySelector('#verifyButton');
const verifyForm=document.querySelector('#verifyForm');
const txHashInput=document.querySelector('#txHash');
const verifyResult=document.querySelector('#verifyResult');
const testCaseSelect=document.querySelector('#testCase');
const runWalletCheckButton=document.querySelector('#runWalletCheckButton');
const switchWalletNetworkButton=document.querySelector('#switchWalletNetworkButton');
const downloadWalletReportButton=document.querySelector('#downloadWalletReportButton');
const walletLabMessage=document.querySelector('#walletLabMessage');
const runRpcMatrixButton=document.querySelector('#runRpcMatrixButton');
const copyRpcMatrixButton=document.querySelector('#copyRpcMatrixButton');
const downloadRpcMatrixButton=document.querySelector('#downloadRpcMatrixButton');
const rpcMatrixRows=document.querySelector('#rpcMatrixRows');
const rpcMatrixMessage=document.querySelector('#rpcMatrixMessage');
const runReadinessButton=document.querySelector('#runReadinessButton');
const downloadReadinessButton=document.querySelector('#downloadReadinessButton');
const readinessTitleStatus=document.querySelector('#readinessTitleStatus');
const readinessMessage=document.querySelector('#readinessMessage');
// Arc uses USDC as its native gas token, with 18 decimals in wallet network metadata.
const arcRpc='https://rpc.testnet.arc.io';
const arcChain={chainId:'0x4cef52',chainName:'Arc Testnet',nativeCurrency:{name:'USDC',symbol:'USDC',decimals:18},rpcUrls:[arcRpc],blockExplorerUrls:['https://testnet.arcscan.app']};
const arcRpcEndpoints=[{name:'Primary',url:arcRpc},{name:'Blockdaemon',url:'https://rpc.blockdaemon.testnet.arc.io'},{name:'dRPC',url:'https://rpc.drpc.testnet.arc.io'},{name:'QuickNode',url:'https://rpc.quicknode.testnet.arc.io'}];
const nativeUsdcContract='0x3600000000000000000000000000000000000000';
let account;
let latestTestReport='';
let latestDiagnosticReport='';
let latestTestBundle;
let walletConnectionInFlight=false;
let latestWalletReport;
let latestRpcMatrixReport;
let latestRpcMatrixText='';
let latestReadinessBundle;
const testRunStorageKey='arcinvoice-test-runs-v1';

function isAddress(value){return /^0x[a-fA-F0-9]{40}$/.test(value);}
function isTransactionHash(value){return /^0x[a-fA-F0-9]{64}$/.test(value);}
function shortenAddress(value){return value?`${value.slice(0,8)}…${value.slice(-6)}`:'—';}
function formatNativeUsdc(value){const units=BigInt(value||'0x0');const whole=units/10n**18n;const fraction=(units%10n**18n).toString().padStart(18,'0').slice(0,6).replace(/0+$/,'');return `${whole.toLocaleString()}${fraction?`.${fraction}`:''} USDC`;}
function formatTokenUsdc(value){const units=BigInt(value||'0x0');const whole=units/10n**6n;const fraction=(units%10n**6n).toString().padStart(6,'0').replace(/0+$/,'');return `${whole.toLocaleString()}${fraction?`.${fraction}`:''} USDC`;}
function usdcTransfer(transaction){if(transaction?.to?.toLowerCase()!==nativeUsdcContract||!transaction.input?.startsWith('0xa9059cbb')||transaction.input.length<138)return null;return {to:`0x${transaction.input.slice(34,74)}`,amount:`0x${transaction.input.slice(74,138)}`};}
async function rpc(method,params){const response=await fetch(arcRpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});if(!response.ok)throw new Error('Arc RPC is temporarily unavailable.');const payload=await response.json();if(payload.error)throw new Error(payload.error.message||'Arc RPC returned an error.');return payload.result;}
async function rpcAt(endpoint,method,params){const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});if(!response.ok)throw new Error(`HTTP ${response.status}`);const payload=await response.json();if(payload.error)throw new Error(payload.error.message||'RPC returned an error');return payload.result;}
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));}
function setWalletLabCell(name,state,detail){const stateElement=document.querySelector(`#wallet${name}State`);const detailElement=document.querySelector(`#wallet${name}Detail`);stateElement.textContent=state.toUpperCase();stateElement.className=`wallet-state ${state}`;detailElement.textContent=detail;}
function sanitizeWalletError(error){return String(error?.message||error||'Unknown wallet error').replace(/0x[a-fA-F0-9]{40,}/g,'[redacted]').replace(/\s+/g,' ').slice(0,180);}
function walletProviderLabel(provider){if(provider?.isMetaMask)return 'MetaMask-compatible EIP-1193 provider detected';if(provider?.isRabby)return 'Rabby EIP-1193 provider detected';return provider?'EIP-1193 provider detected':'No injected EVM wallet detected';}
async function runWalletCompatibilityCheck(){
  runWalletCheckButton.disabled=true;
  runWalletCheckButton.textContent='Checking…';
  walletLabMessage.textContent='Running read-only compatibility checks. No signature or transaction is requested.';
  const checkedAt=new Date().toISOString();
  const report={schema:'arcinvoice.wallet-compatibility-report.v1',checkedAt,network:{name:'Arc Testnet',expectedChainId:5042002,rpc:arcRpc},privacy:'No wallet address, seed phrase, private key, signature, or transaction data is included.',checks:{}};
  const provider=window.ethereum;
  if(!provider){
    setWalletLabCell('Provider','fail',walletProviderLabel());
    setWalletLabCell('Account','warn','Install a wallet to test account access');
    setWalletLabCell('Chain','warn','Wallet network cannot be checked');
    report.checks.provider={status:'fail',detail:'No injected EVM wallet detected'};
    report.checks.account={status:'not-tested'};
    report.checks.chain={status:'not-tested'};
  }else{
    setWalletLabCell('Provider','pass',walletProviderLabel(provider));
    report.checks.provider={status:'pass',detail:walletProviderLabel(provider)};
    try{
      const [accounts,chainId]=await Promise.all([provider.request({method:'eth_accounts'}),provider.request({method:'eth_chainId'})]);
      const connected=Boolean(accounts?.[0]);
      setWalletLabCell('Account',connected?'pass':'warn',connected?'Account access is available (address hidden)':'No account connected — use Connect wallet to test');
      const onArc=String(chainId).toLowerCase()===arcChain.chainId;
      setWalletLabCell('Chain',onArc?'pass':'warn',onArc?'Arc Testnet selected (5042002)':`Current chain ${Number(BigInt(chainId))}; switch to Arc Testnet`);
      report.checks.account={status:connected?'pass':'warn',connected};
      report.checks.chain={status:onArc?'pass':'warn',reportedChainId:String(chainId),expectedChainId:arcChain.chainId};
    }catch(error){
      const detail=sanitizeWalletError(error);
      setWalletLabCell('Account','fail','Wallet did not return read-only account status');
      setWalletLabCell('Chain','fail','Wallet did not return chain status');
      report.checks.account={status:'fail',error:detail};
      report.checks.chain={status:'fail',error:detail};
    }
  }
  try{
    const rpcChainId=await rpc('eth_chainId',[]);
    const rpcMatches=rpcChainId.toLowerCase()===arcChain.chainId;
    setWalletLabCell('Rpc',rpcMatches?'pass':'fail',rpcMatches?`Primary RPC reports Arc Testnet (${Number(BigInt(rpcChainId))})`:`RPC returned unexpected chain ${rpcChainId}`);
    report.checks.rpc={status:rpcMatches?'pass':'fail',reportedChainId:rpcChainId};
  }catch(error){
    const detail=sanitizeWalletError(error);
    setWalletLabCell('Rpc','fail','Primary RPC could not be reached from this browser');
    report.checks.rpc={status:'fail',error:detail};
  }
  latestWalletReport=report;
  downloadWalletReportButton.classList.remove('hidden');
  walletLabMessage.textContent='Compatibility check complete. Download the sanitized JSON report when sharing a reproducible wallet or RPC issue.';
  runWalletCheckButton.disabled=false;
  runWalletCheckButton.textContent='Run compatibility check';
}
async function switchWalletToArcForLab(){
  if(!window.ethereum){walletLabMessage.textContent='Install an EVM wallet first, then run the compatibility check again.';return;}
  switchWalletNetworkButton.disabled=true;
  switchWalletNetworkButton.textContent='Switching…';
  try{await ensureArcNetwork();walletLabMessage.textContent='Arc Testnet was selected. Refreshing the compatibility results…';await runWalletCompatibilityCheck();}
  catch(error){walletLabMessage.textContent=`Could not switch network: ${sanitizeWalletError(error)}`;}
  finally{switchWalletNetworkButton.disabled=false;switchWalletNetworkButton.textContent='Switch to Arc Testnet';}
}
function downloadWalletReport(){if(latestWalletReport)downloadJson(latestWalletReport,`arc-wallet-compatibility-${latestWalletReport.checkedAt.slice(0,10)}.json`);}
function matrixDifference(blockNumber,primaryBlock){if(primaryBlock===null||blockNumber===null)return '—';const difference=primaryBlock-blockNumber;if(difference===0)return 'In sync';return difference>0?`${difference.toLocaleString()} behind`:`${Math.abs(difference).toLocaleString()} ahead`;}
function renderRpcMatrix(results){const primary=results.find(result=>result.name==='Primary');const primaryBlock=primary?.blockNumber??null;rpcMatrixRows.innerHTML=results.map(result=>{const statusClass=result.status==='pass'?'pass':result.status==='warn'?'warn':'fail';const chain=result.chainId?Number(BigInt(result.chainId)).toLocaleString():'—';const block=result.blockNumber===null?'—':result.blockNumber.toLocaleString();const observed=result.responseMs?`${result.responseMs} ms`:'—';const detail=result.error?escapeHtml(result.error):escapeHtml(matrixDifference(result.blockNumber,primaryBlock));return `<tr><td>${escapeHtml(result.name)}<br><code>${escapeHtml(result.url)}</code></td><td>${chain}</td><td>${block}</td><td>${detail}</td><td>${observed}</td><td><span class="rpc-status ${statusClass}">${result.status.toUpperCase()}</span></td></tr>`;}).join('');}
async function runRpcMatrix(){
  runRpcMatrixButton.disabled=true;
  runRpcMatrixButton.textContent='Checking…';
  rpcMatrixRows.innerHTML='<tr><td colspan="6">Checking official Arc endpoints…</td></tr>';
  rpcMatrixMessage.textContent='Calling eth_chainId and eth_blockNumber from this browser. No wallet action is requested.';
  const checkedAt=new Date().toISOString();
  const results=await Promise.all(arcRpcEndpoints.map(async endpoint=>{
    const startedAt=performance.now();
    try{
      const [chainId,block]=await Promise.all([rpcAt(endpoint.url,'eth_chainId',[]),rpcAt(endpoint.url,'eth_blockNumber',[])]);
      const responseMs=Math.max(1,Math.round(performance.now()-startedAt));
      const status=chainId.toLowerCase()===arcChain.chainId?'pass':'fail';
      return {name:endpoint.name,url:endpoint.url,status,chainId,blockNumber:Number(BigInt(block)),responseMs};
    }catch(error){return {name:endpoint.name,url:endpoint.url,status:'fail',chainId:null,blockNumber:null,responseMs:null,error:sanitizeWalletError(error)};}
  }));
  const primaryBlock=results.find(result=>result.name==='Primary')?.blockNumber??null;
  results.forEach(result=>{if(result.status==='pass'&&primaryBlock!==null&&result.blockNumber!==null&&Math.abs(primaryBlock-result.blockNumber)>2)result.status='warn';});
  renderRpcMatrix(results);
  latestRpcMatrixReport={schema:'arcinvoice.arc-rpc-resilience-report.v1',checkedAt,network:{name:'Arc Testnet',expectedChainId:5042002},methods:['eth_chainId','eth_blockNumber'],privacy:'Read-only browser observation. No wallet, address, signature, transaction, seed phrase, or private key is included.',endpoints:results.map(result=>({...result,blockDifference:matrixDifference(result.blockNumber,primaryBlock)}))};
  latestRpcMatrixText=`Arc RPC Resilience Report\nChecked at: ${checkedAt}\nExpected chain: 5042002 (${arcChain.chainId})\n\n${latestRpcMatrixReport.endpoints.map(result=>`${result.name}: ${result.status.toUpperCase()} · chain ${result.chainId?Number(BigInt(result.chainId)):'—'} · block ${result.blockNumber??'—'} · ${result.blockDifference} · ${result.responseMs?`${result.responseMs} ms`:'no response'}${result.error?` · ${result.error}`:''}`).join('\n')}\n\nClient-side observation only; not a network performance benchmark.`;
  const passCount=results.filter(result=>result.status==='pass').length;
  const warnCount=results.filter(result=>result.status==='warn').length;
  rpcMatrixMessage.textContent=`Matrix complete: ${passCount} endpoint${passCount===1?'':'s'} in sync${warnCount?`, ${warnCount} needs review`:''}. Export the report for reproducible infrastructure feedback.`;
  copyRpcMatrixButton.classList.remove('hidden');
  downloadRpcMatrixButton.classList.remove('hidden');
  runRpcMatrixButton.disabled=false;
  runRpcMatrixButton.textContent='Run matrix';
}
async function copyRpcMatrix(){if(!latestRpcMatrixText)return;try{await navigator.clipboard.writeText(latestRpcMatrixText);copyRpcMatrixButton.textContent='Report copied ✓';}catch(error){copyRpcMatrixButton.textContent='Copy blocked';}}
function downloadRpcMatrix(){if(latestRpcMatrixReport)downloadJson(latestRpcMatrixReport,`arc-rpc-resilience-${latestRpcMatrixReport.checkedAt.slice(0,10)}.json`);}
function readinessOutcome(){
  const walletChecks=Object.values(latestWalletReport?.checks||{});
  const walletFailures=walletChecks.filter(check=>check.status==='fail').length;
  const walletWarnings=walletChecks.filter(check=>check.status==='warn').length;
  const rpcFailures=(latestRpcMatrixReport?.endpoints||[]).filter(endpoint=>endpoint.status==='fail').length;
  const rpcWarnings=(latestRpcMatrixReport?.endpoints||[]).filter(endpoint=>endpoint.status==='warn').length;
  if(walletFailures||rpcFailures)return {label:'Needs review',detail:`${walletFailures+rpcFailures} check${walletFailures+rpcFailures===1?'':'s'} needs attention before sharing feedback.`};
  if(walletWarnings)return {label:'Wallet action needed',detail:'Connect a wallet and select Arc Testnet before submitting a payment. The report is still safe to share as a reproducible pre-flight observation.'};
  if(rpcWarnings)return {label:'Ready with observations',detail:`${rpcWarnings} RPC endpoint${rpcWarnings===1?'':'s'} was slightly out of sync during this browser observation.`};
  return {label:'Readiness check complete',detail:'All available read-only checks completed. Download the bundle for reproducible technical feedback.'};
}
async function runReadinessCheck(){
  runReadinessButton.disabled=true;
  runReadinessButton.textContent='Checking…';
  readinessTitleStatus.textContent='Running read-only pre-flight checks';
  readinessMessage.textContent='Checking public RPC, wallet compatibility, and endpoint consistency. No signature or transaction is requested.';
  try{
    await Promise.all([runDiagnostic(),runWalletCompatibilityCheck(),runRpcMatrix()]);
    const outcome=readinessOutcome();
    latestReadinessBundle={
      schema:'arcinvoice.arc-network-readiness.v1',
      checkedAt:new Date().toISOString(),
      network:{name:'Arc Testnet',chainId:5042002,primaryRpc:arcRpc},
      outcome:outcome.label,
      privacy:'Read-only browser observation. No wallet address, seed phrase, private key, signature, or transaction is included.',
      diagnostic:latestDiagnosticReport||null,
      walletCompatibility:latestWalletReport||null,
      rpcResilience:latestRpcMatrixReport||null
    };
    readinessTitleStatus.textContent=outcome.label;
    readinessMessage.textContent=outcome.detail;
    downloadReadinessButton.classList.remove('hidden');
  }catch(error){
    readinessTitleStatus.textContent='Readiness check incomplete';
    readinessMessage.textContent='One or more checks could not finish. Try again and include the time in a reproducible report.';
  }finally{
    runReadinessButton.disabled=false;
    runReadinessButton.textContent='Run readiness check';
  }
}
function downloadReadinessBundle(){if(latestReadinessBundle)downloadJson(latestReadinessBundle,`arc-network-readiness-${latestReadinessBundle.checkedAt.slice(0,10)}.json`);}
function buildInvoiceLink(){const recipient=recipientInput.value.trim();const amount=amountInput.value.trim();if(!isAddress(recipient)||!/^\d+(\.\d{1,6})?$/.test(amount))return null;const params=new URLSearchParams({to:recipient,amount});const memo=memoInput.value.trim();if(memo)params.set('memo',memo);return `${window.location.origin}${window.location.pathname}?${params.toString()}#invoice`;}
function renderInvoiceLink(){const link=buildInvoiceLink();shareLink.textContent=link||'Enter a valid recipient and amount to create a shareable invoice link.';return link;}
async function copyInvoiceLink(){const link=renderInvoiceLink();if(!link){shareMessage.textContent='Enter a valid 0x recipient and positive USDC amount first.';return;}try{await navigator.clipboard.writeText(link);shareMessage.textContent='Invoice link copied. Share it with the payer.';}catch(error){shareMessage.textContent='Copy was blocked by this browser. Select the link above and copy it manually.';}}
function loadInvoiceFromLink(){const params=new URLSearchParams(window.location.search);const recipient=params.get('to');const amount=params.get('amount');const memo=params.get('memo');if(recipient&&isAddress(recipient))recipientInput.value=recipient;if(amount&&/^\d+(\.\d{1,6})?$/.test(amount))amountInput.value=amount;if(memo)memoInput.value=memo.slice(0,120);renderInvoiceLink();}
async function loadNetworkStatus(){try{const block=await rpc('eth_blockNumber',[]);latestBlock.textContent=Number(BigInt(block)).toLocaleString();rpcStatus.textContent='Online';networkMessage.textContent='Public RPC connected. Read-only data is loaded directly from Arc Testnet.';}catch(error){rpcStatus.textContent='Unavailable';rpcStatus.style.color='#b34b56';networkMessage.textContent='The public RPC is temporarily unavailable. Payments may still work through your wallet.';}}
async function runDiagnostic(){runDiagnosticButton.disabled=true;runDiagnosticButton.textContent='Checking…';diagnosticMessage.textContent='Checking public RPC responses…';try{const startedAt=performance.now();const [chainId,block]=await Promise.all([rpc('eth_chainId',[]),rpc('eth_blockNumber',[])]);const milliseconds=Math.max(1,Math.round(performance.now()-startedAt));const chainMatches=chainId.toLowerCase()===arcChain.chainId;const blockNumber=Number(BigInt(block)).toLocaleString();latestBlock.textContent=blockNumber;rpcStatus.textContent=chainMatches?'Online':'Unexpected chain';rpcStatus.style.color=chainMatches?'#16805d':'#b34b56';diagnosticMessage.textContent=`RPC responded in ${milliseconds} ms · chain ${Number(BigInt(chainId))} · block ${blockNumber}.`;latestDiagnosticReport=`Arc Testnet RPC diagnostic\nChecked at: ${new Date().toISOString()}\nRPC: ${arcRpc}\nExpected chain ID: 5042002 (${arcChain.chainId})\nReported chain ID: ${Number(BigInt(chainId))} (${chainId})\nChain match: ${chainMatches?'Yes':'No'}\nLatest block: ${blockNumber}\nBrowser-observed RPC response: ${milliseconds} ms\n\nThis is a client-side observation, not a network performance benchmark.`;copyDiagnosticButton.classList.remove('hidden');}catch(error){rpcStatus.textContent='Unavailable';rpcStatus.style.color='#b34b56';diagnosticMessage.textContent='Diagnostic could not reach the public RPC. Try again and include the time in a bug report.';}finally{runDiagnosticButton.disabled=false;runDiagnosticButton.textContent='Run diagnostic';}}
async function copyDiagnostic(){if(!latestDiagnosticReport)return;try{await navigator.clipboard.writeText(latestDiagnosticReport);copyDiagnosticButton.textContent='Report copied ✓';}catch(error){copyDiagnosticButton.textContent='Copy blocked';}}
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
function makeTestId(){return `arc-test-${crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`}`;}
function getTestRuns(){try{const runs=JSON.parse(localStorage.getItem(testRunStorageKey)||'[]');return Array.isArray(runs)?runs.filter(run=>run&&typeof run==='object'&&run.transaction&&typeof run.transaction==='object'):[];}catch(error){return [];}}
function downloadJson(data,filename){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function renderTestRuns(){const runs=getTestRuns();qaEmpty.classList.toggle('hidden',runs.length>0);qaRuns.classList.toggle('hidden',runs.length===0);qaRuns.innerHTML=runs.map((run,index)=>{const transaction=run.transaction||{};const checkedAt=Date.parse(run.checkedAt||'')?new Date(run.checkedAt).toLocaleString():'Unknown time';return `<li class="qa-run"><div><strong>${escapeHtml(run.testCase||'Payment verification')} · ${escapeHtml(transaction.status||'Unknown')}</strong><span>${escapeHtml(run.testId||'Unknown test')} · ${escapeHtml(shortenAddress(transaction.hash||''))} · ${escapeHtml(checkedAt)}</span></div><button type="button" data-run-index="${index}">Download JSON</button></li>`;}).join('');}
function saveTestRun(bundle){const runs=[bundle,...getTestRuns().filter(run=>run.testId!==bundle.testId)].slice(0,10);localStorage.setItem(testRunStorageKey,JSON.stringify(runs));renderTestRuns();}
function createVerifiedReport(bundle){return `Arc Testnet verification report\nTest ID: ${bundle.testId}\nTest case: ${bundle.testCase}\nChecked at: ${bundle.checkedAt}\nChain ID: ${bundle.network.chainId}\nRPC: ${bundle.rpc.endpoint}\nRPC methods: ${bundle.rpc.methods.join(', ')}\nTransaction: ${bundle.transaction.hash}\nStatus: ${bundle.transaction.status}\nAmount: ${bundle.transaction.amount}\nFrom: ${bundle.transaction.from}\nTo: ${bundle.transaction.to||'—'}\nBlock: ${bundle.transaction.block}\nBlock time: ${bundle.transaction.blockTime}\nArcScan: ${bundle.transaction.arcscan}\n\nRead-only verification: no wallet connection or signature was requested.`;}
function downloadTestBundle(){if(latestTestBundle)downloadJson(latestTestBundle,`${latestTestBundle.testId}.json`);}
async function verifyTransaction(event){event.preventDefault();const hash=txHashInput.value.trim();if(!isTransactionHash(hash)){showVerification('<strong>Enter a valid transaction hash.</strong><span>It must start with 0x and contain 64 hexadecimal characters.</span>','error');return;}const submitButton=verifyForm.querySelector('button');submitButton.disabled=true;submitButton.textContent='Checking…';showVerification('<strong>Checking Arc Testnet…</strong><span>Looking up the transaction and final receipt.</span>','loading');try{const [transaction,receipt]=await Promise.all([rpc('eth_getTransactionByHash',[hash]),rpc('eth_getTransactionReceipt',[hash])]);if(!transaction){showVerification('<strong>No Arc Testnet transaction found.</strong><span>Check the hash and make sure the transaction was sent on Arc Testnet.</span>','error');return;}const successful=receipt?.status==='0x1';const pending=!receipt;const blockData=receipt?await rpc('eth_getBlockByNumber',[receipt.blockNumber,false]):null;const title=pending?'Transaction pending':successful?'Payment confirmed':'Transaction failed';const statusClass=pending?'pending':successful?'success':'error';const statusLabel=pending?'Pending':successful?'Finalized':'Failed';const timestamp=blockData?.timestamp?new Date(Number(BigInt(blockData.timestamp))*1000).toLocaleString():'Awaiting confirmation';const tokenTransfer=usdcTransfer(transaction);const paidTo=tokenTransfer?.to||transaction.to;const amount=tokenTransfer?formatTokenUsdc(tokenTransfer.amount):formatNativeUsdc(transaction.value);const blockNumber=receipt?Number(BigInt(receipt.blockNumber)).toLocaleString():'—';latestTestBundle={schema:'arcinvoice.arc-test-report.v1',testId:makeTestId(),testCase:testCaseSelect.value,checkedAt:new Date().toISOString(),network:{name:'Arc Testnet',chainId:5042002},rpc:{endpoint:arcRpc,methods:['eth_getTransactionByHash','eth_getTransactionReceipt',...(receipt?['eth_getBlockByNumber']:[])]},transaction:{hash,status:statusLabel,amount,from:transaction.from,to:paidTo||null,block:blockNumber,blockTime:timestamp,arcscan:`https://testnet.arcscan.app/tx/${hash}`},privacy:'Read-only verification. No wallet connection or signature was requested.'};saveTestRun(latestTestBundle);latestTestReport=createVerifiedReport(latestTestBundle);showVerification(`<div class="verify-heading"><strong>${title}</strong><a href="https://testnet.arcscan.app/tx/${hash}" target="_blank" rel="noreferrer">View on ArcScan ↗</a></div><dl><div><dt>Amount</dt><dd>${amount}</dd></div><div><dt>Status</dt><dd>${statusLabel}</dd></div><div><dt>From</dt><dd title="${transaction.from}">${shortenAddress(transaction.from)}</dd></div><div><dt>To</dt><dd title="${paidTo||''}">${shortenAddress(paidTo)}</dd></div><div><dt>Block</dt><dd>${blockNumber}</dd></div><div><dt>Time</dt><dd>${timestamp}</dd></div></dl><div class="test-report"><p>QA bundle ${latestTestBundle.testId} · public RPC data only</p><div><button type="button" id="copyVerifiedReport">Copy report</button><button type="button" id="downloadVerifiedBundle">Download JSON</button></div></div>`,statusClass);}catch(error){console.error(error);showVerification('<strong>Could not check this payment right now.</strong><span>Please try again in a moment. No wallet action was requested.</span>','error');}finally{submitButton.disabled=false;submitButton.textContent='Verify';}}
function setConnectedAccount(nextAccount){
  account=nextAccount;
  if(!account){
    walletButton.textContent='Connect wallet';
    payButton.textContent='Connect wallet to pay';
    disconnectButton.classList.add('hidden');
    status.textContent='Ready';
    status.style.background='';
    status.style.color='';
    return;
  }
  walletButton.textContent=`${account.slice(0,6)}…${account.slice(-4)}`;
  disconnectButton.classList.remove('hidden');
  payButton.textContent='Pay test USDC';
  status.textContent='Wallet connected';
}
async function disconnectWallet(revokePermission=true){
  let permissionsRevoked=false;
  if(revokePermission&&window.ethereum){
    disconnectButton.textContent='Disconnecting…';
    try{await window.ethereum.request({method:'wallet_revokePermissions',params:[{eth_accounts:{}}]});permissionsRevoked=true;}catch(error){console.info('Wallet permission revoke is not available in this wallet.',error);}
  }
  setConnectedAccount(undefined);
  disconnectButton.textContent='Disconnect';
  notice.textContent=permissionsRevoked?'Wallet disconnected.':'Disconnected from this site. To use another account, select it in your wallet, then click Connect wallet.';
}
function showFriendlyError(error){
  const message=String(error?.message||'');
  status.textContent='Action needed';
  if(message.includes('same RPC endpoint')||message.includes('invalid chain ID')){
    notice.innerHTML='Your wallet has an older Arc Testnet entry saved. Remove the old Arc Testnet network in wallet settings, then add it again with chain ID <b>5042002</b> and RPC <b>https://rpc.testnet.arc.io</b>.';
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
async function ensureArcNetwork(){
  if(!window.ethereum)throw new Error('Install MetaMask or another EVM wallet first.');
  try{
    await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:arcChain.chainId}]});
  }catch(error){
    if(error?.code!==4902)throw error;
    await window.ethereum.request({method:'wallet_addEthereumChain',params:[arcChain]});
    await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:arcChain.chainId}]});
  }
}
async function connectWallet(){
  if(!window.ethereum)throw new Error('Install MetaMask or another EVM wallet first.');
  if(walletConnectionInFlight)return account;
  walletConnectionInFlight=true;
  walletButton.disabled=true;
  walletButton.textContent='Connecting…';
  try{
    const accounts=await window.ethereum.request({method:'eth_requestAccounts'});
    const selectedAccount=accounts?.[0];
    if(!selectedAccount)throw new Error('No wallet account was selected.');
    await ensureArcNetwork();
    setConnectedAccount(selectedAccount);
  }finally{
    walletConnectionInFlight=false;
    walletButton.disabled=false;
  }
  return account;
}
walletButton.addEventListener('click',async()=>{try{await connectWallet();await runWalletCompatibilityCheck();}catch(error){walletButton.textContent='Connect wallet';showFriendlyError(error);}});
disconnectButton.addEventListener('click',()=>{void disconnectWallet();});
createButton.addEventListener('click',()=>document.querySelector('#invoice').scrollIntoView({behavior:'smooth'}));
verifyButton.addEventListener('click',()=>document.querySelector('#verifier').scrollIntoView({behavior:'smooth',block:'center'}));
verifyForm.addEventListener('submit',verifyTransaction);
verifyResult.addEventListener('click',event=>{if(event.target.id==='copyVerifiedReport')void copyTestReport(event.target);if(event.target.id==='downloadVerifiedBundle')downloadTestBundle();});
qaRuns.addEventListener('click',event=>{const index=Number(event.target.dataset.runIndex);const run=getTestRuns()[index];if(run)downloadJson(run,`${run.testId}.json`);});
exportRunsButton.addEventListener('click',()=>{const runs=getTestRuns();if(runs.length)downloadJson({schema:'arcinvoice.arc-test-runs.v1',exportedAt:new Date().toISOString(),runs},'arc-testnet-qa-runs.json');});
clearRunsButton.addEventListener('click',()=>{localStorage.removeItem(testRunStorageKey);renderTestRuns();});
shareButton.addEventListener('click',()=>{void copyInvoiceLink();});
copyReportButton.addEventListener('click',()=>{void copyTestReport();});
runDiagnosticButton.addEventListener('click',()=>{void runDiagnostic();});
copyDiagnosticButton.addEventListener('click',()=>{void copyDiagnostic();});
runWalletCheckButton.addEventListener('click',()=>{void runWalletCompatibilityCheck();});
switchWalletNetworkButton.addEventListener('click',()=>{void switchWalletToArcForLab();});
downloadWalletReportButton.addEventListener('click',downloadWalletReport);
runRpcMatrixButton.addEventListener('click',()=>{void runRpcMatrix();});
copyRpcMatrixButton.addEventListener('click',()=>{void copyRpcMatrix();});
downloadRpcMatrixButton.addEventListener('click',downloadRpcMatrix);
runReadinessButton.addEventListener('click',()=>{void runReadinessCheck();});
downloadReadinessButton.addEventListener('click',downloadReadinessBundle);
[recipientInput,amountInput,memoInput].forEach(input=>input.addEventListener('input',renderInvoiceLink));
loadInvoiceFromLink();
renderTestRuns();
void loadNetworkStatus();
void runWalletCompatibilityCheck();
if(window.ethereum){
  window.ethereum.on('accountsChanged',accounts=>{
    setConnectedAccount(accounts?.[0]);
    void runWalletCompatibilityCheck();
  });
  window.ethereum.on('chainChanged',()=>window.location.reload());
  window.ethereum.request({method:'eth_accounts'}).then(accounts=>setConnectedAccount(accounts?.[0])).catch(()=>{});
}
payButton.addEventListener('click',async()=>{
  try{
    if(!account)await connectWallet();
    await ensureArcNetwork();
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
