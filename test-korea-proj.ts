import proj4 from 'proj4';

// Try different Korean projection definitions
const defs = {
  // Official EPSG:5179 - Korea 2000 / Unified CS
  'official': '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs',

  // Alternative 1: Korea 2000 / Central Belt
  'alt1': '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs',

  // Alternative 2: Bessel-based (older Korean system)
  'alt2': '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs',

  // Alternative 3: Modified false easting/northing
  'alt3': '+proj=tmerc +lat_0=38 +lon_0=127 +k=0.9999 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs',
};

const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';

const x = 191647.1628;
const y = 444844.7641;

console.log('\n🔬 Testing different Korean projections:\n');
console.log(`Input: x=${x}, y=${y}\n`);

Object.entries(defs).forEach(([name, def]) => {
  try {
    const [lng, lat] = proj4(def, wgs84, [x, y]);
    const match = Math.abs(lng - 126.9) < 0.5 && Math.abs(lat - 37.5) < 0.5;
    console.log(`${name}:`);
    console.log(`  → ${lng.toFixed(6)}°E, ${lat.toFixed(6)}°N`);
    console.log(`  ${match ? '✅ MATCH' : '❌ No match'}\n`);
  } catch (e) {
    console.log(`${name}: ❌ Error\n`);
  }
});

console.log(`Target: ~126.9°E, ~37.5°N (Seoul)`);
