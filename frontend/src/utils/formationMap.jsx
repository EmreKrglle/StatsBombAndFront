// Optimize edilmiş formationMap.js
// Her takım kendi yarısında (0-60), mantıklı katmanlar halinde

const ABSTRACT_WIDTH = 120;
const HALF_WIDTH = 60;

// Pozisyon katmanları (x ekseni - derinlik)
const LAYERS = {
  GK: 5,        // Kaleci
  DEF: 15,      // Defans hattı
  DEF_MID: 15,  // Defans ortası (stoper)
  DM: 28,       // Defansif orta saha
  MID: 35,      // Orta saha
  AM_LOW: 40,   // Alt hücum ortası
  AM_HIGH: 48,  // Üst hücum ortası
  FW_LOW: 52,   // Alt forvet
  FW_HIGH: 54,  // Üst forvet
  CF: 56        // Santrfor
};

// Y ekseni pozisyonları (genişlik)
const WIDTHS = {
  CENTER: 40,
  INNER_LEFT: 25,
  INNER_RIGHT: 55,
  MID_LEFT: 15,
  MID_RIGHT: 65,
  OUTER_LEFT: 5,
  OUTER_RIGHT: 75,
  WIDE_LEFT: 10,
  WIDE_RIGHT: 70,
  HALF_LEFT: 30,
  HALF_RIGHT: 50,
  QUARTER_LEFT: 20,
  QUARTER_RIGHT: 60,
  NARROW_LEFT: 35,
  NARROW_RIGHT: 45
};

// Temel pozisyonlar - Tüm formasyonlarda kullanılabilir
const BASE_POSITIONS = {
  "Goalkeeper": { x: LAYERS.GK, y: WIDTHS.CENTER },
  
  // Defans pozisyonları
  "Right Back": { x: LAYERS.DEF, y: WIDTHS.WIDE_RIGHT },
  "Left Back": { x: LAYERS.DEF, y: WIDTHS.WIDE_LEFT },
  "Right Center Back": { x: LAYERS.DEF_MID, y: WIDTHS.INNER_RIGHT },
  "Left Center Back": { x: LAYERS.DEF_MID, y: WIDTHS.INNER_LEFT },
  "Center Back": { x: LAYERS.DEF_MID, y: WIDTHS.CENTER },
  
  // Wing back pozisyonları
  "Right Wing Back": { x: LAYERS.DEF, y: WIDTHS.OUTER_RIGHT },
  "Left Wing Back": { x: LAYERS.DEF, y: WIDTHS.OUTER_LEFT },
  
  // Defansif orta saha
  "Center Defensive Midfield": { x: LAYERS.DM, y: WIDTHS.CENTER },
  "Right Defensive Midfield": { x: LAYERS.DM, y: WIDTHS.HALF_RIGHT },
  "Left Defensive Midfield": { x: LAYERS.DM, y: WIDTHS.HALF_LEFT },
  
  // Orta saha pozisyonları
  "Center Midfield": { x: LAYERS.MID, y: WIDTHS.CENTER },
  "Right Center Midfield": { x: LAYERS.MID, y: WIDTHS.HALF_RIGHT },
  "Left Center Midfield": { x: LAYERS.MID, y: WIDTHS.HALF_LEFT },
  "Right Midfield": { x: LAYERS.MID, y: WIDTHS.WIDE_RIGHT },
  "Left Midfield": { x: LAYERS.MID, y: WIDTHS.WIDE_LEFT },
  
  // Hücum ortası
  "Center Attacking Midfield": { x: LAYERS.AM_HIGH, y: WIDTHS.CENTER },
  "Right Attacking Midfield": { x: LAYERS.AM_HIGH, y: WIDTHS.QUARTER_RIGHT },
  "Left Attacking Midfield": { x: LAYERS.AM_HIGH, y: WIDTHS.QUARTER_LEFT },
  
  // Kanat pozisyonları
  "Right Wing": { x: LAYERS.FW_LOW, y: WIDTHS.MID_RIGHT },
  "Left Wing": { x: LAYERS.FW_LOW, y: WIDTHS.MID_LEFT },
  
  // Forvet pozisyonları
  "Center Forward": { x: LAYERS.CF, y: WIDTHS.CENTER },
  "Right Center Forward": { x: LAYERS.FW_HIGH, y: WIDTHS.NARROW_RIGHT },
  "Left Center Forward": { x: LAYERS.FW_HIGH, y: WIDTHS.NARROW_LEFT },
  "Secondary Striker": { x: LAYERS.FW_HIGH, y: WIDTHS.CENTER }
};

// Formasyonlara özel ayarlamalar (sadece farklı olanlar)
const FORMATION_OVERRIDES = {
  "442": {
    "Right Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.WIDE_RIGHT },
    "Left Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.WIDE_LEFT },
    "Right Center Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.HALF_RIGHT },
    "Left Center Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.HALF_LEFT }
  },
  
  "433": {
    "Right Center Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.INNER_RIGHT },
    "Left Center Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.INNER_LEFT }
  },
  
  "4231": {
    "Right Wing": { x: LAYERS.FW_LOW, y: WIDTHS.MID_RIGHT },
    "Left Wing": { x: LAYERS.FW_LOW, y: WIDTHS.MID_LEFT },
    "Right Attacking Midfield": { x: LAYERS.AM_HIGH, y: WIDTHS.QUARTER_RIGHT },
    "Left Attacking Midfield": { x: LAYERS.AM_HIGH, y: WIDTHS.QUARTER_LEFT }
  },
  
  "352": {
    "Right Wing Back": { x: LAYERS.DM, y: WIDTHS.OUTER_RIGHT },
    "Left Wing Back": { x: LAYERS.DM, y: WIDTHS.OUTER_LEFT },
    "Right Center Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.INNER_RIGHT },
    "Left Center Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.INNER_LEFT }
  },
  
  "343": {
    "Right Midfield": { x: LAYERS.DM, y: WIDTHS.WIDE_RIGHT },
    "Left Midfield": { x: LAYERS.DM, y: WIDTHS.WIDE_LEFT },
    "Right Center Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.HALF_RIGHT },
    "Left Center Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.HALF_LEFT }
  },
  
  "4141": {
    "Right Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.WIDE_RIGHT },
    "Left Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.WIDE_LEFT },
    "Right Center Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.HALF_RIGHT },
    "Left Center Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.HALF_LEFT }
  },
  
  "41212": {
    "Right Center Midfield": { x: LAYERS.MID, y: WIDTHS.HALF_RIGHT },
    "Left Center Midfield": { x: LAYERS.MID, y: WIDTHS.HALF_LEFT }
  },
  
  "532": {
    "Right Wing Back": { x: LAYERS.DEF, y: WIDTHS.OUTER_RIGHT },
    "Left Wing Back": { x: LAYERS.DEF, y: WIDTHS.OUTER_LEFT }
  },
  
  "541": {
    "Right Wing Back": { x: LAYERS.DEF, y: WIDTHS.OUTER_RIGHT },
    "Left Wing Back": { x: LAYERS.DEF, y: WIDTHS.OUTER_LEFT },
    "Right Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.WIDE_RIGHT },
    "Left Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.WIDE_LEFT }
  },
  
  "451": {
    "Right Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.OUTER_RIGHT },
    "Left Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.OUTER_LEFT },
    "Right Center Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.INNER_RIGHT },
    "Left Center Midfield": { x: LAYERS.AM_LOW, y: WIDTHS.INNER_LEFT },
    "Right Wing Back": { x: LAYERS.MID, y: WIDTHS.OUTER_RIGHT },
    "Left Wing Back": { x: LAYERS.MID, y: WIDTHS.OUTER_LEFT }
  },
  
  "3412": {
    "Right Wing Back": { x: LAYERS.DEF_MID, y: WIDTHS.OUTER_RIGHT },
    "Left Wing Back": { x: LAYERS.DEF_MID, y: WIDTHS.OUTER_LEFT },
    "Right Midfield": { x: LAYERS.MID, y: WIDTHS.WIDE_RIGHT },
    "Left Midfield": { x: LAYERS.MID, y: WIDTHS.WIDE_LEFT }
  }
};

// Formasyon haritası oluşturma fonksiyonu
const buildFormationMap = (formationKey) => {
  const overrides = FORMATION_OVERRIDES[formationKey] || {};
  return { ...BASE_POSITIONS, ...overrides };
};

// Tüm formasyon haritaları
const formationMaps = {
  "442": buildFormationMap("442"),
  "433": buildFormationMap("433"),
  "4231": buildFormationMap("4231"),
  "352": buildFormationMap("352"),
  "343": buildFormationMap("343"),
  "4141": buildFormationMap("4141"),
  "41212": buildFormationMap("41212"),
  "532": buildFormationMap("532"),
  "541": buildFormationMap("541"),
  "451": buildFormationMap("451"),
  "3412": buildFormationMap("3412")
};

// Varsayılan değerler
export const defaultMap = formationMaps["442"];
export const defaultPosition = { x: LAYERS.MID, y: WIDTHS.CENTER };

// Ana fonksiyon
export const getPositionCoordinates = (formationName, positionName) => {
  const map = formationMaps[formationName] || defaultMap;
  const position = map[positionName];
  
  if (!position) {
    console.warn(`Position "${positionName}" not found in formation "${formationName}". Using default.`);
    return defaultPosition;
  }
  
  return position;
};

// Debug için - tüm formasyonları listele
export const getAllFormations = () => Object.keys(formationMaps);

// Belirli bir formasyonun tüm pozisyonlarını al
export const getFormationPositions = (formationName) => {
  return formationMaps[formationName] || defaultMap;
};