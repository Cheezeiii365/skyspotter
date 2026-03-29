import {
  POLL_INTERVAL, TOTAL_TRANSITION, GRID_ROWS, GRID_COLS,
  OPENSKY_API, DEFAULT_LAT, DEFAULT_LON, DEFAULT_RANGE,
  HEADER_ROW
} from './constants.js';

export class FlightPoller {
  constructor(board) {
    this.board = board;
    this._timer = null;
    this._paused = false;
    this._flights = [];
    this._page = 0;
    this._lastFetch = 0;

    // Parse location from URL params or use defaults
    const params = new URLSearchParams(window.location.search);
    this.lat = parseFloat(params.get('lat')) || DEFAULT_LAT;
    this.lon = parseFloat(params.get('lon')) || DEFAULT_LON;
    this.range = parseFloat(params.get('range')) || DEFAULT_RANGE;

    // Number of flight rows (rows minus header and title)
    this._flightRows = GRID_ROWS - 2;
  }

  start() {
    this._showLoading();
    this._poll();
    this._timer = setInterval(() => {
      if (!this._paused) {
        this._poll();
      }
    }, POLL_INTERVAL);
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /** Advance to next page of flights */
  next() {
    if (this._flights.length === 0) return;
    const maxPages = Math.ceil(this._flights.length / this._flightRows);
    this._page = (this._page + 1) % maxPages;
    this._render();
  }

  /** Go to previous page of flights */
  prev() {
    if (this._flights.length === 0) return;
    const maxPages = Math.ceil(this._flights.length / this._flightRows);
    this._page = (this._page - 1 + maxPages) % maxPages;
    this._render();
  }

  _showLoading() {
    const lines = [
      '',
      '',
      '',
      '   SCANNING AIRSPACE...',
      '',
      '',
      '',
      '',
      ''
    ];
    this.board.displayMessage(lines);
  }

  async _poll() {
    const lamin = this.lat - this.range;
    const lamax = this.lat + this.range;
    const lomin = this.lon - this.range;
    const lomax = this.lon + this.range;

    const url = `${OPENSKY_API}?lamin=${lamin}&lamax=${lamax}&lomin=${lomin}&lomax=${lomax}`;

    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        this._showError(resp.status);
        return;
      }
      const data = await resp.json();
      this._flights = this._parseFlights(data);
      this._lastFetch = Date.now();
      this._render();
    } catch (err) {
      console.warn('Flight poll failed:', err);
      // Keep showing last data if we have it
      if (this._flights.length === 0) {
        this._showError('NET');
      }
    }
  }

  _parseFlights(data) {
    if (!data || !data.states) return [];

    return data.states
      .map(s => ({
        callsign: (s[1] || '').trim(),
        origin: s[2] || '',
        altitude: s[7] != null ? Math.round(s[7] * 3.281) : null, // meters -> feet
        speed: s[9] != null ? Math.round(s[9] * 1.944) : null,    // m/s -> knots
        heading: s[10] != null ? Math.round(s[10]) : null,
        onGround: s[8],
        vertRate: s[11] != null ? Math.round(s[11] * 196.85) : null // m/s -> ft/min
      }))
      .filter(f => f.callsign && !f.onGround) // Only airborne flights with callsigns
      .sort((a, b) => (a.altitude || 0) - (b.altitude || 0)); // Sort by altitude
  }

  _render() {
    const lines = [];
    const count = this._flights.length;
    const maxPages = Math.max(1, Math.ceil(count / this._flightRows));
    const page = Math.min(this._page, maxPages - 1);

    // Row 0: Title bar
    const locationName = this._getLocationName();
    const countStr = `${count} ACFT`;
    const titlePad = GRID_COLS - locationName.length - countStr.length;
    lines.push(locationName + ' '.repeat(Math.max(1, titlePad)) + countStr);

    // Row 1: Column headers
    lines.push(HEADER_ROW);

    // Rows 2+: Flight data
    const start = page * this._flightRows;
    const pageFlights = this._flights.slice(start, start + this._flightRows);

    for (let i = 0; i < this._flightRows; i++) {
      if (i < pageFlights.length) {
        lines.push(this._formatFlight(pageFlights[i]));
      } else {
        lines.push('');
      }
    }

    this.board.displayMessage(lines);
  }

  _formatFlight(f) {
    const call = (f.callsign || '------').padEnd(8).slice(0, 8);
    const alt = f.altitude != null ? String(f.altitude).padStart(6) : '  ----';
    const spd = f.speed != null ? String(f.speed).padStart(4) : ' ---';
    const hdg = f.heading != null ? String(f.heading).padStart(3).padEnd(3) + '\u00B0' : '---\u00B0';
    return `${call}${alt}  ${spd}  ${hdg}`;
  }

  _getLocationName() {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name');
    if (name) return name.toUpperCase().slice(0, 20);

    // Default based on coordinates
    if (Math.abs(this.lat - 40.77) < 0.01 && Math.abs(this.lon - (-73.87)) < 0.01) {
      return 'LGA AREA';
    }
    return `${this.lat.toFixed(2)}N ${Math.abs(this.lon).toFixed(2)}W`;
  }

  _showError(code) {
    const lines = [
      '',
      '',
      '',
      `  API ERROR: ${code}`,
      '  RETRYING...',
      '',
      '',
      '',
      ''
    ];
    this.board.displayMessage(lines);
  }
}
