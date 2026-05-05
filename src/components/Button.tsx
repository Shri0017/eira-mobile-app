import { fontSize, fontWeight, spacing } from "../theme/spacing";
import { lightColors } from "../theme/colors";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";


interface ButtonProps {
  title: string;
  onPress: () => void;
}
const Button = ({ title, onPress }: ButtonProps) => {
  return <TouchableOpacity style={styles.button} onPress={onPress}>
    <Text style={styles.text}>{title}</Text>
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