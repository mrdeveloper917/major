import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const API = "https://hostel-backend-major.onrender.com/api";

export default function Complaints() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Electricity");
  const [description, setDescription] = useState("");
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { token, socket } = useAuth();

  const fetchComplaints = useCallback(async () => {
    try {
      if (!token) {
        setComplaints([]);
        setFetching(false);
        setRefreshing(false);
        return;
      }

      const res = await axios.get(`${API}/complaints/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComplaints(res.data.complaints || []);
    } catch (error) {
      console.log("Complaint fetch error:", error?.response?.data || error?.message);
    } finally {
      setFetching(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleComplaintUpdated = (updatedComplaint) => {
      setComplaints((prev) => {
        const exists = prev.some((item) => item._id === updatedComplaint?._id);
        if (!exists) return prev;
        return prev.map((item) =>
          item._id === updatedComplaint._id ? updatedComplaint : item
        );
      });

      Alert.alert("Update", "Your complaint status was updated");
    };

    socket.on("complaintUpdated", handleComplaintUpdated);
    return () => socket.off("complaintUpdated", handleComplaintUpdated);
  }, [socket]);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      return Alert.alert("Error", "All fields required");
    }

    try {
      setLoading(true);

      await axios.post(
        `${API}/complaints`,
        { title: title.trim(), category, description: description.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", "Complaint submitted");
      setTitle("");
      setDescription("");
      fetchComplaints();
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Submission failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints();
  };

  const stats = useMemo(() => {
    const pending = complaints.filter((item) => item?.status === "pending").length;
    const inProgress = complaints.filter((item) => item?.status === "in-progress").length;
    const resolved = complaints.filter((item) => item?.status === "resolved").length;
    return { total: complaints.length, pending, inProgress, resolved };
  }, [complaints]);

  const getStatusColor = (status) => {
    if (status === "resolved") return "#22C55E";
    if (status === "in-progress") return "#F59E0B";
    return "#EF4444";
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
          <Text style={styles.heroEyebrow}>Issue Desk</Text>
          <Text style={styles.title}>My Complaints</Text>
          <Text style={styles.heroSubtitle}>
            Track issue resolution, raise new complaints, aur hostel support updates ko live dekhein.
          </Text>
          <View style={styles.statsRow}>
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Pending" value={stats.pending} />
            <StatCard label="Resolved" value={stats.resolved} />
          </View>
        </LinearGradient>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Raise New Complaint</Text>

          <TextInput
            placeholder="Title"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />

          <View style={styles.categoryRow}>
            {["Electricity", "Water", "Maintenance"].map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.categoryBtn,
                  category === item && styles.categoryActive,
                ]}
                onPress={() => setCategory(item)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    category === item && styles.categoryTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            placeholder="Description"
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.textArea]}
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Submit Complaint</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Complaint History</Text>
          <Text style={styles.sectionMeta}>All submitted issues and their current status</Text>
        </View>

        {complaints.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No complaints submitted yet.</Text>
          </View>
        ) : (
          complaints.map((item) => {
            const statusColor = getStatusColor(item?.status);
            return (
              <View key={item._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.categoryChip}>{item.category || "General"}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {String(item.status || "pending").toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardDesc}>{item.description}</Text>
              </View>
            );
          })
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
    backgroundColor: "rgba(239,68,68,0.16)",
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
    left: -12,
  },
  heroEyebrow: {
    color: "#FCA5A5",
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
    marginBottom: 12,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  textArea: {
    height: 110,
    textAlignVertical: "top",
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  categoryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#122033",
    alignItems: "center",
    marginHorizontal: 4,
  },
  categoryActive: {
    backgroundColor: "#0EA5E9",
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
  },
  categoryTextActive: {
    color: "#fff",
  },
  submitBtn: {
    backgroundColor: "#0EA5E9",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: {
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
    alignItems: "flex-start",
  },
  cardCopy: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontWeight: "800",
    fontSize: 15,
    color: "#FFFFFF",
  },
  categoryChip: {
    color: "#38BDF8",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  cardDesc: {
    marginTop: 10,
    color: "#94A3B8",
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: "#0D1B2A",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
  },
});
