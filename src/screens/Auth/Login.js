import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { useAuth } from "../../context/AuthContext";
import { validateEmail } from "../../utils/validation";

export default function Login() {
  const navigation = useNavigation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const formReady = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0,
    [email, password]
  );

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({
        type: "error",
        text1: "Missing fields",
        text2: "Please enter email and password.",
      });
      return;
    }

    if (!validateEmail(email)) {
      Toast.show({
        type: "error",
        text1: "Invalid email",
        text2: "Please enter a valid email address.",
      });
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Login failed",
        text2:
          error?.response?.data?.message ||
          error?.message ||
          "Invalid credentials",
      });
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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={["#082F49", "#0F172A", "#111827"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#BAE6FD" />
                <Text style={styles.badgeText}>Secure Access</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>Welcome Back</Text>
            <Text style={styles.heroSubtitle}>
              Sign in to manage hostel operations, room services, fees, and resident updates from one place.
            </Text>
            <View style={styles.heroStatsRow}>
              <HeroStat label="Fast" value="Login" />
              <HeroStat label="Safe" value="Auth" />
              <HeroStat label="Live" value="Access" />
            </View>
          </LinearGradient>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Login to your account</Text>
            <Text style={styles.formSubtitle}>Use your registered email and password to continue</Text>

            <InputField
              icon="mail-outline"
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <InputField
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
              onRightPress={() => setShowPassword((prev) => !prev)}
            />

            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => navigation.navigate("ForgotPassword")}
            >
              <Text style={styles.forgotButtonText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, !formReady && styles.primaryButtonDisabled]}
              onPress={handleLogin}
              disabled={loading || !formReady}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Login</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.bottomRow}>
              <Text style={styles.bottomText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.bottomLink}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function HeroStat({ label, value }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatLabel}>{label}</Text>
      <Text style={styles.heroStatValue}>{value}</Text>
    </View>
  );
}

function InputField({ icon, rightIcon, onRightPress, ...props }) {
  return (
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={18} color="#7DD3FC" />
      <TextInput
        placeholderTextColor="#94A3B8"
        style={styles.input}
        {...props}
      />
      {rightIcon ? (
        <TouchableOpacity onPress={onRightPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={rightIcon} size={18} color="#94A3B8" />
        </TouchableOpacity>
      ) : null}
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 18,
  },
  heroCard: {
    borderRadius: 30,
    padding: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.14)",
    marginBottom: 18,
  },
  heroGlowOne: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(14,165,233,0.18)",
    top: -60,
    right: -50,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(34,197,94,0.10)",
    bottom: -30,
    left: -20,
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: 18,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    color: "#E0F2FE",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "#CBD5E1",
    marginTop: 10,
    lineHeight: 21,
    maxWidth: "92%",
  },
  heroStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  heroStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  heroStatLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heroStatValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },
  formCard: {
    backgroundColor: "#0F172A",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  formTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  formSubtitle: {
    color: "#94A3B8",
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 20,
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
  primaryButton: {
    backgroundColor: "#0EA5E9",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 6,
  },
  primaryButtonDisabled: {
    backgroundColor: "#334155",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginRight: 8,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginTop: -2,
    marginBottom: 12,
  },
  forgotButtonText: {
    color: "#7DD3FC",
    fontWeight: "700",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  bottomText: {
    color: "#94A3B8",
    marginRight: 6,
  },
  bottomLink: {
    color: "#38BDF8",
    fontWeight: "800",
  },
});
