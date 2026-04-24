import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";

const API = "https://hostel-backend-major.onrender.com/api";
const DASHBOARD_CACHE_KEY = "admin_dashboard_cache";

const getErrorMessage = (error, fallbackMessage) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    (typeof error?.response?.data === "string" ? error.response.data : null) ||
    error?.message ||
    fallbackMessage
  );
};

const normalizeOverview = (overviewData, previousDashboard = null) => ({
  totalStudents:
    overviewData?.totalStudents ??
    overviewData?.studentsCount ??
    previousDashboard?.totalStudents ??
    0,
  totalRooms:
    overviewData?.totalRooms ??
    overviewData?.roomsCount ??
    previousDashboard?.totalRooms ??
    0,
  complaints: {
    pending:
      overviewData?.complaints?.pending ??
      overviewData?.pendingComplaints ??
      previousDashboard?.complaints?.pending ??
      0,
    resolved:
      overviewData?.complaints?.resolved ??
      overviewData?.resolvedComplaints ??
      previousDashboard?.complaints?.resolved ??
      0,
  },
  leaves: {
    pending:
      overviewData?.leaves?.pending ??
      previousDashboard?.leaves?.pending ??
      0,
    approved:
      overviewData?.leaves?.approved ??
      previousDashboard?.leaves?.approved ??
      0,
  },
  roomChanges: {
    pending:
      overviewData?.roomChanges?.pending ??
      overviewData?.pendingRoomChanges ??
      previousDashboard?.roomChanges?.pending ??
      0,
  },
  occupancy: {
    occupied:
      overviewData?.occupancy?.occupied ??
      overviewData?.occupiedRooms ??
      previousDashboard?.occupancy?.occupied ??
      0,
    available:
      overviewData?.occupancy?.available ??
      overviewData?.availableRooms ??
      previousDashboard?.occupancy?.available ??
      0,
    rate:
      overviewData?.occupancy?.rate ??
      overviewData?.occupancyRate ??
      previousDashboard?.occupancy?.rate ??
      0,
  },
});

export default function DashboardPro() {
  const { token, socket } = useAuth();
  const navigation = useNavigation();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const persistDashboard = useCallback(async (nextDashboard, syncedAt = new Date()) => {
    try {
      await AsyncStorage.setItem(
        DASHBOARD_CACHE_KEY,
        JSON.stringify({
          dashboard: nextDashboard,
          lastSync: syncedAt.toISOString(),
        })
      );
    } catch (error) {
      console.log("Admin dashboard cache error:", error?.message || error);
    }
  }, []);

  const hydrateFromCache = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const cached = await AsyncStorage.getItem(DASHBOARD_CACHE_KEY);
      if (!cached) {
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(cached);
      if (parsed?.dashboard) {
        setDashboard(parsed.dashboard);
        setLastSync(parsed?.lastSync ? new Date(parsed.lastSync) : null);
      }
    } catch (error) {
      console.log("Admin dashboard hydrate error:", error?.message || error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchDashboard = useCallback(
    async (showError = false) => {
      if (!token) {
        setDashboard(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const overviewRes = await axios.get(`${API}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000,
        });
        const overviewData = overviewRes?.data || {};
        const initialDashboard = normalizeOverview(overviewData, dashboard);
        const syncedAt = new Date();

        setDashboard(initialDashboard);
        setLastSync(syncedAt);
        setLoading(false);
        await persistDashboard(initialDashboard, syncedAt);

        const [complaintsRes, leavesRes, roomsRes, roomChangeRes] =
          await Promise.allSettled([
            axios.get(`${API}/complaints`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 8000,
            }),
            axios.get(`${API}/leaves`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 8000,
            }),
            axios.get(`${API}/rooms`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 8000,
            }),
            axios.get(`${API}/room-change`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 8000,
            }),
          ]);

        const complaints =
          complaintsRes.status === "fulfilled"
            ? Array.isArray(overviewData?.complaintsList)
              ? overviewData.complaintsList
              : complaintsRes.value?.data?.complaints || []
            : [];
        const leaves =
          leavesRes.status === "fulfilled" ? leavesRes.value?.data?.leaves || [] : [];
        const rooms =
          roomsRes.status === "fulfilled" ? roomsRes.value?.data?.rooms || [] : [];
        const roomChanges =
          roomChangeRes.status === "fulfilled"
            ? roomChangeRes.value?.data?.requests || []
            : [];

        const pendingComplaints = complaints.filter(
          (item) => item?.status === "pending"
        ).length;
        const resolvedComplaints = complaints.filter(
          (item) => item?.status === "resolved"
        ).length;
        const pendingLeaves = leaves.filter((item) => item?.status === "pending").length;
        const approvedLeaves = leaves.filter(
          (item) => item?.status === "approved"
        ).length;
        const pendingRoomChanges = roomChanges.filter(
          (item) => item?.status === "pending"
        ).length;

        const occupiedRooms = rooms.filter((room) => {
          const occupants = Array.isArray(room?.occupants) ? room.occupants.length : 0;
          return occupants > 0 || room?.status === "occupied";
        }).length;

        const availableRooms = Math.max(rooms.length - occupiedRooms, 0);
        const occupancyRate = rooms.length
          ? Math.round((occupiedRooms / rooms.length) * 100)
          : initialDashboard?.occupancy?.rate || 0;

        const enrichedDashboard = {
          totalStudents:
            initialDashboard?.totalStudents || overviewData?.totalStudents || 0,
          totalRooms:
            initialDashboard?.totalRooms || overviewData?.totalRooms || rooms.length || 0,
          complaints: {
            pending: initialDashboard?.complaints?.pending ?? pendingComplaints,
            resolved: initialDashboard?.complaints?.resolved ?? resolvedComplaints,
          },
          leaves: {
            pending:
              overviewData?.leaves?.pending ??
              initialDashboard?.leaves?.pending ??
              pendingLeaves,
            approved:
              overviewData?.leaves?.approved ??
              initialDashboard?.leaves?.approved ??
              approvedLeaves,
          },
          roomChanges: {
            pending:
              overviewData?.roomChanges?.pending ??
              initialDashboard?.roomChanges?.pending ??
              pendingRoomChanges,
          },
          occupancy: {
            occupied:
              overviewData?.occupancy?.occupied ??
              initialDashboard?.occupancy?.occupied ??
              occupiedRooms,
            available:
              overviewData?.occupancy?.available ??
              initialDashboard?.occupancy?.available ??
              availableRooms,
            rate:
              overviewData?.occupancy?.rate ??
              initialDashboard?.occupancy?.rate ??
              occupancyRate,
          },
        };

        const enrichedSyncTime = new Date();
        setDashboard(enrichedDashboard);
        setLastSync(enrichedSyncTime);
        await persistDashboard(enrichedDashboard, enrichedSyncTime);
      } catch (error) {
        console.log("Admin dashboard error:", error?.response?.data || error?.message);
        setLoading(false);

        if (showError && !dashboard) {
          Alert.alert(
            "Dashboard Error",
            getErrorMessage(error, "Unable to load admin dashboard")
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dashboard, persistDashboard, token]
  );

  useFocusEffect(
    useCallback(() => {
      hydrateFromCache();
    }, [hydrateFromCache])
  );

  useFocusEffect(
    useCallback(() => {
      fetchDashboard(false);
    }, [fetchDashboard])
  );

  useFocusEffect(
    useCallback(() => {
      if (!socket) return undefined;

      const refresh = () => fetchDashboard(false);

      socket.on("complaintUpdated", refresh);
      socket.on("leaveUpdated", refresh);
      socket.on("roomChangeStatus", refresh);

      return () => {
        socket.off("complaintUpdated", refresh);
        socket.off("leaveUpdated", refresh);
        socket.off("roomChangeStatus", refresh);
      };
    }, [socket, fetchDashboard])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard(true);
  };

  const stats = useMemo(
    () => [
      {
        icon: "people-outline",
        label: "Students",
        value: dashboard?.totalStudents || 0,
        hint: "Registered residents",
        color: "#0EA5E9",
      },
      {
        icon: "bed-outline",
        label: "Rooms",
        value: dashboard?.totalRooms || 0,
        hint: "Hostel inventory",
        color: "#22C55E",
      },
      {
        icon: "alert-circle-outline",
        label: "Pending Complaints",
        value: dashboard?.complaints?.pending || 0,
        hint: "Needs admin action",
        color: "#EF4444",
      },
      {
        icon: "swap-horizontal-outline",
        label: "Room Changes",
        value: dashboard?.roomChanges?.pending || 0,
        hint: "Pending requests",
        color: "#F59E0B",
      },
    ],
    [dashboard]
  );

  const quickActions = [
    {
      icon: "scan-outline",
      title: "Scan Attendance",
      subtitle: "Record student gate entries quickly",
      color: "#22C55E",
      onPress: () => navigation.navigate("QRScanner"),
    },
    {
      icon: "bed-outline",
      title: "Assign Room",
      subtitle: "Manually allocate hostel rooms",
      color: "#8B5CF6",
      onPress: () => navigation.navigate("AssignRoom"),
    },
  ];

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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

          <View style={styles.heroTop}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live Admin Command Center</Text>
            </View>
            <TouchableOpacity
              style={styles.heroChip}
              onPress={() => navigation.navigate("Profile")}
            >
              <Text style={styles.heroChipText}>Admin Profile</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Hostel Operations Dashboard</Text>
          <Text style={styles.subtitle}>
            Real-time hostel overview with student, room, complaint, and leave insights.
          </Text>

          <View style={styles.heroFooter}>
            <View>
              <Text style={styles.heroFooterLabel}>Occupancy Rate</Text>
              <Text style={styles.heroFooterValue}>
                {dashboard?.occupancy?.rate || 0}%
              </Text>
            </View>
            <View>
              <Text style={styles.heroFooterLabel}>Last Sync</Text>
              <Text style={styles.heroFooterValueSmall}>
                {lastSync
                  ? lastSync.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Just now"}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statsGrid}>
          {stats.map((item) => (
            <StatCard
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              hint={item.hint}
              color={item.color}
            />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Operational Snapshot</Text>
          <Text style={styles.sectionMeta}>Current workload and occupancy</Text>
        </View>

        <View style={styles.snapshotCard}>
          <SummaryRow
            label="Occupied Rooms"
            value={dashboard?.occupancy?.occupied || 0}
          />
          <SummaryRow
            label="Available Rooms"
            value={dashboard?.occupancy?.available || 0}
          />
          <SummaryRow
            label="Pending Leaves"
            value={dashboard?.leaves?.pending || 0}
          />
          <SummaryRow
            label="Approved Leaves"
            value={dashboard?.leaves?.approved || 0}
            isLast
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionMeta}>Jump into common admin tasks</Text>
        </View>

        {quickActions.map((item) => (
          <ActionCard
            key={item.title}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            color={item.color}
            onPress={item.onPress}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, hint, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
}

function ActionCard({ icon, title, subtitle, color, onPress }) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={[styles.actionIconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </TouchableOpacity>
  );
}

function SummaryRow({ label, value, isLast = false }) {
  return (
    <View style={[styles.summaryRow, isLast && styles.summaryRowLast]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
    backgroundColor: "rgba(59,130,246,0.18)",
    top: -30,
    right: -40,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(34,197,94,0.12)",
    bottom: -30,
    left: -20,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    fontSize: 12,
    fontWeight: "700",
  },
  heroChip: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroChipText: {
    color: "#E2E8F0",
    fontWeight: "700",
    fontSize: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: "#CBD5E1",
    lineHeight: 21,
    maxWidth: "92%",
  },
  heroFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
  },
  heroFooterLabel: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 4,
  },
  heroFooterValue: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  heroFooterValueSmall: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statCard: {
    width: "48.5%",
    backgroundColor: "#0D1B2A",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  statIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  statLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  statValue: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 20,
  },
  statHint: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 6,
  },
  sectionHeader: {
    marginTop: 10,
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
  snapshotCard: {
    backgroundColor: "#0D1B2A",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.10)",
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    color: "#94A3B8",
    fontSize: 13,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D1B2A",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  actionSubtitle: {
    color: "#7C8CA0",
    marginTop: 4,
    fontSize: 12,
  },
});
