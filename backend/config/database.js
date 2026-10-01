const mongoose = require("mongoose");

async function connectDatabase() {
  try {
    console.log("Connecting to MongoDB Atlas...");

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:");
    console.error(error.message);
    console.error("Code:", error.code);
    console.error("Name:", error.name);

    process.exit(1);
  }
}

module.exports = connectDatabase;