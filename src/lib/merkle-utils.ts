import { poseidonHashMany } from '@scure/starknet';

export interface Claim {
  code: bigint;
  amount: bigint; // Simple amount in wei (e.g., 12 STRK = 12 * 10^18 wei)
}

export interface MerkleTree {
  leaves: string[];
  root: string;
}

export interface ClaimWithProof extends Claim {
  proof: string[];
}

// Convert simple amount to u256 format for contract calls
export const amountToU256 = (amount: bigint): { low: bigint; high: bigint } => {
  const low = amount & BigInt('0xffffffffffffffffffffffffffffffff'); // Lower 128 bits
  const high = amount >> BigInt(128); // Upper 128 bits
  return { low, high };
};

// Hash function that matches the contract's Poseidon implementation
const hashClaim = (code: bigint, amount: bigint): string => {
  // Convert amount to u256 format (low, high) for hashing to match contract
  const amountLow = amount & BigInt('0xffffffffffffffffffffffffffffffff'); // Lower 128 bits
  const amountHigh = amount >> BigInt(128); // Upper 128 bits
  
  const hash = poseidonHashMany([code, amountLow, amountHigh]);
  const result = `0x${hash.toString(16).padStart(64, '0')}`;
  
  console.log('🔍 Frontend hash generation:');
  console.log('  - Code:', code.toString());
  console.log('  - Amount:', amount.toString());
  console.log('  - Amount Low:', amountLow.toString());
  console.log('  - Amount High:', amountHigh.toString());
  console.log('  - Generated Hash:', result);
  
  return result;
};

// Build Merkle tree from claims
export const buildMerkleTree = (claims: Claim[]): { tree: MerkleTree; root: string } => {
  const leaves: string[] = claims.map((claim) => {
    return hashClaim(claim.code, claim.amount);
  });

  const root = calculateRoot(leaves);
  const tree: MerkleTree = { leaves, root };

  return { tree, root };
};

// Calculate Merkle root from leaves with commutative hashing
const calculateRoot = (leaves: string[]): string => {
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
      combined = poseidonHashMany([leftBigInt, rightBigInt]);
    } else {
      combined = poseidonHashMany([rightBigInt, leftBigInt]);
    }
    
    nextLevel.push(`0x${combined.toString(16).padStart(64, '0')}`);
  }

  return calculateRoot(nextLevel);
};

// Get Merkle proof for a specific leaf index
export const getProofForClaim = (tree: MerkleTree, leafIndex: number): string[] => {
  const proof: string[] = [];
  let currentLevel = [...tree.leaves];
  let currentIndex = leafIndex;

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    let siblingFound = false;

    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] || left;

      // Add sibling to proof if current leaf is in this pair
      if (Math.floor(currentIndex / 2) === Math.floor(i / 2)) {
        if (currentIndex % 2 === 0) {
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
        combined = poseidonHashMany([leftBigInt, rightBigInt]);
      } else {
        combined = poseidonHashMany([rightBigInt, leftBigInt]);
      }
      
      nextLevel.push(`0x${combined.toString(16).padStart(64, '0')}`);
    }

    if (!siblingFound) {
      throw new Error('Sibling not found in proof generation');
    }

    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
  }

  return proof;
};

// Generate proofs for all claims
export const getProofsForClaims = (claims: Claim[]): { root: string; claimsWithProofs: ClaimWithProof[] } => {
  // Build the Merkle tree
  const { tree, root } = buildMerkleTree(claims);

  // Generate proof for each claim
  const claimsWithProofs = claims.map((claim, index) => {
    const proof = getProofForClaim(tree, index);
    console.log(`🔒 Generated proof for claim ${index} (code: ${claim.code.toString()}, amount: ${claim.amount.toString()}):`, proof);
    return {
      ...claim,
      proof,
    };
  });

  return { root, claimsWithProofs };
};
