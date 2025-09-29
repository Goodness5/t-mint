'use client';

import { useState } from 'react';
import { Gift, Send, Loader2, CheckCircle, XCircle, Copy } from 'lucide-react';
import { WalletState, getContract, stringToFelt252 } from '@/lib/wallet';
import { getRandomFunnyText } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ClaimInterfaceProps {
  walletState: WalletState;
}

interface ClaimStatus {
  type: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  txHash?: string;
}

export default function ClaimInterface({ walletState }: ClaimInterfaceProps) {
  const [claimCode, setClaimCode] = useState('');
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>({ type: 'idle', message: '' });
  const [funnyText, setFunnyText] = useState(getRandomFunnyText('welcome'));

  const handleClaim = async () => {
    if (!claimCode.trim()) {
      setClaimStatus({ type: 'error', message: 'Please enter a claim code! 📝' });
      return;
    }

    if (!walletState.account) {
      setClaimStatus({ type: 'error', message: 'Please connect your wallet first! 🔗' });
      return;
    }

    setClaimStatus({ type: 'loading', message: 'Processing your claim... ⏳' });
    setFunnyText("Hang tight! We're working some blockchain magic... ✨");

    try {
      const contract = await getContract(walletState.account);
      
      // Convert claim code to felt252
      const codeFelt = stringToFelt252(claimCode);

      // Call the claim_tokens function (tokens go to caller's address)
      const result = await contract.claim_tokens(codeFelt);
      
      setClaimStatus({ 
        type: 'success', 
        message: getRandomFunnyText('claimSuccess'),
        txHash: result.transaction_hash 
      });
      setFunnyText("Your tokens are on their way! 🚀");
      
      // Reset form
      setClaimCode('');
      
    } catch (error: any) {
      console.error('Claim failed:', error);
      setClaimStatus({ 
        type: 'error', 
        message: getRandomFunnyText('claimError') 
      });
      setFunnyText("Don't worry, even the best blockchains have hiccups! 🤧");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
        <p className="text-gray-600 dark:text-gray-400">
          {funnyText}
        </p>
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
