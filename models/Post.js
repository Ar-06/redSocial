const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    user: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const postSchema = new mongoose.Schema({
    user: { type: String, required: true },
    text: { type: String, required: true },
    image: { type: String },
    photo:  { type: String },
    category: { type: String, default: 'General' },
    comments: [commentSchema], // Añadir campo para los comentarios
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
