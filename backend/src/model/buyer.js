const mongoose = require('mongoose');
const UserRoles= require('../domain/Roles');
const UserRoles= require('../domain/accountStatus');

const buyerSchema =  mongoose.Schema({
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
location:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Location"

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
    default:UserRoles.BUYER
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

const buyer = mongoose.model('buyer', buyerSchema);

module.exports = buyer;


