import { NextRequest, NextResponse } from 'next/server';
import { Contract, RpcProvider } from 'starknet';
import abiData from '@/lib/abi.json';

// Server-side function to verify if an address is an admin
const verifyAdmin = async (address: string): Promise<boolean> => {
  const provider = new RpcProvider({ 
    nodeUrl: process.env.NEXT_PUBLIC_STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io'
  });
  
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error('Contract address not configured');
  }
  
  const contract = new Contract(abiData.abi, contractAddress, provider);
  const isAdmin = await contract.is_admin(address);
  
  console.log('🔍 Backend admin check result:', isAdmin, 'Type:', typeof isAdmin);
  
  // Handle different return types from Starknet
  if (typeof isAdmin === 'boolean') {
    // If it's already a boolean, use it directly
    return isAdmin;
  } else {
    // If it's felt252, convert from string
    const resultStr = isAdmin.toString();
    return resultStr === '1' || resultStr === '0x1';
  }
};

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }
    
    const adminStatus = await verifyAdmin(address);
    
    return NextResponse.json({
      isAdmin: adminStatus,
      address
    });
    
  } catch (error) {
    console.error('Admin verification error:', error);
    return NextResponse.json({ error: 'Failed to verify admin status' }, { status: 500 });
  }
}
