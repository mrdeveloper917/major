import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axios from "axios";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import { useAuth } from "../../context/AuthContext";
import { buildApiUrl } from "../../config/api";

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallbackMessage;

const formatTime = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ChatScreenSimple({ navigation }) {
  const { user, token, socket } = useAuth();

  const currentUserId = user?._id || user?.id;
  const currentUserRole = String(user?.role || "").trim().toLowerCase();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const listRef = useRef(null);
  const pollingRef = useRef(null);
  const lastHealthCheckRef = useRef(0);

  const canSend = Boolean(String(message).trim() && !sending);

  const showToast = (type, text1, text2) => {
    Toast.show({ type, text1, text2 });
  };

  const requestWithFallback = useCallback(
    async ({ primary, fallback, method = "get", data, headers, timeout = 10000 }) => {
      try {
        return await axios({
          url: buildApiUrl(primary),
          method,
          data,
          headers,
          timeout,
        });
      } catch (primaryError) {
        const status = primaryError?.response?.status;
        const shouldTryFallback =
          Boolean(fallback) && (!status || status === 404 || status === 400 || status >= 500);

        if (!shouldTryFallback) {
          throw primaryError;
        }

        return axios({
          url: buildApiUrl(fallback),
          method,
          data,
          headers,
          timeout,
        });
      }
    },
    []
  );

  const ensureServerAwake = useCallback(async () => {
    const now = Date.now();
    if (now - lastHealthCheckRef.current < 30000) {
      return;
    }

    await axios.get(buildApiUrl("/health"), {
      timeout: 20000,
    });

    lastHealthCheckRef.current = Date.now();
  }, []);

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (first, second) =>
        new Date(first.createdAt || 0).getTime() - new Date(second.createdAt || 0).getTime()
    );
  }, [messages]);
  const onlineCount = useMemo(
    () => onlineUsers.filter((userId) => String(userId) !== String(currentUserId)).length,
    [currentUserId, onlineUsers]
  );

  const fetchMessages = useCallback(async (showLoader = true) => {
    if (!token) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    try {
      if (showLoader) {
        setLoadingMessages(true);
      }

      await ensureServerAwake();

      const response = await requestWithFallback({
        primary: "/chat/shared",
        fallback: "/messages/shared",
        method: "get",
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      const nextMessages = Array.isArray(response.data?.messages)
        ? response.data.messages
        : [];

      setMessages(nextMessages);
    } catch (error) {
      showToast(
        "error",
        "Chat unavailable",
        getErrorMessage(
          error,
          "Please check your internet connection or wait a moment for the server to wake up."
        )
      );
    } finally {
      setLoadingMessages(false);
    }
  }, [ensureServerAwake, requestWithFallback, token]);

  useEffect(() => {
    fetchMessages(true);
  }, [fetchMessages]);

  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (!token) return undefined;

    pollingRef.current = setInterval(() => {
      fetchMessages(false);
    }, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [fetchMessages, token]);

  useEffect(() => {
    if (!socket || !currentUserId) {
      return undefined;
    }

    socket.emit("chat:join", { userId: currentUserId });

    const handleIncomingMessage = (incoming) => {
      setMessages((prev) => {
        const exists = prev.some((item) => String(item._id) === String(incoming._id));
        return exists ? prev : [...prev, incoming];
      });
    };

    const handlePresence = (payload) => {
      setOnlineUsers((prev) => {
        const userId = String(payload?.userId || "");
        if (!userId) return prev;

        if (payload?.online) {
          return prev.includes(userId) ? prev : [...prev, userId];
        }

        return prev.filter((item) => item !== userId);
      });
    };

    socket.on("chat:message", handleIncomingMessage);
    socket.on("presence:update", handlePresence);

    return () => {
      socket.off("chat:message", handleIncomingMessage);
      socket.off("presence:update", handlePresence);
    };
  }, [socket, currentUserId]);

  useEffect(() => {
    if (!sortedMessages.length) return;

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [sortedMessages]);

  const sendMessage = async () => {
    const trimmedMessage = String(message || "").trim();
    if (!trimmedMessage || sending) return;

    try {
      setSending(true);

      await ensureServerAwake();

      const response = await requestWithFallback({
        primary: "/chat/send",
        fallback: "/messages/send-shared",
        method: "post",
        data: { message: trimmedMessage },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      const savedMessage = response.data?.message;
      if (savedMessage) {
        setMessages((prev) => [...prev, savedMessage]);
      }
      setMessage("");
    } catch (error) {
      showToast(
        "error",
        "Message failed",
        getErrorMessage(
          error,
          "Please check your internet connection or wait a moment for the server to wake up."
        )
      );
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const senderId = item?.senderId?._id || item?.senderId;
    const isMine = String(senderId) === String(currentUserId);
    const senderName = item?.senderId?.name || (isMine ? "You" : "Student");
    const roleLabel =
      String(item?.senderId?.role || "").trim().toLowerCase() === "admin"
        ? "Admin"
        : "Student";

    return (
      <View style={[styles.messageRow, isMine ? styles.messageRowRight : styles.messageRowLeft]}>
        <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.otherBubble]}>
          {!isMine ? (
            <Text style={styles.senderLabel}>
              {senderName} • {roleLabel}
            </Text>
          ) : null}
          <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.otherMessageText]}>
            {item.message}
          </Text>
          <Text style={[styles.timeText, isMine ? styles.myTimeText : styles.otherTimeText]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
              return;
            }

            navigation.toggleDrawer?.();
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#E2E8F0" />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Hostel Chat</Text>
          <Text style={styles.headerSubtitle}>
            {onlineCount > 0 ? `${onlineCount} user(s) online` : "Shared admin and student chat"}
          </Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {currentUserRole === "admin" ? "Admin" : "Student"}
          </Text>
        </View>
      </View>

      {loadingMessages ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loaderText}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={sortedMessages}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyChatState}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>Send the first message to start this chat.</Text>
            </View>
          }
        />
      )}

      <View style={styles.inputBar}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          editable={!sending}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!canSend}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07111A",
  },
  header: {
    backgroundColor: "#0B1B29",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.16)",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#132637",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#132637",
  },
  roleBadgeText: {
    color: "#7DD3FC",
    fontSize: 12,
    fontWeight: "700",
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  messageRow: {
    marginBottom: 12,
  },
  messageRowLeft: {
    alignItems: "flex-start",
  },
  messageRowRight: {
    alignItems: "flex-end",
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  myBubble: {
    backgroundColor: "#0EA5E9",
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "#132637",
    borderBottomLeftRadius: 4,
  },
  senderLabel: {
    color: "#7DD3FC",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: "#FFFFFF",
  },
  otherMessageText: {
    color: "#E2E8F0",
  },
  timeText: {
    marginTop: 6,
    fontSize: 11,
  },
  myTimeText: {
    color: "rgba(255,255,255,0.80)",
    textAlign: "right",
  },
  otherTimeText: {
    color: "#94A3B8",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0B1B29",
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.16)",
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    backgroundColor: "#132637",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    color: "#F8FAFC",
  },
  sendButton: {
    marginLeft: 10,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#93C5FD",
  },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 10,
    color: "#94A3B8",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyChatState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 120,
  },
  emptyTitle: {
    marginTop: 14,
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    marginTop: 8,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
