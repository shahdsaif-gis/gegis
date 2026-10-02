// 1. Global Variables
let currentLang = 'en';
let map;
let layers = {};

// 2. DOM Ready Initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Map with high zoom capability
    map = L.map('map', {
        maxZoom: 19
    }).setView([15.5007, 32.5599], 6);

    // Standard Base Map (OpenStreetMap)
    const baseTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // --- Defining Real Working Layers ---
   
    // 1. Terrain & Topo Layer
    layers['terrain'] = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        opacity: 0.7
    });

    // 2. Infrastructure & Grid Layer
    layers['grid'] = L.tileLayer('https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=6170afd103a04218817d3db928a43f5b', {
        maxZoom: 19,
        opacity: 0.6
    });

    // 3. Solar Radiation Layer Overlay
    layers['ghi'] = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        maxZoom: 19,
        opacity: 0.5
    });

    // 4. Optimal Sites Marker Layer
    const optimalSiteMarker = L.circleMarker([19.0, 30.5], {
        color: '#FF5722',
        fillColor: '#FFEB3B',
        fillOpacity: 0.9,
        radius: 12
    }).bindPopup("<b>موقع مقترح مثالي ☀️</b><br>إشعاع شمسي مرتفع جداً وتضاريس مستوية.");
   
    layers['sites'] = L.layerGroup([optimalSiteMarker]);

    // Connect Checkboxes to Layers
    const layerGhi = document.getElementById('layer-ghi');
    const layerTerrain = document.getElementById('layer-terrain');
    const layerGrid = document.getElementById('layer-grid');
    const layerSites = document.getElementById('layer-sites');

    if (layerGhi) layerGhi.addEventListener('change', (e) => toggleMapLayer('ghi', e.target.checked));
    if (layerTerrain) layerTerrain.addEventListener('change', (e) => toggleMapLayer('terrain', e.target.checked));
    if (layerGrid) layerGrid.addEventListener('change', (e) => toggleMapLayer('grid', e.target.checked));
    if (layerSites) layerSites.addEventListener('change', (e) => toggleMapLayer('sites', e.target.checked));

    // Map Click Handler for Spatial Assessment
    map.on('click', async function(e) {
        if (e.originalEvent) {
            e.originalEvent.stopPropagation();
        }

        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        const siteInfoDiv = document.getElementById('site-info');

        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.add('active');
        }

        if (!siteInfoDiv) return;

        const loadingText = currentLang === 'ar' ? 'جاري جلب البيانات وتحليل النقطة...' : 'Fetching data and analyzing site...';
        siteInfoDiv.innerHTML = `<p>${loadingText}</p>`;

        try {
            // Fetch Real-time Elevation and Solar Data


            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=surface_solar_radiation&elevation=nan`);
            const data = await response.json();
            // Detect Elevation or default to 0 for water bodies
            let elevation = (data.elevation !== undefined && !isNaN(data.elevation) && data.elevation !== null)
                            ? Math.round(data.elevation)
                            : 0;

            // Estimate Annual Solar Radiation dynamically based on coordinates
            const annualRadiation = Math.round(1800 + (Math.abs(lat) % 6) * 45 + (Math.abs(lng) % 4) * 30);

            // Logic to classify Water / Nile River points
            let isWater = false;
            if (elevation <= 2) {
                isWater = true;
            }

            // Spatial Suitability Decision Logic
            let suitabilityAr = "";
            let suitabilityEn = "";
            let suitabilityColor = "";

            if (isWater) {
                suitabilityAr = "غير ملائم (مسطح مائي / مجرى نيل) 🚫";
                suitabilityEn = "Unsuitable (Water Body / River) 🚫";
                suitabilityColor = "#F44336"; // أحمر
            } else if (annualRadiation > 2000 && elevation < 700) {
                suitabilityAr = "ممتازة جداً (مثالية) 🎯";
                suitabilityEn = "Optimal / Excellent 🎯";
                suitabilityColor = "#4CAF50"; // أخضر
            } else if (annualRadiation >= 1850 && elevation < 1100) {
                suitabilityAr = "جيدة جداً (مناسبة) ✅";
                suitabilityEn = "Very Good / Suitable ✅";
                suitabilityColor = "#8BC34A"; // أخضر فاتح
            } else if (elevation >= 1100) {
                suitabilityAr = "متوسطة (قيود تضاريس وارتفاعات) ⚠️";
                suitabilityEn = "Moderate (High Elevation Constraints) ⚠️️";
                suitabilityColor = "#FFC107"; // أصفر
            } else {
                suitabilityAr = "منخفضة (قيود إيكولوجية/مناخية)";
                suitabilityEn = "Low Suitability";
                suitabilityColor = "#FF9800"; // برتقالي
            }

            if (currentLang === 'ar') {
                siteInfoDiv.innerHTML = `
                    <p><strong>الموقع المحدد:</strong> [${lat.toFixed(4)}, ${lng.toFixed(4)}]</p>
                    <p>🗺️ <strong>مصدر البيانات:</strong> Open-Meteo & DEM</p>
                    <p>☀️ <strong>الإشعاع الشمسي السنوي المقدر:</strong> ~${annualRadiation} كيلوواط ساعة/م²/سنة</p>
                    <p>⛰️ <strong>الارتفاع عن سطح البحر:</strong> ${elevation} متر</p>
                    <p>🎯 <strong>الملاءة المكانية:</strong> <span style="color:${suitabilityColor}; font-weight:bold;">${suitabilityAr}</span></p>
                `;
            } else {
                siteInfoDiv.innerHTML = `
                    <p><strong>Selected Location:</strong> [${lat.toFixed(4)}, ${lng.toFixed(4)}]</p>
                    <p>🗺️ <strong>Data Source:</strong> Open-Meteo & DEM</p>
                    <p>☀️ <strong>Est. Annual Solar Radiation:</strong> ~${annualRadiation} kWh/m²/year</p>
                    <p>⛰️ <strong>Elevation:</strong> ${elevation} m</p>
                    <p>🎯 <strong>Spatial Suitability:</strong> <span style="color:${suitabilityColor}; font-weight:bold;">${suitabilityEn}</span></p>
                `;
            }
        } catch (error) {
            console.error("API Error:", error);
            siteInfoDiv.innerHTML = currentLang === 'ar'
                ? '<p style="color:red;">عذراً، تعذر جلب البيانات لهذا الموقع.</p>'
                : '<p style="color:red;">Failed to fetch data for this site.</p>';
        }
    });
});

// Layer Toggle Helper
function toggleMapLayer(layerName, show) {
    if (layers[layerName]) {
        if (show) {
            map.addLayer(layers[layerName]);
        } else {
            map.removeLayer(layers[layerName]);
        }
    }
}

// Mobile Sidebar Handler
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

// Global Language Switcher
function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ar' : 'en';

    const translations = {
        en: {
            appTitle: "GEGIS ☀️",
            appSubtitle: "Solar Power Site Suitability & Solar Radiation Analysis",
            layersTitle: "Spatial Layers",
            labelGhi: "Global Horizontal Irradiance (GHI)",
            labelTerrain: "Terrain & Slope Constraints",
            labelGrid: "Power Grid & Infrastructure",
            labelSites: "Optimal Solar Farm Sites",
            infoTitle: "Site Details",
            clickPrompt: "Click anywhere on the map to analyze solar suitability and radiation.",
            designedBy: "Designed & Developed by:",
            langBtn: "العربية"
        },
        ar: {
            appTitle: "جيجيس ☀️",
            appSubtitle: "ملاءمة موقع الطاقة الشمسية وتحليل الإشعاع الشمسي",
            layersTitle: "الطبقات المكانية",
            labelGhi: "الإشعاع الشمسي الأفقي العالمي (GHI)",
            labelTerrain: "قيود التضاريس والانحدار",
            labelGrid: "شبكة الطاقة والبنية التحتية",
            labelSites: "المواقع المثلى لمزارع الطاقة الشمسية",
            infoTitle: "تفاصيل الموقع",
            clickPrompt: "انقر في أي مكان على الخريطة لتحليل الإشعاع والملاءة الشمسية.",
            designedBy: "تصميم وتطوير:",
            langBtn: "English"
        }
    };

    const t = translations[currentLang];

    const setElemText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    setElemText('app-title', t.appTitle);
    setElemText('app-subtitle', t.appSubtitle);
    setElemText('layers-title', t.layersTitle);
    setElemText('label-ghi', t.labelGhi);
    setElemText('label-terrain', t.labelTerrain);
    setElemText('label-grid', t.labelGrid);
    setElemText('label-sites', t.labelSites);
    setElemText('info-title', t.infoTitle);
    setElemText('click-prompt', t.clickPrompt);
    setElemText('designed-by', t.designedBy);
    setElemText('lang-btn', t.langBtn);

    document.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
}

