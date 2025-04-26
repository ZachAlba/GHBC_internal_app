import { StyleSheet } from "react-native";

// Colors
export const COLORS = {
  primary: "#0066cc",
  secondary: "#4FB8CE",
  accent: "#FFB347",
  success: "#5FAD56",
  lightGreen: "#e6ffee",
  background: "#e6f2ff",
  white: "white",
  lightGray: "#ccc",
  mediumGray: "#666",
  darkGray: "#444",
};

// Shared styles
export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: COLORS.primary,
  },
});

// Check-in screen specific styles
const CheckInStyles = StyleSheet.create({
  container: {
    ...globalStyles.container,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  header: {
    ...globalStyles.header,
  },
  title: {
    ...globalStyles.title,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "500",
  },
  searchContainer: {
    margin: 16,
    position: "relative",
  },
  searchInput: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 15,
    fontSize: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  clearButton: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  clearButtonText: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: "bold",
  },
  searchPrompt: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  searchPromptText: {
    textAlign: "center",
    color: COLORS.mediumGray,
    fontSize: 16,
  },
  noResults: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noResultsText: {
    color: COLORS.mediumGray,
    fontSize: 16,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  memberList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  memberItem: {
    backgroundColor: COLORS.white,
    marginVertical: 8,
    borderRadius: 15,
    padding: 16,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkedInMember: {
    backgroundColor: COLORS.lightGreen,
    borderColor: COLORS.success,
    borderWidth: 1,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  memberDetails: {
    flexDirection: "row",
    marginBottom: 4,
  },
  membershipType: {
    backgroundColor: COLORS.secondary,
    color: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 12,
    marginRight: 8,
    overflow: "hidden",
  },
  phoneNumber: {
    color: COLORS.mediumGray,
    fontSize: 14,
  },
  additionalMembers: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginTop: 4,
  },
  vehicles: {
    fontSize: 14,
    color: COLORS.mediumGray,
    marginTop: 4,
    fontStyle: "italic",
  },
  statusContainer: {
    justifyContent: "center",
    marginLeft: 8,
  },
  checkedInBadge: {
    backgroundColor: COLORS.success,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  checkedInText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  checkInButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  checkInButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  modalOverlay: {
    ...globalStyles.modalOverlay,
  },
  modalContainer: {
    ...globalStyles.modalContainer,
  },
  modalTitle: {
    ...globalStyles.modalTitle,
  },
  guestListContainer: {
    width: "100%",
    maxHeight: 300,
    marginBottom: 15,
  },
  guestInput: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 10,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    padding: 10,
    borderRadius: 10,
    width: "48%",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.lightGray,
  },
  submitButton: {
    backgroundColor: COLORS.success,
  },
  secondaryButton: {
    backgroundColor: COLORS.accent,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    ...globalStyles.buttonText,
  },
  previousGuestsContainer: {
    width: "100%",
    marginBottom: 15,
  },
  previousGuestsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    color: COLORS.darkGray,
  },
  previousGuestsScroll: {
    maxHeight: 40,
  },
  previousGuestTag: {
    backgroundColor: "#E8F4F8",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  previousGuestTagText: {
    color: COLORS.primary,
    fontSize: 12,
  },
  addButton: {
    marginLeft: 10,
    backgroundColor: "#4FB8CE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "#fff",
  },
});

export default CheckInStyles;
