import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export const registerUser = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { name, email, password, role, phone, timeZone, bio } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email }).session(session);
        if (existingUser) {
            throw new Error('User already exists with this email');
        }
        
        // Validate role
        if (!['advertiser', 'content_creator'].includes(role)) {
            throw new Error('Invalid role. Must be either advertiser or content_creator');
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role,
            phone: phone || '',
            timeZone: timeZone || 'UTC',
            bio: bio || ''
        });
        
        await user.save({ session });
        
        // Create wallet automatically
        const userType = role === 'advertiser' ? 'Advertiser' : 'ContentCreator';
        const wallet = new Wallet({
            userId: user._id,
            userType,
            available_coins: 0,
            locked_coins: 0,
            totalDepositUSD: 0
        });
        
        await wallet.save({ session });
        
        await session.commitTransaction();
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                timeZone: user.timeZone,
                bio: user.bio
            },
            wallet: {
                available_coins: wallet.available_coins,
                locked_coins: wallet.locked_coins,
                total_coins: wallet.available_coins + wallet.locked_coins,
                totalDepositUSD: wallet.totalDepositUSD
            },
            token
        });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};


export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        // Get wallet
        const wallet = await Wallet.findOne({ userId: user._id });
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                timeZone: user.timeZone,
                bio: user.bio,
                photoUrl: user.photoUrl
            },
            wallet: wallet ? {
                available_coins: wallet.available_coins,
                locked_coins: wallet.locked_coins,
                total_coins: wallet.available_coins + wallet.locked_coins,
                totalDepositUSD: wallet.totalDepositUSD
            } : null,
            token
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.user;
        
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const wallet = await Wallet.findOne({ userId });
        
        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                timeZone: user.timeZone,
                bio: user.bio,
                photoUrl: user.photoUrl,
                instagram: user.instagram,
                tiktok: user.tiktok,
                addresses: user.addresses,
                referenceContent: user.referenceContent
            },
            wallet: wallet ? {
                available_coins: wallet.available_coins,
                locked_coins: wallet.locked_coins,
                total_coins: wallet.available_coins + wallet.locked_coins,
                totalDepositUSD: wallet.totalDepositUSD
            } : null
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const { userId } = req.user;
        const { name, phone, timeZone, bio, photoUrl } = req.body;
        
        const user = await User.findByIdAndUpdate(
            userId,
            { name, phone, timeZone, bio, photoUrl },
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                timeZone: user.timeZone,
                bio: user.bio,
                photoUrl: user.photoUrl
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};