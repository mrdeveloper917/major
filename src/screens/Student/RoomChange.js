import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
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
    (error?.code === "ECONNABORTED" ? "Request timed out" : null) ||
    error?.message ||
    fallbackMessage
  );
};

const API = "https://hostel-backend-major.onrender.com/api";

export default function RoomChange() {
  const { token, socket, user } = useAuth();

  const [block, setBlock] = useState("");
  const [floor, setFloor] = useState("");
  const [reason, setReason] = useState("");
  const [requests, setRequests] = useState([]);
  const [student, setStudent] = useState(user || null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const fetchMyRequests = useCallback(async () => {
    if (!token) {
      setRequests([]);
      setLoading(false);
      setRefreshing(false);
      setFetchError("Login session not found");
      return;
    }

    try {
      setLoading(true);
      setFetchError("");

      const [requestRes, studentRes] = await Promise.allSettled([
        axios.get(`${API}/room-change/my`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }),
        axios.get(`${API}/student/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }),
      ]);

      if (studentRes.status === "fulfilled") {
        const studentData =
          studentRes.value?.data?.student ||
          studentRes.value?.data?.user ||
          studentRes.value?.data?.data?.student ||
          studentRes.value?.data?.data?.user ||
          studentRes.value?.data?.data ||
          null;

        setStudent((prevStudent) => ({
          ...(user || {}),
          ...(prevStudent || {}),
          ...(studentData || {}),
          room:
            studentData?.room ||
            prevStudent?.room ||
            user?.room ||
            null,
        }));
      }

      if (requestRes.status === "fulfilled") {
        const responseData = requestRes.value?.data;
        const requestList =
          responseData?.requests ||
          responseData?.data?.requests ||
          responseData?.data ||
          [];

        setRequests(Array.isArray(requestList) ? requestList : []);
      } else {
        throw requestRes.reason;
      }
    } catch (err) {
      const message = getErrorMessage(err, "Failed to load room change requests");
      console.log("FETCH ERROR:", err?.response?.data || err.message);
      setRequests([]);
      setFetchError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleRoomChangeStatus = (data) => {
      Alert.alert("Update", `Your request was ${data?.status || "updated"}`);
      fetchMyRequests();
    };

    socket.on("roomChangeStatus", handleRoomChangeStatus);

    return () => {
      socket.off("roomChangeStatus", handleRoomChangeStatus);
    };
  }, [socket, fetchMyRequests]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMyRequests();
  };

  const currentRoomLabel = student?.room?.roomNumber || student?.roomNumber;
  const currentFloorLabel = student?.room?.floor || student?.floorNumber;
  const currentBlockLabel = student?.room?.block || student?.hostelName;
  const hasPendingRequest = requests.some((item) => item?.status === "pending");

  const stats = useMemo(() => {
    const approved = requests.filter((item) => item?.status === "approved").length;
    const rejected = requests.filter((item) => item?.status === "rejected").length;
    const pending = requests.filter((item) => item?.status === "pending").length;
    return { total: requests.length, approved, rejected, pending };
  }, [requests]);

  const submitRequest = async () => {
    if (!block.trim() || !floor.trim() || !reason.trim()) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    if (!token) {
      Alert.alert("Error", "Login session not found");
      return;
    }

    if (Number.isNaN(Number(floor)) || Number(floor) <= 0) {
      Alert.alert("Error", "Please enter a valid floor number");
      return;
    }

    if (hasPendingRequest) {
      Alert.alert(
        "Pending Request",
        "Please wait for your current request to be reviewed"
      );
      return;
    }

    try {
      setSubmitting(true);
      setFetchError("");

      const res = await axios.post(
        `${API}/room-change`,
        {
          preferredBlock: block.trim(),
          preferredFloor: Number(floor),
          reason: reason.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }
      );

      if (res.data?.success || res.status === 200 || res.status === 201) {
        Alert.alert("Success", "Request submitted");
        setBlock("");
        setFloor("");
        setReason("");
        setRefreshing(true);
        fetchMyRequests();
      } else {
        Alert.alert(
          "Request Failed",
          res.data?.message || "Unable to submit room change request"
        );
      }
    } catch (err) {
      const message = getErrorMessage(err, "Something went wrong");
      console.log("SUBMIT ERROR:", err?.response?.data || err.message);
      Alert.alert("Error", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <LinearGradient
          colors={["#1E293B", "#0F172A", "#111827"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />
          <Text style={styles.heroEyebrow}>Transfer Request</Text>
          <Text style={styles.title}>Room Change</Text>
          <Text style={styles.heroSubtitle}>
            Preferred hostel block aur floor choose karke room shift request bhejein.
          </Text>
          <View style={styles.statsRow}>
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Pending" value={stats.pending} />
            <StatCard label="Approved" value={stats.approved} />
          </View>
        </LinearGradient>

        <View style={styles.currentRoomCard}>
          <Text style={styles.currentRoomTitle}>Current Room Details</Text>
          <Text style={styles.currentRoomText}>Hostel: {currentBlockLabel || "Not Available"}</Text>
          <Text style={styles.currentRoomText}>Floor: {currentFloorLabel || "Not Available"}</Text>
          <Text style={styles.currentRoomText}>Room: {currentRoomLabel || "Not Available"}</Text>
        </View>

        {loading && (
          <View style={styles.inlineLoader}>
            <ActivityIndicator size="small" color="#22C55E" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        )}

        {!!fetchError && <Text style={styles.errorText}>{fetchError}</Text>}

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>New Request</Text>
          <TextInput
            placeholder="Preferred Block"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            value={block}
            onChangeText={setBlock}
          />

          <TextInput
            placeholder="Preferred Floor"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            style={styles.input}
            value={floor}
            onChangeText={setFloor}
          />

          <TextInput
            placeholder="Reason"
            placeholderTextColor="#94A3B8"
            style={styles.reasonInput}
            multiline
            value={reason}
            onChangeText={setReason}
          />

          <TouchableOpacity
            style={[styles.btn, hasPendingRequest && styles.btnDisabled]}
            onPress={submitRequest}
            disabled={submitting || hasPendingRequest}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnText}>
                {hasPendingRequest ? "Request Pending" : "Submit Request"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Requests</Text>
          <Text style={styles.sectionMeta}>Track all submitted room change requests</Text>
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.empty}>No requests found</Text>
          </View>
        ) : (
          requests.map((item) => (
            <View key={item._id} style={styles.card}>
              <Text style={styles.label}>
                Block {item?.preferredBlock || "N/A"} • Floor {item?.preferredFloor ?? "N/A"}
              </Text>

              <Text style={styles.reasonText}>{item?.reason || "No reason"}</Text>

              <View
                style={[
                  styles.statusBadge,
                  item?.status === "approved"
                    ? styles.approved
                    : item?.status === "rejected"
                    ? styles.rejected
                    : styles.pending,
                ]}
              >
                <Text style={styles.statusText}>
                  {(item?.status || "pending").toUpperCase()}
                </Text>
              </View>
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
    backgroundColor: "rgba(34,197,94,0.12)",
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
  inlineLoader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  loadingText: {
    color: "#94A3B8",
    marginLeft: 10,
  },
  errorText: {
    color: "#FCA5A5",
    marginBottom: 16,
  },
  currentRoomCard: {
    backgroundColor: "#0D1B2A",
    padding: 18,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  currentRoomTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },
  currentRoomText: {
    color: "#CBD5E1",
    marginBottom: 4,
  },
  formCard: {
    backgroundColor: "#0D1B2A",
    padding: 18,
    borderRadius: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  input: {
    backgroundColor: "#08131F",
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  reasonInput: {
    backgroundColor: "#08131F",
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    color: "#FFFFFF",
    height: 90,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  btn: {
    backgroundColor: "#0EA5E9",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.65,
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  sectionHeader: {
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
  emptyCard: {
    backgroundColor: "#0D1B2A",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  empty: {
    color: "#94A3B8",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#0D1B2A",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  label: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  reasonText: {
    color: "#94A3B8",
    marginTop: 8,
    lineHeight: 20,
  },
  statusBadge: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  approved: {
    backgroundColor: "#16A34A",
  },
  rejected: {
    backgroundColor: "#EF4444",
  },
  pending: {
    backgroundColor: "#F59E0B",
  },
});
