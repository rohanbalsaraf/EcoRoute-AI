import React, { useState, useMemo, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  Dimensions, 
  TextInput, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Leaf, Navigation, Zap, Bike, Fuel, Activity, Clock, Map as MapIcon, Search, ArrowRight, Gauge } from 'lucide-react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as SecureStore from 'expo-secure-store';
import { ClerkProvider, SignedIn, SignedOut, useAuth, useUser } from '@clerk/clerk-expo';

const tokenCache = {
  async getToken(key) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

const CLERK_PUBLISHABLE_KEY = "pk_test_bGlrZWQtbWFuYXRlZS01NS5jbGVyay5hY2NvdW50cy5kZXYk";

const { width } = Dimensions.get('window');

// Logic Constants (aligned with Web)
const VEHICLES = [
  { id: "petrol",   label: "Petrol",       icon: Fuel, factor: 0.21, ecoSaving: 0.15, trafficPenalty: 1.12, color: "#F59E0B" },
  { id: "diesel",   label: "Diesel",       icon: Fuel, factor: 0.27, ecoSaving: 0.12, trafficPenalty: 1.08, color: "#EF4444" },
  { id: "cng",      label: "CNG",          icon: Fuel, factor: 0.16, ecoSaving: 0.18, trafficPenalty: 1.15, color: "#3B82F6" },
  { id: "hybrid",   label: "Hybrid",       icon: Leaf, color: '#8B5CF6', factor: 0.10, ecoSaving: 0.28, trafficPenalty: 1.05 },
  { id: "ev",       label: "EV",           icon: Zap,  color: '#00FFA3', factor: 0.05, ecoSaving: 0.32, trafficPenalty: 1.03 },
  { id: "bike",     label: "Motorcycle",   icon: Bike, color: '#F97316', factor: 0.11, ecoSaving: 0.10, trafficPenalty: 1.18 },
];

const ECO_DRIVING_TIME_PENALTY = 0.08;

// Helper: Decode Polyline
function decodePolyline(encoded) {
  if (!encoded) return [];
  const coords = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push({ latitude: lat / 1e6, longitude: lng / 1e6 });
  }
  return coords;
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <MainApp />
    </ClerkProvider>
  );
}

function MainApp() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'dashboard' | 'profile'
  const [stats, setStats] = useState({ saved_co2: "0.0", api_calls: 0, tier: "Free" });

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [rawRoutes, setRawRoutes] = useState(null);
  const [originCoords, setOriginCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState('ev');
  const [selectedRouteType, setSelectedRouteType] = useState('eco'); // 'eco' | 'standard'

  // Fetch real stats from API
  useEffect(() => {
    if (isSignedIn && activeTab === 'dashboard') {
      const fetchStats = async () => {
        try {
          const token = await getToken();
          const response = await fetch('https://eco-route-api.render.com/internal/dashboard/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setStats({
              saved_co2: (data.api_calls_this_month * 0.45).toFixed(1), // Mock formula for saved kg
              api_calls: data.api_calls_this_month,
              tier: data.tier
            });
          }
        } catch (err) {
          console.error("Stats fetch failed:", err);
        }
      };
      fetchStats();
    }
  }, [isSignedIn, activeTab]);

  // Reactive Results Calculation
  const results = useMemo(() => {
    if (!rawRoutes) return null;
    
    const vehicleData = VEHICLES.find(v => v.id === selectedVehicle) || VEHICLES[0];
    const carbonFactor = vehicleData.factor;
    
    const ecoDistKm = rawRoutes.eco.distance_km;
    const stdDistKm = rawRoutes.standard.distance_km;
    
    const ecoCarbonKg = ecoDistKm * carbonFactor * (1 - vehicleData.ecoSaving);
    const ecoTimeMins = (rawRoutes.eco.duration_min * (1 + ECO_DRIVING_TIME_PENALTY));
    const stdCarbonKg = stdDistKm * carbonFactor * vehicleData.trafficPenalty;
    const stdTimeMins = rawRoutes.standard.duration_min;
    
    return {
      eco: {
        distance: `${ecoDistKm.toFixed(1)} km`,
        duration: `${ecoTimeMins.toFixed(0)} min`,
        carbon: `${ecoCarbonKg.toFixed(2)} kg`,
        carbonVal: ecoCarbonKg,
      },
      standard: {
        distance: `${stdDistKm.toFixed(1)} km`,
        duration: `${stdTimeMins.toFixed(0)} min`,
        carbon: `${stdCarbonKg.toFixed(2)} kg`,
        carbonVal: stdCarbonKg,
      },
      savings: `${(stdCarbonKg - ecoCarbonKg).toFixed(2)} kg saved`,
      vehicle: vehicleData,
    };
  }, [rawRoutes, selectedVehicle]);

  const handleSearch = async () => {
    if (!origin || !destination) {
      Alert.alert("Error", "Please enter both origin and destination.");
      return;
    }

    setIsSearching(true);
    setRawRoutes(null);

    try {
      const geocode = async (query) => {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`);
        const data = await res.json();
        if (data.features?.length > 0) {
          const [lon, lat] = data.features[0].geometry.coordinates;
          return { lat, lon };
        }
        throw new Error(`Location not found: ${query}`);
      };

      const [originPos, destPos] = await Promise.all([geocode(origin), geocode(destination)]);
      setOriginCoords(originPos);
      setDestCoords(destPos);

      // Fetch dual routes from Valhalla
      const bodyEco = JSON.stringify({
        locations: [{ lat: originPos.lat, lon: originPos.lon }, { lat: destPos.lat, lon: destPos.lon }],
        costing: "auto_shorter", units: "kilometers"
      });
      const bodyStd = JSON.stringify({
        locations: [{ lat: originPos.lat, lon: originPos.lon }, { lat: destPos.lat, lon: destPos.lon }],
        costing: "auto", units: "kilometers"
      });

      const [resEco, resStd] = await Promise.all([
        fetch(`https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(bodyEco)}`),
        fetch(`https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(bodyStd)}`)
      ]);

      const dataEco = await resEco.json();
      const dataStd = await resStd.json();

      setRawRoutes({
        eco: {
          coordinates: decodePolyline(dataEco.trip.legs[0].shape),
          distance_km: dataEco.trip.summary.length,
          duration_min: dataEco.trip.summary.time / 60,
        },
        standard: {
          coordinates: decodePolyline(dataStd.trip.legs[0].shape),
          distance_km: dataStd.trip.summary.length,
          duration_min: dataStd.trip.summary.time / 60,
        }
      });
    } catch (err) {
      Alert.alert("Search Error", err.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
      
        {activeTab === 'map' && (
          <>
            {/* Search Header */}
            <View style={styles.searchSection}>
              <Text style={styles.title}>EcoRoute Planner</Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Search size={16} color="#64748b" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="Starting Point..."
                    placeholderTextColor="#64748b"
                    value={origin}
                    onChangeText={setOrigin}
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <MapIcon size={16} color="#64748b" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="Destination..."
                    placeholderTextColor="#64748b"
                    value={destination}
                    onChangeText={setDestination}
                  />
                </View>
                <TouchableOpacity 
                  style={styles.searchButton}
                  onPress={handleSearch}
                  disabled={isSearching}
                >
                  <LinearGradient
                    colors={['#00FFA3', '#00D187']}
                    style={styles.gradientSearch}
                  >
                    {isSearching ? <ActivityIndicator color="#000" size="small" /> : <ArrowRight size={20} color="#000" />}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Interactive Map */}
              <View style={styles.mapContainer}>
                <View style={styles.mapFrame}>
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: 18.52,
                      longitude: 73.85,
                      latitudeDelta: 0.1,
                      longitudeDelta: 0.1,
                    }}
                    region={originCoords ? {
                      latitude: (originCoords.lat + destCoords.lat) / 2,
                      longitude: (originCoords.lon + destCoords.lon) / 2,
                      latitudeDelta: Math.abs(originCoords.lat - destCoords.lat) * 2,
                      longitudeDelta: Math.abs(originCoords.lon - destCoords.lon) * 2,
                    } : undefined}
                    customMapStyle={darkMapStyle}
                  >
                    {rawRoutes && (
                      <>
                        <Polyline 
                          coordinates={rawRoutes.standard.coordinates}
                          strokeWidth={4}
                          strokeColor="rgba(255, 255, 255, 0.2)"
                          lineDashPattern={[5, 5]}
                        />
                        <Polyline 
                          coordinates={rawRoutes.eco.coordinates}
                          strokeWidth={6}
                          strokeColor="#00FFA3"
                        />
                        <Marker coordinate={{ latitude: originCoords.lat, longitude: originCoords.lon }}>
                          <View style={styles.markerOrigin} />
                        </Marker>
                        <Marker coordinate={{ latitude: destCoords.lat, longitude: destCoords.lon }}>
                          <View style={styles.markerDest} />
                        </Marker>
                      </>
                    )}
                  </MapView>
                  {!rawRoutes && !isSearching && (
                    <View style={styles.mapPlaceholder}>
                      <Navigation size={40} color="rgba(0, 255, 163, 0.1)" />
                      <Text style={styles.placeholderText}>Plan your first eco-trip</Text>
                    </View>
                  )}
                </View>
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
                          selectedVehicle === v.id && { borderColor: v.color, backgroundColor: 'rgba(0,255,163,0.05)' }
                        ]}
                      >
                        <IconComponent size={24} color={selectedVehicle === v.id ? v.color : '#64748b'} />
                        <Text style={[styles.vehicleLabel, selectedVehicle === v.id && { color: v.color }]}>{v.label}</Text>
                        <Text style={styles.vehicleSaving}>-{((v.ecoSaving || 0) * 100).toFixed(0)}% CO₂</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Results Analysis */}
              {results && (
                <View style={styles.resultsContainer}>
                  <View style={styles.savingsCard}>
                    <LinearGradient
                      colors={['rgba(0,255,163,0.1)', 'transparent']}
                      style={styles.savingsGradient}
                    >
                      <Gauge size={20} color="#00FFA3" />
                      <Text style={styles.savingsText}>{results.savings}</Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.routeSelector}>
                    <TouchableOpacity 
                      onPress={() => setSelectedRouteType('eco')}
                      style={[styles.routeOption, selectedRouteType === 'eco' && styles.routeOptionActive]}
                    >
                      <Text style={styles.routeLabel}>Eco Route</Text>
                      <Text style={styles.routeValue}>{results.eco.carbon}</Text>
                      <Text style={styles.routeSub}>{results.eco.distance} • {results.eco.duration}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => setSelectedRouteType('standard')}
                      style={[styles.routeOption, selectedRouteType === 'standard' && styles.routeOptionActiveStd]}
                    >
                      <Text style={styles.routeLabel}>Standard</Text>
                      <Text style={styles.routeValue}>{results.standard.carbon}</Text>
                      <Text style={styles.routeSub}>{results.standard.distance} • {results.standard.duration}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              <View style={{ height: 100 }} />
            </ScrollView>
          </>
        )}

        {activeTab === 'dashboard' && (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
            <Text style={styles.tabTitle}>Eco Dashboard</Text>
            <View style={styles.statCardLarge}>
              <Activity size={32} color="#00FFA3" />
              <Text style={styles.statLargeValue}>{stats.saved_co2} kg</Text>
              <Text style={styles.statLargeLabel}>Total CO2 Saved</Text>
              <View style={styles.divider} />
              <Text style={styles.statSubText}>{stats.api_calls} API Calls • {stats.tier} Tier</Text>
            </View>
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Recent Journeys</Text>
              <View style={styles.historyItem}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyRoute}>Home → Office</Text>
                  <Text style={styles.historyDate}>Today, 9:15 AM</Text>
                </View>
                <Text style={styles.historySaving}>-0.8kg</Text>
              </View>
              <View style={styles.historyItem}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyRoute}>Airport → City Center</Text>
                  <Text style={styles.historyDate}>Yesterday, 6:30 PM</Text>
                </View>
                <Text style={styles.historySaving}>-2.4kg</Text>
              </View>
            </View>
            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {activeTab === 'profile' && (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
            <Text style={styles.tabTitle}>Account</Text>
            <View style={styles.profileSection}>
              <View style={styles.avatarLarge}>
                <Leaf size={40} color="#00FFA3" />
              </View>
              <Text style={styles.profileName}>{user?.firstName || 'Guest User'}</Text>
              <Text style={styles.profileEmail}>{user?.emailAddresses[0]?.emailAddress || 'Not signed in'}</Text>
            </View>
            
            <SignedOut>
              <TouchableOpacity style={styles.authButton}>
                <Text style={styles.authButtonText}>Sign In to Sync History</Text>
              </TouchableOpacity>
            </SignedOut>
            
            <SignedIn>
              <TouchableOpacity style={styles.authButtonOutline}>
                <Text style={styles.authButtonTextOutline}>Sign Out</Text>
              </TouchableOpacity>
            </SignedIn>
            <View style={{ height: 100 }} />
          </ScrollView>
        )}


        {/* Bottom Nav */}
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => setActiveTab('map')}
          >
            <MapIcon size={24} color={activeTab === 'map' ? "#00FFA3" : "#64748b"} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => setActiveTab('dashboard')}
          >
            <Activity size={24} color={activeTab === 'dashboard' ? "#00FFA3" : "#64748b"} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => setActiveTab('profile')}
          >
            <Leaf size={24} color={activeTab === 'profile' ? "#00FFA3" : "#64748b"} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#64748b" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0f172a" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#334155" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] }
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  searchSection: { padding: 20, paddingTop: 10 },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '900', marginBottom: 20, letterSpacing: -1 },
  inputContainer: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  inputWrapper: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 45, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: '#f8fafc', fontSize: 13, fontWeight: '600' },
  searchButton: { width: 45, height: 45, borderRadius: 12, overflow: 'hidden' },
  gradientSearch: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapContainer: { padding: 20 },
  mapFrame: { height: 250, borderRadius: 28, overflow: 'hidden', backgroundColor: '#0f172a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  map: { ...StyleSheet.absoluteFillObject },
  mapPlaceholder: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#64748b', fontSize: 12, marginTop: 10, fontWeight: '600' },
  markerOrigin: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3B82F6', borderWidth: 2, borderColor: '#fff' },
  markerDest: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#fff' },
  section: { paddingHorizontal: 20, marginBottom: 25 },
  sectionTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginBottom: 15 },
  vehicleScroll: { flexDirection: 'row' },
  vehicleCard: { width: 100, height: 110, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  vehicleLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginTop: 8 },
  vehicleSaving: { color: '#64748b', fontSize: 9, fontWeight: '500', marginTop: 4 },
  resultsContainer: { paddingHorizontal: 20 },
  savingsCard: { height: 50, borderRadius: 16, overflow: 'hidden', marginBottom: 15, borderWidth: 1, borderColor: 'rgba(0,255,163,0.2)' },
  savingsGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10 },
  savingsText: { color: '#00FFA3', fontSize: 14, fontWeight: '800' },
  routeSelector: { flexDirection: 'row', gap: 12 },
  routeOption: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  routeOptionActive: { borderColor: '#00FFA3', backgroundColor: 'rgba(0,255,163,0.05)' },
  routeOptionActiveStd: { borderColor: '#F97316', backgroundColor: 'rgba(249,115,22,0.05)' },
  routeLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  routeValue: { color: '#f8fafc', fontSize: 20, fontWeight: '900', marginVertical: 4 },
  routeSub: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: 'rgba(10, 10, 10, 0.95)', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 20, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  navItem: { padding: 10 },
  
  // New Styles
  tabContent: { padding: 20 },
  tabTitle: { color: '#f8fafc', fontSize: 28, fontWeight: '900', marginBottom: 25 },
  statCardLarge: { backgroundColor: 'rgba(0,255,163,0.05)', borderRadius: 32, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,255,163,0.2)', marginBottom: 30 },
  statLargeValue: { color: '#00FFA3', fontSize: 42, fontWeight: '900', marginTop: 15 },
  statLargeLabel: { color: '#64748b', fontSize: 14, fontWeight: '600', marginTop: 5 },
  divider: { width: '80%', height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 20 },
  statSubText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  historySection: { marginTop: 10 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  historyRoute: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
  historyDate: { color: '#64748b', fontSize: 11, fontWeight: '500', marginTop: 2 },
  historySaving: { color: '#00FFA3', fontSize: 14, fontWeight: '800' },
  profileSection: { alignItems: 'center', marginBottom: 40 },
  avatarLarge: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,255,163,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,255,163,0.3)', marginBottom: 20 },
  profileName: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },
  profileEmail: { color: '#64748b', fontSize: 14, fontWeight: '500', marginTop: 5 },
  authButton: { backgroundColor: '#00FFA3', height: 55, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  authButtonText: { color: '#000', fontSize: 16, fontWeight: '800' },
  authButtonOutline: { borderWidth: 1, borderColor: '#ef4444', height: 55, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  authButtonTextOutline: { color: '#ef4444', fontSize: 16, fontWeight: '800' }
});
