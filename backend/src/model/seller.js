const mongoose = require('mongoose');
const UserRoles= require('../domain/Roles');
const accountStatus= require('../domain/accountStatus');

const sellerSchema =  mongoose.Schema({
    businessName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    
    password: {
        type: String,
        required: true
    },
    isEmailVerified: { 
        type: Boolean, default: false },
phoneNumber: { type: String, default: null },
    GSTIN: { type: String, default: null },
    IMPORT_EXPORT_Code: { type: String, default: null },
    preferredPortAndAirport: { type: String, default: null },
    FieldOfInterest: { type: String, default: null },
    
    bankDetails: {
        accountHolderName: { type: String, default: null },
        accountNumber: { type: String, default: null },
        bankName: { type: String, default: null },
        ifscCode: { type: String, default: null } 
    },
    address: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address"
    }],
    

role:{
    type:String,
    default:UserRoles.SELLER
},
accountStatus:{
    type:String,
    enum:[
            accountStatus.ACTIVE,
            accountStatus.SUSPENDED,
            accountStatus.DEACTIVATED,
            accountStatus.BANNED,
            accountStatus.CLOSED,
            accountStatus.PENDING_VERIFICATION],
    default:accountStatus.PENDING_VERIFICATION
}
},{timestamps:true});

const seller = mongoose.model('seller', sellerSchema);

module.exports = seller;


