import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

const API = "https://hostel-backend-major.onrender.com/api";

export default function MyRoom() {
  const { token, user } = useAuth();
  const navigation = useNavigation();

  const [room, setRoom] = useState(null);
  const [student, setStudent] = useState(user || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fallbackRoom = useMemo(() => {
    const roomNumber = student?.room?.roomNumber || student?.roomNumber;

    if (!roomNumber) {
      return null;
    }

    return {
      roomNumber,
      floor: student?.room?.floor || student?.floorNumber || "N/A",
      block: student?.room?.block || student?.hostelName || "N/A",
      type: student?.room?.type || "Standard",
      status: student?.room?.status || "occupied",
      capacity: student?.room?.capacity || 1,
      occupants: Array.isArray(student?.room?.occupants)
        ? student.room.occupants
        : [],
      isFallback: true,
    };
  }, [student]);

  const fetchRoom = useCallback(async () => {
    try {
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [roomRes, studentRes] = await Promise.allSettled([
        axios.get(`${API}/rooms/my`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/student/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const roomData =
        roomRes.status === "fulfilled"
          ? roomRes.value?.data?.room || roomRes.value?.data?.data?.room || null
          : null;

      const studentData =
        studentRes.status === "fulfilled"
          ? studentRes.value?.data?.student ||
            studentRes.value?.data?.user ||
            studentRes.value?.data?.data?.student ||
            studentRes.value?.data?.data?.user ||
            studentRes.value?.data?.data ||
            null
          : null;

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

      setRoom(roomData);
    } catch (error) {
      console.log("Room fetch error:", error?.response?.data || error?.message);
      setRoom(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (token) {
      fetchRoom();
    } else {
      setLoading(false);
    }
  }, [token, fetchRoom]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRoom();
  };

  const displayRoom = room || fallbackRoom;

  if (loading && !displayRoom) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  if (!displayRoom) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyCard}>
          <Ionicons name="bed-outline" size={30} color="#64748B" />
          <Text style={styles.emptyTitle}>No room assigned yet</Text>
          <Text style={styles.emptyText}>
            Aapke account ke saath abhi koi room linked nahi hai.
          </Text>

          <TouchableOpacity
            style={styles.changeBtn}
            onPress={() => navigation.navigate("RoomChange")}
          >
            <Ionicons name="swap-horizontal-outline" size={18} color="#fff" />
            <Text style={styles.changeBtnText}>Request Room Change</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const occupants = Array.isArray(displayRoom.occupants)
    ? displayRoom.occupants
    : [];
  const availableBeds = Math.max((displayRoom?.capacity || 0) - occupants.length, 0);

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
          <Text style={styles.heroEyebrow}>Room Overview</Text>
          <Text style={styles.roomNumber}>Room {displayRoom?.roomNumber ?? "N/A"}</Text>
          <Text style={styles.roomType}>
            {(displayRoom?.type ?? "Standard").toUpperCase()} • Floor {displayRoom?.floor ?? "N/A"}
          </Text>
          <Text style={styles.hostelText}>Hostel {displayRoom?.block ?? "N/A"}</Text>

          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>
              {displayRoom?.isFallback
                ? "REGISTERED DETAILS"
                : String(displayRoom?.status || "unknown").toUpperCase()}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <StatCard label="Capacity" value={displayRoom?.capacity ?? 0} />
          <StatCard label="Occupied" value={occupants.length} />
          <StatCard label="Free Beds" value={availableBeds} />
        </View>

        <TouchableOpacity
          style={styles.changeBtn}
          onPress={() => navigation.navigate("RoomChange")}
        >
          <Ionicons name="swap-horizontal-outline" size={20} color="#fff" />
          <Text style={styles.changeBtnText}>Request Room Change</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Roommates</Text>
          <Text style={styles.sectionMeta}>People currently sharing your room</Text>
        </View>

        {occupants.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyText}>
              {displayRoom?.isFallback
                ? "Room assignment not linked yet, showing registered room details."
                : "No roommates assigned right now."}
            </Text>
          </View>
        ) : (
          occupants.map((person) => (
            <View key={person?._id || person?.email || person?.name} style={styles.occupantCard}>
              <View style={styles.occupantAvatar}>
                <Text style={styles.occupantAvatarText}>
                  {person?.name?.slice(0, 1)?.toUpperCase() || "R"}
                </Text>
              </View>
              <View style={styles.occupantInfo}>
                <Text style={styles.occupantName}>{person?.name ?? "Unknown"}</Text>
                <Text style={styles.occupantEmail}>{person?.email ?? "N/A"}</Text>
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
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#07111A",
  },
  hero: {
    marginTop: 14,
    marginBottom: 16,
    padding: 24,
    borderRadius: 28,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  heroGlowOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(14,165,233,0.18)",
    top: -25,
    right: -35,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(34,197,94,0.12)",
    bottom: -15,
    left: -10,
  },
  heroEyebrow: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  roomNumber: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 14,
    color: "#FFFFFF",
  },
  roomType: {
    color: "#CBD5E1",
    marginTop: 6,
    fontWeight: "600",
  },
  hostelText: {
    color: "#94A3B8",
    marginTop: 6,
  },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 14,
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
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
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 8,
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
  occupantCard: {
    backgroundColor: "#0D1B2A",
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  occupantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14,165,233,0.16)",
  },
  occupantAvatarText: {
    color: "#38BDF8",
    fontSize: 18,
    fontWeight: "800",
  },
  occupantInfo: {
    marginLeft: 12,
    flex: 1,
  },
  occupantName: {
    fontWeight: "800",
    color: "#FFFFFF",
    fontSize: 15,
  },
  occupantEmail: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },
  changeBtn: {
    backgroundColor: "#0EA5E9",
    padding: 15,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
  },
  changeBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginLeft: 8,
  },
  emptyCard: {
    flex: 1,
    backgroundColor: "#0D1B2A",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
    marginTop: 14,
  },
  emptyStateCard: {
    backgroundColor: "#0D1B2A",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 12,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 10,
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 21,
  },
});
