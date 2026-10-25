import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface ScreenHeaderProps {
  eyebrow: string;
  title: string;
  trailing?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  eyebrow,
  title,
  trailing,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftCol}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {trailing && <View style={styles.trailingContainer}>{trailing}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
  },
  leftCol: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.muted,
    textTransform: 'none',
    letterSpacing: 0.1,
  },
  title: {
    marginTop: 2,
    fontSize: 26,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.4,
  },
  trailingContainer: {
    marginLeft: 12,
  },
});
