import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    mobileNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const loanSchema = new mongoose.Schema({
    productType: String,
    name: String,
    interestRate: String,
    processingFee: String,
    eligibility: String,
    documents: [String],
    description: String
});

export const LoanProduct = mongoose.model("LoanProduct", loanSchema);
export const User = mongoose.model('User', userSchema);