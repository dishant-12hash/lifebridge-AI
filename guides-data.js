export const EMERGENCY_GUIDES = {
  flood: {
    title: "Flood Evacuation & Survival",
    steps: [
      { text: "Move immediately to higher ground. Do not wait for instructions.", icon: "arrow-up" },
      { text: "Avoid walking or driving through flood waters. Just 6 inches of moving water can knock you down, and 12 inches can sweep away a car.", icon: "water-slash" },
      { text: "If trapped in a building, go to the highest level. Do not climb into a closed attic; you may become trapped by rising water.", icon: "home" },
      { text: "Turn off utilities (electricity and gas) at the main switch if safe to do so.", icon: "power-off" },
      { text: "Drink only clean water. Do not drink floodwater or use it to wash dishes or brush teeth.", icon: "tint-slash" }
    ],
    contacts: ["Emergency Broadcast: Channel 16", "Disaster Rescue Team: 108", "Flood Control: 1800-XXX-XXXX"]
  },
  cyclone: {
    title: "Cyclone Shelter & Preparation",
    steps: [
      { text: "Seek immediate shelter in a designated cyclone-resistant structure or strong interior room.", icon: "shield-alt" },
      { text: "Stay away from windows, glass doors, and external walls. Cover yourself with mattresses or blankets.", icon: "window-close" },
      { text: "Keep your mobile device fully charged, and switch on Battery Saver Mode.", icon: "battery-quarter" },
      { text: "Do not venture outside during the 'eye' of the storm. The wind will return from the opposite direction with high speed suddenly.", icon: "eye" },
      { text: "Unplug electrical appliances to prevent damage from power surges.", icon: "plug" }
    ],
    contacts: ["National Emergency Response: 112", "Storm Helpline: 1070", "Weather Information: 1800-YYY-YYYY"]
  },
  accident: {
    title: "Road Accident Response",
    steps: [
      { text: "Ensure your own safety first. Park away from the accident scene and turn on hazard lights.", icon: "exclamation-triangle" },
      { text: "Do not move an injured person unless there is an immediate danger of fire or explosion. Moving them can cause spinal damage.", icon: "user-slash" },
      { text: "Check for breathing and consciousness. If not breathing, begin CPR if trained.", icon: "heartbeat" },
      { text: "Apply direct pressure with a clean cloth to any wounds that are actively bleeding.", icon: "band-aid" },
      { text: "Clear a path for incoming emergency vehicles and guide them to the scene.", icon: "ambulance" }
    ],
    contacts: ["Ambulance: 102", "Police Command: 100", "Highway Patrol: 1033"]
  },
  medical: {
    title: "Critical First Aid Guidelines",
    steps: [
      { text: "CPR (Cardiopulmonary Resuscitation): Push hard and fast in the center of the chest (100-120 compressions per minute).", icon: "heart" },
      { text: "Choking (Heimlich Maneuver): Give quick, upward abdominal thrusts just above the navel.", icon: "user-shield" },
      { text: "Severe Bleeding: Place clean cloth over the wound, apply firm, continuous pressure, and elevate if possible.", icon: "tint" },
      { text: "Burns: Run cool (not freezing) water over the burn for 10-20 minutes. Do not apply ice, butter, or ointments.", icon: "fire-extinguisher" },
      { text: "Fractures: Immobilize the injured area. Do not try to realign or push a bone back in place.", icon: "bone" }
    ],
    contacts: ["Emergency Response: 112", "Ambulance Hotline: 102", "Poison Control: 1800-ZZZ-ZZZZ"]
  }
};

export const MOCK_DATASETS = {
  coastal_bay: {
    name: "Coastal Bay Zone (Flood & Cyclone Context)",
    center: [13.0827, 80.2707], // Coastal area (Chennai-like coordinates)
    shelters: [
      {
        id: "shelter_1",
        name: "North Bay Community Shelter",
        lat: 13.095,
        lng: 80.282,
        capacity: "350 / 500",
        occupancyRate: 70,
        resources: { food: "High", water: "Medium", medical: "Yes" },
        contact: "+91 98765 43210"
      },
      {
        id: "shelter_2",
        name: "St. Jude Cyclone Haven",
        lat: 13.072,
        lng: 80.262,
        capacity: "120 / 400",
        occupancyRate: 30,
        resources: { food: "High", water: "High", medical: "Yes" },
        contact: "+91 98765 43211"
      },
      {
        id: "shelter_3",
        name: "South Coast Relief Camp",
        lat: 13.055,
        lng: 80.250,
        capacity: "295 / 300",
        occupancyRate: 98,
        resources: { food: "Low", water: "Low", medical: "Limited" },
        contact: "+91 98765 43212"
      }
    ],
    hospitals: [
      {
        id: "hospital_1",
        name: "Coastal General Hospital",
        lat: 13.085,
        lng: 80.275,
        waitTime: "15 mins",
        bedsAvailable: 42,
        specialists: ["Emergency Surgery", "Trauma Care", "Pediatrics"],
        contact: "044-2345-6789"
      },
      {
        id: "hospital_2",
        name: "Port Trust Medical Centre",
        lat: 13.102,
        lng: 80.292,
        waitTime: "45 mins",
        bedsAvailable: 12,
        specialists: ["General Medicine", "First Aid", "Decontamination"],
        contact: "044-2345-6790"
      }
    ],
    roads: [
      {
        id: "road_1",
        name: "Beach Highway (North Route)",
        status: "blocked",
        description: "Severely flooded. Water level 2.5 ft. Impassable for all vehicles.",
        path: [
          [13.0827, 80.2707],
          [13.090, 80.278],
          [13.095, 80.282],
          [13.102, 80.292]
        ]
      },
      {
        id: "road_2",
        name: "Central Ring Road",
        status: "caution",
        description: "Water logging at underpasses. Heavy traffic. Slow moving but passable for heavy vehicles.",
        path: [
          [13.0827, 80.2707],
          [13.078, 80.265],
          [13.072, 80.262]
        ]
      },
      {
        id: "road_3",
        name: "West Bypass (Safe Path)",
        status: "safe",
        description: "Clear and fully dry. Traffic flowing normally. Designated evacuation corridor.",
        path: [
          [13.0827, 80.2707],
          [13.065, 80.258],
          [13.055, 80.250]
        ]
      }
    ],
    hazards: [
      {
        id: "hazard_1",
        name: "Coastal Inundation Zone",
        type: "flood",
        polygon: [
          [13.090, 80.275],
          [13.110, 80.285],
          [13.105, 80.305],
          [13.080, 80.290]
        ]
      }
    ]
  },
  metropolis: {
    name: "Metropolis Core (Accident & Medical Context)",
    center: [12.9716, 77.5946], // Urban area (Bangalore-like coordinates)
    shelters: [
      {
        id: "shelter_4",
        name: "Metro Indoor Stadium Shelter",
        lat: 12.985,
        lng: 77.605,
        capacity: "80 / 800",
        occupancyRate: 10,
        resources: { food: "High", water: "High", medical: "Yes" },
        contact: "+91 80123 45678"
      },
      {
        id: "shelter_5",
        name: "Civic Centre Hall",
        lat: 12.955,
        lng: 77.585,
        capacity: "180 / 200",
        occupancyRate: 90,
        resources: { food: "Medium", water: "Medium", medical: "Yes" },
        contact: "+91 80123 45679"
      }
    ],
    hospitals: [
      {
        id: "hospital_3",
        name: "City Trauma & Super Speciality",
        lat: 12.978,
        lng: 77.598,
        waitTime: "5 mins",
        bedsAvailable: 85,
        specialists: ["Neurosurgery", "Cardiac Trauma", "Burns Unit"],
        contact: "080-2222-3333"
      },
      {
        id: "hospital_4",
        name: "Apex Mercy Care Hospital",
        lat: 12.962,
        lng: 77.589,
        waitTime: "30 mins",
        bedsAvailable: 19,
        specialists: ["General Emergency", "Orthopedics"],
        contact: "080-2222-4444"
      },
      {
        id: "hospital_5",
        name: "Trinity Red Cross Center",
        lat: 12.965,
        lng: 77.610,
        waitTime: "10 mins",
        bedsAvailable: 34,
        specialists: ["Emergency Medicine", "Pediatrics"],
        contact: "080-2222-5555"
      }
    ],
    roads: [
      {
        id: "road_4",
        name: "Grand Trunk Flyover",
        status: "blocked",
        description: "Multi-vehicle pileup. Police cordoning active. Blocked for investigations.",
        path: [
          [12.9716, 77.5946],
          [12.975, 77.596],
          [12.978, 77.598]
        ]
      },
      {
        id: "road_5",
        name: "Richmond Arterial Road",
        status: "caution",
        description: "Heavy congestion due to accident rubbernecking. Moving speed 10 km/h.",
        path: [
          [12.9716, 77.5946],
          [12.965, 77.592],
          [12.962, 77.589]
        ]
      },
      {
        id: "road_6",
        name: "Outer Corridor (Safe Route)",
        status: "safe",
        description: "Clear route with signal priority. Recommended path to Trinity Hospital.",
        path: [
          [12.9716, 77.5946],
          [12.968, 77.602],
          [12.965, 77.610]
        ]
      }
    ],
    hazards: [
      {
        id: "hazard_2",
        name: "Structural Collapse Grid",
        type: "accident",
        polygon: [
          [12.973, 77.596],
          [12.980, 77.596],
          [12.980, 77.602],
          [12.973, 77.602]
        ]
      }
    ]
  }
};

export const TRIAGE_TREE = {
  start: {
    text: "Can the patient walk?",
    yes: "minor",
    no: "breathing"
  },
  breathing: {
    text: "Is the patient breathing?",
    yes: "resp_rate",
    no: "position_airway"
  },
  position_airway: {
    text: "Reposition airway. Is the patient breathing now?",
    yes: "immediate",
    no: "deceased"
  },
  resp_rate: {
    text: "Is the respiration rate above 30 breaths per minute?",
    yes: "immediate",
    no: "perfusion"
  },
  perfusion: {
    text: "Is the radial pulse absent OR capillary refill time longer than 2 seconds?",
    yes: "immediate",
    no: "mental_status"
  },
  mental_status: {
    text: "Can the patient follow simple commands (e.g. 'squeeze my hand')?",
    yes: "delayed",
    no: "immediate"
  }
};

export const TRIAGE_RESULTS = {
  minor: {
    label: "MINOR (Green Priority)",
    color: "#10b981",
    action: "Direct patient to the nearest shelter or triage area. Keep monitoring for changes in condition."
  },
  delayed: {
    label: "DELAYED (Yellow Priority)",
    color: "#f59e0b",
    action: "Patient requires professional medical care but can wait temporarily. Monitor vital signs periodically."
  },
  immediate: {
    label: "IMMEDIATE (Red Priority)",
    color: "#ef4444",
    action: "⚠️ Life-threatening condition! Request immediate paramedic dispatch. Apply bleeding control or keep airway open."
  },
  deceased: {
    label: "DECEASED (Black Priority)",
    color: "#475569",
    action: "No breathing detected after airway alignment. Focus rescue efforts on surviving patients."
  }
};

