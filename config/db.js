const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri);

let database;

const connectDB = async () => {
  try {
    await client.connect();

    database = client.db("studynook");

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
  }
};

const getDB = () => database;

module.exports = {
  connectDB,
  getDB,
};
