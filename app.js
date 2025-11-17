import { dataset } from "./data.js";

const VERSION = "1.12.0";
const STORAGE_KEY = "led-calculator-state-v3";
const NOTES_KEY = "led-calculator-notes-v1";
const USERS_KEY = "led-calculator-users-v1";
const ACTIVE_USER_KEY = "led-calculator-active-user";
const HISTORY_KEY = "led-calculator-history-v1";
const EXCHANGE_RATE_DEFAULT = 83.44;

// API URLs - автоматически определяется по текущему домену
const API_BASE_URL = window.location.origin;
const EXCHANGE_RATE_API_URL = `${API_BASE_URL}/api/exchange-rate`;
const LOGISTICS_API_URL = `${API_BASE_URL}/api/logistics`;

// Логирование URL для отладки
console.log("API URLs:", {
  base: API_BASE_URL,
  exchangeRate: EXCHANGE_RATE_API_URL,
  logistics: LOGISTICS_API_URL
});

const integerFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});
const decimalFormatter = (digits = 2) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const percentFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const percentFractionFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const rubFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 2,
});
const usdFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const format = {
  integer: (value) => integerFormatter.format(Math.round(value ?? 0)),
  decimal: (value, digits = 2) => decimalFormatter(digits).format(value ?? 0),
  moneyRub: (value) => rubFormatter.format(value ?? 0),
  moneyUsd: (value) => usdFormatter.format(value ?? 0),
  percent: (value) => `${percentFormatter.format(value ?? 0)}%`,
  percentFraction: (value) =>
    `${percentFractionFormatter.format((value ?? 0) * 100)}%`,
  ratio: (value) => percentFractionFormatter.format(value ?? 0),
};

const modules = dataset.modules ?? [];
const cabinets = dataset.cabinets ?? [];
const receivingCards = dataset.receivingCards ?? [];
const controllers = dataset.controllers ?? [];
const hubs = dataset.hubs ?? [];
const powerSupplies = dataset.powerSupplies ?? [];
const accessories = dataset.accessories ?? [];
const aspectRatioTable = dataset.aspectRatios ?? [];

const processors = controllers
  .map((controller) => {
    const width = controller.maxPixels?.width ?? Infinity;
    const height = controller.maxPixels?.height ?? Infinity;
    const aggregatePixels =
      controller.aggregateThroughput ??
      (Number.isFinite(width) && Number.isFinite(height)
        ? width * height
        : Infinity);
    return {
      id: controller.id,
      name: controller.name,
      priceUsd: controller.priceUsd ?? 0,
      maxPixels: aggregatePixels,
      maxPorts: controller.portCount ?? 0,
      throughputPerPort: controller.throughputPerPort ?? 650000,
      meta: controller,
    };
  })
  .sort((a, b) => (a.maxPixels ?? Infinity) - (b.maxPixels ?? Infinity));

const uniqueValues = (list, accessor) =>
  Array.from(
    new Set(
      list
        .map(accessor)
        .filter(
          (value) =>
            value !== undefined && value !== null && value !== "" && !Number.isNaN(value)
        )
    )
  );

const numberOr = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeExecutionKey = (value = "") => {
  const lower = value.toString().toLowerCase();
  if (
    lower.includes("наруж") ||
    lower.includes("улиц") ||
    lower.includes("outdoor")
  ) {
    return "external";
  }
  return "internal";
};

const normalizeServiceKey = (value = "") => {
  const lower = value.toString().toLowerCase();
  if (lower.includes("тыл") || lower.includes("rear")) return "rear";
  return "front";
};

const normalizeTechnologyKey = (value = "") =>
  value.toString().toLowerCase().trim() || "smd";

const almostDivisible = (dividend, divisor, tolerance = 0.05) => {
  if (!dividend || !divisor) return false;
  const ratio = dividend / divisor;
  if (!Number.isFinite(ratio)) return false;
  return Math.abs(ratio - Math.round(ratio)) < tolerance;
};

const slugify = (value) =>
  value
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "item";

const normaliseName = (value = "") =>
  value.toString().toLowerCase().replace(/\s+/g, " ").trim();

const FRONT_INDOOR_CABINETS = new Set(
  [
    "Кабинет алюминиевый 320x160-C indoor, 320*160*45 мм, перед обслуж; только на магнитах 12x8; без коммутации",
    "Кабинет алюминиевый 640x480-C indoor, 640*480*45 мм, перед обслуж; только на магнитах 12x8; без коммутации",
    "Кабинет алюминиевый 640х640-C indoor, 640*640*45 мм, перед обслуж; только на магнитах 12x8; без коммутации",
  ].map(normaliseName)
);

const REAR_INDOOR_CABINETS = new Set(
  [
    "Кабинет алюминиевый 640х640 c коммутацией, Indoor/Outdoor, в комплекте пластина под блок пит,карту. 640*640*70мм",
    "Кабинет алюминиевый 960х960 indoor с коммутацией. Подходит только для интерьерных модулей 960*960*85,8мм",
  ].map(normaliseName)
);

const APP_NAME = "Светодиодный экран ММВС";
const DEFAULT_EXECUTION = "internal";
const DEFAULT_TECHNOLOGY = "smd";
const DEFAULT_REFRESH_RATE = 3840;
const DEFAULT_SERVICE = "front";

const PACK_SIZE_MAGNET = 2000;
const PACK_SIZE_CONNECTOR = 100;

const INTERNAL_PIXEL_PITCHES = [
  0.8, 1.0, 1.25, 1.37, 1.53, 1.66, 1.86, 2.0, 2.5, 3.0, 3.07, 4.0,
];
const EXTERNAL_PIXEL_PITCHES = [2.5, 3.07, 4.0, 5.0, 6.0, 6.66, 8.0];
const INDOOR_FRONT_CABINET_IDS = new Set([
  "qiangli-caci-320160",
  "qiangli-caci-640480",
  "qiangli-caci-640640",
]);
const INDOOR_REAR_CABINET_IDS = new Set([
  "qiangli-ca-640640",
  "qiangli-caoi-960960",
]);
const OUTDOOR_FRONT_CABINET_IDS = new Set([
  "qiangli-caci-640640",
  "640-640-outdoor",
  "640-480-outdoor",
  "960-960-outdoor",
]);
const OUTDOOR_REAR_CABINET_IDS = new Set([
  "qiangli-ca-640640",
  "qiangli-caoo-960960",
]);
const VAT_OPTIONS = [
  { value: 0, label: "Без НДС" },
  { value: 0.05, label: "НДС 5%" },
];
const VAT_DEFAULT = VAT_OPTIONS[0].value;

const getPackSizeForAccessory = (name = "") => {
  const trimmed = name.trim();
  if (trimmed === "Магнит 12*8*1,2") return PACK_SIZE_MAGNET;
  if (trimmed === "Коннектор 16 PIN" || trimmed === "Коннектор 26 PIN")
    return PACK_SIZE_CONNECTOR;
  if (trimmed === "Винт M4*12") return 200;
  return 1;
};

const accessoriesByName = new Map(
  accessories
    .filter((item) => item?.name)
    .map((item) => [item.name.trim(), item])
);

const resolveAccessory = (name, fallbackPrice = 0) => {
  const match = accessoriesByName.get(name.trim());
  return {
    label: match?.name ?? name,
    priceUsd: numberOr(match?.priceUsd ?? fallbackPrice),
    packSize: getPackSizeForAccessory(name),
  };
};

const PIXEL_PITCH_EPSILON = 0.011;

function getIndoorCabinetSet(serviceType) {
  return serviceType === "rear"
    ? INDOOR_REAR_CABINET_IDS
    : INDOOR_FRONT_CABINET_IDS;
}

function getOutdoorCabinetSet(serviceType) {
  return serviceType === "rear"
    ? OUTDOOR_REAR_CABINET_IDS
    : OUTDOOR_FRONT_CABINET_IDS;
}

function getCabinetSetForState(execution, serviceType) {
  if (execution === "internal") {
    return getIndoorCabinetSet(serviceType);
  }
  if (execution === "external") {
    return getOutdoorCabinetSet(serviceType);
  }
  return null;
}

function matchesExecutionForModule(module, execution) {
  const normalized = module.execution ?? "internal";
  const name = (module.label ?? "").toLowerCase();
  if (execution === "external") {
    if (normalized === "external") return true;
    return name.includes("outdoor") || name.includes("soft mask");
  }
  if (normalized === "external") {
    return false;
  }
  return !name.includes("outdoor");
}

function getCompatibleModules(cabinet, technology, execution) {
  if (!cabinet) return [];
  return moduleCatalog.filter(
    (module) =>
      moduleFitsCabinet(module, cabinet) &&
      module.technology === technology &&
      matchesExecutionForModule(module, execution) &&
      isPixelPitchAllowed(execution, module.pixelPitch)
  );
}

function isPixelPitchAllowed(execution, value) {
  const list =
    execution === "external" ? EXTERNAL_PIXEL_PITCHES : INTERNAL_PIXEL_PITCHES;
  return list.some((allowed) => Math.abs((value ?? 0) - allowed) < PIXEL_PITCH_EPSILON);
}

const normalizedModules = modules
  .map((raw) => {
    if (!raw) return null;
    const id = raw.id ?? slugify(raw.name ?? raw.module ?? "");
    const moduleWidth =
      numberOr(raw.sizeMm?.width) ||
      numberOr(raw.size?.width) ||
      numberOr(raw.moduleWidthMm) ||
      numberOr(raw["Размер (Ш), мм"]);
    const moduleHeight =
      numberOr(raw.sizeMm?.height) ||
      numberOr(raw.size?.height) ||
      numberOr(raw.moduleHeightMm) ||
      numberOr(raw["Размер (В), мм"]);
    const pixelsWide =
      numberOr(raw.pixels?.width) || numberOr(raw["Пикселей (Ш)"]);
    const pixelsTall =
      numberOr(raw.pixels?.height) || numberOr(raw["Пикселей (В)"]);
    const pixelPitch =
      numberOr(raw.pixelPitchMm) ||
      numberOr(raw.pixelPitch) ||
      numberOr(raw["Шаг пикселя, мм"]);
    if (!id || !moduleWidth || !moduleHeight || !pixelPitch) return null;
    return {
      id,
      name: raw.name ?? raw.module ?? id,
      series: raw.series ?? "",
      execution: normalizeExecutionKey(raw.execution),
      technology: normalizeTechnologyKey(raw.technology),
      moduleWidth,
      moduleHeight,
      pixelsWide,
      pixelsTall,
      pixelPitch,
      signal: raw.signal ?? "HUB75",
      refreshRate: numberOr(raw.refreshRateHz ?? raw.refreshRate ?? DEFAULT_REFRESH_RATE),
      mountPoints: numberOr(raw.mountPoints ?? raw["Точек крепл, шт"] ?? 12),
      weightKg: numberOr(raw.weightKg ?? raw["Вес, кг"] ?? 0.5),
      maxCurrent: numberOr(raw.maxCurrentA ?? raw["Макс. ток, А"] ?? 5),
      maxPowerPerSqm: numberOr(raw.maxPowerWPerM2 ?? raw["Макс мощность, Вт/м2"] ?? 400),
      avgPowerPerSqm: numberOr(raw.avgPowerWPerM2 ?? raw["Ср мощность, Вт/м2"] ?? 150),
      brightness: numberOr(raw.brightnessNits ?? raw["Яркость,nit"] ?? 600),
      priceUsd: numberOr(raw.priceUsd ?? raw["Цена, $"] ?? 0),
      description: raw.name ?? raw.module ?? id,
    };
  })
  .filter(Boolean);

const moduleCatalog = normalizedModules.map((module) => ({
  id: module.id,
  label: module.name,
  group: module.series,
  technology: module.technology,
  execution: module.execution,
  pixelPitch: module.pixelPitch,
  moduleWidth: module.moduleWidth,
  moduleHeight: module.moduleHeight,
  brightness: module.brightness,
  priceUsd: module.priceUsd,
  description: module.description,
  refreshRate: module.refreshRate,
  signal: module.signal,
  mountPoints: module.mountPoints,
  maxCurrent: module.maxCurrent,
  maxPowerPerSqm: module.maxPowerPerSqm,
  avgPowerPerSqm: module.avgPowerPerSqm,
  pixelsWide: module.pixelsWide,
  pixelsTall: module.pixelsTall,
  weightKg: module.weightKg,
}));

const moduleById = new Map(moduleCatalog.map((item) => [item.id, item]));

const normalizedCabinets = cabinets
  .map((raw) => {
    if (!raw) return null;
    const id =
      raw.id ??
      raw.sku ??
      slugify(raw.name ?? raw["Кабинет, описание"] ?? "cabinet");
    const name = raw.name ?? raw["Кабинет, описание"] ?? id;
    const cabinetWidth =
      numberOr(raw.cabinetWidthMm ?? raw.widthMm ?? raw["Ширина кабинета, мм"]);
    const cabinetHeight =
      numberOr(raw.cabinetHeightMm ?? raw.heightMm ?? raw["Высота кабинета, мм"]);
    const moduleWidth =
      numberOr(raw.moduleWidthMm ?? raw["Ширина модуля, мм"] ?? 0);
    const modulesWide = numberOr(raw.modulesWide ?? raw["Модулей в Ш"] ?? 1);
    const modulesTall = numberOr(raw.modulesTall ?? raw["Модулей в В"] ?? 1);
    if (!id || !cabinetWidth || !cabinetHeight || !moduleWidth) return null;
    return {
      id,
      name,
      execution: normalizeExecutionKey(raw.execution),
      service: normalizeServiceKey(raw.service),
      moduleWidth,
      cabinetWidth,
      cabinetHeight,
      modulesWide,
      modulesTall,
      weightKg: numberOr(raw.weightKg ?? raw["Вес, кг"] ?? 0),
      priceUsd: numberOr(raw.priceUsd ?? raw["Цена, $"] ?? 0),
      priceRub: numberOr(raw.priceRub ?? raw["Цена, руб"] ?? 0),
    };
  })
  .filter(Boolean);

const moduleFitsCabinet = (module, cabinet) => {
  if (!module || !cabinet) return false;
  const widthMatch =
    almostDivisible(cabinet.cabinetWidth, module.moduleWidth) ||
    Math.abs(cabinet.moduleWidth - module.moduleWidth) < 0.5;
  const heightMatch = almostDivisible(
    cabinet.cabinetHeight,
    module.moduleHeight
  );
  return widthMatch && heightMatch;
};

const cabinetCatalog = normalizedCabinets.map((cabinet) => {
  const supportedModuleIds = moduleCatalog
    .filter((module) => moduleFitsCabinet(module, cabinet))
    .map((module) => module.id);

  const modulesPerCabinet = cabinet.modulesWide * cabinet.modulesTall || 1;
  const referenceModule =
    moduleCatalog.find((module) => supportedModuleIds.includes(module.id)) ||
    moduleCatalog[0];
  const technologyList = uniqueValues(
    moduleCatalog.filter((module) =>
      supportedModuleIds.includes(module.id)
    ),
    (module) => module.technology
  );
  const technologies =
    technologyList.length > 0 ? technologyList : [DEFAULT_TECHNOLOGY];
  const areaSqM =
    (cabinet.cabinetWidth * cabinet.cabinetHeight) / 1_000_000 || 1;
  const magnetsPerModule = referenceModule?.mountPoints ?? 12;
  const powerPerCabinet =
    referenceModule?.maxPowerPerSqm && areaSqM
      ? referenceModule.maxPowerPerSqm * areaSqM
      : 320;
  return {
    id: cabinet.id,
    label: cabinet.name,
    description: cabinet.name,
    execution: cabinet.execution,
    serviceTypes: [cabinet.service],
    technologies,
    supportedModuleIds: supportedModuleIds.length
      ? supportedModuleIds
      : moduleCatalog.map((module) => module.id),
    cabinetWidth: cabinet.cabinetWidth,
    cabinetHeight: cabinet.cabinetHeight,
    maxUnits: { width: 12, height: 8 },
    magnetsPerCabinet: modulesPerCabinet * magnetsPerModule,
    connectorsPerModule: 1,
    ribbonPerCabinet: 0.33,
    psuPerCabinet: Math.max(1, Math.round(cabinet.modulesWide / 2)),
    cardsPerPort: 2,
    patchCordsPerPort: 2,
    powerPerCabinet,
    priceUsd: cabinet.priceUsd,
  };
});

const cabinetById = new Map(
  cabinetCatalog.map((cabinet) => [cabinet.id, cabinet])
);

// Map для доступа к весу кабинетов
const cabinetWeightById = new Map(
  normalizedCabinets.map((cabinet) => [cabinet.id, cabinet.weightKg ?? 0])
);

const powerSupplyCatalog = (powerSupplies ?? [])
  .map((raw) => {
    if (!raw) return null;
    const id = raw.id ?? slugify(raw.name ?? "psu");
    return {
      id,
      label: raw.name ?? id,
      name: raw.name ?? id,
      powerW: numberOr(raw.powerW ?? raw["Мощность, Вт"] ?? 300),
      currentA: numberOr(raw.currentA ?? raw["Сила тока, А"] ?? 60),
      priceUsd: numberOr(raw.priceUsd ?? raw["Цена, $"] ?? 0),
    };
  })
  .filter(Boolean);

const receivingCardCatalog = (receivingCards ?? [])
  .map((raw) => {
    if (!raw) return null;
    const id = raw.id ?? slugify(raw.name ?? "receiving-card");
    return {
      id,
      label: raw.name ?? id,
      name: raw.name ?? id,
      requiresHub: Boolean(
        raw.requiresHub ??
          raw["Нужен хаб?"] ??
          raw.needsHub ??
          false
      ),
      connectors: numberOr(raw.connectorCount ?? raw["Кол-во разъемов"] ?? 8),
      signal: raw.signal ?? raw["Код сигнала"] ?? "HUB75",
      maxPixels: {
        width: numberOr(raw.maxPixels?.width ?? raw["Пикселей (Ш)"] ?? Infinity),
        height: numberOr(
          raw.maxPixels?.height ?? raw["Пикселей (В)"] ?? Infinity
        ),
      },
      priceUsd: numberOr(raw.priceUsd ?? raw["Цена, $"] ?? 0),
    };
  })
  .filter(Boolean);

const receivingCardsById = new Map(
  receivingCardCatalog.map((item) => [item.id, item])
);

const pickPsuModel = (requiredCurrent) =>
  powerSupplyCatalog.find((psu) => (psu.currentA ?? 0) >= requiredCurrent) ??
  powerSupplyCatalog[powerSupplyCatalog.length - 1] ?? {
    label: ACCESSORIES.psu.label,
    name: ACCESSORIES.psu.label,
    currentA: 60,
    priceUsd: ACCESSORIES.psu.priceUsd,
  };

const pickReceivingCard = (module) => {
  const cards = receivingCardCatalog.filter((card) => {
    const width = card.maxPixels?.width ?? Infinity;
    const height = card.maxPixels?.height ?? Infinity;
    return (
      (!module?.pixelsWide || module.pixelsWide <= width) &&
      (!module?.pixelsTall || module.pixelsTall <= height)
    );
  });
  return (
    cards[0] ??
    receivingCardCatalog[0] ?? {
      label: ACCESSORIES.receiver.label,
      name: ACCESSORIES.receiver.label,
      priceUsd: ACCESSORIES.receiver.priceUsd,
      requiresHub: false,
    }
  );
};

const defaultModule =
  moduleCatalog.find(
    (module) =>
      module.execution === DEFAULT_EXECUTION &&
      module.technology === DEFAULT_TECHNOLOGY &&
      Math.abs((module.pixelPitch ?? 0) - 2) < 0.05
  ) || moduleCatalog[0];

const defaultCabinet =
  cabinetCatalog.find(
    (cabinet) =>
      cabinet.serviceTypes.includes(DEFAULT_SERVICE) &&
      cabinet.technologies.includes(DEFAULT_TECHNOLOGY)
  ) || cabinetCatalog[0];

const accessoriesResolved = {
  magnet: resolveAccessory("Магнит 12*8*1,2", 0.08),
  screw: resolveAccessory("Винт M4*12", 0.05),
  connector16: resolveAccessory("Коннектор 16 PIN", 0.09),
  connector26: resolveAccessory("Коннектор 26 PIN", 0.18),
  ribbon16: resolveAccessory("Шлейф бухта 16 PIN, 75 м", 25),
  ribbon26: resolveAccessory("Шлейф бухта 26 PIN, 75 м", 50),
  psu: resolveAccessory("Блок питания A-300FAY 4,5", 15.4),
  receiver: resolveAccessory("Контроллер Novastar MRV 416", 18.9),
  patchCord: resolveAccessory("Патч-корд RJ45, 1,5 м", 2.08),
  hub: resolveAccessory("Плата HUB 320-AXS", 15),
};

const FASTENER_BY_SERVICE = {
  front: accessoriesResolved.magnet,
  rear: accessoriesResolved.screw,
};

const CONNECTOR_BY_SIGNAL = {
  hub320: accessoriesResolved.connector26,
  hub75: accessoriesResolved.connector16,
};

const RIBBON_BY_SIGNAL = {
  hub320: accessoriesResolved.ribbon26,
  hub75: accessoriesResolved.ribbon16,
};

const PATCH_CORD_ACCESSORY = accessoriesResolved.patchCord;
const HUB_ACCESSORY = accessoriesResolved.hub;

const ACCESSORIES = {
  magnet: accessoriesResolved.magnet,
  connector: accessoriesResolved.connector16,
  ribbon: accessoriesResolved.ribbon16,
  psu: accessoriesResolved.psu,
  receiver: accessoriesResolved.receiver,
  patchCord: accessoriesResolved.patchCord,
};

const componentCatalog = [
  {
    id: "cabinet",
    label: (d) => d.cabinet?.label ?? "Кабинет",
    description: (d) => d.cabinet?.description ?? "",
    priceUsd: (d) => d.cabinet?.priceUsd ?? 0,
    calc: (d) => d.cabinetsTotal,
  },
  {
    id: "module",
    label: (d) => d.module?.label ?? "Модуль",
    description: (d) => d.module?.description ?? "",
    priceUsd: (d) => d.module?.priceUsd ?? 0,
    calc: (d) => d.modulesTotal,
  },
  {
    id: "module_spare",
    label: (d) => `${d.module?.label ?? "Модуль"} — ЗИП`,
    description: () =>
      `Запас ${format.percent(FINANCE.moduleSparePercent)}`,
    priceUsd: (d) => d.module?.priceUsd ?? 0,
    calc: (d) => d.modulesSpare,
  },
  {
    id: "fastener",
    label: (d) => d.fastenerAccessory?.label ?? ACCESSORIES.magnet.label,
    description: (d) =>
      `${d.fastenerAccessory?.label ?? ACCESSORIES.magnet.label} (кратно ${format.integer(
        d.fastenerAccessory?.packSize ?? PACK_SIZE_MAGNET
      )} шт.)`,
    priceUsd: (d) => d.fastenerAccessory?.priceUsd ?? ACCESSORIES.magnet.priceUsd,
    calc: (d) => d.magnetsTotal,
  },
  {
    id: "connector",
    label: (d) => d.connectorAccessory?.label ?? ACCESSORIES.connector.label,
    description: (d) =>
      `${d.connectorAccessory?.label ?? ACCESSORIES.connector.label} (кратно ${format.integer(
        d.connectorAccessory?.packSize ?? PACK_SIZE_CONNECTOR
      )} шт.)`,
    priceUsd: (d) => d.connectorAccessory?.priceUsd ?? ACCESSORIES.connector.priceUsd,
    calc: (d) => d.connectorsTotal,
  },
  {
    id: "ribbon",
    label: (d) => d.ribbonAccessory?.label ?? ACCESSORIES.ribbon.label,
    description: (d) =>
      `${d.ribbonAccessory?.label ?? ACCESSORIES.ribbon.label} · ${format.decimal(
        d.ribbonMeters ?? 0,
        1
      )} м`,
    priceUsd: (d) => d.ribbonAccessory?.priceUsd ?? ACCESSORIES.ribbon.priceUsd,
    calc: (d) => d.ribbonSpools,
  },
  {
    id: "psu",
    label: (d) => d.psuModel?.label ?? ACCESSORIES.psu.label,
    description: (d) => d.psuModel?.label ?? ACCESSORIES.psu.label,
    priceUsd: (d) => d.psuModel?.priceUsd ?? ACCESSORIES.psu.priceUsd,
    calc: (d) => d.psuTotal,
  },
  {
    id: "psu_spare",
    label: (d) => `${d.psuModel?.label ?? ACCESSORIES.psu.label} — ЗИП`,
    description: () =>
      `Запас ${format.percent(FINANCE.psuSparePercent)}`,
    priceUsd: (d) => d.psuModel?.priceUsd ?? ACCESSORIES.psu.priceUsd,
    calc: (d) => d.psuSpareTotal,
  },
  {
    id: "processor",
    label: (d) => d.processor?.name ?? "Контроллер",
    description: (d) =>
      d.processor
        ? `Портов ${format.integer(d.portsNeeded)} / ${format.integer(
            d.processor.maxPorts
          )}`
        : "",
    priceUsd: (d) => d.processor?.priceUsd ?? 0,
    calc: () => 1,
  },
  {
    id: "receiver",
    label: (d) => d.receivingCard?.label ?? ACCESSORIES.receiver.label,
    description: (d) => d.receivingCard?.label ?? ACCESSORIES.receiver.label,
    priceUsd: (d) => d.receivingCard?.priceUsd ?? ACCESSORIES.receiver.priceUsd,
    calc: (d) => d.receiverCards,
  },
  {
    id: "receiver_spare",
    label: (d) =>
      `${d.receivingCard?.label ?? ACCESSORIES.receiver.label} — ЗИП`,
    description: () =>
      `Запас ${format.percent(FINANCE.receiverSparePercent)}`,
    priceUsd: (d) => d.receivingCard?.priceUsd ?? ACCESSORIES.receiver.priceUsd,
    calc: (d) => d.receiverCardsSpare,
  },
  {
    id: "patch",
    label: () => PATCH_CORD_ACCESSORY.label ?? ACCESSORIES.patchCord.label,
    description: (d) =>
      `${PATCH_CORD_ACCESSORY.label ?? ACCESSORIES.patchCord.label} · ${format.decimal(
        d.patchCordsPerPort ?? 0,
        1
      )} шт. на порт`,
    priceUsd: () => PATCH_CORD_ACCESSORY.priceUsd ?? ACCESSORIES.patchCord.priceUsd,
    calc: (d) => d.patchCordsTotal,
  },
  {
    id: "hub",
    label: () => HUB_ACCESSORY?.label ?? "Хаб",
    description: () => HUB_ACCESSORY?.label ?? "Хаб",
    priceUsd: () => HUB_ACCESSORY?.priceUsd ?? 0,
    calc: (d) => d.hubTotal ?? 0,
  },
  {
    id: "hub_spare",
    label: () => `${HUB_ACCESSORY?.label ?? "Хаб"} — ЗИП`,
    description: () => HUB_ACCESSORY?.label ?? "Хаб",
    priceUsd: () => HUB_ACCESSORY?.priceUsd ?? 0,
    calc: (d) => d.hubSpareTotal ?? 0,
  },
];

const FINANCE = {
  moduleSparePercent: 15,
  psuSparePercent: 20,
  receiverSparePercent: 15,
  cardsPerPortDefault: 2,
  patchCordsPerPort: 2,
  powerReservePercent: 20,
};

const STATIC_LABELS = {
  execution: {
    internal: "Внутренний",
    external: "Наружный",
  },
  service: {
    front: "Фронтальное",
    rear: "Тыльное",
  },
  technology: {
    smd: "SMD",
    cob: "COB",
    dip: "DIP",
  },
};

const numericFields = new Set([
  "refreshRate",
  "siteWidth",
  "siteHeight",
  "exchangeRate",
  "logisticsRub",
  "installationRub",
]);

const numericFieldMin = {
  refreshRate: 1,
  siteWidth: 1,
  siteHeight: 1,
  exchangeRate: 0.01,
  logisticsRub: 0,
};

const optionProviders = {
  execution: () => [
    { value: "internal", label: STATIC_LABELS.execution.internal },
    { value: "external", label: STATIC_LABELS.execution.external },
  ],
  refreshRate: () => [
    { value: 1920, label: "1920" },
    { value: 2880, label: "2880" },
    { value: 3360, label: "3360" },
    { value: 3840, label: "3840" },
    { value: 7680, label: "7680" },
  ],
  technology: (state) => {
    const exec = state?.execution ?? DEFAULT_EXECUTION;
    const technologies = uniqueValues(
      moduleCatalog.filter((module) => module.execution === exec),
      (module) => module.technology
    );
    const values = technologies.length ? technologies : ["smd", "cob", "dip"];
    return values.map((value) => ({
      value,
      label: STATIC_LABELS.technology[value] ?? value.toUpperCase(),
    }));
  },
  service: (state) => getServiceOptions(state),
  cabinet: (state) => getCabinetOptions(state),
  pixelPitch: (state) => getPixelPitchOptions(state),
  vat: () =>
    VAT_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
    })),
};

const isHistoryView = document.body?.dataset?.view === "history";
const derivedTemplate = document.getElementById("derived-item-template");
const derivedGrid = document.getElementById("derived-grid");
const warningsContainer = document.getElementById("warnings");
const tableBody = document.querySelector("#components-table tbody");
const totalUsdCell = document.getElementById("total-usd");
const totalRubCell = document.getElementById("total-rub");
const totalQtyCell = document.getElementById("total-qty");
const footnoteCell = document.getElementById("footnote");
const notesArea = document.getElementById("notes");
const resetButton = document.getElementById("reset-button");
const calculateButton = document.getElementById("calculate-button");
const exportCsvButton = document.getElementById("export-csv");
const exportWordButton = document.getElementById("export-word");
const exportPdfButton = document.getElementById("export-pdf");
const copySummaryButton = document.getElementById("copy-summary");
const authFormsWrapper = document.getElementById("auth-forms");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const userArea = document.getElementById("user-area");
const userHistoryContainer = document.getElementById("user-history");
const userNameLabel = document.getElementById("user-name");
const userEmailLabel = document.getElementById("user-email");
const logoutButton = document.getElementById("logout-button");
const saveCalculationButton = document.getElementById("save-calculation");
const exportUserDataButton = document.getElementById("export-user-data");
const importUserDataInput = document.getElementById("import-user-data");
const openHistoryButton = document.getElementById("open-history");
const closeHistoryButton = document.getElementById("close-history");
const historySummaryButton = document.getElementById("export-history-summary");
const adminPanel = document.getElementById("admin-panel");
const adminUserList = document.getElementById("admin-user-list");
const adminUserDetailPanel = document.getElementById("admin-user-detail");
const adminUserForm = document.getElementById("admin-user-form");
const adminUserTitle = document.getElementById("admin-user-title");
const adminUserNameInput = document.getElementById("admin-user-name");
const adminUserEmailInput = document.getElementById("admin-user-email");
const adminUserPasswordInput = document.getElementById("admin-user-password");
const adminUserHistoryContainer = document.getElementById("admin-user-history");
const appVersionBadge = document.getElementById("app-version");

let state = normaliseState(loadState());
let lastDerived = null;
let lastFinancialSnapshot = null;
let logoDataUrlPromise = null;
ensureAdminAccount();
let currentUser = loadActiveUser();
let adminSelectedUserId = null;

initialise();

function initialise() {
  if (appVersionBadge) {
    appVersionBadge.textContent = VERSION;
  }
  attachListeners();
  if (isHistoryView) {
    renderAccountSection();
    return;
  }
  
  // Загрузить данные пользователя при инициализации
  state = normaliseState(loadState());
  
  // Убедиться, что курс установлен (из localStorage или значение по умолчанию)
  if (!state.exchangeRate || state.exchangeRate === 0) {
    state.exchangeRate = EXCHANGE_RATE_DEFAULT;
    // Сохранить значение по умолчанию в state
    persistState();
  }
  
  // Сначала установить курс в поле ввода явно, чтобы он отображался сразу
  // Используем setTimeout для гарантии, что DOM готов
  setTimeout(() => {
    const exchangeInput = document.querySelector('input[data-state-key="exchangeRate"]');
    if (exchangeInput) {
      const currentRate = state.exchangeRate || EXCHANGE_RATE_DEFAULT;
      const rate = Number(currentRate).toFixed(2);
      const formattedRate = rate.replace('.', ',');
      exchangeInput.value = formattedRate;
      // Также установим через setAttribute для readonly полей
      exchangeInput.setAttribute('value', formattedRate);
    }
  }, 0);
  
  // Затем загрузить локальные данные для быстрого отображения
  syncSelectOptions();
  restoreNotes();
  
  // Продолжить инициализацию сразу, чтобы интерфейс загрузился быстро
  continueInitialisation();
  
  // Затем автоматически загрузить актуальный курс доллара с сайта Банка России
  // и обновить интерфейс (в фоне, без блокировки инициализации)
  // Если API недоступен, используется сохраненное значение или значение по умолчанию
  loadExchangeRateFromAPI(true).catch(() => {
    // Курс уже установлен из localStorage или значения по умолчанию
  });
  
  function continueInitialisation() {
    // Обновить синхронизацию полей (включая курс)
    syncSelectOptions();
    
    // Убедиться, что курс отображается (даже если API недоступен)
    const exchangeInputAfter = document.querySelector('input[data-state-key="exchangeRate"]');
    if (exchangeInputAfter) {
      const currentRate = state.exchangeRate || EXCHANGE_RATE_DEFAULT;
      const rate = Number(currentRate).toFixed(2);
      const formattedRate = rate.replace('.', ',');
      // Принудительно установить значение, если поле пустое
      if (!exchangeInputAfter.value || exchangeInputAfter.value.trim() === '') {
        exchangeInputAfter.value = formattedRate;
        exchangeInputAfter.setAttribute('value', formattedRate);
      }
    }
    
    if (currentUser) {
      // Загрузить данные с сервера, если доступны
      // loadUserDataFromFile вызовет renderAll и restoreNotes при необходимости
      loadUserDataFromFile().then(() => {
        syncSelectOptions();
        restoreNotes();
        renderAll();
      }).catch(() => {
        // Если загрузка с сервера не удалась, использовать локальные данные
        syncSelectOptions();
        restoreNotes();
        renderAll();
      });
    } else {
      restoreNotes();
      renderAll();
    }
    
    renderAccountSection();
  }
}

function createDefaultState() {
  const moduleId = defaultModule?.id ?? modules[0]?.id ?? "";
  const cabinetId = defaultCabinet?.id ?? cabinets[0]?.id ?? "";
  return {
    currentDate: new Date().toISOString().slice(0, 10),
    execution: DEFAULT_EXECUTION,
    refreshRate: DEFAULT_REFRESH_RATE,
    technology: DEFAULT_TECHNOLOGY,
    serviceType: defaultCabinet?.service ?? DEFAULT_SERVICE,
    cabinetId,
    moduleId,
    siteWidth: 2560,
    siteHeight: 1920,
    organisation: "",
    taxId: "",
    exchangeRate: EXCHANGE_RATE_DEFAULT,
    logisticsRub: 0,
    installationRub: 0,
    vatRate: VAT_DEFAULT,
  };
}

function getUserStorageKey(key) {
  const userId = currentUser?.id;
  return userId ? `${key}-user-${userId}` : key;
}

function loadState() {
  try {
    const storageKey = getUserStorageKey(STORAGE_KEY);
    const raw = localStorage.getItem(storageKey);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    return { ...createDefaultState(), ...sanitiseState(parsed) };
  } catch (error) {
    console.warn("Невозможно прочитать сохранённое состояние:", error);
    return createDefaultState();
  }
}

function sanitiseState(parsed) {
  const allowedKeys = new Set([
    "currentDate",
    "execution",
    "refreshRate",
    "technology",
    "serviceType",
    "cabinetId",
    "moduleId",
    "siteWidth",
    "siteHeight",
    "organisation",
    "taxId",
    "exchangeRate",
    "logisticsRub",
    "installationRub",
    "vatRate",
  ]);
  return Object.keys(parsed ?? {}).reduce((acc, key) => {
    if (allowedKeys.has(key)) {
      acc[key] = parsed[key];
    }
    return acc;
  }, {});
}

let saveTimeout = null;

function persistState() {
  try {
    const { currentDate, ...rest } = state;
    const storageKey = getUserStorageKey(STORAGE_KEY);
    localStorage.setItem(storageKey, JSON.stringify({ currentDate, ...rest }));
    
    // Автосохранение в файл через API с задержкой (чтобы не сохранять при каждом изменении)
    if (currentUser?.id) {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        saveUserDataToFile();
      }, 2000); // Сохранять через 2 секунды после последнего изменения
    }
  } catch (error) {
    console.warn("Не удалось сохранить состояние:", error);
  }
}

function normaliseState(current) {
  let next = { ...current };

  if (!next.currentDate) {
    next.currentDate = new Date().toISOString().slice(0, 10);
  }

  // Обработать курс: заменить запятую на точку для правильного парсинга
  let exchangeRateValue = next.exchangeRate;
  if (typeof exchangeRateValue === 'string') {
    exchangeRateValue = exchangeRateValue.replace(',', '.');
  }
  const exchangeRateNumber = Number(exchangeRateValue);
  next.exchangeRate =
    Number.isFinite(exchangeRateNumber) && exchangeRateNumber > 0
      ? exchangeRateNumber
      : EXCHANGE_RATE_DEFAULT;

  const serviceOptions = getServiceOptions(next);
  if (
    serviceOptions.length &&
    !serviceOptions.some((option) => option.value === next.serviceType)
  ) {
    next.serviceType = serviceOptions[0].value;
  }

  const cabinetOptions = getCabinetOptions(next);
  if (!cabinetOptions.some((option) => option.value === next.cabinetId)) {
    next.cabinetId = cabinetOptions[0]?.value ?? "";
  }

  const pixelOptions = getPixelPitchOptions(next);
  if (!pixelOptions.some((option) => option.value === next.moduleId)) {
    next.moduleId = pixelOptions[0]?.value ?? "";
  }

  const widthValue = clampNumber(next.siteWidth);
  next.siteWidth = widthValue > 0 ? widthValue : 2560;

  const heightValue = clampNumber(next.siteHeight);
  next.siteHeight = heightValue > 0 ? heightValue : 1920;
  
  // Размеры экрана могут быть любыми, без ограничений

  next.organisation =
    typeof next.organisation === "string"
      ? next.organisation.trim()
      : String(next.organisation ?? "").trim();
  next.taxId =
    typeof next.taxId === "string"
      ? next.taxId.trim()
      : String(next.taxId ?? "").trim();
  next.deliveryCity =
    typeof next.deliveryCity === "string"
      ? next.deliveryCity.trim()
      : String(next.deliveryCity ?? "").trim();

  const logisticsValue = clampNumber(next.logisticsRub);
  next.logisticsRub = logisticsValue >= 0 ? logisticsValue : 0;

  const installationValue = clampNumber(next.installationRub);
  next.installationRub = installationValue >= 0 ? installationValue : 0;

  const vatOptions = VAT_OPTIONS.map((option) => option.value);
  const vatNumber = Number(next.vatRate);
  next.vatRate = vatOptions.includes(vatNumber) ? vatNumber : VAT_DEFAULT;

  return next;
}

function attachListeners() {
  const controls = document.querySelectorAll(
    'select[data-state-key], input[data-state-key]:not([readonly])'
  );
  controls.forEach((control) => {
    const eventName = control.tagName === "SELECT" ? "change" : "input";
    control.addEventListener(eventName, handleControlChange);
  });

  notesArea?.addEventListener("input", handleNotesChange);
  resetButton?.addEventListener("click", handleReset);
  calculateButton?.addEventListener("click", handleCalculateClick);
  exportCsvButton?.addEventListener("click", exportToCsv);
  exportWordButton?.addEventListener("click", exportToWord);
  exportPdfButton?.addEventListener("click", exportToPdf);
  copySummaryButton?.addEventListener("click", copySummaryToClipboard);
  loginForm?.addEventListener("submit", handleLoginSubmit);
  registerForm?.addEventListener("submit", handleRegisterSubmit);
  logoutButton?.addEventListener("click", handleLogout);
  saveCalculationButton?.addEventListener("click", handleSaveCalculation);
  exportUserDataButton?.addEventListener("click", handleExportUserData);
  importUserDataInput?.addEventListener("change", handleImportUserData);
  userHistoryContainer?.addEventListener("click", handleHistoryAction);
  openHistoryButton?.addEventListener("click", handleOpenHistoryClick);
  closeHistoryButton?.addEventListener("click", () => window.close());
  historySummaryButton?.addEventListener("click", exportHistorySummary);
  adminUserList?.addEventListener("click", handleAdminUserListClick);
  adminUserForm?.addEventListener("submit", handleAdminUserSave);
}

function handleControlChange(event) {
  const control = event.currentTarget;
  const key = control.dataset.stateKey;
  if (!key) return;

  if (numericFields.has(key)) {
    const normalized = control.value.replace(",", ".");
    const numeric = normalized === "" ? NaN : Number(normalized);
    const minValue = numericFieldMin[key] ?? 0;
    if (!Number.isFinite(numeric)) {
      if (minValue === 0 && normalized === "") {
        state = normaliseState({ ...state, [key]: 0 });
        renderAll();
        return;
      }
      syncSelectOptions();
      return;
    }
    if (numeric < minValue) {
      syncSelectOptions();
      return;
    }
    state = normaliseState({ ...state, [key]: numeric });
  } else {
    const value =
      control.tagName === "SELECT" ? control.value : String(control.value);
    state = normaliseState({ ...state, [key]: value });
  }

  renderAll();
}

function handleReset() {
  const confirmed = window.confirm(
    "Сбросить расчёт к исходным значениям? Будут стерты сохранённые данные."
  );
  if (!confirmed) return;

  state = normaliseState(createDefaultState());
  persistState();
  const notesStorageKey = getUserStorageKey(NOTES_KEY);
  localStorage.removeItem(notesStorageKey);
  if (notesArea) notesArea.value = "";
  syncSelectOptions();
  renderAll();
}

async function handleCalculateClick() {
  // Сначала рассчитать основные параметры
  renderAll();
  
  // Автоматически рассчитать логистику, если указан город доставки
  const deliveryCity = state.deliveryCity?.trim();
  
  if (deliveryCity) {
    // Получить расчетные данные для веса и стоимости
    const derived = calculateDerived(state);
    const snapshot = composeComponentRows(derived);
    
    if (derived.totalWeightKg && derived.totalWeightKg > 0) {
      try {
        // Показать индикатор загрузки на кнопке
        const originalButtonText = calculateButton?.textContent || "Рассчитать";
        if (calculateButton) {
          calculateButton.disabled = true;
          calculateButton.textContent = "Рассчитывается...";
        }
        
        // Загрузить логистику через API
        const declaredValue = snapshot.totals?.grand?.rub || 0;
        console.log("Параметры для расчета логистики:", {
          город: deliveryCity,
          вес: derived.totalWeightKg,
          стоимость: declaredValue
        });
        
        const price = await loadLogisticsFromAPI(deliveryCity, derived.totalWeightKg, declaredValue);
        
        console.log("Получена цена логистики:", price);
        
        if (price && price > 0) {
          state.logisticsRub = price;
          persistState();
          syncSelectOptions();
          renderAll();
          console.log("Логистика успешно обновлена в state:", state.logisticsRub);
        } else {
          console.warn("Получена некорректная цена логистики:", price);
        }
        
        // Восстановить кнопку
        if (calculateButton) {
          calculateButton.disabled = false;
          calculateButton.textContent = originalButtonText;
        }
      } catch (error) {
        // Ошибка расчета логистики не критична - логируем подробно
        console.error("Ошибка расчета логистики для города '" + deliveryCity + "':", error.message || error);
        console.error("Полная ошибка:", error);
        
        // Показываем предупреждение в консоли, но не блокируем расчет
        // Если нужно, можно показать уведомление пользователю
        // window.alert(`Не удалось рассчитать логистику для города "${deliveryCity}": ${error.message || error}`);
        
        // Восстановить кнопку
        if (calculateButton) {
          calculateButton.disabled = false;
          calculateButton.textContent = "Рассчитать";
        }
      }
    }
  }
  
  showTemporarySuccess(calculateButton, "Пересчитано ✓");
}

function handleNotesChange(event) {
  const storageKey = getUserStorageKey(NOTES_KEY);
  localStorage.setItem(storageKey, event.currentTarget.value);
}

function restoreNotes() {
  const storageKey = getUserStorageKey(NOTES_KEY);
  const saved = localStorage.getItem(storageKey);
  if (saved !== null && notesArea) {
    notesArea.value = saved;
  }
}

function renderAll() {
  state = normaliseState(state);
  
  const derived = calculateDerived(state);
  lastDerived = derived;
  
  // Обновить расчетные значения логистики и монтажных работ в state
  if (derived.logisticsRub !== undefined) {
    state.logisticsRub = derived.logisticsRub;
  }
  if (derived.installationRub !== undefined) {
    state.installationRub = derived.installationRub;
  }
  
  syncSelectOptions();
  lastFinancialSnapshot = null;
  renderDerived(derived);
  renderWarnings(derived);
  renderComponents(derived);
  updateFootnote(derived);
  persistState();
}

function syncSelectOptions() {
  const selects = document.querySelectorAll("select[data-state-key]");
  selects.forEach((select) => {
    const key = select.dataset.stateKey;
    const providerId = select.dataset.options;
    if (!providerId || !key) return;

    const provider = optionProviders[providerId];
    const options = typeof provider === "function" ? provider(state) : [];
    const previousValue = state[key];

    if (!options.length) {
      select.innerHTML =
        '<option value="" disabled selected>Нет доступных вариантов</option>';
      select.disabled = true;
      return;
    }

    select.disabled = false;

    const optionsHtml = options
      .map(
        (option) =>
          `<option value="${String(option.value)}">${option.label}</option>`
      )
      .join("");
    select.innerHTML = optionsHtml;

    if (
      options.length &&
      !options.some(
        (option) => String(option.value) === String(previousValue)
      )
    ) {
      state = { ...state, [key]: options[0].value };
    }

    const nextValue = state[key];
    if (nextValue !== undefined) {
      select.value = String(nextValue);
    } else if (options.length) {
      select.value = String(options[0].value);
    }
  });

  const exchangeInput = document.querySelector(
    'input[data-state-key="exchangeRate"]'
  );
  if (exchangeInput) {
    // Форматировать курс с запятой для российского формата
    // Убедиться, что курс всегда установлен
    const currentRate = state.exchangeRate || EXCHANGE_RATE_DEFAULT;
    const rate = Number(currentRate).toFixed(2);
    const formattedRate = rate.replace('.', ',');
    // Принудительно установить значение поля (для readonly полей тоже работает)
    exchangeInput.value = formattedRate;
    exchangeInput.setAttribute('value', formattedRate);
    // Обновить состояние, если курс был пустым
    if (!state.exchangeRate || state.exchangeRate === 0) {
      state.exchangeRate = Number(rate);
      persistState();
    }
  }

  // siteWidth и siteHeight - обычные поля ввода
  ["siteWidth", "siteHeight"].forEach((key) => {
    const input = document.querySelector(`input[data-state-key="${key}"]`);
    if (input) {
      const value = state[key];
      input.value =
        value === undefined || value === null ? "" : String(value);
    }
  });

  // logisticsRub и installationRub - readonly поля, заполняются автоматически из расчетов
  // Обновляем их значения из последних расчетов, если они доступны
  if (lastDerived) {
    const logisticsInput = document.querySelector(`input[data-state-key="logisticsRub"]`);
    if (logisticsInput && lastDerived.logisticsRub !== undefined && lastDerived.logisticsRub > 0) {
      // Форматируем как число без форматирования денег (только цифры)
      logisticsInput.value = Math.round(lastDerived.logisticsRub).toString();
    }
    
    const installationInput = document.querySelector(`input[data-state-key="installationRub"]`);
    if (installationInput && lastDerived.installationRub !== undefined && lastDerived.installationRub > 0) {
      // Форматируем как число без форматирования денег (только цифры)
      installationInput.value = Math.round(lastDerived.installationRub).toString();
    }
  }
}

function calculateDerived(base) {
  const cabinet = cabinetById.get(base.cabinetId) ?? cabinetCatalog[0];
  const module = getModuleForCabinet(
    cabinet,
    base.moduleId,
    base.technology,
    base.execution
  );
  const warnings = [];
  const exchangeRate = clampNumber(base.exchangeRate) || EXCHANGE_RATE_DEFAULT;
  const logisticsRub = Math.max(0, clampNumber(base.logisticsRub));
  // Монтажные и сборочные работы рассчитываются автоматически: площадь экрана × 5440 руб.
  // Расчет будет выполнен после определения площади экрана
  const installationRub = 0; // Будет пересчитано ниже на основе площади экрана
  const vatRate = Number(base.vatRate ?? VAT_DEFAULT);
  const serviceKey = cabinet?.serviceTypes?.[0] ?? DEFAULT_SERVICE;
  const fastenerAccessory =
    FASTENER_BY_SERVICE[serviceKey] ?? ACCESSORIES.magnet;
  const signalKey = (module?.signal ?? "hub75").toLowerCase();
  const connectorAccessory =
    CONNECTOR_BY_SIGNAL[signalKey] ?? ACCESSORIES.connector;
  const ribbonAccessory =
    RIBBON_BY_SIGNAL[signalKey] ?? ACCESSORIES.ribbon;
  const receivingCard = pickReceivingCard(module);

  if (!module) {
    warnings.push("Не удалось подобрать модуль под выбранный кабинет.");
  }

  const siteWidth = clampNumber(base.siteWidth);
  const siteHeight = clampNumber(base.siteHeight);

  const cabinetsWidth = cabinet
    ? Math.max(1, Math.ceil(siteWidth / cabinet.cabinetWidth))
    : 1;
  const cabinetsHeight = cabinet
    ? Math.max(1, Math.ceil(siteHeight / cabinet.cabinetHeight))
    : 1;
  const cabinetsTotal = cabinetsWidth * cabinetsHeight;

  const screenWidthMm = cabinetsWidth * (cabinet?.cabinetWidth ?? 0);
  const screenHeightMm = cabinetsHeight * (cabinet?.cabinetHeight ?? 0);

  if (cabinet) {
    if (screenWidthMm !== siteWidth) {
      warnings.push(
        `Ширина скорректирована до ${format.integer(screenWidthMm)} мм (${cabinetsWidth} кабинетов).`
      );
    }
    if (screenHeightMm !== siteHeight) {
      warnings.push(
        `Высота скорректирована до ${format.integer(screenHeightMm)} мм (${cabinetsHeight} кабинетов).`
      );
    }
  }

  const modulesAcross =
    cabinet && module ? cabinet.cabinetWidth / module.moduleWidth : 0;
  const modulesDown =
    cabinet && module ? cabinet.cabinetHeight / module.moduleHeight : 0;

  if (
    module &&
    (!Number.isInteger(modulesAcross) || !Number.isInteger(modulesDown))
  ) {
    warnings.push(
      "Размер модуля не делит выбранный кабинет без остатка. Используется округление."
    );
  }

  const modulesPerCabinet =
    Math.max(1, Math.round(modulesAcross || 0)) *
    Math.max(1, Math.round(modulesDown || 0));
  const modulesTotal = cabinetsTotal * modulesPerCabinet;
  const modulesSpare = Math.ceil(
    modulesTotal * (FINANCE.moduleSparePercent / 100)
  );

  const magnetsPerCabinet =
    cabinet?.magnetsPerCabinet ??
    modulesPerCabinet * (module?.mountPoints ?? 12);
  const connectorsPerModule = cabinet?.connectorsPerModule ?? 1;
  const magnetsTotal = roundUp(
    cabinetsTotal * magnetsPerCabinet,
    fastenerAccessory.packSize ?? PACK_SIZE_MAGNET
  );
  const connectorsTotal = roundUp(
    (modulesTotal + modulesSpare) * connectorsPerModule,
    connectorAccessory.packSize ?? PACK_SIZE_CONNECTOR
  );
  const ribbonMetersPerCabinet =
    ((cabinet?.cabinetHeight ?? 0) / 1000) *
    connectorsPerModule *
    (1 + FINANCE.moduleSparePercent / 100);
  const ribbonMeters = ribbonMetersPerCabinet * cabinetsTotal;
  const ribbonSpools = Math.max(1, Math.ceil(ribbonMeters / 75));
  const ribbonTotal = ribbonSpools;

  const maxCurrentPerModule = module?.maxCurrent ?? 5;
  const maxCurrentPerCabinet = maxCurrentPerModule * modulesPerCabinet;
  const maxCurrentPerCabinetReserve = maxCurrentPerCabinet * 1.25;
  const psuModel = pickPsuModel(maxCurrentPerCabinetReserve);
  const psuPerCabinet = Math.max(
    1,
    Math.ceil(
      maxCurrentPerCabinetReserve / Math.max(psuModel.currentA ?? 60, 1)
    )
  );
  const psuTotal = psuPerCabinet * cabinetsTotal;
  const psuSpareTotal = Math.ceil(
    psuTotal * (FINANCE.psuSparePercent / 100)
  );

  const receiverCards = cabinetsTotal;
  const receiverCardsSpare = Math.ceil(
    receiverCards * (FINANCE.receiverSparePercent / 100)
  );
  const hubTotal = receivingCard?.requiresHub ? receiverCards : 0;
  const hubSpareTotal = receivingCard?.requiresHub ? receiverCardsSpare : 0;

  const cardsPerPort = cabinet?.cardsPerPort ?? FINANCE.cardsPerPortDefault;
  const portsNeeded = Math.max(
    1,
    Math.ceil(receiverCards / Math.max(cardsPerPort, 0.5))
  );

  const processor = pickProcessor(
    screenWidthMm && module
      ? Math.round(screenWidthMm / module.pixelPitch) *
        Math.round(screenHeightMm / module.pixelPitch)
      : 0,
    portsNeeded
  );
  const processorReservePorts = processor.maxPorts - portsNeeded;

  const patchCordsPerPort =
    cabinet?.patchCordsPerPort ?? FINANCE.patchCordsPerPort;
  const patchCordsTotal = Math.ceil(portsNeeded * patchCordsPerPort);

  const pixelWidth =
    module && module.pixelPitch
      ? Math.round(screenWidthMm / module.pixelPitch)
      : 0;
  const pixelHeight =
    module && module.pixelPitch
      ? Math.round(screenHeightMm / module.pixelPitch)
      : 0;
  const totalPixels = pixelWidth * pixelHeight;
  const aspectRatio = pixelHeight === 0 ? 0 : pixelWidth / pixelHeight;
  const aspectData = resolveAspect(aspectRatio);
  const areaSqM = (screenWidthMm / 1000) * (screenHeightMm / 1000);
  
  // Расчет стоимости металлоконструкции: площадь экрана * 5000 рублей
  const metalworkRub = areaSqM * 5000;
  const metalworkUsd = metalworkRub / exchangeRate;
  
  // Расчет стоимости монтажных и сборочных работ: площадь экрана * 5440 рублей
  const calculatedInstallationRub = areaSqM * 5440;
  const calculatedInstallationUsd = calculatedInstallationRub / exchangeRate;

  const avgPowerPerSqM = module?.avgPowerPerSqm ?? 150;
  const maxPowerPerSqM = module?.maxPowerPerSqm ?? avgPowerPerSqM * 2;
  
  // Исправление: общая мощность = общая площадь экрана * мощность на м²
  // areaSqM уже является общей площадью всего экрана, не нужно умножать на количество кабинетов
  const powerTotal = areaSqM * maxPowerPerSqM;
  const powerWithReserve =
    powerTotal * (1 + FINANCE.powerReservePercent / 100);
  const powerKilowatt = powerWithReserve / 1000;
  const current230V = powerWithReserve / 230;

  // Расчет веса экрана
  const cabinetWeightKg = cabinetWeightById.get(base.cabinetId) ?? 0;
  const moduleWeightKg = module?.weightKg ?? 0;
  const cabinetsWeightKg = cabinetsTotal * cabinetWeightKg;
  const modulesWeightKg = modulesTotal * moduleWeightKg;
  // Приблизительный вес дополнительного оборудования (блоки питания, контроллеры, кабели)
  // Блок питания: ~0.5-1 кг, контроллер: ~0.1-0.3 кг, кабели и разъемы: ~0.2-0.5 кг на кабинет
  const psuWeightKg = psuTotal * 0.7; // Средний вес блока питания ~0.7 кг
  const receiverCardsWeightKg = receiverCards * 0.2; // Средний вес контроллера ~0.2 кг
  const accessoriesWeightKg = cabinetsTotal * 0.3; // Кабели, разъемы и прочее ~0.3 кг на кабинет
  const additionalEquipmentWeightKg = psuWeightKg + receiverCardsWeightKg + accessoriesWeightKg;
  const totalWeightKg = cabinetsWeightKg + modulesWeightKg + additionalEquipmentWeightKg;

  return {
    ...base,
    exchangeRate,
    logisticsRub,
    installationRub: calculatedInstallationRub, // Используем расчетное значение
    installationUsd: calculatedInstallationUsd,
    vatRate,
    requestedWidthMm: siteWidth,
    requestedHeightMm: siteHeight,
    executionLabel: STATIC_LABELS.execution[base.execution] ?? base.execution,
    serviceLabel:
      STATIC_LABELS.service[base.serviceType] ?? base.serviceType,
    technologyLabel:
      STATIC_LABELS.technology[base.technology] ?? base.technology,
    cabinet,
    module,
    warnings,
    cabinetsWidth,
    cabinetsHeight,
    cabinetsTotal,
    screenWidthMm,
    screenHeightMm,
    modulesPerCabinet,
    modulesTotal,
    modulesSpare,
    magnetsTotal,
    connectorsTotal,
    ribbonTotal,
    psuTotal,
    psuSpareTotal,
    receiverCards,
    receiverCardsSpare,
    pixelWidth,
    pixelHeight,
    totalPixels,
    aspectRatio,
    aspectLabel: `${format.ratio(aspectRatio)} (${aspectData.label})`,
    aspectDelta: aspectData.delta,
    aspectMatch: aspectData.matchText,
    areaSqM,
    metalworkRub,
    metalworkUsd,
    installationUsd: calculatedInstallationUsd,
    cabinetsWeightKg,
    modulesWeightKg,
    additionalEquipmentWeightKg,
    totalWeightKg,
    portsNeeded,
    processor,
    processorReservePorts,
    patchCordsPerPort,
    patchCordsTotal,
    powerTotal,
    powerWithReserve,
    powerKilowatt,
    current230V,
    fastenerAccessory,
    connectorAccessory,
    ribbonAccessory,
    ribbonMeters,
    ribbonSpools,
    psuModel,
    psuPerCabinet,
    receivingCard,
    hubTotal,
    hubSpareTotal,
  };
}

function renderDerived(derived) {
  if (!derivedGrid || !derivedTemplate) return;
  derivedGrid.innerHTML = "";

  const items = [
    {
      label: "Исполнение",
      value: derived.executionLabel,
      sub: `${derived.technologyLabel} · ${derived.serviceLabel}`,
    },
    {
      label: "Кабинетов (Ш×В)",
      value: `${format.integer(derived.cabinetsWidth)} × ${format.integer(
        derived.cabinetsHeight
      )}`,
      sub: `Итого ${format.integer(derived.cabinetsTotal)} шт.`,
    },
    {
      label: "Габариты экрана",
      value: `${format.integer(derived.screenWidthMm)} × ${format.integer(
        derived.screenHeightMm
      )} мм`,
      sub: `${format.decimal(derived.areaSqM, 2)} м²`,
    },
    {
      label: "Шаг и яркость",
      value: derived.module
        ? `${derived.module.pixelPitch.toFixed(2)} мм`
        : "—",
      sub: derived.module
        ? `${format.integer(derived.module.brightness)} нит`
        : "",
    },
    {
      label: "Разрешение",
      value: `${format.integer(derived.pixelWidth)} × ${format.integer(
        derived.pixelHeight
      )}`,
      sub: `${derived.aspectLabel}`,
    },
    {
      label: "Контроллер",
      value: derived.processor.name,
      sub: `Портов ${format.integer(derived.portsNeeded)} / ${format.integer(
        derived.processor.maxPorts
      )}`,
    },
    {
      label: "Модули",
      value: `${format.integer(derived.modulesTotal)} шт.`,
      sub: `ЗИП ${format.integer(derived.modulesSpare)} шт.`,
    },
    {
      label: "Энергопотребление",
      value: `${format.decimal(derived.powerKilowatt, 2)} кВт`,
      sub: `Ток ≈ ${format.decimal(derived.current230V, 2)} А`,
    },
    {
      label: "Вес экрана",
      value: `${format.decimal(derived.totalWeightKg, 2)} кг`,
      sub: `Кабинеты: ${format.decimal(derived.cabinetsWeightKg, 2)} кг · Модули: ${format.decimal(derived.modulesWeightKg, 2)} кг · Доп. оборудование: ${format.decimal(derived.additionalEquipmentWeightKg, 2)} кг`,
    },
  ];

  // Добавляем поля стоимости, если они больше 0
  if (derived.metalworkRub > 0) {
    items.push({
      label: "Металлоконструкция",
      value: format.moneyRub(derived.metalworkRub),
      sub: `${format.decimal(derived.areaSqM, 2)} м² × 5 000 руб.`,
    });
  }

  if (derived.installationRub > 0) {
    items.push({
      label: "Монтажные и сборочные работы",
      value: format.moneyRub(derived.installationRub),
      sub: `${format.decimal(derived.areaSqM, 2)} м² × 5 440 руб.`,
    });
  }

  if (derived.logisticsRub > 0) {
    items.push({
      label: "Логистика",
      value: format.moneyRub(derived.logisticsRub),
      sub: "Задано пользователем",
    });
  }

  items.forEach((item) => {
    const node = derivedTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".derived-label").textContent = item.label;
    node.querySelector(".derived-value").textContent = item.value;
    node.querySelector(".derived-sub").textContent = item.sub;
    derivedGrid.appendChild(node);
  });
}

function renderWarnings(derived) {
  if (!warningsContainer) return;
  warningsContainer.innerHTML = "";

  derived.warnings.forEach((message) => {
    const div = document.createElement("div");
    div.className = "warning";
    div.textContent = message;
    warningsContainer.appendChild(div);
  });
}

function composeComponentRows(derived) {
  const baseRows = componentCatalog
    .map((item) => {
      const quantity = clampNumber(
        typeof item.calc === "function" ? item.calc(derived) : item.calc
      );
      if (quantity <= 0) return null;

      const label =
        typeof item.label === "function" ? item.label(derived) : item.label;
      const description =
        typeof item.description === "function"
          ? item.description(derived)
          : item.description ?? "";
      let priceUsd =
        typeof item.priceUsd === "function"
          ? item.priceUsd(derived)
          : item.priceUsd ?? 0;
      let priceRub =
        typeof item.priceRub === "function"
          ? item.priceRub(derived)
          : item.priceRub ?? 0;

      if (!priceRub) {
        priceRub = priceUsd * derived.exchangeRate;
      }
      if (!priceUsd && priceRub) {
        priceUsd = priceRub / derived.exchangeRate;
      }

      const totalUsd = priceUsd * quantity;
      const totalRub = priceRub * quantity;

      return {
        label,
        description,
        priceUsd,
        priceRub,
        quantity,
        totalUsd,
        totalRub,
      };
    })
    .filter(Boolean);

  const baseTotals = baseRows.reduce(
    (acc, row) => ({
      usd: acc.usd + row.totalUsd,
      rub: acc.rub + row.totalRub,
      qty: acc.qty + row.quantity,
    }),
    { usd: 0, rub: 0, qty: 0 }
  );

  const rows = [...baseRows];
  const logisticsRub = derived.logisticsRub ?? 0;
  const logisticsUsd = logisticsRub / derived.exchangeRate;
  if (logisticsRub > 0) {
    rows.push({
      label: "Логистика",
      description: "Транспортные и сопутствующие расходы",
      priceUsd: logisticsUsd,
      priceRub: logisticsRub,
      quantity: 1,
      totalUsd: logisticsUsd,
      totalRub: logisticsRub,
    });
  }

  const installationRub = derived.installationRub ?? 0;
  const installationUsd = derived.installationUsd ?? (installationRub / derived.exchangeRate);
  const installationAreaSqM = derived.areaSqM ?? 0;
  if (installationRub > 0 && installationAreaSqM > 0) {
    rows.push({
      label: "Монтажные и сборочные работы",
      description: `Площадь экрана ${format.decimal(installationAreaSqM, 2)} м² × 5 440 руб.`,
      priceUsd: installationUsd,
      priceRub: installationRub,
      quantity: 1,
      totalUsd: installationUsd,
      totalRub: installationRub,
    });
  }

  // Металлоконструкция рассчитывается автоматически: площадь экрана * 5000 рублей
  const metalworkRub = derived.metalworkRub ?? 0;
  const metalworkUsd = derived.metalworkUsd ?? 0;
  const metalworkAreaSqM = derived.areaSqM ?? 0;
  // Всегда показывать металлоконструкцию, если площадь экрана известна
  if (metalworkAreaSqM > 0 && metalworkRub > 0) {
    rows.push({
      label: "Металлоконструкция",
      description: `Площадь экрана ${format.decimal(metalworkAreaSqM, 2)} м² × 5 000 руб.`,
      priceUsd: metalworkUsd,
      priceRub: metalworkRub,
      quantity: 1,
      totalUsd: metalworkUsd,
      totalRub: metalworkRub,
    });
  }

  // Сумма без НДС (базовая стоимость + логистика + монтаж + металлоконструкция)
  const subtotalRub = baseTotals.rub + logisticsRub + installationRub + metalworkRub;
  const subtotalUsd = baseTotals.usd + logisticsUsd + installationUsd + metalworkUsd;

  // НДС считается сверху от суммы без НДС
  const vatRub =
    derived.vatRate > 0 ? subtotalRub * derived.vatRate : 0;
  const vatUsd = vatRub / derived.exchangeRate;
  
  // Итоговая сумма = сумма без НДС + НДС сверху
  const grandRub = subtotalRub + vatRub;
  const grandUsd = subtotalUsd + vatUsd;

  // НДС выделяется отдельной строкой после всех остальных пунктов
  if (vatRub > 0) {
    rows.push({
      label: `НДС ${format.percent(derived.vatRate * 100)}`,
      description: "Налог на добавленную стоимость (сверху)",
      priceUsd: vatUsd,
      priceRub: vatRub,
      quantity: 1,
      totalUsd: vatUsd,
      totalRub: vatRub,
    });
  }

  return {
    rows,
    baseQuantity: baseTotals.qty,
    totals: {
      base: baseTotals,
      logistic: { rub: logisticsRub, usd: logisticsUsd },
      installation: { rub: installationRub, usd: installationUsd },
      metalwork: { rub: metalworkRub, usd: metalworkUsd },
      vat: { rub: vatRub, usd: vatUsd, rate: derived.vatRate },
      subtotal: { rub: subtotalRub, usd: subtotalUsd },
      grand: { rub: grandRub, usd: grandUsd },
    },
  };
}

function ensureFinancialSnapshot(derived) {
  if (lastFinancialSnapshot) {
    return lastFinancialSnapshot;
  }
  const snapshot = composeComponentRows(derived);
  lastFinancialSnapshot = snapshot;
  return snapshot;
}

function renderComponents(derived) {
  if (!tableBody) return;

  const snapshot = composeComponentRows(derived);
  lastFinancialSnapshot = snapshot;

  window.__rowsCount = snapshot.rows.length;
  window.__rowsData = snapshot.rows;

  tableBody.innerHTML = snapshot.rows
    .map(
      (row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${row.label}</td>
          <td>${row.description ?? ""}</td>
          <td>${format.moneyUsd(row.priceUsd)}</td>
          <td>${format.moneyRub(row.priceRub)}</td>
          <td>${format.integer(row.quantity)}</td>
          <td>${format.moneyRub(row.totalRub)}</td>
        </tr>
      `
    )
    .join("");

  totalUsdCell.textContent = format.moneyUsd(snapshot.totals.grand.usd);
  totalRubCell.textContent = format.moneyRub(snapshot.totals.grand.rub);
  totalQtyCell.textContent = format.integer(snapshot.baseQuantity);
  totalRubCell.dataset.calculatedTotalRub = snapshot.totals.grand.rub;
  totalUsdCell.dataset.calculatedTotalUsd = snapshot.totals.grand.usd;
}

function updateFootnote(derived) {
  if (!footnoteCell) return;
  const snapshot = ensureFinancialSnapshot(derived);
  const noteParts = [
    `ИТОГО входная стоимость, руб.: ${format.moneyRub(
      snapshot.totals.grand.rub
    )}`,
    `курс ${derived.exchangeRate.toFixed(2)} ₽/$`,
  ];
  if (snapshot.totals.logistic.rub > 0) {
    noteParts.push(
      `включая логистику ${format.moneyRub(snapshot.totals.logistic.rub)}`
    );
  }
  if (snapshot.totals.installation?.rub > 0) {
    noteParts.push(
      `включая монтаж ${format.moneyRub(snapshot.totals.installation.rub)}`
    );
  }
  if (snapshot.totals.metalwork?.rub > 0) {
    noteParts.push(
      `включая металлоконструкцию ${format.moneyRub(snapshot.totals.metalwork.rub)}`
    );
  }
  if (snapshot.totals.vat.rub > 0) {
    noteParts.push(
      `НДС ${format.percent(snapshot.totals.vat.rate * 100)} (сверху) · ${format.moneyRub(
        snapshot.totals.vat.rub
      )}`
    );
  } else {
    noteParts.push("НДС не включён");
  }
  footnoteCell.textContent = noteParts.join(" · ");
}

function pickProcessor(totalPixels, portsNeeded) {
  const candidate =
    processors.find(
      (item) =>
        totalPixels <= item.maxPixels && portsNeeded <= item.maxPorts
    ) ?? processors[processors.length - 1];
  return candidate;
}

function resolveAspect(aspect) {
  if (!Number.isFinite(aspect) || aspect === 0) {
    return { label: "—", delta: 1, matchText: "Н/Д" };
  }

  const standards = [
    { label: "16:9", value: 16 / 9 },
    { label: "4:3", value: 4 / 3 },
    { label: "3:2", value: 3 / 2 },
    { label: "1:1", value: 1 },
    { label: "21:9", value: 21 / 9 },
    { label: "9:16", value: 9 / 16 },
  ];

  let closest = standards[0];
  let delta = Math.abs(aspect - closest.value) / closest.value;

  standards.slice(1).forEach((standard) => {
    const currentDelta = Math.abs(aspect - standard.value) / standard.value;
    if (currentDelta < delta) {
      closest = standard;
      delta = currentDelta;
    }
  });

  const matchText = delta <= 0.015 ? "Совпадает" : "С масштабированием";
  return { label: closest.label, delta, matchText };
}

function exportToCsv() {
  const rows = Array.from(
    document.querySelectorAll("#components-table tbody tr")
  );
  if (!rows.length) return;

  const header = [
    "№",
    "Модель",
    "Описание",
    "Цена, $",
    "Цена, руб.",
    "Кол-во",
    "Сумма, руб.",
  ];

  const csvRows = [
    header.join(";"),
    ...rows.map((row) =>
      Array.from(row.cells)
        .map((cell) => csvEscape(cell.textContent))
        .join(";")
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `led-calculator-${state.currentDate}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function copySummaryToClipboard() {
  const derived = lastDerived ?? calculateDerived(state);
  const snapshot = ensureFinancialSnapshot(derived);

  const lines = buildSummaryLines(derived, snapshot.totals);

  navigator.clipboard
    .writeText(lines.join("\n"))
    .then(() => {
      showTemporarySuccess(copySummaryButton, "Скопировано ✓");
    })
    .catch(() => {
      showTemporarySuccess(copySummaryButton, "Ошибка копирования", true);
    });
}

async function exportToWord() {
  const derived = lastDerived ?? calculateDerived(state);
  const snapshot = composeComponentRows(derived);
  lastFinancialSnapshot = snapshot;
  const logoSrc = await getLogoDataUrl();
  const documentHtml = buildWordDocument(derived, snapshot, logoSrc, {
    date: derived.currentDate ?? state.currentDate,
  });
  downloadWordDocument(
    documentHtml,
    `СМЕТА-${derived.currentDate ?? state.currentDate}.doc`,
    exportWordButton
  );
}

async function exportToPdf() {
  try {
    const derived = lastDerived ?? calculateDerived(state);
    const snapshot = composeComponentRows(derived);
    lastFinancialSnapshot = snapshot;
    const logoSrc = await getLogoDataUrl();
    const documentHtml = buildPdfDocument(derived, snapshot, logoSrc, {
      date: derived.currentDate ?? state.currentDate,
    });
    openPrintPreview(documentHtml, exportPdfButton, "PDF открыт ✓");
  } catch (error) {
    console.error("PDF export failed", error);
    showTemporarySuccess(exportPdfButton, "Ошибка экспорта", true);
  }
}

function showTemporarySuccess(button, message, isError = false) {
  if (!button) return;
  const original = button.textContent;
  button.textContent = message;
  button.style.borderColor = isError ? "var(--danger)" : "var(--accent)";
  button.style.color = isError ? "var(--danger)" : "var(--accent)";
  setTimeout(() => {
    button.textContent = original;
    button.style.borderColor = "";
    button.style.color = "";
  }, 1800);
}

function buildSummaryLines(derived, totals) {
  const documentDate = derived.currentDate ?? state.currentDate;
  return [
    `Дата расчёта: ${documentDate}`,
    ...composeSummaryItems(derived, totals),
  ];
}

function composeSummaryItems(derived, totals) {
  const items = [
    `${APP_NAME} — ${derived.executionLabel}`,
    `Технология: ${derived.technologyLabel} · Обслуживание: ${derived.serviceLabel}`,
    `Кабинет: ${derived.cabinet?.label ?? "—"}`,
    derived.organisation
      ? `Организация: ${derived.organisation}`
      : null,
    derived.taxId ? `ИНН: ${derived.taxId}` : null,
    `Шаг пикселя: ${
      derived.module ? derived.module.pixelPitch.toFixed(2) : "—"
    } мм`,
    `Размеры (итого): ${format.decimal(
      derived.screenWidthMm / 1000,
      2
    )} × ${format.decimal(derived.screenHeightMm / 1000, 2)} м (${format.decimal(
      derived.areaSqM,
      2
    )} м²)`,
    `Разрешение: ${format.integer(derived.pixelWidth)} × ${format.integer(
      derived.pixelHeight
    )} (${derived.aspectLabel})`,
    `Контроллер: ${derived.processor.name} (${format.integer(
      derived.portsNeeded
    )} портов)`,
    `Энергопотребление: ${format.decimal(derived.powerKilowatt, 2)} кВт (ток ≈ ${format.decimal(derived.current230V, 2)} А)`,
    `Вес экрана: ${format.decimal(derived.totalWeightKg, 2)} кг (кабинеты: ${format.decimal(derived.cabinetsWeightKg, 2)} кг, модули: ${format.decimal(derived.modulesWeightKg, 2)} кг, доп. оборудование: ${format.decimal(derived.additionalEquipmentWeightKg, 2)} кг)`,
    `Общая стоимость: ${format.moneyRub(totals.grand.rub)} (${format.moneyUsd(
      totals.grand.usd
    )})`,
  ];

  if (totals.logistic?.rub > 0) {
    items.push(`Логистика: ${format.moneyRub(totals.logistic.rub)}`);
  }
  if (totals.installation?.rub > 0) {
    items.push(`Монтажные и сборочные работы: ${format.moneyRub(totals.installation.rub)}`);
  }
  if (totals.metalwork?.rub > 0) {
    items.push(`Металлоконструкция: ${format.moneyRub(totals.metalwork.rub)}`);
  }
  if (totals.vat?.rub > 0) {
    items.push(
      `НДС ${format.percent(totals.vat.rate * 100)} (сверху): ${format.moneyRub(
        totals.vat.rub
      )}`
    );
  }

  items.push(`Курс: ${derived.exchangeRate.toFixed(2)} ₽/$`);
  return items.filter(Boolean);
}

function buildSpecificationTableSections(snapshot) {
  const headerHtml = `
    <tr>
      <th style="width:5%;">№</th>
      <th style="width:18%;">Модель</th>
      <th style="width:32%;">Описание</th>
      <th style="width:10%;">Цена, $</th>
      <th style="width:12%;">Цена, ₽</th>
      <th style="width:8%;">Кол-во</th>
      <th style="width:15%;">Сумма, ₽</th>
    </tr>`;
  const rowsHtml = snapshot.rows
    .map(
      (row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.label)}</td>
          <td>${escapeHtml(row.description ?? "")}</td>
          <td>${escapeHtml(format.moneyUsd(row.priceUsd))}</td>
          <td>${escapeHtml(format.moneyRub(row.priceRub))}</td>
          <td>${escapeHtml(format.integer(row.quantity))}</td>
          <td>${escapeHtml(format.moneyRub(row.totalRub))}</td>
        </tr>`
    )
    .join("");
  return { headerHtml, rowsHtml };
}

function composeTotalsLines(totals, exchangeRate) {
  const lines = [
    `Итого: ${format.moneyRub(totals.grand.rub)} (${format.moneyUsd(
      totals.grand.usd
    )})`,
  ];
  if (totals.logistic?.rub > 0) {
    lines.push(`Логистика: ${format.moneyRub(totals.logistic.rub)}`);
  }
  if (totals.installation?.rub > 0) {
    lines.push(`Монтажные и сборочные работы: ${format.moneyRub(totals.installation.rub)}`);
  }
  if (totals.metalwork?.rub > 0) {
    lines.push(`Металлоконструкция: ${format.moneyRub(totals.metalwork.rub)}`);
  }
  if (totals.subtotal?.rub > 0) {
    lines.push(`Сумма без НДС: ${format.moneyRub(totals.subtotal.rub)}`);
  }
  if (totals.vat?.rub > 0) {
    lines.push(
      `НДС ${format.percent(totals.vat.rate * 100)} (сверху): ${format.moneyRub(
        totals.vat.rub
      )}`
    );
  }
  lines.push(`Курс: ${exchangeRate.toFixed(2)} ₽/$`);
  return lines;
}

function isCabinetAllowedForState(cabinet, currentState) {
  if (!cabinet) return false;
  const allowedSet = getCabinetSetForState(
    currentState.execution,
    currentState.serviceType
  );
  if (allowedSet) {
    return allowedSet.has(cabinet.id);
  }
  if (cabinet.execution && cabinet.execution !== currentState.execution) {
    return false;
  }
  return true;
}

function getServiceOptions(currentState) {
  if (currentState.execution === "internal") {
    const options = ["front", "rear"]
      .map((service) => {
        const allowedSet = getIndoorCabinetSet(service);
        const hasCabinet = cabinetCatalog.some(
          (cabinet) =>
            allowedSet.has(cabinet.id) &&
            cabinet.technologies.includes(currentState.technology)
        );
        return {
          value: service,
          label: STATIC_LABELS.service[service],
          available: hasCabinet,
        };
      })
      .filter((option) => option.available);
    return options.length
      ? options
      : [
          {
            value: "front",
            label: STATIC_LABELS.service.front,
          },
        ];
  }

  const rawOptions = ["front", "rear"]
    .map((service) => ({
      value: service,
      label: STATIC_LABELS.service[service],
      available: cabinetCatalog.some(
        (cabinet) =>
          (!cabinet.execution || cabinet.execution === currentState.execution) &&
          cabinet.serviceTypes.includes(service) &&
          cabinet.technologies.includes(currentState.technology)
      ),
    }))
    .filter((option) => option.available);

  if (rawOptions.length) {
    return rawOptions;
  }

  return ["front", "rear"].map((service) => ({
    value: service,
    label: STATIC_LABELS.service[service],
  }));
}

function getCabinetOptions(currentState) {
  return cabinetCatalog
    .filter(
      (cabinet) =>
        isCabinetAllowedForState(cabinet, currentState) &&
        cabinet.serviceTypes.includes(currentState.serviceType) &&
        cabinet.technologies.includes(currentState.technology)
    )
    .map((cabinet) => ({
      value: cabinet.id,
      label: cabinet.label,
    }));
}

function getModuleForCabinet(cabinet, moduleId, technology, execution) {
  if (!cabinet) return undefined;
  const compatible = getCompatibleModules(cabinet, technology, execution);
  if (!compatible.length) return undefined;
  const preferred = compatible.find((module) => module.id === moduleId);
  return preferred ?? compatible[0];
}

function getPixelPitchOptions(currentState) {
  const cabinet = cabinetById.get(currentState.cabinetId);
  if (!cabinet) return [];
  return getCompatibleModules(
    cabinet,
    currentState.technology,
    currentState.execution
  ).map((module) => ({
    value: module.id,
    label: `${module.pixelPitch.toFixed(2)} мм — ${module.label}`,
  }));
}

function getSiteSizeOptions(currentState, axis) {
  const cabinet = cabinetById.get(currentState.cabinetId);
  if (!cabinet) return [];

  const dimension =
    axis === "width" ? cabinet.cabinetWidth : cabinet.cabinetHeight;
  const maxUnits =
    axis === "width" ? cabinet.maxUnits.width : cabinet.maxUnits.height;

  return Array.from({ length: maxUnits }, (_, index) => index + 1).map(
    (count) => ({
      value: dimension * count,
      label: `${format.integer(dimension * count)} мм (${count} каб.)`,
    })
  );
}

function clampNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundUp(value, step) {
  const base = clampNumber(step);
  if (!base || base <= 1) return Math.ceil(value);
  return Math.ceil(value / base) * base;
}

function csvEscape(value) {
  const normalized = value.replace(/\r?\n|\r/g, " ").trim();
  if (/[;"\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function getLogoDataUrl() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch("logo.png")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Logo not found");
        }
        return response.blob();
      })
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("Logo decode error"));
            reader.readAsDataURL(blob);
          })
      )
      .catch(() => "");
  }
  return logoDataUrlPromise;
}

function buildWordDocument(derived, snapshot, logoSrc, meta = {}) {
  const summaryItems = composeSummaryItems(derived, snapshot.totals)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  const { headerHtml, rowsHtml } = buildSpecificationTableSections(snapshot);
  const totalsLines = composeTotalsLines(
    snapshot.totals,
    derived.exchangeRate
  );
  const documentDate = meta.date ?? derived.currentDate ?? state.currentDate;

  return `
  <!DOCTYPE html>
  <html lang="ru">
    <head>
      <meta charset="utf-8" />
      <title>СМЕТА — ${escapeHtml(APP_NAME)}</title>
      <style>
        @page { margin: 1cm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 1cm; }
        .doc-header { display: flex; align-items: center; gap: 24px; margin-bottom: 32px; }
        .doc-header img { max-height: 90px; }
        .doc-title { font-size: 32px; font-weight: 700; letter-spacing: 0.04em; margin: 0; text-transform: uppercase; }
        .doc-subtitle { margin: 6px 0 0; font-size: 16px; color: #475569; }
        .doc-date { margin-top: 4px; font-size: 14px; color: #475569; }
        h2 { margin-top: 28px; font-size: 20px; }
        ul { padding-left: 20px; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; table-layout: fixed; }
        th, td { border: 1px solid #cbd5f5; padding: 8px 10px; font-size: 13px; vertical-align: top; word-break: break-word; }
        th { background: #e7efff; text-align: left; }
        .note { margin-top: 16px; font-size: 14px; color: #475569; line-height: 1.4; }
      </style>
    </head>
    <body>
      <div class="doc-header">
        ${logoSrc ? `<img src="${logoSrc}" alt="Логотип" />` : ""}
        <div>
          <p class="doc-title">СМЕТА</p>
          <p class="doc-subtitle">${escapeHtml(APP_NAME)}</p>
          <p class="doc-date">Дата расчёта: ${escapeHtml(documentDate)}</p>
        </div>
      </div>
      <h2>Основные параметры</h2>
      <ul>${summaryItems}</ul>
      <h2>Спецификация</h2>
      <table>
        <thead>${headerHtml}</thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="note">${totalsLines.map(escapeHtml).join("<br>")}</div>
    </body>
  </html>
  `;
}

function buildPdfDocument(derived, snapshot, logoSrc, meta = {}) {
  const summaryHtml = composeSummaryItems(derived, snapshot.totals)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  const { headerHtml, rowsHtml } = buildSpecificationTableSections(snapshot);
  const totalsLines = composeTotalsLines(
    snapshot.totals,
    derived.exchangeRate
  );
  const documentDate = meta.date ?? derived.currentDate ?? state.currentDate;

  return `
  <!DOCTYPE html>
  <html lang="ru">
    <head>
      <meta charset="utf-8" />
      <title>PDF — ${escapeHtml(APP_NAME)}</title>
      <style>
        @page { size: A4 portrait; margin: 1cm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 1cm; }
        .doc-header { display: flex; align-items: center; gap: 24px; margin-bottom: 28px; }
        .doc-header img { max-height: 90px; }
        .doc-title { font-size: 30px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
        .doc-subtitle { margin: 6px 0 0; font-size: 16px; color: #475569; }
        .doc-date { margin-top: 4px; font-size: 14px; color: #475569; }
        h2 { margin-top: 26px; font-size: 19px; }
        ul { padding-left: 20px; line-height: 1.45; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; table-layout: fixed; }
        th, td { border: 1px solid #cbd5f5; padding: 7px 9px; font-size: 12.5px; vertical-align: top; word-break: break-word; }
        th { background: #e7efff; text-align: left; }
        .note { margin-top: 14px; font-size: 13px; color: #475569; line-height: 1.4; }
      </style>
    </head>
    <body>
      <div class="doc-header">
        ${logoSrc ? `<img src="${logoSrc}" alt="Логотип" />` : ""}
        <div>
          <p class="doc-title">СМЕТА</p>
          <p class="doc-subtitle">${escapeHtml(APP_NAME)}</p>
          <p class="doc-date">Дата расчёта: ${escapeHtml(documentDate)}</p>
        </div>
      </div>
      <h2>Основные параметры</h2>
      <ul>${summaryHtml}</ul>
      <h2>Спецификация</h2>
      <table>
        <thead>${headerHtml}</thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="note">${totalsLines.map(escapeHtml).join("<br>")}</div>
    </body>
  </html>
  `;
}

function downloadWordDocument(documentHtml, filename, button) {
  const blob = new Blob(["\ufeff", documentHtml], {
    type: "application/msword",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  if (button) {
    showTemporarySuccess(button, "WORD сохранён ✓");
  }
}

function openPrintPreview(documentHtml, button, successMessage = "Готово") {
  const pdfWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!pdfWindow) {
    showTemporarySuccess(button, "Разрешите всплывающие окна", true);
    return;
  }

  pdfWindow.document.open();
  pdfWindow.document.write(documentHtml);
  pdfWindow.document.close();

  // Ждём загрузки содержимого перед открытием печати
  setTimeout(() => {
    try {
      pdfWindow.focus();
      pdfWindow.print();
      showTemporarySuccess(button, successMessage);
    } catch (error) {
      console.error("Print preview error:", error);
      showTemporarySuccess(button, "Ошибка открытия печати", true);
    }
  }, 500);
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function ensureAdminAccount() {
  const users = loadUsers();
  if (!users.some((user) => user.id === "admin")) {
    users.push({
      id: "admin",
      name: "Системный администратор",
      email: "admin",
      password: "admin",
      isAdmin: true,
    });
    saveUsers(users);
  }
}

function loadActiveUser() {
  const activeId = localStorage.getItem(ACTIVE_USER_KEY);
  if (!activeId) return null;
  const users = loadUsers();
  return users.find((user) => user.id === activeId) ?? null;
}

function setActiveUser(user) {
  if (!user) {
    localStorage.removeItem(ACTIVE_USER_KEY);
    currentUser = null;
    // Загрузить данные по умолчанию
    state = normaliseState(loadState());
    restoreNotes();
    renderAll();
    return;
  }
  localStorage.setItem(ACTIVE_USER_KEY, user.id);
  currentUser = user;
  // Загрузить данные пользователя
  state = normaliseState(loadState());
  restoreNotes();
  renderAll();
  // Загрузить данные с сервера если доступны
  loadUserDataFromFile();
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function createHistoryEntry(userId, derived, snapshot) {
  const totals = snapshot.totals?.grand ?? { rub: 0, usd: 0 };
  return {
    id: generateId(),
    userId,
    savedAt: Date.now(),
    title: derived.organisation
      ? derived.organisation
      : `Расчёт ${new Date().toLocaleDateString("ru-RU")}`,
    organisation: derived.organisation ?? "",
    taxId: derived.taxId ?? "",
    totals,
    summary: composeSummaryItems(derived, snapshot.totals),
    state: JSON.parse(JSON.stringify(state)),
  };
}

function addHistoryEntry(userId, derived, snapshot) {
  const history = loadHistory();
  const entry = createHistoryEntry(userId, derived, snapshot);
  const list = history[userId] ?? [];
  history[userId] = [entry, ...list].slice(0, 50);
  saveHistory(history);
  return entry;
}

function renderAccountSection() {
  if (!authFormsWrapper) return;
  if (!currentUser) {
    authFormsWrapper.hidden = false;
    userArea?.setAttribute("hidden", "hidden");
    if (openHistoryButton && !isHistoryView) {
      openHistoryButton.setAttribute("hidden", "hidden");
    }
    historySummaryButton?.setAttribute("hidden", "hidden");
    if (userHistoryContainer) {
      userHistoryContainer.innerHTML = "";
      userHistoryContainer.classList.add("empty");
      userHistoryContainer.textContent = "Нет сохранённых расчётов";
    }
    if (adminPanel) {
      adminPanel.hidden = true;
    }
    return;
  }

  authFormsWrapper.hidden = true;
  if (userArea) {
    userArea.hidden = false;
    const roleSuffix = currentUser.isAdmin ? " · Администратор" : "";
    if (userNameLabel) {
      userNameLabel.textContent = `${currentUser.name}${roleSuffix}`;
    }
    if (userEmailLabel) {
      userEmailLabel.textContent = currentUser.email;
    }
  }

  if (!isHistoryView) {
    openHistoryButton?.removeAttribute("hidden");
  } else {
    openHistoryButton?.setAttribute("hidden", "hidden");
  }
  renderHistoryLists();
  renderAdminPanel();
}

function renderHistoryLists() {
  if (!currentUser || !userHistoryContainer) return;
  const history = loadHistory();
  renderHistoryList(userHistoryContainer, history[currentUser.id] ?? [], {
    showOwner: false,
    allowLoad: true,
    userId: currentUser.id,
  });
}

function renderAdminPanel() {
  if (!adminPanel) return;
  if (!currentUser?.isAdmin) {
    adminPanel.hidden = true;
    historySummaryButton?.setAttribute("hidden", "hidden");
    adminSelectedUserId = null;
    return;
  }

  adminPanel.hidden = false;
  historySummaryButton?.removeAttribute("hidden");

  const history = loadHistory();
  const users = loadUsers();
  if (!adminSelectedUserId && users.length) {
    adminSelectedUserId = users[0].id;
  }

  renderAdminUsers(users, history);
  renderAdminUserDetail(users, history);
}

function renderAdminUsers(users, history) {
  if (!adminUserList) return;
  if (!users.length) {
    adminUserList.innerHTML = "";
    adminUserList.classList.add("empty");
    adminUserList.textContent = "Нет пользователей";
    return;
  }

  adminUserList.classList.remove("empty");
  adminUserList.innerHTML = users
    .map((user) => {
      const entriesCount = history[user.id]?.length ?? 0;
      const activeClass = user.id === adminSelectedUserId ? "active" : "";
      return `
        <div class="history-entry admin-user-entry ${activeClass}">
          <h4>${escapeHtml(user.name ?? "Без имени")}</h4>
          <p>${escapeHtml(user.email ?? "")}</p>
          <p>Расчётов: ${entriesCount}</p>
          <div class="entry-actions">
            <button type="button" class="ghost-button" data-admin-action="select-user" data-user="${user.id}">
              Открыть
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderAdminUserDetail(users, history) {
  if (!adminUserDetailPanel) return;
  if (!adminSelectedUserId) {
    adminUserDetailPanel.hidden = true;
    return;
  }

  const target = users.find((user) => user.id === adminSelectedUserId);
  if (!target) {
    adminSelectedUserId = null;
    adminUserDetailPanel.hidden = true;
    return;
  }

  adminUserDetailPanel.hidden = false;
  if (adminUserTitle) {
    adminUserTitle.textContent = `Данные пользователя: ${target.name}`;
  }
  if (adminUserNameInput) {
    adminUserNameInput.value = target.name ?? "";
  }
  if (adminUserEmailInput) {
    adminUserEmailInput.value = target.email ?? "";
  }
  if (adminUserPasswordInput) {
    adminUserPasswordInput.value = target.password ?? "";
  }

  renderHistoryList(
    adminUserHistoryContainer,
    history[target.id] ?? [],
    {
      showOwner: false,
      allowLoad: true,
      allowDocExport: true,
      allowPdfExport: true,
      userId: target.id,
    }
  );
}

function buildAdminHistory(history) {
  const users = loadUsers();
  const userMap = new Map(users.map((user) => [user.id, user]));
  const entries = [];
  Object.entries(history).forEach(([userId, list]) => {
    list?.forEach((entry) => {
      entries.push({
        ...entry,
        ownerName: userMap.get(userId)?.name ?? "Неизвестный пользователь",
        ownerEmail: userMap.get(userId)?.email ?? "",
        userId,
      });
    });
  });
  return entries.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
}

function renderHistoryList(
  container,
  entries,
  {
    showOwner = false,
    allowLoad = false,
    allowDocExport = false,
    allowPdfExport = false,
    userId,
  } = {}
) {
  if (!container) return;
  if (!entries.length) {
    container.innerHTML = "";
    container.classList.add("empty");
    container.textContent = "Нет сохранённых расчётов";
    return;
  }

  container.classList.remove("empty");
  container.innerHTML = entries
    .map((entry) => {
      const timestamp = formatDate(entry.savedAt);
      const ownerLine = showOwner
        ? `<p>Пользователь: ${escapeHtml(entry.ownerName ?? "")} ${
            entry.ownerEmail ? `(${escapeHtml(entry.ownerEmail)})` : ""
          }</p>`
        : "";
      const organisationLine = entry.organisation
        ? `<p>Организация: ${escapeHtml(entry.organisation)}</p>`
        : "";
      const taxLine = entry.taxId
        ? `<p>ИНН: ${escapeHtml(entry.taxId)}</p>`
        : "";
      const actions = [];
      const resolvedUserId = entry.userId ?? userId ?? currentUser?.id ?? "";
      if (allowLoad) {
        actions.push(
          `<button type="button" class="ghost-button" data-action="load-history" data-entry="${entry.id}" data-user="${resolvedUserId}">Открыть</button>`
        );
      }
      if (allowDocExport) {
        actions.push(
          `<button type="button" class="ghost-button" data-action="doc-history" data-entry="${entry.id}" data-user="${resolvedUserId}">DOC</button>`
        );
      }
      if (allowPdfExport) {
        actions.push(
          `<button type="button" class="ghost-button" data-action="pdf-history" data-entry="${entry.id}" data-user="${resolvedUserId}">PDF</button>`
        );
      }
      const actionsHtml = actions.length
        ? `<div class="entry-actions">${actions.join("")}</div>`
        : "";

      return `
        <div class="history-entry">
          <h4>${escapeHtml(entry.title ?? "Расчёт")}</h4>
          <p>${timestamp}</p>
          ${organisationLine}
          ${taxLine}
          <p>Итого: ${format.moneyRub(entry.totals?.rub ?? 0)}</p>
          ${ownerLine}
          ${actionsHtml}
        </div>
      `;
    })
    .join("");
}

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("ru-RU", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

function handleHistoryAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const { action, entry, user } = button.dataset;
  if (!entry) return;
  const userId = user || currentUser?.id;
  if (!userId) return;

  if (action === "load-history") {
    loadHistoryEntry(userId, entry, button);
  } else if (action === "doc-history") {
    exportHistoryEntry(userId, entry, "doc", button);
  } else if (action === "pdf-history") {
    exportHistoryEntry(userId, entry, "pdf", button);
  }
}

function loadHistoryEntry(userId, entryId, triggerButton) {
  if (!userId || !entryId) return;
  const history = loadHistory();
  const list = history[userId] ?? [];
  const entry = list.find((item) => item.id === entryId);
  if (!entry) return;
  const restored = normaliseState(entry.state ?? {});

  if (isHistoryView) {
    try {
      const { currentDate, ...rest } = restored;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ currentDate, ...rest })
      );
      const calcUrl = new URL("index.html", window.location.href);
      window.open(calcUrl.toString(), "_blank", "noopener,noreferrer");
      showTemporarySuccess(triggerButton, "Открыто в калькуляторе ✓");
    } catch (error) {
      console.error("Не удалось передать расчёт в калькулятор", error);
      showTemporarySuccess(triggerButton, "Ошибка передачи", true);
    }
    return;
  }

  state = restored;
  renderAll();
  showTemporarySuccess(calculateButton, "Расчёт загружен ✓");
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  const password = String(data.get("password") ?? "").trim();
  const users = loadUsers();
  const user = users.find(
    (item) =>
      item.email.trim().toLowerCase() === email && item.password === password
  );
  if (!user) {
    window.alert("Неверный email или пароль");
    return;
  }
  setActiveUser(user);
  renderAccountSection();
  event.currentTarget.reset();
}

function handleRegisterSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const name = String(data.get("name") ?? "").trim();
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  const password = String(data.get("password") ?? "").trim();
  if (!name || !email || password.length < 4) {
    window.alert("Заполните все поля. Пароль минимум 4 символа.");
    return;
  }
  const users = loadUsers();
  if (users.some((user) => user.email.toLowerCase() === email)) {
    window.alert("Пользователь с таким email уже существует.");
    return;
  }
  const newUser = {
    id: generateId(),
    name,
    email,
    password,
    isAdmin: false,
  };
  users.push(newUser);
  saveUsers(users);
  setActiveUser(newUser);
  renderAccountSection();
  event.currentTarget.reset();
}

async function loadLogisticsFromAPI(deliveryCity, weightKg, declaredValue) {
  try {
    console.log("Запрос логистики для города:", deliveryCity, "вес:", weightKg, "кг, стоимость:", declaredValue, "руб.");
    
    const response = await fetch(LOGISTICS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        deliveryCity,
        weightKg,
        declaredValue
      }),
      cache: "no-cache"
    });

    console.log("Ответ API логистики:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Ошибка HTTP:", response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Данные от API логистики:", data);

    if (data.error) {
      console.error("Ошибка в данных API:", data.error);
      throw new Error(data.error);
    }

    if (data.price && typeof data.price === 'number') {
      console.log("Логистика рассчитана успешно:", data.price, "руб. для города", deliveryCity);
      return data.price;
    } else {
      console.error("Неверный формат ответа API логистики:", data);
      throw new Error("Неверный формат ответа API логистики");
    }
  } catch (error) {
    // Улучшенная обработка ошибок
    console.error("Ошибка в loadLogisticsFromAPI:", error);
    
    if (error.message && error.message.includes("Failed to fetch")) {
      throw new Error(`API сервер недоступен. Проверьте, что Flask API сервер запущен на ${API_BASE_URL}`);
    }
    
    throw error;
  }
}

async function loadExchangeRateFromAPI(silent = true) {
  try {
    const response = await fetch(EXCHANGE_RATE_API_URL, {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-cache"
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      if (!silent) {
        console.warn("Не удалось загрузить курс с API:", response.status, errorText);
      }
      // Если API недоступен, используем сохраненное значение
      return false;
    }
    
    const data = await response.json();
    
    // Проверить наличие ошибки в ответе
    if (data.error) {
      if (!silent) {
        console.warn("Ошибка API курса валют:", data.error);
      }
      return false;
    }
    
    if (data.rateWithMargin && typeof data.rateWithMargin === 'number') {
      const newRate = data.rateWithMargin;
      state.exchangeRate = newRate;
      
      // Обновить поле ввода с российским форматом (запятая вместо точки)
      const exchangeInput = document.querySelector('input[data-state-key="exchangeRate"]');
      if (exchangeInput) {
        const rate = newRate.toFixed(2);
        const formattedRate = rate.replace('.', ',');
        exchangeInput.value = formattedRate;
        exchangeInput.setAttribute('value', formattedRate);
        
        if (!silent) {
          console.log(`Курс обновлён: ${formattedRate} ₽ (+3%)`);
        }
      }
      
      // Сохранить состояние
      persistState();
      
      // Обновить расчеты
      renderAll();
      
      return true;
    } else {
      if (!silent) {
        console.warn("Неверный формат ответа API курса валют:", data);
      }
      return false;
    }
  } catch (error) {
    // API может быть недоступен, это не критично - используются сохраненные данные
    if (!silent) {
      console.warn("API курса валют недоступен:", error.message || error);
    }
    return false;
  }
}

function handleLogout() {
  // Сохранить данные перед выходом
  persistState();
  setActiveUser(null);
  renderAccountSection();
}

function getAllUserData() {
  if (!currentUser?.id) return null;
  const userId = currentUser.id;
  const storageKey = getUserStorageKey(STORAGE_KEY);
  const notesKey = getUserStorageKey(NOTES_KEY);
  const history = loadHistory();
  
  return {
    version: VERSION,
    userId,
    userName: currentUser.name,
    userEmail: currentUser.email,
    exportedAt: new Date().toISOString(),
    state: JSON.parse(localStorage.getItem(storageKey) || "null"),
    notes: localStorage.getItem(notesKey) || "",
    history: history[userId] || [],
  };
}

function handleExportUserData() {
  if (!currentUser?.id) {
    window.alert("Необходимо войти в систему для экспорта данных");
    return;
  }
  
  const data = getAllUserData();
  if (!data) {
    window.alert("Нет данных для экспорта");
    return;
  }
  
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const filename = `led-calculator-${currentUser.email.replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().split("T")[0]}.json`;
  
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  showTemporarySuccess(exportUserDataButton, "Данные экспортированы ✓");
}

async function handleImportUserData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!currentUser?.id) {
    window.alert("Необходимо войти в систему для импорта данных");
    event.target.value = "";
    return;
  }
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    // Проверка версии и структуры
    if (!data.version || !data.userId) {
      throw new Error("Неверный формат файла");
    }
    
    // Подтверждение импорта
    const confirmed = window.confirm(
      `Импортировать данные пользователя "${data.userName || data.userEmail}"?\n` +
      `Это заменит текущие данные пользователя "${currentUser.name}".`
    );
    
    if (!confirmed) {
      event.target.value = "";
      return;
    }
    
    const userId = currentUser.id;
    const storageKey = getUserStorageKey(STORAGE_KEY);
    const notesKey = getUserStorageKey(NOTES_KEY);
    const history = loadHistory();
    
    // Импорт состояния
    if (data.state) {
      localStorage.setItem(storageKey, JSON.stringify(data.state));
      state = normaliseState(loadState());
    }
    
    // Импорт заметок
    if (data.notes !== undefined) {
      localStorage.setItem(notesKey, data.notes);
      if (notesArea) notesArea.value = data.notes;
    }
    
    // Импорт истории
    if (data.history && Array.isArray(data.history)) {
      history[userId] = data.history;
      saveHistory(history);
    }
    
    renderAll();
    restoreNotes();
    
    // Сохранить в файл через API
    saveUserDataToFile();
    
    showTemporarySuccess(exportUserDataButton, "Данные импортированы ✓");
  } catch (error) {
    console.error("Ошибка импорта:", error);
    window.alert(`Ошибка импорта данных: ${error.message}`);
  } finally {
    if (event.target) event.target.value = "";
  }
}

async function saveUserDataToFile() {
  if (!currentUser?.id) return;
  
  try {
    const data = getAllUserData();
    if (!data) return;
    
    const response = await fetch(SAVE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      console.warn("Не удалось сохранить данные на сервер:", response.statusText);
    }
  } catch (error) {
    // API может быть недоступен, это не критично
    console.warn("API сохранения недоступен:", error);
  }
}

async function loadUserDataFromFile() {
  if (!currentUser?.id) return;
  
  try {
    const response = await fetch(`${SAVE_API_URL}?userId=${encodeURIComponent(currentUser.id)}`);
    if (!response.ok) {
      // Данных на сервере нет, это нормально
      return;
    }
    
    const serverData = await response.json();
    if (!serverData || !serverData.state) return;
    
    // Загрузить только если локальных данных нет или данные на сервере новее
    const storageKey = getUserStorageKey(STORAGE_KEY);
    const hasLocalData = localStorage.getItem(storageKey);
    
    if (serverData.state) {
      // Если локальных данных нет, или серверные данные новее - загрузить их
      const shouldLoad = !hasLocalData || (
        serverData.exportedAt && 
        new Date(serverData.exportedAt) > new Date(JSON.parse(hasLocalData || '{}').currentDate || 0)
      );
      
      if (shouldLoad) {
        localStorage.setItem(storageKey, JSON.stringify(serverData.state));
        state = normaliseState(loadState());
        
        if (serverData.notes !== undefined) {
          const notesKey = getUserStorageKey(NOTES_KEY);
          localStorage.setItem(notesKey, serverData.notes);
        }
        
        // Не вызываем renderAll здесь - это будет сделано в initialise
      }
    }
  } catch (error) {
    // API может быть недоступен, это не критично
    console.warn("API загрузки недоступен:", error);
  }
}

function handleSaveCalculation() {
  if (!currentUser) {
    showTemporarySuccess(saveCalculationButton, "Войдите в систему", true);
    return;
  }
  const derived = lastDerived ?? calculateDerived(state);
  const snapshot = ensureFinancialSnapshot(derived);
  addHistoryEntry(currentUser.id, derived, snapshot);
  renderAccountSection();
  showTemporarySuccess(saveCalculationButton, "Расчёт сохранён ✓");
}

function handleOpenHistoryClick() {
  if (!currentUser) {
    window.alert("Войдите в систему, чтобы открыть историю расчётов.");
    return;
  }
  const historyUrl = new URL("history.html", window.location.href);
  historyUrl.search = "";
  window.open(historyUrl.toString(), "_blank", "noopener,noreferrer");
}

function handleAdminUserListClick(event) {
  const button = event.target.closest("button[data-admin-action]");
  if (!button) return;
  const { adminAction, user } = button.dataset;
  if (adminAction === "select-user" && user) {
    adminSelectedUserId = user;
    renderAdminPanel();
  }
}

function handleAdminUserSave(event) {
  event.preventDefault();
  if (!adminSelectedUserId) return;
  const name = adminUserNameInput?.value.trim() ?? "";
  const email = adminUserEmailInput?.value.trim().toLowerCase() ?? "";
  const password = adminUserPasswordInput?.value.trim() ?? "";
  if (!name || !email || password.length < 4) {
    window.alert("Укажите имя, email и пароль (минимум 4 символа).");
    return;
  }

  const users = loadUsers();
  const duplicate = users.some(
    (user) => user.id !== adminSelectedUserId && user.email.toLowerCase() === email
  );
  if (duplicate) {
    window.alert("Этот email уже используется другим пользователем.");
    return;
  }

  const updated = updateUser(adminSelectedUserId, {
    name,
    email,
    password,
  });
  if (updated) {
    renderAdminPanel();
    renderAccountSection();
    const submitButton = adminUserForm?.querySelector('button[type="submit"]');
    showTemporarySuccess(submitButton, "Данные сохранены ✓");
  }
}

function updateUser(userId, updates) {
  const users = loadUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return null;
  users[index] = { ...users[index], ...updates };
  saveUsers(users);
  if (currentUser?.id === userId) {
    setActiveUser(users[index]);
  }
  return users[index];
}

function getHistoryEntry(userId, entryId) {
  if (!userId || !entryId) return null;
  const history = loadHistory();
  const list = history[userId] ?? [];
  return list.find((item) => item.id === entryId) ?? null;
}

async function exportHistoryEntry(userId, entryId, format, triggerButton) {
  try {
    const entry = getHistoryEntry(userId, entryId);
    if (!entry) return;
    const entryState = normaliseState(entry.state ?? {});
    const derived = calculateDerived(entryState);
    derived.currentDate = entryState.currentDate ?? derived.currentDate;
    const snapshot = composeComponentRows(derived);
    const logoSrc = await getLogoDataUrl();
    const meta = {
      date:
        entryState.currentDate ??
        (entry.savedAt
          ? new Date(entry.savedAt).toISOString().slice(0, 10)
          : state.currentDate),
    };
    if (format === "doc") {
      const documentHtml = buildWordDocument(derived, snapshot, logoSrc, meta);
      downloadWordDocument(
        documentHtml,
        `СМЕТА-${meta.date}-${userId}.doc`,
        triggerButton
      );
    } else if (format === "pdf") {
      const documentHtml = buildPdfDocument(derived, snapshot, logoSrc, meta);
      openPrintPreview(documentHtml, triggerButton, "PDF открыт ✓");
    }
  } catch (error) {
    console.error("History export failed", error);
    if (triggerButton) {
      showTemporarySuccess(triggerButton, "Ошибка экспорта", true);
    }
  }
}

function exportHistorySummary() {
  if (!currentUser?.isAdmin) {
    showTemporarySuccess(historySummaryButton, "Нет доступа", true);
    return;
  }

  const history = loadHistory();
  const entries = buildAdminHistory(history);

  if (!entries.length) {
    showTemporarySuccess(historySummaryButton, "Нет расчётов", true);
    return;
  }

  const header = [
    "Дата/время",
    "Пользователь",
    "Email",
    "Организация",
    "ИНН",
    "Сумма, руб.",
    "Сумма, $",
  ];
  const csvRows = [
    header.join(";"),
    ...entries.map((entry) =>
      [
        formatDate(entry.savedAt),
        entry.ownerName ?? "",
        entry.ownerEmail ?? "",
        entry.organisation ?? "",
        entry.taxId ?? "",
        format.moneyRub(entry.totals?.rub ?? 0),
        format.moneyUsd(entry.totals?.usd ?? 0),
      ]
        .map((value) => csvEscape(String(value ?? "")))
        .join(";")
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `history-summary-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showTemporarySuccess(historySummaryButton, "Сводка выгружена ✓");
}

