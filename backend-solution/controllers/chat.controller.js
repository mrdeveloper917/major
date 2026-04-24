const Message = require("../models/Message");

const normalizeRole = (value) => String(value || "").trim().toLowerCase();

const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!String(message || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const senderRole = normalizeRole(req.user?.role);
    if (senderRole !== "admin" && senderRole !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only admin and students can use chat",
      });
    }

    const createdMessage = await Message.create({
      senderId: req.user._id,
      receiverId: null,
      message: String(message).trim(),
      chatType: "shared",
    });

    const savedMessage = await Message.findById(createdMessage._id)
      .populate("senderId", "name role profileImage");

    const io = req.app.get("io");
    if (io) {
      io.emit("chat:message", savedMessage);
    }

    return res.status(201).json({
      success: true,
      message: savedMessage,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const currentRole = normalizeRole(req.user?.role);
    if (currentRole !== "admin" && currentRole !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only admin and students can use chat",
      });
    }

    const messages = await Message.find({
      chatType: "shared",
    })
      .sort({ createdAt: 1, _id: 1 })
      .populate("senderId", "name role profileImage");

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch chat messages",
      error: error.message,
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
};
