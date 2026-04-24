import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";

export default function AssignRoom() {
  const { token } = useAuth();
  const navigation = useNavigation();

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");

  const [block, setBlock] = useState("");
  const [floor, setFloor] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [capacity, setCapacity] = useState("4");

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  const API = "https://hostel-backend-major.onrender.com/api";

  /* ================= FETCH STUDENTS ================= */
  useEffect(() => {
    fetchStudents();
  }, [token]);

  const fetchStudents = async () => {
    try {
      setFetchLoading(true);

      const res = await axios.get(`${API}/student`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStudents(res.data.students || []);
    } catch (error) {
      Alert.alert("Error", "Failed to load students");
    } finally {
      setFetchLoading(false);
    }
  };

  /* ================= ASSIGN ROOM ================= */
  const assignRoom = async () => {
    if (!selectedStudent || !block || !floor || !roomNumber) {
      return Alert.alert("Error", "All fields required");
    }

    try {
      setLoading(true);

      await axios.post(
        `${API}/admin/rooms/manual-assign`,
        {
          studentId: selectedStudent,
          block,
          floor: Number(floor),
          roomNumber,
          capacity: Number(capacity),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert("Success", "Room assigned successfully");

      // Reset form
      setBlock("");
      setFloor("");
      setRoomNumber("");
      setSelectedStudent("");

      // ✅ optional navigation back
      navigation.goBack();

    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Assignment failed"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= LOADING ================= */
  if (fetchLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Manual Room Allocation</Text>

        {/* STUDENT PICKER */}
        <View style={styles.card}>
          <Text style={styles.label}>Select Student</Text>

          <Picker
            selectedValue={selectedStudent}
            onValueChange={(value) => setSelectedStudent(value)}
            style={styles.picker}
            dropdownIconColor="#FFFFFF"
          >
            <Picker.Item label="Select Student" value="" />

            {students.map((s) => (
              <Picker.Item key={s._id} label={s.name} value={s._id} />
            ))}
          </Picker>
        </View>

        {/* INPUTS */}
        <TextInput
          placeholder="Block (A/B/C)"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          value={block}
          onChangeText={setBlock}
        />

        <TextInput
          placeholder="Floor"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          style={styles.input}
          value={floor}
          onChangeText={setFloor}
        />

        <TextInput
          placeholder="Room Number"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          value={roomNumber}
          onChangeText={setRoomNumber}
        />

        <TextInput
          placeholder="Capacity"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          style={styles.input}
          value={capacity}
          onChangeText={setCapacity}
        />

        {/* BUTTON */}
        <TouchableOpacity style={styles.button} onPress={assignRoom}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Allocate Room</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 16,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    color: "#FFFFFF",
  },

  card: {
    backgroundColor: "#1E293B",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },

  label: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginBottom: 8,
  },

  picker: {
    color: "#FFFFFF",
  },

  input: {
    backgroundColor: "#1E293B",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#334155",
  },

  button: {
    backgroundColor: "#3B82F6",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },

  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});