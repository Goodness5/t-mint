import { NextRequest, NextResponse } from 'next/server';
import { saveClaims, saveMerkleTree, nukeEverything } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claims, merkleRoot, totalClaims, clearOld } = body;

    if (!claims || !Array.isArray(claims)) {
      return NextResponse.json({ error: 'Invalid claims data' }, { status: 400 });
    }

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
