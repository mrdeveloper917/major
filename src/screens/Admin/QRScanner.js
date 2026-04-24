import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useCodeScanner } from "react-native-vision-camera";

export default function QRScanner() {
  const { token } = useAuth();

  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();

  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);

  const API = "https://hostel-backend-major.onrender.com/api";

  /* ================= PERMISSION ================= */
  useEffect(() => {
    requestPermission();
  }, []);

  /* ================= SCANNER ================= */
  const codeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: async (codes) => {
      if (scanned) return;

      const value = codes[0]?.value;
      if (!value) return;

      setScanned(true);
      setLoading(true);

      try {
        await axios.post(
          `${API}/attendance/scan`,
          { studentId: value },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        Alert.alert("Success ✅", "Attendance Recorded", [
          { text: "OK", onPress: () => setScanned(false) },
        ]);
      } catch {
        Alert.alert("Error ❌", "Scan Failed", [
          { text: "OK", onPress: () => setScanned(false) },
        ]);
      } finally {
        setLoading(false);
      }
    },
  });

  /* ================= NO DEVICE ================= */
  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff" }}>Camera not available</Text>
      </View>
    );
  }

  /* ================= PERMISSION UI ================= */
  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff" }}>Camera permission required</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
      />

      {/* OVERLAY */}
      <View style={styles.overlay}>
        <Text style={styles.title}>Scan Student QR Code</Text>

        <View style={styles.scanBox}>
          {loading && (
            <ActivityIndicator size="large" color="#22C55E" />
          )}
        </View>

        <Text style={styles.subtitle}>
          Align QR code inside the box
        </Text>
      </View>
    </View>
  );
}

const BOX_SIZE = 250;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 30,
  },

  scanBox: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderWidth: 3,
    borderColor: "#22C55E",
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  subtitle: {
    color: "#94A3B8",
    marginTop: 30,
    fontSize: 14,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
});
