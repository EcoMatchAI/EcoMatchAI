const seller=require("../model/seller");
const sellerServices=require("../services/sellerServices");
const jwtProvider=require("../util/jwtProvider");
class SellerController{

    async getSellerProfile(req,res){
        try{
            const jwt = req.headers.authorization.split(" ")[1];
            if (!jwt){
                res.status(404).json({
                    message:"No auth token found"
                })
            } 
            const seller =  await sellerService.getSellerProfile(jwt)
            res.status(200).json(seller);
        }
        catch(err){
            res.status(err instanceof Error? 404:500).json({message:err.message})
        }
    }

    async createSeller(req,res){
        try {
            const seller = await sellerService.createSeller(req.body);
            res.status(200).json({message:"Seller Created Successfully"});
        } catch (error) {
            res.status(error instanceof Error?404:500).json({
                message:error.message
            })
            
        }
    }

    async getAllSellers(req,res){
        try {
            const status = req.query.status
            const sellers = await sellerService.getAllSeller(status);
            res.status(200).json({sellers})
        } catch (error) {
            res.status(error instanceof Error?404:500).json({
                message:error.message
            })
        }
    }

    async updateSeller(req,res){
        try {
            const existingSeller = req.seller
            const seller = await sellerService.updateSeller(existingSeller,req.body);
            res.status(200).json({seller})
        } catch (error) {
            res.status(error instanceof Error?404:500).json({
                message:error.message
            })
        }
    }

    async deleteSeller(req,res){
        try {
            const existingSeller = req.seller
            const seller = await sellerService.deleteSeller(existingSeller._id);
            res.status(200).json({message:"Seller Account Deleted"})
        } catch (error) {
            res.status(error instanceof Error?404:500).json({
                message:error.message
            })
        }
    }


    async updateAccountStatus(req,res){
        try {
            const updateStatus = await sellerService.updateSellerstatus(
                req.params.id,
                req.params.status
            )
            res.status(200).json({message:"Seller Account status updated"})
            
        } catch (error) {
            res.status(error instanceof Error?404:500).json({
                message:error.message
            })
        }
    }

}
module.exports=new SellerController();
