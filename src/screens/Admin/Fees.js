import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { API_URL as API, resolveImageUrl } from "../../config/api";
const STUDENT_PAYMENT_KEY_PREFIX = "student_dummy_payments:";

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  (typeof error?.response?.data === "string" ? error.response.data : null) ||
  fallbackMessage;

const formatCurrency = (value) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

const resolveProfileImage = (rawUrl, fallbackName = "Student") => {
  return resolveImageUrl(rawUrl, fallbackName);
};

const normalizePayment = (item, sourceKey) => ({
  _id:
    item?._id ||
    item?.id ||
    item?.receiptId ||
    item?.paymentId ||
    `${sourceKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  amount: Number(item?.amount || 0),
  status: String(item?.status || "success").toLowerCase(),
  date: item?.date || item?.createdAt || new Date().toISOString(),
  method: item?.method || item?.paymentMethod || "Online",
  receiptId: item?.receiptId || item?.paymentId || item?._id || "N/A",
  gateway: item?.gateway || "Demo Gateway",
  studentId: item?.studentId || null,
  studentEmail: item?.studentEmail || null,
  studentName: item?.studentName || null,
});

const createEmptyDemoSummary = () => ({
  paidAmount: 0,
  transactionCount: 0,
  lastPaymentDate: null,
  payments: [],
});

export default function Fees() {
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState([]);
  const [demoPaymentMap, setDemoPaymentMap] = useState({});
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const loadDemoPayments = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const paymentKeys = keys.filter((key) => key.startsWith(STUDENT_PAYMENT_KEY_PREFIX));

      if (!paymentKeys.length) {
        return {};
      }

      const keyValuePairs = await AsyncStorage.multiGet(paymentKeys);
      const aggregate = {};

      keyValuePairs.forEach(([storageKey, rawValue]) => {
        const identifierFromKey = storageKey.replace(STUDENT_PAYMENT_KEY_PREFIX, "");
        const parsed = rawValue ? JSON.parse(rawValue) : [];

        if (!Array.isArray(parsed)) return;

        parsed.forEach((entry) => {
          const payment = normalizePayment(entry, storageKey);
          const identifiers = [
            payment.studentId,
            payment.studentEmail,
            identifierFromKey,
          ]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase());

          identifiers.forEach((identifier) => {
            if (!aggregate[identifier]) {
              aggregate[identifier] = createEmptyDemoSummary();
            }

            aggregate[identifier].transactionCount += 1;
            if (["paid", "success"].includes(payment.status)) {
              aggregate[identifier].paidAmount += Number(payment.amount || 0);
            }

            aggregate[identifier].payments.push(payment);

            if (
              !aggregate[identifier].lastPaymentDate ||
              new Date(payment.date).getTime() >
                new Date(aggregate[identifier].lastPaymentDate).getTime()
            ) {
              aggregate[identifier].lastPaymentDate = payment.date;
            }
          });
        });
      });

      return aggregate;
    } catch (error) {
      console.log("Admin demo payments load error:", error?.message || error);
      return {};
    }
  }, []);

  const fetchStudents = useCallback(async (showLoader = true) => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (showLoader) setLoading(true);

    try {
      const [studentsRes, demoPayments] = await Promise.all([
        axios.get(`${API}/student`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        loadDemoPayments(),
      ]);

      setStudents(studentsRes.data.students || []);
      setDemoPaymentMap(demoPayments);
    } catch (error) {
      Alert.alert(
        "Fees Error",
        getErrorMessage(error, "Failed to load students")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadDemoPayments, token]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const getStudentDemoSummary = useCallback(
    (student) => {
      const identifiers = [student?._id, student?.id, student?.email]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      const merged = createEmptyDemoSummary();
      const seenPayments = new Set();

      identifiers.forEach((identifier) => {
        const current = demoPaymentMap[identifier];
        if (!current) return;

        current.payments.forEach((payment) => {
          const paymentKey = payment._id || payment.receiptId;
          if (seenPayments.has(paymentKey)) return;
          seenPayments.add(paymentKey);

          merged.transactionCount += 1;
          if (["paid", "success"].includes(String(payment.status || "").toLowerCase())) {
            merged.paidAmount += Number(payment.amount || 0);
          }
          merged.payments.push(payment);

          if (
            !merged.lastPaymentDate ||
            new Date(payment.date).getTime() > new Date(merged.lastPaymentDate).getTime()
          ) {
            merged.lastPaymentDate = payment.date;
          }
        });
      });

      return merged;
    },
    [demoPaymentMap]
  );

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;

    return students.filter((student) =>
      [student?.name, student?.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [search, students]);

  const assignFee = async () => {
    if (!selectedStudent?._id || !amount || !dueDate) {
      Alert.alert(
        "Missing Details",
        "Student, amount, aur due date sab required hain."
      );
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(
        `${API}/assign`,
        {
          studentId: selectedStudent._id,
          totalAmount: Number(amount),
          dueDate,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert(
        "Fee Assigned",
        `${selectedStudent.name} ko fee successfully assign ho gayi.`
      );
      setModalVisible(false);
      setAmount("");
      setDueDate("");
      setSelectedStudent(null);
      fetchStudents(false);
    } catch (error) {
      Alert.alert(
        "Assign Failed",
        getErrorMessage(error, "Fee assignment failed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudents(false);
  };

  const stats = useMemo(() => {
    const totalStudents = students.length;
    const statusSummary = students.reduce(
      (acc, student) => {
        const totalAmount = Number(student?.fee?.totalAmount || student?.totalAmount || 0);
        const backendPaidAmount = Number(student?.fee?.paidAmount || student?.paidAmount || 0);
        const demoSummary = getStudentDemoSummary(student);
        const combinedPaidAmount = backendPaidAmount + Number(demoSummary?.paidAmount || 0);
        const normalizedStatus =
          totalAmount > 0
            ? combinedPaidAmount >= totalAmount
              ? "paid"
              : combinedPaidAmount > 0
              ? "partial"
              : "unpaid"
            : String(student?.feeStatus || student?.fee?.status || "not assigned").toLowerCase();

        if (normalizedStatus === "paid") acc.paid += 1;
        else if (normalizedStatus === "partial") acc.partial += 1;
        else if (normalizedStatus === "unpaid") acc.unpaid += 1;

        return acc;
      },
      { paid: 0, partial: 0, unpaid: 0 }
    );

    const demoTransactions = Object.values(demoPaymentMap).reduce(
      (sum, item) => sum + Number(item?.transactionCount || 0),
      0
    );
    const demoCollected = Object.values(demoPaymentMap).reduce(
      (sum, item) => sum + Number(item?.paidAmount || 0),
      0
    );

    return {
      totalStudents,
      paid: statusSummary.paid,
      partial: statusSummary.partial,
      unpaid: statusSummary.unpaid,
      demoTransactions,
      demoCollected,
    };
  }, [demoPaymentMap, getStudentDemoSummary, students]);

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
        data={filteredStudents}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={["#1E293B", "#0F172A", "#111827"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroGlowOne} />
              <View style={styles.heroGlowTwo} />
              <Text style={styles.heroEyebrow}>Finance Console</Text>
              <Text style={styles.title}>Student Fees</Text>
              <Text style={styles.heroSubtitle}>
                Search students, assign dues, aur ab demo gateway payments bhi admin side par monitor karein.
              </Text>

              <View style={styles.statsRow}>
                <StatPill label="Students" value={stats.totalStudents} />
                <StatPill label="Paid" value={stats.paid} />
                <StatPill label="Unpaid" value={stats.unpaid} />
              </View>
            </LinearGradient>

            <View style={styles.insightBanner}>
              <View style={styles.insightPill}>
                <Ionicons name="flash-outline" size={14} color="#7DD3FC" />
                <Text style={styles.insightText}>{stats.demoTransactions} demo txn tracked</Text>
              </View>
              <Text style={styles.insightAmount}>{formatCurrency(stats.demoCollected)} demo collected</Text>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                placeholder="Search student by name or email"
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="wallet-outline" size={28} color="#64748B" />
            <Text style={styles.emptyTitle}>No students found</Text>
            <Text style={styles.emptyText}>
              Search result ya fee roster abhi empty hai.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const totalAmount = item?.fee?.totalAmount || item?.totalAmount || 0;
          const backendPaidAmount = item?.fee?.paidAmount || item?.paidAmount || 0;
          const demoSummary = getStudentDemoSummary(item);
          const combinedPaidAmount = backendPaidAmount + Number(demoSummary?.paidAmount || 0);
          const dueAmount = Math.max(totalAmount - combinedPaidAmount, 0);
          const feeStatus =
            dueAmount <= 0 && totalAmount > 0
              ? "Paid"
              : combinedPaidAmount > 0 && totalAmount > 0
              ? "Partial"
              : item?.feeStatus ||
                item?.fee?.status ||
                (totalAmount > 0 ? "Unpaid" : "Not Assigned");

          const statusColor =
            String(feeStatus).toLowerCase() === "paid"
              ? "#22C55E"
              : String(feeStatus).toLowerCase() === "partial"
              ? "#F59E0B"
              : String(feeStatus).toLowerCase() === "not assigned"
              ? "#94A3B8"
              : "#EF4444";

          return (
            <TouchableOpacity
              style={styles.studentCard}
              onPress={() => {
                setSelectedStudent(item);
                setModalVisible(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={styles.avatarWrap}>
                  <Image
                    source={{
                      uri: resolveProfileImage(item?.profileImage, item?.name),
                    }}
                    style={styles.avatarImage}
                  />
                </View>
                <View style={styles.studentCopy}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.email}>{item.email}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${statusColor}20` },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {String(feeStatus).toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.amountRow}>
                <AmountPill
                  label="Assigned"
                  value={formatCurrency(totalAmount)}
                />
                <AmountPill label="Paid" value={formatCurrency(combinedPaidAmount)} />
                <AmountPill label="Due" value={formatCurrency(dueAmount)} />
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaPill}>
                  <Ionicons name="flash-outline" size={14} color="#38BDF8" />
                  <Text style={styles.metaText}>{demoSummary.transactionCount} demo payment(s)</Text>
                </View>
                <Text style={styles.metaDate}>
                  {demoSummary.lastPaymentDate
                    ? `Last demo: ${new Date(demoSummary.lastPaymentDate).toLocaleDateString("en-IN")}`
                    : "No demo payment yet"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Assign Fee</Text>
            <Text style={styles.modalSubtitle}>
              {selectedStudent?.name || "Student"}
            </Text>

            {selectedStudent ? (
              <View style={styles.modalInfoCard}>
                <Text style={styles.modalInfoLabel}>Demo payments tracked</Text>
                <Text style={styles.modalInfoValue}>
                  {getStudentDemoSummary(selectedStudent).transactionCount} transaction(s)
                </Text>
                <Text style={styles.modalInfoHint}>
                  Demo paid amount: {formatCurrency(getStudentDemoSummary(selectedStudent).paidAmount)}
                </Text>
              </View>
            ) : null}

            <TextInput
              placeholder="Total Amount"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
            />

            <TextInput
              placeholder="Due Date (YYYY-MM-DD)"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={dueDate}
              onChangeText={setDueDate}
            />

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={assignFee}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Assign Fee</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

function AmountPill({ label, value }) {
  return (
    <View style={styles.amountPill}>
      <Text style={styles.amountLabel}>{label}</Text>
      <Text style={styles.amountValue}>{value}</Text>
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
  insightBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0D1B2A",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  insightPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(14,165,233,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  insightText: {
    color: "#BAE6FD",
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 6,
  },
  insightAmount: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D1B2A",
    paddingHorizontal: 14,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    paddingVertical: 14,
    marginLeft: 8,
  },
  studentCard: {
    backgroundColor: "#0D1B2A",
    padding: 16,
    borderRadius: 22,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14,165,233,0.16)",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
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
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  amountPill: {
    flex: 1,
    backgroundColor: "#08131F",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginRight: 10,
  },
  amountLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  amountValue: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginTop: 6,
    fontSize: 13,
  },
  metaRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(14,165,233,0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metaText: {
    color: "#BAE6FD",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  metaDate: {
    color: "#7C8CA0",
    fontSize: 12,
    flex: 1,
    textAlign: "right",
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
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  emptyText: {
    color: "#7C8CA0",
    marginTop: 8,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(2,6,23,0.72)",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "#0D1B2A",
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: "#94A3B8",
    marginTop: 4,
    marginBottom: 16,
  },
  modalInfoCard: {
    backgroundColor: "#08131F",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.08)",
  },
  modalInfoLabel: {
    color: "#94A3B8",
    fontSize: 12,
  },
  modalInfoValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 6,
  },
  modalInfoHint: {
    color: "#7C8CA0",
    marginTop: 6,
    fontSize: 12,
  },
  input: {
    backgroundColor: "#08131F",
    color: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  primaryBtn: {
    backgroundColor: "#0EA5E9",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 6,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  cancelBtn: {
    marginTop: 12,
    alignItems: "center",
  },
  cancelText: {
    color: "#F87171",
    fontWeight: "700",
  },
});
