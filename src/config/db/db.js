import mongoose from "mongoose";
const connectToDb = () => {
  return mongoose
    .connect(process.env.MONGODB_URL)
    .then(() => {
      console.log("Database is Connected");
    })
    .catch((err) => {
      console.log("Error Connecting To Db");
      process.exit(1);
    });
};

export default connectToDb;
