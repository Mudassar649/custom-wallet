import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }
        
        req.user = {
            userId: user._id,
            email: user.email,
            role: user.role
        };
        
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Invalid token' });
    }
};

// Middleware to check if user is advertiser
export const requireAdvertiser = (req, res, next) => {
    if (req.user.role !== 'advertiser') {
        return res.status(403).json({ success: false, message: 'Advertiser access required' });
    }
    next();
};

// Middleware to check if user is content creator
export const requireContentCreator = (req, res, next) => {
    if (req.user.role !== 'content_creator') {
        return res.status(403).json({ success: false, message: 'Content creator access required' });
    }
    next();
};