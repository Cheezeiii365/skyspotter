// Airline logo URL from ICAO code
// Source: https://github.com/sexym0nk3y/airline-logos (~993 logos)
const LOGO_CDN = 'https://cdn.jsdelivr.net/gh/sexym0nk3y/airline-logos@main/logos';

export function getAirlineLogo(callsign) {
  const icao = (callsign || '').slice(0, 3).toUpperCase();
  if (!icao || icao.length < 3) return null;
  return `${LOGO_CDN}/${icao}.png`;
}
