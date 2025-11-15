import mongoose from 'mongoose';

let con = null;

export const connectDB = async () => {
  try {
    con = await mongoose.connect("mongodb+srv://fraudlens:fraudlens123@cluster0.qmhucr4.mongodb.net/ciphercop", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MONGO DB Connected: ${con.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error: " + error.message);
  }
};

// User Schema
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active'
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'premium'],
      default: 'user'
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    lastLogin: {
      type: Date,
      default: null
    },
    loginCount: {
      type: Number,
      default: 0
    },
    testResults: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'TestResult',
      default: []
    },
    testCount: {
      type: Number,
      default: 0
    }
  },
  { 
    timestamps: true,
    collection: 'users'
  }
);

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ accountStatus: 1 });

const User = mongoose.model("User", userSchema);

// Result Schema (loose structure)
const resultSchema = new mongoose.Schema({}, { strict: false });
const Result = mongoose.model("Result", resultSchema, "results"); // Explicit collection name

export { User, Result };
