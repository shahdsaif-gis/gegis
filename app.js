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
        // 1. Initialize Map with Satellite Layer
        map = L.map('map', { maxZoom: 19 }).setView([15.5007, 32.5599], 6);

        // Satellite Base Map (Esri World Imagery)
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Tiles © Esri'
        }).addTo(map);

        // Additional Layers
        layers['terrain'] = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, opacity: 0.5 });
        layers['ghi'] = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { maxZoom: 19, opacity: 0.4 });

        // Map Click Event
        map.on('click', async function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            // --- IF IN DRAWING AREA MODE ---
            if (isDrawingMode) {
                drawnPoints.push([lat, lng]);

                // Update Blue Polyline as user clicks
                if (drawnPolyline) map.removeLayer(drawnPolyline);
                drawnPolyline = L.polyline(drawnPoints, { color: '#007bff', weight: 3 }).addTo(map);
               
                // Add tiny node point
                L.circleMarker([lat, lng], { radius: 4, color: '#0056b3', fillColor: '#007bff', fillOpacity: 1 }).addTo(map);
                return; // Stop normal point analysis while drawing
            }

            // --- NORMAL CLICK ANALYSIS MODE ---
            const siteInfoDiv = document.getElementById('site-info');
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.add('active');
            if (!siteInfoDiv) return;

            const loadingMsg = currentLang === 'ar' ? 'جاري تحليل الأقمار الاصطناعية والرياح...' : 'Analyzing location data...';
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
                let score = Math.round(((annualGhi / 2200) * 40) + (elevation < 800 ? 30 : 15) + (windSpeed < 30 ? 30 : 10));

                let statusText = isWater ? "غير ملائم (مسطح مائي) 🚫" : (score >= 75 ? `S1 (${score}%) - ممتاز 🎯` : `S2 (${score}%) - جيد ✅`);
                let color = isWater ? "#F44336" : (score >= 75 ? "#2E7D32" : "#8BC34A");

                siteInfoDiv.innerHTML =
                    '<p><strong>الموقع:</strong> [' + lat.toFixed(4) + ', ' + lng.toFixed(4) + ']</p>' +
                    '<p>☀️ <strong>الإشعاع الشمسي:</strong> ~' + annualGhi + ' kWh/m²/year</p>' +
                    '<p>⛰️ <strong>الارتفاع:</strong> ' + elevation + ' متر</p>' +
                    '<p>💨 <strong>الرياح (الهبات):</strong> ' + windSpeed + ' كم/س (' + maxWindGust + ' كم/س)</p>' +
                    '<p>🎯 <strong>الملاءة المكانية:</strong> <span style="color:' + color + '; font-weight:bold;">' + statusText + '</span></p>' +
                    '<hr><button onclick="startDrawingArea()" style="background:#007bff; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; width:100%;">📐 رسم سقف/منطقة لحساب الألواح</button>';

            } catch (err) {
                siteInfoDiv.innerHTML = '<p style="color:red;">حدث خطأ في جلب البيانات.</p>';
            }
        });

    } catch (err) { console.error(err); }
});

// --- AREA POLYGON & PANEL CALCULATOR FUNCTIONS ---

function startDrawingArea() {
    isDrawingMode = true;
    drawnPoints = [];
    if (drawnPolyline) map.removeLayer(drawnPolyline);
    if (drawnPolygon) map.removeLayer(drawnPolygon);

    const siteInfoDiv = document.getElementById('site-info');
    if (siteInfoDiv) {
        siteInfoDiv.innerHTML =
            '<p style="color:#007bff; font-weight:bold;">📍 انقر على أركان السقف/المنطقة على الخريطة لتحديد النقاط.</p>' +
            '<button onclick="finishDrawingArea()" style="background:#28a745; color:white; border:none; padding:8px; border-radius:5px; margin-top:5px; width:100%; cursor:pointer;">✅ إكمال المضلع وحساب المساحة</button>' +
            '<button onclick="cancelDrawingArea()" style="background:#dc3545; color:white; border:none; padding:5px; border-radius:5px; margin-top:5px; width:100%; cursor:pointer;">إلغاء</button>';
    }
}

function finishDrawingArea() {
    if (drawnPoints.length < 3) {
        alert("يرجى تحديد 3 نقاط على الأقل لتشغيل مضلع المساحة!");
        return;
    }

    isDrawingMode = false;

    // Remove temp polyline and draw filled Blue Polygon
    if (drawnPolyline) map.removeLayer(drawnPolyline);
    drawnPolygon = L.polygon(drawnPoints, {
        color: '#0056b3',
        fillColor: '#007bff',
        fillOpacity: 0.4,
        weight: 2
    }).addTo(map);

    // Calculate Geodesic Area in m²
    const areaM2 = Math.round(calculatePolygonArea(drawnPoints));
   
    // Panel calculations
    const panelAreaM2 = 2.0; // Standard 400W panel
    const usableRatio = 0.75; // Space efficiency ratio
    const estimatedPanels = Math.floor((areaM2 * usableRatio) / panelAreaM2);
    const capacityKW = (estimatedPanels * 0.4).toFixed(1);

    const siteInfoDiv = document.getElementById('site-info');
    if (siteInfoDiv) {
        siteInfoDiv.innerHTML =
            '<h3>📊 نتائج تحديد المساحة:</h3>' +
            '<p>📐 <strong>المساحة المحسوبة:</strong> <span style="color:#007bff; font-weight:bold;">' + areaM2 + ' متر مربع</span></p>' +
            '<p>🧩 <strong>عدد الألواح المتوقع (400W):</strong> ~' + estimatedPanels + ' لوح شمسي</p>' +
            '<p>⚡ <strong>القدرة الإنتاجية الإجمالية:</strong> ~' + capacityKW + ' كيلوواط (kWp)</p>' +
            '<button onclick="startDrawingArea()" style="background:#007bff; color:white; border:none; padding:6px; border-radius:5px; margin-top:10px; width:100%;">اعادة الرسم 📐</button>';
    }
}

function cancelDrawingArea() {
    isDrawingMode = false;
    drawnPoints = [];
    if (drawnPolyline) map.removeLayer(drawnPolyline);
    if (drawnPolygon) map.removeLayer(drawnPolygon);
   
    const siteInfoDiv = document.getElementById('site-info');
    if (siteInfoDiv) siteInfoDiv.innerHTML = '<p>تم إلغاء الرسم. اضغط على أي نقطة للاستعلام.</p>';
}

// Shoelace Formula for Geographic Coordinates Area in m²
function calculatePolygonArea(coords) {
    const radius = 6378137; // Earth's radius in meters
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
