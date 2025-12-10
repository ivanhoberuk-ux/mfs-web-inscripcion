import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Modal, ActivityIndicator, Platform, Image, Animated } from 'react-native';
import { colors, spacing, radius, shadows } from '../lib/designSystem';

const N8N_WEBHOOK_URL = 'https://elviajero80.app.n8n.cloud/webhook/6e841b5c-79dd-46fe-baa0-d55c57ec50c0/chat';
const MISIONERITO_AVATAR = 'https://npekpdkywsneylddzzuu.supabase.co/storage/v1/object/public/logos/ChatGPT%20Image%202%20dic%202025%2C%2018_23_38.png';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '¡Hola! Soy Misionerito, tu asistente de las MFS. ¿En qué puedo ayudarte?',
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const bubbleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate bubble in after a short delay
    const timer = setTimeout(() => {
      Animated.spring(bubbleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }, 1000);

    // Auto-hide bubble after 8 seconds
    const hideTimer = setTimeout(() => {
      Animated.timing(bubbleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowBubble(false));
    }, 8000);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  async function sendMessage() {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatInput: userMessage.text,
          sessionId: 'mfs-chat-' + (Platform.OS === 'web' ? 'web' : 'app'),
        }),
      });

      const data = await response.json();
      console.log('n8n response:', JSON.stringify(data, null, 2));
      
      // n8n puede devolver la respuesta en varios formatos
      let responseText = 'Lo siento, no pude procesar tu mensaje.';
      if (typeof data === 'string') {
        responseText = data;
      } else if (Array.isArray(data) && data.length > 0) {
        // n8n a veces devuelve un array
        const firstItem = data[0];
        responseText = firstItem.output || firstItem.text || firstItem.response || firstItem.message || JSON.stringify(firstItem);
      } else if (data.output) {
        responseText = data.output;
      } else if (data.text) {
        responseText = data.text;
      } else if (data.response) {
        responseText = data.response;
      } else if (data.message) {
        responseText = data.message;
      }
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Lo siento, hubo un error al conectar con el asistente. Por favor, intentá de nuevo.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Speech Bubble */}
      {showBubble && !isOpen && (
        <Animated.View 
          style={[
            styles.speechBubble,
            {
              opacity: bubbleAnim,
              transform: [
                { scale: bubbleAnim },
                { translateY: bubbleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })}
              ]
            }
          ]}
        >
          <Text style={styles.speechBubbleText}>¡Hola!! Estoy aquí para ayudarte 💬</Text>
          <View style={styles.speechBubbleArrow} />
        </Animated.View>
      )}

      {/* Floating Button */}
      <Pressable
        style={styles.floatingButton}
        onPress={() => {
          setShowBubble(false);
          setIsOpen(true);
        }}
      >
        <Image source={{ uri: MISIONERITO_AVATAR }} style={styles.floatingButtonImage} />
      </Pressable>

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.chatContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Image source={{ uri: MISIONERITO_AVATAR }} style={styles.headerAvatar} />
                <Text style={styles.headerTitle}>Misionerito</Text>
              </View>
              <Pressable onPress={() => setIsOpen(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
            >
              {messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    message.isUser ? styles.userMessage : styles.botMessage,
                  ]}
                >
                  <Text style={[
                    styles.messageText,
                    message.isUser ? styles.userMessageText : styles.botMessageText,
                  ]}>
                    {message.text}
                  </Text>
                </View>
              ))}
              {isLoading && (
                <View style={[styles.messageBubble, styles.botMessage]}>
                  <ActivityIndicator size="small" color={colors.primary[600]} />
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Escribí tu mensaje..."
                placeholderTextColor={colors.text.tertiary.light}
                onSubmitEditing={sendMessage}
                editable={!isLoading}
              />
              <Pressable
                style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!inputText.trim() || isLoading}
              >
                <Text style={styles.sendButtonText}>➤</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  speechBubble: {
    position: 'absolute',
    bottom: 150,
    right: 20,
    backgroundColor: '#ffffff',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    maxWidth: 200,
    zIndex: 1001,
    ...shadows.lg,
  },
  speechBubbleText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary.light,
    textAlign: 'center',
  },
  speechBubbleArrow: {
    position: 'absolute',
    bottom: -8,
    right: 50,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  floatingButtonImage: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    backgroundColor: colors.surface.light,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
    minHeight: 400,
    ...shadows.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary.light,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.text.secondary.light,
  },
  messagesContainer: {
    flex: 1,
    minHeight: 250,
  },
  messagesContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.sm,
    borderRadius: radius.lg,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary[600],
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.neutral[100],
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#ffffff',
  },
  botMessageText: {
    color: colors.text.primary.light,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    borderRadius: radius.lg,
    paddingLeft: spacing.xl,
    paddingRight: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text.primary.light,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  sendButtonText: {
    fontSize: 20,
    color: '#ffffff',
  },
});
