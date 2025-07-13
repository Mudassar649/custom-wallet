import mongoose from "mongoose";

const WalletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    userType: {
        type: String,
        enum: ["Advertiser", "ContentCreator"],
        required: true
    },
    available_coins: {
        type: Number,
        default: 0,
        min: 0
    },
    locked_coins: {
        type: Number,
        default: 0,
        min: 0
    },
    totalDepositUSD: {
        type: Number,
        default: 0
    },
}, { timestamps: true });

// Virtual for total coins
WalletSchema.virtual('total_coins').get(function() {
    return this.available_coins + this.locked_coins;
});

const Wallet = mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);
export default Wallet;