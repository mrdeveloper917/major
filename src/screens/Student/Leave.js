import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";

const getErrorMessage = (error, fallbackMessage) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    (typeof error?.response?.data === "string" ? error.response.data : null) ||
    error?.message ||
    fallbackMessage
  );
};

const API = "https://hostel-backend-major.onrender.com/api";

export default function Leave() {
  const { token, socket } = useAuth();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const requestWithFallback = async (configs) => {
    let lastError = null;

    for (const config of configs) {
      try {
        return await axios({
          timeout: 8000,
          ...config,
        });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Request failed");
  };

  const fetchLeaves = useCallback(async () => {
    try {
      if (!token) {
        setLeaves([]);
        setFetching(false);
        setRefreshing(false);
        return;
      }

      const res = await requestWithFallback([
        {
          method: "get",
          url: `${API}/leave/my`,
          headers: { Authorization: `Bearer ${token}` },
        },
        {
          method: "get",
          url: `${API}/leaves/my`,
          headers: { Authorization: `Bearer ${token}` },
        },
      ]);

      const leaveData =
        res?.data?.leaves || res?.data?.data?.leaves || res?.data?.data || [];

      setLeaves(Array.isArray(leaveData) ? leaveData : []);
    } catch (error) {
      console.log("FETCH ERROR:", error?.response?.data || error.message);
    } finally {
      setFetching(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchLeaves();
    } else {
      setFetching(false);
    }
  }, [token, fetchLeaves]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleLeaveUpdated = (updatedLeave) => {
      setLeaves((prev) => {
        const exists = prev.some((leave) => leave._id === updatedLeave?._id);
        if (!exists) return [updatedLeave, ...prev];
        return prev.map((leave) =>
          leave._id === updatedLeave._id ? updatedLeave : leave
        );
      });

      Alert.alert("Update", "Your leave status updated");
    };

    socket.on("leaveUpdated", handleLeaveUpdated);
    return () => socket.off("leaveUpdated", handleLeaveUpdated);
  }, [socket]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaves();
  };

  const applyLeave = async () => {
    if (!fromDate || !toDate || !reason.trim()) {
      return Alert.alert("Error", "All fields required");
    }

    const parsedFromDate = new Date(fromDate);
    const parsedToDate = new Date(toDate);

    if (
      Number.isNaN(parsedFromDate.getTime()) ||
      Number.isNaN(parsedToDate.getTime())
    ) {
      return Alert.alert("Error", "Use valid dates in YYYY-MM-DD format");
    }

    if (parsedToDate < parsedFromDate) {
      return Alert.alert("Error", "To date cannot be earlier than from date");
    }

    try {
      setLoading(true);

      const payload = {
        fromDate,
        toDate,
        reason: reason.trim(),
      };

      await requestWithFallback([
        {
          method: "post",
          url: `${API}/leave`,
          data: payload,
          headers: { Authorization: `Bearer ${token}` },
        },
        {
          method: "post",
          url: `${API}/leaves`,
          data: payload,
          headers: { Authorization: `Bearer ${token}` },
        },
      ]);

      Alert.alert("Success", "Leave applied");
      setFromDate("");
      setToDate("");
      setReason("");
      fetchLeaves();
    } catch (error) {
      console.log("ERROR:", error?.response?.data || error.message);
      Alert.alert("Error", getErrorMessage(error, "Failed"));
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const approved = leaves.filter((item) => item?.status === "approved").length;
    const rejected = leaves.filter((item) => item?.status === "rejected").length;
    const pending = leaves.filter((item) => item?.status === "pending").length;
    return { total: leaves.length, approved, rejected, pending };
  }, [leaves]);

  const statusStyle = (status) => {
    if (status === "approved") return styles.approved;
    if (status === "rejected") return styles.rejected;
    return styles.pending;
  };

  if (fetching) {
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
          <Text style={styles.heroEyebrow}>Leave Planner</Text>
          <Text style={styles.title}>Apply Leave</Text>
          <Text style={styles.heroSubtitle}>
            Dates select karein, reason add karein, aur apne leave requests ka status yahin track karein.
          </Text>
          <View style={styles.statsRow}>
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Pending" value={stats.pending} />
            <StatCard label="Approved" value={stats.approved} />
          </View>
        </LinearGradient>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>New Leave Request</Text>
          <TextInput
            placeholder="From Date (YYYY-MM-DD)"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            value={fromDate}
            onChangeText={setFromDate}
          />

          <TextInput
            placeholder="To Date (YYYY-MM-DD)"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            value={toDate}
            onChangeText={setToDate}
          />

          <TextInput
            placeholder="Reason"
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.reasonInput]}
            multiline
            value={reason}
            onChangeText={setReason}
          />

          <TouchableOpacity style={styles.button} onPress={applyLeave}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Leaves</Text>
          <Text style={styles.sectionMeta}>All leave requests and approval statuses</Text>
        </View>

        {leaves.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.empty}>No leave requests found.</Text>
          </View>
        ) : (
          leaves.map((item) => (
            <View key={item._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.date}>
                  {item.fromDate?.slice(0, 10)} • {item.toDate?.slice(0, 10)}
                </Text>

                <View style={[styles.badge, statusStyle(item.status)]}>
                  <Text style={styles.badgeText}>
                    {item.status?.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.reasonText}>{item.reason}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
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
    backgroundColor: "rgba(14,165,233,0.16)",
    top: -35,
    right: -40,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(245,158,11,0.12)",
    bottom: -18,
    left: -12,
  },
  heroEyebrow: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
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
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  statLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },
  formCard: {
    backgroundColor: "#0D1B2A",
    padding: 18,
    borderRadius: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  sectionMeta: {
    color: "#7C8CA0",
    marginTop: 4,
  },
  input: {
    backgroundColor: "#08131F",
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  reasonInput: {
    height: 90,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#0EA5E9",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#0D1B2A",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontWeight: "800",
    color: "#FFFFFF",
    flex: 1,
    marginRight: 10,
  },
  reasonText: {
    marginTop: 10,
    color: "#94A3B8",
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  approved: { backgroundColor: "#22C55E" },
  rejected: { backgroundColor: "#EF4444" },
  pending: { backgroundColor: "#F59E0B" },
  emptyCard: {
    backgroundColor: "#0D1B2A",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  empty: {
    textAlign: "center",
    color: "#94A3B8",
  },
});
