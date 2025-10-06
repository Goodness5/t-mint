import { sql } from '@vercel/postgres';

// Configure the connection string for @vercel/postgres
if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

type Claim = {
  code: string;
  codeString: string;
  amount: string; // Simple amount as string (e.g., "12000000000000000000")
  merkleRoot: string;
  treeIndex: number;
};

class DatabaseService {
  async createTables() {
    await sql`
      CREATE TABLE IF NOT EXISTS claims (
        id SERIAL PRIMARY KEY,
        code VARCHAR(255) UNIQUE NOT NULL,
        code_string VARCHAR(255) NOT NULL,
        amount VARCHAR(255) NOT NULL,
        merkle_root VARCHAR(255) NOT NULL,
        tree_index INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        claimed_at TIMESTAMP NULL,
        claimed_by VARCHAR(255) NULL,
        tx_hash VARCHAR(255) NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS merkle_trees (
        id SERIAL PRIMARY KEY,
        root VARCHAR(255) UNIQUE NOT NULL,
        total_claims INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );
    `;

    console.log('✅ Database tables created successfully');
  }

  async saveClaims(claims: Claim[]) {
    if (claims.length === 0) return;

    console.log('🔌 Attempting to save claims to database...');
    console.log(`📝 Saving ${claims.length} claims...`);

    try {
      // Use individual inserts with sql template literals (fastest approach for @vercel/postgres)
      for (const claim of claims) {
        console.log(`📝 Inserting claim:`);
        console.log(`  - code: ${claim.code}`);
        console.log(`  - codeString: ${claim.codeString}`);
        console.log(`  - amount: ${claim.amount}`);
        console.log(`  - merkleRoot: ${claim.merkleRoot}`);
        console.log(`  - treeIndex: ${claim.treeIndex}`);
        
        await sql`
          INSERT INTO claims (code, code_string, amount, merkle_root, tree_index)
          VALUES (${claim.code}, ${claim.codeString}, ${claim.amount}, ${claim.merkleRoot}, ${claim.treeIndex})
          ON CONFLICT (code) DO NOTHING
        `;
      }

      // Insert merkle tree info
      const { merkleRoot } = claims[0];
      await sql`
        INSERT INTO merkle_trees (root, total_claims)
        VALUES (${merkleRoot}, ${claims.length})
        ON CONFLICT (root) DO UPDATE SET
          total_claims = EXCLUDED.total_claims,
          is_active = true
      `;

      console.log(`✅ Successfully saved ${claims.length} claims to database`);
    } catch (error) {
      console.error('❌ Error saving claims:', error);
      throw error;
    }
  }

  async getClaimsByRoot(merkleRoot: string) {
    const result = await sql`
      SELECT code, code_string, amount, tree_index, claimed_at, claimed_by
      FROM claims
      WHERE merkle_root = ${merkleRoot}
      ORDER BY tree_index
    `;

    return result.rows;
  }

  async getClaimByCode(code: string) {
    const result = await sql`
      SELECT code, code_string, amount, merkle_root, tree_index, claimed_at, claimed_by
      FROM claims
      WHERE code = ${code}
    `;

    return result.rows[0] ?? null;
  }

  async getClaimByCodeString(codeString: string) {
    const result = await sql`
      SELECT code, code_string, amount, merkle_root, tree_index, claimed_at, claimed_by
      FROM claims
      WHERE code_string = ${codeString}
    `;

    return result.rows[0] ?? null;
  }

  async getActiveMerkleRoot() {
    const result = await sql`
      SELECT root
      FROM merkle_trees
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    return result.rows[0]?.root ?? null;
  }

  async saveMerkleTree(merkleRoot: string, totalClaims: number) {
    await sql`
      INSERT INTO merkle_trees (root, total_claims)
      VALUES (${merkleRoot}, ${totalClaims})
      ON CONFLICT (root) DO UPDATE SET
        total_claims = EXCLUDED.total_claims,
        is_active = true
    `;
  }

  async nukeEverything() {
    console.log('💥 NUKING EVERYTHING - Clearing all claims and Merkle trees...');
    await sql`DELETE FROM claims`;
    await sql`DELETE FROM merkle_trees`;
    console.log('✅ Everything nuked - database is clean');
  }

  async testConnection() {
    const result = await sql`SELECT NOW() as now`;
    console.log('✅ DB connection result:', result.rows);
    return result.rows;
  }
}

// Create a singleton instance
const db = new DatabaseService();

// Export the functions that use the singleton
export const createTables = () => db.createTables();
export const saveClaims = (claims: Claim[]) => db.saveClaims(claims);
export const getClaimsByRoot = (merkleRoot: string) => db.getClaimsByRoot(merkleRoot);
export const getClaimByCode = (code: string) => db.getClaimByCode(code);
export const getClaimByCodeString = (codeString: string) => db.getClaimByCodeString(codeString);
export const getActiveMerkleRoot = () => db.getActiveMerkleRoot();
export const saveMerkleTree = (merkleRoot: string, totalClaims: number) => db.saveMerkleTree(merkleRoot, totalClaims);
export const nukeEverything = () => db.nukeEverything();
export const testConnection = () => db.testConnection();

// Initialize database on import
createTables().catch(console.error);
testConnection().catch(console.error);