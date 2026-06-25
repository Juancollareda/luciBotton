const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config.json');

const DEFAULT_CONFIG = {
  missileCost: 50,
  missileCooldownMinutes: 30,
  shieldDurationMinutes: 120,
  maxDamagePercent: 0.5,
  multiplierDurationSeconds: 60,
  boostMultiplier: 2
};

let currentConfig = { ...DEFAULT_CONFIG };

// Load config from file
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      currentConfig = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
      console.log('✓ Dynamic configuration loaded from config.json');
    } else {
      saveConfig(DEFAULT_CONFIG);
      console.log('✓ Created default config.json');
    }
  } catch (error) {
    console.error('Error loading config, using defaults:', error);
  }
}

// Save config to file
function saveConfig(newConfig) {
  try {
    currentConfig = { ...currentConfig, ...newConfig };
    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

// Initial load
loadConfig();

module.exports = {
  get: (key) => currentConfig[key],
  getAll: () => currentConfig,
  set: (key, value) => {
    currentConfig[key] = value;
    return saveConfig(currentConfig);
  },
  setAll: (newConfig) => {
    return saveConfig(newConfig);
  }
};
