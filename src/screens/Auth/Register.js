import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { launchImageLibrary } from "react-native-image-picker";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";

const API = "https://hostel-backend-major.onrender.com/api/auth";

export default function Register() {
  const navigation = useNavigation();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hostelName, setHostelName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [floorNumber, setFloorNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [course, setCourse] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [image, setImage] = useState(null);
  const [imageAsset, setImageAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const progress = useMemo(() => (step / 4) * 100, [step]);

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "photo",
        selectionLimit: 1,
        quality: 0.8,
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        Alert.alert("Error", result.errorMessage || "Image pick failed");
        return;
      }

      const selectedAsset = result.assets?.[0];
      const selectedImage = selectedAsset?.uri;

      if (selectedImage) {
        setImage(selectedImage);
        setImageAsset(selectedAsset);
      }
    } catch (error) {
      Alert.alert("Error", "Unable to open gallery");
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Missing Details", "Name, email, and password are required.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("email", email.trim());
      formData.append("password", password);
      formData.append("role", role);

      if (adminCode) formData.append("adminCode", adminCode);
      if (hostelName) formData.append("hostelName", hostelName);
      if (roomNumber) formData.append("roomNumber", roomNumber);
      if (floorNumber) formData.append("floorNumber", floorNumber);
      if (branch) formData.append("branch", branch);
      if (course) formData.append("course", course);

      if (imageAsset?.uri) {
        formData.append("image", {
          uri: imageAsset.uri,
          name: imageAsset.fileName || "profile.jpg",
          type: imageAsset.type || "image/jpeg",
        });
      }

      const res = await axios.post(`${API}/register`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.success) {
        Alert.alert("Success", "Account created successfully");
        navigation.replace("Login");
      }
    } catch (err) {
      Alert.alert("Registration Failed", err?.response?.data?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!name.trim() || !email.trim() || !password.trim()) {
        Alert.alert("Missing Details", "Please fill in your basic details first.");
        return;
      }

      if (role === "admin") {
        setStep(4);
      } else {
        setStep(3);
      }
      return;
    }

    if (step === 3) {
      setStep(4);
    }
  };

  const goBack = () => {
    if (step === 4 && role === "admin") {
      setStep(2);
      return;
    }

    setStep((prev) => Math.max(1, prev - 1));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={["#1E293B", "#0F172A", "#111827"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.topRow}>
            <View style={styles.badge}>
              <Ionicons name="person-add-outline" size={14} color="#BAE6FD" />
              <Text style={styles.badgeText}>Create Account</Text>
            </View>
            <Text style={styles.stepText}>Step {step}/4</Text>
          </View>

          <Text style={styles.heroTitle}>Join the platform</Text>
          <Text style={styles.heroSubtitle}>
            Set up a professional hostel account with guided steps for student or admin access.
          </Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </LinearGradient>

        <View style={styles.formCard}>
          {step === 1 && (
            <>
              <Text style={styles.formTitle}>Choose your role</Text>
              <Text style={styles.formSubtitle}>Select how you want to access the system</Text>

              <TouchableOpacity
                style={[styles.roleCard, role === "student" && styles.roleCardActive]}
                onPress={() => setRole("student")}
              >
                <View style={styles.roleIconWrap}>
                  <Ionicons name="school-outline" size={20} color="#38BDF8" />
                </View>
                <View style={styles.roleCopy}>
                  <Text style={styles.roleTitle}>Student</Text>
                  <Text style={styles.roleSubtitle}>Access room, fee, leave and complaint features</Text>
                </View>
                <Ionicons
                  name={role === "student" ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={role === "student" ? "#38BDF8" : "#64748B"}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleCard, role === "admin" && styles.roleCardActive]}
                onPress={() => setRole("admin")}
              >
                <View style={styles.roleIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#38BDF8" />
                </View>
                <View style={styles.roleCopy}>
                  <Text style={styles.roleTitle}>Admin</Text>
                  <Text style={styles.roleSubtitle}>Manage operations, approvals, rooms, and fees</Text>
                </View>
                <Ionicons
                  name={role === "admin" ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={role === "admin" ? "#38BDF8" : "#64748B"}
                />
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.formTitle}>Basic information</Text>
              <Text style={styles.formSubtitle}>Enter your main account details</Text>

              <InputField icon="person-outline" placeholder="Full name" value={name} onChangeText={setName} />
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

              {role === "admin" ? (
                <InputField
                  icon="key-outline"
                  placeholder="Admin code"
                  value={adminCode}
                  onChangeText={setAdminCode}
                />
              ) : null}
            </>
          )}

          {step === 3 && role === "student" && (
            <>
              <Text style={styles.formTitle}>Student details</Text>
              <Text style={styles.formSubtitle}>Add your hostel and academic information</Text>

              <InputField icon="business-outline" placeholder="Hostel name" value={hostelName} onChangeText={setHostelName} />
              <InputField icon="bed-outline" placeholder="Room number" value={roomNumber} onChangeText={setRoomNumber} />
              <InputField icon="layers-outline" placeholder="Floor number" value={floorNumber} onChangeText={setFloorNumber} />
              <InputField icon="school-outline" placeholder="Branch" value={branch} onChangeText={setBranch} />
              <InputField icon="book-outline" placeholder="Course" value={course} onChangeText={setCourse} />
            </>
          )}

          {step === 4 && (
            <>
              <Text style={styles.formTitle}>Profile photo</Text>
              <Text style={styles.formSubtitle}>Upload an optional image to personalize your account</Text>

              <View style={styles.imageCard}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={28} color="#7DD3FC" />
                    <Text style={styles.imagePlaceholderText}>No image selected</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.secondaryButton} onPress={handlePickImage}>
                <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                <Text style={styles.secondaryButtonText}>
                  {image ? "Change Photo" : "Choose From Device"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.actionRow}>
            {step > 1 ? (
              <TouchableOpacity style={styles.ghostButton} onPress={goBack} disabled={loading}>
                <Text style={styles.ghostButtonText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.spacer} />
            )}

            {step < 4 ? (
              <TouchableOpacity style={styles.primaryButton} onPress={goNext}>
                <Text style={styles.primaryButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.primaryButton} onPress={handleRegister} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Create Account</Text>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.bottomLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InputField({ icon, rightIcon, onRightPress, ...props }) {
  return (
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={18} color="#7DD3FC" />
      <TextInput placeholderTextColor="#94A3B8" style={styles.input} {...props} />
      {rightIcon ? (
        <TouchableOpacity onPress={onRightPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={rightIcon} size={18} color="#94A3B8" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  container: {
    flexGrow: 1,
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
    backgroundColor: "rgba(14,165,233,0.16)",
    top: -55,
    right: -45,
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
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    fontWeight: "800",
    fontSize: 12,
    marginLeft: 6,
  },
  stepText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
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
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginTop: 20,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#38BDF8",
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
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#08131F",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
    marginBottom: 12,
  },
  roleCardActive: {
    borderColor: "rgba(56,189,248,0.65)",
    backgroundColor: "rgba(14,165,233,0.10)",
  },
  roleIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(56,189,248,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  roleCopy: {
    flex: 1,
  },
  roleTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  roleSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
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
  imageCard: {
    backgroundColor: "#08131F",
    borderRadius: 22,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
    marginBottom: 14,
    minHeight: 180,
  },
  imagePreview: {
    width: 130,
    height: 130,
    borderRadius: 28,
  },
  imagePlaceholder: {
    alignItems: "center",
  },
  imagePlaceholderText: {
    color: "#94A3B8",
    marginTop: 10,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginLeft: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  spacer: {
    flex: 1,
  },
  ghostButton: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginRight: 10,
  },
  ghostButtonText: {
    color: "#CBD5E1",
    fontWeight: "800",
  },
  primaryButton: {
    flex: 1,
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
