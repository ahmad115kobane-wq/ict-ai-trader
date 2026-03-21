// src/screens/IndicatorChatScreen.tsx
// شاشة الدردشة مع AI لإنشاء وتعديل المؤشرات

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

import { indicatorService } from '../services/apiService';
import { colors, spacing, borderRadius, fontSizes } from '../theme';
import { useCustomAlert } from '../hooks/useCustomAlert';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  hasCode?: boolean;
  indicatorName?: string;
};

const QUICK_PROMPTS = [
  { label: 'SMA / EMA', prompt: 'أنشئ مؤشر Moving Average مع SMA 20 و EMA 50 بألوان مختلفة' },
  { label: 'RSI', prompt: 'أنشئ مؤشر RSI بفترة 14 مع خطوط 30 و 70' },
  { label: 'Bollinger Bands', prompt: 'أنشئ مؤشر Bollinger Bands بفترة 20 وانحراف معياري 2' },
  { label: 'MACD', prompt: 'أنشئ مؤشر MACD مع خط الإشارة والهيستوغرام' },
  { label: 'Support/Resistance', prompt: 'أنشئ مؤشر يكتشف مستويات الدعم والمقاومة تلقائياً ويرسمها على الشارت' },
  { label: 'Volume Profile', prompt: 'أنشئ مؤشر حجم التداول مع تلوين حسب الاتجاه (أخضر للشراء، أحمر للبيع)' },
];

const IndicatorChatScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'IndicatorChat'>>();
  const indicatorId = (route.params as any)?.indicatorId;
  const indicatorName = (route.params as any)?.indicatorName;

  const { showSuccess, showError, AlertComponent } = useCustomAlert();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndicatorId, setCurrentIndicatorId] = useState<string | null>(indicatorId || null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (indicatorId) {
      loadChatHistory();
    } else {
      setMessages([{
        id: 'welcome',
        role: 'system',
        content: '👋 مرحباً! أنا مساعد إنشاء المؤشرات بالذكاء الاصطناعي.\n\nصف لي المؤشر الذي تريد إنشاءه وسأقوم ببرمجته لك. يمكنك أيضاً اختيار أحد المؤشرات الجاهزة أدناه.',
      }]);
    }
  }, []);

  const loadChatHistory = async () => {
    if (!indicatorId) return;
    setLoadingHistory(true);
    try {
      const result = await indicatorService.getChatHistory(indicatorId);
      if (result.success && result.messages?.length > 0) {
        const chatMsgs: ChatMessage[] = result.messages.map((m: any, i: number) => ({
          id: `hist-${i}`,
          role: m.role,
          content: m.content,
        }));
        setMessages([
          {
            id: 'edit-welcome',
            role: 'system',
            content: `✏️ تعديل المؤشر: ${indicatorName || 'مؤشر مخصص'}\n\nأخبرني بالتعديلات التي تريدها وسأقوم بتحديث الكود.`,
          },
          ...chatMsgs,
        ]);
      } else {
        setMessages([{
          id: 'edit-welcome',
          role: 'system',
          content: `✏️ تعديل المؤشر: ${indicatorName || 'مؤشر مخصص'}\n\nأخبرني بالتعديلات التي تريدها.`,
        }]);
      }
    } catch (error) {
      console.error('Load chat history error:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendMessage = async (text?: string) => {
    const msg = text || inputText.trim();
    if (!msg || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: msg,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const result = await indicatorService.aiCreate(msg, currentIndicatorId || undefined);

      if (result.success) {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: result.hasCode
            ? `✅ ${result.message}\n\nالمؤشر جاهز! يمكنك تفعيله من قائمة المؤشرات في الصفحة الرئيسية.`
            : result.message,
          hasCode: result.hasCode,
          indicatorName: result.indicator?.name_ar || result.indicator?.name,
        };

        setMessages(prev => [...prev, aiMsg]);

        if (result.hasCode && result.indicator) {
          setCurrentIndicatorId(result.indicator.id);
          showSuccess('تم بنجاح', result.message);
        }
      }
    } catch (error: any) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '❌ عذراً، حدث خطأ. حاول مرة أخرى.',
      };
      setMessages(prev => [...prev, errMsg]);
      showError('خطأ', 'فشل في الاتصال بالذكاء الاصطناعي');
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.role === 'system') {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
        </View>
      );
    }

    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="code-slash" size={14} color={colors.primary} />
          </View>
        )}
        <View style={[styles.messageContent, isUser ? styles.userContent : styles.aiContent]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>{item.content}</Text>
          {item.hasCode && (
            <View style={styles.codeIndicator}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.codeIndicatorText}>تم إنشاء الكود بنجاح</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderQuickPrompts = () => (
    <View style={styles.quickPromptsContainer}>
      <Text style={styles.quickPromptsTitle}>مؤشرات شائعة</Text>
      <View style={styles.quickPromptsGrid}>
        {QUICK_PROMPTS.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.quickPromptChip}
            onPress={() => sendMessage(item.prompt)}
            disabled={isLoading}
          >
            <Ionicons name="flash" size={14} color={colors.primary} />
            <Text style={styles.quickPromptText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="code-slash" size={20} color={colors.primary} />
          <Text style={styles.headerTitle}>
            {currentIndicatorId ? 'تعديل المؤشر' : 'إنشاء مؤشر بالـ AI'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loadingHistory ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <>
                {messages.length <= 1 && !currentIndicatorId && renderQuickPrompts()}
                {isLoading && (
                  <View style={styles.typingIndicator}>
                    <View style={styles.aiAvatar}>
                      <Ionicons name="code-slash" size={14} color={colors.primary} />
                    </View>
                    <View style={styles.typingDots}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.typingText}>جارٍ البرمجة...</Text>
                    </View>
                  </View>
                )}
              </>
            }
            onContentSizeChange={() => {
              if (messages.length > 1) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
          />
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={currentIndicatorId ? 'اكتب التعديل المطلوب...' : 'صف المؤشر الذي تريد إنشاءه...'}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <AlertComponent />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  systemMessage: {
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  systemMessageText: {
    color: colors.text,
    fontSize: fontSizes.md,
    lineHeight: 22,
    textAlign: 'right',
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  aiBubble: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
    marginTop: 2,
  },
  messageContent: {
    maxWidth: '80%',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  userContent: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },
  aiContent: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  messageText: {
    color: colors.text,
    fontSize: fontSizes.md,
    lineHeight: 22,
    textAlign: 'right',
  },
  userMessageText: {
    color: '#fff',
  },
  codeIndicator: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  codeIndicatorText: {
    color: colors.success,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  typingText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
  quickPromptsContainer: {
    marginTop: spacing.md,
  },
  quickPromptsTitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  quickPromptsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  quickPromptChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  quickPromptText: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: fontSizes.md,
    maxHeight: 100,
    textAlign: 'right',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
});

export default IndicatorChatScreen;
