import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
  TextInput,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { API_URL as API, buildApiUrl, resolveImageUrl } from "../../config/api";

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  (typeof error?.response?.data === "string" ? error.response.data : null) ||
  error?.message ||
  fallbackMessage;

const isAdminRole = (role) => String(role || "").trim().toLowerCase() === "admin";

const formatDate = (value) => {
  if (!value) return "Date not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not available";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function Students() {
  const { token, user } = useAuth();
  const navigation = useNavigation();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [imageVersion] = useState(Date.now());

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalData, setModalData] = useState([]);
  const [modalType, setModalType] = useState("");

  const resolveProfileImage = (rawUrl, fallbackName = "Student") => {
    return resolveImageUrl(rawUrl, fallbackName, imageVersion);
  };

  const fetchStudents = useCallback(async (showLoader = true) => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (showLoader) {
      setLoading(true);
    }

    try {
      const res = await axios.get(`${API}/student`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStudents(res.data.students || []);
    } catch (error) {
      Alert.alert(
        "Student Error",
        getErrorMessage(error, "Students list load nahi ho saki.")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const filteredStudents = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) return students;

    return students.filter((student) => {
      const roomLabel = student?.room
        ? `${student.room.block} ${student.room.floor} ${student.room.roomNumber}`
        : "";

      return [student?.name, student?.email, roomLabel]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [searchText, students]);

  const assignedCount = useMemo(
    () => students.filter((student) => student?.room).length,
    [students]
  );

  const openModal = (title, type, data) => {
    setModalTitle(title);
    setModalType(type);
    setModalData(data);
    setModalVisible(true);
  };

  const fetchStudentComplaints = async (studentId) => {
    try {
      const res = await axios.get(`${API}/student/${studentId}/complaints`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      openModal("Student Complaints", "complaints", res.data.complaints || []);
    } catch (error) {
      Alert.alert(
        "Complaint Error",
        getErrorMessage(error, "Complaints load nahi ho sakin.")
      );
    }
  };

  const fetchStudentLeaves = async (studentId) => {
    try {
      const res = await axios.get(`${API}/student/${studentId}/leaves`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      openModal("Student Leave Applications", "leaves", res.data.leaves || []);
    } catch (error) {
      Alert.alert(
        "Leave Error",
        getErrorMessage(error, "Leaves load nahi ho sakin.")
      );
    }
  };

  const deleteStudent = async (student) => {
    if (!student?._id || deletingId) return;

    if (!isAdminRole(user?.role)) {
      Alert.alert("Access denied", "Only admin can remove students.");
      return;
    }

    setDeletingId(student._id);

    try {
      const response = await axios.delete(
        buildApiUrl(`/admin/delete-user/${student._id}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setStudents((prev) => prev.filter((item) => item._id !== student._id));
      Alert.alert(
        "Student Removed",
        response?.data?.message ||
          `${student.name} ko successfully remove kar diya gaya hai.`
      );
    } catch (error) {
      Alert.alert(
        "Remove Failed",
        getErrorMessage(error, "Student remove nahi ho saka.")
      );
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeleteStudent = (student) => {
    Alert.alert(
      "Remove Student",
      `Kya aap ${student?.name || "is student"} ko hostel records se remove karna chahte hain?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => deleteStudent(student),
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudents(false);
  };

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

          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Student Command Panel</Text>
          </View>

          <Text style={styles.heading}>Students Management</Text>
          <Text style={styles.heroSubtitle}>
            Search, assign rooms, review student records, aur zarurat padne par direct remove action.
          </Text>

          <View style={styles.heroStatsRow}>
            <SummaryPill label="Total" value={students.length} />
            <SummaryPill label="Assigned" value={assignedCount} />
            <SummaryPill
              label="Unassigned"
              value={Math.max(students.length - assignedCount, 0)}
            />
          </View>
        </LinearGradient>

        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color="#64748B" />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search by name, email, or room"
              placeholderTextColor="#64748B"
              style={styles.searchInput}
            />
          </View>
          <Text style={styles.searchMeta}>
            Showing {filteredStudents.length} of {students.length} students
          </Text>
        </View>

        {filteredStudents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={28} color="#64748B" />
            <Text style={styles.emptyTitle}>No student found</Text>
            <Text style={styles.emptyText}>
              Search query ko change karke ya refresh karke fir try karein.
            </Text>
          </View>
        ) : (
          filteredStudents.map((student) => {
            const isDeleting = deletingId === student._id;
            const roomLabel = student?.room
              ? `Block ${student.room.block}, Floor ${student.room.floor}, Room ${student.room.roomNumber}`
              : "Room not assigned yet";

            return (
              <View key={student._id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Image
                    source={{
                      uri: resolveProfileImage(student?.profileImage, student?.name),
                    }}
                    style={styles.avatarImage}
                  />

                  <View style={styles.studentCopy}>
                    <Text style={styles.name}>{student.name}</Text>
                    <Text style={styles.email}>{student.email}</Text>
                  </View>

                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {student?.complaints || 0}C / {student?.leaves || 0}L
                    </Text>
                  </View>
                </View>

                <View style={styles.infoPill}>
                  <Ionicons name="home-outline" size={16} color="#38BDF8" />
                  <Text style={styles.infoText}>{roomLabel}</Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.primaryAction}
                    onPress={() =>
                      navigation.navigate("AssignRoom", {
                        studentId: student._id,
                      })
                    }
                  >
                    <Ionicons name="bed-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.primaryActionText}>Assign Room</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.dangerAction,
                      isDeleting && styles.disabledAction,
                    ]}
                    onPress={() => confirmDeleteStudent(student)}
                    disabled={isDeleting || !isAdminRole(user?.role)}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#FCA5A5" />
                    ) : (
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#FCA5A5"
                      />
                    )}
                    <Text style={styles.dangerActionText}>
                      {isDeleting ? "Removing..." : "Remove"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.secondaryRow}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => fetchStudentComplaints(student._id)}
                  >
                    <Text style={styles.secondaryBtnLabel}>Complaints</Text>
                    <Text style={styles.secondaryBtnValue}>
                      {student.complaints || 0}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => fetchStudentLeaves(student._id)}
                  >
                    <Text style={styles.secondaryBtnLabel}>Leaves</Text>
                    <Text style={styles.secondaryBtnValue}>
                      {student.leaves || 0}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{modalTitle}</Text>
                <Text style={styles.modalSubtitle}>
                  {modalData.length} record found
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseIcon}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={18} color="#E2E8F0" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {modalData.length === 0 ? (
                <View style={styles.emptyModalCard}>
                  <Text style={styles.emptyModalText}>No records found</Text>
                </View>
              ) : (
                modalData.map((item) => (
                  <View key={item._id} style={styles.modalCard}>
                    {modalType === "complaints" ? (
                      <>
                        <Text style={styles.modalBold}>
                          {item.title || "Untitled complaint"}
                        </Text>
                        <Text style={styles.modalText}>
                          {item.description || "No description available"}
                        </Text>
                        <Text style={styles.modalStatus}>
                          Status: {item.status || "pending"}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.modalBold}>
                          {formatDate(item.fromDate)} to {formatDate(item.toDate)}
                        </Text>
                        <Text style={styles.modalText}>
                          {item.reason || "No reason available"}
                        </Text>
                        <Text style={styles.modalStatus}>
                          Status: {item.status || "pending"}
                        </Text>
                      </>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SummaryPill({ label, value }) {
  return (
    <View style={styles.summaryPill}>
      <Text style={styles.summaryPillLabel}>{label}</Text>
      <Text style={styles.summaryPillValue}>{value}</Text>
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
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(14,165,233,0.16)",
    top: -35,
    right: -30,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(239,68,68,0.12)",
    bottom: -20,
    left: -16,
  },
  liveBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 16,
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
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroSubtitle: {
    color: "#CBD5E1",
    lineHeight: 21,
    marginTop: 8,
    maxWidth: "94%",
  },
  heroStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  summaryPillLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  summaryPillValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
  },
  searchCard: {
    backgroundColor: "#0D1B2A",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#08131F",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    paddingVertical: 12,
    marginLeft: 10,
  },
  searchMeta: {
    color: "#7C8CA0",
    marginTop: 10,
    fontSize: 12,
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
    fontWeight: "700",
    fontSize: 16,
    marginTop: 12,
  },
  emptyText: {
    color: "#7C8CA0",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#0D1B2A",
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.10)",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: "rgba(14,165,233,0.16)",
  },
  studentCopy: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  email: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 3,
  },
  countBadge: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  countBadgeText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "700",
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#08131F",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#CBD5E1",
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    marginTop: 14,
  },
  primaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0EA5E9",
    paddingVertical: 12,
    borderRadius: 16,
    marginRight: 10,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },
  dangerAction: {
    width: 120,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.24)",
    paddingVertical: 12,
    borderRadius: 16,
  },
  disabledAction: {
    opacity: 0.7,
  },
  dangerActionText: {
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },
  secondaryRow: {
    flexDirection: "row",
    marginTop: 12,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#08131F",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginRight: 10,
  },
  secondaryBtnLabel: {
    color: "#94A3B8",
    fontSize: 12,
  },
  secondaryBtnValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.72)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "82%",
    backgroundColor: "#0B1521",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalSubtitle: {
    color: "#7C8CA0",
    marginTop: 4,
  },
  modalCloseIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#122033",
  },
  emptyModalCard: {
    backgroundColor: "#122033",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
  },
  emptyModalText: {
    color: "#94A3B8",
  },
  modalCard: {
    backgroundColor: "#122033",
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
  },
  modalBold: {
    fontWeight: "800",
    marginBottom: 8,
    color: "#FFFFFF",
  },
  modalText: {
    color: "#CBD5E1",
    lineHeight: 20,
  },
  modalStatus: {
    color: "#7DD3FC",
    marginTop: 10,
    fontWeight: "700",
  },
});
