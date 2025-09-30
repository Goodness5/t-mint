'use client';

import { useState, useEffect } from 'react';
import { Gift, Send, Loader2, CheckCircle, XCircle, Copy } from 'lucide-react';
import { useStarknetWallet } from '@/lib/use-starknet-wallet';
import { stringToFelt, feltToString } from '@/lib/wallet-utils';
import { getRandomFunnyText } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ClaimInterfaceProps {
  // No props needed - we'll use the hook directly
}

interface ClaimStatus {
  type: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  txHash?: string;
}

export default function ClaimInterface({}: ClaimInterfaceProps) {
  const [claimCode, setClaimCode] = useState('');
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>({ type: 'idle', message: '' });
  const [funnyText, setFunnyText] = useState('');
  
  const { account, getContract, isConnected } = useStarknetWallet();

  useEffect(() => {
    // Set initial funny text on client side only
    setFunnyText(getRandomFunnyText('welcome'));
  }, []);

  const handleClaim = async () => {
    // Prevent multiple simultaneous calls
    if (claimStatus.type === 'loading') {
      return;
    }

    if (!claimCode.trim()) {
      setClaimStatus({ type: 'error', message: 'Please enter a claim code!' });
      return;
    }

    if (!account) {
      setClaimStatus({ type: 'error', message: 'Please connect your wallet first!' });
      return;
    }

    setClaimStatus({ type: 'loading', message: 'Processing your claim...' });
    setFunnyText("Hang tight! We're working some blockchain magic...");

    try {
             const contract = getContract();
             if (!contract) {
               const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x0';
               if (contractAddress === '0x0') {
                 setClaimStatus({ 
                   type: 'error', 
                   message: 'Contract address not configured! Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env.local file.' 
                 });
               } else {
                 setClaimStatus({ 
                   type: 'error', 
                   message: 'Failed to create contract instance! Check console for details.' 
                 });
               }
               return;
             }
      
      console.log('🔍 Contract address:', process.env.NEXT_PUBLIC_CONTRACT_ADDRESS);
      console.log('🔍 Account address:', account?.address);
      
      // Convert claim code to felt252
      const codeFelt = stringToFelt(claimCode);
      console.log('🔍 Original code:', claimCode);
      console.log('🔍 Converted to felt252:', codeFelt);
      console.log('🔍 Code length:', claimCode.length);
      console.log('🔍 Felt252 length:', codeFelt.length);

      // First, let's check if the code exists and is not used
      console.log('🔍 Checking if code is used...');
      const isUsed = await contract.is_code_used(codeFelt);
      console.log('🔍 Code is used:', isUsed);
      
      if (isUsed) {
        setClaimStatus({ 
          type: 'error', 
          message: 'This claim code has already been used!' 
        });
        return;
      }

      // Get claim code info to verify it exists
      console.log('🔍 Getting claim code info...');
      const codeInfo = await contract.get_claim_code_info(codeFelt);
      console.log('🔍 Code info:', codeInfo);
      console.log('🔍 Code info type:', typeof codeInfo);
      console.log('🔍 Code info length:', codeInfo?.length);
      console.log('🔍 Code info[0] (amount):', codeInfo?.[0]);
      console.log('🔍 Code info[1] (exists):', codeInfo?.[1]);
      
      // The codeInfo should be a tuple: [amount: u256, exists: bool]
      // Let's be more lenient with the validation
      if (!codeInfo) {
        setClaimStatus({ 
          type: 'error', 
          message: 'Invalid claim code! This code does not exist.' 
        });
        return;
      }
      
      // Check if the second element (exists flag) is false
      if (codeInfo[1] === false || codeInfo[1] === 0) {
        setClaimStatus({ 
          type: 'error', 
          message: 'Invalid claim code! This code does not exist.' 
        });
        return;
      }

      // Call the claim_tokens function (tokens go to caller's address)
      console.log('🔍 Claim: Calling claim_tokens with:');
      console.log('  - Original code:', claimCode);
      console.log('  - Code felt252:', codeFelt);
      console.log('  - Function name: claim_tokens');
      console.log('  - Parameters array:', [codeFelt]);
      console.log('  - Contract address:', contract.address);
      console.log('  - Account address:', account?.address);
      
      // Call the claim_tokens function using invoke method
      const result = await contract.invoke('claim_tokens', [codeFelt]);
      console.log('🔍 Claim result:', result);
      console.log('🔍 Claim: Transaction hash:', result.transaction_hash);
      console.log('🔍 Claim: Full transaction details:', JSON.stringify(result, null, 2));
      
      setClaimStatus({ 
        type: 'success', 
        message: getRandomFunnyText('claimSuccess'),
        txHash: result.transaction_hash 
      });
      setFunnyText("Your tokens are on their way!");
      
      // Reset form
      setClaimCode('');
      
    } catch (error: any) {
      console.error('Claim failed:', error);
      
      let errorMessage = 'Failed to claim tokens. Please try again.';
      
      if (error.message) {
        if (error.message.includes('multicall failed')) {
          errorMessage = 'Transaction failed. Please check your wallet and try again.';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for gas fees. Please add ETH to your wallet.';
        } else if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction was cancelled by user.';
        } else if (error.message.includes('code already used')) {
          errorMessage = 'This claim code has already been used.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setClaimStatus({ 
        type: 'error', 
        message: errorMessage
      });
      setFunnyText("Don't worry, even the best blockchains have hiccups!");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const debugCodeConversion = () => {
    const codeFelt = stringToFelt(claimCode);
    const backToString = feltToString(codeFelt);
    
    console.log('🔍 DEBUG CODE CONVERSION:');
    console.log('  - Original code:', claimCode);
    console.log('  - Converted felt252:', codeFelt);
    console.log('  - Back to string:', backToString);
    console.log('  - Original length:', claimCode.length);
    console.log('  - Felt252 length:', codeFelt.length);
    console.log('  - Conversion works?', claimCode === backToString);
    
    // Show what would be sent to blockchain
    console.log('🔍 BLOCKCHAIN DATA ANALYSIS:');
    console.log('  - Function: claim_tokens');
    console.log('  - Parameter 1 (code):', codeFelt);
    console.log('  - Parameter type: felt252');
    console.log('  - This is what gets sent to blockchain!');
    
    alert(`Debug Info:\nOriginal: ${claimCode}\nFelt252: ${codeFelt}\nBack to string: ${backToString}\nConversion works: ${claimCode === backToString}\nCheck console for details.`);
  };

  const analyzeStarkScanTransaction = () => {
    const codeFelt = stringToFelt(claimCode);
    const hexBytes = Buffer.from(claimCode, 'utf8').toString('hex');
    
    console.log('🔍 STARKSAN ANALYSIS GUIDE:');
    console.log('  - Look for function: claim_tokens');
    console.log('  - Look for parameter: felt252');
    console.log('  - Expected value (string):', claimCode);
    console.log('  - Expected value (hex):', hexBytes);
    console.log('  - Expected value (felt252):', codeFelt);
    console.log('  - Contract address:', process.env.NEXT_PUBLIC_CONTRACT_ADDRESS);
    
    alert(`StarkScan Analysis:\nFunction: claim_tokens\nParameter: ${codeFelt}\nHex: ${hexBytes}\nCheck console for full details.`);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="p-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
            <Gift className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Claim Your STRK Tokens
        </h2>
        {funnyText && (
          <p className="text-gray-600 dark:text-gray-400">
            {funnyText}
          </p>
        )}
      </div>

      {/* Claim Form */}
      <div className="space-y-4">
        <div>
          <label htmlFor="claimCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Claim Code
          </label>
          <input
            id="claimCode"
            type="text"
            value={claimCode}
            onChange={(e) => setClaimCode(e.target.value)}
            placeholder="Enter your magical claim code..."
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>


        <div className="space-y-3">
          <button
            onClick={handleClaim}
            disabled={claimStatus.type === 'loading' || !claimCode.trim()}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl",
              claimStatus.type === 'loading' && "animate-pulse"
            )}
          >
            {claimStatus.type === 'loading' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span>
              {claimStatus.type === 'loading' ? 'Claiming...' : 'Claim Tokens'}
            </span>
          </button>
          
          {claimCode.trim() && (
            <div className="space-y-2">
              <button
                onClick={debugCodeConversion}
                className="w-full px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
              >
                🔍 Debug Code Conversion
              </button>
              <button
                onClick={analyzeStarkScanTransaction}
                className="w-full px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-700 dark:hover:bg-blue-600 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-300 dark:border-blue-600 transition-colors"
              >
                📊 Analyze StarkScan Data
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Message */}
      {claimStatus.type !== 'idle' && (
        <div className={cn(
          "p-4 rounded-lg border flex items-start gap-3",
          claimStatus.type === 'success' && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
          claimStatus.type === 'error' && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
          claimStatus.type === 'loading' && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
        )}>
          {claimStatus.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
          {claimStatus.type === 'error' && <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
          {claimStatus.type === 'loading' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin mt-0.5" />}
          
          <div className="flex-1">
            <p className={cn(
              "text-sm font-medium",
              claimStatus.type === 'success' && "text-green-700 dark:text-green-300",
              claimStatus.type === 'error' && "text-red-700 dark:text-red-300",
              claimStatus.type === 'loading' && "text-blue-700 dark:text-blue-300"
            )}>
              {claimStatus.message}
            </p>
            {claimStatus.txHash && (
              <div className="mt-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction Hash:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                    {claimStatus.txHash.slice(0, 10)}...{claimStatus.txHash.slice(-8)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(claimStatus.txHash!)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Copy transaction hash"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
          💡 How it works:
        </h3>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Connect your wallet to get started</li>
          <li>• Enter your claim code</li>
          <li>• Tokens will be sent to your connected wallet</li>
          <li>• Pay gas fees and claim your STRK! 🎉</li>
        </ul>
      </div>
    </div>
  );
}
