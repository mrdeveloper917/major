import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import axios from "axios";
import { launchImageLibrary } from "react-native-image-picker";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import { API_URL as API, resolveImageUrl } from "../../config/api";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  (typeof error?.response?.data === "string" ? error.response.data : null) ||
  fallback;

export default function Profile() {
  const { user, token, logout, updateUser, refreshUser } = useAuth();
  const navigation = useNavigation();

  const [admin, setAdmin] = useState(user || null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(!user);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageVersion, setImageVersion] = useState(Date.now());

  const mergeAdminData = (...sources) =>
    sources.reduce((acc, source) => {
      if (!source || typeof source !== "object") return acc;
      return { ...acc, ...source };
    }, {});

  const resolveProfileImage = (rawUrl, fallbackName = "Admin") => {
    return resolveImageUrl(rawUrl, fallbackName, imageVersion);
  };

  const fetchAdminProfile = useCallback(async () => {
    if (!token) {
      setAdmin(user || null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const res = await axios.get(`${API}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const apiAdmin =
        res.data?.admin ||
        res.data?.user ||
        res.data?.data?.admin ||
        res.data?.data?.user ||
        null;

      const nextStats = {
        totalStudents: Number(res.data?.totalStudents || 0),
        totalRooms: Number(res.data?.totalRooms || 0),
        pendingComplaints:
          Number(res.data?.complaints?.pending ?? res.data?.pendingComplaints ?? 0),
        resolvedComplaints:
          Number(res.data?.complaints?.resolved ?? res.data?.resolvedComplaints ?? 0),
        approvedLeaves:
          Number(res.data?.leaves?.approved ?? res.data?.approvedLeaves ?? 0),
        pendingRoomChanges:
          Number(res.data?.roomChanges?.pending ?? res.data?.pendingRoomChanges ?? 0),
        occupancyRate: Number(res.data?.occupancy?.rate ?? res.data?.occupancyRate ?? 0),
      };

      const nextAdmin = mergeAdminData(user, apiAdmin);
      const safeAdmin = Object.keys(nextAdmin).length ? nextAdmin : user || null;

      setAdmin(safeAdmin);
      setStats(nextStats);

      if (safeAdmin && typeof updateUser === "function") {
        const nextSerialized = JSON.stringify(safeAdmin || {});
        const userSerialized = JSON.stringify(user || {});
        if (nextSerialized !== userSerialized) {
          await updateUser(safeAdmin);
        }
      }
    } catch (error) {
      console.log(
        "Admin profile fetch error:",
        error?.response?.data || error?.message || error
      );
      setAdmin(user || null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, updateUser, user]);

  useEffect(() => {
    fetchAdminProfile();
  }, [fetchAdminProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminProfile();
  };

  const quickStats = useMemo(
    () => [
      {
        icon: "people-outline",
        label: "Students",
        value: String(stats?.totalStudents || 0),
        hint: "Total registered residents",
        color: "#38BDF8",
      },
      {
        icon: "bed-outline",
        label: "Rooms",
        value: String(stats?.totalRooms || 0),
        hint: "Hostel inventory",
        color: "#22C55E",
      },
      {
        icon: "alert-circle-outline",
        label: "Open Issues",
        value: String(stats?.pendingComplaints || 0),
        hint: "Pending complaints",
        color: "#F59E0B",
      },
      {
        icon: "swap-horizontal-outline",
        label: "Room Changes",
        value: String(stats?.pendingRoomChanges || 0),
        hint: "Awaiting approval",
        color: "#A78BFA",
      },
    ],
    [stats]
  );

  const profileSections = useMemo(
    () => [
      {
        title: "Profile Details",
        items: [
          {
            icon: "person-outline",
            label: "Full Name",
            value: admin?.name || "Not Available",
          },
          {
            icon: "mail-outline",
            label: "Email Address",
            value: admin?.email || "Not Available",
          },
          {
            icon: "shield-checkmark-outline",
            label: "Access Role",
            value: admin?.role || "Admin",
          },
        ],
      },
      {
        title: "Operations Summary",
        items: [
          {
            icon: "checkmark-done-outline",
            label: "Resolved Complaints",
            value: String(stats?.resolvedComplaints || 0),
          },
          {
            icon: "calendar-outline",
            label: "Approved Leaves",
            value: String(stats?.approvedLeaves || 0),
          },
          {
            icon: "business-outline",
            label: "Occupancy Rate",
            value: `${stats?.occupancyRate || 0}%`,
          },
        ],
      },
    ],
    [admin, stats]
  );

  const managementCards = useMemo(
    () => [
      {
        icon: "shield-half-outline",
        title: "Administrative Access",
        description: "Securely manage hostel operations, approvals, and sensitive actions.",
      },
      {
        icon: "analytics-outline",
        title: "Live Oversight",
        description: "Track occupancy, complaints, room movement, and service workload in one place.",
      },
    ],
    []
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
          setAdmin((prev) => ({ ...(prev || {}), ...nextUser }));
        }

        setImageVersion(Date.now());
        await fetchAdminProfile();
        Alert.alert("Success", "Profile image updated");
      } catch (error) {
        Alert.alert("Error", getErrorMessage(error, "Image upload failed"));
      } finally {
        setUploading(false);
      }
    });
  };

  const handleLogout = () => {
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
        <ActivityIndicator size="large" color="#38BDF8" />
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
          colors={["#111827", "#0F172A", "#020617"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#BAE6FD" />
              <Text style={styles.heroBadgeText}>Admin Profile</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{stats?.occupancyRate || 0}% Occupancy</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.avatarWrap} onPress={pickImage}>
            <Image
              source={{
                uri: resolveProfileImage(admin?.profileImage, admin?.name),
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

          <Text style={styles.name}>{admin?.name || "Admin User"}</Text>
          <Text style={styles.email}>{admin?.email || "admin@email.com"}</Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{String(admin?.role || "Admin").toUpperCase()}</Text>
          </View>

          <Text style={styles.heroHint}>Tap profile photo to update from device </Text>
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

        <View style={styles.managementGrid}>
          {managementCards.map((item) => (
            <View key={item.title} style={styles.managementCard}>
              <View style={styles.managementIconWrap}>
                <Ionicons name={item.icon} size={20} color="#38BDF8" />
              </View>
              <Text style={styles.managementTitle}>{item.title}</Text>
              <Text style={styles.managementDescription}>{item.description}</Text>
            </View>
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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <Text style={styles.sectionMeta}>Manage your profile and security preferences</Text>
        </View>

        <View style={styles.cardContainer}>
          <ActionCard
            icon="create-outline"
            title="Edit Profile"
            subtitle="Update your basic account information"
            onPress={() => navigation.navigate("EditProfile")}
          />

          <ActionCard
            icon="lock-closed-outline"
            title="Change Password"
            subtitle="Keep your admin access secure"
            onPress={() => navigation.navigate("ChangePassword")}
          />
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

function ActionCard({ icon, title, subtitle, onPress }) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={styles.actionIconWrap}>
        <Ionicons name={icon} size={20} color="#38BDF8" />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </TouchableOpacity>
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
  heroCard: {
    borderRadius: 30,
    padding: 22,
    alignItems: "center",
    marginBottom: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  heroGlowOne: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(56,189,248,0.14)",
    top: -55,
    right: -50,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(34,197,94,0.10)",
    bottom: -20,
    left: -10,
  },
  heroTopRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56,189,248,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: "#BAE6FD",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
  },
  heroPill: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroPillText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 10,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0EA5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: 25,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 2,
  },
  email: {
    color: "#CBD5E1",
    fontSize: 13,
    marginTop: 5,
  },
  roleBadge: {
    backgroundColor: "rgba(34,197,94,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 12,
  },
  roleText: {
    color: "#86EFAC",
    fontSize: 12,
    fontWeight: "800",
  },
  heroHint: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 12,
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
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  statIconWrap: {
    width: 42,
    height: 42,
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
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
  },
  statHint: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 6,
  },
  managementGrid: {
    marginBottom: 6,
  },
  managementCard: {
    backgroundColor: "#0F172A",
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  managementIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(56,189,248,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  managementTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  managementDescription: {
    color: "#94A3B8",
    marginTop: 6,
    lineHeight: 20,
  },
  detailsCard: {
    backgroundColor: "#0F172A",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  cardTitle: {
    color: "#E2E8F0",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.08)",
  },
  detailRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  flexOne: {
    flex: 1,
  },
  label: {
    color: "#64748B",
    fontSize: 12,
  },
  value: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  sectionHeader: {
    marginTop: 4,
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#E2E8F0",
    fontSize: 17,
    fontWeight: "800",
  },
  sectionMeta: {
    color: "#7C8CA0",
    marginTop: 4,
  },
  cardContainer: {
    gap: 10,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#08131F",
    marginRight: 12,
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  actionSubtitle: {
    color: "#7C8CA0",
    marginTop: 4,
    fontSize: 12,
  },
  logoutBtn: {
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  logoutText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
    marginLeft: 8,
  },
});
