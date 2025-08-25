import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';

interface OnboardingModalProps {
  visible: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({
  visible,
  onClose,
  isDarkMode = false,
}) => {
  const textColor = isDarkMode ? '#ffffff' : '#1a1a1a';
  const backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff';
  const accentColor = '#4A90E2';
  const saveColor = '#FFA500';
  const passColor = '#FF4444';
  const interestedColor = '#4CAF50';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          <Text style={[styles.title, { color: textColor }]}>
            Welcome to SwipeCity
          </Text>
          
          <Text style={[styles.subtitle, { color: textColor, opacity: 0.8 }]}>
            Here's how to browse products:
          </Text>

          <View style={styles.instructionsContainer}>
            <View style={styles.instruction}>
              <View style={[styles.iconContainer, { backgroundColor: interestedColor + '20' }]}>
                <Text style={styles.swipeIcon}>👉</Text>
              </View>
              <View style={styles.instructionText}>
                <Text style={[styles.actionText, { color: interestedColor }]}>
                  Swipe Right
                </Text>
                <Text style={[styles.descriptionText, { color: textColor, opacity: 0.7 }]}>
                  Show interest in a product
                </Text>
              </View>
            </View>

            <View style={styles.instruction}>
              <View style={[styles.iconContainer, { backgroundColor: passColor + '20' }]}>
                <Text style={styles.swipeIcon}>👈</Text>
              </View>
              <View style={styles.instructionText}>
                <Text style={[styles.actionText, { color: passColor }]}>
                  Swipe Left
                </Text>
                <Text style={[styles.descriptionText, { color: textColor, opacity: 0.7 }]}>
                  Pass on a product
                </Text>
              </View>
            </View>

            <View style={styles.instruction}>
              <View style={[styles.iconContainer, { backgroundColor: saveColor + '20' }]}>
                <Text style={styles.swipeIcon}>⭐</Text>
              </View>
              <View style={styles.instructionText}>
                <Text style={[styles.actionText, { color: saveColor }]}>
                  Save for Later
                </Text>
                <Text style={[styles.descriptionText, { color: textColor, opacity: 0.7 }]}>
                  Click button to save product
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: accentColor }]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: Dimensions.get('window').width * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  instructionsContainer: {
    marginBottom: 32,
  },
  instruction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  swipeIcon: {
    fontSize: 28,
  },
  instructionText: {
    flex: 1,
  },
  actionText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default OnboardingModal;