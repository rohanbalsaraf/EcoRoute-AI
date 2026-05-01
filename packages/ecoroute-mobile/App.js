import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Dimensions } from 'react-native';
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
            {VEHICLES.map((v) => (
              <TouchableOpacity
                key={v.id}
                onPress={() => setSelectedVehicle(v.id)}
                style={[
                  styles.vehicleCard,
                  selectedVehicle === v.id && { borderColor: v.color, backgroundColor: 'rgba(255,255,255,0.05)' }
                ]}
              >
                <v.icon size={24} color={selectedVehicle === v.id ? v.color : '#64748b'} />
                <Text style={[styles.vehicleLabel, selectedVehicle === v.id && { color: v.color }]}>{v.label}</Text>
                <Text style={styles.vehicleSaving}>{v.saving} Save</Text>
              </TouchableOpacity>
            ))}
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
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mapOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeLine: {
    width: '60%',
    height: 4,
    backgroundColor: '#00FFA3',
    borderRadius: 2,
    opacity: 0.6,
    transform: [{ rotate: '-20deg' }],
  },
  markerOrigin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#fff',
    position: 'absolute',
    left: '20%',
    top: '60%',
  },
  markerDest: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#fff',
    position: 'absolute',
    right: '25%',
    top: '35%',
  },
  mapBadge: {
    position: 'absolute',
    top: 15,
    left: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  mapBadgeText: {
    color: '#00FFA3',
    fontSize: 10,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  vehicleScroll: {
    flexDirection: 'row',
  },
  vehicleCard: {
    width: 100,
    height: 110,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vehicleLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  vehicleSaving: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    width: (width - 55) / 2,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  navItem: {
    padding: 10,
  }
});
