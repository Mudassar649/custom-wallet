// controllers/campaignController.js
import Campaign from '../models/Campaign.js';
import CampaignApplication from '../models/CampaignApplication.js';
import ContentSubmission from '../models/ContentSubmission.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/rransaction.js';
import mongoose from 'mongoose';

export const createCampaign = async(req, res) => {
    try {
        const { userId } = req.user;
        const { title, description, requirements, budget_per_creator, max_creators, deadline, category, platform } = req.body;
        
        const totalBudget = budget_per_creator * max_creators;
        
        // Check if advertiser has sufficient balance
        const wallet = await Wallet.findOne({ userId });
        if (!wallet || wallet.available_coins < totalBudget) {
            return res.status(400).json({ 
                success: false, 
                message: 'Insufficient balance. Required: ' + totalBudget + ' coins' 
            });
        }

        const campaign = new Campaign({
            advertiserId: userId,
            title,
            description,
            requirements,
            budget_per_creator,
            max_creators,
            deadline: new Date(deadline),
            category,
            platform
        });
        
        await campaign.save();
        
        res.status(201).json({
            success: true,
            message: 'Campaign created successfully',
            campaign
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export const getCampaigns = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, platform, status = 'active' } = req.query;
        
        const filter = { status };
        if (category) filter.category = category;
        if (platform) filter.platform = platform;
        
        const campaigns = await Campaign.find(filter)
            .populate('advertiserId', 'name photoUrl')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        
        const total = await Campaign.countDocuments(filter);
        
        res.json({
            success: true,
            campaigns,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const applyCampaign = async (req, res) => {
    try {
        const { userId } = req.user;
        const { campaignId } = req.params;
        const { proposal, expected_delivery_date } = req.body;
        
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }
        
        if (campaign.selected_creators.length >= campaign.max_creators) {
            return res.status(400).json({ success: false, message: 'Campaign is full' });
        }
        
        // Check if already applied
        const existingApplication = await CampaignApplication.findOne({
            campaignId,
            contentCreatorId: userId
        });
        
        if (existingApplication) {
            return res.status(400).json({ success: false, message: 'Already applied to this campaign' });
        }
        
        const application = new CampaignApplication({
            campaignId,
            contentCreatorId: userId,
            proposal,
            expected_delivery_date: new Date(expected_delivery_date)
        });
        
        await application.save();
        
        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            application
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getCampaignApplications = async (req, res) => {
    try {
        const { userId } = req.user;
        const { campaignId } = req.params;
        
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }
        
        if (campaign.advertiserId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        
        const applications = await CampaignApplication.find({ campaignId })
            .populate('contentCreatorId', 'name photoUrl instagram tiktok')
            .sort({ applied_at: -1 });
        
        res.json({
            success: true,
            applications
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const respondToApplication = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { userId } = req.user;
        const { applicationId } = req.params;
        const { status } = req.body; // 'accepted' or 'rejected'
        
        const application = await CampaignApplication.findById(applicationId).session(session);
        if (!application) {
            throw new Error('Application not found');
        }
        
        const campaign = await Campaign.findById(application.campaignId).session(session);
        if (campaign.advertiserId.toString() !== userId.toString()) {
            throw new Error('Access denied');
        }
        
        if (status === 'accepted') {
            // Check if campaign is not full
            if (campaign.selected_creators.length >= campaign.max_creators) {
                throw new Error('Campaign is full');
            }
            
            // Lock budget for this creator
            const wallet = await Wallet.findOne({ userId }).session(session);
            if (wallet.available_coins < campaign.budget_per_creator) {
                throw new Error('Insufficient balance');
            }
            
            // Update wallet
            wallet.available_coins -= campaign.budget_per_creator;
            wallet.locked_coins += campaign.budget_per_creator;
            await wallet.save({ session });
            
            // Update campaign
            campaign.selected_creators.push(application.contentCreatorId);
            campaign.total_budget_locked += campaign.budget_per_creator;
            await campaign.save({ session });
            
            // Create transaction record
            const transaction = new Transaction({
                userId,
                type: 'campaign_lock',
                amount: campaign.budget_per_creator,
                currency: 'coins',
                status: 'completed',
                campaignId: campaign._id,
                description: `Budget locked for campaign: ${campaign.title}`
            });
            await transaction.save({ session });
        }
        
        // Update application
        application.status = status;
        application.responded_at = new Date();
        await application.save({ session });
        
        await session.commitTransaction();
        
        res.json({
            success: true,
            message: `Application ${status} successfully`,
            application
        });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

export const submitContent = async (req, res) => {
    try {
        const { userId } = req.user;
        const { campaignId } = req.params;
        const { content_url, description } = req.body;
        
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }
        
        if (!campaign.selected_creators.includes(userId)) {
            return res.status(403).json({ success: false, message: 'Not selected for this campaign' });
        }
        
        // Check if already submitted
        const existingSubmission = await ContentSubmission.findOne({
            campaignId,
            contentCreatorId: userId
        });
        
        if (existingSubmission) {
            return res.status(400).json({ success: false, message: 'Content already submitted' });
        }
        
        const submission = new ContentSubmission({
            campaignId,
            contentCreatorId: userId,
            content_url,
            description
        });
        
        await submission.save();
        
        res.status(201).json({
            success: true,
            message: 'Content submitted successfully',
            submission
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const reviewContent = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { userId } = req.user;
        const { submissionId } = req.params;
        const { status, feedback } = req.body; // 'approved' or 'rejected'
        
        const submission = await ContentSubmission.findById(submissionId).session(session);
        if (!submission) {
            throw new Error('Submission not found');
        }
        
        const campaign = await Campaign.findById(submission.campaignId).session(session);
        if (campaign.advertiserId.toString() !== userId.toString()) {
            throw new Error('Access denied');
        }
        
        const advertiserWallet = await Wallet.findOne({ userId }).session(session);
        const creatorWallet = await Wallet.findOne({ userId: submission.contentCreatorId }).session(session);
        
        if (status === 'approved') {
            // Calculate payments
            const totalAmount = campaign.budget_per_creator;
            const adminFeePercent = 0.20; // 20%
            const adminFee = totalAmount * adminFeePercent;
            const creatorPayment = totalAmount - adminFee;
            
            // Update wallets
            advertiserWallet.locked_coins -= totalAmount;
            creatorWallet.available_coins += creatorPayment;
            
            await advertiserWallet.save({ session });
            await creatorWallet.save({ session });
            
            // Update submission
            submission.amount_paid = creatorPayment;
            submission.admin_fee = adminFee;
            
            // Create transactions
            const creatorTransaction = new Transaction({
                userId: submission.contentCreatorId,
                type: 'payment_received',
                amount: creatorPayment,
                currency: 'coins',
                status: 'completed',
                campaignId: campaign._id,
                contentSubmissionId: submission._id,
                description: `Payment received for campaign: ${campaign.title}`
            });
            
            const adminTransaction = new Transaction({
                userId: campaign.advertiserId,
                type: 'admin_fee',
                amount: adminFee,
                currency: 'coins',
                status: 'completed',
                campaignId: campaign._id,
                contentSubmissionId: submission._id,
                description: `Admin fee for campaign: ${campaign.title}`
            });
            
            await creatorTransaction.save({ session });
            await adminTransaction.save({ session });
            
        } else if (status === 'rejected') {
            // Refund to advertiser
            advertiserWallet.locked_coins -= campaign.budget_per_creator;
            advertiserWallet.available_coins += campaign.budget_per_creator;
            await advertiserWallet.save({ session });
            
            // Update campaign
            campaign.selected_creators = campaign.selected_creators.filter(
                id => id.toString() !== submission.contentCreatorId.toString()
            );
            campaign.total_budget_locked -= campaign.budget_per_creator;
            await campaign.save({ session });
            
            // Create refund transaction
            const refundTransaction = new Transaction({
                userId,
                type: 'refund',
                amount: campaign.budget_per_creator,
                currency: 'coins',
                status: 'completed',
                campaignId: campaign._id,
                contentSubmissionId: submission._id,
                description: `Refund for rejected content: ${campaign.title}`
            });
            await refundTransaction.save({ session });
        }
        
        // Update submission
        submission.status = status;
        submission.advertiser_feedback = feedback;
        submission.reviewed_at = new Date();
        await submission.save({ session });
        
        await session.commitTransaction();
        
        res.json({
            success: true,
            message: `Content ${status} successfully`,
            submission
        });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};