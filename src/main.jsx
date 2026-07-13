import React, { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileJson,
  Gauge,
  GripVertical,
  Eye,
  ImagePlus,
  Layers3,
  LayoutGrid,
  Minus,
  PackageCheck,
  Plus,
  Replace,
  Save,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { categories, dataStats, fixtureTypes, products, starterPlanogram } from "./data/realData";
import "./styles.css";

const AGENT_WEBHOOK_URL = import.meta.env.VITE_AGENT_WEBHOOK_URL || "";

const stores = ["Cemaco Pradera", "Cemaco Zona 10", "Cemaco Peri-Roosevelt", "Cemaco Cayala", "Piloto Automotriz"];
const screenMeta = {
  capture: {
    label: "Captura",
    title: "Toma o sube la foto",
    description: "Primero valida que la imagen sirva para reconocimiento.",
  },
  review: {
    label: "Revision",
    title: "Revisa detecciones",
    description: "La propuesta aparece solo si la foto parece un mueble valido.",
  },
  editor: {
    label: "Editor",
    title: "Corrige el planograma",
    description: "Ajusta sku, facings y posiciones antes de guardar.",
  },
  performance: {
    label: "Performance",
    title: "Evalua el surtido",
    description: "Cruza el mueble con ventas, ecommerce e inventario.",
  },
};
const fixtureOptions = Object.values(
  fixtureTypes.reduce((groups, fixture) => {
    const key = `${fixture.name}-${fixture.category}`;
    if (!groups[key]) {
      groups[key] = {
        ...fixture,
        componentCount: 0,
        componentDescriptions: [],
      };
    }
    groups[key].componentCount += 1;
    groups[key].componentDescriptions.push(fixture.description);
    groups[key].width = Math.max(groups[key].width, fixture.width);
    groups[key].depth = Math.max(groups[key].depth, fixture.depth);
    groups[key].levels = Math.max(groups[key].levels, fixture.levels);
    return groups;
  }, {}),
);
const productsBySku = new Map(products.map((product) => [product.sku, product]));

function getFixtureCapturePlan(fixture) {
  const isLongRack = Number(fixture?.width || 0) >= 180;
  const slots = isLongRack
    ? [
        {
          id: "left",
          label: "Modulo izquierdo",
          shortLabel: "Izquierda",
          instruction: "Captura el lado izquierdo del rack, con todos los niveles visibles.",
        },
        {
          id: "right",
          label: "Modulo derecho",
          shortLabel: "Derecha",
          instruction: "Captura el lado derecho o centro/derecha, alineado con el primer modulo.",
        },
      ]
    : [
        {
          id: "front",
          label: "Foto frontal",
          shortLabel: "Frontal",
          instruction: "Captura el mueble completo de frente, incluyendo todos los niveles.",
        },
      ];

  return {
    isLongRack,
    slots,
    requiredPhotos: slots.length,
    summary: isLongRack
      ? "Rack largo: toma 2 fotos por modulo para cubrir todo el mueble."
      : "Rack compacto: toma 1 foto frontal del mueble completo.",
  };
}

function findProduct(sku) {
  return productsBySku.get(sku);
}

function skuSeed(product) {
  return Number(String(product?.rawSku || product?.sku || "0").replace(/\D/g, "").slice(-6)) || 1;
}

function getProductPerformance(product, facings = 1, position = 0) {
  if (!product) return null;
  const seed = skuSeed(product);
  const storeUnits = 12 + ((seed + position * 17) % 88);
  const ecommerceUnits = 4 + ((seed * 3 + position * 11) % 54);
  const ecommerceVisits = ecommerceUnits * (11 + (seed % 15)) + 90 + (position * 23);
  const inventory = 3 + ((seed * 7 + position * 13) % 92);
  const margin = 18 + (seed % 24);
  const daysInventory = Math.max(2, Math.round((inventory / Math.max(storeUnits / 30, 1)) * 2));
  const salesAmount = Math.round((storeUnits + ecommerceUnits) * (product.price || 39.99));
  const salesPerFacing = Math.round(storeUnits / Math.max(facings, 1));
  const conversion = Number(((ecommerceUnits / Math.max(ecommerceVisits, 1)) * 100).toFixed(1));
  const alert =
    storeUnits > 70 && inventory < 20
      ? "Riesgo de quiebre"
      : inventory > 70 && storeUnits < 30
        ? "Sobreinventario"
        : ecommerceUnits > storeUnits
          ? "Fuerte online"
          : salesPerFacing > 30
            ? "Mas facings"
            : "Saludable";

  return {
    storeUnits,
    ecommerceUnits,
    ecommerceVisits,
    inventory,
    margin,
    daysInventory,
    salesAmount,
    salesPerFacing,
    conversion,
    alert,
  };
}

function getPlanogramPerformance(rows) {
  const items = rows
    .flatMap((row, rowIndex) =>
      row.items.map((item, itemIndex) => {
        const product = item.sku ? findProduct(item.sku) : null;
        const performance = getProductPerformance(product, item.facings, rowIndex * 10 + itemIndex);
        return { ...item, product, performance, rowName: row.name };
      }),
    )
    .filter((item) => item.product && item.performance);

  const totals = items.reduce(
    (acc, item) => {
      acc.storeUnits += item.performance.storeUnits;
      acc.ecommerceUnits += item.performance.ecommerceUnits;
      acc.ecommerceVisits += item.performance.ecommerceVisits;
      acc.inventory += item.performance.inventory;
      acc.salesAmount += item.performance.salesAmount;
      acc.facings += item.facings;
      return acc;
    },
    { storeUnits: 0, ecommerceUnits: 0, ecommerceVisits: 0, inventory: 0, salesAmount: 0, facings: 0 },
  );

  const alerts = items
    .filter((item) => item.performance.alert !== "Saludable")
    .sort((a, b) => b.performance.salesAmount - a.performance.salesAmount)
    .slice(0, 6);

  return { items, totals, alerts };
}

function productMatchesCategory(product, selectedCategory) {
  if (!selectedCategory || selectedCategory === "Todos autos") return true;
  return [product.category, product.level1, product.level2, product.level3, product.erpSubcategory].some(
    (value) => value === selectedCategory,
  );
}

function buildPlanogramSkus(selectedFixture, selectedCategory) {
  const candidates = products
    .filter((product) => productMatchesCategory(product, selectedCategory) && product.imageUrl)
    .slice(0, 40)
    .map((product) => product.sku);
  const pool = candidates.length >= 10 ? candidates : starterPlanogram.flat();
  const rowCount = Math.max(3, selectedFixture.levels || 5);
  const rows = [];
  let cursor = 0;
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const skuRow = [];
    for (let itemIndex = 0; itemIndex < 5; itemIndex += 1) {
      skuRow.push(pool[cursor % pool.length]);
      cursor += 1;
    }
    rows.push(skuRow);
  }
  return rows;
}

function getAgentCandidates(product, selectedCategory, limit = 3) {
  if (!product) return [];
  const pool = products.filter((candidate) => candidate.sku !== product.sku && productMatchesCategory(candidate, selectedCategory));
  const seed = skuSeed(product);
  return pool
    .map((candidate) => ({
      product: candidate,
      score:
        (candidate.level2 === product.level2 ? 28 : 0) +
        (candidate.level3 === product.level3 ? 22 : 0) +
        (candidate.brand === product.brand ? 12 : 0) +
        ((seed + skuSeed(candidate)) % 17),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ product: candidate }, index) => ({
      sku: candidate.sku,
      name: candidate.name,
      confidence: Math.max(45, 72 - index * 9),
    }));
}

function makeDetectionRows(selectedFixture, selectedCategory, capturePlan = getFixtureCapturePlan(selectedFixture), capturePhotos = []) {
  const planogramSkus = buildPlanogramSkus(selectedFixture, selectedCategory);
  const readyPhotos = capturePhotos.filter((capture) => capture?.quality?.planogramReady);
  const photoBoost = Math.min(8, readyPhotos.length * 4);
  const rows = planogramSkus.slice(0, selectedFixture.levels).map((skus, rowIndex) => ({
    id: crypto.randomUUID(),
    name: `Nivel ${rowIndex + 1}`,
    confidence: Math.max(68, 90 + photoBoost - rowIndex * 4),
    items: skus.slice(0, selectedFixture.levels <= 4 ? 4 : 5).map((sku, itemIndex) => ({
      id: crypto.randomUUID(),
      sku,
      facings: itemIndex % 2 === 0 ? 2 : 1,
      confidence: Math.max(48, 88 + photoBoost - rowIndex * 5 - itemIndex * 4),
      source: capturePhotos.length ? "Simulado contra catalogo" : "Demo catalogo Autos.xlsx",
      moduleId: capturePlan.slots[itemIndex % capturePlan.slots.length]?.id || "front",
      alternatives: getAgentCandidates(findProduct(sku), selectedCategory),
    })),
  }));

  if (rows[2]?.items[3] && /gancho|barra|peg|hidrolavadora/i.test(`${selectedFixture.description} ${selectedFixture.category}`)) {
    rows[2].items[3].sku = null;
    rows[2].items[3].confidence = 41;
    rows[2].items[3].source = "Requiere revision manual";
    rows[2].items[3].alternatives = planogramSkus
      .flat()
      .slice(0, 3)
      .map((candidateSku, index) => ({
        sku: candidateSku,
        name: findProduct(candidateSku)?.name || candidateSku,
        confidence: 58 - index * 6,
      }));
  }

  return rows;
}

function measureCapturedImage(image) {
  const canvas = document.createElement("canvas");
  const sampleWidth = 160;
  const sampleHeight = Math.max(1, Math.round((image.height / image.width) * sampleWidth));
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);
  let totalBrightness = 0;
  let highContrastPixels = 0;
  let horizontalEdges = 0;
  let verticalEdges = 0;
  const luminance = new Array(sampleWidth * sampleHeight);
  for (let index = 0; index < data.length; index += 4) {
    const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
    luminance[index / 4] = brightness;
    totalBrightness += brightness;
    if (brightness > 35 && brightness < 225) highContrastPixels += 1;
  }
  // iOS Safari puede dibujar fotos grandes como canvas en blanco sin lanzar error;
  // un cero absoluto en todo es fallo de lectura, no una medicion.
  if (totalBrightness === 0 && highContrastPixels === 0) return null;
  for (let y = 1; y < sampleHeight; y += 1) {
    for (let x = 1; x < sampleWidth; x += 1) {
      const current = luminance[y * sampleWidth + x];
      const left = luminance[y * sampleWidth + x - 1];
      const top = luminance[(y - 1) * sampleWidth + x];
      if (Math.abs(current - top) > 24) horizontalEdges += 1;
      if (Math.abs(current - left) > 24) verticalEdges += 1;
    }
  }
  const pixelCount = data.length / 4;
  const brightness = Math.round(totalBrightness / pixelCount);
  const usableResolution = Math.max(image.width, image.height) >= 900;
  const usableLight = brightness >= 45 && brightness <= 215;
  const usableContrast = highContrastPixels / pixelCount > 0.45;
  const horizontalScore = horizontalEdges / Math.max((sampleHeight - 1) * (sampleWidth - 1), 1);
  const verticalScore = verticalEdges / Math.max((sampleHeight - 1) * (sampleWidth - 1), 1);
  const structureScore = Math.round((horizontalScore + verticalScore) * 100);
  const structureBalance = horizontalScore / Math.max(verticalScore, 0.001);
  const shelfStructure =
    horizontalScore > 0.035 &&
    verticalScore > 0.035 &&
    structureScore >= 10 &&
    structureBalance > 0.35 &&
    structureBalance < 2.9;
  const planogramReady = usableResolution && usableLight && usableContrast && shelfStructure;
  const ok = planogramReady;
  return {
    status: ok ? "ok" : "warning",
    title: ok ? "Foto apta para planograma" : "Foto no apta para planograma",
    message: ok
      ? "La imagen parece mostrar estructura de mueble, niveles y contraste suficientes para una propuesta."
      : "La foto debe mostrar el rack o gondola completo por modulo; una foto de producto individual no sirve para detectar surtido.",
    planogramReady,
    width: image.width,
    height: image.height,
    brightness,
    structureScore,
    checks: [
      { label: "Resolucion", ok: usableResolution, value: `${image.width}x${image.height}` },
      { label: "Luminosidad", ok: usableLight, value: `${brightness}/255` },
      { label: "Contraste", ok: usableContrast, value: usableContrast ? "usable" : "bajo" },
      { label: "Estructura de mueble", ok: shelfStructure, value: `${structureScore}/100` },
    ],
  };
}

function failedPhotoAnalysis(message) {
  return {
    status: "warning",
    title: "No se pudo medir la foto",
    message,
    planogramReady: false,
    analysisFailed: true,
    checks: [],
  };
}

function analyzeCapturedPhoto(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const quality = measureCapturedImage(image);
      if (quality) {
        resolve(quality);
        return;
      }
      window.setTimeout(() => {
        const retried = measureCapturedImage(image);
        resolve(
          retried ||
            failedPhotoAnalysis(
              "El navegador no dejo leer los pixeles de esta imagen. Toma la foto de nuevo; si sigue pasando, cierra otras pestanas y reintenta.",
            ),
        );
      }, 300);
    };
    image.onerror = () => {
      resolve(failedPhotoAnalysis("La imagen se cargo, pero no pudimos medir calidad en el navegador."));
    };
    image.src = dataUrl;
  });
}

function downscaleDataUrl(dataUrl, maxEdge = 1568) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(image.width, image.height, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

function mapAgentRows(payload) {
  if (!Array.isArray(payload?.rows)) return [];
  return payload.rows
    .map((row, rowIndex) => ({
      id: crypto.randomUUID(),
      name: row.name || `Nivel ${rowIndex + 1}`,
      confidence: Math.min(Math.max(Math.round(Number(row.confidence) || 0), 0), 100),
      items: (Array.isArray(row.items) ? row.items : []).map((item) => {
        const sku = item.sku && productsBySku.has(item.sku) ? item.sku : null;
        return {
          id: crypto.randomUUID(),
          sku,
          facings: Math.min(Math.max(Math.round(Number(item.facings) || 1), 1), 8),
          confidence: Math.min(Math.max(Math.round(Number(item.confidence) || 0), 0), 100),
          source: sku
            ? "Agente de vision"
            : item.detectedName
              ? `Sin match: ${item.detectedName}`
              : "Requiere revision manual",
          moduleId: item.moduleId || "front",
          alternatives: (Array.isArray(item.alternatives) ? item.alternatives : [])
            .filter((candidate) => productsBySku.has(candidate.sku))
            .slice(0, 3)
            .map((candidate) => ({
              sku: candidate.sku,
              name: findProduct(candidate.sku)?.name || candidate.name || candidate.sku,
              confidence: Math.min(Math.max(Math.round(Number(candidate.confidence) || 0), 0), 100),
            })),
        };
      }),
    }))
    .filter((row) => row.items.length > 0);
}

function ProductPack({ product, compact = false }) {
  if (!product) {
    return (
      <div className="unknown-pack">
        <Search size={18} />
        <span>Sin match</span>
      </div>
    );
  }

  return (
    <div
      className={`product-pack ${compact ? "compact" : ""}`}
      style={{ "--pack": product.color, "--accent": product.accent }}
      title={`${product.name} · ${product.sku}`}
    >
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
      <div className="pack-band" />
      <div className="pack-brand">{product.brand}</div>
      <div className="pack-name">{product.name}</div>
      {!compact && <div className="pack-gtin">{product.rawSku}</div>}
    </div>
  );
}

function App() {
  const [activeView, setActiveView] = useState("capture");
  const [selectedStore, setSelectedStore] = useState(stores[0]);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [fixtureId, setFixtureId] = useState(fixtureOptions[0].id);
  const [photo, setPhoto] = useState(null);
  const [capturePhotos, setCapturePhotos] = useState([]);
  const [activeCaptureIndex, setActiveCaptureIndex] = useState(0);
  const [photoQuality, setPhotoQuality] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const [rows, setRows] = useState(makeDetectionRows(fixtureOptions[0], categories[0]));
  const [selectedCell, setSelectedCell] = useState(null);
  const [query, setQuery] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [previewMode, setPreviewMode] = useState("construction");
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);
  const toastTimerRef = useRef(null);

  const fixture = useMemo(() => fixtureOptions.find((item) => item.id === fixtureId), [fixtureId]);
  const capturePlan = useMemo(() => getFixtureCapturePlan(fixture), [fixture]);
  const activeCaptureSlot = capturePlan.slots[Math.min(activeCaptureIndex, capturePlan.slots.length - 1)];
  const capturedReadyCount = capturePhotos.filter((capture) => capture?.quality?.planogramReady).length;
  const captureReady = capturedReadyCount >= capturePlan.requiredPhotos;
  const activeCapturePhoto = capturePhotos[activeCaptureIndex]?.dataUrl || photo;
  const allItems = rows.flatMap((row) => row.items);
  const matchedItems = allItems.filter((item) => item.sku);
  const avgConfidence = Math.round(
    allItems.reduce((total, item) => total + item.confidence, 0) / Math.max(allItems.length, 1),
  );
  const filteredProducts = products.filter((product) => {
    const term = query.trim().toLowerCase();
    const inCategory = productMatchesCategory(product, selectedCategory);
    if (!inCategory) return false;
    if (!term) return true;
    return [
      product.sku,
      product.rawSku,
      product.gtin,
      product.name,
      product.brand,
      product.category,
      product.level3,
      product.erpSubcategory,
    ].some((value) => String(value || "").toLowerCase().includes(term));
  });
  const visibleProducts = filteredProducts.slice(0, 120);

  const activeSelection =
    selectedCell &&
    rows
      .find((row) => row.id === selectedCell.rowId)
      ?.items.find((item) => item.id === selectedCell.itemId);

  function notify(message, type = "success") {
    setToast({ message, type });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200);
  }

  function goToView(nextView) {
    setActiveView(nextView);
    window.setTimeout(() => {
      document.querySelector(".main-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function openProductPreview(product, mode = "construction") {
    setPreviewMode(mode);
    setPreviewProduct(product);
  }

  function onFixtureChange(nextFixtureId) {
    const nextFixture = fixtureOptions.find((item) => item.id === nextFixtureId);
    setFixtureId(nextFixtureId);
    setRows(makeDetectionRows(nextFixture, selectedCategory));
    setSelectedCell(null);
    setDemoMode(false);
    setAgentMode(false);
    setPhoto(null);
    setCapturePhotos([]);
    setActiveCaptureIndex(0);
    setPhotoQuality(null);
    notify(`Mueble cambiado a ${nextFixture.name}`);
  }

  function onCategoryChange(nextCategory) {
    setSelectedCategory(nextCategory);
    setRows(makeDetectionRows(fixture, nextCategory));
    setSelectedCell(null);
    setDemoMode(false);
    setAgentMode(false);
    setPhoto(null);
    setCapturePhotos([]);
    setActiveCaptureIndex(0);
    setPhotoQuality(null);
    notify(`Categoria: ${nextCategory}`);
  }

  function onPhotoPicked(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setPhoto(dataUrl);
      setDemoMode(false);
      setPhotoQuality({
        status: "checking",
        title: "Validando foto...",
        message: "Revisando resolucion, luz, contraste y estructura de mueble antes de procesar.",
        checks: [],
      });
      const quality = await analyzeCapturedPhoto(dataUrl);
      setPhotoQuality(quality);
      setCapturePhotos((currentPhotos) => {
        const nextPhotos = [...currentPhotos];
        nextPhotos[activeCaptureIndex] = {
          id: activeCaptureSlot.id,
          label: activeCaptureSlot.label,
          dataUrl,
          quality,
          capturedAt: new Date().toISOString(),
        };
        return nextPhotos;
      });
      if (!quality.planogramReady) {
        notify("Esta foto no sirve para planograma; toma el mueble completo o el modulo indicado", "warning");
        return;
      }
      if (activeCaptureIndex < capturePlan.requiredPhotos - 1) {
        notify(`${activeCaptureSlot.shortLabel} listo. Falta la siguiente foto.`);
        return;
      }
      notify("Fotos listas para usar");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function requestPhoto({ reset = false } = {}) {
    if (reset) {
      setPhoto(null);
      setCapturePhotos([]);
      setActiveCaptureIndex(0);
      setPhotoQuality(null);
      setDemoMode(false);
      setAgentMode(false);
      setProcessing(false);
      goToView("capture");
      notify("Listo para tomar otra foto");
    }
    window.setTimeout(() => fileRef.current?.click(), 40);
  }

  function retakeActiveCapture() {
    setCapturePhotos((currentPhotos) => {
      const nextPhotos = [...currentPhotos];
      nextPhotos[activeCaptureIndex] = undefined;
      return nextPhotos;
    });
    setPhoto(null);
    setPhotoQuality(null);
    setDemoMode(false);
    notify(`Repite ${activeCaptureSlot.shortLabel}`);
    window.setTimeout(() => fileRef.current?.click(), 40);
  }

  function moveToNextCapture() {
    const nextIndex = Math.min(activeCaptureIndex + 1, capturePlan.requiredPhotos - 1);
    setActiveCaptureIndex(nextIndex);
    setPhoto(capturePhotos[nextIndex]?.dataUrl || null);
    setPhotoQuality(capturePhotos[nextIndex]?.quality || null);
    notify(`Listo para ${capturePlan.slots[nextIndex].shortLabel}`);
  }

  function selectCaptureSlot(index) {
    setActiveCaptureIndex(index);
    setPhoto(capturePhotos[index]?.dataUrl || null);
    setPhotoQuality(capturePhotos[index]?.quality || null);
  }

  async function runPipeline({ forceDemo = false, quality = photoQuality, hasPhoto = Boolean(photo) } = {}) {
    if (!forceDemo && !captureReady) {
      goToView("capture");
      notify(`Faltan ${capturePlan.requiredPhotos - capturedReadyCount} foto(s) del mueble antes de procesar`, "warning");
      return;
    }
    if (!forceDemo && quality?.planogramReady === false) {
      goToView("capture");
      notify("Esta foto no sirve para planograma; toma el mueble completo o el modulo indicado", "warning");
      return;
    }
    setDemoMode(forceDemo || !hasPhoto);
    setAgentMode(false);
    setProcessing(true);
    goToView("review");
    if (!forceDemo && AGENT_WEBHOOK_URL && captureReady) {
      try {
        const readyCaptures = capturePhotos.filter((capture) => capture?.quality?.planogramReady);
        const photosPayload = await Promise.all(
          readyCaptures.map(async (capture) => ({
            id: capture.id,
            label: capture.label,
            dataUrl: await downscaleDataUrl(capture.dataUrl),
          })),
        );
        const catalogPayload = products
          .filter((product) => productMatchesCategory(product, selectedCategory))
          .slice(0, 400)
          .map((product) => ({
            sku: product.sku,
            name: product.name,
            brand: product.brand,
            category: product.level3 || product.erpSubcategory || product.category,
            price: product.price,
          }));
        const response = await fetch(AGENT_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            store: selectedStore,
            category: selectedCategory,
            fixture: {
              name: fixture.name,
              width: fixture.width,
              depth: fixture.depth,
              levels: fixture.levels,
              category: fixture.category,
            },
            photos: photosPayload,
            catalog: catalogPayload,
          }),
        });
        if (!response.ok) throw new Error(`El agente respondio ${response.status}`);
        const payload = await response.json();
        const agentRows = mapAgentRows(payload);
        if (!agentRows.length) throw new Error("El agente no devolvio detecciones");
        setRows(agentRows);
        setAgentMode(true);
        setProcessing(false);
        notify("Agente de vision genero la propuesta desde tus fotos");
        return;
      } catch (error) {
        console.error("Fallo el agente de vision", error);
        notify("Agente de vision no disponible; mostrando propuesta simulada", "warning");
      }
    }
    window.setTimeout(() => {
      setRows(makeDetectionRows(fixture, selectedCategory, capturePlan, capturePhotos));
      setProcessing(false);
      notify(
        forceDemo
          ? "Modo demo generado sin reconocimiento real"
          : "Propuesta simulada contra catalogo; el agente de vision aun no esta conectado",
      );
    }, 950);
  }

  function updateItem(rowId, itemId, patch) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              items: row.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
            }
          : row,
      ),
    );
  }

  function addFacing() {
    if (!selectedCell) return;
    updateItem(selectedCell.rowId, selectedCell.itemId, {
      facings: Math.min((activeSelection?.facings || 1) + 1, 8),
      source: "Corregido por usuario",
      confidence: 99,
    });
    notify("Facing agregado");
  }

  function removeFacing() {
    if (!selectedCell) return;
    updateItem(selectedCell.rowId, selectedCell.itemId, {
      facings: Math.max((activeSelection?.facings || 1) - 1, 1),
      source: "Corregido por usuario",
      confidence: 99,
    });
    notify("Facing ajustado");
  }

  function assignProduct(sku) {
    if (!selectedCell) return;
    updateItem(selectedCell.rowId, selectedCell.itemId, {
      sku,
      confidence: 99,
      source: "Asignado manualmente",
    });
    notify(`${sku} asignado`);
  }

  function duplicateSelected() {
    if (!selectedCell) return;
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== selectedCell.rowId) return row;
        const index = row.items.findIndex((item) => item.id === selectedCell.itemId);
        const selected = row.items[index];
        const next = [...row.items];
        next.splice(index + 1, 0, { ...selected, id: crypto.randomUUID(), source: "Duplicado" });
        return { ...row, items: next };
      }),
    );
    notify("Producto duplicado");
  }

  function exportJson() {
    const payload = {
      version: "mvp-0.1",
      createdAt: new Date().toISOString(),
      store: selectedStore,
      category: selectedCategory,
      fixture,
      metrics: {
        items: allItems.length,
        matchedItems: matchedItems.length,
        averageConfidence: avgConfidence,
      },
      rows: rows.map((row) => ({
        name: row.name,
        confidence: row.confidence,
        items: row.items.map((item, position) => ({
          position: position + 1,
          sku: item.sku,
          gtin: item.sku ? findProduct(item.sku)?.gtin : null,
          rawSku: item.sku ? findProduct(item.sku)?.rawSku : null,
          price: item.sku ? findProduct(item.sku)?.price : null,
          facings: item.facings,
          confidence: item.confidence,
          source: item.source,
        })),
      })),
    };
    downloadFile("planograma-realogram.json", JSON.stringify(payload, null, 2), "application/json");
  }

  function exportCsv() {
    const lines = ["tienda,categoria,mueble,nivel,posicion,sku,codigo_original,upc,producto,precio,facings,confianza,fuente"];
    rows.forEach((row, rowIndex) => {
      row.items.forEach((item, itemIndex) => {
        const product = item.sku ? findProduct(item.sku) : null;
        lines.push(
          [
            selectedStore,
            selectedCategory,
            fixture.name,
            rowIndex + 1,
            itemIndex + 1,
            item.sku || "",
            product?.rawSku || "",
            product?.gtin || "",
            product?.name || "Sin match",
            product?.price || "",
            item.facings,
            item.confidence,
            item.source,
          ]
            .map((value) => `"${String(value).replaceAll('"', '""')}"`)
            .join(","),
        );
      });
    });
    downloadFile("planograma-realogram.csv", lines.join("\n"), "text/csv");
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function savePlanogram() {
    setSavedAt(new Date().toLocaleString("es-GT"));
    notify("Planograma guardado");
  }

  return (
    <main>
      <input
        ref={fileRef}
        className="hidden-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPhotoPicked}
      />
      <header className="app-header">
        <div>
          <p className="eyebrow">App · Prototipo · Planogramas con fotografias</p>
          <h1>Vehiculos: foto a planograma con IA</h1>
          <p className="intro">
            Captura guiada para Cemaco con productos reales de Autos.xlsx, fotos VTEX y muebles del consolidado.
          </p>
        </div>
        <div className="status-strip">
          <span>
            <ShieldCheck size={16} /> {dataStats.productCountLoaded.toLocaleString("es-GT")} de{" "}
            {dataStats.productCountSource.toLocaleString("es-GT")} sku
          </span>
          <span>
            <Sparkles size={16} /> IA asistida
          </span>
          <span>
            <PackageCheck size={16} /> {fixtureOptions.length} muebles · {dataStats.fixtureCount} componentes
          </span>
        </div>
      </header>

      <section className="workflow">
        {[
          ["capture", Camera, "Captura"],
          ["review", ClipboardCheck, "Revision"],
          ["editor", LayoutGrid, "Editor"],
          ["performance", BarChart3, "Performance"],
        ].map(([id, Icon, label], index) => (
          <button
            key={id}
            className={`step ${activeView === id ? "active" : ""}`}
            onClick={() => goToView(id)}
            type="button"
          >
            <span>{index + 1}</span>
            <Icon size={18} />
            {label}
          </button>
        ))}
      </section>

      <section className="workspace">
        <aside className="control-panel">
          <div className="panel-title">
            <Boxes size={18} />
            Contexto
          </div>
          <label>
            Tienda
            <select value={selectedStore} onChange={(event) => setSelectedStore(event.target.value)}>
              {stores.map((store) => (
                <option key={store}>{store}</option>
              ))}
            </select>
          </label>
          <label>
            Departamento / categoria
            <select value={selectedCategory} onChange={(event) => onCategoryChange(event.target.value)}>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>
            Tipo de mueble
            <select value={fixtureId} onChange={(event) => onFixtureChange(event.target.value)}>
              {fixtureOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.shortName}
                </option>
              ))}
            </select>
          </label>
          <div className="fixture-card">
            <Layers3 size={20} />
            <div>
              <strong>{fixture.name}</strong>
              <span>
                {fixture.width}cm ancho · {fixture.levels} niveles · {fixture.depth}cm profundidad
              </span>
              <span>{fixture.category}</span>
              <span>{fixture.measures}</span>
              <span>{fixture.componentCount} componente(s) del consolidado</span>
            </div>
          </div>
          <div className="quality-list">
            <strong>Guia de captura</strong>
            <span>{capturePlan.summary}</span>
            <span>{fixture.levels} niveles esperados · {fixture.width}cm ancho</span>
            <span>Frente al rack, sin inclinacion fuerte</span>
            <span>Evitar reflejos en galones, latas y empaques brillantes</span>
          </div>
        </aside>

        <section className="main-panel">
          <div className="screen-head">
            <span>{screenMeta[activeView].label}</span>
            <strong>{screenMeta[activeView].title}</strong>
            <p>{screenMeta[activeView].description}</p>
          </div>
          <div key={activeView} className="screen-shell">
            {activeView === "capture" && (
              <CaptureView
                photo={activeCapturePhoto}
                capturePlan={capturePlan}
                capturePhotos={capturePhotos}
                activeCaptureIndex={activeCaptureIndex}
                selectedFixture={fixture}
                captureReady={captureReady}
                capturedReadyCount={capturedReadyCount}
                photoQuality={photoQuality}
                processing={processing}
                onTakePhoto={() => requestPhoto({ reset: false })}
                onRetake={retakeActiveCapture}
                onNextCapture={moveToNextCapture}
                onSelectCapture={selectCaptureSlot}
                runPipeline={runPipeline}
              />
            )}
            {activeView === "review" && (
              <ReviewView
                rows={rows}
                photo={activeCapturePhoto}
                capturePhotos={capturePhotos}
                photoQuality={photoQuality}
                processing={processing}
                demoMode={demoMode}
                agentMode={agentMode}
                avgConfidence={avgConfidence}
                matchedItems={matchedItems.length}
                totalItems={allItems.length}
                openProduct={(product) => openProductPreview(product, "construction")}
                onRetake={() => requestPhoto({ reset: true })}
                onDemo={() => runPipeline({ forceDemo: true })}
                onContinue={() => goToView("editor")}
              />
            )}
            {activeView === "editor" && (
              <EditorView
                rows={rows}
                selectedCell={selectedCell}
                setSelectedCell={setSelectedCell}
                assignProduct={assignProduct}
                addFacing={addFacing}
                removeFacing={removeFacing}
                duplicateSelected={duplicateSelected}
                activeSelection={activeSelection}
                query={query}
                setQuery={setQuery}
                filteredProducts={visibleProducts}
                totalFilteredProducts={filteredProducts.length}
                savePlanogram={savePlanogram}
                exportJson={exportJson}
                exportCsv={exportCsv}
                savedAt={savedAt}
                openProduct={(product) => openProductPreview(product, "construction")}
              />
            )}
          {activeView === "performance" && (
            <PerformanceView
              rows={rows}
              selectedStore={selectedStore}
              selectedCategory={selectedCategory}
              fixture={fixture}
              openProduct={(product) => openProductPreview(product, "performance")}
            />
          )}
          </div>
        </section>
      </section>
      {previewProduct && (
        <ProductPreview
          product={previewProduct}
          mode={previewMode}
          selectedCategory={selectedCategory}
          onClose={() => setPreviewProduct(null)}
        />
      )}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </main>
  );
}

function CaptureView({
  photo,
  capturePlan,
  capturePhotos,
  activeCaptureIndex,
  selectedFixture,
  captureReady,
  capturedReadyCount,
  photoQuality,
  processing,
  onTakePhoto,
  onRetake,
  onNextCapture,
  onSelectCapture,
  runPipeline,
}) {
  const activeSlot = capturePlan.slots[activeCaptureIndex];
  const activeCapture = capturePhotos[activeCaptureIndex];
  const canMoveNext = Boolean(activeCapture?.quality?.planogramReady) && activeCaptureIndex < capturePlan.requiredPhotos - 1;
  return (
    <div className="capture-grid">
      <div className="camera-stage">
        {photo ? (
          <img src={photo} alt="Foto cargada del mueble" />
        ) : (
          <div className="camera-placeholder">
            <Camera size={48} />
            <strong>Levanta el rack automotriz desde un telefono normal</strong>
            <span>La app valida encuadre, luminosidad, etiquetas visibles y distancia antes de enviar a IA.</span>
          </div>
        )}
        <div className="capture-overlay">
          <strong>{activeSlot.label}</strong>
          <span>{activeSlot.instruction}</span>
          <small>
            {selectedFixture.width}cm ancho · {selectedFixture.levels} niveles · {selectedFixture.depth}cm profundidad
          </small>
        </div>
        <div className="capture-rules">
          <span>Incluye todos los niveles</span>
          <span>Manten el telefono frontal</span>
          <span>Evita inclinacion</span>
          <span>No tomes producto individual</span>
        </div>
        <div className="frame-guide">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="capture-actions">
        <h2>Captura guiada</h2>
        <p>
          {capturePlan.summary} El agente usara estas fotos contra el catalogo Autos/VTEX para proponer sku,
          facings y alternativas.
        </p>
        <div className="capture-modules">
          {capturePlan.slots.map((slot, index) => {
            const captured = capturePhotos[index];
            const ready = captured?.quality?.planogramReady;
            return (
              <button
                key={slot.id}
                className={`module-chip ${index === activeCaptureIndex ? "active" : ""} ${ready ? "ready" : ""}`}
                onClick={() => onSelectCapture(index)}
                type="button"
              >
                <span>{index + 1}</span>
                {slot.shortLabel}
              </button>
            );
          })}
        </div>
        <button className="primary" onClick={photo ? onRetake : onTakePhoto} type="button">
          <ImagePlus size={18} />
          {photo ? "Tomar otra" : "Tomar foto"}
        </button>
        {canMoveNext && (
          <button className="secondary" onClick={onNextCapture} type="button">
            <ChevronRight size={18} />
            Foto siguiente modulo
          </button>
        )}
        <button
          className="secondary"
          onClick={() => runPipeline({ hasPhoto: captureReady })}
          disabled={processing || !captureReady}
          type="button"
        >
          <Wand2 size={18} />
          Usar esta foto
        </button>
        <button className="secondary" onClick={() => runPipeline({ forceDemo: true })} disabled={processing} type="button">
          <Sparkles size={18} />
          Usar modo demo
        </button>
        <div className="checklist">
          {photoQuality && <PhotoQualityCard quality={photoQuality} />}
          <span>
            <CheckCircle2 size={16} /> Calidad minima de imagen
          </span>
          <span>
            <CheckCircle2 size={16} /> {capturedReadyCount}/{capturePlan.requiredPhotos} foto(s) requeridas
          </span>
          <span>
            <CheckCircle2 size={16} />{" "}
            {AGENT_WEBHOOK_URL
              ? "Agente de vision conectado: compara empaque y texto visible contra catalogo"
              : "Agente de vision en construccion: la propuesta actual es simulada"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ReviewView({
  rows,
  photo,
  capturePhotos,
  photoQuality,
  processing,
  demoMode,
  agentMode,
  avgConfidence,
  matchedItems,
  totalItems,
  openProduct,
  onRetake,
  onDemo,
  onContinue,
}) {
  const blockedByPhoto = photoQuality?.planogramReady === false && !demoMode && !processing;
  return (
    <div className="review-layout">
      <div className="review-preview">
        <ReviewShelf
          rows={rows}
          photo={photo}
          capturePhotos={capturePhotos}
          blockedByPhoto={blockedByPhoto}
          demoMode={demoMode}
          agentMode={agentMode}
          openProduct={openProduct}
          onRetake={onRetake}
          onDemo={onDemo}
        />
        {processing && (
          <div className="processing">
            <Sparkles size={24} />
            Analizando anaquel...
          </div>
        )}
      </div>
      <div className="review-results">
        {photoQuality && <PhotoQualityCard quality={photoQuality} />}
        {demoMode && (
          <div className="demo-disclaimer">
            <Sparkles size={18} />
            <span>Modo demo: los productos vienen del catalogo Autos.xlsx; no fueron reconocidos por la foto.</span>
          </div>
        )}
        {!demoMode && !blockedByPhoto && (
          <div className={agentMode ? "agent-disclaimer" : "demo-disclaimer"}>
            <Wand2 size={18} />
            <span>
              {agentMode
                ? "Agente de vision: analizo tus fotos contra el catalogo filtrado y propuso sku, facings y candidatos alternos. Revisa y corrige antes de guardar."
                : "Propuesta simulada: estos productos salen del catalogo filtrado, NO fueron reconocidos en tu foto. El agente real de vision esta en construccion."}
            </span>
          </div>
        )}
        {!blockedByPhoto && (
          <>
            <div className="metric-row">
              <Metric icon={Gauge} label="Confianza promedio" value={`${avgConfidence}%`} />
              <Metric icon={PackageCheck} label="sku con match" value={`${matchedItems}/${totalItems}`} />
              <Metric icon={AlertTriangle} label="Revision humana" value={totalItems - matchedItems} />
            </div>
            <div className="detected-list">
              {rows.map((row) => (
                <div key={row.id} className="detected-row">
                  <div>
                    <strong>{row.name}</strong>
                    <span>{row.confidence}% nivel</span>
                  </div>
                  <div className="mini-products">
                    {row.items.map((item) => (
                      <div key={item.id} className={`mini-match ${item.confidence < 70 ? "needs-review" : ""}`}>
                        <ProductPack product={item.sku ? findProduct(item.sku) : null} compact />
                        <small>{item.confidence < 70 ? "Revisar" : `${item.confidence}%`}</small>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button className="primary wide" onClick={onContinue} type="button">
              Abrir editor
              <ChevronRight size={18} />
            </button>
          </>
        )}
        {blockedByPhoto && (
          <div className="review-results-empty">
            <strong>No hay detecciones que revisar</strong>
            <span>
              Esta foto no muestra suficiente contexto de rack, niveles o surtido. Para probar captura real, toma el
              mueble de frente; para ensenar el flujo, usa modo demo.
            </span>
            <div className="review-actions">
              <button className="primary" onClick={onRetake} type="button">
                <Camera size={18} />
                Tomar otra foto
              </button>
              <button className="secondary" onClick={onDemo} type="button">
                <Sparkles size={18} />
                Usar modo demo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoQualityCard({ quality }) {
  const Icon = quality.status === "ok" ? CheckCircle2 : AlertTriangle;
  return (
    <div className={`photo-quality ${quality.status}`}>
      <Icon size={18} />
      <div>
        <strong>{quality.title}</strong>
        <span>{quality.message}</span>
        {quality.checks?.length > 0 && (
          <div className="quality-checks">
            {quality.checks.map((check) => (
              <small key={check.label} className={check.ok ? "pass" : "fail"}>
                {check.label}: {check.value}
              </small>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewShelf({ rows, photo, capturePhotos = [], blockedByPhoto, demoMode, agentMode, openProduct, onRetake, onDemo }) {
  const visibleCaptures = capturePhotos.filter(Boolean);
  return (
    <div className="review-shelf-stage">
      {visibleCaptures.length > 0 ? (
        <div className="captured-modules">
          {visibleCaptures.map((capture) => (
            <div key={capture.id} className="captured-module">
              <img src={capture.dataUrl} alt={capture.label} />
              <div>
                <strong>{capture.label}</strong>
                <span>{capture.quality?.planogramReady ? "Apta para agente" : "Revisar foto"}</span>
              </div>
            </div>
          ))}
          <button className="secondary small-retake" onClick={onRetake} type="button">
            <Camera size={16} />
            Tomar otra
          </button>
        </div>
      ) : photo ? (
        <div className="captured-photo-strip">
          <img src={photo} alt="Foto del levantamiento" />
          <div>
            <strong>Foto capturada</strong>
            <span>
              {blockedByPhoto
                ? "Esta imagen queda como referencia, pero no genera detecciones."
                : "Imagen original usada como referencia; el realogram se muestra separado abajo."}
            </span>
          </div>
          <button className="secondary small-retake" onClick={onRetake} type="button">
            <Camera size={16} />
            Tomar otra
          </button>
        </div>
      ) : null}
      {blockedByPhoto ? (
        <div className="review-blocker">
          <AlertTriangle size={34} />
          <div>
            <strong>Necesitamos una foto del mueble, no de un producto aislado</strong>
            <span>
              Para que el sistema pueda proponer un planograma debe ver niveles, separaciones, productos repetidos y
              ubicacion relativa. Si la foto es de un solo articulo, no hay informacion suficiente para saber donde va.
            </span>
          </div>
          <div className="review-actions">
            <button className="primary" onClick={onRetake} type="button">
              <Camera size={18} />
              Tomar otra foto
            </button>
            <button className="secondary" onClick={onDemo} type="button">
              <Sparkles size={18} />
              Usar modo demo
            </button>
          </div>
        </div>
      ) : (
        <div className="review-realogram">
          <div className="review-realogram-header">
            <strong>{demoMode ? "Realogram demo" : agentMode ? "Realogram detectado" : "Propuesta simulada"}</strong>
            <span>
              {demoMode
                ? "Simulado con catalogo para ensenar el flujo"
                : agentMode
                  ? "Detectado por el agente de vision; revisa y corrige por nivel"
                  : "Generada del catalogo, sin reconocimiento real de la foto"}
            </span>
          </div>
          <div className="review-shelf">
            {rows.map((row) => (
              <div key={row.id} className="review-shelf-row">
                <span>{row.name}</span>
                <div className="review-shelf-products">
                  {row.items.map((item) => {
                    const product = item.sku ? findProduct(item.sku) : null;
                    return (
                      <button
                        key={item.id}
                        className="review-product-group"
                        style={{ "--facings": item.facings }}
                        onClick={() => product && openProduct(product)}
                        disabled={!product}
                        type="button"
                      >
                        {Array.from({ length: item.facings }).map((_, index) => (
                          <ProductPack key={index} product={product} compact />
                        ))}
                        <small>{item.confidence}%</small>
                        {item.confidence < 70 && <em>Revisar</em>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EditorView({
  rows,
  selectedCell,
  setSelectedCell,
  assignProduct,
  addFacing,
  removeFacing,
  duplicateSelected,
  activeSelection,
  query,
  setQuery,
  filteredProducts,
  totalFilteredProducts,
  savePlanogram,
  exportJson,
  exportCsv,
  savedAt,
  openProduct,
}) {
  return (
    <div className="editor-layout">
      <div className="planogram-surface">
        <div className="editor-toolbar">
          <div>
            <h2>Planograma editable</h2>
          <p>Selecciona un producto para corregir sku, facings o duplicarlo.</p>
          </div>
          <div className="toolbar-actions">
            <button className="icon-btn" onClick={removeFacing} title="Quitar facing" type="button">
              <Minus size={18} />
            </button>
            <button className="icon-btn" onClick={addFacing} title="Agregar facing" type="button">
              <Plus size={18} />
            </button>
            <button className="icon-btn" onClick={duplicateSelected} title="Duplicar producto" type="button">
              <Replace size={18} />
            </button>
            <button className="icon-btn" onClick={exportJson} title="Exportar JSON" type="button">
              <FileJson size={18} />
            </button>
            <button className="icon-btn" onClick={exportCsv} title="Exportar CSV" type="button">
              <Download size={18} />
            </button>
            <button className="primary small" onClick={savePlanogram} type="button">
              <Save size={16} />
              Guardar
            </button>
          </div>
        </div>
        <div className="shelf">
          {rows.map((row) => (
            <div key={row.id} className="shelf-row">
              <div className="row-label">
                <GripVertical size={16} />
                {row.name}
              </div>
              <div className="row-items">
                {row.items.map((item) => {
                  const product = item.sku ? findProduct(item.sku) : null;
                  const active = selectedCell?.itemId === item.id;
                  return (
                    <button
                      key={item.id}
                      className={`planogram-cell ${active ? "selected" : ""}`}
                      style={{ "--facings": item.facings }}
                      onClick={() => {
                        setSelectedCell({ rowId: row.id, itemId: item.id });
                        if (product) openProduct(product);
                      }}
                      type="button"
                    >
                      {Array.from({ length: item.facings }).map((_, index) => (
                        <ProductPack key={index} product={product} compact />
                      ))}
                      <span className={`confidence ${item.confidence < 70 ? "low" : ""}`}>{item.confidence}%</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {savedAt && <div className="saved-note">Guardado localmente: {savedAt}</div>}
      </div>

      <aside className="catalog-panel">
        <h3>Catalogo Autos.xlsx · Vehiculos</h3>
        <div className="search-box">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar sku, GTIN, marca"
          />
        </div>
        <div className="catalog-count">
          Mostrando {filteredProducts.length} de {totalFilteredProducts.toLocaleString("es-GT")} productos
        </div>
        <div className="selection-card">
          <strong>Seleccion actual</strong>
          {activeSelection ? (
            <span>
              {activeSelection.sku || "Sin sku"} · {activeSelection.facings} facings · {activeSelection.source}
            </span>
          ) : (
            <span>Selecciona una celda del planograma</span>
          )}
        </div>
        <div className="catalog-list">
          {filteredProducts.map((product) => (
            <button key={product.sku} className="catalog-item" onClick={() => assignProduct(product.sku)} type="button">
              <ProductPack product={product} compact />
              <div>
                <strong>{product.name}</strong>
                <span>
                  {product.sku} · UPC {product.gtin || "sin dato"}
                </span>
                <small>
                  Q{product.price.toFixed(2)} · {product.level3 || product.category}
                </small>
                <small>{product.dimensionText || `${product.width}x${product.height}x${product.depth} ${product.dimensionUnit}`}</small>
              </div>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

function PerformanceView({ rows, selectedStore, selectedCategory, fixture, openProduct }) {
  const performance = getPlanogramPerformance(rows);
  const { items, totals, alerts } = performance;
  const topProducts = [...items].sort((a, b) => b.performance.salesAmount - a.performance.salesAmount).slice(0, 8);
  const conversion = Number(((totals.ecommerceUnits / Math.max(totals.ecommerceVisits, 1)) * 100).toFixed(1));
  const storeBenchmarks = [
    ["Cemaco Pradera", 100],
    ["Cemaco Zona 10", 93],
    ["Cemaco Cayala", 88],
    ["Cemaco Peri-Roosevelt", 81],
  ].map(([store, index]) => ({
    store,
    index,
    units: Math.round(totals.storeUnits * (index / 100)),
    online: Math.round(totals.ecommerceUnits * ((index + 8) / 100)),
  }));

  return (
    <div className="performance-layout">
      <section className="performance-main">
        <div className="performance-header">
          <div>
            <h2>Dashboard del planograma</h2>
            <p>
              Vista demo para decidir facings, alertas de inventario y oportunidad ecommerce por sku detectado.
            </p>
          </div>
          <div className="data-flow">
            <span>BI/POS</span>
            <ChevronRight size={14} />
            <span>n8n</span>
            <ChevronRight size={14} />
            <span>VTEX</span>
            <ChevronRight size={14} />
            <span>Planograma</span>
          </div>
        </div>

        <div className="performance-kpis">
          <Metric icon={Store} label="Ventas tienda 30d" value={totals.storeUnits.toLocaleString("es-GT")} />
          <Metric icon={ShoppingCart} label="Ventas ecommerce 30d" value={totals.ecommerceUnits.toLocaleString("es-GT")} />
          <Metric icon={Eye} label="Visitas ecommerce" value={totals.ecommerceVisits.toLocaleString("es-GT")} />
          <Metric icon={Activity} label="Conversion online" value={`${conversion}%`} />
        </div>

        <div className="heatmap-card">
          <div className="heatmap-title">
            <strong>Mapa de calor comercial</strong>
            <span>{selectedStore} · {fixture.name} · {selectedCategory}</span>
          </div>
          <div className="performance-shelf">
            {rows.map((row, rowIndex) => (
              <div key={row.id} className="performance-row">
                <span>{row.name}</span>
                <div className="performance-items">
                  {row.items.map((item, itemIndex) => {
                    const product = item.sku ? findProduct(item.sku) : null;
                    const perf = getProductPerformance(product, item.facings, rowIndex * 10 + itemIndex);
                    const intensity = perf ? Math.min(1, perf.salesPerFacing / 44) : 0;
                    return (
                      <button
                        key={item.id}
                        className={`performance-cell ${perf?.alert === "Riesgo de quiebre" ? "danger" : ""}`}
                        style={{ "--heat": intensity }}
                        onClick={() => product && openProduct(product)}
                        disabled={!product}
                        type="button"
                      >
                        <ProductPack product={product} compact />
                        <small>{perf ? `${perf.salesPerFacing} u/facing` : "sin dato"}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <aside className="performance-side">
        <div className="alerts-card">
          <h3>Alertas sugeridas</h3>
          {alerts.map((item) => (
            <div key={item.id} className="alert-item">
              <AlertTriangle size={16} />
              <div>
                <strong>{item.performance.alert}</strong>
                <span>{item.product.name}</span>
                <small>
                  Inv. {item.performance.inventory} · Tienda {item.performance.storeUnits}u · Online{" "}
                  {item.performance.ecommerceUnits}u
                </small>
              </div>
            </div>
          ))}
        </div>

        <div className="rank-card">
          <h3>Top productos del mueble</h3>
          {topProducts.map((item) => (
            <div key={item.id} className="rank-item">
              <ProductPack product={item.product} compact />
              <div>
                <strong>{item.product.name}</strong>
                <span>Q{item.performance.salesAmount.toLocaleString("es-GT")} · {item.product.sku}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="store-card">
          <h3>Performance por tienda</h3>
          {storeBenchmarks.map((store) => (
            <div key={store.store} className={`store-row ${store.store === selectedStore ? "active" : ""}`}>
              <span>{store.store}</span>
              <strong>{store.units}u</strong>
              <small>{store.online} online</small>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="metric">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProductPreview({ product, mode = "construction", selectedCategory, onClose }) {
  const showPerformance = mode === "performance";
  const performance = getProductPerformance(product);
  const alternatives = getAgentCandidates(product, selectedCategory);
  const bestStoreIndex = (skuSeed(product) % 4);
  const bestStores = ["Cemaco Pradera", "Cemaco Zona 10", "Cemaco Cayala", "Cemaco Peri-Roosevelt"];
  const bestStore = bestStores[bestStoreIndex];
  return (
    <div className="preview-backdrop" role="dialog" aria-modal="true" aria-label={`Detalle de ${product.name}`}>
      <button className="preview-scrim" onClick={onClose} type="button" aria-label="Cerrar detalle" />
      <section className="preview-card">
        <button className="preview-close" onClick={onClose} type="button" aria-label="Cerrar">
          ×
        </button>
        <div className="preview-image">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} />
          ) : (
            <ProductPack product={product} />
          )}
        </div>
        <div className="preview-info">
          <span className="preview-category">{product.level2 || product.category}</span>
          <h2>{product.name}</h2>
          <dl>
            <div>
              <dt>sku</dt>
              <dd>{product.sku}</dd>
            </div>
            <div>
              <dt>Codigo original</dt>
              <dd>{product.rawSku}</dd>
            </div>
            <div>
              <dt>UPC</dt>
              <dd>{product.gtin || "Sin dato"}</dd>
            </div>
            <div>
              <dt>Precio</dt>
              <dd>Q{product.price.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Categoria</dt>
              <dd>{product.level3 || product.erpSubcategory || product.category}</dd>
            </div>
            <div>
              <dt>Dimensiones</dt>
              <dd>{product.dimensionText || `${product.width}x${product.height}x${product.depth} ${product.dimensionUnit}`}</dd>
            </div>
          </dl>
          {product.details && <p>{product.details}</p>}
          {!showPerformance && (
            <div className="preview-construction-note">
              <Layers3 size={18} />
              <div>
                <strong>Datos para construir planograma</strong>
                <span>
                  Esta vista se limita a catalogo, imagen oficial, identificadores y dimensiones. Las ventas estan en
                  el tab Performance.
                </span>
              </div>
            </div>
          )}
          {!showPerformance && alternatives.length > 0 && (
            <div className="preview-alternatives">
              <div className="preview-performance-title">
                <Wand2 size={18} />
                <strong>Candidatos alternos del agente</strong>
                <span>Match asistido</span>
              </div>
              {alternatives.map((candidate) => {
                const candidateProduct = findProduct(candidate.sku);
                return (
                  <div key={candidate.sku} className="alternative-item">
                    <ProductPack product={candidateProduct} compact />
                    <div>
                      <strong>{candidateProduct?.name || candidate.name}</strong>
                      <span>{candidate.sku} · {candidate.confidence}% confianza</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {showPerformance && performance && (
            <div className="preview-performance">
              <div className="preview-performance-title">
                <TrendingUp size={18} />
                <strong>Performance del sku</strong>
                <span>Datos demo 30 dias</span>
              </div>
              <div className="preview-perf-grid">
                <div>
                  <dt>Ventas tienda</dt>
                  <dd>{performance.storeUnits} unidades</dd>
                </div>
                <div>
                  <dt>Ventas online</dt>
                  <dd>{performance.ecommerceUnits} unidades</dd>
                </div>
                <div>
                  <dt>Visitas ecommerce</dt>
                  <dd>{performance.ecommerceVisits.toLocaleString("es-GT")}</dd>
                </div>
                <div>
                  <dt>Conversion online</dt>
                  <dd>{performance.conversion}%</dd>
                </div>
                <div>
                  <dt>Inventario actual</dt>
                  <dd>{performance.inventory} unidades</dd>
                </div>
                <div>
                  <dt>Dias inventario</dt>
                  <dd>{performance.daysInventory} dias</dd>
                </div>
                <div>
                  <dt>Venta por facing</dt>
                  <dd>{performance.salesPerFacing} u/facing</dd>
                </div>
                <div>
                  <dt>Mejor tienda</dt>
                  <dd>{bestStore}</dd>
                </div>
              </div>
              <div className={`preview-alert ${performance.alert === "Riesgo de quiebre" ? "danger" : ""}`}>
                <AlertTriangle size={17} />
                <span>{performance.alert}</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
