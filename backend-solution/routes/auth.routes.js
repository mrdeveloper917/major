const express = require("express");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router.post("/register", upload.single("image"), authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-otp", authController.verifyOtp);
router.post("/reset-password", authController.resetPassword);
router.get("/me", authenticate, authController.me);
router.get("/chat-contacts", authenticate, authController.getChatContacts);
router.put("/update-profile", authenticate, upload.single("image"), authController.updateProfile);
router.put("/change-password", authenticate, authController.changePassword);

module.exports = router;
