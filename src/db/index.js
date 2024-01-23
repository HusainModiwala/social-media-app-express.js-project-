import mongoose from "mongoose";
import {DB_NAME} from "../constants.js";

const connectDB = async () => {
    try {
        const connectionObj = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        //console.log('connection obj: ', connectionObj);
        console.log(`MongoDb connected and Host is: ${connectionObj.connection.host}`);
    } catch (error) {
        console.error("MongoDB connection Failed..", error);
        process.exit(1)
    }
}

export default connectDB;