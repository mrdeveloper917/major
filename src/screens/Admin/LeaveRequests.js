import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";

const API = "https://hostel-backend-major.onrender.com/api";

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  (typeof error?.response?.data === "string" ? error.response.data : null) ||
  fallbackMessage;

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function LeaveRequests() {
  const { token } = useAuth();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchLeaves = async (showLoader = true) => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (showLoader) setLoading(true);

    try {
      const res = await axios.get(`${API}/leaves`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setLeaves(res.data.leaves || []);
    } catch (error) {
      Alert.alert("Leave Error", getErrorMessage(error, "Failed to load leave requests"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [token]);

  const updateStatus = async (id, status) => {
    try {
      setUpdatingId(id);
      await axios.put(
        `${API}/leaves/${id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchLeaves(false);
    } catch (error) {
      Alert.alert("Update Failed", getErrorMessage(error, "Status update failed"));
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredLeaves = useMemo(() => leaves.filter((leave) => leave.status === activeTab), [leaves, activeTab]);

  const countByStatus = (status) => leaves.filter((leave) => leave.status === status).length;

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaves(false);
  };

  const getStatusColor = (status) => {
    if (status === "approved") return "#22C55E";
    if (status === "rejected") return "#EF4444";
    return "#F59E0B";
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <LinearGradient
          colors={["#1E293B", "#0F172A", "#111827"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />
          <Text style={styles.heroEyebrow}>Leave Approval Desk</Text>
          <Text style={styles.title}>Leave Requests</Text>
          <Text style={styles.heroSubtitle}>Pending approvals, approved leaves, aur rejected applications ko one-screen operational view mein manage karein.</Text>

          <View style={styles.statsRow}>
            <StatPill label="Pending" value={countByStatus("pending")} />
            <StatPill label="Approved" value={countByStatus("approved")} />
            <StatPill label="Rejected" value={countByStatus("rejected")} />
          </View>
        </LinearGradient>

        <View style={styles.tabRow}>
          {["pending", "approved", "rejected"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.toUpperCase()} ({countByStatus(tab)})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredLeaves.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-clear-outline" size={28} color="#64748B" />
            <Text style={styles.emptyTitle}>No {activeTab} requests</Text>
            <Text style={styles.emptyText}>Is tab ke liye abhi koi leave request available nahi hai.</Text>
          </View>
        ) : (
          filteredLeaves.map((item) => {
            const statusColor = getStatusColor(item.status);
            const isUpdating = updatingId === item._id;

            return (
              <View key={item._id} style={styles.card}>
                <View style={styles.headerRow}>
                  <View style={styles.profileWrap}>
                    <Text style={styles.profileText}>{item?.student?.name?.slice(0, 1)?.toUpperCase() || "S"}</Text>
                  </View>
                  <View style={styles.studentCopy}>
                    <Text style={styles.studentName}>{item.student?.name || "Student"}</Text>
                    <Text style={styles.studentEmail}>{item.student?.email || "No email"}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{String(item.status || "pending").toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.timelineCard}>
                  <Ionicons name="calendar-outline" size={16} color="#38BDF8" />
                  <Text style={styles.timelineText}>{formatDate(item.fromDate)} to {formatDate(item.toDate)}</Text>
                </View>

                <Text style={styles.reason}>{item.reason || "No reason provided"}</Text>

                {item.status === "pending" && (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.approveBtn, isUpdating && styles.disabledBtn]}
                      onPress={() => updateStatus(item._id, "approved")}
                      disabled={isUpdating}
                    >
                      <Text style={styles.btnText}>Approve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.rejectBtn, isUpdating && styles.disabledBtn]}
                      onPress={() => updateStatus(item._id, "rejected")}
                      disabled={isUpdating}
                    >
                      {isUpdating ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.btnText}>Reject</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({ label, value }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillLabel}>{label}</Text>
      <Text style={styles.statPillValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07111A",
    paddingHorizontal: 16,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#07111A",
  },
  hero: {
    marginTop: 14,
    marginBottom: 16,
    padding: 20,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  heroGlowOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(245,158,11,0.14)",
    top: -30,
    right: -30,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(56,189,248,0.12)",
    bottom: -18,
    left: -10,
  },
  heroEyebrow: {
    color: "#FCD34D",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 10,
  },
  heroSubtitle: {
    color: "#CBD5E1",
    lineHeight: 21,
    marginTop: 8,
    maxWidth: "94%",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  statPill: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  statPillLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statPillValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
  },
  tabRow: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#0D1B2A",
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#0EA5E9",
  },
  tabText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  card: {
    backgroundColor: "#0D1B2A",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14,165,233,0.16)",
    marginRight: 12,
  },
  profileText: {
    color: "#38BDF8",
    fontSize: 18,
    fontWeight: "800",
  },
  studentCopy: {
    flex: 1,
  },
  studentName: {
    fontWeight: "800",
    fontSize: 15,
    color: "#FFFFFF",
  },
  studentEmail: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 3,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  timelineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#08131F",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  timelineText: {
    color: "#CBD5E1",
    marginLeft: 8,
    fontSize: 13,
  },
  reason: {
    marginTop: 12,
    color: "#94A3B8",
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 14,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: "#22C55E",
    paddingVertical: 12,
    borderRadius: 16,
    marginRight: 10,
    alignItems: "center",
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  emptyCard: {
    backgroundColor: "#0D1B2A",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    marginTop: 12,
  },
  emptyText: {
    color: "#7C8CA0",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
