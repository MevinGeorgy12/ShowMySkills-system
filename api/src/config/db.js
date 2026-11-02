import mongoose from 'mongoose';

// MongoDB lifecycle event telemetry
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connection established successfully.');
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected from server.');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB connection restored.');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB connection error: ${err.message}`);
});

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Configuration Error: MONGODB_URI environment variable is missing.');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    console.warn(
      '⚠️ Backend server will continue running in degraded mode so healthcheck and 503 error diagnostics remain active.'
    );
    return false;
  }
};
