import User from "../models/User.js";
import bcrypt from 'bcrypt'
import RootPassword from "../models/RootPassword.js";

const changePassword = async (req, res) => {
    try { 
        const {userId, oldPassword, newPassword} = req.body;

        const user = await User.findById({_id: userId})
        if(!user) {
        return res.status(404).json({success: false, error: "user not found"})
        }
        const isMatch = await bcrypt.compare(oldPassword, user.password)
        if(!isMatch) {
        return res.status(404).json({success: false, error: "wrong old password"})
        }

        const hashPassword = await bcrypt.hash(newPassword, 10)

        const newUser = await User.findByIdAndUpdate({_id: userId}, {password: hashPassword})

        return res.status(200).json({success: true})

    } catch(error) {
        return res.status(500).json({success: false, error: "setting error"})
    }
}

const isAdmin = (user) => (Array.isArray(user.role) ? user.role : [user.role]).includes("admin");

// GET /api/setting/root-password -> whether it's set, when, and recent root logins (admin only)
const getRootPassword = async (req, res) => {
    try {
        if (!isAdmin(req.user)) return res.status(403).json({ success: false, error: "Admins only" });
        const root = await RootPassword.findOne().populate("updatedBy", "name").lean();
        return res.status(200).json({
            success: true,
            isSet: !!root,
            updatedAt: root?.updatedAt || null,
            updatedBy: root?.updatedBy?.name || null,
            recentLogins: (root?.logins || []).slice(-10).reverse(),
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: "setting error" });
    }
}

// PUT /api/setting/root-password { adminPassword, newPassword } (admin only)
const setRootPassword = async (req, res) => {
    try {
        if (!isAdmin(req.user)) return res.status(403).json({ success: false, error: "Admins only" });
        const { adminPassword, newPassword } = req.body;
        const admin = await User.findById(req.user._id);
        if (!admin || !(await bcrypt.compare(adminPassword || "", admin.password))) {
            return res.status(400).json({ success: false, error: "Your admin password is incorrect" });
        }
        const pwd = String(newPassword || "");
        if (pwd.length < 8 || pwd.length > 18 || !/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[^A-Za-z0-9]/.test(pwd)) {
            return res.status(400).json({ success: false, error: "Root password must be 8–18 characters with uppercase, lowercase, number and special character" });
        }
        const hash = await bcrypt.hash(pwd, 10);
        await RootPassword.findOneAndUpdate({}, { hash, updatedBy: admin._id }, { upsert: true });
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, error: "setting error" });
    }
}

export {changePassword, getRootPassword, setRootPassword}