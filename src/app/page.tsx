'use client';

import { useState } from 'react';
// No need to import WalletState - we'll use the hook directly
import WalletButton from '@/components/WalletButton';
import ClaimInterface from '@/components/ClaimInterface';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function Home() {
  const handleWalletConnected = (walletAddress: string) => {
    console.log('Wallet connected:', walletAddress);
  };

  const handleWalletDisconnected = () => {
    console.log('Wallet disconnected');
  };

  return (
    <ErrorBoundary>
      <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                T-Mint
              </h1>
            </div>
            <WalletButton 
              onWalletConnected={handleWalletConnected}
              onWalletDisconnected={handleWalletDisconnected}
            />
          </div>
        </header>

        {/* Main Content - Takes remaining space */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-8 items-center">
            {/* Left Side - Hero Content */}
            <div className="space-y-6 w-full text-center">
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Claim Your STRK Tokens
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Your gateway to claiming STRK tokens on Starknet. Connect your wallet, 
                  enter your claim code, and watch the magic happen!
                </p>
              </div>

              {/* Features Grid */}
              {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">🔐</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    Secure
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Your wallet stays in your control
                  </p>
                </div>

                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">⚡</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    Fast
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Built on Starknet for speed
                  </p>
                </div>

                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">🎁</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    Easy
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Just enter your code and claim
                  </p>
                </div>
              </div>
              */}
            </div> 

            {/* Right Side - Claim Interface */}
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <ClaimInterface />
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Built on Starknet • Powered by Cairo • Secured by Math
            </p>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
