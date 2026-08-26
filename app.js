const walletButton=document.querySelector('#walletButton');
const payButton=document.querySelector('#payButton');
const createButton=document.querySelector('#createButton');
const status=document.querySelector('#status');
const receipt=document.querySelector('#receipt');
const recipientInput=document.querySelector('#recipient');
const amountInput=document.querySelector('#amount');
const notice=document.querySelector('#notice');
// Wallets require 18 native decimals for Arc's EVM network configuration.
// The USDC ERC-20 transfer below still uses the token's 6 display decimals.
const arcChain={chainId:'0x4cef52',chainName:'Arc Testnet',nativeCurrency:{name:'USDC',symbol:'USDC',decimals:18},rpcUrls:['https://rpc.drpc.testnet.arc.network'],blockExplorerUrls:['https://testnet.arcscan.app']};
let account;

function isAddress(value){return /^0x[a-fA-F0-9]{40}$/.test(value);}
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
  payButton.textContent='Pay test USDC';
  status.textContent='Wallet connected';
  return account;
}
walletButton.addEventListener('click',async()=>{try{await connectWallet();}catch(error){walletButton.textContent='Connect wallet';showFriendlyError(error);}});
createButton.addEventListener('click',()=>document.querySelector('#invoice').scrollIntoView({behavior:'smooth'}));
if(window.ethereum){
  window.ethereum.on('accountsChanged',accounts=>{
    account=accounts[0];
    walletButton.textContent=account?`${account.slice(0,6)}…${account.slice(-4)}`:'Connect wallet';
    payButton.textContent=account?'Pay test USDC':'Connect wallet to pay';
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
    const txHash=await window.ethereum.request({method:'eth_sendTransaction',params:[{from:account,to:recipient,value}]});
    status.textContent='Submitted';status.style.background='#e8fbf4';status.style.color='#16805d';
    payButton.textContent='Payment submitted ✓';
    receipt.querySelector('p:last-of-type').textContent=`${amount} test USDC submitted on Arc Testnet.`;
    receipt.querySelector('a').href=`https://testnet.arcscan.app/tx/${txHash}`;
    receipt.classList.remove('hidden');receipt.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(error){console.error(error);payButton.textContent=account?'Pay test USDC':'Connect wallet to pay';payButton.disabled=false;showFriendlyError(error);}
});
