const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    codigo: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    photo: { type: String },
    aboutMe: {type: String}
});

module.exports = mongoose.model('User', userSchema);
