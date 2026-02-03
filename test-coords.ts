import proj4 from 'proj4';

// Define projections (official EPSG:5179)
proj4.defs('EPSG:5179', '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs +type=crs');
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs +type=crs');

// Test case from CSV
const x = 191647.1628;
const y = 444844.7641;

console.log('\n🧪 Testing coordinate transformations:\n');

// Test 1: Normal order [x, y]
const [lng1, lat1] = proj4('EPSG:5179', 'EPSG:4326', [x, y]);
console.log(`1. [x, y] = [${x}, ${y}]`);
console.log(`   → [lng, lat] = [${lng1.toFixed(6)}, ${lat1.toFixed(6)}]`);
console.log(`   Match Seoul? ${Math.abs(lng1 - 126.9) < 0.2 && Math.abs(lat1 - 37.5) < 0.2 ? '✅ YES' : '❌ NO'}\n`);

// Test 2: Swapped order [y, x]
const [lng2, lat2] = proj4('EPSG:5179', 'EPSG:4326', [y, x]);
console.log(`2. [y, x] = [${y}, ${x}]`);
console.log(`   → [lng, lat] = [${lng2.toFixed(6)}, ${lat2.toFixed(6)}]`);
console.log(`   Match Seoul? ${Math.abs(lng2 - 126.9) < 0.2 && Math.abs(lat2 - 37.5) < 0.2 ? '✅ YES' : '❌ NO'}\n`);

// Expected Seoul location
console.log(`✅ Expected: ~126.9°E, ~37.5°N (Seoul)`);
