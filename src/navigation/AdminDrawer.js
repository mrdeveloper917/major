import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";

const Drawer = createDrawerNavigator();

function AdminHeader({ navigation, route }) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeHeader}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
          <Ionicons name="menu" size={24} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{route.name}</Text>

        <Ionicons name="shield-outline" size={22} color="#3B82F6" />
      </View>
    </SafeAreaView>
  );
}

function CustomDrawerContent(props) {
  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.projectHeader}>
        <Image
          source={require("../assets/images/icons.png")}
          style={styles.logo}
        />

        <Text style={styles.projectTitle}>Hostel Management System</Text>
        <Text style={styles.projectSub}>Admin Panel </Text>
      </View>

      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  );
}

export default function AdminDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation, route }) => ({
        header: () => <AdminHeader navigation={navigation} route={route} />,
        lazy: true,
        freezeOnBlur: true,
        drawerActiveTintColor: "#3B82F6",
        drawerInactiveTintColor: "#94A3B8",
        drawerStyle: styles.drawer,
        drawerLabelStyle: styles.drawerLabel,
      })}
    >
      <Drawer.Screen
        name="Dashboard"
        getComponent={() => require("../screens/Admin/DashboardPro").default}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="home-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Rooms"
        getComponent={() => require("../screens/Admin/Room").default}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="bed-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Students"
        getComponent={() => require("../screens/Admin/Student").default}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="people-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Complaints"
        getComponent={() => require("../screens/Admin/Complaint").default}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="alert-circle-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Fees"
        getComponent={() => require("../screens/Admin/Fees").default}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="cash-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="LeaveRequests"
        getComponent={() => require("../screens/Admin/LeaveRequests").default}
        options={{
          title: "Leave Requests",
          drawerIcon: ({ color }) => (
            <Ionicons name="calendar-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Profile"
        getComponent={() => require("../screens/Admin/Profile").default}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="person-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="About"
        getComponent={() => require("../screens/Common/About").default}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="AssignRoom"
        getComponent={() => require("../screens/Admin/AssignRoom").default}
        options={{ drawerItemStyle: styles.hidden }}
      />
      <Drawer.Screen
        name="EditProfile"
        getComponent={() => require("../screens/Admin/EditProfile").default}
        options={{ drawerItemStyle: styles.hidden }}
      />
      <Drawer.Screen
        name="ChangePassword"
        getComponent={() => require("../screens/Admin/ChangePassword").default}
        options={{ drawerItemStyle: styles.hidden }}
      />
      <Drawer.Screen
        name="QRScanner"
        getComponent={() => require("../screens/Admin/QRScanner").default}
        options={{ drawerItemStyle: styles.hidden }}
      />
      <Drawer.Screen
        name="RoomChangeRequests"
        getComponent={() => require("../screens/Admin/RoomChangeRequests").default}
        options={{ drawerItemStyle: styles.hidden }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  safeHeader: {
    backgroundColor: "#0F172A",
  },

  header: {
    height: 56,
    backgroundColor: "#0F172A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },

  headerTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },

  drawer: {
    backgroundColor: "#111827",
  },

  drawerLabel: {
    color: "#FFFFFF",
  },

  hidden: {
    height: 0,
  },

  projectHeader: {
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
    marginBottom: 10,
  },

  logo: {
    width: 70,
    height: 70,
    resizeMode: "contain",
    marginBottom: 10,
  },

  projectTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  projectSub: {
    color: "#94A3B8",
    fontSize: 13,
  },
});
