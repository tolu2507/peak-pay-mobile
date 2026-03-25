import React, { useRef, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { Toast } from '@/shared/ui/molecules/Toast';
import { CameraView, useCameraPermissions, CameraType, CameraCapturedPicture } from 'expo-camera';
import { Button } from '@/shared/ui/base/button';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CameraScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [facing, setFacing] = useState<CameraType>('front');
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    // Camera permissions are still loading.
    return <ThemedView style={styles.container} />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.permissionContainer}>
          <ThemedText style={styles.permissionMessage}>
            We need your permission to show the camera
          </ThemedText>
          <Button onPress={requestPermission} width={200} height={50} backgroundColor="#FF7A00" borderRadius={12}>
            <ThemedText style={styles.buttonText}>Grant Permission</ThemedText>
          </Button>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const handleCapture = async () => {
    if (cameraRef.current) {
      setIsRecording(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          skipProcessing: false,
        });
        
        // Simulate sending to backend
        setTimeout(() => {
          setIsRecording(false);
          Toast.show('Biometrics captured successfully', { type: 'success', position: "top", backgroundColor: "#1E9F85" });
          router.replace('/kyc/next-of-kin');
        }, 1500);
      } catch (error) {
        setIsRecording(false);
        Toast.show('Failed to capture photo', { type: 'error', position: "top", backgroundColor: "#FF3B30" });
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.recordTag}>
            <ThemedText style={styles.recordText}>Record Video</ThemedText>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Viewfinder Area */}
        <View style={styles.viewfinder}>
          <CameraView 
            ref={cameraRef}
            style={StyleSheet.absoluteFill} 
            facing={facing}
          />
          <View style={styles.overlay}>
            {/* Dark background with transparent hole */}
            <View style={styles.topOverlay} />
            <View style={styles.middleRow}>
              <View style={styles.sideOverlay} />
              <View style={styles.hole} />
              <View style={styles.sideOverlay} />
            </View>
            <View style={styles.bottomOverlay} />
          </View>

          <View style={styles.instructionContainer}>
            <ThemedText style={styles.instruction}>
              Align face properly within the circle
            </ThemedText>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={toggleCameraFacing} style={styles.flipBtn}>
            <Ionicons name="camera-reverse" size={28} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.shutterBtn, isRecording && styles.shutterBtnActive]} 
            onPress={handleCapture}
            disabled={isRecording}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  viewfinder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  middleRow: {
    flexDirection: 'row',
    height: 280,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  hole: {
    width: 240,
    height: 240,
    borderRadius: 120, // Circular hole
    borderWidth: 2,
    borderColor: '#FFF',
    backgroundColor: 'transparent',
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  instruction: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  controls: {
    height: 120,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  flipBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterBtnActive: {
    borderColor: '#FF7A00',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionMessage: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
