'use client';

import { useState } from 'react';
import { Shield, Plus, Loader2, CheckCircle, XCircle, Copy, ArrowLeft } from 'lucide-react';
import { WalletState, getContract, stringToFelt252 } from '@/lib/wallet';
import { getRandomFunnyText } from '@/lib/utils';
import { cn } from '@/lib/utils';
import WalletButton from '@/components/WalletButton';
import Link from 'next/link';

interface AdminStatus {
  type: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  txHash?: string;
}

export default function AdminPage() {
  const [walletState, setWalletState] = useState<WalletState>({
    account: null,
    address: null,
    isConnected: false,
    provider: null,
  });
  const [claimCode, setClaimCode] = useState('');
  const [amount, setAmount] = useState('');
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [removeAdminAddress, setRemoveAdminAddress] = useState('');
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({ type: 'idle', message: '' });
  const [funnyText, setFunnyText] = useState(getRandomFunnyText('adminWelcome'));

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

  const handleGenerateCode = async () => {
    if (!claimCode.trim() || !amount.trim()) {
      setAdminStatus({ type: 'error', message: 'Please fill in all fields!' });
      return;
    }

    if (!walletState.account) {
      setAdminStatus({ type: 'error', message: 'Please connect your wallet first!' });
      return;
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setAdminStatus({ type: 'error', message: 'Please enter a valid amount!' });
      return;
    }

    setAdminStatus({ type: 'loading', message: 'Generating claim code...' });
    setFunnyText("Creating digital magic...");

    try {
      const contract = await getContract(walletState.account);
      
      // Convert claim code to felt252
      const codeFelt = stringToFelt252(claimCode);
      
      // Convert amount to u256 (assuming STRK has 18 decimals)
      const amountWei = (parseFloat(amount) * Math.pow(10, 18)).toString();
      const amountU256 = {
        low: BigInt(amountWei) & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'),
        high: BigInt(amountWei) >> BigInt(128)
      };

      // Call the generate_claim_code function
      const result = await contract.generate_claim_code(codeFelt, amountU256);
      
      setAdminStatus({ 
        type: 'success', 
        message: `Claim code "${claimCode}" generated successfully!`,
        txHash: result.transaction_hash 
      });
      setFunnyText("Another happy user incoming!");
      
      // Reset form
      setClaimCode('');
      setAmount('');
      
    } catch (error: any) {
      console.error('Generate code failed:', error);
      setAdminStatus({ 
        type: 'error', 
        message: error.message || 'Failed to generate claim code!' 
      });
      setFunnyText("Even admins have bad days... but we'll fix this!");
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminAddress.trim()) {
      setAdminStatus({ type: 'error', message: 'Please enter an admin address!' });
      return;
    }

    if (!walletState.account) {
      setAdminStatus({ type: 'error', message: 'Please connect your wallet first!' });
      return;
    }

    setAdminStatus({ type: 'loading', message: 'Adding admin...' });
    setFunnyText("Granting admin powers...");

    try {
      const contract = await getContract(walletState.account);
      
      // Call the add_admin function
      const result = await contract.add_admin(newAdminAddress);
      
      setAdminStatus({ 
        type: 'success', 
        message: `Admin ${newAdminAddress.slice(0, 6)}...${newAdminAddress.slice(-4)} added successfully!`,
        txHash: result.transaction_hash 
      });
      setFunnyText("Another admin joins the team!");
      
      // Reset form
      setNewAdminAddress('');
      
    } catch (error: any) {
      console.error('Add admin failed:', error);
      setAdminStatus({ 
        type: 'error', 
        message: error.message || 'Failed to add admin!' 
      });
      setFunnyText("Admin addition failed... but we'll fix this!");
    }
  };

  const handleRemoveAdmin = async () => {
    if (!removeAdminAddress.trim()) {
      setAdminStatus({ type: 'error', message: 'Please enter an admin address!' });
      return;
    }

    if (!walletState.account) {
      setAdminStatus({ type: 'error', message: 'Please connect your wallet first!' });
      return;
    }

    setAdminStatus({ type: 'loading', message: 'Removing admin...' });
    setFunnyText("Revoking admin powers...");

    try {
      const contract = await getContract(walletState.account);
      
      // Call the remove_admin function
      const result = await contract.remove_admin(removeAdminAddress);
      
      setAdminStatus({ 
        type: 'success', 
        message: `Admin ${removeAdminAddress.slice(0, 6)}...${removeAdminAddress.slice(-4)} removed successfully!`,
        txHash: result.transaction_hash 
      });
      setFunnyText("Admin powers revoked!");
      
      // Reset form
      setRemoveAdminAddress('');
      
    } catch (error: any) {
      console.error('Remove admin failed:', error);
      setAdminStatus({ 
        type: 'error', 
        message: error.message || 'Failed to remove admin!' 
      });
      setFunnyText("Admin removal failed... but we'll fix this!");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      {/* Header */}
      <header className="w-full p-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                T-Mint Admin
              </h1>
            </Link>
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
            Admin Control Panel
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {funnyText}
          </p>
        </div>

        {/* Admin Forms */}
        <div className="space-y-8">
          {/* Generate Claim Code */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Generate Claim Code</h3>
            <div className="space-y-6">
            <div>
              <label htmlFor="adminClaimCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Claim Code
              </label>
              <input
                id="adminClaimCode"
                type="text"
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value)}
                placeholder="Enter a unique claim code..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label htmlFor="adminAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                STRK Amount
              </label>
              <input
                id="adminAmount"
                type="number"
                step="0.000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount of STRK to claim..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <button
              onClick={handleGenerateCode}
              disabled={adminStatus.type === 'loading' || !claimCode.trim() || !amount.trim()}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl",
                adminStatus.type === 'loading' && "animate-pulse"
              )}
            >
              {adminStatus.type === 'loading' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              <span>
                {adminStatus.type === 'loading' ? 'Generating...' : 'Generate Claim Code'}
              </span>
            </button>
            </div>
          </div>

          {/* Add Admin */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Add Admin</h3>
            <div className="space-y-6">
            <div>
              <label htmlFor="newAdminAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Admin Address
              </label>
              <input
                id="newAdminAddress"
                type="text"
                value={newAdminAddress}
                onChange={(e) => setNewAdminAddress(e.target.value)}
                placeholder="Enter admin wallet address..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <button
              onClick={handleAddAdmin}
              disabled={adminStatus.type === 'loading' || !newAdminAddress.trim()}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl",
                adminStatus.type === 'loading' && "animate-pulse"
              )}
            >
              {adminStatus.type === 'loading' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              <span>
                {adminStatus.type === 'loading' ? 'Adding...' : 'Add Admin'}
              </span>
            </button>
            </div>
          </div>

          {/* Remove Admin */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Remove Admin</h3>
            <div className="space-y-6">
            <div>
              <label htmlFor="removeAdminAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Admin Address
              </label>
              <input
                id="removeAdminAddress"
                type="text"
                value={removeAdminAddress}
                onChange={(e) => setRemoveAdminAddress(e.target.value)}
                placeholder="Enter admin wallet address to remove..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <button
              onClick={handleRemoveAdmin}
              disabled={adminStatus.type === 'loading' || !removeAdminAddress.trim()}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl",
                adminStatus.type === 'loading' && "animate-pulse"
              )}
            >
              {adminStatus.type === 'loading' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span>
                {adminStatus.type === 'loading' ? 'Removing...' : 'Remove Admin'}
              </span>
            </button>
            </div>
          </div>

          {/* Status Message */}
          {adminStatus.type !== 'idle' && (
            <div className={cn(
              "p-4 rounded-lg border flex items-start gap-3",
              adminStatus.type === 'success' && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
              adminStatus.type === 'error' && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
              adminStatus.type === 'loading' && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            )}>
              {adminStatus.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
              {adminStatus.type === 'error' && <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
              {adminStatus.type === 'loading' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin mt-0.5" />}
              
              <div className="flex-1">
                <p className={cn(
                  "text-sm font-medium",
                  adminStatus.type === 'success' && "text-green-700 dark:text-green-300",
                  adminStatus.type === 'error' && "text-red-700 dark:text-red-300",
                  adminStatus.type === 'loading' && "text-blue-700 dark:text-blue-300"
                )}>
                  {adminStatus.message}
                </p>
                {adminStatus.txHash && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction Hash:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                        {adminStatus.txHash.slice(0, 10)}...{adminStatus.txHash.slice(-8)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(adminStatus.txHash!)}
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

          {/* Admin Info Box */}
          <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">
              Admin Instructions:
            </h3>
            <ul className="text-xs text-purple-700 dark:text-purple-300 space-y-1">
              <li>• Only the contract admin can generate codes</li>
              <li>• Each code can only be used once</li>
              <li>• Make sure to use unique claim codes</li>
              <li>• Users will pay their own gas fees</li>
              <li>• Keep this URL secret from regular users</li>
            </ul>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Security Notice:
          </h3>
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            This admin panel is hidden from regular users. Only share the main claim portal URL with users. 
            Keep this admin URL secure and only accessible to authorized administrators.
          </p>
        </div>
      </main>
    </div>
  );
}