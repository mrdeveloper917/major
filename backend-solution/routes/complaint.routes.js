const express = require("express");
const { authenticate, requireAdmin } = require("../middleware/auth");
const {
  updateComplaintStatus,
  deleteComplaintByAdmin,
} = require("../controllers/complaint.controller");

const router = express.Router();

router.put("/:id", authenticate, requireAdmin, updateComplaintStatus);
router.delete("/:id", authenticate, requireAdmin, deleteComplaintByAdmin);

module.exports = router;
