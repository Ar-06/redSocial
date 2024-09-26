const mongoose = require('mongoose');

const UserPostSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userPhoto: { type: String },
    text: String,
    image: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('UserPost', UserPostSchema);
