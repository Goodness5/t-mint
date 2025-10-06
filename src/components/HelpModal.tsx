'use client';

import { X, Wallet, Hash, Send, CheckCircle, Star, Zap, Shield, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
        {/* Header - Mobile Optimized */}
        <div className="p-4 md:p-6 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 md:top-4 md:right-4 p-2 hover:bg-white/20 rounded-xl md:rounded-2xl transition-all duration-200"
          >
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          
          <div className="flex items-center gap-3 md:gap-4 mb-2">
            <div className="p-2 md:p-3 bg-white/20 rounded-xl md:rounded-2xl backdrop-blur-sm">
              <Star className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-bold">Token Vault Guide</h2>
              <p className="text-pink-100 text-sm md:text-base">Your step-by-step claiming journey</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Steps - Mobile Optimized */}
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-start gap-3 md:gap-4 p-4 md:p-5 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl md:rounded-2xl border border-blue-200 dark:border-blue-800">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl md:rounded-2xl flex items-center justify-center text-sm font-bold shadow-lg">
                1
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">Connect Wallet</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Click "Connect Wallet" in the navigation and select your preferred wallet
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 md:gap-4 p-4 md:p-5 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl md:rounded-2xl border border-emerald-200 dark:border-emerald-800">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-emerald-500 to-green-500 text-white rounded-xl md:rounded-2xl flex items-center justify-center text-sm font-bold shadow-lg">
                2
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">Enter Code</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Paste your unique claim code in the input field
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 md:gap-4 p-4 md:p-5 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl md:rounded-2xl border border-purple-200 dark:border-purple-800">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl md:rounded-2xl flex items-center justify-center text-sm font-bold shadow-lg">
                3
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Send className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">Claim Tokens</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Click "Claim Tokens" and confirm the transaction in your wallet
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 md:gap-4 p-4 md:p-5 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl md:rounded-2xl border border-yellow-200 dark:border-yellow-800">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-yellow-500 to-orange-500 text-white rounded-xl md:rounded-2xl flex items-center justify-center text-sm font-bold shadow-lg">
                4
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-yellow-600 dark:text-yellow-400" />
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">Success!</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Your tokens will appear in your wallet once confirmed
                </p>
              </div>
            </div>
          </div>

          {/* Features Grid - Mobile Optimized */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 md:pt-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3 md:mb-4 text-center text-sm md:text-base">Why Trust Our Vault?</h3>
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl md:rounded-2xl border border-gray-200 dark:border-gray-600">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg">
                  <Shield className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Secure & Private</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Your wallet stays in your control</p>
                </div>
              </div>
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl md:rounded-2xl border border-gray-200 dark:border-gray-600">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg">
                  <Zap className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Lightning Fast</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Built on Starknet for speed</p>
                </div>
              </div>
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl md:rounded-2xl border border-gray-200 dark:border-gray-600">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg">
                  <Gift className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Simple & Easy</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Just enter your code and claim</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Mobile Optimized */}
          <div className="text-center p-3 md:p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl md:rounded-2xl border border-gray-200 dark:border-gray-600">
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              Need a claim code? Contact the admin or check your email for instructions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
