# SkySpotter

Live flight tracker displayed on a retro split-flap board. Forked from [FlipOff](https://github.com/magnum6actual/flipoff).

## How It Works

SkySpotter polls the [OpenSky Network API](https://opensky-network.org/) for real-time aircraft data within a configurable bounding box, then renders each flight as a row on an animated split-flap display — callsign, altitude, speed, and heading.

## Quick Start

Just open `index.html` in a browser. No build step, no dependencies.

By default it tracks aircraft near LaGuardia Airport (LGA). To change the location, add URL parameters:

```
index.html?lat=40.77&lon=-73.87&range=0.08&name=LGA%20AREA
```

| Param   | Description                          | Default  |
|---------|--------------------------------------|----------|
| `lat`   | Center latitude                      | 40.77    |
| `lon`   | Center longitude                     | -73.87   |
| `range` | Bounding box radius in degrees (~5mi)| 0.08     |
| `name`  | Location label on the board          | LGA AREA |

## Keyboard Shortcuts

| Key       | Action        |
|-----------|---------------|
| Enter / → | Next page     |
| ←         | Previous page |
| F         | Fullscreen    |
| M         | Mute/unmute   |

## Data Source

Aircraft state vectors come from OpenSky Network's free REST API. Without authentication, you can poll every 10 seconds. Each response includes callsign, altitude, ground speed, heading, vertical rate, and more.

## License

MIT — same as the original FlipOff project.
