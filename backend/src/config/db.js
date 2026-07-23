<<<<<<< HEAD
const mongoose = require('mongoose')
require("dotenv").config();

const connectDb = async ()=>{
    try{
        const conn = await mongoose.connect(process.env.MONGO_URI)
        console.log("Database connected - "+conn.connection.host )}
    catch(error){
        console.log("Database connection error - "+error.message)
    }
}

module.exports = connectDb;




=======
import mongoose from 'mongoose';

/**
 * Connect to MongoDB using the MONGO_URI environment variable.
 * Exits the process on failure so the server doesn't run without a DB.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
>>>>>>> ba82d553418f9ba77bdf39ddad41b82825cbdbed
