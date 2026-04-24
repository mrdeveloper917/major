import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";

const teamMembers = [
  {
    name: "Ayush Thakur",
    role: "Team Leader",
    image: require("../../assets/images/ayush.jpg"),
  },
  {
    name: "Rohan Singh",
    role: "Database Manager",
    image: require("../../assets/images/rohan.jpg"),
  },
  {
    name: "Amrita Kumari",
    role: "Frontend Developer",
    image: require("../../assets/images/amrita.jpg"),
  },
  {
    name: "Priyanshu Raj",
    role: "Backend Developer",
    image: require("../../assets/images/priyanshu.jpg"),
  },
  {
    name: "Ravi Ranjan",
    role: "UI/UX Designer",
    image: require("../../assets/images/ravi.jpg"),
  },
];

const highlights = [
  {
    icon: "business-outline",
    label: "Hostel Operations",
    text: "Students, rooms, fees, complaints, aur leave workflows ko one app mein manage karta hai.",
  },
  {
    icon: "shield-checkmark-outline",
    label: "Secure Roles",
    text: "Admin aur student journeys ko role-based access ke saath separate rakha gaya hai.",
  },
  {
    icon: "chatbubble-ellipses-outline",
    label: "Live Updates",
    text: "Status changes aur hostel actions real-time experience ko support karte hain.",
  },
];

const terms = [
  "This app is intended for hostel management purposes only.",
  "Users must provide accurate and valid information.",
  "Misuse of the system may lead to account suspension.",
  "Admin has authority over room allocation and complaint workflows.",
  "User data should be handled responsibly and securely.",
];

export default function About() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#1E293B", "#0F172A", "#111827"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />
          <Text style={styles.heroEyebrow}>About Platform</Text>
          <Text style={styles.title}>Hostel Management System</Text>
          <Text style={styles.subtitle}>
            A student-admin workflow platform designed to simplify hostel operations with a modern mobile experience.
          </Text>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>What This App Does</Text>
          <Text style={styles.sectionMeta}>Core product capabilities at a glance</Text>
        </View>

        {highlights.map((item) => (
          <View key={item.label} style={styles.highlightCard}>
            <View style={styles.highlightIconWrap}>
              <Ionicons name={item.icon} size={18} color="#38BDF8" />
            </View>
            <View style={styles.highlightCopy}>
              <Text style={styles.highlightTitle}>{item.label}</Text>
              <Text style={styles.highlightText}>{item.text}</Text>
            </View>
          </View>
        ))}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Our Team</Text>
          <Text style={styles.sectionMeta}>The people behind the project</Text>
        </View>

        <View style={styles.teamContainer}>
          {teamMembers.map((member) => (
            <TeamMember
              key={member.name}
              name={member.name}
              role={member.role}
              image={member.image}
            />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          <Text style={styles.sectionMeta}>Basic usage guidelines for the platform</Text>
        </View>

        <View style={styles.card}>
          {terms.map((item) => (
            <View key={item} style={styles.termRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#22C55E" />
              <Text style={styles.termText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Feedback</Text>
          <Text style={styles.sectionMeta}>Help us improve the experience</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.feedbackText}>
            We value your feedback to continuously improve design, usability, and hostel workflows.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => Linking.openURL("mailto:ayush@example.com")}
          >
            <Ionicons name="mail-outline" size={18} color="#FFF" />
            <Text style={styles.buttonText}>Send Feedback</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TeamMember({ name, role, image }) {
  return (
    <View style={styles.memberCard}>
      <Image source={image} style={styles.avatar} />
      <Text style={styles.memberName}>{name}</Text>
      <Text style={styles.memberRole}>{role}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07111A",
    paddingHorizontal: 16,
  },
  hero: {
    marginTop: 14,
    marginBottom: 16,
    padding: 22,
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
    top: -30,
    right: -35,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(34,197,94,0.12)",
    bottom: -18,
    left: -10,
  },
  heroEyebrow: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: "#FFF",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 10,
  },
  subtitle: {
    color: "#CBD5E1",
    lineHeight: 21,
    marginTop: 8,
    maxWidth: "95%",
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
  },
  sectionMeta: {
    color: "#94A3B8",
    marginTop: 4,
  },
  highlightCard: {
    flexDirection: "row",
    backgroundColor: "#0D1B2A",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  highlightIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#08131F",
    marginRight: 12,
  },
  highlightCopy: {
    flex: 1,
  },
  highlightTitle: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 15,
  },
  highlightText: {
    color: "#94A3B8",
    marginTop: 6,
    lineHeight: 20,
  },
  teamContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  memberCard: {
    width: "48.5%",
    backgroundColor: "#0D1B2A",
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    marginBottom: 10,
  },
  memberName: {
    color: "#FFF",
    fontWeight: "800",
    textAlign: "center",
  },
  memberRole: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#0D1B2A",
    padding: 18,
    borderRadius: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  termRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  termText: {
    color: "#CBD5F5",
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  feedbackText: {
    color: "#CBD5F5",
    lineHeight: 21,
  },
  button: {
    marginTop: 14,
    backgroundColor: "#0EA5E9",
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "800",
    marginLeft: 8,
  },
});
