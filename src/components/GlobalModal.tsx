import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { useGlobalStore } from '../store/useGlobalStore';
import { BottomSheet } from '@/shared/ui/templates/bottom-sheet';
import type { BottomSheetMethods } from '@/shared/ui/templates/bottom-sheet/types';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/shared/ui/base/button';

export const GlobalModal = () => {
  const { 
    isErrorModalVisible, 
    errorMessage, 
    hideError,
    isSuccessModalVisible,
    successMessage,
    hideSuccess
  } = useGlobalStore();

  const bottomSheetRef = useRef<BottomSheetMethods>(null);

  const isVisible = isErrorModalVisible || isSuccessModalVisible;
  const isError = isErrorModalVisible;
  const message = isError ? errorMessage : successMessage;
  const hide = isError ? hideError : hideSuccess;

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={['40%', '45%']}
      onClose={hide}
      enableBackdrop={true}
      backgroundColor="#FFF"
    >
      <View style={styles.content}>
        <Ionicons 
          name={isError ? "alert-circle" : "checkmark-circle"} 
          size={80} 
          color={isError ? "#FF3B30" : "#34C759"} 
        />
        <ThemedText type="title" style={styles.title}>
          {isError ? "Error" : "Success"}
        </ThemedText>
        <ThemedText style={styles.message}>
          {message}
        </ThemedText>
        <Button 
          onPress={hide}
          width={350}
          height={50}
          backgroundColor={isError ? "#FF3B30" : "#FF7A00"}
          borderRadius={25}
        >
          <ThemedText style={styles.buttonText}>Dismiss</ThemedText>
        </Button>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginVertical: 16,
    color: '#000',
  },
  message: {
    textAlign: 'center',
    marginBottom: 32,
    fontSize: 18,
    color: '#666',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
