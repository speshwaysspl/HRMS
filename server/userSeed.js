import User from "./models/User.js";
import bcrypt from "bcryptjs";
import connectToDatabase from "./db/db.js";

const userRegister = async () => {
    try {
        await connectToDatabase()
        
        const existingUser = await User.findOne({ email: "speshwaysspl@gmail.com" });
        if (existingUser) {
            console.log("Admin user already exists");
            return;
        }

        const hashPassword = await bcrypt.hash("speshway@2017", 10)
        const newUser = new User({
            name: "Admin",
            email: "speshwaysspl@gmail.com",
            password: hashPassword,
            role: "admin"
        })
        await newUser.save()
        console.log("Admin user created successfully")
    } catch(error) {
        console.log("Error creating admin user:", error)
    } finally {
        // Close connection to allow script to exit cleanly
        // mongoose.connection.close() // Optional but good practice
        process.exit(0)
    }
}

userRegister();
