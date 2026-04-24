import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function QrCode() {
  const { user } = useAuth();
  const entryCode = user?._id || "No-ID";
  const canRenderQr = entryCode !== "No-ID";
  const qrImageUri = canRenderQr
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        entryCode
      )}`
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My QR Pass</Text>
      <Text style={styles.subtitle}>Show this QR at the hostel gate</Text>

      <View style={styles.codeCard}>
        <View style={styles.qrWrapper}>
          {canRenderQr ? (
            <Image source={{ uri: qrImageUri }} style={styles.qrImage} />
          ) : (
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrPlaceholderText}>QR NOT AVAILABLE</Text>
            </View>
          )}
        </View>

        <Text style={styles.codeLabel}>Entry ID</Text>
        <Text selectable style={styles.codeValue}>
          {entryCode}
        </Text>
      </View>

      <Text style={styles.info}>
        Show this entry ID at the hostel gate for now.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },

  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
  },

  codeCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#111827",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.35)",
    alignItems: "center",
  },

  qrWrapper: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 20,
  },

  qrPlaceholder: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  qrImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
  },

  qrPlaceholderText: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 1,
  },

  codeLabel: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 18,
    textTransform: "uppercase",
  },

  codeValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },

  info: {
    color: "#94A3B8",
    marginTop: 20,
    textAlign: "center",
  },
});
