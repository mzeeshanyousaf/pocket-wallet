import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export type TagTone = 'neg' | 'warn' | 'pos' | 'neutral';

interface StatusTagProps {
  tone: TagTone;
  children: React.ReactNode;
}

export const StatusTag: React.FC<StatusTagProps> = ({ tone, children }) => {
  const getStyle = () => {
    switch (tone) {
      case 'neg':
        return { bg: colors.negSoft, text: colors.neg };
      case 'warn':
        return { bg: colors.warnSoft, text: colors.warn };
      case 'pos':
        return { bg: colors.posSoft, text: colors.pos };
      case 'neutral':
      default:
        return { bg: colors.canvas, text: colors.muted };
    }
  };

  const current = getStyle();

  return (
    <View style={[styles.tag, { backgroundColor: current.bg }]}>
      <Text style={[styles.text, { color: current.text }]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tag: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
