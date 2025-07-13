import Wallet  from '../models/Wallet.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const getWallet = async (req, res) => {
    try {
        const { userId } = req.user;
        
        const wallet = await Wallet.findOne({ userId }).populate('userId', 'name email role');
        
        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Wallet not found' });
        }
        
        res.json({
            success: true,
            wallet: {
                available_coins: wallet.available_coins,
                locked_coins: wallet.locked_coins,
                total_coins: wallet.available_coins + wallet.locked_coins,
                totalDepositUSD: wallet.totalDepositUSD
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createDepositIntent = async (req, res) => {
    try {
        const { userId } = req.user;
        const { amount, currency = 'usd', payment_method = 'card' } = req.body;
        
        if (!amount || amount < 1) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Create Stripe customer if not exists
        let stripeCustomerId = user.stripe_cutomer_id;
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: { userId: userId.toString() }
            });
            stripeCustomerId = customer.id;
            await User.findByIdAndUpdate(userId, { stripe_cutomer_id: stripeCustomerId });
        }
        
        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: currency,
            customer: stripeCustomerId,
            payment_method: 'pm_card_visa',
            payment_method_types: payment_method === 'pix' ? ['pix'] : ['card'],
            metadata: {
                userId: userId.toString(),
                type: 'wallet_deposit'
            }
        });

        console.log("paymentIntentId******", paymentIntent.id)
        console.log("paymentIntentEvent******", paymentIntent.status)
        
        
        // Create transaction record
        const transaction = new Transaction({
            userId,
            type: 'deposit',
            amount: amount,
            currency: 'USD',
            status: 'pending',
            stripe_payment_intent_id: paymentIntent.id,
            description: `Wallet deposit of $${amount}`
        });
        await transaction.save();
        
        res.json({
            success: true,
            client_secret: paymentIntent.client_secret,
            transaction_id: transaction._id
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const confirmDeposit = async (req, res) => {
    try {
        const { payment_intent_id } = req.body;

        await stripe.paymentIntents.confirm(payment_intent_id);
        
        const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

        console.log("payment status*********: ", paymentIntent.status)
        
        if (paymentIntent.status === 'succeeded') {
            const transaction = await Transaction.findOne({ stripe_payment_intent_id: payment_intent_id });
            
            if (!transaction) {
                return res.status(404).json({ success: false, message: 'Transaction not found' });
            }
            
            const wallet = await Wallet.findOne({ userId: transaction.userId });
            const depositAmount = paymentIntent.amount / 100; // Convert from cents
            
            // Update wallet - $1 = 1 coin
            wallet.available_coins += depositAmount;
            wallet.totalDepositUSD += depositAmount;
            await wallet.save();
            
            // Update transaction
            transaction.status = 'completed';
            transaction.stripe_transaction_id = paymentIntent?.id;
            await transaction.save();
            
            res.json({
                success: true,
                message: 'Deposit confirmed successfully',
                coins_added: depositAmount,
                new_balance: wallet.available_coins
            });
        } else {
            res.status(400).json({ success: false, message: 'Payment not completed' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};