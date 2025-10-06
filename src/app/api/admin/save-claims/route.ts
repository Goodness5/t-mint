import { NextRequest, NextResponse } from 'next/server';
import { saveClaims, saveMerkleTree, nukeEverything } from '@/lib/database';
import { Contract, RpcProvider } from 'starknet';
import abiData from '@/lib/abi.json';

// Server-side function to verify if an address is an admin
const verifyAdmin = async (address: string): Promise<boolean> => {
  console.log('🔍 Backend: Starting admin verification for address:', address);
  
  const provider = new RpcProvider({ 
    nodeUrl: process.env.NEXT_PUBLIC_STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io'
  });
  
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error('Contract address not configured');
  }
  
  console.log('🔍 Backend: Using contract address:', contractAddress);
  
  const contract = new Contract(abiData.abi, contractAddress, provider);
  const isAdmin = await contract.is_admin(address);
  
  console.log('🔍 Backend: Raw contract result:', isAdmin);
  console.log('🔍 Backend: Result type:', typeof isAdmin);
  console.log('🔍 Backend: Result constructor:', isAdmin?.constructor?.name);
  console.log('🔍 Backend: Result toString():', isAdmin?.toString());
  console.log('🔍 Backend: Result valueOf():', isAdmin?.valueOf());
  console.log('🔍 Backend: JSON.stringify(result):', JSON.stringify(isAdmin));
  
  // Handle different return types from Starknet
  let finalResult: boolean;
  if (typeof isAdmin === 'boolean') {
    // If it's already a boolean, use it directly
    finalResult = isAdmin;
  } else {
    // If it's felt252, convert from string
    const resultStr = isAdmin.toString();
    finalResult = resultStr === '1' || resultStr === '0x1';
  }
  
  console.log('🔍 Backend: Final admin result:', finalResult);
  return finalResult;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claims, merkleRoot, totalClaims, clearOld, adminAddress } = body;

    if (!claims || !Array.isArray(claims)) {
      return NextResponse.json({ error: 'Invalid claims data' }, { status: 400 });
    }

    // Verify admin status
    console.log('🔍 API: Received adminAddress:', adminAddress);
    if (!adminAddress) {
      console.log('❌ API: No admin address provided');
      return NextResponse.json({ error: 'Admin address is required' }, { status: 400 });
    }

    console.log('🔍 API: Verifying admin status...');
    const isAdmin = await verifyAdmin(adminAddress);
    console.log('🔍 API: Admin verification result:', isAdmin);
    
    if (!isAdmin) {
      console.log('❌ API: Admin verification failed');
      return NextResponse.json({ error: 'Unauthorized: Address is not an admin' }, { status: 403 });
    }
    
    console.log('✅ API: Admin verification successful');

    // Nuke everything if requested (when setting a new Merkle root)
    if (clearOld) {
      console.log('💥 NUKING EVERYTHING - Clearing all old data...');
      await nukeEverything();
    }

    // Save claims to the database
    await saveClaims(claims);

    // Save Merkle tree metadata if provided
    if (merkleRoot && totalClaims) {
      await saveMerkleTree(merkleRoot, totalClaims);
    }

    return NextResponse.json({
      success: true,
      message: `Saved ${claims.length} claims to database`,
      clearedOld: clearOld || false
    });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
