import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { launchImageLibrary } from "react-native-image-picker";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import { API_URL as API, resolveImageUrl } from "../../config/api";
const STUDENT_PAYMENT_KEY_PREFIX = "student_dummy_payments:";

export default function Profile() {
  const { user, token, logout, updateUser, refreshUser } = useAuth();
  const navigation = useNavigation();

  const [student, setStudent] = useState(user || null);
  const [loading, setLoading] = useState(!user);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageVersion, setImageVersion] = useState(Date.now());
  const latestStudentRef = useRef(user || null);

  useEffect(() => {
    latestStudentRef.current = student || null;
  }, [student]);

  const getPaymentStorageKey = useCallback((studentLike) => {
    const identifier =
      studentLike?._id || studentLike?.id || studentLike?.email || user?._id || user?.email || "student";
    return `${STUDENT_PAYMENT_KEY_PREFIX}${identifier}`;
  }, [user]);

  const getDerivedFeeStatus = useCallback((totalAmount, paidAmount, fallbackStatus) => {
    const total = Number(totalAmount || 0);
    const paid = Number(paidAmount || 0);

    if (total > 0) {
      if (paid >= total) return "Paid";
      if (paid > 0) return "Partial";
      return "Unpaid";
    }

    return fallbackStatus || "Not Assigned";
  }, []);

  const getLocalSuccessfulPaidAmount = useCallback(async (studentLike) => {
    try {
      const saved = await AsyncStorage.getItem(getPaymentStorageKey(studentLike));
      const parsed = saved ? JSON.parse(saved) : [];

      if (!Array.isArray(parsed)) return 0;

      return parsed.reduce((sum, item) => {
        const normalizedStatus = String(item?.status || "").toLowerCase();
        if (normalizedStatus === "paid" || normalizedStatus === "success") {
          return sum + Number(item?.amount || 0);
        }
        return sum;
      }, 0);
    } catch (error) {
      console.log("Profile local payment summary error:", error?.message || error);
      return 0;
    }
  }, [getPaymentStorageKey]);

  const mergeStudentData = (...sources) =>
    sources.reduce((acc, source) => {
      if (!source || typeof source !== "object") return acc;

      return {
        ...acc,
        ...source,
        room: source.room || acc.room,
      };
    }, {});

  const resolveProfileImage = (rawUrl, fallbackName = "Student") => {
    return resolveImageUrl(rawUrl, fallbackName, imageVersion);
  };

  const fetchStudentProfile = useCallback(async () => {
    try {
      if (!token) {
        setStudent(user || null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [dashboardRes, feeRes] = await Promise.allSettled([
        axios.get(`${API}/student/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/fees/my-fee`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (dashboardRes.status !== "fulfilled") {
        throw dashboardRes.reason;
      }

      const apiStudent =
        dashboardRes.value.data?.student ||
        dashboardRes.value.data?.user ||
        dashboardRes.value.data?.data?.student ||
        dashboardRes.value.data?.data?.user ||
        dashboardRes.value.data?.data ||
        null;

      const feeData =
        feeRes.status === "fulfilled"
          ? feeRes.value?.data?.fee || null
          : null;

      const localPaidAmount = await getLocalSuccessfulPaidAmount(apiStudent || user);
      const backendPaidAmount = Number(feeData?.paidAmount || 0);
      const totalAmount = Number(feeData?.totalAmount || 0);
      const effectiveFeeStatus = getDerivedFeeStatus(
        totalAmount,
        backendPaidAmount + localPaidAmount,
        apiStudent?.feeStatus || user?.feeStatus
      );

      const mergedStudent = {
        ...mergeStudentData(user, latestStudentRef.current, apiStudent),
        feeStatus: effectiveFeeStatus,
      };
      const safeStudent = Object.keys(mergedStudent).length ? mergedStudent : null;

      setStudent(safeStudent);

      if (
        safeStudent &&
        typeof updateUser === "function" &&
        JSON.stringify(safeStudent) !== JSON.stringify(user || {})
      ) {
        updateUser(safeStudent).catch(() => {});
      }
    } catch {
      setStudent(user || null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getDerivedFeeStatus, getLocalSuccessfulPaidAmount, token, updateUser, user]);

  useEffect(() => {
    fetchStudentProfile();
  }, [fetchStudentProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudentProfile();
  };

  const profileSections = useMemo(
    () => [
      {
        title: "Personal Details",
        items: [
          {
            icon: "person-outline",
            label: "Full Name",
            value: student?.name || "Not Available",
          },
          {
            icon: "mail-outline",
            label: "Email",
            value: student?.email || "Not Available",
          },
          {
            icon: "shield-checkmark-outline",
            label: "Role",
            value: student?.role || "Student",
          },
        ],
      },
      {
        title: "Academic Details",
        items: [
          {
            icon: "school-outline",
            label: "Branch",
            value: student?.branch || "Not Available",
          },
          {
            icon: "book-outline",
            label: "Course",
            value: student?.course || "Not Available",
          },
        ],
      },
      {
        title: "Hostel Details",
        items: [
          {
            icon: "business-outline",
            label: "Hostel Name",
            value: student?.hostelName || student?.room?.block || "Not Available",
          },
          {
            icon: "layers-outline",
            label: "Floor Number",
            value: student?.floorNumber || student?.room?.floor || "Not Available",
          },
          {
            icon: "bed-outline",
            label: "Room Number",
            value:
              student?.roomNumber || student?.room?.roomNumber || "Not Available",
          },
        ],
      },
    ],
    [student]
  );

  const quickStats = useMemo(
    () => [
      {
        icon: "bed-outline",
        label: "Room",
        value: student?.room?.roomNumber || student?.roomNumber || "N/A",
        hint: student?.hostelName || student?.room?.block || "Hostel pending",
        color: "#0EA5E9",
      },
      {
        icon: "wallet-outline",
        label: "Fee Status",
        value: student?.feeStatus || "Unpaid",
        hint: "Payment overview",
        color: "#22C55E",
      },
      {
        icon: "alert-circle-outline",
        label: "Complaints",
        value: String(student?.complaints ?? 0),
        hint: "Raised issues",
        color: "#F59E0B",
      },
      {
        icon: "calendar-outline",
        label: "Leaves",
        value: String(student?.leaves ?? 0),
        hint: "Leave requests",
        color: "#A78BFA",
      },
    ],
    [student]
  );

  const pickImage = () => {
    launchImageLibrary({ mediaType: "photo", quality: 0.7 }, async (res) => {
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert("Error", "Image picker failed");
        return;
      }

      const asset = res.assets?.[0];
      const uri = asset?.uri;

      if (!uri) {
        Alert.alert("Error", "Could not read selected image");
        return;
      }

      try {
        setUploading(true);

        const formData = new FormData();
        formData.append("image", {
          uri,
          name: asset.fileName || "profile.jpg",
          type: asset.type || "image/jpeg",
        });

        const response = await axios.put(`${API}/auth/update-profile`, formData, {
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
        if (nextUser && typeof updateUser === "function") {
          await updateUser(nextUser);
          setStudent((prev) => ({ ...(prev || {}), ...nextUser }));
        }

        setImageVersion(Date.now());
        await fetchStudentProfile();
        Alert.alert("Success", "Profile image updated");
      } catch (error) {
        Alert.alert(
          "Error",
          error?.response?.data?.message || "Image upload failed"
        );
      } finally {
        setUploading(false);
      }
    });
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          navigation.replace("Login");
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient
          colors={["#1E293B", "#0F172A", "#111827"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <TouchableOpacity style={styles.avatarWrap} onPress={pickImage}>
            <Image
              source={{
                uri: resolveProfileImage(student?.profileImage, student?.name),
              }}
              style={styles.avatar}
            />
            <View style={styles.cameraBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="camera" size={16} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.hintText}>Tap photo to upload from device </Text>
          <Text style={styles.name}>{student?.name || "Student"}</Text>
          <Text style={styles.email}>
            {student?.email || "example@email.com"}
          </Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {student?.role?.toUpperCase() || "STUDENT"}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.statsGrid}>
          {quickStats.map((item) => (
            <StatCard
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              hint={item.hint}
              color={item.color}
            />
          ))}
        </View>

        {profileSections.map((section) => (
          <View key={section.title} style={styles.detailsCard}>
            <Text style={styles.cardTitle}>{section.title}</Text>

            {section.items.map((item, index) => (
              <View
                key={`${section.title}-${item.label}`}
                style={[
                  styles.detailRow,
                  index === section.items.length - 1 && styles.detailRowLast,
                ]}
              >
                <View style={styles.iconBox}>
                  <Ionicons name={item.icon} size={18} color="#38BDF8" />
                </View>

                <View style={styles.flexOne}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Text style={styles.value}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.sectionTitle}>Account Settings</Text>

        <View style={styles.cardContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <Ionicons name="create-outline" size={20} color="#38BDF8" />
            <Text style={styles.actionText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("ChangePassword")}
          >
            <Ionicons name="lock-closed-outline" size={20} color="#38BDF8" />
            <Text style={styles.actionText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value, hint, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
  },
  wrapper: {
    flex: 1,
    backgroundColor: "#020617",
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  profileCard: {
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    marginBottom: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  heroGlowOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(14,165,233,0.18)",
    top: -30,
    right: -30,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(34,197,94,0.12)",
    bottom: -20,
    left: -10,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.18)",
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 6,
  },
  cameraBadge: {
    position: "absolute",
    right: 2,
    bottom: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#0EA5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  hintText: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  email: {
    color: "#CBD5E1",
    fontSize: 13,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: "rgba(14,165,233,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  roleText: {
    color: "#E0F2FE",
    fontSize: 12,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statCard: {
    width: "48.5%",
    backgroundColor: "#0F172A",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  statValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
  },
  statHint: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 6,
  },
  detailsCard: {
    backgroundColor: "#0F172A",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  cardTitle: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  detailRowLast: {
    marginBottom: 0,
  },
  iconBox: {
    backgroundColor: "#020617",
    padding: 10,
    borderRadius: 12,
    marginRight: 12,
  },
  label: {
    color: "#64748B",
    fontSize: 12,
  },
  flexOne: {
    flex: 1,
  },
  value: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  sectionTitle: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  cardContainer: {
    gap: 10,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  actionText: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    marginLeft: 12,
    fontWeight: "600",
  },
  logoutBtn: {
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    marginLeft: 8,
  },
});
