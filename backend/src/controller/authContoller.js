const authServices = require("../services/authServices");

class AuthController {
    
    async login(req, res) {
        try {
            const result = await authServices.loginUser(req.body);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new AuthController();