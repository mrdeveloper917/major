import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";

const API = "https://hostel-backend-major.onrender.com/api";

const isToday = (value) => {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const getPayloadCandidates = (responseData) => {
  const direct = responseData?.data ?? responseData;

  return [
    direct,
    direct?.records,
    direct?.attendance,
    direct?.logs,
    direct?.entries,
    direct?.history,
  ].filter(Boolean);
};

const extractRecords = (responseData) => {
  const candidates = getPayloadCandidates(responseData);

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

const normalizeFromSummary = (payload) => ({
  entriesToday:
    payload.entriesToday ??
    payload.totalEntriesToday ??
    payload.todayEntries ??
    payload.entryCount ??
    0,
  exitsToday:
    payload.exitsToday ??
    payload.totalExitsToday ??
    payload.todayExits ??
    payload.exitCount ??
    0,
  currentlyInside:
    payload.currentlyInside ??
    payload.insideCount ??
    payload.presentInside ??
    payload.studentsInside ??
    0,
  totalScans:
    payload.totalScans ??
    payload.totalAttendanceScans ??
    payload.scanCount ??
    ((payload.entriesToday ?? payload.totalEntriesToday ?? payload.todayEntries ?? 0) +
      (payload.exitsToday ?? payload.totalExitsToday ?? payload.todayExits ?? 0)),
});

const normalizeAction = (record) => {
  const rawValue =
    record?.type ||
    record?.scanType ||
    record?.action ||
    record?.status ||
    record?.direction ||
    "";

  return String(rawValue).toLowerCase();
};

const normalizeFromRecords = (records) => {
  const todayRecords = records.filter((item) =>
    isToday(item?.createdAt || item?.updatedAt || item?.timestamp || item?.date)
  );

  let entriesToday = 0;
  let exitsToday = 0;
  const latestByStudent = new Map();

  todayRecords.forEach((record) => {
    const action = normalizeAction(record);
    const studentId =
      record?.studentId?._id ||
      record?.studentId ||
      record?.student?._id ||
      record?.student;

    if (action.includes("in") || action.includes("entry")) {
      entriesToday += 1;
    } else if (action.includes("out") || action.includes("exit")) {
      exitsToday += 1;
    }

    if (studentId) {
      latestByStudent.set(String(studentId), action);
    }
  });

  let currentlyInside = 0;
  latestByStudent.forEach((action) => {
    if (action.includes("in") || action.includes("entry")) {
      currentlyInside += 1;
    }
  });

  return {
    entriesToday,
    exitsToday,
    currentlyInside,
    totalScans: todayRecords.length,
  };
};

export default function AttendanceAnalytics() {
  const { token } = useAuth();
  const navigation = useNavigation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setErrorMessage("Authentication required");
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const analyticsRoutes = [
        "/attendance/analytics",
        "/attendance/stats",
        "/attendance/summary",
        "/admin/attendance/analytics",
      ];

      let normalizedData = null;
      let lastError = null;

      for (const route of analyticsRoutes) {
        try {
          const res = await axios.get(`${API}${route}`, {
            headers,
            timeout: 15000,
          });
          const payload = res.data?.data || res.data || {};
          normalizedData = normalizeFromSummary(payload);

          if (normalizedData.totalScans > 0 || normalizedData.currentlyInside > 0) {
            break;
          }
        } catch (error) {
          lastError = error;
        }
      }

      if (
        !normalizedData ||
        (normalizedData.entriesToday === 0 &&
          normalizedData.exitsToday === 0 &&
          normalizedData.currentlyInside === 0 &&
          normalizedData.totalScans === 0)
      ) {
        const recordRoutes = ["/attendance", "/attendance/logs", "/attendance/history"];

        for (const route of recordRoutes) {
          try {
            const res = await axios.get(`${API}${route}`, {
              headers,
              timeout: 15000,
            });
            const records = extractRecords(res.data);

            if (records.length) {
              normalizedData = normalizeFromRecords(records);
              break;
            }
          } catch (error) {
            lastError = error;
          }
        }
      }

      if (!normalizedData) {
        throw lastError || new Error("Attendance analytics unavailable");
      }

      setData(normalizedData);
      setErrorMessage("");
    } catch (error) {
      console.log("Analytics Error:", error?.response?.data || error?.message);

      if (error.response?.status === 401) {
        setErrorMessage("Unauthorized - Please login again");
      } else if (error.message === "Network Error") {
        setErrorMessage("Attendance server unreachable right now");
      } else {
        setErrorMessage("Unable to load attendance analytics");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [fetchAnalytics])
  );

  /* ================= REFRESH ================= */
  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  /* ================= ERROR ================= */
  if (errorMessage) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchAnalytics}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ================= NO DATA ================= */
  if (!data) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorText}>No Data Found</Text>
      </View>
    );
  }

  /* ================= UI ================= */
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient
          colors={["#1E293B", "#0F172A", "#111827"]}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <TouchableOpacity
              style={styles.heroBack}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live Analytics</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Attendance Analytics</Text>
          <Text style={styles.heroSubtitle}>
            Monitor entries, exits, and current occupancy in real time.
          </Text>
        </LinearGradient>

        <View style={styles.grid}>
          <AnalyticsCard
            icon="log-in-outline"
            label="Entries Today"
            value={data.entriesToday}
            color="#22C55E"
          />
          <AnalyticsCard
            icon="log-out-outline"
            label="Exits Today"
            value={data.exitsToday}
            color="#F97316"
          />
          <AnalyticsCard
            icon="home-outline"
            label="Currently Inside"
            value={data.currentlyInside}
            color="#3B82F6"
          />
          <AnalyticsCard
            icon="scan-outline"
            label="Total Scans"
            value={data.totalScans}
            color="#A855F7"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AnalyticsCard({ icon, label, value, color }) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value ?? 0}</Text>
    </View>
  );
}

/* ================= STYLES ================= */

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
    paddingHorizontal: 24,
  },

  hero: {
    marginTop: 14,
    marginBottom: 18,
    padding: 20,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },

  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  heroBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
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
    fontWeight: "700",
    fontSize: 12,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },

  heroSubtitle: {
    color: "#CBD5E1",
    lineHeight: 20,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    width: "48.5%",
    backgroundColor: "#0D1B2A",
    padding: 18,
    borderRadius: 22,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  label: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },

  value: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 6,
  },

  errorText: {
    color: "#EF4444",
    fontSize: 16,
    textAlign: "center",
  },

  retryBtn: {
    marginTop: 16,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
