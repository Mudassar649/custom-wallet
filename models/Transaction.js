// models/Transaction.js
import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'campaign_lock', 'campaign_unlock', 'payment_sent', 'payment_received', 'refund', 'admin_fee'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        enum: ['USD', 'coins'],
        default: 'coins'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    stripe_payment_intent_id: {
        type: String
    },
    stripe_transaction_id: {
        type: String
    },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign'
    },
    contentSubmissionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ContentSubmission'
    },
    description: {
        type: String,
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, { timestamps: true });

const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);
export default Transaction;