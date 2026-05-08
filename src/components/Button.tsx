import { fontSize, fontWeight, spacing } from "../theme/spacing";
import { lightColors } from "../theme/colors";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";


interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
}
const Button = ({ title, onPress, loading }: ButtonProps) => {
  return <TouchableOpacity style={styles.button} onPress={onPress} disabled={loading}>
    {loading ? (
      <ActivityIndicator color="white" />
    ) : (
      <Text style={styles.text}>{title}</Text>
    )}
  </TouchableOpacity>;
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: lightColors.primaryButton,    
    padding: spacing.md,
    borderRadius: 5,
    width: '100%',
    },  
    text: {
    color: 'white',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    },  
});

export default Button;