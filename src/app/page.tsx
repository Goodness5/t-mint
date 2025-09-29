'use client';

import { useState } from 'react';
import { WalletState } from '@/lib/wallet';
import WalletButton from '@/components/WalletButton';
import ClaimInterface from '@/components/ClaimInterface';

export default function Home() {
  const [walletState, setWalletState] = useState<WalletState>({
    account: null,
    address: null,
    isConnected: false,
    provider: null,
  });

  const handleWalletConnected = (newWalletState: WalletState) => {
    setWalletState(newWalletState);
  };

  const handleWalletDisconnected = () => {
    setWalletState({
      account: null,
      address: null,
      isConnected: false,
      provider: null,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      {/* Header */}
      <header className="w-full p-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              T-Mint
            </h1>
          </div>
          <WalletButton 
            onWalletConnected={handleWalletConnected}
            onWalletDisconnected={handleWalletDisconnected}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to the STRK Token Claim Portal! 🎉
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Your gateway to claiming STRK tokens on Starknet. Connect your wallet, 
            enter your claim code, and watch the magic happen! ✨
          </p>
        </div>

        {/* Claim Interface */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <ClaimInterface walletState={walletState} />
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔐</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Secure & Safe
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Your wallet stays in your control. We never ask for your private keys!
            </p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Lightning Fast
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Built on Starknet for blazing fast transactions and low fees!
            </p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎁</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Easy Claiming
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Just enter your code and claim your tokens. It's that simple!
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Built with ❤️ on Starknet • Powered by Cairo • Secured by Math
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
            Remember: You pay your own gas fees, but the tokens are free! 🚀
          </p>
        </div>
      </footer>
    </div>
  );
}
