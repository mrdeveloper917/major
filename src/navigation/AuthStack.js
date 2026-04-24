import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";

const Stack = createNativeStackNavigator();

function BootScreen() {
  return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );
}

export default function AuthStack() {
  const { user, loading } = useAuth();

  if (loading) {
    return <BootScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          {user.role === "admin" ? (
            <Stack.Screen
              name="AdminDrawer"
              getComponent={() => require("./AdminDrawer").default}
            />
          ) : (
            <Stack.Screen
              name="StudentDrawer"
              getComponent={() => require("./StudentDrawer").default}
            />
          )}
        </>
      ) : (
        <>
          <Stack.Screen
            name="Index"
            getComponent={() => require("../screens/Auth/Index").default}
          />
          <Stack.Screen
            name="Login"
            getComponent={() => require("../screens/Auth/Login").default}
          />
          <Stack.Screen
            name="Register"
            getComponent={() => require("../screens/Auth/Register").default}
          />
          <Stack.Screen
            name="ForgotPassword"
            getComponent={() => require("../screens/Auth/ForgotPassword").default}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
});
