import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { launchImageLibrary } from "react-native-image-picker";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { API_URL, resolveImageUrl } from "../../config/api";
import { validateEmail, validatePhone } from "../../utils/validation";

export default function EditProfile() {
  const navigation = useNavigation();
  const { token, user, updateUser, refreshUser } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    hostelName: user?.hostelName || user?.room?.block || "",
    roomNumber: user?.roomNumber || user?.room?.roomNumber || "",
    floorNumber: String(user?.floorNumber || user?.room?.floor || ""),
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(false);

  const isStudent = user?.role === "student";
  const imageUri = useMemo(
    () =>
      selectedImage || resolveImageUrl(user?.profileImage, user?.name || "User"),
    [selectedImage, user]
  );

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const showToast = (type, text1, text2) => {
    Toast.show({ type, text1, text2 });
  };

  const pickImage = async () => {
    const response = await launchImageLibrary({
      mediaType: "photo",
      quality: 0.8,
      selectionLimit: 1,
    });

    if (response.didCancel) return;

    if (response.errorCode) {
      showToast("error", "Image picker failed", response.errorMessage || "Please try again.");
      return;
    }

    const asset = response.assets?.[0];
    if (!asset?.uri) return;

    setSelectedImage(asset.uri);
    setSelectedAsset(asset);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast("error", "Name required", "Please enter your full name.");
      return;
    }

    if (!validateEmail(form.email)) {
      showToast("error", "Invalid email", "Please enter a valid email address.");
      return;
    }

    if (form.phone && !validatePhone(form.phone)) {
      showToast("error", "Invalid phone", "Use a valid mobile number.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, String(value || "").trim());
      });

      if (selectedAsset?.uri) {
        formData.append("image", {
          uri: selectedAsset.uri,
          name: selectedAsset.fileName || "profile.jpg",
          type: selectedAsset.type || "image/jpeg",
        });
      }

      const response = await axios.put(`${API_URL}/auth/update-profile`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        timeout: 20000,
      });

      const nextUser =
        response?.data?.user ||
        response?.data?.data?.user ||
        (await refreshUser(token));
      if (nextUser) {
        await updateUser(nextUser);
      }

      showToast("success", "Profile updated", "Your account details were saved.");
      navigation.goBack();
    } catch (error) {
      showToast(
        "error",
        "Update failed",
        error?.response?.data?.message || "Unable to save profile changes."
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
            <Text style={styles.heroTitle}>Edit profile</Text>
            <Text style={styles.heroSubtitle}>
              Update personal details, hostel info, and profile photo from one clean workspace.
            </Text>
          </LinearGradient>

          <View style={styles.formCard}>
            <View style={styles.avatarSection}>
              <Image source={{ uri: imageUri }} style={styles.avatar} />
              <TouchableOpacity style={styles.cameraBadge} onPress={pickImage}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.helperText}>Image preview updates before upload</Text>
            </View>

            <Field
              icon="person-outline"
              label="Full Name"
              value={form.name}
              onChangeText={(value) => setField("name", value)}
            />
            <Field
              icon="mail-outline"
              label="Email"
              value={form.email}
              onChangeText={(value) => setField("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              icon="call-outline"
              label="Phone"
              value={form.phone}
              onChangeText={(value) => setField("phone", value)}
              keyboardType="phone-pad"
            />

            {isStudent ? (
              <>
                <Field
                  icon="business-outline"
                  label="Hostel Name"
                  value={form.hostelName}
                  onChangeText={(value) => setField("hostelName", value)}
                />
                <View style={styles.inlineRow}>
                  <View style={styles.inlineItem}>
                    <Field
                      icon="bed-outline"
                      label="Room Number"
                      value={form.roomNumber}
                      onChangeText={(value) => setField("roomNumber", value)}
                    />
                  </View>
                  <View style={styles.inlineItem}>
                    <Field
                      icon="layers-outline"
                      label="Floor"
                      value={form.floorNumber}
                      onChangeText={(value) => setField("floorNumber", value)}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </>
            ) : null}

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ icon, label, ...props }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={18} color="#7DD3FC" />
        <TextInput placeholderTextColor="#64748B" style={styles.input} {...props} />
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
    alignItems: "center",
    justifyContent: "center",
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
  formCard: {
    backgroundColor: "#0F172A",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 18,
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "rgba(56,189,248,0.24)",
  },
  cameraBadge: {
    position: "absolute",
    right: "33%",
    bottom: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0EA5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  helperText: {
    color: "#94A3B8",
    marginTop: 10,
    fontSize: 12,
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: "#CBD5E1",
    fontWeight: "700",
    marginBottom: 8,
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
    paddingVertical: 15,
    marginLeft: 10,
  },
  inlineRow: {
    flexDirection: "row",
    gap: 12,
  },
  inlineItem: {
    flex: 1,
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: "#0EA5E9",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
    marginRight: 8,
  },
});
