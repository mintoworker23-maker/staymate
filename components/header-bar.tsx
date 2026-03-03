import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RoundIconButton } from '@/components/ui/round-icon-button';

export function HeaderBar() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/react-logo.png')}
          style={styles.logo}
        />
        <ThemedText type="title" style={styles.title}>
          StayMate
        </ThemedText>
      </View>
      <View style={styles.spacer} />
      <RoundIconButton
        name="slider.horizontal.3"
        size={24}
        color="#fff"
        backgroundColor="transparent"
        style={styles.button}
        onPress={() => alert('settings')}
      />
      <View style={styles.avatarPlaceholder} />
      {/* small progress indicator underneath header */}
      <View style={styles.progressBarBackground}>
        <View style={styles.progressBar} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  title: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: 'bold',
  },
  spacer: {
    flex: 1,
  },
  button: {
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  progressBarBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#eee',
  },
  progressBar: {
    width: '20%',
    height: '100%',
    backgroundColor: '#cbff66',
  },
});
