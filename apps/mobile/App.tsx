import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Button } from '@swipecity/ui';
import { useAuth } from '@swipecity/shared';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const { user, signIn } = useAuth();

  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
  };

  const textStyle = {
    color: isDarkMode ? '#ffffff' : '#1a1a1a',
  };

  return (
    <SafeAreaView style={[backgroundStyle, styles.container]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={backgroundStyle}>
        <View style={styles.content}>
          <Text style={[styles.title, textStyle]}>Welcome to SwipeCity Mobile</Text>
          <Text style={[styles.subtitle, textStyle]}>
            The mobile marketplace that makes buying and selling easy
          </Text>
          
          {user ? (
            <View style={styles.userSection}>
              <Text style={[styles.welcomeText, textStyle]}>
                Welcome back, {user.email}!
              </Text>
            </View>
          ) : (
            <View style={styles.authSection}>
              <Button
                title="Get Started"
                onPress={() => signIn('user@example.com')}
                variant="primary"
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    minHeight: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 48,
    opacity: 0.7,
  },
  userSection: {
    alignItems: 'center',
  },
  authSection: {
    alignItems: 'center',
    width: '100%',
  },
  welcomeText: {
    fontSize: 20,
    textAlign: 'center',
  },
});

export default App;