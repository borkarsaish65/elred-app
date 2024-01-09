const jwt = require('jsonwebtoken');
let jwtSecret = process.env.jwtSecret;

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const tokenInHeader = req.header('Authorization');
  
    if (!tokenInHeader) return res.status(401).json({ error: 'Access denied' });
    
    const bearer = 'Bearer ';
    const token = tokenInHeader.replace(bearer, '');

    jwt.verify(token, jwtSecret, (err, user) => {
      if (err) return res.status(403).json({ error: 'Invalid token' });
  
      req.user = user;
      console.log(user,'<--')
      next();
    });
  };



module.exports = authenticateToken;