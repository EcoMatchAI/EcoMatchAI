const User = require('../model/user');
const jwtProvider = require('../util/jwtProvider');
const accountStatus = require('../domain/accountStatus');
const { model } = require('mongoose');



const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({message:"Auth token is unavailable"})
        }
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({message:"Authentication token missing"})
        }

        const decoded = jwtProvider.verifyjwt(token);

        const user = await User.findById(decoded.userId || decoded.id).select('-password -passwordResetToken -passwordResetExpires');

        if (!user) {
            return res.status(401).json({message:"The user belonging to this token no longer exists"})
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({message:'Invalid or expired authentication token. Please log in again.'});
    }
};


module.exports = authenticate;