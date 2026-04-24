const mongoose = require("mongoose");
const User = require("../models/User");
const Complaint = require("../models/Complaint");
const Leave = require("../models/Leave");
const Room = require("../models/Room");

const deleteUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Admin accounts cannot be deleted from this endpoint",
      });
    }

    await Promise.all([
      Complaint.deleteMany({ student: user._id }),
      Leave.deleteMany({ student: user._id }),
      Room.updateMany(
        { occupants: user._id },
        {
          $pull: { occupants: user._id },
        }
      ),
      user.deleteOne(),
    ]);

    return res.status(200).json({
      success: true,
      message: "Student removed successfully",
      deletedUserId: id,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

module.exports = {
  deleteUserByAdmin,
};
