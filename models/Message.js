const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    user: { type: String, required: true },
    text: { type: String },
    audio: { type: String },
    type: { type: String, enum: ['text', 'audio'], required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);
