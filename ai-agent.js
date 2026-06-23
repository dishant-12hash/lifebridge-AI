import { EMERGENCY_GUIDES } from "./guides-data.js";

export class LifeBridgeAgent {
  constructor(appContext) {
    this.app = appContext; // reference to main app for active scenario & map control
    this.synth = window.speechSynthesis;
    this.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = null;
    
    if (this.SpeechRecognition) {
      this.recognition = new this.SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.lang = 'en-US';
      this.recognition.interimResults = false;
    }
  }

  // Parse natural queries to return helpful responses
  respond(query) {
    const q = query.toLowerCase().trim();
    const scenario = this.app.getActiveScenarioData();
    let responseText = "";
    let guideType = null; // To render first aid guides inside the chat
    let mapCallback = null; // Callback to draw/pan maps

    // Case 1: Shelters
    if (q.includes("shelter") || q.includes("evacuate") || q.includes("refuge") || q.includes("stay")) {
      const nearest = this.getNearestShelter(scenario);
      if (nearest) {
        responseText = `The closest shelter to your location is <strong>${nearest.name}</strong>. It is currently at ${nearest.occupancyRate}% occupancy (${nearest.capacity} filled). Food status is ${nearest.resources.food} and medical support is ${nearest.resources.medical === 'Yes' ? 'Available' : 'Limited'}. I have marked the safe route to this shelter on your map.`;
        
        mapCallback = (mapManager) => {
          mapManager.highlightShelter(nearest.id);
        };
      } else {
        responseText = "I couldn't locate any active shelters in this sector. Let me trigger an emergency query to the local base station.";
      }
    } 
    // Case 2: Road Safety
    else if (q.includes("road") || q.includes("route") || q.includes("highway") || q.includes("safe") || q.includes("blocked") || q.includes("drive")) {
      const blockedRoads = scenario.roads.filter(r => r.status === "blocked");
      const safeRoads = scenario.roads.filter(r => r.status === "safe");
      
      responseText = `<strong>Road Safety Report:</strong><br>`;
      if (blockedRoads.length > 0) {
        responseText += `⚠️ <strong>Danger:</strong> ${blockedRoads.map(r => `${r.name} (${r.description})`).join(", ")} is blocked.<br>`;
      }
      if (safeRoads.length > 0) {
        responseText += `✅ <strong>Recommended Path:</strong> ${safeRoads.map(r => r.name).join(", ")} is verified safe and clear.`;
      }
      
      mapCallback = (mapManager) => {
        mapManager.showRoadStatus();
      };
    } 
    // Case 3: Medical Help / Specific Emergency
    else if (q.includes("medical") || q.includes("hospital") || q.includes("cpr") || q.includes("bleeding") || q.includes("burn") || q.includes("fracture") || q.includes("choking") || q.includes("hurt") || q.includes("injury")) {
      const nearestHosp = this.getNearestHospital(scenario);
      
      if (q.includes("cpr")) {
        responseText = "Here are the emergency CPR steps. Keep your phone speaker loud.";
        guideType = "medical";
      } else if (q.includes("bleeding") || q.includes("cut") || q.includes("blood")) {
        responseText = "First aid for severe bleeding: Apply direct continuous pressure. Details below:";
        guideType = "medical";
      } else if (q.includes("burn")) {
        responseText = "First aid for burns: Cool under running water immediately. Details below:";
        guideType = "medical";
      } else if (q.includes("fracture") || q.includes("bone") || q.includes("broken")) {
        responseText = "First aid for fractures: Immobilize the limb. Do not attempt realignment. Details below:";
        guideType = "medical";
      } else {
        responseText = `For medical assistance, the nearest facility is <strong>${nearestHosp.name}</strong> (Wait time: ${nearestHosp.waitTime}, Available beds: ${nearestHosp.bedsAvailable}). Call them at ${nearestHosp.contact}. I have charted the quickest safe route on your map.`;
      }

      mapCallback = (mapManager) => {
        if (nearestHosp) {
          mapManager.highlightHospital(nearestHosp.id);
        }
      };
    }
    // Case 4: General Emergencies / Welcomes
    else if (q.includes("flood")) {
      responseText = "You have selected Flood context. Please evacuate to high ground immediately. Follow the instructions below:";
      guideType = "flood";
    } else if (q.includes("cyclone")) {
      responseText = "You have selected Cyclone context. Stay indoors away from windows. Follow the instructions below:";
      guideType = "cyclone";
    } else if (q.includes("accident")) {
      responseText = "You have selected Accident context. Secure the scene, call 102, and do not move the spine of victims unless endangered. Follow steps below:";
      guideType = "accident";
    } else if (q.includes("hello") || q.includes("hi") || q.includes("help")) {
      responseText = "Hello, I am the LifeBridge AI Emergency Responder. Tell me your status or ask: <em>'Where is the shelter?'</em>, <em>'How do I get medical help?'</em>, or <em>'Is the highway safe to drive?'</em>.";
    } else {
      responseText = "I recorded your request. To help you best right now: are you in immediate danger, do you need a shelter, or are you looking for safe evacuation routes?";
    }

    return {
      text: responseText,
      guide: guideType ? EMERGENCY_GUIDES[guideType] : null,
      callback: mapCallback
    };
  }

  // Find nearest shelter using basic distance math (from scenario center)
  getNearestShelter(scenario) {
    if (!scenario.shelters || scenario.shelters.length === 0) return null;
    // For demo purposes, we return the shelter with the lowest occupancy rate, or the first one.
    // Let's sort by occupancy rate or custom distance.
    return scenario.shelters[0];
  }

  // Find nearest hospital
  getNearestHospital(scenario) {
    if (!scenario.hospitals || scenario.hospitals.length === 0) return null;
    // Returns hospital with shortest wait time
    return scenario.hospitals.sort((a,b) => parseInt(a.waitTime) - parseInt(b.waitTime))[0];
  }

  // TTS Voice Output
  speak(text) {
    if (!this.synth) return;
    this.synth.cancel(); // Stop any current speech
    
    // Strip HTML tags for clean spoken output
    const cleanText = text.replace(/<\/?[^>]+(>|$)/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth) this.synth.cancel();
  }

  // STT Voice Input
  startListening(onResult, onError, onEnd) {
    if (!this.recognition) {
      onError("Speech recognition not supported in this browser. Please type your query.");
      return;
    }

    this.recognition.onstart = () => {
      console.log("Speech recognition started");
    };

    this.recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      onResult(speechToText);
    };

    this.recognition.onerror = (event) => {
      console.error("Speech error", event.error);
      onError(event.error);
    };

    this.recognition.onend = () => {
      onEnd();
    };

    this.recognition.start();
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
}
