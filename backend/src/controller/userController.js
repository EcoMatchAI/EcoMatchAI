const userServices = require("../services/userServices");
const jwtProvider = require("../util/jwtProvider");

class UserController {

    async getUserProfile(req, res) {
        try {
            const jwt = req.headers.authorization.split(" ")[1];
            if (!jwt) {
                return res.status(404).json({
                    message: "No auth token found"
                })
            }
            const user = await userServices.getUserProfile(jwt)
            res.status(200).json(user);
        }
        catch (err) {
            res.status(err instanceof Error ? 404 : 500).json({ message: err.message })
        }
    }

    async initiateSignup(req, res) {
        try {
            const init = await userServices.initiateSignup(req.body);
            res.status(200).json(init)
        } catch (error) {
            res.status(error instanceof Error ? 404 : 500).json({ message: error.message })
        }
    }

    async verifyEmailOtp(req, res) {
        try {
            let email = req.body?.email;
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                try {
                    const decodedEmail = jwtProvider.getEmailFromjwt(token);
                    if (decodedEmail) email = decodedEmail;
                } catch (e) {
                    // Fallback to req.body.email if token decoding fails
                }
            }
            if (!email) {
                return res.status(400).json({ message: "Verification token missing or invalid. Please sign up again." });
            }
            const verification = await userServices.verifyEmailOtp({ email, otp: req.body.otp });
            res.status(200).json(verification);
        } catch (error) {
            res.status(error instanceof Error ? 400 : 500).json({ message: error.message });
        }
    }

    async completeProfile(req, res) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const email = jwtProvider.getEmailFromjwt(token);
            const profile = await userServices.completeProfile(email, req.body);
            res.status(200).json(profile)
        } catch (error) {
            res.status(error instanceof Error ? 404 : 500).json({ message: error.message })
        }
    }

    async getAllUsers(req, res) {
        try {
            const status = req.query.status
            const users = await userServices.getAllUsers(status);
            res.status(200).json({ users })
        } catch (error) {
            res.status(error instanceof Error ? 404 : 500).json({
                message: error.message
            })
        }
    }

    async updateUser(req, res) {
        try {
            const existingUser = req.user
            const user = await userServices.updateUser(existingUser, req.body);
            res.status(200).json({ user })
        } catch (error) {
            res.status(error instanceof Error ? 404 : 500).json({
                message: error.message
            })
        }
    }

    async deleteUser(req, res) {
        try {
            const existingUser = req.user
            const user = await userServices.deleteUser(existingUser._id);
            res.status(200).json({ message: "User Account Deleted" })
        } catch (error) {
            res.status(error instanceof Error ? 404 : 500).json({
                message: error.message
            })
        }
    }

    async updateAccountStatus(req, res) {
        try {
            const updateStatus = await userServices.updateUserStatus(
                req.params.id,
                req.params.status
            )
            res.status(200).json({ message: "User Account status updated" })
        } catch (error) {
            res.status(error instanceof Error ? 404 : 500).json({
                message: error.message
            })
        }
    }

}
module.exports = new UserController();
