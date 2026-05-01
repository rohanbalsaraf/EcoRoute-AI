import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Leaf, Navigation, Zap, Bike, Fuel, Activity, Clock, Map as MapIcon } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const VEHICLES = [
  { id: 'ev', label: 'EV', icon: Zap, color: '#00FFA3', saving: '92%' },
  { id: 'hybrid', label: 'Hybrid', icon: Leaf, color: '#8B5CF6', saving: '45%' },
  { id: 'petrol', label: 'Petrol', icon: Fuel, color: '#F59E0B', saving: '0%' },
  { id: 'bike', label: 'Bike', icon: Bike, color: '#F97316', saving: '60%' },
];

export default function App() {
  const [selectedVehicle, setSelectedVehicle] = useState('ev');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Afternoon,</Text>
          <Text style={styles.userName}>Eco Explorer</Text>
        </View>
        <View style={styles.avatar}>
          <Leaf size={20} color="#00FFA3" />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Map Simulation */}
        <View style={styles.mapContainer}>
          <LinearGradient
            colors={['#1e293b', '#0f172a']}
            style={styles.mapMock}
          >
            <View style={styles.mapOverlay}>
              <View style={styles.routeLine} />
              <View style={styles.markerOrigin} />
              <View style={styles.markerDest} />
            </View>
            <View style={styles.mapBadge}>
              <Text style={styles.mapBadgeText}>Live Traffic Active</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Vehicle Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Vehicle</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll}>
            {VEHICLES.map((v) => {
              const IconComponent = v.icon;
              return (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => setSelectedVehicle(v.id)}
                  style={[
                    styles.vehicleCard,
                    selectedVehicle === v.id && { borderColor: v.color, backgroundColor: 'rgba(255,255,255,0.05)' }
                  ]}
                >
                  <IconComponent size={24} color={selectedVehicle === v.id ? v.color : '#64748b'} />
                  <Text style={[styles.vehicleLabel, selectedVehicle === v.id && { color: v.color }]}>{v.label}</Text>
                  <Text style={styles.vehicleSaving}>{v.saving} Save</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Activity size={20} color="#00FFA3" />
            <Text style={styles.statValue}>12.4 kg</Text>
            <Text style={styles.statLabel}>CO2 Saved</Text>
          </View>
          <View style={styles.statCard}>
            <Clock size={20} color="#3B82F6" />
            <Text style={styles.statValue}>45 min</Text>
            <Text style={styles.statLabel}>Travel Time</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.primaryButton}>
            <LinearGradient
              colors={['#00FFA3', '#00D187']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Navigation size={20} color="#000" />
              <Text style={styles.buttonText}>Start Eco-Route</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}><MapIcon size={24} color="#00FFA3" /></TouchableOpacity>
        <TouchableOpacity style={styles.navItem}><Activity size={24} color="#64748b" /></TouchableOpacity>
        <TouchableOpacity style={styles.navItem}><Leaf size={24} color="#64748b" /></TouchableOpacity>
      </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  greeting: {
    color: '#64748b',
    fontSize: 14,
  },
  userName: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(0,255,163,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,255,163,0.2)',
  },
  mapContainer: {
    padding: 20,
  },
  mapMock: {
    height: 220,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0f172a',
    shadowColor: '#00FFA3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  mapOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  routeLine: {
    width: '65%',
    height: 6,
    backgroundColor: '#00FFA3',
    borderRadius: 3,
    shadowColor: '#00FFA3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    transform: [{ rotate: '-15deg' }],
  },
  markerOrigin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3B82F6',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    position: 'absolute',
    left: '20%',
    top: '65%',
  },
  markerDest: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    position: 'absolute',
    right: '20%',
    top: '30%',
  },
  mapBadge: {
    position: 'absolute',
    top: 15,
    left: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,255,163,0.3)',
  },
  mapBadgeText: {
    color: '#00FFA3',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 18,
    letterSpacing: -0.5,
  },
  vehicleScroll: {
    flexDirection: 'row',
  },
  vehicleCard: {
    width: 110,
    height: 120,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  vehicleLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  vehicleSaving: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    width: (width - 55) / 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 12,
    letterSpacing: -0.5,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  primaryButton: {
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#00FFA3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 30,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  navItem: {
    padding: 15,
  }
});
