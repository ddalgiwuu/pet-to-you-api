import proj4 from 'proj4';

// Define projections
proj4.defs('EPSG:5179', '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');

// Test case from CSV: Daum Animal Hospital
const x = 191647.1628;
const y = 444844.7641;

console.log(`\n📍 Coordinate Conversion Test`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Input (EPSG:5179):`);
console.log(`  X: ${x}`);
console.log(`  Y: ${y}`);

const [lng, lat] = proj4('EPSG:5179', 'EPSG:4326', [x, y]);

console.log(`\nOutput (WGS84 / EPSG:4326):`);
console.log(`  Longitude: ${lng.toFixed(6)}`);
console.log(`  Latitude:  ${lat.toFixed(6)}`);

// Expected: Approximately Seoul (126.9°E, 37.5°N)
console.log(`\n✅ Expected Seoul coordinates: ~126.9°E, ~37.5°N`);
console.log(`   Match: ${Math.abs(lng - 126.9) < 0.2 && Math.abs(lat - 37.5) < 0.2 ? '✅ YES' : '❌ NO'}`);

// Google Maps link
console.log(`\n🗺️  Google Maps: https://www.google.com/maps?q=${lat},${lng}`);
