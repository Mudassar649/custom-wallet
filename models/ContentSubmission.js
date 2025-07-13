// models/ContentSubmission.js
import mongoose from "mongoose";

const ContentSubmissionSchema = new mongoose.Schema({
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
    content_url: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['submitted', 'approved', 'rejected', 'revision_requested'],
        default: 'submitted'
    },
    advertiser_feedback: {
        type: String
    },
    submitted_at: {
        type: Date,
        default: Date.now
    },
    reviewed_at: {
        type: Date
    },
    amount_paid: {
        type: Number,
        default: 0
    },
    admin_fee: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const ContentSubmission = mongoose.models.ContentSubmission || mongoose.model("ContentSubmission", ContentSubmissionSchema);
export default ContentSubmission;