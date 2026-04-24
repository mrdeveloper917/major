import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import axios from "axios";
import Toast from "react-native-toast-message";
import { AUTH_API_URL } from "../../config/api";
import { getPasswordStrength, validateEmail } from "../../utils/validation";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function ForgotPassword({ navigation }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifiedOtp, setVerifiedOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const inputRefs = useRef([]);

  const otpValue = otp.join("");
  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  useEffect(() => {
    if (!secondsLeft) return undefined;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const showToast = (type, text1, text2) =>
    Toast.show({
      type,
      text1,
      text2,
    });

  const sendOtp = async () => {
    if (!validateEmail(email)) {
      showToast("error", "Invalid email", "Enter your registered email address.");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${AUTH_API_URL}/forgot-password`, { email: email.trim() });
      setStep(2);
      setSecondsLeft(RESEND_SECONDS);
      showToast("success", "OTP sent", "Check your email for the 6-digit code.");
    } catch (error) {
      showToast(
        "error",
        "Unable to send OTP",
        error?.response?.data?.message || "Please try again in a moment."
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otpValue.length !== OTP_LENGTH) {
      showToast("error", "OTP incomplete", "Please enter the full 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${AUTH_API_URL}/verify-otp`, {
        email: email.trim(),
        otp: otpValue,
      });
      setVerifiedOtp(otpValue);
      setStep(3);
      showToast("success", "OTP verified", "You can now create a new password.");
    } catch (error) {
      showToast(
        "error",
        "Verification failed",
        error?.response?.data?.message || "OTP is invalid or expired."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (password !== confirmPassword) {
      showToast("error", "Passwords do not match", "Please re-enter the same password.");
      return;
    }

    if (passwordStrength.score < 4) {
      showToast("error", "Weak password", "Use at least 8 characters with mixed types.");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${AUTH_API_URL}/reset-password`, {
        email: email.trim(),
        otp: verifiedOtp,
        newPassword: password,
      });
      setStep(4);
    } catch (error) {
      showToast(
        "error",
        "Reset failed",
        error?.response?.data?.message || "Unable to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value, index) => {
    const sanitized = value.replace(/\D/g, "").slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = sanitized;
    setOtp(nextOtp);

    if (sanitized && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (event, index) => {
    if (event.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={["#082F49", "#0F172A", "#111827"]}
            style={styles.heroCard}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={18} color="#E2E8F0" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>Forgot password</Text>
            <Text style={styles.heroSubtitle}>
              Recover account access with secure OTP verification and a guided password reset flow.
            </Text>
            <View style={styles.stepRow}>
              {[1, 2, 3, 4].map((item) => (
                <View
                  key={item}
                  style={[styles.stepDot, item <= step && styles.stepDotActive]}
                />
              ))}
            </View>
          </LinearGradient>

          <View style={styles.card}>
            {step === 1 ? (
              <>
                <Text style={styles.cardTitle}>Step 1. Enter email</Text>
                <Text style={styles.cardSubtitle}>
                  We will send a 6-digit OTP to your registered email.
                </Text>
                <InputField
                  icon="mail-outline"
                  placeholder="Email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <PrimaryButton label="Send OTP" loading={loading} onPress={sendOtp} />
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Text style={styles.cardTitle}>Step 2. Verify OTP</Text>
                <Text style={styles.cardSubtitle}>
                  Enter the code sent to {email.trim()}.
                </Text>
                <View style={styles.otpRow}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={`otp-${index}`}
                      ref={(ref) => {
                        inputRefs.current[index] = ref;
                      }}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value, index)}
                      onKeyPress={(event) => handleOtpKeyPress(event, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      style={styles.otpInput}
                      placeholder="0"
                      placeholderTextColor="#475569"
                    />
                  ))}
                </View>
                <PrimaryButton label="Verify OTP" loading={loading} onPress={verifyOtp} />
                <TouchableOpacity
                  style={styles.secondaryAction}
                  disabled={secondsLeft > 0 || loading}
                  onPress={sendOtp}
                >
                  <Text style={styles.secondaryActionText}>
                    {secondsLeft > 0
                      ? `Resend OTP in ${secondsLeft}s`
                      : "Resend OTP"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <Text style={styles.cardTitle}>Step 3. Create new password</Text>
                <Text style={styles.cardSubtitle}>
                  Use a stronger password than your previous one.
                </Text>
                <InputField
                  icon="lock-closed-outline"
                  placeholder="New password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                  onRightPress={() => setShowPassword((prev) => !prev)}
                />
                <View style={styles.strengthWrap}>
                  <View style={styles.strengthTrack}>
                    <View
                      style={[
                        styles.strengthFill,
                        {
                          width: `${(passwordStrength.score / 5) * 100}%`,
                          backgroundColor: passwordStrength.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.label}
                  </Text>
                </View>
                <InputField
                  icon="shield-checkmark-outline"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  rightIcon={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  onRightPress={() => setShowConfirmPassword((prev) => !prev)}
                />
                <PrimaryButton
                  label="Reset Password"
                  loading={loading}
                  onPress={resetPassword}
                />
              </>
            ) : null}

            {step === 4 ? (
              <View style={styles.successWrap}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark" size={34} color="#FFFFFF" />
                </View>
                <Text style={styles.cardTitle}>Password updated</Text>
                <Text style={[styles.cardSubtitle, styles.centerText]}>
                  Your password has been reset successfully. You can now sign in with the new password.
                </Text>
                <PrimaryButton
                  label="Back to Login"
                  loading={false}
                  onPress={() => navigation.replace("Login")}
                />
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({ icon, rightIcon, onRightPress, ...props }) {
  return (
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={18} color="#7DD3FC" />
      <TextInput placeholderTextColor="#94A3B8" style={styles.input} {...props} />
      {rightIcon ? (
        <TouchableOpacity onPress={onRightPress}>
          <Ionicons name={rightIcon} size={18} color="#94A3B8" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function PrimaryButton({ label, loading, onPress }) {
  return (
    <TouchableOpacity style={styles.primaryButton} onPress={onPress} disabled={loading}>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <Text style={styles.primaryButtonText}>{label}</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 18,
    justifyContent: "center",
  },
  heroCard: {
    borderRadius: 30,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.14)",
    marginBottom: 18,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 18,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "#CBD5E1",
    lineHeight: 21,
    marginTop: 10,
  },
  stepRow: {
    flexDirection: "row",
    marginTop: 22,
  },
  stepDot: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginRight: 8,
  },
  stepDotActive: {
    backgroundColor: "#38BDF8",
  },
  card: {
    backgroundColor: "#0F172A",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  cardSubtitle: {
    color: "#94A3B8",
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 20,
  },
  centerText: {
    textAlign: "center",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#08131F",
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
    marginBottom: 14,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    paddingVertical: 16,
    marginLeft: 10,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  otpInput: {
    width: 46,
    height: 56,
    borderRadius: 16,
    textAlign: "center",
    backgroundColor: "#08131F",
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  primaryButton: {
    backgroundColor: "#0EA5E9",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
    marginRight: 8,
  },
  secondaryAction: {
    alignItems: "center",
    marginTop: 14,
  },
  secondaryActionText: {
    color: "#7DD3FC",
    fontWeight: "700",
  },
  strengthWrap: {
    marginTop: -2,
    marginBottom: 14,
  },
  strengthTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#1E293B",
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 999,
  },
  strengthText: {
    marginTop: 8,
    fontWeight: "700",
  },
  successWrap: {
    alignItems: "center",
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
});
