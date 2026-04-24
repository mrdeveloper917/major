import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const API = "https://hostel-backend-major.onrender.com/api";

const getStudentPaymentStorageKey = (user) => {
  const identifier = user?._id || user?.id || user?.email || "student";
  return `student_dummy_payments:${identifier}`;
};

const normalizePayment = (item, source = "server") => ({
  _id:
    item?._id ||
    item?.id ||
    item?.receiptId ||
    item?.paymentId ||
    `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  amount: Number(item?.amount || 0),
  status: String(item?.status || "success").toLowerCase(),
  date: item?.date || item?.createdAt || new Date().toISOString(),
  method: item?.method || item?.paymentMethod || "Online",
  receiptId: item?.receiptId || item?.paymentId || item?._id || "N/A",
  gateway: item?.gateway || (source === "local" ? "Demo Gateway" : "Hostel Gateway"),
  source,
});

export default function PaymentHistory() {
  const { token, user } = useAuth();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLocalPayments = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(getStudentPaymentStorageKey(user));
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed)
        ? parsed.map((item) => normalizePayment(item, "local"))
        : [];
    } catch (error) {
      console.log("Local payment history error:", error?.message || error);
      return [];
    }
  }, [user]);

  const fetchHistory = useCallback(async () => {
    try {
      if (!token) {
        setPayments([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [serverResult, localResult] = await Promise.all([
        axios
          .get(`${API}/payments/history`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => (res.data?.payments || []).map((item) => normalizePayment(item, "server")))
          .catch((error) => {
            console.log("Payment fetch error:", error?.response?.data || error?.message);
            return [];
          }),
        loadLocalPayments(),
      ]);

      const merged = [...serverResult, ...localResult].sort(
        (a, b) => new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime()
      );

      setPayments(merged);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadLocalPayments, token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const stats = useMemo(() => {
    const successful = payments.filter((item) =>
      ["paid", "success"].includes(String(item?.status || "").toLowerCase())
    );
    const totalPaid = successful.reduce(
      (sum, item) => sum + Number(item?.amount || 0),
      0
    );
    const demoPayments = payments.filter((item) => item.source === "local");

    return {
      total: payments.length,
      successful: successful.length,
      totalPaid,
      demoCount: demoPayments.length,
    };
  }, [payments]);

  const getStatusColor = (status) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "paid" || normalized === "success") return "#22C55E";
    if (normalized === "pending") return "#F59E0B";
    return "#EF4444";
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
      <FlatList
        data={payments}
        keyExtractor={(item) => String(item._id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <LinearGradient
            colors={["#1E293B", "#0F172A", "#111827"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />
            <Text style={styles.heroEyebrow}>Payments Ledger</Text>
            <Text style={styles.title}>Payment History</Text>
            <Text style={styles.heroSubtitle}>
              Backend payments aur demo gateway transactions dono ek consolidated ledger mein visible hain.
            </Text>

            <View style={styles.statsRow}>
              <StatCard label="Transactions" value={stats.total} />
              <StatCard label="Successful" value={stats.successful} />
              <StatCard
                label="Paid"
                value={`Rs ${stats.totalPaid.toLocaleString("en-IN")}`}
              />
            </View>

            <View style={styles.bannerRow}>
              <View style={styles.bannerPill}>
                <Ionicons name="flash-outline" size={14} color="#7DD3FC" />
                <Text style={styles.bannerText}>{stats.demoCount} demo payment(s) saved</Text>
              </View>
            </View>
          </LinearGradient>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={28} color="#64748B" />
            <Text style={styles.emptyTitle}>No payment records found</Text>
            <Text style={styles.emptyText}>
              Payment history generate hote hi yahan show hogi.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusColor = getStatusColor(item?.status);

          return (
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.amount}>
                  Rs {Number(item?.amount || 0).toLocaleString("en-IN")}
                </Text>

                <View style={styles.headerBadges}>
                  <View
                    style={[
                      styles.sourceBadge,
                      item.source === "local" && styles.sourceBadgeLocal,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sourceText,
                        item.source === "local" && styles.sourceTextLocal,
                      ]}
                    >
                      {item.source === "local" ? "DEMO" : "SERVER"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${statusColor}20` },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {String(item?.status || "unknown").toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.metaText}>Method: {item?.method || "Online"}</Text>
              <Text style={styles.metaText}>Gateway: {item?.gateway || "Hostel Gateway"}</Text>
              <Text style={styles.metaText}>Receipt: {item?.receiptId || item?._id}</Text>
              <Text style={styles.metaText}>
                Date: {item?.date ? new Date(item.date).toLocaleDateString("en-IN") : "Not available"}
              </Text>
            </View>
          );
        }}
      />
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
    maxWidth: "94%",
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
  bannerRow: {
    marginTop: 14,
  },
  bannerPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(14,165,233,0.16)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerText: {
    color: "#BAE6FD",
    fontSize: 12,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 20,
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
  card: {
    backgroundColor: "#0D1B2A",
    padding: 18,
    borderRadius: 22,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  amount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(148,163,184,0.14)",
  },
  sourceBadgeLocal: {
    backgroundColor: "rgba(14,165,233,0.18)",
  },
  sourceText: {
    color: "#CBD5E1",
    fontSize: 10,
    fontWeight: "800",
  },
  sourceTextLocal: {
    color: "#7DD3FC",
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
  metaText: {
    color: "#94A3B8",
    marginTop: 8,
    fontSize: 12,
  },
});
