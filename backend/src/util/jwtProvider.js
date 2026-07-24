const jwt = require("jsonwebtoken")
require("dotenv").config();

class JwtProvider{
    createJwt(payload){
        return jwt.sign(payload,process.env.JWT_KEY,{expiresIn:'24h'})
    }
    getEmailFromjwt(token){
        try{
            const decodedToken = jwt.verify(token,process.env.JWT_KEY);
            return decodedToken.email 
        }catch(err){
            throw new Error("Invalid token, please re-login");
        }
    }

    verifyjwt(token){
        try{
            return jwt.verify(token,process.env.JWT_KEY);
        }catch(err){
            throw new Error("Invalid token");

        }
    }
}

module.exports = new JwtProvider(); 