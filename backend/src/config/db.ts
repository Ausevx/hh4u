import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Connects to MongoDB Atlas or local MongoDB instance with database isolation.
 * Uses DB_NAME from environment variables with fallback to 'hh4u'.
 *
 * @param dbNameOverride Optional database name override
 * @returns Mongoose connection instance
 */
export const connectDB = async (dbNameOverride?: string): Promise<typeof mongoose> => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }

    const dbName = dbNameOverride || process.env.DB_NAME || 'hh4u';

    const conn = await mongoose.connect(mongoUri, {
      dbName,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}, Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${(error as Error).message}`);
    process.exit(1);
  }
};

export default connectDB;
