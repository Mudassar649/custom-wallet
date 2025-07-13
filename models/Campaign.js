// models/Campaign.js
import mongoose from "mongoose";

const CampaignSchema = new mongoose.Schema({
    advertiserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    requirements: {
        type: String,
        required: true
    },
    budget_per_creator: {
        type: Number,
        required: true,
        min: 1
    },
    max_creators: {
        type: Number,
        required: true,
        min: 1
    },
    selected_creators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    total_budget_locked: {
        type: Number,
        default: 0
    },
    deadline: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'paused', 'completed', 'cancelled'],
        default: 'active'
    },
    category: {
        type: String,
        required: true
    },
    platform: {
        type: String,
        enum: ['instagram', 'tiktok', 'both'],
        required: true
    }
}, { timestamps: true });

const Campaign = mongoose.models.Campaign || mongoose.model("Campaign", CampaignSchema);
export default Campaign;