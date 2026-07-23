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
    phoneNumber: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    bankDetails:{
        accountHolderName:{
            type:String,
            required:true
        },
        accountNumber:{
            type:String,
        required:true
        },
        bankName:{
            type:String,
            required:true
        },
        ifscCode:{
            type:String,
            required:true
        },
    },
address:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Address"

}],
GSTIN:{
    type:String,
    required:true
},
IMPORT_EXPORT_Code:{
    type:String,
},
preferredPortAndAirport:{
    type:String,
}, 
FieldOfInterest:{
    type:String,
},
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


