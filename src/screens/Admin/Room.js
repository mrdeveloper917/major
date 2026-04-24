import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

const API = "https://hostel-backend-major.onrender.com/api";

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  (typeof error?.response?.data === "string" ? error.response.data : null) ||
  fallbackMessage;

export default function Rooms() {
  const { token } = useAuth();
  const navigation = useNavigation();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [block, setBlock] = useState("");
  const [floor, setFloor] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [capacity, setCapacity] = useState("");

  const fetchRooms = async (showLoader = true) => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (showLoader) setLoading(true);

    try {
      const res = await axios.get(`${API}/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRooms(res.data.rooms || []);
    } catch (error) {
      Alert.alert("Room Error", getErrorMessage(error, "Failed to load rooms"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [token]);

  const addRoom = async () => {
    if (!block || !floor || !roomNumber || !capacity) {
      Alert.alert("Missing Details", "Block, floor, room number, aur capacity sab required hain.");
      return;
    }

    try {
      setSubmitting(true);

      await axios.post(
        `${API}/rooms`,
        {
          block,
          floor: Number(floor),
          roomNumber,
          capacity: Number(capacity),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBlock("");
      setFloor("");
      setRoomNumber("");
      setCapacity("");
      Alert.alert("Room Added", "New room inventory mein add ho gaya hai.");
      fetchRooms(false);
    } catch (error) {
      Alert.alert("Add Failed", getErrorMessage(error, "Room creation failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRooms(false);
  };

  const roomStats = useMemo(() => {
    const total = rooms.length;
    const occupied = rooms.filter((room) => {
      const occupants = Array.isArray(room?.occupants) ? room.occupants.length : 0;
      return occupants > 0 || room?.status === "occupied" || room?.status === "full";
    }).length;
    const full = rooms.filter((room) => room?.status === "full").length;
    const available = Math.max(total - occupied, 0);

    return { total, occupied, available, full };
  }, [rooms]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#22C55E" />
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
          <Text style={styles.heroEyebrow}>Rooms Control Center</Text>
          <Text style={styles.title}>Hostel Room Operations</Text>
          <Text style={styles.heroSubtitle}>
            Real inventory, occupancy overview, aur fast room creation ek hi place par.
          </Text>

          <View style={styles.statsRow}>
            <StatPill label="Total" value={roomStats.total} />
            <StatPill label="Occupied" value={roomStats.occupied} />
            <StatPill label="Available" value={roomStats.available} />
          </View>
        </LinearGradient>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate("RoomChangeRequests")}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="swap-horizontal-outline" size={20} color="#34D399" />
          </View>
          <View style={styles.quickActionCopy}>
            <Text style={styles.quickActionTitle}>Room Change Requests</Text>
            <Text style={styles.quickActionSub}>Review pending moves and approvals</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Add New Room</Text>
          <Text style={styles.sectionMeta}>Create a room record for hostel inventory</Text>

          <View style={styles.inputGrid}>
            <TextInput
              placeholder="Block"
              placeholderTextColor="#64748B"
              style={styles.input}
              value={block}
              onChangeText={setBlock}
            />
            <TextInput
              placeholder="Floor"
              placeholderTextColor="#64748B"
              style={styles.input}
              keyboardType="numeric"
              value={floor}
              onChangeText={setFloor}
            />
            <TextInput
              placeholder="Room Number"
              placeholderTextColor="#64748B"
              style={styles.input}
              value={roomNumber}
              onChangeText={setRoomNumber}
            />
            <TextInput
              placeholder="Capacity"
              placeholderTextColor="#64748B"
              style={styles.input}
              keyboardType="numeric"
              value={capacity}
              onChangeText={setCapacity}
            />
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={addRoom} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Add Room</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live Room Inventory</Text>
          <Text style={styles.sectionMeta}>{rooms.length} rooms synced from backend</Text>
        </View>

        {rooms.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="bed-outline" size={28} color="#64748B" />
            <Text style={styles.emptyTitle}>No rooms available</Text>
            <Text style={styles.emptyText}>Create your first room to start hostel allocation.</Text>
          </View>
        ) : (
          rooms.map((room) => {
            const occupants = Array.isArray(room?.occupants) ? room.occupants.length : 0;
            const availableBeds = Math.max((room?.capacity || 0) - occupants, 0);
            const statusColor =
              room?.status === "full"
                ? "#EF4444"
                : room?.status === "occupied"
                ? "#F59E0B"
                : "#22C55E";

            return (
              <View key={room._id} style={styles.roomCard}>
                <View style={styles.roomHeader}>
                  <View style={styles.roomIconWrap}>
                    <Ionicons name="bed-outline" size={18} color="#38BDF8" />
                  </View>
                  <View style={styles.roomCopy}>
                    <Text style={styles.roomTitle}>Block {room.block} • Floor {room.floor} • Room {room.roomNumber}</Text>
                    <Text style={styles.roomSub}>Capacity {room.capacity || 0} • Occupied {occupants} • Free {availableBeds}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{String(room?.status || "available").toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
    backgroundColor: "rgba(34,197,94,0.16)",
    top: -30,
    right: -40,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(56,189,248,0.14)",
    bottom: -20,
    left: -10,
  },
  heroEyebrow: {
    color: "#86EFAC",
    fontWeight: "700",
    fontSize: 12,
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
    maxWidth: "92%",
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
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D1B2A",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
    marginBottom: 14,
  },
  quickActionIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(34,197,94,0.12)",
    marginRight: 12,
  },
  quickActionCopy: {
    flex: 1,
  },
  quickActionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  quickActionSub: {
    color: "#7C8CA0",
    marginTop: 4,
    fontSize: 12,
  },
  formCard: {
    backgroundColor: "#0D1B2A",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
    marginBottom: 16,
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
  inputGrid: {
    marginTop: 16,
  },
  input: {
    backgroundColor: "#08131F",
    color: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  primaryBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  roomCard: {
    backgroundColor: "#0D1B2A",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
    marginBottom: 12,
  },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  roomIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(56,189,248,0.12)",
    marginRight: 12,
  },
  roomCopy: {
    flex: 1,
  },
  roomTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    lineHeight: 20,
  },
  roomSub: {
    color: "#94A3B8",
    marginTop: 4,
    fontSize: 12,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
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
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
