'use client';

import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';
import { Contract, uint256, BigNumberish, cairo } from 'starknet'; // Added 'cairo' for u256 object creation <a href="https://starknetjs.com/docs/next/guides/contracts/define_call_message" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">1</a>
import * as scureStarknet from '@scure/starknet';
import fullAbi from './abi.json';
import { codeToFelt } from './wallet-utils'; // Assuming this utility is now correctly converting string to BigInt felt252
import { getProofsForClaims, ClaimWithProof } from './merkle-utils';

// Simple Merkle tree implementation
class MerkleTree {
  public leaves: string[];
  public root: string;

  constructor(leaves: string[]) {
    this.leaves = leaves;
    this.root = this.calculateRoot(leaves);
  }

  private calculateRoot(leaves: string[]): string {
    if (leaves.length === 0) return '0x0';
    if (leaves.length === 1) return leaves[0];

    const nextLevel: string[] = [];
    for (let i = 0; i < leaves.length; i += 2) {
      const left = leaves[i];
      const right = leaves[i + 1] || left;
      
      // Use commutative hashing: always hash the smaller value first
      const leftBigInt = BigInt(left);
      const rightBigInt = BigInt(right);
      
      let combined;
      if (leftBigInt <= rightBigInt) {
        combined = scureStarknet.poseidonHashMany([leftBigInt, rightBigInt]);
      } else {
        combined = scureStarknet.poseidonHashMany([rightBigInt, leftBigInt]);
      }
      
      nextLevel.push(`0x${combined.toString(16).padStart(64, '0')}`);
    }

    return this.calculateRoot(nextLevel);
  }

  getProof(leaf: string): string[] {
    const proof: string[] = [];
    let currentLevel = [...this.leaves];
    let leafIndex = this.leaves.indexOf(leaf);
    
    if (leafIndex === -1) {
      throw new Error('Leaf not found in tree');
    }

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      let siblingFound = false;

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        
        // Add sibling to proof if current leaf is in this pair
        if (Math.floor(leafIndex / 2) === Math.floor(i / 2)) {
          if (leafIndex % 2 === 0) {
            // Leaf is on the left, add right sibling
            proof.push(right);
          } else {
            // Leaf is on the right, add left sibling
            proof.push(left);
          }
          siblingFound = true;
        }

        // Use commutative hashing: always hash the smaller value first
        const leftBigInt = BigInt(left);
        const rightBigInt = BigInt(right);
        
        let combined;
        if (leftBigInt <= rightBigInt) {
          combined = scureStarknet.poseidonHashMany([leftBigInt, rightBigInt]);
        } else {
          combined = scureStarknet.poseidonHashMany([rightBigInt, leftBigInt]);
        }
        
        nextLevel.push(`0x${combined.toString(16).padStart(64, '0')}`);
      }

      if (!siblingFound) {
        throw new Error('Sibling not found in proof generation');
      }

      currentLevel = nextLevel;
      leafIndex = Math.floor(leafIndex / 2);
    }

    return proof;
  }
}

type Claim = {
  code: bigint;
  amount: bigint; // Simple amount in wei
};

export function useStarknetWallet() {
  const { account, address, status } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x0';
  const network = process.env.NEXT_PUBLIC_NETWORK || 'testnet';

  const connectWallet = async (connector: any) => {
    try {
      await connect({ connector });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  };

  // Generate a random readable code string (hex only)
  const generateRandomCodeString = (): string => {
    const chars = 'ABCDEF0123456789'; // Only valid hex characters
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Convert readable code to felt252
  const generateRandomCode = (): bigint => {
    const codeString = generateRandomCodeString();
    return codeToFelt(codeString); // Assuming codeToFelt returns BigInt
  };

  // Utility to generate random u256 amount (1 to 1000 tokens, 18 decimals)
  const generateRandomAmount = (): { low: bigint; high: bigint } => {
    const randomTokens = BigInt(Math.floor(Math.random() * 1000) + 1);
    const weiAmount = randomTokens * BigInt(10 ** 18);
    // uint256.bnToUint256 returns an object with low/high as BigNumberish,
    // which are then converted to BigInts for consistency with Claim type.
    const u256 = uint256.bnToUint256(weiAmount);
    return {
      low: BigInt(u256.low), // Ensure BigInt type
      high: BigInt(u256.high) // Ensure BigInt type
    };
  };



  // Build Merkle tree from claims
  const buildMerkleTree = (claims: Claim[]) => {
    const leaves: string[] = claims.map((claim) => {
      // Convert simple amount to u256 format for hashing (to match contract)
      const amountLow = claim.amount & BigInt('0xffffffffffffffffffffffffffffffff'); // Lower 128 bits
      const amountHigh = claim.amount >> BigInt(128); // Upper 128 bits
      
      // Use commutative hashing: always hash the smaller value first
      const codeBigInt = claim.code;
      const amountLowBigInt = amountLow;
      const amountHighBigInt = amountHigh;
      
      // For leaf hashing, we'll use the standard order: code, amountLow, amountHigh
      // This is consistent with the contract's hash generation
      const leafHash = scureStarknet.poseidonHashMany([
        codeBigInt,
        amountLowBigInt,
        amountHighBigInt,
      ]);
      return `0x${leafHash.toString(16).padStart(64, '0')}`;
    });

    const tree = new MerkleTree(leaves);
    const root = tree.root; // '0x' prefixed hex string

    return { tree, root, claims };
  };

  // Get proof for a specific claim
  const getProofForClaim = (tree: MerkleTree, leafIndex: number): string[] => {
    const leafHex = tree.leaves[leafIndex];
    return tree.getProof(leafHex);
  };

  // Create contract instance
  const getContract = () => {
    console.log('🔍 Contract creation debug:');
    console.log('  - Account:', account);
    console.log('  - Contract Address:', contractAddress);
    console.log('  - Network:', network);
    console.log('  - ABI loaded:', !!fullAbi);
    console.log('  - ABI type:', typeof fullAbi);

    if (!account) {
      console.log('❌ No account available');
      return null;
    }

    if (contractAddress === '0x0') {
      console.log('❌ Contract address not set (still 0x0)');
      console.log('💡 Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env.local file');
      return null;
    }

    try {
      // Extract the ABI array from the full contract class
      const abi = (fullAbi as any).abi || fullAbi;
      console.log('🔍 ABI type:', typeof abi);
      console.log('🔍 ABI length:', abi?.length);
      console.log('🔍 Contract address:', contractAddress);
      console.log('🔍 Account:', account);
      
      // FIX: Use object-based constructor for Contract as per Starknet.js v8 breaking changes <a href="https://starknetjs.com/docs/next/guides/migrate" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">5</a><a href="https://starknetjs.com/docs/next/guides/contracts/connect_contract" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">9</a>
      const contract = new Contract(abi, contractAddress, account);
      console.log('✅ Contract instance created successfully');
      console.log('🔍 Contract object:', contract);
      return contract;
    } catch (error) {
      console.error('❌ Failed to create contract instance:', error);
      console.error('❌ Error details:', error);
      return null;
    }
  };

  const contract = getContract();

  // Set Merkle root (owner only)
  const setMerkleRoot = async (root: string) => {
    const contractInstance = getContract();
    if (!contractInstance) throw new Error('Contract not available');
    try {
      // root (string) is a valid BigNumberish for felt252 parameter <a href="https://starknetjs.com/docs/next/guides/contracts/define_call_message" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">1</a>
      const tx = await contractInstance.invoke('set_merkle_root', [root]);
      console.log('✅ Merkle root set:', tx.transaction_hash);
      return tx;
    } catch (error) {
      console.error('❌ Failed to set Merkle root:', error);
      throw error;
    }
  };

  // Claim tokens with code, amount, and proof
  const claimTokens = async (
    code: bigint,
    amount: bigint, // Simple amount in wei (e.g., 12 STRK = 12 * 10^18 wei)
    proof: string[]
  ) => {
    const contractInstance = getContract();
    if (!contractInstance) throw new Error('Contract not available');
    try {
      console.log('🔍 Sending to contract:');
      console.log('  - Code:', code.toString());
      console.log('  - Code (hex):', `0x${code.toString(16)}`);
      console.log('  - Amount:', amount.toString());
      console.log('  - Amount (hex):', `0x${amount.toString(16)}`);
      console.log('  - Proof length:', proof.length);
      console.log('  - Proof:', proof);
      console.log('  - Proof elements (hex):', proof.map(p => `0x${BigInt(p).toString(16)}`));
      
    
      const formattedProof = proof.map(p => {
        // Keep as string but ensure proper felt252 format
        return p.startsWith('0x') ? p : `0x${p}`;
      });
      
      console.log('🔍 Formatted proof for contract:', formattedProof);
      // Convert amount to u256 format for contract
      const amountU256 = {
        low: amount & BigInt('0xffffffffffffffffffffffffffffffff'),
        high: amount >> BigInt(128)
      };
      
      console.log('calling claim::',[
        code, 
        amountU256, 
        formattedProof, 
      ])
      const tx = await contractInstance.invoke('claim_tokens', [
        code, 
        amountU256, 
        formattedProof, 
      ]);
      console.log('✅ Tokens claimed:', tx.transaction_hash);
      return tx;
    } catch (error: any) {
      console.error('❌ Failed to claim tokens:', error);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        code: error.code,
        details: error.details
      });
      throw error;
    }
  };

  // View functions
  const getMerkleRoot = async () => {
    const contractInstance = getContract();
    if (!contractInstance) throw new Error('Contract not available');
    try {
      console.log('🔍 Calling get_merkle_root on contract...');
      console.log('🔍 Contract instance:', contractInstance);
      console.log('🔍 Contract address:', contractInstance.address);
      
      // Expecting a felt252 (BigInt) as response from Cairo contract <a href="https://starknetjs.com/docs/next/guides/contracts/define_call_message" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">1</a>
      const root = await contractInstance.call('get_merkle_root');
      console.log('🔍 Raw root response:', root);
      console.log('🔍 Root type:', typeof root); // Should be 'bigint'
      console.log('🔍 Root toString():', root.toString());
      
      // Convert bigint to hex format, padding to 64 chars for canonical felt252 representation.
      const hexRoot = `0x${BigInt(root as any).toString(16).padStart(64, '0')}`;
      console.log('🔍 Root as hex:', hexRoot);
      
      return hexRoot;
    } catch (error) {
      console.error('❌ Failed to get Merkle root:', error);
      console.error('❌ Error details:', error);
      throw error;
    }
  };

  const getTotalClaimed = async () => {
    const contractInstance = getContract();
    if (!contractInstance) throw new Error('Contract not available');
    try {
      // Expecting a u256 struct ({ low: felt, high: felt }) as response <a href="https://starknetjs.com/docs/next/guides/contracts/define_call_message" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">1</a>
      const total = await contractInstance.call('get_total_claimed');
      
      // Starknet.js will typically return u256 as { low: BigNumberish, high: BigNumberish }
      // The existing logic to convert to BN is correct.
      const bn = uint256.uint256ToBN({
        low: BigInt((total as any).low),
        high: BigInt((total as any).high),
      });
      return bn.toString();
    } catch (error) {
      console.error('❌ Failed to get total claimed:', error);
      throw error;
    }
  };

  const isLeafClaimed = async (leafHash: string) => {
    const contractInstance = getContract();
    if (!contractInstance) throw new Error('Contract not available');
    try {
      // leafHash (string) is a valid BigNumberish for felt252 parameter <a href="https://starknetjs.com/docs/next/guides/contracts/define_call_message" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">1</a>
      // Expecting a boolean (0 or 1 felt) as response <a href="https://starknetjs.com/docs/next/guides/contracts/define_call_message" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">1</a>
      const claimed = await contractInstance.call('is_leaf_claimed', [leafHash]);
      return Boolean(claimed);
    } catch (error) {
      console.error('❌ Failed to check leaf claimed:', error);
      throw error;
    }
  };

  const isCodeClaimed = async (code: bigint, amount: bigint) => {
    const contractInstance = getContract();
    if (!contractInstance) throw new Error('Contract not available');
    try {
      // Convert amount to u256 format for contract
      const amountU256 = {
        low: amount & BigInt('0xffffffffffffffffffffffffffffffff'),
        high: amount >> BigInt(128)
      };
      
      const claimed = await contractInstance.call('is_code_claimed', [
        code, 
        amountU256, 
      ]);
      return Boolean(claimed);
    } catch (error) {
      console.error('❌ Failed to check code claimed:', error);
      throw error;
    }
  };

  // Admin management functions
  const isAdmin = async (address: string) => {
    const contractInstance = getContract();
    if (!contractInstance) throw new Error('Contract not available');
    try {
      console.log('🔍 Calling is_admin with address:', address);
      const result = await contractInstance.call('is_admin', [address]);
      console.log('🔍 Raw contract result:', result);
      console.log('🔍 Result type:', typeof result);
      console.log('🔍 Result constructor:', result?.constructor?.name);
      console.log('🔍 Result toString():', result?.toString());
      console.log('🔍 Result valueOf():', result?.valueOf());
      console.log('🔍 JSON.stringify(result):', JSON.stringify(result));
      
      // Handle different return types from Starknet
      let isAdminResult: boolean;
      if (typeof result === 'boolean') {
        // If it's already a boolean, use it directly
        isAdminResult = result;
      } else {
        // If it's felt252, convert from string
        const resultStr = result.toString();
        isAdminResult = resultStr === '1' || resultStr === '0x1';
      }
      
      console.log('🔍 Final admin result:', isAdminResult);
      return isAdminResult;
    } catch (error) {
      console.error('❌ Error checking admin status:', error);
      throw error;
    }
  };

  const getAdminCount = async () => {
    const contractInstance = getContract();
    if (!contractInstance) throw new Error('Contract not available');
    try {
      const result = await contractInstance.call('get_admin_count', []);
      console.log('🔍 Admin count result:', result, 'Type:', typeof result);
      // Convert felt252 to number
      return Number(result.toString());
    } catch (error) {
      console.error('Error getting admin count:', error);
      throw error;
    }
  };

  const addAdmin = async (adminAddress: string) => {
    const contractInstance = getContract();
    if (!contractInstance) throw new Error('Contract not available');
    try {
      const tx = await contractInstance.invoke('add_admin', [adminAddress]);
      console.log('✅ Admin added:', tx.transaction_hash);
      return tx;
    } catch (error) {
      console.error('Error adding admin:', error);
      throw error;
    }
  };

  const removeAdmin = async (adminAddress: string) => {
    const contractInstance = getContract();
    if (!contractInstance) throw new Error('Contract not available');
    try {
      const tx = await contractInstance.invoke('remove_admin', [adminAddress]);
      console.log('✅ Admin removed:', tx.transaction_hash);
      return tx;
    } catch (error) {
      console.error('Error removing admin:', error);
      throw error;
    }
  };

  const pauseContract = async () => {
    const contractInstance = getContract();
    if (!contractInstance) throw new Error('Contract not available');
    try {
      const tx = await contractInstance.invoke('pause_contract', []);
      console.log('✅ Contract paused:', tx.transaction_hash);
      return tx;
    } catch (error) {
      console.error('Error pausing contract:', error);
      throw error;
    }
  };

  const unpauseContract = async () => {
    const contractInstance = getContract();
    if (!contractInstance) throw new Error('Contract not available');
    try {
      const tx = await contractInstance.invoke('unpause_contract', []);
      console.log('✅ Contract unpaused:', tx.transaction_hash);
      return tx;
    } catch (error) {
      console.error('Error unpausing contract:', error);
      throw error;
    }
  };

  const setTokenAddress = async (newTokenAddress: string) => {
    const contractInstance = getContract();
    if (!contractInstance) throw new Error('Contract not available');
    try {
      const tx = await contractInstance.invoke('set_token_address', [newTokenAddress]);
      console.log('✅ Token address updated:', tx.transaction_hash);
      return tx;
    } catch (error) {
      console.error('Error setting token address:', error);
      throw error;
    }
  };

  const withdrawTokens = async (amount: bigint) => {
    const contractInstance = getContract();
    if (!contractInstance) throw new Error('Contract not available');
    try {
      // Convert amount to u256 format for contract
      const amountU256 = {
        low: amount & BigInt('0xffffffffffffffffffffffffffffffff'),
        high: amount >> BigInt(128)
      };
      
      const tx = await contractInstance.invoke('withdraw_tokens', [amountU256]);
      console.log('✅ Tokens withdrawn:', tx.transaction_hash);
      return tx;
    } catch (error) {
      console.error('Error withdrawing tokens:', error);
      throw error;
    }
  };

  const withdrawAllTokens = async () => {
    const contractInstance = getContract();
    if (!contractInstance) throw new Error('Contract not available');
    try {
      const tx = await contractInstance.invoke('withdraw_all_tokens', []);
      console.log('✅ All tokens withdrawn:', tx.transaction_hash);
      return tx;
    } catch (error) {
      console.error('Error withdrawing all tokens:', error);
      throw error;
    }
  };

  const resetCampaign = async () => {
    const contractInstance = getContract();
    if (!contractInstance) throw new Error('Contract not available');
    try {
      const tx = await contractInstance.invoke('reset_campaign', []);
      console.log('✅ Campaign reset:', tx.transaction_hash);
      return tx;
    } catch (error) {
      console.error('Error resetting campaign:', error);
      throw error;
    }
  };

  const emergencyWithdraw = async () => {
    const contractInstance = getContract();
    if (!contractInstance) throw new Error('Contract not available');
    try {
      const tx = await contractInstance.invoke('emergency_withdraw', []);
      console.log('✅ Emergency withdrawal:', tx.transaction_hash);
      return tx;
    } catch (error) {
      console.error('Error emergency withdrawal:', error);
      throw error;
    }
  };


  return {
    account,
    address,
    isConnected: status === 'connected',
    contract,
    getContract,
    connectWallet,
    disconnectWallet,
    connectors,
    status,
    // Merkle utils
    generateRandomCode,
    generateRandomAmount,
    
      buildMerkleTree,
    getProofForClaim,
    // Contract interactions
    setMerkleRoot,
    claimTokens,
    getMerkleRoot,
    getTotalClaimed,
    isLeafClaimed,
    isCodeClaimed,
    // Admin management functions
    isAdmin,
    getAdminCount,
    addAdmin,
    removeAdmin,
    pauseContract,
    unpauseContract,
    setTokenAddress,
    withdrawTokens,
    withdrawAllTokens,
    resetCampaign,
    emergencyWithdraw,
  };
}