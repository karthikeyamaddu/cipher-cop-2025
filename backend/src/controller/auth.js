import { User } from "../lib/db.js";
import bcrypt from "bcryptjs";
import { generateToken } from "./tokengen.js";

export const signup = async (req, res) => {
    const { fullName, email, password } = req.body;
    try {
        // Validation
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ 
            fullName: fullName.trim(), 
            email: email.toLowerCase().trim(), 
            password: hashedPassword,
            accountStatus: 'active',
            role: 'user',
            emailVerified: false,
            loginCount: 0
        });
        
        await newUser.save(); 

        generateToken(newUser._id, res);

        console.log(`✅ New user created: ${newUser._id} - ${newUser.email}`);

        return res.status(201).json({
            _id: newUser._id,
            fullName: newUser.fullName,
            email: newUser.email,
            role: newUser.role,
            emailVerified: newUser.emailVerified,
            accountStatus: newUser.accountStatus,
            message: "Account created successfully"
        });
    } catch (error) {
        console.error("Signup Error:", error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};


export const checkAuth = (req, res) => {
    try {
        return res.status(200).json(req.user);
    } catch (error) {
        console.error("CheckAuth Error:", error.message);
        return res.status(500).json({ message: "Internal Server Error at check auth" });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(400).json({ message: "User does not exist. Sign up to continue." });
        }

        // Check account status
        if (user.accountStatus === 'suspended') {
            return res.status(403).json({ message: "Account suspended. Please contact support." });
        }
        if (user.accountStatus === 'deleted') {
            return res.status(403).json({ message: "Account has been deleted." });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Update last login and login count
        await User.findByIdAndUpdate(user._id, {
            lastLogin: new Date(),
            $inc: { loginCount: 1 }
        });

        res.clearCookie("jwt");
        generateToken(user._id, res);

        return res.status(201).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified,
            accountStatus: user.accountStatus
        });
    } catch (error) {
        console.error("Login Error:", error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const logout = (req, res) => {
    try {
        res.cookie("jwt", "", {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 0,
        });
        return res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout Error:", error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const callDB=(req,res)=>{
    try{
        return res.status(200).json({message:"Call to DB Succesful",user:req.user});
    }
    catch(error){
        console.error("CallDB Error:",error.message);
        return res.status(500).json({message:"Internal Server Error at call db"});
    }
}

// Extension authentication for browser extension access
export const extensionAuth = async (req, res) => {
    try {
        const { extensionId, version, userAgent } = req.body;
        
        // For now, create a temporary extension user or allow access
        // In production, you'd want to validate the extension ID and implement proper auth
        const extensionUser = {
            _id: 'extension_user',
            fullName: 'Browser Extension',
            email: 'extension@ciphercop.local',
            type: 'extension'
        };
        
        // Generate a token for the extension
        generateToken('extension_user', res);
        
        return res.status(200).json({
            token: req.cookies?.jwt || 'extension_token',
            user: extensionUser,
            message: 'Extension authenticated successfully'
        });
    } catch (error) {
        console.error("Extension Auth Error:", error.message);
        return res.status(500).json({ message: "Extension authentication failed" });
    }
};

export default { signup, login, logout, checkAuth, extensionAuth };
