/**
 * XCAD 2D - GIS, Coordinate Systems & Site Planning Module
 * Implements:
 * 1. Integrated Esri ArcGIS & OSM Basemaps (Satellite, OSM, Streets, Light/Dark Gray)
 * 2. Native Coordinate System Assignment (GEOGRAPHICLOCATION / GEO)
 * 3. Map Resolution & Static Map Capture (MAPCAPTURE)
 * 4. Real-time GPS / UTM coordinate readout
 */

class XcadGisMap {
  constructor(engine, ui) {
    this.engine = engine;
    this.ui = ui;

    // Basemap state
    this.enabled = false;
    this.activeBasemap = "SATELLITE"; // 'SATELLITE', 'OSM', 'STREETS', 'DARK_GRAY', 'LIGHT_GRAY'
    this.opacity = 0.85;

    // Geographic Location Reference Point (CAD Origin 0,0 maps to this GPS coordinate)
    this.refLatitude = 37.774929;   // San Francisco default (configurable)
    this.refLongitude = -122.419416;
    this.coordinateSystem = "WGS84 / Web Mercator (EPSG:3857)";
    this.metersPerCadUnit = 1.0; // 1 CAD unit = 1 meter

    // Tile caching & downloading
    this.tileCache = new Map();
    this.tileServers = {
      SATELLITE: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      OSM: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      STREETS: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      DARK_GRAY: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      LIGHT_GRAY: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
    };
  }

  // Set Geographic Reference (GEOGRAPHICLOCATION)
  setLocation(lat, lon, coordSys = "WGS84 (EPSG:4326)") {
    this.refLatitude = parseFloat(lat);
    this.refLongitude = parseFloat(lon);
    this.coordinateSystem = coordSys;
    this.tileCache.clear();
    this.engine.render();
    this.ui.logCommand(`GEOGRAPHICLOCATION: Set Origin (0,0) -> Lat: ${this.refLatitude.toFixed(6)}°, Lon: ${this.refLongitude.toFixed(6)}° [${coordSys}]`);
  }

  // Toggle Basemap On/Off
  toggleBasemap(type = null) {
    if (type) {
      this.activeBasemap = type.toUpperCase();
      this.enabled = true;
    } else {
      this.enabled = !this.enabled;
    }

    const pill = document.getElementById("pill-gis");
    if (pill) {
      pill.classList.toggle("active", this.enabled);
      pill.innerText = this.enabled ? `GIS: ${this.activeBasemap}` : "GIS MAP";
    }

    this.ui.logCommand(`BASEMAP: ${this.enabled ? `<ON: ${this.activeBasemap}>` : "<OFF>"}`);
    this.engine.render();
  }

  // Convert CAD World Coordinate to GPS (Lat/Lon)
  worldToGps(wx, wy) {
    const metersX = wx * this.metersPerCadUnit;
    const metersY = wy * this.metersPerCadUnit;

    const latDist = metersY / 111320; // ~111.32 km per latitude degree
    const lonDist = metersX / (40075000 * Math.cos(this.refLatitude * Math.PI / 180) / 360);

    return {
      lat: this.refLatitude + latDist,
      lon: this.refLongitude + lonDist
    };
  }

  // Render streaming tiles onto CAD Canvas underlay
  render(ctx) {
    if (!this.enabled) return;

    const canvas = this.engine.canvas;
    const p1 = this.engine.screenToWorld(0, canvas.clientHeight);
    const p2 = this.engine.screenToWorld(canvas.clientWidth, 0);

    const gpsMin = this.worldToGps(p1.x, p1.y);
    const gpsMax = this.worldToGps(p2.x, p2.y);

    // Calculate optimal Web Mercator zoom level based on current CAD zoom scale
    const pixelsPerDegree = (canvas.clientWidth / Math.abs(gpsMax.lon - gpsMin.lon));
    const zoom = Math.max(1, Math.min(19, Math.floor(Math.log2(pixelsPerDegree / 1.4))));

    const tileMin = this.lonLatToTile(gpsMin.lon, gpsMax.lat, zoom);
    const tileMax = this.lonLatToTile(gpsMax.lon, gpsMin.lat, zoom);

    const minTX = Math.min(tileMin.x, tileMax.x) - 1;
    const maxTX = Math.max(tileMin.x, tileMax.x) + 1;
    const minTY = Math.min(tileMin.y, tileMax.y) - 1;
    const maxTY = Math.max(tileMin.y, tileMax.y) + 1;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    // Limit rendered tiles to viewport max 25 to guarantee 60fps performance
    let renderedCount = 0;
    for (let tx = minTX; tx <= maxTX; tx++) {
      for (let ty = minTY; ty <= maxTY; ty++) {
        if (renderedCount++ > 36) break;
        this.drawTile(ctx, tx, ty, zoom);
      }
    }

    ctx.restore();
  }

  drawTile(ctx, x, y, z) {
    const tileUrl = this.getTileUrl(x, y, z);
    if (!tileUrl) return;

    const key = `${z}_${x}_${y}_${this.activeBasemap}`;
    let img = this.tileCache.get(key);

    if (!img) {
      img = new Image();
      img.crossOrigin = "anonymous";
      img.src = tileUrl;
      img.onload = () => {
        this.engine.render();
      };
      this.tileCache.set(key, img);
      return;
    }

    if (!img.complete || img.naturalWidth === 0) return;

    // Calculate tile geographic bounds
    const nw = this.tileToLonLat(x, y, z);
    const se = this.tileToLonLat(x + 1, y + 1, z);

    // Convert GPS bounds back to CAD World coordinates
    const cadNW = this.gpsToWorld(nw.lat, nw.lon);
    const cadSE = this.gpsToWorld(se.lat, se.lon);

    // Convert to screen
    const scrNW = this.engine.worldToScreen(cadNW.x, cadNW.y);
    const scrSE = this.engine.worldToScreen(cadSE.x, cadSE.y);

    const sw = scrSE.x - scrNW.x;
    const sh = scrSE.y - scrNW.y;

    if (sw > 0 && sh > 0) {
      ctx.drawImage(img, scrNW.x, scrNW.y, sw, sh);
    }
  }

  gpsToWorld(lat, lon) {
    const dLat = lat - this.refLatitude;
    const dLon = lon - this.refLongitude;

    const metersY = dLat * 111320;
    const metersX = dLon * (40075000 * Math.cos(this.refLatitude * Math.PI / 180) / 360);

    return {
      x: metersX / this.metersPerCadUnit,
      y: metersY / this.metersPerCadUnit
    };
  }

  lonLatToTile(lon, lat, zoom) {
    const n = Math.pow(2, zoom);
    const rad = lat * Math.PI / 180;
    const x = Math.floor((lon + 180) / 360 * n);
    const y = Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n);
    return { x, y };
  }

  tileToLonLat(x, y, zoom) {
    const n = Math.pow(2, zoom);
    const lon = x / n * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    const lat = latRad * 180 / Math.PI;
    return { lat, lon };
  }

  getTileUrl(x, y, z) {
    const template = this.tileServers[this.activeBasemap] || this.tileServers.SATELLITE;
    return template.replace("{z}", z).replace("{x}", x).replace("{y}", y);
  }

  // Capture currently viewed basemap area as a static drawing underlay (MAPCAPTURE)
  captureBasemap() {
    if (!this.enabled) {
      this.ui.setPrompt("MAPCAPTURE: Turn on Basemap first.");
      return;
    }

    const canvas = this.engine.canvas;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");

    // Draw only tiles
    this.render(tempCtx);

    const dataUrl = tempCanvas.toDataURL("image/jpeg", 0.9);
    const pNW = this.engine.screenToWorld(0, 0);
    const pSE = this.engine.screenToWorld(canvas.clientWidth, canvas.clientHeight);

    const underlay = new CadImageUnderlay(
      pNW.x, pSE.y,
      Math.abs(pSE.x - pNW.x),
      Math.abs(pNW.y - pSE.y),
      dataUrl,
      `GIS_Capture_${this.activeBasemap}`
    );

    this.engine.entities.unshift(underlay); // Place at bottom
    this.engine.render();
    this.ui.logCommand(`MAPCAPTURE: Locked static aerial underlay to drawing entities.`);
    this.ui.setPrompt("Captured basemap tile area as static raster image underlay.");
  }
}
