import { NextRequest, NextResponse } from 'next/server';
import { getClaimByCodeString, getClaimsByRoot } from '@/lib/database';
import { codeToFelt } from '@/lib/wallet-utils';
import { buildMerkleTree, getProofForClaim } from '@/lib/merkle-utils';
import * as scureStarknet from '@scure/starknet';
import { RpcProvider, Contract } from 'starknet';
import abiData from '@/lib/abi.json';

// Using the centralized Merkle tree implementation from merkle-utils.ts

// Using the centralized Merkle tree implementation from merkle-utils.ts

// Using the centralized getProofForClaim from merkle-utils.ts

// Server-side function to get contract's current Merkle root
const getContractMerkleRoot = async (): Promise<string> => {
  const provider = new RpcProvider({ 
    nodeUrl: process.env.NEXT_PUBLIC_STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io'
  });
  
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error('Contract address not configured');
  }
  
  const contract = new Contract(abiData.abi, contractAddress, provider);
  const root = await contract.get_merkle_root();
  
  // Convert to hex string with 0x prefix
  return `0x${root.toString(16).padStart(64, '0')}`;
};

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    console.log('🔍 API received code:', code);
    
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }
    
    // The code is a readable string, but we need to find the claim by the full bigint
    // Since we can't reconstruct the full bigint from the truncated code,
    // we need to search by the codeString field instead
    console.log('🔍 Searching for code string:', code);
    
    // Fetch claim data from database by codeString (the readable code)
    const claimData = await getClaimByCodeString(code);
    console.log('🔍 Claim data from DB:', claimData);
    
    if (!claimData) {
      console.log('❌ No claim data found for code:', code);
      
      // Let's also try to see what codes are actually in the database
      try {
        const allClaims = await getClaimsByRoot('any'); // This will fail but let's see what happens
        console.log('🔍 All claims in DB:', allClaims);
      } catch (e) {
        console.log('🔍 Could not fetch all claims:', (e as any).message);
      }
      
      return NextResponse.json({ error: 'Invalid claim code. Please check and try again.' }, { status: 404 });
    }
    
    if (claimData.claimed_at) {
      return NextResponse.json({ error: 'This claim code has already been used.' }, { status: 400 });
    }
    
    // Fetch all claims for this Merkle root to build the complete tree
    const allClaims = await getClaimsByRoot(claimData.merkle_root);
    
    // Convert database claims to the format needed for Merkle tree
    const claims = allClaims.map(claim => {
      console.log(`🔍 Converting claim from DB:`);
      console.log(`  - DB code: ${claim.code}`);
      console.log(`  - DB codeString: ${claim.code_string}`);
      console.log(`  - DB amount: ${claim.amount}`);
      
      // Verify the code conversion
      const expectedFelt = codeToFelt(claim.code_string);
      console.log(`  - Expected felt from codeString: ${expectedFelt.toString()}`);
      console.log(`  - DB code matches expected: ${claim.code === expectedFelt.toString()}`);
      
      const convertedClaim = {
        code: BigInt(claim.code),
        amount: BigInt(claim.amount) // Simple amount from database
      };
      
      console.log(`  - Converted code: ${convertedClaim.code.toString()}`);
      console.log(`  - Converted amount: ${convertedClaim.amount.toString()}`);
      
      return convertedClaim;
    });
    
    console.log(`🔍 Building Merkle tree with ${claims.length} claims`);
    
    // Build the complete Merkle tree
    const { tree, root } = buildMerkleTree(claims);
    
    // Get the contract's current Merkle root
    console.log('🔍 Fetching contract\'s current Merkle root...');
    const contractRoot = await getContractMerkleRoot();
    console.log(`  - Contract's current root: ${contractRoot}`);
    
    console.log(`🔍 Generated Merkle tree:`);
    console.log(`  - Tree root: ${root}`);
    console.log(`  - Database root: ${claimData.merkle_root}`);
    console.log(`  - Contract root: ${contractRoot}`);
    console.log(`  - Tree vs Contract match: ${root === contractRoot}`);
    console.log(`  - Tree vs Database match: ${root === claimData.merkle_root}`);
    console.log(`  - Tree leaves count: ${tree.leaves.length}`);
    
    // Check if the rebuilt tree matches the contract's current root
    if (root !== contractRoot) {
      console.log('❌ Rebuilt tree root does not match contract\'s current root!');
      console.log('❌ This means the database claims are from a different Merkle tree than what\'s set on the contract.');
      console.log('🔧 Admin needs to generate new claims and activate the campaign.');
      return NextResponse.json({ 
        error: 'This claim code is no longer valid. Please contact the admin for a new claim code.' 
      }, { status: 400 });
    }
    
    // Find the specific claim in the rebuilt tree and get its ACTUAL index
    const targetClaimIndex = claims.findIndex(claim => claim.code.toString() === claimData.code);
    if (targetClaimIndex === -1) {
      console.log(`❌ Target claim not found in rebuilt tree!`);
      console.log(`  - Looking for code: ${claimData.code}`);
      console.log(`  - Available codes: ${claims.map(c => c.code.toString())}`);
      return NextResponse.json({ error: 'Claim not found in current campaign' }, { status: 404 });
    }
    
    const targetClaim = claims[targetClaimIndex];
    console.log(`✅ Target claim found in rebuilt tree`);
    console.log(`  - Target code: ${targetClaim.code.toString()}`);
    console.log(`  - Target amount: ${targetClaim.amount.toString()}`);
    console.log(`  - Database tree_index: ${claimData.tree_index}`);
    console.log(`  - Actual tree index: ${targetClaimIndex}`);
    
               // Generate proof for the specific claim using its ACTUAL index in the rebuilt tree
               const proof = getProofForClaim(tree, targetClaimIndex);
               
               console.log(`🔍 Generated proof:`);
               console.log(`  - Proof length: ${proof.length}`);
               console.log(`  - Proof: ${JSON.stringify(proof)}`);
               console.log(`  - Database tree_index: ${claimData.tree_index}`);
               console.log(`  - Actual tree index used: ${targetClaimIndex}`);
               console.log(`  - Target leaf: ${tree.leaves[targetClaimIndex]}`);
               
               // Manual proof verification
               console.log(`🔍 Manual proof verification:`);
               let currentHash = BigInt(tree.leaves[targetClaimIndex]);
               console.log(`  - Starting with leaf: 0x${currentHash.toString(16).padStart(64, '0')}`);
               
               for (let i = 0; i < proof.length; i++) {
                 const proofElement = BigInt(proof[i]);
                 console.log(`  - Step ${i + 1}: Combining 0x${currentHash.toString(16).padStart(64, '0')} with proof element 0x${proofElement.toString(16).padStart(64, '0')}`);
                 
                 const combined = scureStarknet.poseidonHashMany([currentHash, proofElement]);
                 currentHash = combined;
                 console.log(`  - Result: 0x${currentHash.toString(16).padStart(64, '0')}`);
               }
               
               console.log(`  - Final hash: 0x${currentHash.toString(16).padStart(64, '0')}`);
               console.log(`  - Tree root: ${tree.root}`);
               console.log(`  - Match: ${currentHash.toString() === BigInt(tree.root).toString()}`);
    
    // Debug the tree structure
    console.log(`🔍 Tree structure debug:`);
    console.log(`  - All leaves: ${JSON.stringify(tree.leaves)}`);
    console.log(`  - Tree root: ${tree.root}`);
    
    // Verify the proof manually
    if (proof.length > 0) {
      console.log(`🔍 Proof verification debug:`);
      console.log(`  - First proof element: ${proof[0]}`);
      console.log(`  - First proof element as BigInt: ${BigInt(proof[0]).toString()}`);
      console.log(`  - First proof element as hex: 0x${BigInt(proof[0]).toString(16)}`);
    }
    
    return NextResponse.json({
      amount: claimData.amount, // Simple amount as string
      proof,
      merkleRoot: claimData.merkle_root
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST endpoint removed - smart contract handles claim marking
