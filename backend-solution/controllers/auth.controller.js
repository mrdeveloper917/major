const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const PasswordResetOtp = require("../models/PasswordResetOtp");
const generateOtp = require("../utils/generateOtp");
const sendMail = require("../utils/sendMail");

const signToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
const normalizeRole = (value, fallback = "student") => {
  const role = String(value || "")
    .trim()
    .toLowerCase();

  return role === "admin" || role === "student" ? role : fallback;
};

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: normalizeRole(user.role),
  phone: user.phone,
  hostelName: user.hostelName,
  roomNumber: user.roomNumber,
  floorNumber: user.floorNumber,
  branch: user.branch,
  course: user.course,
  profileImage: user.profileImage,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, hostelName, roomNumber, floorNumber, branch, course } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    const profileImage = req.file ? `/uploads/${req.file.filename}` : "";

    const user = await User.create({
      name,
      email,
      password,
      role: normalizeRole(role),
      phone,
      hostelName,
      roomNumber,
      floorNumber,
      branch,
      course,
      profileImage,
    });

    return res.status(201).json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Registration failed", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken(user._id);
    return res.status(200).json({ success: true, token, user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Login failed", error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const update = { ...req.body };
    update.role = normalizeRole(update.role, req.user?.role || "student");

    if (req.file) {
      update.profileImage = `/uploads/${req.file.filename}`;
    }

    delete update.password;
    delete update.resetOTP;
    delete update.otpExpiry;

    const user = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Profile update failed", error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new passwords are required" });
    }

    const user = await User.findById(req.user._id);
    const matches = await user.comparePassword(currentPassword);
    if (!matches) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    user.password = newPassword;
    user.resetOTP = null;
    user.otpExpiry = null;
    await user.save();

    return res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Password change failed", error: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const otp = generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    user.resetOTP = otp;
    user.otpExpiry = expiry;
    await user.save();

    await PasswordResetOtp.deleteMany({ userId: user._id });
    await PasswordResetOtp.create({
      userId: user._id,
      email: user.email,
      otp,
      expiresAt: expiry,
    });

    await sendMail({
      to: user.email,
      subject: "Smart Hostel password reset OTP",
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
      html: `<p>Your OTP is <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`,
    });

    return res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to send OTP", error: error.message });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user || !user.resetOTP || !user.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP request not found" });
    }

    if (user.resetOTP !== otp || user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: "OTP is invalid or expired" });
    }

    await PasswordResetOtp.findOneAndUpdate(
      { userId: user._id, otp },
      { verified: true },
      { new: true }
    );

    return res.status(200).json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "OTP verification failed", error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Email, OTP, and new password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.resetOTP !== otp || user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: "OTP is invalid or expired" });
    }

    const otpRecord = await PasswordResetOtp.findOne({ userId: user._id, otp, verified: true });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "OTP must be verified before resetting password" });
    }

    user.password = newPassword;
    user.resetOTP = null;
    user.otpExpiry = null;
    await user.save();
    await PasswordResetOtp.deleteMany({ userId: user._id });

    return res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Password reset failed", error: error.message });
  }
};

const me = async (req, res) => {
  return res.status(200).json({ success: true, user: req.user });
};

const getChatContacts = async (req, res) => {
  try {
    const currentRole = normalizeRole(req.user?.role);
    const preferredRole = normalizeRole(
      req.query.role,
      currentRole === "student" ? "admin" : "student"
    );

    const contacts = await User.find({
      _id: { $ne: req.user._id },
      role: { $regex: `^${preferredRole}$`, $options: "i" },
    })
      .select("name email role profileImage hostelName roomNumber")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      contacts: contacts.map((contact) => ({
        ...contact.toObject(),
        role: normalizeRole(contact.role),
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load chat contacts",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
  me,
  getChatContacts,
};
