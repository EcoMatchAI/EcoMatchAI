const seller=require("../model/seller");
const jwtProvider=require("../util/jwtProvider");
const address=require("../model/address");





class SellerServices{
  async createSeller(data){
    const userFound =await seller.findOne({email:data.email})
    if(userFound){
        throw new Error("seller already exists");

    }
let saveAddress=data.address
saveAddress = await Address.create(data.pickupAddress);
        const newSeller = await Seller.create({
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
        return newSeller;
  }
async getSellerProfile(jwt){
        const email = jwtProvider.getEmailFromjwt(jwt)
        return this.getSellerByEmail(email);
    }

    async getSellerByEmail(email){
        const seller = await Seller.findOne({email:email})
        if (!seller){
            throw new Error("Seller not found")
        }
        return seller;

    }
    
    async getSellerById(id){
        const seller = await Seller.findById(id);
        if (!seller){
            throw new Error("Seller Not Present")
        }
        return seller
    }
    async getAllSeller(status){
        const allSellers = await Seller.find({accountStatus:status})
        return allSellers
    }
    async updateSeller(existingSeller,newSellerData){
        const updatedSeller = await Seller.findByIdAndUpdate(existingSeller._id,newSellerData,{new:true});
        return updatedSeller;
    }
    
    async updateSellerStatus(sellerId, status){
        return await Seller.findByIdAndUpdate(sellerId,
            {$set:{accountStatus:status}},
            {new:true})
    }

    async deleteSeller(sellerId){
        return await Seller.findByIdAndDelete(sellerId);
    }
} 
module.exports=new SellerServices();


