import React, { useMemo, useState } from "react";
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
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api";
import { getPasswordStrength } from "../../utils/validation";

export default function ChangePassword() {
  const navigation = useNavigation();
  const { token } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  const showToast = (type, text1, text2) => {
    Toast.show({ type, text1, text2 });
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("error", "Missing fields", "Please complete all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("error", "Passwords do not match", "Confirm the new password correctly.");
      return;
    }

    if (strength.score < 4) {
      showToast("error", "Weak password", "Use at least 8 characters with mixed types.");
      return;
    }

    try {
      setLoading(true);

      await axios.put(
        `${API_URL}/auth/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast("success", "Password changed", "Your password has been updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      navigation.goBack();
    } catch (error) {
      showToast(
        "error",
        "Update failed",
        error?.response?.data?.message || "Unable to change password."
      );
    } finally {
      setLoading(false);
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
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={["#111827", "#0F172A", "#020617"]}
            style={styles.heroCard}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={18} color="#E2E8F0" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>Change password</Text>
            <Text style={styles.heroSubtitle}>
              Secure your account with a stronger password and clear validation feedback.
            </Text>
          </LinearGradient>

          <View style={styles.card}>
            <PasswordField
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrent}
              visible={showCurrent}
              onToggle={() => setShowCurrent((prev) => !prev)}
            />
            <PasswordField
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
              visible={showNew}
              onToggle={() => setShowNew((prev) => !prev)}
            />
            <View style={styles.strengthCard}>
              <View style={styles.strengthTrack}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: `${(strength.score / 5) * 100}%`,
                      backgroundColor: strength.color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.strengthText, { color: strength.color }]}>
                {strength.label}
              </Text>
            </View>
            <PasswordField
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              visible={showConfirm}
              onToggle={() => setShowConfirm((prev) => !prev)}
            />
            {confirmPassword && newPassword !== confirmPassword ? (
              <Text style={styles.validationText}>Passwords do not match yet.</Text>
            ) : null}

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.saveButtonText}>Update Password</Text>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  secureTextEntry,
  visible,
  onToggle,
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="lock-closed-outline" size={18} color="#7DD3FC" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={label}
          placeholderTextColor="#64748B"
          secureTextEntry={secureTextEntry}
          style={styles.input}
        />
        <TouchableOpacity onPress={onToggle}>
          <Ionicons
            name={visible ? "eye-outline" : "eye-off-outline"}
            size={18}
            color="#94A3B8"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  container: {
    padding: 18,
    justifyContent: "center",
    flexGrow: 1,
  },
  heroCard: {
    borderRadius: 30,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
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
    marginTop: 8,
    lineHeight: 21,
  },
  card: {
    backgroundColor: "#0F172A",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: "#CBD5E1",
    marginBottom: 8,
    fontWeight: "700",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#08131F",
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    paddingVertical: 16,
    marginLeft: 10,
  },
  strengthCard: {
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
  validationText: {
    color: "#FCA5A5",
    marginTop: -4,
    marginBottom: 14,
  },
  saveButton: {
    backgroundColor: "#0EA5E9",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 4,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginRight: 8,
  },
});
