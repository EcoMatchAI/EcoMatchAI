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

    async getMe(req, res) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({
                    success: false,
                    message: "Access token is missing or invalid."
                });
            }
            const token = authHeader.split(" ")[1];
            const result = await authServices.getMe(token);
            res.status(200).json(result);
        } catch (error) {
            res.status(401).json({
                success: false,
                message: error.message
            });
        }
    }

    async logout(req, res) {
        res.status(200).json({
            success: true,
            message: "Logged out successfully."
        });
    }

    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            const result = await authServices.forgotPassword(email);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async resetPassword(req, res) {
        try {
            const result = await authServices.resetPassword(req.body);
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