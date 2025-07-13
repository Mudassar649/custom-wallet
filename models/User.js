import mongoose from "mongoose";

const ROLES = ["advertiser", "content_creator", "super_admin"];

const { Schema, model } = mongoose;

const UserSchema = new Schema({
    name: {
      type: String,
      required: true,
    },
    photoUrl: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "user",
      enum: ROLES,
    },
     phone: {
      type: String,
      default: "",
    },
    password: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    timeZone: {
      type: String,
      default: "UTC",
    },
     bio: {
      type: String,
      default: "",
    },

    stripe_cutomer_id: {
      type: String
    },

    escrow: {
      email: { type: String, default: null },
      apiKey: { type: String, default: null },
      connected: { type: Boolean, default: false },
    },

    // 📌 Instagram connection
    instagram: {
      ig_user_id: { type: String, default: null },
      ig_access_token: { type: String, default: null },
      ig_access_token_expires: { type: Date, default: null },
      connected: { type: Boolean, default: false },
      profile_picture: { type: String, default: null },
      profile_name: { type: String, default: null },
      profile_bio: { type: String, default: null },
      profile_followers: { type: Number, default: 0 },
      profile_following: { type: Number, default: 0 },
      profile_posts: { type: Number, default: 0 },
    },

    // 📌 TikTok connection
    tiktok: {
      tiktok_user_id: { type: String, default: null },
      tiktok_access_token: { type: String, default: null },
      tiktok_refresh_token: { type: String, default: null },
      tiktok_access_token_expires: { type: Date, default: null },
      connected: { type: Boolean, default: false },

      // 🔄 Content posting tracking
      tiktok_publish_id: { type: String, default: null },
      tiktok_status_last_checked: { type: Date, default: null },
      tiktok_last_status: { type: String, enum: ["READY", "PROCESSING", "FAILED", null], default: null },

      // 📊 Public stats from TikTok profile
      profile_name: { type: String, default: null },
      profile_picture: { type: String, default: null },
      profile_bio: { type: String, default: null },
      profile_link: { type: String, default: null },
      profile_followers: { type: Number, default: 0 },
      profile_following: { type: Number, default: 0 },
      profile_verified: { type: Boolean, default: false },
      profile_posts: { type: Number, default: 0 },
      stats_last_updated: { type: Date, default: null },
      stats_likes: { type: Number, default: 0 },
    },

    melhorEnvio: {
      connected: { type: Boolean, default: false },
      access_token: String,
      refresh_token: String,
      token_created_at: Date,
      token_expires_in: Number // in seconds (typically 3600)
    },

     addresses: [{
      type: {
        type: String,
        enum: ["Home", "Office"],
        default: "Home",
      },
      country: String,
      state: String,
      city: String,
      zip: String,
      addressLine: String,
      addedAt: {
        type: Date,
        default: Date.now,
      },
    }],

     referenceContent: [{
      type: {
        type: String,
        enum: ["video", "image"],
        required: true,
      },
      url: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
    }]

}, { timestamps: true });

const User = model('User', UserSchema);
export default User;