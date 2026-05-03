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
  Alert,
  Platform 
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Leaf, Navigation, Zap, Bike, Fuel, Activity, Clock, Map as MapIcon, Search, ArrowRight, Gauge } from 'lucide-react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
import { ClerkProvider, SignedIn, SignedOut, useAuth, useUser, useOAuth } from '@clerk/clerk-expo';

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

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

// Default to production for easier testing, but allow local override
const API_BASE_URL = "https://ecoroute-ai-jdr3.onrender.com";
const ECO_DRIVING_TIME_PENALTY = 0.08;

// Helper: Fetch with timeout
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal  
  });
  clearTimeout(id);
  return response;
}

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
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  useWarmUpBrowser();

  const [activeTab, setActiveTab] = useState('map'); 
  const [stats, setStats] = useState({ total_carbon_saved: "0.0", api_calls: 0, tier: "Free" });
  const [history, setHistory] = useState([]);
  const [isNavigating, setIsNavigating] = useState(false);

  const onSignInPress = async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId) {
        setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error("OAuth error", err);
    }
  };

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [rawRoutes, setRawRoutes] = useState(null);
  const [originCoords, setOriginCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState('ev');
  const [selectedRouteType, setSelectedRouteType] = useState('eco');

  const [suggestions, setSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null); 

  useEffect(() => {
    if (isSignedIn && activeTab === 'dashboard') {
      const fetchData = async () => {
        try {
          const token = await getToken();
          
          const statsRes = await fetchWithTimeout(`${API_BASE_URL}/internal/dashboard/stats`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (statsRes.ok) {
            const s = await statsRes.json();
            setStats({
              total_carbon_saved: s.total_carbon_saved,
              api_calls: s.api_calls_this_month,
              tier: s.tier
            });
          }

          const historyRes = await fetchWithTimeout(`${API_BASE_URL}/internal/dashboard/history`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (historyRes.ok) setHistory(await historyRes.json());
        } catch (e) {
          console.error("Dashboard fetch error:", e);
        }
      };
      fetchData();
    }
  }, [isSignedIn, activeTab]);

  const fetchSuggestions = async (text, type) => {
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=5`);
      const data = await res.json();
      setSuggestions(data.features || []);
      setActiveInput(type);
    } catch (e) {
      console.error("Geocoding suggestions error:", e);
    }
  };

  const handleSelectSuggestion = (feature) => {
    const [lon, lat] = feature.geometry.coordinates;
    const name = feature.properties.name || feature.properties.city || "Location";
    
    if (activeInput === 'origin') {
      setOrigin(name);
      setOriginCoords({ lat, lon });
    } else {
      setDestination(name);
      setDestCoords({ lat, lon });
    }
    setSuggestions([]);
    setActiveInput(null);
  };

  const useCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Allow location access to use your current position.');
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    setOrigin("My Location");
    setOriginCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
  };

  const handleSearch = async () => {
    if (!originCoords || !destCoords) {
      Alert.alert("Incomplete", "Please select locations from the suggestions.");
      return;
    }

    setIsSearching(true);
    setRawRoutes(null);

    try {
      const token = await getToken();
      const res = await fetchWithTimeout(`${API_BASE_URL}/v1/routes/compare`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          origin_lat: originCoords.lat,
          origin_lon: originCoords.lon,
          dest_lat: destCoords.lat,
          dest_lon: destCoords.lon,
          vehicles: [selectedVehicle]
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Route calculation failed");

      const compare = data.comparisons[selectedVehicle];
      if (!compare) throw new Error(`No data returned for ${selectedVehicle}`);
      if (compare.error) throw new Error(compare.error);

      const mapPath = (coords) => coords.map(c => ({ latitude: c.lat, longitude: c.lon }));

      setRawRoutes({
        eco: {
          coordinates: mapPath(compare.greenest.path_coords),
          distance_km: compare.greenest.total_distance_km,
          duration_min: compare.greenest.total_time_min,
          carbon_kg: compare.greenest.total_carbon_kg
        },
        standard: {
          coordinates: mapPath(compare.fastest.path_coords),
          distance_km: compare.fastest.total_distance_km,
          duration_min: compare.fastest.total_time_min,
          carbon_kg: compare.fastest.total_carbon_kg
        }
      });

    } catch (err) {
      Alert.alert("Search Error", err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const co2SavingPercent = useMemo(() => {
    if (!rawRoutes) return 0;
    const diff = rawRoutes.standard.carbon_kg - rawRoutes.eco.carbon_kg;
    return Math.max(0, (diff / rawRoutes.standard.carbon_kg) * 100).toFixed(0);
  }, [rawRoutes]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
      
        {activeTab === 'map' && (
          <>
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
                    onChangeText={(t) => { setOrigin(t); fetchSuggestions(t, 'origin'); }}
                  />
                  <TouchableOpacity onPress={useCurrentLocation}>
                    <Zap size={16} color="#00FFA3" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.inputWrapper}>
                  <MapIcon size={16} color="#64748b" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="Destination..."
                    placeholderTextColor="#64748b"
                    value={destination}
                    onChangeText={(t) => { setDestination(t); fetchSuggestions(t, 'dest'); }}
                  />
                </View>
                
                <TouchableOpacity 
                  style={styles.searchButton}
                  onPress={handleSearch}
                  disabled={isSearching}
                >
                  <View style={[styles.gradientSearch, { backgroundColor: '#00FFA3' }]}>
                    {isSearching ? <ActivityIndicator color="#000" size="small" /> : <ArrowRight size={20} color="#000" />}
                  </View>
                </TouchableOpacity>
              </View>

              {suggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  {suggestions.map((s, idx) => (
                    <TouchableOpacity key={idx} style={styles.suggestionItem} onPress={() => handleSelectSuggestion(s)}>
                      <Text style={styles.suggestionText}>{s.properties.name || s.properties.city}, {s.properties.country}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.mapContainer}>
                <View style={styles.mapFrame}>
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: 18.52, longitude: 73.85,
                      latitudeDelta: 0.1, longitudeDelta: 0.1,
                    }}
                    region={originCoords && destCoords ? {
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
                          strokeWidth={4} strokeColor="rgba(255, 255, 255, 0.2)" lineDashPattern={[5, 5]}
                        />
                        <Polyline 
                          coordinates={rawRoutes.eco.coordinates}
                          strokeWidth={6} strokeColor="#00FFA3"
                        />
                        <Marker coordinate={{ latitude: originCoords.lat, longitude: originCoords.lon }} />
                        <Marker coordinate={{ latitude: destCoords.lat, longitude: destCoords.lon }} />
                      </>
                    )}
                  </MapView>
                </View>
              </View>

              <View style={styles.vehicleSelect}>
                {VEHICLES.map(v => (
                  <TouchableOpacity key={v.id} style={[styles.vehicleCard, selectedVehicle === v.id && { borderColor: v.color }]} onPress={() => setSelectedVehicle(v.id)}>
                    <Text style={[styles.vehicleLabel, selectedVehicle === v.id && { color: v.color }]}>{v.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {rawRoutes && (
                <View style={styles.resultsContainer}>
                  <TouchableOpacity 
                    style={[styles.routeCard, selectedRouteType === 'eco' && styles.routeCardActive]}
                    onPress={() => setSelectedRouteType('eco')}
                  >
                    <View style={styles.routeHeader}>
                      <Text style={styles.routeType}>Eco Route</Text>
                      <View style={styles.trafficBadge}>
                        <Activity size={12} color="#00FFA3" />
                        <Text style={styles.trafficText}>Live Traffic Active</Text>
                      </View>
                      <View style={styles.badge}><Text style={styles.badgeText}>-{co2SavingPercent}% CO2</Text></View>
                    </View>
                    <Text style={styles.routeStats}>{rawRoutes.eco.distance_km.toFixed(1)}km • {rawRoutes.eco.duration_min.toFixed(0)} min</Text>
                    <Text style={styles.routeCarbon}>{rawRoutes.eco.carbon_kg.toFixed(3)} kg CO2</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.routeCard, selectedRouteType === 'standard' && styles.routeCardActive]}
                    onPress={() => setSelectedRouteType('standard')}
                  >
                    <Text style={styles.routeType}>Standard Route</Text>
                    <Text style={styles.routeStats}>{rawRoutes.standard.distance_km.toFixed(1)}km • {rawRoutes.standard.duration_min.toFixed(0)} min</Text>
                    <Text style={styles.routeCarbon}>{rawRoutes.standard.carbon_kg.toFixed(3)} kg CO2</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ height: 100 }} />
            </ScrollView>
          </>
        )}

        {activeTab === 'dashboard' && (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
            <Text style={styles.tabTitle}>Impact</Text>
            <View style={styles.statsCard}>
              <Text style={styles.statLarge}>{stats.total_carbon_saved || "0.0"} kg</Text>
              <Text style={styles.statLargeLabel}>Total CO2 Saved</Text>
              <View style={styles.divider} />
              <Text style={styles.statSubText}>{stats.api_calls || 0} API Calls • {stats.tier || "Free"} Tier</Text>
            </View>

            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Recent Journeys</Text>
              {history.length > 0 ? history.map((item) => (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyRoute}>{item.vehicle.toUpperCase()} Journey</Text>
                    <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.historySaving}>-{parseFloat(item.green_co2).toFixed(2)}kg</Text>
                </View>
              )) : (
                <Text style={styles.emptyText}>No journeys saved yet.</Text>
              )}
            </View>
            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {activeTab === 'profile' && (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
            <Text style={styles.tabTitle}>Account</Text>
            <View style={styles.profileSection}>
              <View style={styles.avatarLarge}><Leaf size={40} color="#00FFA3" /></View>
              <Text style={styles.profileName}>{user?.fullName || 'Guest User'}</Text>
              <Text style={styles.profileEmail}>{user?.primaryEmailAddress?.emailAddress || 'Not signed in'}</Text>
            </View>
            <SignedIn><TouchableOpacity style={styles.authButtonOutline} onPress={() => useAuth().signOut()}><Text style={styles.authButtonTextOutline}>Sign Out</Text></TouchableOpacity></SignedIn>
            <SignedOut><TouchableOpacity style={styles.authButton} onPress={onSignInPress}><Text style={styles.authButtonText}>Sign In with Google</Text></TouchableOpacity></SignedOut>
            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {isNavigating && (
          <View style={styles.navOverlay}>
            <LinearGradient colors={['#00FFA3', '#00D187']} style={styles.navGradient}>
              <Navigation size={48} color="#000" />
              <Text style={styles.navActiveTitle}>Navigation Active</Text>
              <Text style={styles.navActiveSub}>Following Greenest Route</Text>
              <TouchableOpacity style={styles.stopButton} onPress={() => setIsNavigating(false)}>
                <Text style={styles.stopButtonText}>Stop Journey</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('map')}><MapIcon size={24} color={activeTab === 'map' ? "#00FFA3" : "#64748b"} /></TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('dashboard')}><Activity size={24} color={activeTab === 'dashboard' ? "#00FFA3" : "#64748b"} /></TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('profile')}><Leaf size={24} color={activeTab === 'profile' ? "#00FFA3" : "#64748b"} /></TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  searchSection: { padding: 20, paddingTop: 10, zIndex: 100 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 15 },
  inputContainer: { flexDirection: 'row', alignItems: 'center' },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, height: 48, marginRight: 8 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: '#fff', fontSize: 14 },
  searchButton: { width: 48, height: 48, borderRadius: 12, overflow: 'hidden' },
  gradientSearch: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  suggestionsBox: { position: 'absolute', top: 120, left: 20, right: 20, backgroundColor: '#1e293b', borderRadius: 12, padding: 8, zIndex: 1000, borderWidth: 1, borderColor: '#334155' },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#334155' },
  suggestionText: { color: '#fff', fontSize: 14 },
  mapContainer: { height: 350, margin: 20, borderRadius: 24, overflow: 'hidden', backgroundColor: '#1e293b' },
  mapFrame: { flex: 1 },
  map: { width: '100%', height: '100%' },
  vehicleSelect: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, marginBottom: 20 },
  vehicleCard: { padding: 12, borderRadius: 12, backgroundColor: '#1e293b', marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  vehicleLabel: { color: '#64748b', fontWeight: '600' },
  resultsContainer: { paddingHorizontal: 20 },
  routeCard: { backgroundColor: '#1e293b', padding: 20, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  routeCardActive: { borderColor: '#00FFA3', backgroundColor: 'rgba(0,255,163,0.05)' },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  routeType: { color: '#fff', fontSize: 18, fontWeight: '700' },
  badge: { backgroundColor: 'rgba(0,255,163,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#00FFA3', fontSize: 12, fontWeight: '700' },
  routeStats: { color: '#64748b', fontSize: 14, marginBottom: 4 },
  routeCarbon: { color: '#00FFA3', fontSize: 16, fontWeight: '600' },
  tabContent: { flex: 1, padding: 20 },
  tabTitle: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 25 },
  statsCard: { backgroundColor: '#1e293b', borderRadius: 24, padding: 25, alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: '#334155' },
  statLarge: { fontSize: 48, fontWeight: '800', color: '#00FFA3' },
  statLargeLabel: { color: '#64748b', fontSize: 16, fontWeight: '600', marginTop: 5 },
  divider: { height: 1, backgroundColor: '#334155', width: '100%', marginVertical: 20 },
  statSubText: { color: '#64748b', fontSize: 14 },
  historySection: { marginBottom: 30 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 15 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: 15, borderRadius: 16, marginBottom: 10 },
  historyInfo: { flex: 1 },
  historyRoute: { color: '#fff', fontSize: 16, fontWeight: '600' },
  historyDate: { color: '#64748b', fontSize: 12, marginTop: 2 },
  historySaving: { color: '#00FFA3', fontSize: 18, fontWeight: '700' },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 20 },
  profileSection: { alignItems: 'center', marginBottom: 40 },
  avatarLarge: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,255,163,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  profileName: { fontSize: 24, fontWeight: '700', color: '#fff' },
  profileEmail: { fontSize: 16, color: '#64748b', marginTop: 5 },
  authButton: { backgroundColor: '#00FFA3', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  authButtonText: { color: '#000', fontSize: 16, fontWeight: '700' },
  authButtonOutline: { borderWidth: 1, borderColor: '#334155', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  authButtonTextOutline: { color: '#fff', fontSize: 16, fontWeight: '600' },
  bottomNav: { position: 'absolute', bottom: 30, left: 20, right: 20, height: 70, backgroundColor: '#1e293b', borderRadius: 25, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderWidth: 1, borderColor: '#334155', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10 },
  navItem: { padding: 15 },
  startJourneyButton: { marginTop: 20, height: 55, borderRadius: 16, overflow: 'hidden' },
  startJourneyText: { color: '#000', fontSize: 16, fontWeight: '800' },
  trafficBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 255, 163, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginHorizontal: 8 },
  trafficText: { color: '#00FFA3', fontSize: 10, fontWeight: '700', marginLeft: 4 },
  navOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10000 },
  navGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  navActiveTitle: { color: '#000', fontSize: 32, fontWeight: '900', marginTop: 20 },
  navActiveSub: { color: 'rgba(0,0,0,0.6)', fontSize: 16, fontWeight: '600', marginTop: 5 },
  stopButton: { marginTop: 50, backgroundColor: '#000', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30 },
  stopButtonText: { color: '#00FFA3', fontSize: 18, fontWeight: '800' }
});
