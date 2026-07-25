const buyer=require("../model/buyer");
const buyerServices=require("../services/buyerServices");
const jwtProvider=require("../util/jwtProvider");
class buyerController{

    async getBuyerProfile(req,res){
        try{
            const jwt = req.headers.authorization.split(" ")[1];
            if (!jwt){
                res.status(404).json({
                    message:"No auth token found"
                })
            }
            const buyer =  await buyerService.getbuyerProfile(jwt)
            res.status(200).json(buyer);
        }
        catch(err){
            res.status(err instanceof Error? 404:500).json({message:err.message})
        }
    }

    async createBuyer(req,res){
        try {
            const buyer = await buyerService.createBuyer(req.body);
            res.status(200).json({message:"Buyer Created Successfully"});
        } catch (error) {
            res.status(error instanceof Error?404:500).json({
                message:error.message
            })
            
        }
    }

    async getAllBuyer(req,res){
        try {
            const status = req.query.status
            const sellers = await buyerService.getAllBuyer(status);
            res.status(200).json({sellers})
        } catch (error) {
            res.status(error instanceof Error?404:500).json({
                message:error.message
            })
        }
    }

    async updateBuyer(req,res){
        try {
            const existingBuyer = req.buyer
            const buyer = await buyerService.updatebuyer(existingBuyer,req.body);
            res.status(200).json({buyer})
        } catch (error) {
            res.status(error instanceof Error?404:500).json({
                message:error.message
            })
        }
    }

    async deleteBuyer(req,res){
        try {
            const existingBuyer = req.buyer
            const buyer = await buyerService.deleteBuyer(existingBuyer._id);
            res.status(200).json({message:"Buyer Account Deleted"})
        } catch (error) {
            res.status(error instanceof Error?404:500).json({
                message:error.message
            })
        }
    }


    async updateBuyerStatus(req,res){
        try {
            const updateStatus = await buyerService.updateBuyerstatus(
                req.params.id,
                req.params.status
            )
            res.status(200).json({message:"buyer Account status updated"})
            
        } catch (error) {
            res.status(error instanceof Error?404:500).json({
                message:error.message
            })
        }
    }

}
module.exports=new buyerController();
