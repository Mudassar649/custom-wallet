// models/CampaignApplication.js
import mongoose from "mongoose";

const CampaignApplicationSchema = new mongoose.Schema({
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: true
    },
    contentCreatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    proposal: {
        type: String,
        required: true
    },
    expected_delivery_date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    applied_at: {
        type: Date,
        default: Date.now
    },
    responded_at: {
        type: Date
    }
}, { timestamps: true });

// Prevent duplicate applications
CampaignApplicationSchema.index({ campaignId: 1, contentCreatorId: 1 }, { unique: true });

const CampaignApplication = mongoose.models.CampaignApplication || mongoose.model("CampaignApplication", CampaignApplicationSchema);
export default CampaignApplication;