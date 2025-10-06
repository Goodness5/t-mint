'use client';

import { useState, useEffect } from 'react';
import { Gift, Send, Loader2, CheckCircle, XCircle, Copy, Wallet, Sparkles, Zap, Shield, Star, Hash } from 'lucide-react';
import { useStarknetWallet } from '@/lib/use-starknet-wallet';
import { codeToFelt, CONTRACT_ADDRESS, NETWORK } from '@/lib/wallet-utils';
import { cn } from '@/lib/utils';
import SuccessModal from './SuccessModal';
import HelpModal from './HelpModal';

interface ClaimInterfaceProps {}

interface ClaimStatus {
  type: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  txHash?: string;
}

const welcomeTexts = [
  "Welcome to the token party! 🎉",
  "Ready to claim some free money? 💰", 
  "Your tokens are waiting... impatiently 😏",
  "Let's get you connected to the blockchain! ⛓️",
  "Time to make it rain tokens! ☔",
  "Your wallet is about to get heavier 💪",
  "Welcome to the future of money! 🚀",
  "Let's turn your wallet into a treasure chest! 🏴‍☠️"
];

const claimTexts = [
  "Enter your magic code below! ✨",
  "Your tokens are just a code away! 🎯",
  "Ready to claim? Let's do this! 🚀",
  "Time to unlock your tokens! 🔓",
  "Your code is the key to success! 🗝️",
  "Let's claim some tokens! 💎",
  "Your tokens are calling... 📞",
  "Ready to get rich? (Legally) 💰"
];

export default function ClaimInterface({}: ClaimInterfaceProps) {
  const [claimCode, setClaimCode] = useState('');
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>({ type: 'idle', message: '' });
  const [displayText, setDisplayText] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [successData, setSuccessData] = useState<{ txHash: string; amount: string } | null>(null);

  const {
    account,
    isConnected,
    claimTokens,
    isCodeClaimed
  } = useStarknetWallet();

  useEffect(() => {
    const texts = isConnected ? claimTexts : welcomeTexts;
    const randomText = texts[Math.floor(Math.random() * texts.length)];
    setDisplayText(randomText);
  }, [isConnected]);


  // Proof generation is now handled by the API route

  const fetchClaimData = async (code: string) => {
    try {
      console.log('🔍 💾 FETCHING CLAIM FROM API:');
      console.log('🔍   - User code:', code);
      
      // Send code as POST payload to API route
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code.toUpperCase() }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid claim code');
      }
      
      const data = await response.json();
      
      console.log('🔍 ✅ CLAIM FOUND VIA API:');
      console.log('🔍   - Full response data:', data);
      console.log('🔍   - data.amount:', data.amount);
      console.log('🔍   - data.amount.low:', data.amount?.low);
      console.log('🔍   - data.amount.high:', data.amount?.high);
      console.log('🔍   - data.proof:', data.proof);
      console.log('🔍   - data.merkleRoot:', data.merkleRoot);
      
      // API now returns simple amount as string
      console.log('🔍 API amount data:', data.amount);
      const amount = BigInt(data.amount || '0');
      console.log('🔍 Converted amount:', amount.toString());
      
      return { amount, proof: data.proof, merkleRoot: data.merkleRoot };
    } catch (error) {
      console.error('Failed to fetch claim data:', error);
      throw error;
    }
  };

  const handleClaim = async () => {
    if (claimStatus.type === 'loading') return;
    if (!claimCode.trim()) {
      setClaimStatus({ type: 'error', message: 'Please enter a claim code!' });
      return;
    }
    if (!account) {
      setClaimStatus({ type: 'error', message: 'Please connect your wallet first!' });
      return;
    }

    setClaimStatus({ type: 'loading', message: 'Processing your claim...' });

    try {
      // Fetch proof and amount from backend
      const { amount, proof, merkleRoot } = await fetchClaimData(claimCode);

      // Convert claim code to felt252
      const codeFelt = codeToFelt(claimCode);

      console.log('🔍 Claim details:', {
        code: claimCode,
        codeFelt: codeFelt.toString(),
        amount: `${(Number(amount) / 10 ** 18).toFixed(6)} STRK`,
        amountU256: amount,
        proof,
        network: NETWORK,
        contractAddress: CONTRACT_ADDRESS,
      });
      
      // Debug the leaf hash that should be generated
      const { poseidonHashMany } = await import('@scure/starknet');
      const amountLow = amount & BigInt('0xffffffffffffffffffffffffffffffff'); // Lower 128 bits
      const amountHigh = amount >> BigInt(128); // Upper 128 bits
      const expectedLeafHash = poseidonHashMany([
        codeFelt,
        amountLow,
        amountHigh,
      ]);
      console.log('🔍 Expected leaf hash:', `0x${expectedLeafHash.toString(16).padStart(64, '0')}`);
      console.log('🔍 Code felt (hex):', `0x${codeFelt.toString(16)}`);
      console.log('🔍 Amount low (hex):', `0x${amountLow.toString(16)}`);
      console.log('🔍 Amount high (hex):', `0x${amountHigh.toString(16)}`);

      // Check if code already claimed
      const isClaimed = await isCodeClaimed(codeFelt, amount);
      if (isClaimed) {
        setClaimStatus({ type: 'error', message: 'This claim code has already been used.' });
        return;
      }

      // Submit claim
      console.log('🔍 About to submit claim transaction:');
      console.log('  - Code felt:', codeFelt.toString());
      console.log('  - Amount:', amount);
      console.log('  - Proof length:', proof.length);
      console.log('  - Proof elements:', proof);
      
      const tx = await claimTokens(codeFelt, amount, proof);
      console.log('✅ Transaction submitted:', tx.transaction_hash);
      
      console.log('⏳ Waiting for transaction confirmation...');
      await account.waitForTransaction(tx.transaction_hash);
      console.log('✅ Transaction confirmed!');

      // Smart contract already handles marking as claimed

      // Show success modal
      setSuccessData({
        txHash: tx.transaction_hash,
        amount: `${(Number(amount) / 10 ** 18).toFixed(6)}`
      });
      setShowSuccessModal(true);


      // Reset form
      setClaimCode('');
      setClaimStatus({ type: 'idle', message: '' });
    } catch (error: any) {
      console.error('Claim failed:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        code: error.code,
        details: error.details,
        cause: error.cause
      });
      let errorMessage = 'Failed to claim tokens. Please try again.';
      if (error.message) {
        if (error.message.includes('Invalid claim code')) {
          errorMessage = 'Invalid claim code. Please check and try again.';
        } else if (error.message.includes('multicall failed')) {
          errorMessage = 'Transaction failed. Please check your wallet and try again.';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for gas fees. Please add ETH to your wallet.';
        } else if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction was cancelled by user.';
        } else if (error.message.includes('code already used') || error.message.includes('already been used')) {
          errorMessage = 'This claim code has already been used.';
        } else if (error.message.includes('no longer valid') || error.message.includes('campaign has changed') || error.message.includes('Database claims do not match')) {
          errorMessage = 'This claim code is no longer valid. Please contact the admin for a new claim code.';
        } else if (error.message.includes('Invalid Merkle proof')) {
          errorMessage = 'Invalid claim code or proof. Please check and try again.';
        } else {
          // For other errors, show a generic message to avoid technical details
          errorMessage = 'Something went wrong. Please try again.';
        }
      }
      setClaimStatus({ type: 'error', message: errorMessage });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Welcome Section - Mobile Optimized */}
      <div className="mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl md:rounded-2xl mb-3 md:mb-4">
              <Gift className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2 md:mb-3">
              Token Vault
            </h1>
            <div className="p-3 md:p-4 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-xl md:rounded-2xl border border-pink-200 dark:border-pink-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                {displayText}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interface */}
      {!isConnected ? (
        /* Disconnected State - Mobile Optimized */
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 md:p-8 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-center space-y-4 md:space-y-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto">
              <Wallet className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2">
                Wallet Required
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Connect your wallet using the button in the navigation to access the token vault
              </p>
            </div>
            <div className="p-3 md:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Waiting for wallet connection...</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Connected State - Mobile Optimized */
        <div className="space-y-4 md:space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 md:p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl md:rounded-2xl border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-green-500 rounded-xl md:rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-green-800 dark:text-green-200 text-sm md:text-base">Wallet Connected</p>
                <p className="text-xs text-green-600 dark:text-green-400">Ready to claim tokens</p>
              </div>
            </div>
            <div className="w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>

          {/* Claim Form */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="space-y-4 md:space-y-6">
              <div className="text-center">
                <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Enter Claim Code
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Paste your unique claim code below
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="claimCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Claim Code
                </label>
                <div className="relative">
                  <input
                    id="claimCode"
                    type="text"
                    value={claimCode}
                    onChange={(e) => setClaimCode(e.target.value)}
                    placeholder="Enter your claim code here..."
                    className="w-full px-3 md:px-4 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 text-center font-mono text-base md:text-lg tracking-wider"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 md:pr-4">
                    <Hash className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleClaim}
                disabled={claimStatus.type === 'loading' || !claimCode.trim()}
                className={cn(
                  "w-full flex items-center justify-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl font-bold text-base md:text-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl",
                  claimStatus.type === 'loading' && "animate-pulse"
                )}
              >
                {claimStatus.type === 'loading' ? (
                  <>
                    <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                    <span>Processing Claim...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 md:w-6 md:h-6" />
                    <span>Claim Tokens</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {claimStatus.type !== 'idle' && claimStatus.type !== 'success' && (
        <div
          className={cn(
            "p-3 md:p-4 rounded-xl md:rounded-2xl border-2 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300",
            claimStatus.type === 'error' && "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800",
            claimStatus.type === 'loading' && "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-800"
          )}
        >
          {claimStatus.type === 'error' && <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-500 mt-0.5" />}
          {claimStatus.type === 'loading' && <Loader2 className="w-4 h-4 md:w-5 md:h-5 text-blue-500 animate-spin mt-0.5" />}
          <p
            className={cn(
              "text-sm font-medium",
              claimStatus.type === 'error' && "text-red-700 dark:text-red-300",
              claimStatus.type === 'loading' && "text-blue-700 dark:text-blue-300"
            )}
          >
            {claimStatus.message}
          </p>
        </div>
      )}

      {/* Help Button */}
      <div className="text-center mt-4 md:mt-6">
        <button
          onClick={() => setShowHelpModal(true)}
          className="inline-flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <Star className="w-4 h-4" />
          <span>Need help?</span>
        </button>
      </div>

      {/* Modals */}
      {successData && (
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setSuccessData(null);
          }}
          txHash={successData.txHash}
          amount={successData.amount}
        />
      )}

      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
}