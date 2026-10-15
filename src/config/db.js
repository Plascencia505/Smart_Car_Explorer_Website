import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

console.log(MONGO_URI);

export async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Conexión exitosa a MongoDB Atlas.');
    return mongoose;
  } catch (err) {
    console.error('Error al conectar con MongoDB Atlas:', err.message);
    process.exit(1);
  }
}

export async function disconnectFromMongoDB() {
  await mongoose.connection.close();
  console.log('Conexión con MongoDB cerrada.');
}