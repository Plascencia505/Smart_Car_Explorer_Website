// src/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Formato de correo inválido']
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['Administrador', 'Usuario'], 
    required: true 
  }
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);