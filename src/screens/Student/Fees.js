import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
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
  source,
  gateway: item?.gateway || (source === "local" ? "Demo Gateway" : "Hostel Gateway"),
  studentId: item?.studentId || null,
  studentEmail: item?.studentEmail || null,
  studentName: item?.studentName || null,
});

const mergePayments = (serverPayments, localPayments) =>
  [...serverPayments, ...localPayments].sort(
    (a, b) => new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime()
  );

export default function Fees() {
  const { token, user, updateUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feeData, setFeeData] = useState(null);
  const [history, setHistory] = useState([]);
  const [localHistory, setLocalHistory] = useState([]);
  const [gatewayVisible, setGatewayVisible] = useState(false);
  const [paying, setPaying] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("UPI");
  const [lastPayment, setLastPayment] = useState(null);

  const loadLocalHistory = useCallback(async () => {
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

  const fetchFees = useCallback(async () => {
    try {
      if (!token) {
        setFeeData(null);
        setHistory([]);
        setLocalHistory([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [feeRes, historyRes, localPayments] = await Promise.all([
        Promise.allSettled([
          axios.get(`${API}/fees/my-fee`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API}/payments/history`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]),
        Promise.resolve(null),
        loadLocalHistory(),
      ]);

      const [feeResult, historyResult] = feeRes;

      if (feeResult.status === "fulfilled") {
        setFeeData(feeResult.value?.data?.fee || null);
      }

      const normalizedServerHistory =
        historyResult.status === "fulfilled"
          ? (historyResult.value?.data?.payments || []).map((item) =>
              normalizePayment(item, "server")
            )
          : [];

      setHistory(normalizedServerHistory);
      setLocalHistory(localPayments);
    } catch (error) {
      console.log("Fee Fetch Error:", error?.response?.data || error?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadLocalHistory, token]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFees();
  }, [fetchFees]);

  const successfulLocalAmount = useMemo(
    () =>
      localHistory
        .filter((item) => ["paid", "success"].includes(String(item?.status || "").toLowerCase()))
        .reduce((sum, item) => sum + Number(item?.amount || 0), 0),
    [localHistory]
  );

  const total = Number(feeData?.totalAmount || 0);
  const backendPaid = Number(feeData?.paidAmount || 0);
  const paid = backendPaid + successfulLocalAmount;
  const due = Math.max(total - paid, 0);

  const status = due <= 0 && total > 0 ? "Paid" : paid > 0 ? "Partial" : total > 0 ? "Unpaid" : "Not Assigned";
  const statusColor =
    status === "Paid"
      ? "#22C55E"
      : status === "Partial"
      ? "#F59E0B"
      : status === "Not Assigned"
      ? "#94A3B8"
      : "#EF4444";

  const mergedHistory = useMemo(
    () => mergePayments(history, localHistory),
    [history, localHistory]
  );

  const paymentStats = useMemo(() => {
    const successful = mergedHistory.filter((item) =>
      ["paid", "success"].includes(String(item?.status || "").toLowerCase())
    );
    const totalPaidHistory = successful.reduce(
      (sum, item) => sum + Number(item?.amount || 0),
      0
    );

    return {
      count: mergedHistory.length,
      successful: successful.length,
      totalPaidHistory,
    };
  }, [mergedHistory]);

  useEffect(() => {
    if (!user || typeof updateUser !== "function") return;
    if (user?.feeStatus === status) return;

    updateUser({
      ...user,
      feeStatus: status,
    }).catch(() => {});
  }, [status, updateUser, user]);

  const paymentMethods = [
    { key: "UPI", icon: "phone-portrait-outline", subtitle: "Fast campus-friendly payments" },
    { key: "Card", icon: "card-outline", subtitle: "Debit or credit card demo flow" },
    { key: "Net Banking", icon: "business-outline", subtitle: "Secure bank transfer simulation" },
  ];

  const handleOpenGateway = () => {
    if (due <= 0) {
      Alert.alert("No Due", "Aapki fee already clear hai.");
      return;
    }

    setSelectedMethod("UPI");
    setGatewayVisible(true);
  };

  const handleCompletePayment = async () => {
    try {
      if (!token || due <= 0) return;

      setPaying(true);

      const paymentEntry = normalizePayment(
        {
          amount: due,
          status: "success",
          date: new Date().toISOString(),
          method: selectedMethod,
          receiptId: `DUMMY-${Date.now()}`,
          gateway: "Demo Gateway",
          studentId: user?._id || user?.id || null,
          studentEmail: user?.email || null,
          studentName: user?.name || "Student",
        },
        "local"
      );

      const nextLocalHistory = [paymentEntry, ...localHistory];
      await AsyncStorage.setItem(
        getStudentPaymentStorageKey(user),
        JSON.stringify(nextLocalHistory)
      );

      setTimeout(() => {
        setLocalHistory(nextLocalHistory);
        setLastPayment(paymentEntry);
        setGatewayVisible(false);
        setSuccessModal(true);
        setPaying(false);
      }, 900);
    } catch (error) {
      setPaying(false);
      Alert.alert("Payment Failed", "Demo payment save nahi ho paya. Dobara try karein.");
    }
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5E9" />
        }
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#1E293B", "#0F172A", "#111827"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />
          <Text style={styles.heroEyebrow}>Fees Center</Text>
          <Text style={styles.title}>My Fees</Text>
          <Text style={styles.heroSubtitle}>
            Current dues, payment progress, aur demo gateway se instantly pay karne ka option ek hi screen par.
          </Text>

          <View style={styles.heroStatusRow}>
            <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
            <Text style={styles.dueDate}>Due Date: {feeData?.dueDate || "N/A"}</Text>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <StatCard label="Assigned" value={`Rs ${total.toLocaleString("en-IN")}`} />
          <StatCard label="Paid" value={`Rs ${paid.toLocaleString("en-IN")}`} />
          <StatCard label="Due" value={`Rs ${due.toLocaleString("en-IN")}`} />
        </View>

        <View style={styles.panelCard}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelTitle}>Payment Console</Text>
              <Text style={styles.panelMeta}>Demo gateway with locally saved receipt history</Text>
            </View>
            <View style={[styles.statusChip, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusChipText, { color: statusColor }]}>{status}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <DetailPill icon="wallet-outline" label="Backend Paid" value={`Rs ${backendPaid.toLocaleString("en-IN")}`} />
            <DetailPill icon="sparkles-outline" label="Demo Paid" value={`Rs ${successfulLocalAmount.toLocaleString("en-IN")}`} />
          </View>

          <TouchableOpacity
            style={[styles.payBtn, due <= 0 && styles.payBtnDisabled]}
            onPress={handleOpenGateway}
            disabled={due <= 0}
          >
            <Ionicons name="flash-outline" size={18} color="#FFF" />
            <Text style={styles.payText}>
              {due > 0 ? `Open Demo Gateway for Rs ${due.toLocaleString("en-IN")}` : "All Fees Paid"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          <Text style={styles.sectionMeta}>
            {paymentStats.count} transaction(s), {paymentStats.successful} successful, Rs {paymentStats.totalPaidHistory.toLocaleString("en-IN")} paid
          </Text>
        </View>

        {mergedHistory.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No payment records found.</Text>
          </View>
        ) : (
          mergedHistory.map((item) => {
            const itemSuccess = ["paid", "success"].includes(
              String(item?.status || "").toLowerCase()
            );

            return (
              <View key={item._id} style={styles.historyCard}>
                <Ionicons
                  name={itemSuccess ? "checkmark-circle" : "close-circle"}
                  size={24}
                  color={itemSuccess ? "#22C55E" : "#EF4444"}
                />

                <View style={styles.historyCopy}>
                  <View style={styles.historyTopRow}>
                    <Text style={styles.amount}>Rs {Number(item?.amount || 0).toLocaleString("en-IN")}</Text>
                    <View style={[styles.sourceBadge, item.source === "local" && styles.sourceBadgeLocal]}>
                      <Text style={[styles.sourceText, item.source === "local" && styles.sourceTextLocal]}>
                        {item.source === "local" ? "DEMO" : "SERVER"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.historyDate}>
                    {item?.date ? new Date(item.date).toDateString() : "Date unavailable"}
                  </Text>
                  <Text style={styles.historySubtext}>
                    {item.method || "Online"} via {item.gateway || "Gateway"}
                  </Text>
                  <Text style={styles.historySubtext}>Receipt: {item.receiptId || item._id}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={gatewayVisible} transparent animationType="slide" onRequestClose={() => !paying && setGatewayVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.gatewaySheet}>
            <View style={styles.gatewayHandle} />
            <Text style={styles.gatewayTitle}>Demo Payment Gateway</Text>
            <Text style={styles.gatewaySubtitle}>
              Yeh testing flow hai. Successful payment local history mein save hogi aur history page par show hogi.
            </Text>

            <View style={styles.gatewaySummary}>
              <View>
                <Text style={styles.gatewaySummaryLabel}>Payable Amount</Text>
                <Text style={styles.gatewayAmount}>Rs {due.toLocaleString("en-IN")}</Text>
              </View>
              <View style={styles.secureBadge}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#86EFAC" />
                <Text style={styles.secureText}>Demo Secure</Text>
              </View>
            </View>

            {paymentMethods.map((method) => {
              const active = selectedMethod === method.key;
              return (
                <TouchableOpacity
                  key={method.key}
                  style={[styles.methodCard, active && styles.methodCardActive]}
                  onPress={() => setSelectedMethod(method.key)}
                >
                  <View style={styles.methodIconWrap}>
                    <Ionicons
                      name={method.icon}
                      size={20}
                      color={active ? "#38BDF8" : "#94A3B8"}
                    />
                  </View>
                  <View style={styles.methodCopy}>
                    <Text style={styles.methodTitle}>{method.key}</Text>
                    <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
                  </View>
                  <Ionicons
                    name={active ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={active ? "#38BDF8" : "#64748B"}
                  />
                </TouchableOpacity>
              );
            })}

            <View style={styles.gatewayActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setGatewayVisible(false)}
                disabled={paying}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleCompletePayment}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Pay Now</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={successModal} transparent animationType="fade" onRequestClose={() => setSuccessModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Ionicons name="checkmark-circle" size={70} color="#22C55E" />
            <Text style={styles.modalText}>Payment Successful</Text>
            <Text style={styles.modalSubtext}>
              Rs {Number(lastPayment?.amount || 0).toLocaleString("en-IN")} received via {lastPayment?.method || "Gateway"}
            </Text>
            <Text style={styles.modalReceipt}>Receipt: {lastPayment?.receiptId || "Generated"}</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSuccessModal(false)}
            >
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

function DetailPill({ icon, label, value }) {
  return (
    <View style={styles.detailPill}>
      <Ionicons name={icon} size={16} color="#38BDF8" />
      <Text style={styles.detailPillLabel}>{label}</Text>
      <Text style={styles.detailPillValue}>{value}</Text>
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
  },
  heroStatusRow: {
    marginTop: 18,
  },
  status: {
    fontSize: 24,
    fontWeight: "800",
  },
  dueDate: {
    color: "#94A3B8",
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    width: "31.5%",
    backgroundColor: "#0D1B2A",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  statLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statValue: {
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 8,
    fontSize: 14,
  },
  panelCard: {
    backgroundColor: "#0D1B2A",
    borderRadius: 24,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  panelTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  panelMeta: {
    color: "#7C8CA0",
    marginTop: 4,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 10,
  },
  detailPill: {
    flex: 1,
    backgroundColor: "#08131F",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.08)",
  },
  detailPillLabel: {
    color: "#7C8CA0",
    fontSize: 12,
    marginTop: 10,
  },
  detailPillValue: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginTop: 6,
  },
  payBtn: {
    backgroundColor: "#0EA5E9",
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  payBtnDisabled: {
    backgroundColor: "#334155",
  },
  payText: {
    color: "#fff",
    fontWeight: "800",
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
  historyCard: {
    backgroundColor: "#0D1B2A",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  historyCopy: {
    flex: 1,
    marginLeft: 12,
  },
  historyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  historyDate: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },
  historySubtext: {
    fontSize: 12,
    color: "#7C8CA0",
    marginTop: 3,
  },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
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
  emptyCard: {
    backgroundColor: "#0D1B2A",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  emptyText: {
    color: "#94A3B8",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(2,6,23,0.72)",
    paddingHorizontal: 16,
  },
  gatewaySheet: {
    width: "100%",
    backgroundColor: "#0D1B2A",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  gatewayHandle: {
    width: 56,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#334155",
    alignSelf: "center",
    marginBottom: 18,
  },
  gatewayTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  gatewaySubtitle: {
    color: "#94A3B8",
    marginTop: 8,
    lineHeight: 20,
  },
  gatewaySummary: {
    marginTop: 18,
    marginBottom: 16,
    backgroundColor: "#08131F",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gatewaySummaryLabel: {
    color: "#7C8CA0",
    fontSize: 12,
  },
  gatewayAmount: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34,197,94,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
  },
  secureText: {
    color: "#86EFAC",
    fontWeight: "700",
    fontSize: 12,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#08131F",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.08)",
  },
  methodCardActive: {
    borderColor: "rgba(56,189,248,0.55)",
    backgroundColor: "rgba(14,165,233,0.10)",
  },
  methodIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.9)",
    marginRight: 12,
  },
  methodCopy: {
    flex: 1,
  },
  methodTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  methodSubtitle: {
    color: "#7C8CA0",
    marginTop: 4,
    fontSize: 12,
  },
  gatewayActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#1E293B",
  },
  secondaryBtnText: {
    color: "#CBD5E1",
    fontWeight: "700",
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#0EA5E9",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  modalBox: {
    backgroundColor: "#0D1B2A",
    padding: 30,
    borderRadius: 24,
    alignItems: "center",
    width: "84%",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  modalText: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 15,
    color: "#FFFFFF",
  },
  modalSubtext: {
    color: "#CBD5E1",
    marginTop: 10,
    textAlign: "center",
  },
  modalReceipt: {
    color: "#7C8CA0",
    marginTop: 8,
    fontSize: 12,
  },
  closeBtn: {
    backgroundColor: "#0EA5E9",
    padding: 12,
    borderRadius: 12,
    width: "60%",
    alignItems: "center",
    marginTop: 18,
  },
  closeBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
});
