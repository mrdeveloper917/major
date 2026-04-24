const express = require("express");
const { authenticate } = require("../middleware/auth");
const { sendMessage, getMessages } = require("../controllers/message.controller");

const router = express.Router();

router.post("/send-shared", authenticate, sendMessage);
router.get("/shared", authenticate, getMessages);
router.post("/send", authenticate, sendMessage);
router.get("/:receiverId", authenticate, getMessages);

module.exports = router;
