import React, {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { InteractionManager } from "react-native";
import axios from "axios";
import { io } from "socket.io-client";
import { AUTH_API_URL, SOCKET_URL } from "../config/api";

const AuthContext = createContext();

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return null;
  }

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : authorizationHeader;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  const updateUser = useCallback(async (nextUser) => {
    if (!nextUser) return;

    setUser(nextUser);
    await AsyncStorage.setItem("user", JSON.stringify(nextUser));
  }, []);

  const refreshUser = useCallback(async (authToken) => {
    if (!authToken) return null;

    try {
      const response = await axios.get(`${AUTH_API_URL}/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000,
      });

      const freshUser =
        response.data?.user ||
        response.data?.data?.user ||
        response.data?.data ||
        null;

      if (freshUser) {
        await updateUser(freshUser);
        return freshUser;
      }

      return null;
    } catch (error) {
      console.log("REFRESH USER ERROR:", error?.response?.data || error?.message || error);
      return null;
    }
  }, [updateUser]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const entries = await AsyncStorage.multiGet(["token", "user"]);
        const savedToken = entries.find(([key]) => key === "token")?.[1];
        const savedUser = entries.find(([key]) => key === "user")?.[1];

        if (savedToken && savedUser) {
          axios.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          refreshUser(savedToken).catch(() => {});

          InteractionManager.runAfterInteractions(() => {
            setTimeout(() => {
              connectSocket(savedToken);
            }, 300);
          });
        }
      } catch (error) {
        console.log("Auto login error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [refreshUser]);

  const connectSocket = (authToken) => {
    try {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const newSocket = io(SOCKET_URL, {
        auth: { token: authToken },
        transports: ["websocket"],
      });

      newSocket.on("connect", () => {
        console.log("Socket Connected:", newSocket.id);
      });

      newSocket.on("disconnect", () => {
        console.log("Socket Disconnected");
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
    } catch (error) {
      console.log("Socket error:", error);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${AUTH_API_URL}/login`, {
        email,
        password,
      });

      console.log("LOGIN RESPONSE:", response.data);

      if (!response.data.user) {
        throw new Error(response.data.message || "Login failed");
      }

      const loggedInUser = response.data.user;
      const authToken =
        response.data.token ||
        response.data.accessToken ||
        response.data.jwt ||
        response.data.data?.token ||
        response.data.data?.accessToken ||
        response.data.user?.token ||
        response.data.user?.accessToken ||
        response.data.user?.jwt ||
        extractBearerToken(response.headers?.authorization) ||
        extractBearerToken(response.headers?.Authorization) ||
        null;

      if (!authToken) {
        console.log("LOGIN HEADERS:", response.headers);
        throw new Error("Login token not received from server");
      }

      await AsyncStorage.multiSet([
        ["token", authToken],
        ["user", JSON.stringify(loggedInUser)],
      ]);

      axios.defaults.headers.common.Authorization = `Bearer ${authToken}`;

      setToken(authToken);
      setUser(loggedInUser);
      refreshUser(authToken).catch(() => {});

      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          connectSocket(authToken);
        }, 300);
      });

      return loggedInUser;
    } catch (error) {
      console.log("LOGIN ERROR:", error?.response?.data || error.message || error);
      throw error;
    }
  };

  const register = async (data) => {
    await axios.post(`${AUTH_API_URL}/register`, data);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(["token", "user"]);

    delete axios.defaults.headers.common.Authorization;

    if (socket) {
      socket.disconnect();
    }

    socketRef.current = null;
    setSocket(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        socket,
        login,
        register,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
