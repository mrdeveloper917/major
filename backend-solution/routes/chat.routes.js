const express = require("express");
const { authenticate } = require("../middleware/auth");
const chatController = require("../controllers/chat.controller");

const router = express.Router();

router.post("/send", authenticate, chatController.sendMessage);
router.get("/shared", authenticate, chatController.getMessages);

module.exports = router;
