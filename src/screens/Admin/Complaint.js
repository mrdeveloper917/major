import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import { buildApiUrl } from "../../config/api";

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  (typeof error?.response?.data === "string" ? error.response.data : null) ||
  error?.message ||
  fallbackMessage;

const isAdminRole = (role) => String(role || "").trim().toLowerCase() === "admin";

export default function Complaints() {
  const { token, user } = useAuth();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchComplaints = useCallback(async (showLoader = true) => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (showLoader) setLoading(true);

    try {
      const res = await axios.get(buildApiUrl("/complaints"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComplaints(res.data.complaints || []);
    } catch (error) {
      Alert.alert("Complaint Error", getErrorMessage(error, "Failed to load complaints"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const updateStatus = async (id, status) => {
    if (!isAdminRole(user?.role)) {
      Alert.alert("Access denied", "Only admin can update complaint status.");
      return;
    }

    try {
      setUpdatingId(id);
      await axios.put(
        buildApiUrl(`/complaints/${id}`),
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setComplaints((prev) =>
        prev.map((item) =>
          item._id === id
            ? {
                ...item,
                status,
              }
            : item
        )
      );
    } catch (error) {
      Alert.alert("Update Failed", getErrorMessage(error, "Status update failed"));
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteComplaint = async (complaint) => {
    if (!complaint?._id) return;

    if (!isAdminRole(user?.role)) {
      Alert.alert("Access denied", "Only admin can delete complaints.");
      return;
    }

    try {
      setDeletingId(complaint._id);
      const response = await axios.delete(buildApiUrl(`/complaints/${complaint._id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      setComplaints((prev) => prev.filter((item) => item._id !== complaint._id));
      Alert.alert(
        "Complaint Deleted",
        response?.data?.message || "Complaint deleted successfully"
      );
    } catch (error) {
      Alert.alert("Delete Failed", getErrorMessage(error, "Complaint delete failed"));
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeleteComplaint = (complaint) => {
    Alert.alert(
      "Delete Complaint",
      "Are you sure you want to delete this complaint?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteComplaint(complaint),
        },
      ]
    );
  };

  const filteredComplaints = useMemo(
    () => (filter === "all" ? complaints : complaints.filter((c) => c.status === filter)),
    [complaints, filter]
  );

  const stats = useMemo(() => {
    const pending = complaints.filter((c) => c.status === "pending").length;
    const inProgress = complaints.filter((c) => c.status === "in-progress").length;
    const resolved = complaints.filter((c) => c.status === "resolved").length;
    return { total: complaints.length, pending, inProgress, resolved };
  }, [complaints]);

  const getStatusColor = (status) => {
    if (status === "resolved") return "#22C55E";
    if (status === "in-progress") return "#F59E0B";
    return "#EF4444";
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints(false);
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
          <Text style={styles.heroEyebrow}>Issue Resolution Board</Text>
          <Text style={styles.title}>Complaints Management</Text>
          <Text style={styles.heroSubtitle}>Track student issues, prioritize pending tickets, aur action status ko live update karein.</Text>

          <View style={styles.statsRow}>
            <StatPill label="Total" value={stats.total} />
            <StatPill label="Pending" value={stats.pending} />
            <StatPill label="Resolved" value={stats.resolved} />
          </View>
        </LinearGradient>

        <View style={styles.filterRow}>
          {["all", "pending", "in-progress", "resolved"].map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.filterBtn, filter === item && styles.activeFilter]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.filterText, filter === item && styles.activeFilterText]}>
                {item.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredComplaints.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="chatbox-ellipses-outline" size={28} color="#64748B" />
            <Text style={styles.emptyTitle}>No complaints found</Text>
            <Text style={styles.emptyText}>Selected filter ke liye abhi koi complaint available nahi hai.</Text>
          </View>
        ) : (
          filteredComplaints.map((item) => {
            const isUpdating = updatingId === item._id;
            const isDeleting = deletingId === item._id;
            const statusColor = getStatusColor(item.status);

            return (
              <View key={item._id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.iconWrap}>
                    <Ionicons name="alert-circle-outline" size={18} color="#38BDF8" />
                  </View>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{item.title || "Untitled complaint"}</Text>
                    <Text style={styles.description}>{item.description || "No description available"}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Ionicons name="person-outline" size={14} color="#94A3B8" />
                    <Text style={styles.metaText}>{item.student?.name || "Student"}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{String(item.status || "pending").toUpperCase()}</Text>
                  </View>
                </View>

                {!!item.student?.email && <Text style={styles.email}>{item.student.email}</Text>}

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.secondaryAction,
                      (isUpdating || item.status === "pending") && styles.disabledBtn,
                    ]}
                    onPress={() => updateStatus(item._id, "pending")}
                    disabled={isUpdating || item.status === "pending"}
                  >
                    <Text style={styles.secondaryActionText}>Pending</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryAction, isUpdating && styles.disabledBtn]}
                    onPress={() => updateStatus(item._id, "resolved")}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryActionText}>Resolve</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.deleteAction, isDeleting && styles.disabledBtn]}
                    onPress={() => confirmDeleteComplaint(item)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#FECACA" />
                    ) : (
                      <Ionicons name="trash-outline" size={16} color="#FECACA" />
                    )}
                  </TouchableOpacity>
                </View>
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
    backgroundColor: "rgba(239,68,68,0.16)",
    top: -35,
    right: -30,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(56,189,248,0.12)",
    bottom: -18,
    left: -12,
  },
  heroEyebrow: {
    color: "#FCA5A5",
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
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#0D1B2A",
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  activeFilter: {
    backgroundColor: "#0EA5E9",
    borderColor: "#0EA5E9",
  },
  filterText: {
    color: "#94A3B8",
    fontWeight: "700",
    fontSize: 12,
  },
  activeFilterText: {
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
  cardTop: {
    flexDirection: "row",
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(56,189,248,0.12)",
    marginRight: 12,
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  description: {
    color: "#94A3B8",
    marginTop: 6,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#08131F",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexShrink: 1,
  },
  metaText: {
    color: "#CBD5E1",
    marginLeft: 6,
    fontSize: 12,
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
  email: {
    color: "#64748B",
    marginTop: 10,
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 14,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: "#1D4ED8",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 12,
    marginRight: 10,
  },
  secondaryActionText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: "#22C55E",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  deleteAction: {
    width: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.18)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.24)",
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
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
});
