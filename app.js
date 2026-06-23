import { MOCK_DATASETS, TRIAGE_TREE, TRIAGE_RESULTS } from "./guides-data.js";
import { LifeBridgeAgent } from "./ai-agent.js";
import { MapManager } from "./map-manager.js";

class LifeBridgeApp {
  constructor() {
    this.activeScenarioKey = "coastal_bay";
    this.agent = new LifeBridgeAgent(this);
    this.mapManager = null;
    
    // Core state flags
    this.isMuted = false;
    this.isListening = false;
    this.strobeInterval = null;
    this.audioContext = null;
    this.oscillator = null;
    this.strobeActive = false;
    
    // Crisis Calmer Breathing
    this.breathingActive = false;
    this.breathingTimer = null;
    
    // Triage Diagnostic
    this.currentTriageNode = "start";
    
    // P2P Offline Collaborative Hazard reports
    this.userHazards = [];
    this.hazardPlacementMode = false;
    
    // Distress Sound Radar variables
    this.radarActive = false;
    this.audioStream = null;
    this.analyser = null;
    this.radarAnimationId = null;
    this.peakThreshold = 65; // Volume threshold for tap detection
    this.lastPeakTime = 0;
    this.tapHistory = []; // Timestamps of detected sound peaks
  }

  init() {
    // 1. Register Service Worker
    this.registerServiceWorker();

    // 2. Initialize Map Manager
    this.mapManager = new MapManager("map");
    const activeData = this.getActiveScenarioData();
    this.mapManager.initialize(activeData.center);
    this.mapManager.loadScenario(activeData);

    // 3. UI Element Bindings
    this.bindUIEvents();

    // 4. Load initial welcome chat message
    this.appendAgentMessage("Welcome to LifeBridge AI. Select your current emergency scenario above or ask me any question. I'm here to locate shelters, verify road conditions, and provide offline first-aid directions.");
    
    // 5. Initialize Battery Monitor
    this.initBatteryMonitor();

    // 6. Generate Initial QR Code Check-In
    this.updateQRCode();

    // 7. Render dynamic dashboard data
    this.updateDashboard();
    this.updateChecklistPercentage();
  }

  registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
          .then((reg) => console.log("Service Worker registered successfully.", reg.scope))
          .catch((err) => console.error("Service Worker registration failed:", err));
      });
    }
  }

  getActiveScenarioData() {
    return MOCK_DATASETS[this.activeScenarioKey];
  }

  bindUIEvents() {
    // View Tab Switchers
    const tabMapBtn = document.getElementById("tab-map-btn");
    const tabDashBtn = document.getElementById("tab-dash-btn");
    const mapContainer = document.getElementById("map-container");
    const dashboardPanel = document.getElementById("dashboard-panel");

    tabMapBtn.addEventListener("click", () => {
      tabMapBtn.classList.add("active");
      tabMapBtn.style.background = "rgba(255,255,255,0.05)";
      tabMapBtn.style.color = "#fff";
      tabDashBtn.classList.remove("active");
      tabDashBtn.style.background = "none";
      tabDashBtn.style.color = "var(--text-secondary)";
      
      mapContainer.style.display = "flex";
      dashboardPanel.style.display = "none";
      
      // Invalidate Map size to redraw correctly
      if (this.mapManager && this.mapManager.map) {
        this.mapManager.map.invalidateSize();
      }
    });

    tabDashBtn.addEventListener("click", () => {
      tabDashBtn.classList.add("active");
      tabDashBtn.style.background = "rgba(255,255,255,0.05)";
      tabDashBtn.style.color = "#fff";
      tabMapBtn.classList.remove("active");
      tabMapBtn.style.background = "none";
      tabMapBtn.style.color = "var(--text-secondary)";
      
      mapContainer.style.display = "none";
      dashboardPanel.style.display = "flex";
      
      this.updateDashboard();
    });

    // Scenario Switcher
    const scenarioSelect = document.getElementById("scenario-select");
    scenarioSelect.addEventListener("change", (e) => {
      this.activeScenarioKey = e.target.value;
      const data = this.getActiveScenarioData();
      this.mapManager.loadScenario(data);
      this.appendAgentMessage(`Switched context to: <strong>${data.name}</strong>. The maps, shelters, and roads data have been loaded locally.`);
      this.updateQuickChips();
      this.userHazards = []; // Clear hazard inputs on scenario change
      this.updateQRCode();
      this.updateDashboard();
    });

    // Report Hazard Toggler Button
    const reportHazardBtn = document.getElementById("report-hazard-btn");
    reportHazardBtn.addEventListener("click", () => {
      this.hazardPlacementMode = !this.hazardPlacementMode;
      if (this.hazardPlacementMode) {
        reportHazardBtn.textContent = "Tap Map to Place";
        reportHazardBtn.style.borderColor = "#ff3b30";
        reportHazardBtn.style.color = "#ff3b30";
        this.appendAgentMessage("🗺️ <strong>Hazard Reporting:</strong> Click anywhere on the map to mark a block (e.g. deep water, blocked path). This will be synchronized with your QR status.");
        
        // Force switch to map tab so they can see map
        tabMapBtn.click();

        this.mapManager.enableHazardPlacementMode((lat, lng, desc) => {
          this.userHazards.push({ lat, lng, desc });
          this.updateQRCode();
          this.appendAgentMessage(`Added custom hazard report: <strong>${desc}</strong> at [${lat.toFixed(4)}, ${lng.toFixed(4)}]. Added to your P2P QR Check-in.`);
          
          this.hazardPlacementMode = false;
          reportHazardBtn.textContent = "Report Hazard";
          reportHazardBtn.style.borderColor = "";
          reportHazardBtn.style.color = "";
          this.mapManager.disableHazardPlacementMode();
          this.updateDashboard(); // Sync lists
        });
      } else {
        reportHazardBtn.textContent = "Report Hazard";
        reportHazardBtn.style.borderColor = "";
        reportHazardBtn.style.color = "";
        this.mapManager.disableHazardPlacementMode();
      }
    });

    // P2P QR Code Sync Paste
    const p2pSyncBtn = document.getElementById("p2p-sync-btn");
    p2pSyncBtn.addEventListener("click", () => {
      const syncInput = document.getElementById("p2p-sync-input");
      const val = syncInput.value.trim();
      if (val) {
        this.importP2PCode(val);
        syncInput.value = "";
      }
    });

    // START Triage trigger events
    const startTriageBtn = document.getElementById("start-triage-btn");
    const closeTriage = document.getElementById("close-triage");
    const triageYesBtn = document.getElementById("triage-yes-btn");
    const triageNoBtn = document.getElementById("triage-no-btn");
    const triageResetBtn = document.getElementById("triage-reset-btn");

    startTriageBtn.addEventListener("click", () => {
      document.getElementById("triage-overlay").style.display = "flex";
      this.resetTriageAssessment();
    });

    closeTriage.addEventListener("click", () => {
      document.getElementById("triage-overlay").style.display = "none";
    });

    triageYesBtn.addEventListener("click", () => this.runTriageStep("yes"));
    triageNoBtn.addEventListener("click", () => this.runTriageStep("no"));
    triageResetBtn.addEventListener("click", () => this.resetTriageAssessment());

    // Emergency Category Buttons
    const emergencyBtns = document.querySelectorAll(".emergency-btn");
    emergencyBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        emergencyBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const type = btn.getAttribute("data-type");
        const response = this.agent.respond(type);
        this.appendUserMessage(`Selected Emergency Category: ${type.toUpperCase()}`);
        this.handleAgentResponse(response);
      });
    });

    // Chat Submission
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;

      this.appendUserMessage(text);
      chatInput.value = "";

      const response = this.agent.respond(text);
      this.handleAgentResponse(response);
    });

    // Quick chips actions
    this.updateQuickChips();

    // Speech mic button
    const micBtn = document.getElementById("mic-btn");
    micBtn.addEventListener("click", () => {
      if (this.isListening) {
        this.agent.stopListening();
        micBtn.classList.remove("listening");
        this.isListening = false;
      } else {
        micBtn.classList.add("listening");
        this.isListening = true;
        this.agent.startListening(
          (result) => {
            chatInput.value = result;
            chatForm.dispatchEvent(new Event("submit"));
          },
          (error) => {
            this.appendAgentMessage(`Voice error: ${error}`);
            micBtn.classList.remove("listening");
            this.isListening = false;
          },
          () => {
            micBtn.classList.remove("listening");
            this.isListening = false;
          }
        );
      }
    });

    // Audio Speech Mute Button
    const muteBtn = document.getElementById("mute-btn");
    muteBtn.addEventListener("click", () => {
      this.isMuted = !this.isMuted;
      if (this.isMuted) {
        this.agent.stopSpeaking();
        muteBtn.textContent = "Unmute Voice";
        muteBtn.classList.add("muted");
      } else {
        muteBtn.textContent = "Mute Voice";
        muteBtn.classList.remove("muted");
      }
    });

    // SOS Buttons
    const sosBtn = document.getElementById("sos-btn");
    const cancelSos = document.getElementById("cancel-sos");
    sosBtn.addEventListener("click", () => this.startSOSBeacon());
    cancelSos.addEventListener("click", () => this.stopSOSBeacon());

    // Crisis Calmer Breathing
    const startBreathingBtn = document.getElementById("start-breathing-btn");
    const breathingCard = document.getElementById("breathing-card");
    startBreathingBtn.addEventListener("click", () => {
      this.toggleBreathingGuide(startBreathingBtn, breathingCard);
    });

    // Battery Saver Toggle
    const batteryToggle = document.getElementById("battery-saver-toggle");
    batteryToggle.addEventListener("change", (e) => {
      this.toggleBatterySaver(e.target.checked);
    });

    // QR Input changes
    const qrInputs = document.querySelectorAll("#qr-name, #qr-blood, #qr-status");
    qrInputs.forEach(input => {
      input.addEventListener("input", () => this.updateQRCode());
    });

    // Distress Sound Radar button
    const toggleRadarBtn = document.getElementById("toggle-radar-btn");
    toggleRadarBtn.addEventListener("click", () => {
      this.toggleSoundRadar(toggleRadarBtn);
    });

    // Preparedness checklist checkboxes
    const checklistCbs = document.querySelectorAll(".checklist-item-cb");
    checklistCbs.forEach(cb => {
      cb.addEventListener("change", () => this.updateChecklistPercentage());
    });

    // Map Action trigger exposed to window for Leaflet buttons
    window.triggerAgentRouting = (type, targetId) => {
      const response = this.agent.respond(`route to ${type} ${targetId}`);
      
      // Force switch to map tab to show route
      tabMapBtn.click();
      
      this.handleAgentResponse(response);
    };
  }

  // Handle Response Actions (Map calls & Speech)
  handleAgentResponse(response) {
    this.appendAgentMessage(response.text, response.guide);

    if (response.callback) {
      response.callback(this.mapManager);
    }

    if (!this.isMuted) {
      const speechText = response.guide
        ? `${response.text}. First aid steps are loaded on your screen.`
        : response.text;
      this.agent.speak(speechText);
    }
  }

  // Chat rendering
  appendUserMessage(text) {
    const chatHistory = document.getElementById("chat-history");
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble user";
    bubble.textContent = text;
    chatHistory.appendChild(bubble);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  appendAgentMessage(text, guideData = null) {
    const chatHistory = document.getElementById("chat-history");
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble agent";

    const textPara = document.createElement("p");
    textPara.innerHTML = text;
    bubble.appendChild(textPara);

    if (guideData) {
      const guideCard = document.createElement("div");
      guideCard.className = "guide-card";
      
      const title = document.createElement("strong");
      title.textContent = guideData.title;
      guideCard.appendChild(title);

      guideData.steps.forEach((step, idx) => {
        const stepDiv = document.createElement("div");
        stepDiv.className = "guide-step";
        stepDiv.innerHTML = `
          <span>${idx + 1}.</span>
          <span>${step.text}</span>
        `;
        guideCard.appendChild(stepDiv);
      });

      bubble.appendChild(guideCard);
    }

    chatHistory.appendChild(bubble);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  // P2P Data Import logic
  importP2PCode(codeString) {
    try {
      const parts = codeString.split("|");
      if (parts.length < 4 || !parts[0].startsWith("LB:")) {
        alert("Invalid mesh code format. Must start with 'LB:'");
        return;
      }

      const name = parts[0].substring(3);
      const blood = parts[1].split(":")[1];
      const status = parts[2].split(":")[1];
      const battery = parts[3].split(":")[1];
      
      const activeData = this.getActiveScenarioData();
      const peerLat = activeData.center[0] + (Math.random() - 0.5) * 0.01;
      const peerLng = activeData.center[1] + (Math.random() - 0.5) * 0.01;

      const peerIcon = L.divIcon({
        className: 'custom-map-marker peer-marker',
        html: `<div class="marker-circle" style="background:#ff9500; border: 2px solid #fff; box-shadow: 0 0 10px #ff9500;">
                 <svg viewBox="0 0 24 24" width="14" height="14" fill="#fff">
                   <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                 </svg>
               </div>`,
        iconSize: [28, 28]
      });

      const peerMarker = L.marker([peerLat, peerLng], { icon: peerIcon }).addTo(this.mapManager.markersGroup);
      peerMarker.bindPopup(`<strong>📍 Peer Sync: ${name}</strong><br>Status: ${status}<br>Blood Group: ${blood}<br>Battery: ${battery}`).openPopup();

      this.mapManager.map.panTo([peerLat, peerLng]);

      let importedHazardsCount = 0;
      if (parts.length >= 5 && parts[4].startsWith("H:")) {
        const hazStr = parts[4].substring(2);
        if (hazStr) {
          const hazItems = hazStr.split(";");
          hazItems.forEach(item => {
            const hParts = item.split(",");
            if (hParts.length === 3) {
              const hLat = parseFloat(hParts[0]);
              const hLng = parseFloat(hParts[1]);
              const hDesc = hParts[2];
              if (!isNaN(hLat) && !isNaN(hLng)) {
                this.mapManager.drawHazardMarker(hLat, hLng, hDesc, true, name);
                this.userHazards.push({ lat: hLat, lng: hLng, desc: hDesc }); // Append to local sync
                importedHazardsCount++;
              }
            }
          });
        }
      }

      this.appendAgentMessage(`📶 <strong>Mesh P2P Import Successful:</strong> Synced status from citizen <strong>${name}</strong> (${status}). Battery: ${battery}. Plotted user and ${importedHazardsCount} reported hazard markers onto your offline map.`);
      this.updateDashboard(); // Sync lists
    } catch (e) {
      console.error(e);
      alert("Error parsing P2P synchronization code.");
    }
  }

  // START Triage Diagnostic Engine Logic
  resetTriageAssessment() {
    this.currentTriageNode = "start";
    document.getElementById("triage-yes-btn").style.display = "inline-block";
    document.getElementById("triage-no-btn").style.display = "inline-block";
    document.getElementById("triage-reset-btn").style.display = "none";
    document.getElementById("triage-result-card").style.display = "none";
    this.renderTriageNode();
  }

  renderTriageNode() {
    const node = TRIAGE_TREE[this.currentTriageNode];
    document.getElementById("triage-question-text").textContent = node.text;
  }

  runTriageStep(choice) {
    const node = TRIAGE_TREE[this.currentTriageNode];
    const outcome = node[choice];

    if (TRIAGE_RESULTS[outcome]) {
      this.displayTriageResult(outcome);
    } else {
      this.currentTriageNode = outcome;
      this.renderTriageNode();
    }
  }

  displayTriageResult(resultKey) {
    const result = TRIAGE_RESULTS[resultKey];
    document.getElementById("triage-yes-btn").style.display = "none";
    document.getElementById("triage-no-btn").style.display = "none";
    
    const resultCard = document.getElementById("triage-result-card");
    resultCard.style.display = "block";
    resultCard.style.borderColor = result.color;
    
    const badge = document.getElementById("triage-priority-badge");
    badge.textContent = result.label;
    badge.style.color = result.color;
    
    document.getElementById("triage-instructions-text").textContent = result.action;
    document.getElementById("triage-reset-btn").style.display = "inline-block";

    this.appendAgentMessage(`🏥 <strong>START Triage Complete:</strong> Classified patient priority as <span style="color:${result.color}; font-weight:700;">${result.label}</span>. Instructions: ${result.action}`);
  }

  // Dashboard Renderer Functions
  updateDashboard() {
    const data = this.getActiveScenarioData();
    
    // 1. Weather and alerts overlays
    const hazardLevel = document.getElementById("overlay-hazard-level");
    const weatherDesc = document.getElementById("overlay-weather-desc");
    if (this.activeScenarioKey === "coastal_bay") {
      hazardLevel.textContent = "Severe Risk (Cyclone Area)";
      hazardLevel.style.color = "#ef4444";
      weatherDesc.textContent = "Heavy Rainfall (35mm/hr), Winds: 45kts";
      this.setReliefReserves(85, 60, 40);
    } else {
      hazardLevel.textContent = "Moderate Risk (Incident Site)";
      hazardLevel.style.color = "#f59e0b";
      weatherDesc.textContent = "Overcast, Temp: 28C, Wind: 10kts";
      this.setReliefReserves(95, 80, 75);
    }

    // 2. Shelters status lists
    const shelterList = document.getElementById("dash-shelters-list");
    shelterList.innerHTML = "";
    data.shelters.forEach(s => {
      const item = document.createElement("div");
      item.className = "dash-item";
      item.innerHTML = `
        <div style="flex:1;">
          <strong>${s.name}</strong><br>
          <span style="font-size:0.75rem; color:var(--text-secondary)">Food: ${s.resources.food} | Meds: ${s.resources.medical}</span>
        </div>
        <div class="dash-progress-container">
          <div class="dash-progress-track">
            <div class="dash-progress-bar" style="width:${s.occupancyRate}%; background:${s.occupancyRate > 90 ? 'var(--color-danger)' : 'var(--color-success)'}"></div>
          </div>
        </div>
        <span style="font-weight:600; width:50px; text-align:right;">${s.occupancyRate}%</span>
      `;
      shelterList.appendChild(item);
    });

    // 3. Hospitals list
    const hospList = document.getElementById("dash-hospitals-list");
    hospList.innerHTML = "";
    data.hospitals.forEach(h => {
      const item = document.createElement("div");
      item.className = "dash-item";
      item.innerHTML = `
        <div style="flex:1;">
          <strong>${h.name}</strong><br>
          <span style="font-size:0.75rem; color:var(--text-secondary)">Beds: ${h.bedsAvailable} available</span>
        </div>
        <div style="text-align:right;">
          <span style="color:var(--color-accent); font-weight:700;">${h.waitTime}</span><br>
          <span style="font-size:0.75rem; color:var(--text-dim)">Wait Time</span>
        </div>
      `;
      hospList.appendChild(item);
    });

    // 4. Incident queues
    this.renderIncidentQueue();
  }

  setReliefReserves(water, meds, food) {
    document.getElementById("supply-water-text").textContent = `${water}%`;
    document.getElementById("supply-water-bar").style.width = `${water}%`;
    document.getElementById("supply-meds-text").textContent = `${meds}%`;
    document.getElementById("supply-meds-bar").style.width = `${meds}%`;
    document.getElementById("supply-food-text").textContent = `${food}%`;
    document.getElementById("supply-food-bar").style.width = `${food}%`;
  }

  renderIncidentQueue() {
    const queue = document.getElementById("dash-incidents-queue");
    queue.innerHTML = "";

    const defaults = this.activeScenarioKey === "coastal_bay" 
      ? [
          { id: "inc_1", name: "Reported Flooding", location: "North Bay Highway", type: "flood" },
          { id: "inc_2", name: "Trapped Civilians", location: "Zone B Building C", type: "trapped" }
        ]
      : [
          { id: "inc_3", name: "Multi-vehicle Accident", location: "Grand Trunk Flyover", type: "accident" },
          { id: "inc_4", name: "Cardiac Emergency", location: "Civic Centre Hall", type: "medical" }
        ];

    const list = [...defaults];
    this.userHazards.forEach((h, idx) => {
      list.push({
        id: `user_inc_${idx}`,
        name: `Mesh Report: ${h.desc}`,
        location: `${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}`,
        type: "user"
      });
    });

    list.forEach(inc => {
      const card = document.createElement("div");
      card.className = "incident-card";
      card.id = `card-${inc.id}`;
      card.innerHTML = `
        <div>
          <strong>${inc.name}</strong><br>
          <span style="font-size:0.75rem; color:var(--text-secondary)">Location: ${inc.location}</span>
        </div>
        <button class="btn btn-sos" style="padding:4px 8px; font-size:0.75rem; border-radius:4px; font-weight:600; margin-left:10px;" id="dispatch-btn-${inc.id}">
          Dispatch Help
        </button>
      `;

      card.querySelector("button").addEventListener("click", () => {
        this.dispatchRescue(inc.id, inc.name, inc.location);
      });

      queue.appendChild(card);
    });
  }

  dispatchRescue(incId, name, location) {
    const card = document.getElementById(`card-${incId}`);
    const btn = document.getElementById(`dispatch-btn-${incId}`);
    if (card && btn) {
      btn.disabled = true;
      btn.textContent = "Dispatched";
      btn.style.background = "var(--color-success)";
      btn.style.borderColor = "var(--color-success)";
      card.classList.add("resolved");
      
      this.appendAgentMessage(`🚀 <strong>Dispatch Action:</strong> Emergency rescue team dispatched to <strong>${name}</strong> at <em>${location}</em>. Incident status resolved.`);
      
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      const t = this.audioContext.currentTime;
      this.playBeep(t, 0.1);
      setTimeout(() => this.playBeep(this.audioContext.currentTime, 0.15), 120);
    }
  }

  updateChecklistPercentage() {
    const items = document.querySelectorAll(".checklist-item-cb");
    const checked = document.querySelectorAll(".checklist-item-cb:checked");
    const pct = Math.round((checked.length / items.length) * 100);
    document.getElementById("checklist-pct").textContent = `${pct}% Ready`;
  }

  // SOS Strobe Beacons
  startSOSBeacon() {
    this.strobeActive = true;
    const strobeOverlay = document.getElementById("strobe-overlay");
    strobeOverlay.classList.add("active");

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    const dot = 0.2;
    const dash = 0.6;
    const elementSpace = 0.2;
    const letterSpace = 0.6;

    const sequence = [
      dot, elementSpace, dot, elementSpace, dot, // S
      letterSpace,
      dash, elementSpace, dash, elementSpace, dash, // O
      letterSpace,
      dot, elementSpace, dot, elementSpace, dot // S
    ];

    const playMorseCycle = () => {
      let timeOffset = this.audioContext.currentTime;
      let seqIdx = 0;
      let lightOn = true;

      const runTick = () => {
        if (!this.strobeActive) return;

        const duration = sequence[seqIdx];
        if (lightOn && duration !== letterSpace) {
          this.playBeep(timeOffset, duration);
          timeOffset += duration;
        } else {
          timeOffset += duration;
        }

        lightOn = !lightOn;
        seqIdx++;

        if (seqIdx < sequence.length) {
          setTimeout(runTick, duration * 1000);
        } else {
          this.strobeInterval = setTimeout(playMorseCycle, 1500);
        }
      };

      runTick();
    };

    playMorseCycle();
  }

  playBeep(startTime, duration) {
    if (!this.audioContext) return;
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(950, startTime);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.8, startTime + 0.05);
    gainNode.gain.setValueAtTime(0.8, startTime + duration - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  stopSOSBeacon() {
    this.strobeActive = false;
    clearTimeout(this.strobeInterval);
    const strobeOverlay = document.getElementById("strobe-overlay");
    strobeOverlay.classList.remove("active");
  }

  // Crisis Calmer Breathing
  toggleBreathingGuide(btn, card) {
    this.breathingActive = !this.breathingActive;

    if (this.breathingActive) {
      btn.textContent = "Stop Calming Guide";
      card.classList.add("active-breathing");
      
      const subtext = document.getElementById("breathing-subtext");
      const steps = ["Inhale deeply...", "Hold...", "Exhale slowly...", "Hold..."];
      let stepIdx = 0;
      subtext.textContent = steps[stepIdx];
      
      this.breathingTimer = setInterval(() => {
        stepIdx = (stepIdx + 1) % 4;
        subtext.textContent = steps[stepIdx];
      }, 4000);
    } else {
      btn.textContent = "Calm Breath";
      card.classList.remove("active-breathing");
      clearInterval(this.breathingTimer);
      document.getElementById("breathing-subtext").textContent = "Ready";
    }
  }

  // Distress Acoustic Sound Radar Logic
  toggleSoundRadar(btn) {
    this.radarActive = !this.radarActive;

    if (this.radarActive) {
      btn.textContent = "Stop Sound Radar";
      btn.style.background = "var(--color-danger)";
      btn.style.color = "#fff";
      document.getElementById("radar-status-label").textContent = "Accessing mic...";
      document.getElementById("radar-status-label").style.color = "#ff9500";
      
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {
          this.audioStream = stream;
          if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          }
          const source = this.audioContext.createMediaStreamSource(stream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 256;
          source.connect(this.analyser);
          
          document.getElementById("radar-status-label").textContent = "MONITORING ROOM SOUND";
          document.getElementById("radar-status-label").style.color = "var(--color-success)";
          
          this.runRadarVisualization();
        })
        .catch((err) => {
          console.error("Mic access denied", err);
          alert("Distress Sound Radar requires microphone access to check ambient sounds.");
          this.radarActive = false;
          btn.textContent = "Activate Sound Radar";
          btn.style.background = "";
          btn.style.color = "";
          document.getElementById("radar-status-label").textContent = "Radar Off";
          document.getElementById("radar-status-label").style.color = "";
        });
    } else {
      this.stopSoundRadar(btn);
    }
  }

  stopSoundRadar(btn = null) {
    this.radarActive = false;
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(t => t.stop());
    }
    cancelAnimationFrame(this.radarAnimationId);
    
    const label = document.getElementById("radar-status-label");
    label.textContent = "Radar Off";
    label.style.color = "";
    
    if (btn) {
      btn.textContent = "Activate Sound Radar";
      btn.style.background = "";
      btn.style.color = "";
    }
    
    const canvas = document.getElementById("radar-canvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  runRadarVisualization() {
    const canvas = document.getElementById("radar-canvas");
    const ctx = canvas.getContext("2d");
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resizeCanvas();

    const draw = () => {
      if (!this.radarActive) return;
      this.radarAnimationId = requestAnimationFrame(draw);
      
      this.analyser.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = "rgba(5, 6, 11, 0.2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      let totalVolume = 0;
      for (let i = 0; i < bufferLength; i++) {
        totalVolume += dataArray[i];
      }
      const averageVolume = totalVolume / bufferLength;

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        const y = canvas.height / 2 + (i % 2 === 0 ? barHeight : -barHeight) * 0.4;
        
        ctx.lineTo(x, y);
        x += barWidth;
      }
      ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (averageVolume > this.peakThreshold) {
        const now = Date.now();
        if (now - this.lastPeakTime > 300) { 
          this.lastPeakTime = now;
          this.tapHistory.push(now);
          
          ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          if (this.tapHistory.length > 4) {
            this.tapHistory.shift();
          }

          if (this.tapHistory.length >= 3) {
            const diff1 = this.tapHistory[1] - this.tapHistory[0];
            const diff2 = this.tapHistory[2] - this.tapHistory[1];
            
            const ratio = diff1 / diff2;
            if (ratio > 0.75 && ratio < 1.25 && diff1 > 350 && diff1 < 1600) {
              const label = document.getElementById("radar-status-label");
              label.textContent = "🔊 RESCUE SIGNAL DETECTED";
              label.style.color = "var(--color-danger)";
              
              this.appendAgentMessage("📢 <strong>Distress Radar Alert:</strong> Detected a highly rhythmic acoustic vibration pattern (possible rescue tapping or whistle signals). Please check your surroundings.");
              
              this.tapHistory = [];
            }
          }
        }
      }
    };
    
    draw();
  }

  // Battery monitoring
  initBatteryMonitor() {
    const batteryLevel = document.getElementById("battery-level");
    const batterySaverToggle = document.getElementById("battery-saver-toggle");

    if ("getBattery" in navigator) {
      navigator.getBattery().then((battery) => {
        const updateBatteryInfo = () => {
          const percentage = Math.round(battery.level * 100);
          batteryLevel.textContent = `${percentage}%`;

          if (percentage <= 20 && !battery.charging) {
            batterySaverToggle.checked = true;
            this.toggleBatterySaver(true);
            this.appendAgentMessage("⚠️ <strong>Low Battery detected!</strong> Automatically switched to Extreme Battery Saver mode to preserve communication power.");
          }
        };

        updateBatteryInfo();
        battery.addEventListener("levelchange", updateBatteryInfo);
        battery.addEventListener("chargingchange", updateBatteryInfo);
      });
    } else {
      batteryLevel.textContent = "78% (Simulated)";
    }
  }

  toggleBatterySaver(isActive) {
    if (isActive) {
      document.body.classList.add("battery-saver");
      this.appendAgentMessage("⚡ <strong>Extreme Battery Saver Active:</strong> Maps disabled. Visual animations paused. Color rendering reduced to monochrome. Communication channels prioritized.");
      this.stopSoundRadar();
    } else {
      document.body.classList.remove("battery-saver");
      this.appendAgentMessage("Battery saver disabled. Standard UI rendering restored.");
    }
  }

  // Generate QR Check-In string containing location and optional custom hazard report coordinates
  updateQRCode() {
    const name = document.getElementById("qr-name").value || "Anon";
    const blood = document.getElementById("qr-blood").value || "Unknown";
    const status = document.getElementById("qr-status").value || "OK";
    
    let payload = `LB:${name.substring(0,10)}|B:${blood}|S:${status}|Bat:${document.getElementById("battery-level").textContent}`;
    
    if (this.userHazards.length > 0) {
      const hazPayload = this.userHazards.map(h => `${h.lat.toFixed(4)},${h.lng.toFixed(4)},${h.desc.substring(0,8)}`).join(";");
      payload += `|H:${hazPayload}`;
    }

    const qrCanvas = document.getElementById("qr-canvas");
    if (typeof QRious !== "undefined") {
      new QRious({
        element: qrCanvas,
        value: payload,
        size: 90,
        background: '#ffffff',
        foreground: '#000000',
        level: 'L'
      });
    }
  }

  updateQuickChips() {
    const container = document.getElementById("quick-chips-container");
    if (!container) return;
    container.innerHTML = "";

    const chips = this.activeScenarioKey === "coastal_bay" 
      ? ["Where is nearest shelter?", "Is Beach Highway safe?", "Flood safety guide"] 
      : ["Find hospital with shortest wait", "Grand Trunk Flyover status", "First aid for bleeding"];

    chips.forEach(text => {
      const chip = document.createElement("div");
      chip.className = "chat-chip";
      chip.textContent = text;
      chip.addEventListener("click", () => {
        const chatInput = document.getElementById("chat-input");
        chatInput.value = text;
        document.getElementById("chat-form").dispatchEvent(new Event("submit"));
      });
      container.appendChild(chip);
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const app = new LifeBridgeApp();
  app.init();
  window.appInstance = app;
});
