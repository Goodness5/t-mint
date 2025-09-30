'use client';

import { useState } from 'react';
import { X, Wallet, ExternalLink, CheckCircle } from 'lucide-react';
import { useConnect } from '@starknet-react/core';
import { cn } from '@/lib/utils';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connect, connectors } = useConnect();
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  // Debug logging
  console.log('🔍 Available connectors:', connectors);
  console.log('🔍 Connect function:', connect);

  if (!isOpen) return null;

  const handleConnect = async (connector: any) => {
    setIsConnecting(connector.id);
    try {
      console.log('🔍 Attempting to connect with connector:', connector);
      await connect({ connector });
      console.log('✅ Successfully connected!');
      onClose();
    } catch (error: any) {
      console.error('❌ Failed to connect wallet:', error);
      alert(`Failed to connect wallet: ${error.message || 'Unknown error'}`);
    } finally {
      setIsConnecting(null);
    }
  };

  const getWalletInfo = (connectorId: string) => {
    switch (connectorId) {
      case 'argent':
        return {
          name: 'Argent X',
          description: 'The most popular Starknet wallet',
          icon: '🦄',
          color: 'from-blue-500 to-purple-600',
          hoverColor: 'from-blue-600 to-purple-700'
        };
      case 'braavos':
        return {
          name: 'Braavos',
          description: 'Smart wallet for Starknet',
          icon: '🦁',
          color: 'from-orange-500 to-red-600',
          hoverColor: 'from-orange-600 to-red-700'
        };
      case 'ready':
        return {
          name: 'Ready',
          description: 'Connect any Starknet wallet',
          icon: '🔗',
          color: 'from-green-500 to-teal-600',
          hoverColor: 'from-green-600 to-teal-700'
        };
      default:
        return {
          name: connectorId,
          description: 'Connect your wallet',
          icon: '🔗',
          color: 'from-gray-500 to-gray-600',
          hoverColor: 'from-gray-600 to-gray-700'
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Connect Wallet
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
            Choose your preferred wallet to connect to Starknet
          </p>

          {/* Wallet Options */}
          <div className="space-y-3">
            {connectors.map((connector) => {
              const walletInfo = getWalletInfo(connector.id);
              const isConnectingThis = isConnecting === connector.id;
              
              return (
                <button
                  key={connector.id}
                  onClick={() => handleConnect(connector)}
                  disabled={isConnectingThis}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 border-transparent transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                    `bg-gradient-to-r ${walletInfo.color} hover:${walletInfo.hoverColor}`,
                    isConnectingThis && "animate-pulse"
                  )}
                >
                  <div className="text-2xl">{walletInfo.icon}</div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white">
                      {walletInfo.name}
                    </div>
                    <div className="text-sm text-white/80">
                      {walletInfo.description}
                    </div>
                  </div>
                  {isConnectingThis ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ExternalLink className="w-5 h-5 text-white/60" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Secure connection powered by Starknet</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
