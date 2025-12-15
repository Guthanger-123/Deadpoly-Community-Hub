<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Delta Map</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    html, body { height:100%; margin:0; background:#0b0b0f; }
    #map { height:100vh; }
    .topbar{
      position:fixed; top:10px; left:10px; z-index:2000;
      display:flex; gap:10px; align-items:center;
    }
    .btn{
      padding:10px 12px; border-radius:12px;
      border:1px solid rgba(255,255,255,.14);
      background:rgba(0,0,0,.35); color:#fff; text-decoration:none;
      font:12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      transition:transform .12s ease, background .12s ease;
      transform:translateY(0);
    }
    .btn:hover{ background:rgba(255,255,255,.10); transform:translateY(-2px); }
  </style>
</head>
<body>
  <div class="topbar">
    <a class="btn" href="../index.html#maps">← Back to Menu</a>
    <a class="btn" href="../index.html#home">Home</a>
  </div>

  <div id="map" aria-label="Delta interactive map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    // Update if your Delta image is not 1264x1264.
    const IMAGE_WIDTH = 1264;
    const IMAGE_HEIGHT = 1264;

    const IMAGE_URL = "../Screenshot 2025-09-08 194255.png";

    const map = L.map('map', {
      crs: L.CRS.Simple,
      minZoom: -6,
      maxZoom: 6,
      zoomSnap: 0.25,
      zoomDelta: 0.25
    });

    const bounds = new L.LatLngBounds(
      map.unproject([0, IMAGE_HEIGHT], 0),
      map.unproject([IMAGE_WIDTH, 0], 0)
    );

    L.imageOverlay(IMAGE_URL, bounds).addTo(map);
    map.fitBounds(bounds);
    map.setMaxBounds(bounds);
    map.options.maxBoundsViscosity = 0.9;
  </script>
</body>
</html>
