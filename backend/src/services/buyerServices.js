const buyer=require("../model/buyer");
const jwtProvider=require("../util/jwtProvider");
const address=require("../model/address");





class  BuyerServices{
  async createBuyer(data){
    const userFound =await buyer.findOne({email=data.email})
    if(userFound){
        throw new Error("buyer already exists");

    }
let saveAddress=data.address
saveAddress = await Address.create(data.pickupAddress);
        const newBuyer = await buyer.create({
            businessName:data.businessName,
            email:data.email,
            phoneNumber:data.phoneNumber,
            password:data.password,
            address:saveAddress._id,
            GSTIN:data.GSTIN,
            bankDetails:data.bankDetails,
            IMPORT_EXPORT_Code:data.IMPORT_EXPORT_Code,
            preferredPortAndAirport:data.preferredPortAndAirport,
            FieldOfInterest:data.FieldOfInterest

        })
        return newBuyer;
  }
async getBuyerProfile(jwt){
        const email = jwtProvider.getEmailFromjwt(jwt)
        return this.getBuyerByEmail(email);
    }

    async getBuyerByEmail(email){
        const buyer = await buyer.findOne({email:email})
        if (!buyer){
            throw new Error("buyer not found")
        }
        return buyer;

    }
    
    async getBuyerById(id){
        const buyer = await buyer.findById(id);
        if (!buyer){
            throw new Error("buyer Not Present")
        }
        return buyer
    }
    async getAllBuyer(status){
        const allBuyers = await buyer.find({accountStatus:status})
        return allBuyers
    }
    async updateBuyer(existingBuyer,newBuyerData){
        const updatedBuyer = await buyer.findByIdAndUpdate(existingBuyer._id,newBuyerData,{new:true});
        return updatedBuyer;
    }
    
    async updateBuyerStatus(buyerId, status){
        return await buyer.findByIdAndUpdate(buyerId,
            {$set:{accountStatus:status}},
            {new:true})
    }

    async deleteBuyer(buyerId){
        return await buyer.findByIdAndDelete(buyerId);
    }
} 
module.exports=new BuyerServices();


