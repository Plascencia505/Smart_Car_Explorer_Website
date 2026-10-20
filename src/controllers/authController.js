// src/controllers/authController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";

export const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "El usuario o correo ya está registrado." });
    }

    // Cifrado de contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role,
    });
    await newUser.save();

    res.status(201).json({ message: "Usuario registrado exitosamente." });
  } catch (error) {
    res.status(500).json({ error: "Error interno al registrar el usuario." });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user)
      return res.status(401).json({ error: "Credenciales inválidas." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ error: "Credenciales inválidas." });

    // Creación de la sesión persistente en MongoDB
    req.session.userId = user._id;
    req.session.role = user.role;

    res
      .status(200)
      .json({ message: "Inicio de sesión exitoso.", role: user.role });
  } catch (error) {
    res.status(500).json({ error: "Error interno al iniciar sesión." });
  }
};

export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err)
      return res.status(500).json({ error: "Error al cerrar la sesión." });
    res.clearCookie("connect.sid"); // Nombre por defecto de la cookie
    res.status(200).json({ message: "Sesión finalizada correctamente." });
  });
};
