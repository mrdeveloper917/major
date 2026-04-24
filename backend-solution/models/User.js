const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["admin", "student"],
      default: "student",
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
    },
    hostelName: {
      type: String,
      default: "",
    },
    roomNumber: {
      type: String,
      default: "",
    },
    floorNumber: {
      type: String,
      default: "",
    },
    branch: {
      type: String,
      default: "",
    },
    course: {
      type: String,
      default: "",
    },
    profileImage: {
      type: String,
      default: "",
    },
    resetOTP: {
      type: String,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function savePassword(next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
