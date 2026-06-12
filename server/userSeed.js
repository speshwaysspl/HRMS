import User from './models/User.js'
import bcrypt from 'bcrypt'
import connectToDatabase from './db/db.js'
import dotenv from 'dotenv'

dotenv.config({ quiet: true });

const userRegister = async () => {
    try {
        await connectToDatabase()
        
        const existingUser = await User.findOne({ email: "speshwaysspl@gmail.com" });
        if (existingUser) {
            console.log("Admin user already exists");
            return;
        }

        const hashPassword = await bcrypt.hash("2026Speshway@", 10)
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
        process.exit(0)
    }
}

userRegister();