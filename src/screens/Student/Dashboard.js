import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import { API_URL as API, resolveImageUrl } from "../../config/api";
const STUDENT_PAYMENT_KEY_PREFIX = "student_dummy_payments:";

const getErrorMessage = (error, fallbackMessage) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    (typeof error?.response?.data === "string" ? error.response.data : null) ||
    error?.message ||
    fallbackMessage
  );
};

export default function Dashboard() {
  const { token, user, socket, updateUser } = useAuth();
  const navigation = useNavigation();

  const [student, setStudent] = useState(user || null);
  const [loading, setLoading] = useState(!user);
  const [refreshing, setRefreshing] = useState(false);
  const [imageVersion, setImageVersion] = useState(Date.now());
  const [lastSync, setLastSync] = useState(null);
  const lastProfileImageRef = useRef(user?.profileImage || null);
  const latestStudentRef = useRef(user || null);
  const userSerialized = JSON.stringify(user || {});

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
      console.log("Dashboard local payment summary error:", error?.message || error);
      return 0;
    }
  }, [getPaymentStorageKey]);

  const mergeStudentData = useCallback(
    (...sources) =>
      sources.reduce((acc, source) => {
        if (!source || typeof source !== "object") return acc;

        return {
          ...acc,
          ...source,
          room: source.room || acc.room,
        };
      }, {}),
    []
  );

  const resolveProfileImage = useCallback(
    (rawUrl, fallbackName = "Student") =>
      resolveImageUrl(rawUrl, fallbackName, imageVersion),
    [imageVersion]
  );

  const fetchStudent = useCallback(
    async (showError = false) => {
      if (!token) {
        setStudent(user || null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const [dashboardRes, feeRes] = await Promise.allSettled([
          axios.get(`${API}/student/dashboard`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 7000,
          }),
          axios.get(`${API}/fees/my-fee`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 7000,
          }),
        ]);

        if (dashboardRes.status !== "fulfilled") {
          throw dashboardRes.reason;
        }

        const dashboardData =
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

        const localPaidAmount = await getLocalSuccessfulPaidAmount(dashboardData || user);
        const backendPaidAmount = Number(feeData?.paidAmount || 0);
        const totalAmount = Number(feeData?.totalAmount || 0);
        const effectiveFeeStatus = getDerivedFeeStatus(
          totalAmount,
          backendPaidAmount + localPaidAmount,
          dashboardData?.feeStatus || user?.feeStatus
        );

        const mergedStudent = {
          ...mergeStudentData(user, latestStudentRef.current, dashboardData),
          feeStatus: effectiveFeeStatus,
        };
        const nextSerialized = JSON.stringify(mergedStudent || {});

        if (dashboardData?.profileImage !== lastProfileImageRef.current) {
          lastProfileImageRef.current = dashboardData?.profileImage || null;
          setImageVersion(Date.now());
        }

        setStudent(mergedStudent);

        if (
          typeof updateUser === "function" &&
          nextSerialized !== userSerialized
        ) {
          updateUser(mergedStudent).catch(() => {});
        }

        setLastSync(new Date());

        Promise.allSettled([
          axios.get(`${API}/complaints/my`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000,
          }),
          axios.get(`${API}/leave/my`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000,
          }),
        ]).then(([complaintsRes, leaveRes]) => {
          const complaints =
            complaintsRes.status === "fulfilled"
              ? complaintsRes.value?.data?.complaints || []
              : [];

          const leaves =
            leaveRes.status === "fulfilled"
              ? leaveRes.value?.data?.leaves || []
              : [];

          setStudent((prevStudent) => ({
            ...(prevStudent || {}),
            complaints: complaints.length || prevStudent?.complaints || 0,
            leaves: leaves.length || prevStudent?.leaves || 0,
          }));
        });
      } catch (error) {
        console.log(
          "Student dashboard error:",
          error?.response?.data || error?.message
        );
        setStudent(user || null);

        if (showError) {
          Alert.alert(
            "Dashboard Error",
            getErrorMessage(
              error,
              "Student dashboard load nahi ho paya, lekin aap logged in ho."
            )
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      getDerivedFeeStatus,
      getLocalSuccessfulPaidAmount,
      mergeStudentData,
      token,
      updateUser,
      userSerialized,
      user,
    ]
  );

  useFocusEffect(
    useCallback(() => {
      fetchStudent(false);
    }, [fetchStudent])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudent(true);
  };

  useFocusEffect(
    useCallback(() => {
      if (!socket) return undefined;

      const handleLiveRefresh = () => {
        fetchStudent(false);
      };

      socket.on("complaintUpdated", handleLiveRefresh);
      socket.on("leaveUpdated", handleLiveRefresh);
      socket.on("roomChangeStatus", handleLiveRefresh);

      return () => {
        socket.off("complaintUpdated", handleLiveRefresh);
        socket.off("leaveUpdated", handleLiveRefresh);
        socket.off("roomChangeStatus", handleLiveRefresh);
      };
    }, [socket, fetchStudent])
  );

  const roomLabel = useMemo(() => {
    const block = student?.room?.block || student?.hostelName;
    const roomNumber = student?.room?.roomNumber || student?.roomNumber;
    const floor = student?.room?.floor || student?.floorNumber;

    if (!roomNumber) return "Not Assigned";

    return `${block || "Hostel"} • Floor ${floor || "N/A"} • Room ${roomNumber}`;
  }, [student]);

  const stats = [
    {
      icon: "bed-outline",
      label: "Room",
      value: student?.room?.roomNumber || student?.roomNumber || "N/A",
      tone: "#0EA5E9",
      hint: student?.hostelName || student?.room?.block || "Hostel pending",
    },
    {
      icon: "card-outline",
      label: "Fee Status",
      value: student?.feeStatus || "Unpaid",
      tone: "#22C55E",
      hint: "Payment overview",
    },
    {
      icon: "chatbubble-ellipses-outline",
      label: "Complaints",
      value: String(student?.complaints ?? 0),
      tone: "#F59E0B",
      hint: "Track issue requests",
    },
    {
      icon: "document-text-outline",
      label: "Leaves",
      value: String(student?.leaves ?? 0),
      tone: "#F97316",
      hint: "Applied requests",
    },
  ];

  const quickActions = [
    {
      icon: "qr-code-outline",
      title: "My QR Pass",
      subtitle: "Show hostel verification QR",
      onPress: () => navigation.navigate("QrCode"),
      tone: "#0EA5E9",
    },
    {
      icon: "alert-circle-outline",
      title: "Submit Complaint",
      subtitle: "Raise an issue from hostel",
      onPress: () => navigation.navigate("Complaints"),
      tone: "#F59E0B",
    },
    {
      icon: "calendar-outline",
      title: "Apply Leave",
      subtitle: "Send leave request quickly",
      onPress: () => navigation.navigate("Leave"),
      tone: "#F97316",
    },
  ];

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.loader}>
        <Text style={styles.emptyTitle}>Student data unavailable</Text>
        <Text style={styles.emptyText}>
          Please login again if this keeps happening.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient
          colors={["#082F49", "#0F172A", "#111827"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroTop}>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live Student Overview</Text>
            </View>

            <TouchableOpacity
              style={styles.profileChip}
              onPress={() => navigation.navigate("Profile")}
            >
              <Text style={styles.profileChipText}>Profile</Text>
              <Ionicons name="chevron-forward" size={14} color="#E0F2FE" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroBody}>
            <View style={styles.heroCopy}>
              <Text style={styles.greeting}>Welcome back</Text>
              <Text style={styles.name}>{student?.name || "Student"}</Text>
              <Text style={styles.email}>
                {student?.email || "student@email.com"}
              </Text>

              <View style={styles.roomPill}>
                <Ionicons name="home-outline" size={14} color="#BAE6FD" />
                <Text style={styles.roomPillText}>{roomLabel}</Text>
              </View>
            </View>

            <Image
              source={{
                uri: resolveProfileImage(student?.profileImage, student?.name),
              }}
              style={styles.profile}
            />
          </View>
        </LinearGradient>

        <View style={styles.insightBanner}>
          <View>
            <Text style={styles.insightLabel}>Academic Snapshot</Text>
            <Text style={styles.insightValue}>
              {student?.branch || "Branch"} • {student?.course || "Course"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.insightAction}
            onPress={() => navigation.navigate("MyRoom")}
          >
            <Text style={styles.insightActionText}>My Room</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((item) => (
            <StatCard
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              hint={item.hint}
              color={item.tone}
            />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionMeta}>Tap to manage student life</Text>
        </View>

        {quickActions.map((item) => (
          <ActionCard
            key={item.title}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            color={item.tone}
            onPress={item.onPress}
          />
        ))}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live Summary</Text>
          <Text style={styles.sectionMeta}>Auto-refreshes on updates</Text>
        </View>

        <View style={styles.summaryCard}>
          <SummaryRow
            label="Hostel"
            value={student?.hostelName || student?.room?.block || "Not Available"}
          />
          <SummaryRow
            label="Floor"
            value={student?.floorNumber || student?.room?.floor || "Not Available"}
          />
          <SummaryRow
            label="Room"
            value={
              student?.roomNumber || student?.room?.roomNumber || "Not Available"
            }
          />
          <SummaryRow
            label="Last Sync"
            value={
              lastSync
                ? lastSync.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Just now"
            }
            isLast
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, hint, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
}

function ActionCard({ icon, title, subtitle, color, onPress }) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={[styles.actionIconWrap, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </TouchableOpacity>
  );
}

function SummaryRow({ label, value, isLast = false }) {
  return (
    <View style={[styles.summaryRow, isLast && styles.summaryRowLast]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#06121D",
    paddingHorizontal: 16,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#06121D",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyText: {
    color: "#94A3B8",
    textAlign: "center",
  },
  hero: {
    padding: 20,
    borderRadius: 28,
    marginTop: 14,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(125, 211, 252, 0.14)",
  },
  heroGlowOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(14,165,233,0.18)",
    top: -35,
    right: -50,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(34,197,94,0.12)",
    bottom: -25,
    left: -20,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginRight: 8,
  },
  liveText: {
    color: "#E0F2FE",
    fontSize: 12,
    fontWeight: "700",
  },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  profileChipText: {
    color: "#E0F2FE",
    fontWeight: "700",
    marginRight: 4,
  },
  heroBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroCopy: {
    flex: 1,
    paddingRight: 16,
  },
  greeting: {
    color: "#93C5FD",
    fontSize: 14,
    marginBottom: 4,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  email: {
    color: "#BFDBFE",
    fontSize: 13,
    marginTop: 6,
  },
  roomPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(14,165,233,0.16)",
    borderRadius: 999,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roomPillText: {
    color: "#E0F2FE",
    marginLeft: 8,
    fontSize: 12,
    fontWeight: "700",
  },
  profile: {
    width: 82,
    height: 82,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(186,230,253,0.55)",
  },
  insightBanner: {
    backgroundColor: "#102132",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  insightLabel: {
    color: "#7DD3FC",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  insightValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  insightAction: {
    backgroundColor: "#0EA5E9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  insightActionText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statCard: {
    width: "48.5%",
    backgroundColor: "#0D1B2A",
    borderRadius: 22,
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
    marginBottom: 14,
  },
  statLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  statValue: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
  },
  statHint: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 6,
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  sectionMeta: {
    color: "#7C8CA0",
    marginTop: 4,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D1B2A",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
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
  summaryCard: {
    backgroundColor: "#0D1B2A",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.10)",
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    color: "#7C8CA0",
    fontSize: 13,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontWeight: "700",
    maxWidth: "58%",
    textAlign: "right",
  },
});
