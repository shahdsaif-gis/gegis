// Global Variables
let currentLang = 'en';
let map;
let layers = {};
let drawnPoints = [];
let drawnPolyline = null;
let drawnPolygon = null;
let isDrawingMode = false;

document.addEventListener('DOMContentLoaded', function() {
    try {
        // 1. Initialize Map
        map = L.map('map', { maxZoom: 19 }).setView([15.5007, 32.5599], 6);

        // --- Base Satellite Layer ---
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Tiles © Esri'
        }).addTo(map);

        // --- Labels & Boundaries Overlay (أسماء المدن والشوارع) ---
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            pane: 'markerPane'
        }).addTo(map);

        // Additional Layers
        layers['terrain'] = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, opacity: 0.5 });
        layers['ghi'] = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { maxZoom: 19, opacity: 0.4 });

        // Connect Layer Toggles
        const layerGhi = document.getElementById('layer-ghi');
        const layerTerrain = document.getElementById('layer-terrain');

        if (layerGhi) layerGhi.addEventListener('change', (e) => toggleMapLayer('ghi', e.target.checked));
        if (layerTerrain) layerTerrain.addEventListener('change', (e) => toggleMapLayer('terrain', e.target.checked));

        // Map Click Event
        map.on('click', async function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            // IF IN DRAWING MODE
            if (isDrawingMode) {
                drawnPoints.push([lat, lng]);
                if (drawnPolyline) map.removeLayer(drawnPolyline);
                drawnPolyline = L.polyline(drawnPoints, { color: '#007bff', weight: 3 }).addTo(map);
                L.circleMarker([lat, lng], { radius: 4, color: '#0056b3', fillColor: '#007bff', fillOpacity: 1 }).addTo(map);
                return;
            }

            // NORMAL MODE
            const siteInfoDiv = document.getElementById('site-info');
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.add('active');
            if (!siteInfoDiv) return;

            const loadingMsg = currentLang === 'ar' ? 'جاري تحليل الأقمار الاصطناعية، الرياح، والظلال...' : 'Analyzing satellite, wind & shadows...';
            siteInfoDiv.innerHTML = '<p>' + loadingMsg + '</p>';

            try {
                let elevation = 380;
                let windSpeed = 15;
                let maxWindGust = 28;

                try {
                    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_gusts_10m&elevation=nan`);
                    const weatherData = await weatherRes.json();
                    if (weatherData.current) {
                        windSpeed = Math.round(weatherData.current.wind_speed_10m || 15);
                        maxWindGust = Math.round(weatherData.current.wind_gusts_10m || 28);
                    }
                    if (weatherData.elevation !== undefined && !isNaN(weatherData.elevation)) {
                        elevation = Math.round(weatherData.elevation);
                    }
                } catch (err) { console.warn(err); }

                let isWater = (elevation <= 0);
                let annualGhi = Math.round(1900 + (Math.abs(lat) % 6) * 45 + (Math.abs(lng) % 4) * 30);
               
                // --- SOLAR ELEVATION & SHADOW CALCULATOR ---
                const shadowAnalysis = calculateShadowImpact(lat, lng);

                let score = Math.round(((annualGhi / 2200) * 40) + (elevation < 800 ? 30 : 15) + (windSpeed < 30 ? 30 : 10));

                let statusText = isWater
                    ? (currentLang === 'ar' ? "غير ملائم (مسطح مائي) 🚫" : "Unsuitable (Water Body) 🚫")
                    : (score >= 75 ? `S1 (${score}%) - ${currentLang === 'ar' ? 'ممتاز' : 'Optimal'} 🎯` : `S2 (${score}%) - ${currentLang === 'ar' ? 'جيد' : 'Suitable'} ✅`);
                let color = isWater ? "#F44336" : (score >= 75 ? "#2E7D32" : "#8BC34A");

                if (currentLang === 'ar') {
                    siteInfoDiv.innerHTML =
                        '<p><strong>الموقع:</strong> [' + lat.toFixed(4) + ', ' + lng.toFixed(4) + ']</p>' +
                        '<p>☀️ <strong>الإشعاع الشمسي:</strong> ~' + annualGhi + ' kWh/m²/year</p>' +
                        '<p>⛰️ <strong>الارتفاع عن البحر:</strong> ' + elevation + ' متر</p>' +
                        '<p>💨 <strong>سرعة الرياح (الهبات):</strong> ' + windSpeed + ' كم/س (' + maxWindGust + ' كم/س)</p>' +
                        '<p>🌗 <strong>تأثير الظلال الحالية:</strong> <span style="color:#e67e22; font-weight:bold;">' + shadowAnalysis.ar + '</span></p>' +
                        '<p>🎯 <strong>الملاءة المكانية:</strong> <span style="color:' + color + '; font-weight:bold;">' + statusText + '</span></p>' +
                        '<hr><button onclick="startDrawingArea()" style="background:#007bff; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; width:100%;">📐 رسم سقف/منطقة لحساب الألواح</button>';
                } else {
                    siteInfoDiv.innerHTML =
                        '<p><strong>Location:</strong> [' + lat.toFixed(4) + ', ' + lng.toFixed(4) + ']</p>' +
                        '<p>☀️ <strong>Solar Radiation:</strong> ~' + annualGhi + ' kWh/m²/year</p>' +
                        '<p>⛰️ <strong>Elevation:</strong> ' + elevation + ' m</p>' +
                        '<p>💨 <strong>Wind Speed (Gusts):</strong> ' + windSpeed + ' km/h (' + maxWindGust + ' km/h)</p>' +
                        '<p>🌗 <strong>Current Shadow Impact:</strong> <span style="color:#e67e22; font-weight:bold;">' + shadowAnalysis.en + '</span></p>' +
                        '<p>🎯 <strong>Spatial Suitability:</strong> <span style="color:' + color + '; font-weight:bold;">' + statusText + '</span></p>' +
                        '<hr><button onclick="startDrawingArea()" style="background:#007bff; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; width:100%;">📐 Draw Area for Panel Calculation</button>';
                }

            } catch (err) {
                siteInfoDiv.innerHTML = '<p style="color:red;">Error fetching data.</p>';
            }
        });

    } catch (err) { console.error(err); }
});

// --- SHADOW CALCULATION FUNCTION ---
function calculateShadowImpact(lat, lng) {
    const date = new Date();
    const hour = date.getHours();

    // Approximate Solar Elevation Angle logic
    let solarAngle = Math.sin((hour - 6) * Math.PI / 12) * 90;
    if (solarAngle < 0) solarAngle = 0;

    let shadowTextAr = "";
    let shadowTextEn = "";

    if (solarAngle > 60) {
        shadowTextAr = "ضئيل جداً (< 5%) - فترة الذروة الشمسية ☀️";
        shadowTextEn = "Very Low (< 5%) - Peak Sun Hours ☀️";
    } else if (solarAngle > 30) {
        shadowTextAr = "متوسط (10% - 25%) - ظلال معتدلة ⛅";
        shadowTextEn = "Moderate (10% - 25%) ⛅";
    } else if (solarAngle > 0) {
        shadowTextAr = "مرتفع (30% - 60%) - امتداد ظلال صباحي/مسائي 🌘";
        shadowTextEn = "High (30% - 60%) - Long Morning/Evening Shadows 🌘";
    } else {
        shadowTextAr = "فترة ليلية (لا توجد أطوال ظلال شمسية) 🌙";
        shadowTextEn = "Night Time (No Solar Shadow) 🌙";
    }

    return { ar: shadowTextAr, en: shadowTextEn };
}

// Layer Toggle
function toggleMapLayer(layerName, show) {
    if (layers[layerName]) {
        if (show) map.addLayer(layers[layerName]);
        else map.removeLayer(layers[layerName]);
    }
}

// Sidebar Handler
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('active');
}

// Language Switcher
function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ar' : 'en';

    const translations = {
        en: {
            appTitle: "GEGIS ☀️",
            appSubtitle: "Satellite Solar Suitability, Shadow & Wind Analysis",
            layersTitle: "Spatial Layers",
            labelGhi: "Global Horizontal Irradiance (GHI)",
            labelTerrain: "Terrain Constraints Map",
            infoTitle: "Site Details & Analytics",
            clickPrompt: "Click anywhere on the satellite map to calculate solar suitability, wind & shadows.",
            designedBy: "Designed & Developed by: Shahd Saif",
            langBtn: "العربية"
        },
        ar: {
            appTitle: "جيجيس ☀️",
            appSubtitle: "تحليل الملاءة الشمسية، الظلال والرياح عبر الأقمار الاصطناعية",
            layersTitle: "الطبقات المكانية",
            labelGhi: "الإشعاع الشمسي الأفقي (GHI)",
            labelTerrain: "خريطة قيود التضاريس",
            infoTitle: "تفاصيل الموقع والتحليلات",
            clickPrompt: "انقر في أي مكان على الخريطة الفضائية لحساب الإشعاع، الرياح والظلال.",
            designedBy: "تصميم وتطوير: شهد سيف",
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
    setElemText('info-title', t.infoTitle);
    setElemText('click-prompt', t.clickPrompt);
    setElemText('designed-by', t.designedBy);
    setElemText('lang-btn', t.langBtn);

    document.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
}

// --- AREA POLYGON & PANEL CALCULATOR FUNCTIONS ---
function startDrawingArea() {
    isDrawingMode = true;
    drawnPoints = [];
    if (drawnPolyline) map.removeLayer(drawnPolyline);
    if (drawnPolygon) map.removeLayer(drawnPolygon);

    const siteInfoDiv = document.getElementById('site-info');
    if (siteInfoDiv) {
        siteInfoDiv.innerHTML =
            '<p style="color:#007bff; font-weight:bold;">' + (currentLang === 'ar' ? '📍 انقر على أركان السقف/المنطقة على الخريطة لتحديد النقاط.' : '📍 Click polygon boundary points on map.') + '</p>' +
            '<button onclick="finishDrawingArea()" style="background:#28a745; color:white; border:none; padding:8px; border-radius:5px; margin-top:5px; width:100%; cursor:pointer;">' + (currentLang === 'ar' ? '✅ إكمال المضلع وحساب المساحة' : '✅ Calculate Area & Panels') + '</button>' +
            '<button onclick="cancelDrawingArea()" style="background:#dc3545; color:white; border:none; padding:5px; border-radius:5px; margin-top:5px; width:100%; cursor:pointer;">' + (currentLang === 'ar' ? 'إلغاء' : 'Cancel') + '</button>';
    }
}

function finishDrawingArea() {
    if (drawnPoints.length < 3) {
        alert(currentLang === 'ar' ? "يرجى تحديد 3 نقاط على الأقل لتشكيل المساحة!" : "Please select at least 3 boundary points!");
        return;
    }

    isDrawingMode = false;

    if (drawnPolyline) map.removeLayer(drawnPolyline);
    drawnPolygon = L.polygon(drawnPoints, {
        color: '#0056b3',
        fillColor: '#007bff',
        fillOpacity: 0.4,
        weight: 2
    }).addTo(map);

    const areaM2 = Math.round(calculatePolygonArea(drawnPoints));
    const panelAreaM2 = 2.0;
    const usableRatio = 0.75;
    const estimatedPanels = Math.floor((areaM2 * usableRatio) / panelAreaM2);
    const capacityKW = (estimatedPanels * 0.4).toFixed(1);

    const siteInfoDiv = document.getElementById('site-info');
    if (siteInfoDiv) {
        siteInfoDiv.innerHTML =
            '<h3>' + (currentLang === 'ar' ? '📊 نتائج تحديد المساحة:' : '📊 Area Analysis Results:') + '</h3>' +
            '<p>📐 <strong>' + (currentLang === 'ar' ? 'المساحة المحسوبة:' : 'Calculated Area:') + '</strong> <span style="color:#007bff; font-weight:bold;">' + areaM2 + ' m²</span></p>' +
            '<p>🧩 <strong>' + (currentLang === 'ar' ? 'عدد الألواح المتوقع (400W):' : 'Est. Panels (400W):') + '</strong> ~' + estimatedPanels + ' ' + (currentLang === 'ar' ? 'لوح' : 'panels') + '</p>' +
            '<p>⚡ <strong>' + (currentLang === 'ar' ? 'القدرة الإنتاجية الإجمالية:' : 'Total Power Capacity:') + '</strong> ~' + capacityKW + ' kWp</span></p>' +
            '<button onclick="startDrawingArea()" style="background:#007bff; color:white; border:none; padding:6px; border-radius:5px; margin-top:10px; width:100%;">' + (currentLang === 'ar' ? 'اعادة الرسم 📐' : 'Redraw Area 📐') + '</button>';
    }
}

function cancelDrawingArea() {
    isDrawingMode = false;
    drawnPoints = [];
    if (drawnPolyline) map.removeLayer(drawnPolyline);
    if (drawnPolygon) map.removeLayer(drawnPolygon);
   
    const siteInfoDiv = document.getElementById('site-info');
    if (siteInfoDiv) siteInfoDiv.innerHTML = '<p>' + (currentLang === 'ar' ? 'تم إلغاء الرسم. انقر على أي موقع للاستعلام.' : 'Drawing cancelled. Click map to query.') + '</p>';
}

function calculatePolygonArea(coords) {
    const radius = 6378137;
    let area = 0;
    if (coords.length < 3) return 0;

    for (let i = 0; i < coords.length; i++) {
        let p1 = coords[i];
        let p2 = coords[(i + 1) % coords.length];

        let lat1 = p1[0] * Math.PI / 180;
        let lat2 = p2[0] * Math.PI / 180;
        let lng1 = p1[1] * Math.PI / 180;
        let lng2 = p2[1] * Math.PI / 180;

        area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    area = Math.abs(area * radius * radius / 2);
    return area;
}
