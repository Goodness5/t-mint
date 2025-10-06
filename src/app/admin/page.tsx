'use client';

import { useState, useEffect } from 'react';
import { Shield, Loader2, CheckCircle, XCircle, Copy, ArrowLeft, History, RefreshCw, TreePine, Hash } from 'lucide-react';
import { useStarknetWallet } from '@/lib/use-starknet-wallet';
import { codeToFelt, CONTRACT_ADDRESS, NETWORK } from '@/lib/wallet-utils';
import { getRandomFunnyText } from '@/lib/utils';
import { cn } from '@/lib/utils';
// Database operations moved to API routes
import WalletButton from '@/components/WalletButton';
import Link from 'next/link';
import ErrorBoundary from '@/components/ErrorBoundary';

interface AdminStatus {
  type: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  txHash?: string;
}

interface GeneratedClaim {
  id: string;
  code: bigint;
  codeString: string;
  amount: bigint; // Simple amount in wei
  amountString: string;
  timestamp: Date;
  txHash?: string;
}

interface MerkleTreeData {
  claims: GeneratedClaim[];
  root: string;
  tree: any;
}

export default function AdminPage() {
  const { 
    account, 
    address, 
    isConnected, 
    getContract,
    buildMerkleTree,
    setMerkleRoot,
    getMerkleRoot,
    getTotalClaimed
  } = useStarknetWallet();
  
  // Amount is now fixed at 1 STRK
  const [numClaims, setNumClaims] = useState('10');
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({ type: 'idle', message: '' });
  const [statusText, setStatusText] = useState('');
  
  // Merkle tree data
  const [merkleData, setMerkleData] = useState<MerkleTreeData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [contractStatus, setContractStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [currentRoot, setCurrentRoot] = useState<string>('');
  const [totalClaimed, setTotalClaimed] = useState<string>('0');

  // Amount is now fixed at 1 STRK
  const FIXED_AMOUNT_STRK = 1;
  const FIXED_AMOUNT_WEI = BigInt(FIXED_AMOUNT_STRK * 10**18);

  // Generate claims with simple amounts (replacement for removed demo function)
  const generateClaimsWithStrings = (numClaims: number) => {
    return Array.from({ length: numClaims }, (_, index) => {
      // Generate a random hex code (8 characters: 0-9, A-F)
      const hexCode = Array.from({ length: 8 }, () => 
        Math.floor(Math.random() * 16).toString(16).toUpperCase()
      ).join('');
      
      const code = BigInt(`0x${hexCode}`);
      const codeString = hexCode; // Store without 0x prefix for user input
      
      return {
        code,
        amount: FIXED_AMOUNT_WEI, // Simple bigint amount
        codeString,
      };
    });
  };

  useEffect(() => {
    // Set initial status text on client side only
    setStatusText(getRandomFunnyText('adminWelcome'));
    
    // Load merkle data from localStorage
    const savedMerkleData = localStorage.getItem('merkleData');
    if (savedMerkleData) {
      try {
        const parsed = JSON.parse(savedMerkleData);
        // Convert back to proper format
        const restoredMerkleData: MerkleTreeData = {
          claims: parsed.claims.map((claim: any) => ({
            id: claim.id,
            code: BigInt(claim.code),
            codeString: claim.codeString,
            amount: {
              low: BigInt(claim.amount.low),
              high: BigInt(claim.amount.high)
            },
            amountString: claim.amountString,
            timestamp: new Date(claim.timestamp)
          })),
          root: parsed.root,
          tree: parsed.tree
        };
        setMerkleData(restoredMerkleData);
      } catch (error) {
        console.error('Failed to load saved merkle data:', error);
      }
    }
  }, []);

  // Load contract status when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      loadContractStatus();
    }
  }, [isConnected, address]);

  const handleWalletConnected = (walletAddress: string) => {
    console.log('Wallet connected:', walletAddress);
  };

  const handleWalletDisconnected = () => {
    setContractStatus('unknown');
  };

  // Load contract status
  const loadContractStatus = async () => {
    if (!account) return;
    
    try {
      const contract = getContract();
      if (!contract) {
        setContractStatus('error');
        return;
      }
      
      setContractStatus('connected');
      
      // Load current merkle root and total claimed
      const root = await getMerkleRoot();
      const total = await getTotalClaimed();
      
      setCurrentRoot(root);
      setTotalClaimed(total);
      
      setAdminStatus({ 
        type: 'success', 
        message: 'Contract connected successfully! You can manage the Merkle tree.' 
      });
    } catch (error: any) {
      console.error('Failed to load contract status:', error);
      setContractStatus('error');
      setAdminStatus({ 
        type: 'error', 
        message: `Failed to connect to contract: ${error.message}` 
      });
    }
  };

  const handleGenerateMerkleTree = async () => {
    if (adminStatus.type === 'loading') {
      return;
    }

    if (!numClaims.trim()) {
      setAdminStatus({ type: 'error', message: 'Please enter the number of claims!' });
      return;
    }

    if (!account) {
      setAdminStatus({ type: 'error', message: 'Please connect your wallet first!' });
      return;
    }

    const claimsNum = parseInt(numClaims);

    if (isNaN(claimsNum) || claimsNum <= 0 || claimsNum > 100) {
      setAdminStatus({ type: 'error', message: 'Please enter a valid number of claims (1-100)!' });
        return;
      }
      
    setAdminStatus({ type: 'loading', message: 'Creating your claim campaign...' });
    setStatusText("Building the campaign of digital fortune...");

    try {
      // Generate claims with the specified amount and code strings
      const claimsWithStrings = generateClaimsWithStrings(claimsNum);
      // Use the SAME amounts that are in the generated claims (1 STRK fixed)
      const claims = claimsWithStrings.map(claim => ({
        code: claim.code,
        amount: claim.amount // Use the original amount from generateClaimsWithStrings
      }));

      // Build Merkle tree
      const { tree, root } = buildMerkleTree(claims);

      // Convert claims to our format (with string values for localStorage)
      const generatedClaims: GeneratedClaim[] = claimsWithStrings.map((claim, index) => ({
        id: `${Date.now()}-${index}`,
        code: claim.code,
        codeString: claim.codeString, // Use the generated code string directly
        amount: claim.amount,
        amountString: '1', // Fixed amount is 1 STRK
        timestamp: new Date()
      }));

      const newMerkleData: MerkleTreeData = {
        claims: generatedClaims,
        root,
        tree
      };

      setMerkleData(newMerkleData);
      
      // Save to localStorage with serializable data
      const serializableMerkleData = {
        claims: generatedClaims.map(claim => ({
          id: claim.id,
          code: claim.code.toString(),
          codeString: claim.codeString,
          amount: claim.amount.toString(), // Simple amount as string
          amountString: claim.amountString,
          timestamp: claim.timestamp.toISOString()
        })),
        root,
        tree: {
          leaves: tree.leaves,
          root: tree.root
        }
      };
      localStorage.setItem('merkleData', JSON.stringify(serializableMerkleData));
      
      // Save claims to database via API route
      const claimsForDatabase = claimsWithStrings.map((claim, index) => {
        console.log(`🔍 Claim ${index}:`);
        console.log(`  - codeString: ${claim.codeString}`);
        console.log(`  - code (felt252): ${claim.code.toString()}`);
        console.log(`  - code (hex): 0x${claim.code.toString(16)}`);
        
        return {
          code: claim.code.toString(),
          codeString: claim.codeString, // Use the original generated code string
          amount: claim.amount.toString(), // Simple amount as string
          merkleRoot: root,
          treeIndex: index
        };
      });
      
      console.log('💾 Saving claims to database via API...');
      console.log('💾 Claims data:', claimsForDatabase);
      try {
        const response = await fetch('/api/admin/save-claims', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            claims: claimsForDatabase,
            merkleRoot: root,
            totalClaims: claimsForDatabase.length,
            clearOld: true // Flag to clear old claims
          }),
        });
        
        const responseData = await response.json();
        console.log('💾 API Response:', responseData);
        
        if (!response.ok) {
          throw new Error(`Failed to save claims to database: ${responseData.error || 'Unknown error'}`);
        }
        
        console.log('✅ Claims saved to database successfully');
        setAdminStatus({ 
          type: 'success', 
          message: `Campaign created successfully! ${claimsNum} claim codes generated and ready to use.`,
        });
      } catch (error) {
        console.error('❌ Failed to save claims to database:', error);
        setAdminStatus({ 
          type: 'error', 
          message: `Merkle tree generated but database save failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
        // Continue anyway - localStorage backup is still available
      }
      
      // Also save the raw claims data for proof generation (backup)
      const claimsForStorage = claims.map(claim => ({
        code: claim.code.toString(),
        amount: claim.amount.toString() // Simple amount as string
      }));
      localStorage.setItem('currentClaims', JSON.stringify(claimsForStorage));
      
      // Also save the tree data (without BigInt values)
      const treeForStorage = {
        leaves: tree.leaves,
        root: tree.root
      };
      localStorage.setItem('currentTree', JSON.stringify(treeForStorage));
      
      // Status message is set in the database save section above
      setStatusText("Your campaign is ready to make users happy!");
      
    } catch (error: any) {
      console.error('Generate Merkle tree failed:', error);
      setAdminStatus({ 
        type: 'error', 
        message: (error as any).message || 'Failed to generate Merkle tree!' 
      });
      setStatusText("Even admins have bad days... but we'll fix this!");
    }
  };

  const handleSetMerkleRoot = async () => {
    if (!merkleData) {
      setAdminStatus({ type: 'error', message: 'Please generate a Merkle tree first!' });
      return;
    }

    if (!account) {
      setAdminStatus({ type: 'error', message: 'Please connect your wallet first!' });
      return;
    }

    setAdminStatus({ type: 'loading', message: 'Activating campaign on blockchain...' });
    setStatusText("Activating your campaign on the blockchain...");

    try {
      const tx = await setMerkleRoot(merkleData.root);
      await account?.waitForTransaction(tx.transaction_hash);
      
      // Update current root
      setCurrentRoot(merkleData.root);
      
      setAdminStatus({ 
        type: 'success', 
        message: `Campaign activated successfully! Users can now claim their tokens.`,
        txHash: tx.transaction_hash
      });
      setStatusText("Your campaign is live and ready for users!");
      
    } catch (error: any) {
      console.error('Set Merkle root failed:', error);
      setAdminStatus({ 
        type: 'error', 
        message: (error as any).message || 'Failed to set Merkle root!' 
      });
      setStatusText("The blockchain soil was too hard... let's try again!");
    }
  };

  // Function to copy a code to clipboard
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setAdminStatus({ 
        type: 'success', 
        message: `Code "${code}" copied to clipboard!` 
      });
    } catch (error) {
      setAdminStatus({ 
        type: 'error', 
        message: 'Failed to copy code to clipboard!' 
      });
    }
  };

  // Function to copy Merkle root to clipboard
  const handleCopyRoot = async () => {
    if (!merkleData) return;
    try {
      await navigator.clipboard.writeText(merkleData.root);
          setAdminStatus({ 
            type: 'success', 
        message: 'Merkle root copied to clipboard!' 
      });
    } catch (error) {
      setAdminStatus({ 
        type: 'error', 
        message: 'Failed to copy Merkle root to clipboard!' 
      });
    }
  };

  return (
    <ErrorBoundary>
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
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Token Distribution Center
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
            <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Distribution Management
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              Create and manage token claim campaigns for your users
            </p>
            {statusText && (
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                {statusText}
              </p>
            )}
          </div>

          {/* Status Display */}
          {adminStatus.type !== 'idle' && (
            <div className="mb-8 p-4 rounded-lg border flex items-center gap-3">
              {adminStatus.type === 'loading' && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
              {adminStatus.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
              {adminStatus.type === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
              <span className={cn(
                "font-medium",
                adminStatus.type === 'loading' && "text-blue-700 dark:text-blue-300",
                adminStatus.type === 'success' && "text-green-700 dark:text-green-300",
                adminStatus.type === 'error' && "text-red-700 dark:text-red-300"
              )}>
                {adminStatus.message}
              </span>
            </div>
          )}

          {/* Admin Forms */}
          <div className="space-y-8">
            {/* Merkle Tree Generation */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <TreePine className="w-5 h-5" />
                Create Claim Campaign
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Generate unique claim codes for your users to claim their tokens
              </p>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      STRK Amount per Claim
                  </label>
                  <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                    1 STRK (Fixed Amount)
                  </div>
                </div>
                  <div>
                    <label htmlFor="numClaims" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of Claims
                    </label>
                    <input
                      id="numClaims"
                      type="number"
                      min="1"
                      max="100"
                      value={numClaims}
                      onChange={(e) => setNumClaims(e.target.value)}
                      placeholder="Enter number of claims..."
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                <button
                    onClick={handleGenerateMerkleTree}
                  disabled={adminStatus.type === 'loading'}
                  className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl",
                    adminStatus.type === 'loading' && "animate-pulse"
                  )}
                >
                  {adminStatus.type === 'loading' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                      <TreePine className="w-5 h-5" />
                  )}
                  <span>
                      {adminStatus.type === 'loading' ? 'Creating Campaign...' : 'Create Campaign'}
                  </span>
                </button>

                  {merkleData && (
                    <button
                      onClick={handleSetMerkleRoot}
                      disabled={adminStatus.type === 'loading'}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
                      )}
                    >
                      <Hash className="w-5 h-5" />
                      <span>Activate Campaign</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Merkle Tree Data */}
            {merkleData && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <TreePine className="w-5 h-5" />
                    Campaign Codes ({merkleData.claims.length} codes generated)
                  </h3>
                  <button
                    onClick={handleCopyRoot}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    title="Copy Merkle root"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Merkle Root Display */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Campaign ID:</span>
                  </div>
                  <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                    {merkleData.root}
                  </p>
                </div>
                
                {/* Claims List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {merkleData.claims.map((claim) => (
                    <div key={claim.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                            {claim.codeString}
                          </span>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm rounded-full">
                            {claim.amountString} STRK
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {claim.timestamp.toLocaleString()}
                          <span className="ml-2 font-mono text-xs">
                            Felt: {claim.code.toString().slice(0, 10)}...
                            </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyCode(claim.codeString)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="Copy code"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contract Status */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Contract Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Contract Address
                    </p>
                    <p className="font-mono text-xs text-blue-600 dark:text-blue-300">
                      {CONTRACT_ADDRESS}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Network: {NETWORK}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      contractStatus === 'connected' && "bg-green-500",
                      contractStatus === 'error' && "bg-red-500",
                      contractStatus === 'unknown' && "bg-gray-400"
                    )}></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {contractStatus === 'connected' && 'Connected'}
                      {contractStatus === 'error' && 'Error'}
                      {contractStatus === 'unknown' && 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Connected Wallet
                    </p>
                    <p className="font-mono text-xs text-blue-600 dark:text-blue-300">
                      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Active Campaign ID
                    </p>
                    <p className="font-mono text-xs text-green-600 dark:text-green-300">
                      {currentRoot ? `${currentRoot.slice(0, 10)}...${currentRoot.slice(-10)}` : 'No active campaign'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Total Claimed
                    </p>
                    <p className="font-mono text-xs text-purple-600 dark:text-purple-300">
                      {totalClaimed ? `${(parseFloat(totalClaimed) / Math.pow(10, 18)).toFixed(6)} STRK` : '0 STRK'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
