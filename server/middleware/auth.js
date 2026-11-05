const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ message: 'Not authorised, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // tasks.js reads req.user.userId, so this name has to match
        req.user = { userId: decoded.userId, email: decoded.email };
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};