// Board dimensions — wider to fit flight data columns
export const GRID_COLS = 30;
export const GRID_ROWS = 9;

// Animation timing
export const SCRAMBLE_DURATION = 800;
export const FLIP_DURATION = 300;
export const STAGGER_DELAY = 15;
export const TOTAL_TRANSITION = 3200;

// Polling interval for flight data (ms)
export const POLL_INTERVAL = 15000;

// Character set for scramble animation
export const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,-!/: ';

// Scramble color cycle
export const SCRAMBLE_COLORS = [
  '#00AAFF', '#00FFCC', '#AA00FF',
  '#FF2D00', '#FFCC00', '#FFFFFF'
];

// Accent bar colors
export const ACCENT_COLORS = [
  '#00FF7F', '#FF4D00', '#AA00FF',
  '#00AAFF', '#00FFCC'
];

// Default bounding box: LaGuardia Airport area (~5 mile radius)
// Override via URL params: ?lat=40.77&lon=-73.87&range=0.08
export const DEFAULT_LAT = 40.77;
export const DEFAULT_LON = -73.87;
export const DEFAULT_RANGE = 0.08; // degrees (~5 miles)

// OpenSky Network API
export const OPENSKY_API = 'https://opensky-network.org/api/states/all';

// Header row for the board
export const HEADER_ROW = 'CALL    ALT    SPD  HDG  ';
