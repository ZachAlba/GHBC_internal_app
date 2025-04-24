import { StyleSheet } from 'react-native';
import { COLORS } from './CheckInStyles';

const HomeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: COLORS.primary,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  statusContainer: {
    marginBottom: 30,
    padding: 15,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    minWidth: 250,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 5,
  },
  statusActive: {
    color: COLORS.success, // Green for active status
  },
  statusInactive: {
    color: '#cc5500', // Orange for inactive status
  },
  lastDownloadText: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginTop: 4,
  },
  warningText: {
    color: '#e74c3c', // Red for warning
    fontWeight: 'bold',
  },
  offlineText: {
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
  },
  button: {
    padding: 18,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: 'center',
    // Add shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  blueButton: {
    backgroundColor: COLORS.secondary, // Ocean blue
  },
  yellowButton: {
    backgroundColor: COLORS.accent, // Sandy orange
  },
  orangeButton: {
    backgroundColor: COLORS.success, // Beach grass green
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});

export default HomeStyles;