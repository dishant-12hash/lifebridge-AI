export class MapManager {
  constructor(containerId, onMarkerClick) {
    this.containerId = containerId;
    this.onMarkerClick = onMarkerClick;
    this.map = null;
    this.markersGroup = null;
    this.routesGroup = null;
    this.hazardsGroup = null;
    this.userMarker = null;
    
    // Cache references to loaded markers for easy dynamic highlighting
    this.shelterMarkers = {};
    this.hospitalMarkers = {};
  }

  initialize(center) {
    if (this.map) {
      this.map.remove();
    }

    // Set up Leaflet map with customized zoom and bounds
    this.map = L.map(this.containerId, {
      zoomControl: false,
      attributionControl: false
    }).setView(center, 14);

    // Add standard dark layer representation of OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      className: 'dark-tiles'
    }).addTo(this.map);

    // Style tiles to fit dark mode (using CSS filter class)
    const mapEl = document.getElementById(this.containerId);
    mapEl.classList.add('dark-map-theme');

    this.markersGroup = L.layerGroup().addTo(this.map);
    this.routesGroup = L.layerGroup().addTo(this.map);
    this.hazardsGroup = L.layerGroup().addTo(this.map);

    this.drawUserMarker(center);
  }

  // Visual filter for Map styles in CSS
  // We'll write styles for .dark-map-theme in style.css:
  // .dark-map-theme .leaflet-tile-container { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }

  drawUserMarker(coords) {
    if (this.userMarker) {
      this.map.removeLayer(this.userMarker);
    }

    // Custom pulsing marker for user position
    const pulseIcon = L.divIcon({
      className: 'user-pulse-icon',
      html: '<div class="user-dot"></div><div class="user-pulse"></div>',
      iconSize: [20, 20]
    });

    this.userMarker = L.marker(coords, { icon: pulseIcon }).addTo(this.map);
    this.userMarker.bindPopup("<strong>Your Location</strong><br>GPS Active (Simulated)").openPopup();
  }

  loadScenario(data) {
    // Clear existing overlay features
    this.markersGroup.clearLayers();
    this.routesGroup.clearLayers();
    this.hazardsGroup.clearLayers();
    this.shelterMarkers = {};
    this.hospitalMarkers = {};

    this.drawUserMarker(data.center);
    this.map.setView(data.center, 14);

    // Draw Hazards
    if (data.hazards) {
      data.hazards.forEach(hazard => {
        const color = hazard.type === 'flood' ? '#ff3b30' : '#ff9500';
        L.polygon(hazard.polygon, {
          color: color,
          fillColor: color,
          fillOpacity: 0.25,
          weight: 2,
          dashArray: '5, 5'
        }).bindPopup(`<strong>Hazard Zone: ${hazard.name}</strong><br>Rising risk levels detected. Avoid.`)
          .addTo(this.hazardsGroup);
      });
    }

    // Draw Roads (Polylines)
    if (data.roads) {
      data.roads.forEach(road => {
        let color = '#34c759'; // safe - green
        let weight = 4;
        let dash = '';
        
        if (road.status === 'blocked') {
          color = '#ff3b30'; // blocked - red
          weight = 5;
          dash = '3, 6';
        } else if (road.status === 'caution') {
          color = '#ff9500'; // caution - yellow/orange
          weight = 4;
        }

        const polyline = L.polyline(road.path, {
          color: color,
          weight: weight,
          opacity: 0.8,
          dashArray: dash
        }).addTo(this.routesGroup);

        polyline.bindPopup(`<strong>${road.name}</strong><br>Status: <span style="color:${color}">${road.status.toUpperCase()}</span><br>${road.description}`);
      });
    }

    // Draw Shelters
    if (data.shelters) {
      data.shelters.forEach(shelter => {
        const shelterIcon = L.divIcon({
          className: 'custom-map-marker shelter-marker',
          html: `<div class="marker-circle" style="background:#10b981">
                   <svg viewBox="0 0 24 24" width="14" height="14" fill="#fff">
                     <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                   </svg>
                 </div>`,
          iconSize: [28, 28]
        });

        const marker = L.marker([shelter.lat, shelter.lng], { icon: shelterIcon }).addTo(this.markersGroup);
        this.shelterMarkers[shelter.id] = marker;

        const popupContent = `
          <strong>${shelter.name}</strong><br>
          Occupancy: ${shelter.capacity} (${shelter.occupancyRate}% full)<br>
          Resources: Food: ${shelter.resources.food}, Water: ${shelter.resources.water}<br>
          Contact: ${shelter.contact}<br><br>
          <button class="map-action-btn" onclick="window.triggerAgentRouting('shelter', '${shelter.id}')">
            Calculate Safe Route
          </button>
        `;
        marker.bindPopup(popupContent);
      });
    }

    // Draw Hospitals
    if (data.hospitals) {
      data.hospitals.forEach(hosp => {
        const hospIcon = L.divIcon({
          className: 'custom-map-marker hospital-marker',
          html: `<div class="marker-circle" style="background:#06b6d4">
                   <svg viewBox="0 0 24 24" width="14" height="14" fill="#fff">
                     <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
                   </svg>
                 </div>`,
          iconSize: [28, 28]
        });

        const marker = L.marker([hosp.lat, hosp.lng], { icon: hospIcon }).addTo(this.markersGroup);
        this.hospitalMarkers[hosp.id] = marker;

        const popupContent = `
          <strong>${hosp.name}</strong><br>
          Emergency Wait Time: <span style="color:#06b6d4">${hosp.waitTime}</span><br>
          Beds Available: ${hosp.bedsAvailable}<br>
          Specialists: ${hosp.specialists.join(", ")}<br>
          Contact: ${hosp.contact}<br><br>
          <button class="map-action-btn" onclick="window.triggerAgentRouting('hospital', '${hosp.id}')">
            Route to Hospital
          </button>
        `;
        marker.bindPopup(popupContent);
      });
    }
  }

  highlightShelter(shelterId) {
    const marker = this.shelterMarkers[shelterId];
    if (marker) {
      this.map.panTo(marker.getLatLng());
      marker.openPopup();
      this.drawRouteTo(marker.getLatLng(), '#10b981');
    }
  }

  highlightHospital(hospId) {
    const marker = this.hospitalMarkers[hospId];
    if (marker) {
      this.map.panTo(marker.getLatLng());
      marker.openPopup();
      this.drawRouteTo(marker.getLatLng(), '#06b6d4');
    }
  }

  showRoadStatus() {
    // Zoom out slightly to show all routes
    const bounds = this.routesGroup.getBounds ? this.routesGroup.getBounds() : null;
    if (bounds && Object.keys(bounds).length > 0) {
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  drawRouteTo(destCoords, color) {
    // Simulated path routing avoiding hazard areas
    const startCoords = this.userMarker.getLatLng();
    
    // Draw a custom neon polyline showing route path
    // For demo purposes, we will route them along the safest road path
    // We create a direct but slightly curved polyline to simulate road layouts
    const midPoint = [
      (startCoords.lat + destCoords.lat) / 2 + 0.002,
      (startCoords.lng + destCoords.lng) / 2 - 0.002
    ];

    const routePath = [startCoords, midPoint, destCoords];

    // Remove any previously active navigation route line
    this.activeRouteLine = L.polyline(routePath, {
      color: color,
      weight: 6,
      opacity: 0.9,
      dashArray: '10, 10',
      lineCap: 'round',
      className: 'pulse-navigation-route'
    }).addTo(this.map);

    this.map.fitBounds(this.activeRouteLine.getBounds(), { padding: [40, 40] });
  }

  enableHazardPlacementMode(onPlacedCallback) {
    this.onMapClick = (e) => {
      const { lat, lng } = e.latlng;
      const type = prompt("Enter hazard description (e.g., 'Fallen Tree', 'Deep Floodwater', 'Debris'):", "Blocked Path");
      if (type) {
        this.drawHazardMarker(lat, lng, type, false);
        onPlacedCallback(lat, lng, type);
      }
    };
    this.map.on('click', this.onMapClick);
    
    const mapContainer = document.getElementById(this.containerId);
    if (mapContainer) {
      mapContainer.style.cursor = 'crosshair';
    }
  }

  disableHazardPlacementMode() {
    if (this.onMapClick) {
      this.map.off('click', this.onMapClick);
      this.onMapClick = null;
    }
    const mapContainer = document.getElementById(this.containerId);
    if (mapContainer) {
      mapContainer.style.cursor = '';
    }
  }

  drawHazardMarker(lat, lng, type, isPeer, peerName = "") {
    const color = isPeer ? "#ff9500" : "#ff3b30";
    const title = isPeer ? `Peer Alert (${peerName})` : "Your Hazard Report";
    
    const hazardIcon = L.divIcon({
      className: 'custom-map-marker user-hazard-marker',
      html: `<div class="marker-circle" style="background:${color}; box-shadow: 0 0 8px ${color}">
               <svg viewBox="0 0 24 24" width="14" height="14" fill="#fff">
                 <path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z"/>
               </svg>
             </div>`,
      iconSize: [28, 28]
    });

    const marker = L.marker([lat, lng], { icon: hazardIcon }).addTo(this.markersGroup);
    marker.bindPopup(`<strong>⚠️ ${title}</strong><br>Hazard: ${type}<br>Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`).openPopup();
    
    if (isPeer) {
      this.map.panTo([lat, lng]);
    }
  }
}

