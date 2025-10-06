'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, Copy, ExternalLink, Sparkles, Gift, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  txHash: string;
  amount: string;
}

const celebrationMessages = [
  "Boom! Tokens claimed! 🎉",
  "You just got richer! 💰",
  "Mission accomplished! 🚀",
  "Your wallet is now heavier! 💪",
  "Success! You're officially a token holder! 🏆",
  "Congratulations! You've joined the club! 🎊",
  "Well done! Your tokens are on their way! ✨",
  "Victory! The blockchain gods are pleased! ⚡"
];

const darkHumorMessages = [
  "Your tokens are now living their best life in your wallet 🎭",
  "Congratulations! You've successfully bribed the blockchain 😈",
  "Your wallet just got a promotion! 📈",
  "The tokens are happy to be home... finally! 🏠",
  "You've successfully hacked the system... legally! 🕵️‍♂️",
  "Your digital wealth just increased! Time to update your LinkedIn 💼",
  "The merkle tree has spoken: you are worthy! 👑",
  "Your tokens are celebrating... they found a good home! 🎪"
];

export default function SuccessModal({ isOpen, onClose, txHash, amount }: SuccessModalProps) {
  const [currentMessage, setCurrentMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const messages = [...celebrationMessages, ...darkHumorMessages];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      setCurrentMessage(randomMessage);
      
      // Show confetti after a delay
      const timer = setTimeout(() => setShowConfetti(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openExplorer = () => {
    const explorerUrl = `https://sepolia.starkscan.co/tx/${txHash}`;
    window.open(explorerUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
        {/* Confetti Effect */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-pink-500 rounded-full animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        )}

        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-full animate-pulse">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Success!</h2>
              <p className="text-green-100">Your claim was successful!</p>
            </div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-lg font-medium">
              {currentMessage}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Amount Display */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gift className="w-6 h-6 text-green-600 dark:text-green-400" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {amount} STRK
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Tokens successfully claimed!
            </p>
          </div>

          {/* Transaction Details */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Transaction Details
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Transaction Hash:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded font-mono">
                    {txHash.slice(0, 8)}...{txHash.slice(-8)}
                  </code>
                  <button
                    onClick={copyToClipboard}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Copy transaction hash"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <button
                onClick={openExplorer}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-medium">View on Explorer</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                // You could add a "Claim More" action here
              }}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
            >
              <PartyPopper className="w-4 h-4 inline mr-2" />
              Claim More
            </button>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your tokens are now in your wallet!
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              (Don't spend them all in one place... or do, we're not your financial advisor 😉)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
