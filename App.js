import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider } from "./src/context/AuthContext";
import AuthStack from "./src/navigation/AuthStack";
import "react-native-reanimated";
import Toast from "react-native-toast-message";

export default function App() {
  return (
    <AuthProvider>
      <>
        <NavigationContainer>
          <AuthStack />
        </NavigationContainer>
        <Toast />
      </>
    </AuthProvider>
  );
}
