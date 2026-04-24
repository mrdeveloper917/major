const express = require("express");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { deleteUserByAdmin } = require("../controllers/admin.controller");

const router = express.Router();

router.delete("/delete-user/:id", authenticate, requireAdmin, deleteUserByAdmin);

module.exports = router;
