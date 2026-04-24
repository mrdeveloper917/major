import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function Index() {
  const navigation = useNavigation();

  /* ================= UI ================= */
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/icons.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Hostel Management System</Text>

      <Text style={styles.subtitle}>
        Smart Living • Easy Management • Secure System
      </Text>

      {/* LOGIN */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.btnText}>Login</Text>
      </TouchableOpacity>

      {/* REGISTER */}
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate("Register")}
      >
        <Text style={styles.secondaryText}>Register</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 40,
    textAlign: "center",
  },

  primaryBtn: {
    width: "100%",
    backgroundColor: "#3B82F6",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },

  secondaryBtn: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#3B82F6",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },

  btnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  secondaryText: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "600",
  },
});
