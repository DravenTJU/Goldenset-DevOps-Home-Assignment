import postgres from 'postgres';

// Create a database connection
// In local development environment, SSL is not required, in production environment, it is determined by the URL parameters
export const sql = postgres(process.env.POSTGRES_URL!, {
  ssl: process.env.POSTGRES_URL!.includes('sslmode=disable') ? false : 'require',
});
