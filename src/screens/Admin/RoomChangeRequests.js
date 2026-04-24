import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
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

export default function RoomChangeRequests() {
  const { token } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  const fetchRequests = async (showLoader = true) => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (showLoader) setLoading(true);

    try {
      const res = await axios.get(`${API}/room-change`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setRequests(res.data.requests || []);
      } else {
        setRequests(res.data.requests || []);
      }
    } catch (error) {
      Alert.alert("Room Change Error", getErrorMessage(error, "Failed to load requests"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests(false);
  };

  const handleApprove = async (id) => {
    try {
      setActioningId(id);
      await axios.put(
        `${API}/room-change/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchRequests(false);
    } catch (error) {
      Alert.alert("Approval Failed", getErrorMessage(error, "Approval failed"));
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id) => {
    try {
      setActioningId(id);
      await axios.put(
        `${API}/room-change/${id}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchRequests(false);
    } catch (error) {
      Alert.alert("Reject Failed", getErrorMessage(error, "Reject failed"));
    } finally {
      setActioningId(null);
    }
  };

  const stats = useMemo(() => {
    const pending = requests.filter((request) => request.status === "pending").length;
    const approved = requests.filter((request) => request.status === "approved").length;
    const rejected = requests.filter((request) => request.status === "rejected").length;
    return { total: requests.length, pending, approved, rejected };
  }, [requests]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#22C55E" />
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
          <Text style={styles.heroEyebrow}>Transfer Approval Desk</Text>
          <Text style={styles.title}>Room Change Requests</Text>
          <Text style={styles.heroSubtitle}>Pending room moves, destination preferences, aur request outcomes ko live review karein.</Text>

          <View style={styles.statsRow}>
            <StatPill label="Total" value={stats.total} />
            <StatPill label="Pending" value={stats.pending} />
            <StatPill label="Approved" value={stats.approved} />
          </View>
        </LinearGradient>

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="swap-horizontal-outline" size={28} color="#64748B" />
            <Text style={styles.emptyTitle}>No requests found</Text>
            <Text style={styles.emptyText}>Room change pipeline currently empty hai.</Text>
          </View>
        ) : (
          requests.map((item) => {
            const statusColor =
              item.status === "approved"
                ? "#22C55E"
                : item.status === "rejected"
                ? "#EF4444"
                : "#F59E0B";
            const isActioning = actioningId === item._id;

            return (
              <View key={item._id} style={styles.card}>
                <View style={styles.headerRow}>
                  <View style={styles.profileWrap}>
                    <Text style={styles.profileText}>{item?.studentId?.name?.slice(0, 1)?.toUpperCase() || "S"}</Text>
                  </View>
                  <View style={styles.studentCopy}>
                    <Text style={styles.name}>{item.studentId?.name || "Student"}</Text>
                    <Text style={styles.email}>{item.studentId?.email || "No email"}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{String(item.status || "pending").toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.detailGrid}>
                  <DetailCard
                    icon="home-outline"
                    label="Current Room"
                    value={item.currentRoom?.roomNumber || item.currentRoom?.roomId?.roomNumber || "N/A"}
                  />
                  <DetailCard
                    icon="navigate-outline"
                    label="Preferred"
                    value={`Block ${item.preferredBlock || "-"} • Floor ${item.preferredFloor || "-"}`}
                  />
                </View>

                <Text style={styles.reason}>{item.reason || "No reason provided"}</Text>

                {item.status === "pending" && (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.approveBtn, isActioning && styles.disabledBtn]}
                      onPress={() => handleApprove(item._id)}
                      disabled={isActioning}
                    >
                      <Text style={styles.btnText}>Approve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.rejectBtn, isActioning && styles.disabledBtn]}
                      onPress={() => handleReject(item._id)}
                      disabled={isActioning}
                    >
                      {isActioning ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.btnText}>Reject</Text>}
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

function DetailCard({ icon, label, value }) {
  return (
    <View style={styles.detailCard}>
      <Ionicons name={icon} size={16} color="#38BDF8" />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
    backgroundColor: "rgba(34,197,94,0.14)",
    top: -30,
    right: -30,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(56,189,248,0.12)",
    bottom: -20,
    left: -10,
  },
  heroEyebrow: {
    color: "#86EFAC",
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
  card: {
    backgroundColor: "#0D1B2A",
    padding: 16,
    borderRadius: 22,
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
    justifyContent: "center",
    alignItems: "center",
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
  name: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  email: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
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
  detailGrid: {
    flexDirection: "row",
    marginTop: 14,
  },
  detailCard: {
    flex: 1,
    backgroundColor: "#08131F",
    borderRadius: 16,
    padding: 12,
    marginRight: 10,
  },
  detailLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 8,
  },
  detailValue: {
    color: "#FFFFFF",
    fontWeight: "700",
    marginTop: 4,
    lineHeight: 19,
  },
  reason: {
    color: "#CBD5E1",
    marginTop: 12,
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
  },
});
