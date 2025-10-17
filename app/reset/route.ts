import { sql } from '../lib/db';

export async function GET() {
  try {
    await sql.begin(async (sql) => {
      // Delete all tables (in order of dependencies)
      await sql`DROP TABLE IF EXISTS invoices CASCADE`;
      await sql`DROP TABLE IF EXISTS customers CASCADE`;
      await sql`DROP TABLE IF EXISTS users CASCADE`;
      await sql`DROP TABLE IF EXISTS revenue CASCADE`;
    });

    return Response.json({
      message: 'Database reset successfully. Please visit /seed to reinitialize.'
    });
  } catch (error) {
    console.error('Reset error:', error);
    return Response.json({ error }, { status: 500 });
  }
}
