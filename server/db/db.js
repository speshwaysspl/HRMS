import mongoose from "mongoose";

const normalizeMongoUri = (raw) => {
    let uri = (raw || "").trim();
    if ((uri.startsWith('"') && uri.endsWith('"')) || (uri.startsWith("'") && uri.endsWith("'"))) {
        uri = uri.slice(1, -1).trim();
    }
    if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
        throw new Error("Invalid MONGODB_URL: must start with mongodb:// or mongodb+srv://");
    }
    const hasDbPath = /mongodb(\+srv)?:\/\/[^/]+\/[^^?]*/.test(uri);
    if (!hasDbPath) {
        const dbName = process.env.MONGODB_DB || "hrms";
        const qIndex = uri.indexOf("?");
        uri = qIndex === -1 ? `${uri}/${dbName}` : `${uri.slice(0, qIndex)}/${dbName}${uri.slice(qIndex)}`;
    }
    return uri;
};

const connectToDatabase = async () => {
    try {
        const uri = normalizeMongoUri(process.env.MONGODB_URL);
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
        console.log("MongoDB connected");
    } catch (error) {
        console.log(error);
    }
};

export default connectToDatabase