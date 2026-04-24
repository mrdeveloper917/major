import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";

export default function Dashboard() {
  const { token } = useAuth();
  const navigation = useNavigation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const API = "https://hostel-backend-major.onrender.com/api";

  useEffect(() => {
    if (!token) return;

    const fetchDashboard = async () => {
      try {
        const res = await axios.get(`${API}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("DASHBOARD DATA:", res.data);

        setData(res.data || {});
      } catch (error) {
        console.log("Dashboard error:", error?.response?.data);
        setData({});
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [token]);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <LinearGradient
          colors={["#1E293B", "#0F172A"]}
          style={styles.headerCard}
        >
          <Text style={styles.welcome}>Welcome Back 👋</Text>
          <Text style={styles.subText}>Hostel Overview</Text>
        </LinearGradient>

        {/* STATS */}
        <View style={styles.grid}>
          <StatCard icon="people-outline" value={data?.totalStudents || 0} label="Students " color="#3B82F6" />
          <StatCard icon="bed-outline" value={data?.totalRooms || 0} label="Rooms " color="#22C55E" />
          <StatCard icon="alert-circle-outline" value={data?.complaints?.pending || 0} label="Pending " color="#EF4444" />
          <StatCard icon="checkmark-done-outline" value={data?.complaints?.resolved || 0} label="Resolved " color="#10B981" />
        </View>

      </ScrollView>

      {/* FLOATING BUTTONS */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("QRScanner")}
        >
          <Ionicons name="scan-outline" size={26} color="#FFF" />
        </TouchableOpacity>

      </View>

    </SafeAreaView>
  );
}

/* ================= STAT CARD ================= */

function StatCard({ icon, value, label, color }) {
  return (
    <View style={[styles.statCard, { borderColor: color }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 18,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },

  headerCard: {
    padding: 22,
    borderRadius: 22,
    marginBottom: 25,
  },

  welcome: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },

  subText: {
    color: "#94A3B8",
    marginTop: 6,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  statCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 18,
    borderRadius: 18,
    marginBottom: 18,
    borderWidth: 1,
    alignItems: "center",
  },

  statValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginVertical: 8,
  },

  statLabel: {
    color: "#94A3B8",
    fontSize: 13,
  },

  fabContainer: {
    position: "absolute",
    bottom: 25,
    right: 20,
  },

  fab: {
    backgroundColor: "#22C55E",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    marginBottom: 12,
  },

});
