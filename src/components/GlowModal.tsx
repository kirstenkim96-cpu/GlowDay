// src/components/GlowModal.tsx
// GlowDay 커스텀 모달 - 앱 디자인에 맞는 팝업

import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated, Dimensions,
} from 'react-native';

interface ModalButton {
  text: string;
  onPress: () => void;
  style?: 'default' | 'primary' | 'danger';
}

interface GlowModalProps {
  visible: boolean;
  emoji?: string;
  title: string;
  message?: string;
  buttons?: ModalButton[];
  onClose: () => void;
}

export default function GlowModal({ visible, emoji, title, message, buttons, onClose }: GlowModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 65, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const finalButtons = buttons || [{ text: '확인', onPress: onClose, style: 'primary' }];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={{
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)', opacity: opacityAnim,
      }}>
        <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          activeOpacity={1} onPress={onClose} />
        <Animated.View style={{
          width: Dimensions.get('window').width - 64,
          backgroundColor: '#FDFCFB', borderRadius: 24,
          overflow: 'hidden', transform: [{ scale: scaleAnim }],
          shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15, shadowRadius: 24, elevation: 8,
        }}>
          {/* Content */}
          <View style={{ padding: 28, alignItems: 'center' }}>
            {emoji && <Text style={{ fontSize: 44, marginBottom: 12 }}>{emoji}</Text>}
            <Text style={{
              fontSize: 18, fontWeight: '700', color: '#2C2C2A',
              textAlign: 'center', marginBottom: message ? 8 : 0,
            }}>{title}</Text>
            {message && (
              <Text style={{
                fontSize: 14, color: '#888780', textAlign: 'center', lineHeight: 20,
              }}>{message}</Text>
            )}
          </View>

          {/* Buttons */}
          <View style={{
            borderTopWidth: 1, borderTopColor: '#f0eeeb',
            flexDirection: finalButtons.length > 2 ? 'column' : 'row',
          }}>
            {finalButtons.map((btn, i) => {
              const isLast = i === finalButtons.length - 1;
              const isPrimary = btn.style === 'primary';
              const isDanger = btn.style === 'danger';
              return (
                <TouchableOpacity key={i} onPress={btn.onPress} activeOpacity={0.7}
                  style={{
                    flex: finalButtons.length <= 2 ? 1 : undefined,
                    paddingVertical: 16, alignItems: 'center',
                    borderRightWidth: (finalButtons.length <= 2 && !isLast) ? 1 : 0,
                    borderBottomWidth: (finalButtons.length > 2 && !isLast) ? 1 : 0,
                    borderColor: '#f0eeeb',
                    backgroundColor: isPrimary ? '#D4537E' : 'transparent',
                    borderBottomLeftRadius: (isLast && finalButtons.length <= 2 && i === 0) || (isLast && finalButtons.length > 2) ? 24 : 0,
                    borderBottomRightRadius: isLast ? 24 : 0,
                    ...(isPrimary && finalButtons.length <= 2 ? { margin: 12, borderRadius: 14, flex: 1.5 } : {}),
                  }}>
                  <Text style={{
                    fontSize: 15, fontWeight: '600',
                    color: isPrimary ? '#fff' : isDanger ? '#E8789A' : '#888780',
                  }}>{btn.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
