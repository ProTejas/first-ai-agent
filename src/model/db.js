import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: String,
    mobileNumber: String,
    email: String
});

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    eligibility: { type: [String], required: true },
    interest: { type: String, required: true },
    documents: { type: [String], required: true }
});



const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema, 'products');
export { User, Product }