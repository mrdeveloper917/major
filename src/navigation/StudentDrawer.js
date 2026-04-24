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

function StudentHeader({ navigation, route }) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeHeader}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
          <Ionicons name="menu" size={24} color="#FFF" />
        </TouchableOpacity>

        <Text numberOfLines={1} style={styles.headerTitle}>
          {route.name}
        </Text>

        <Ionicons name="school-outline" size={22} color="#3B82F6" />
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
      </View>

      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  );
}

export default function StudentDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation, route }) => ({
        header: () => <StudentHeader navigation={navigation} route={route} />,
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
        getComponent={() => require("../screens/Student/Dashboard").default}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="home-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="MyRoom"
        getComponent={() => require("../screens/Student/MyRoom").default}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="bed-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Complaints"
        getComponent={() => require("../screens/Student/Complaints").default}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="alert-circle-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Fees"
        getComponent={() => require("../screens/Student/Fees").default}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="cash-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="PaymentHistory"
        getComponent={() => require("../screens/Student/PaymentHistory").default}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="receipt-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="RoomChange"
        getComponent={() => require("../screens/Student/RoomChange").default}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons
              name="swap-horizontal-outline"
              size={20}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="Leave"
        getComponent={() => require("../screens/Student/Leave").default}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="calendar-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Profile"
        getComponent={() => require("../screens/Student/Profile").default}
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
        name="QrCode"
        getComponent={() => require("../screens/Student/QrCode").default}
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
    flex: 1,
    textAlign: "center",
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
});
