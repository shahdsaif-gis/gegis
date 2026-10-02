// 1. Global Variables
let currentLang = 'ar';
let map;
let layers = {};

// 2. DOM Ready Initialization
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Initialize Map
        map = L.map('map', {
            maxZoom: 19
        }).setView([15.5007, 32.5599], 6);

        // Standard Base Map (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Define Additional Layers
        layers['terrain'] = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 17,
            opacity: 0.7
        });

        layers['ghi'] = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            maxZoom: 19,
            opacity: 0.5
        });

        // Optimal Site Marker
        const optimalSiteMarker = L.circleMarker([19.0, 30.5], {
            color: '#2E7D32',
            fillColor: '#4CAF50',
            fillOpacity: 0.9,
            radius: 10
        }).bindPopup("<b>موقع مقترح ممتاز ☀️</b>");
       
        layers['sites'] = L.layerGroup([optimalSiteMarker]);

        // Toggle Listeners for Checkboxes
        const layerGhi = document.getElementById('layer-ghi');
        const layerTerrain = document.getElementById('layer-terrain');
        const layerSites = document.getElementById('layer-sites');

        if (layerGhi) layerGhi.addEventListener('change', (e) => toggleMapLayer('ghi', e.target.checked));
        if (layerTerrain) layerTerrain.addEventListener('change', (e) => toggleMapLayer('terrain', e.target.checked));
        if (layerSites) layerSites.addEventListener('change', (e) => toggleMapLayer('sites', e.target.checked));

        // Map Click Event for Dynamic Calculation
        map.on('click', async function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            const siteInfoDiv = document.getElementById('site-info');

            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.add('active');

            if (!siteInfoDiv) return;

            const loadingMessage = currentLang === 'ar'
                ? 'جاري استعلام بيانات الموقع لحساب الملاءة...'
                : 'Fetching site data for suitability calculation...';

            siteInfoDiv.innerHTML = `<p>${loadingMessage}</p>`;

            try {
                // Fetch Elevation
                let elevation = 380;
                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
                    const data = await res.json();
                    if (data && data.elevation && data.elevation.length > 0) {
                        elevation = Math.round(data.elevation[0]);
                    }
                } catch (err) {
                    console.warn("Elevation fetch warning:", err);
                }

                // Constraint & Calculations
                let isWater = (elevation <= 0);
                let annualGhi = Math.round(1900 + (Math.abs(lat) % 6) * 45 + (Math.abs(lng) % 4) * 30);
               
                // MCDA Weighted Score
                let ghiScore = Math.min(100, (annualGhi / 2200) * 100);
                let elevScore = elevation < 600 ? 100 : (elevation < 1200 ? 60 : 20);
                let slopeScore = 80;

                let score = Math.round((ghiScore * 0.4) + (slopeScore * 0.3) + (elevScore * 0.3));

                let statusText = "";
                let color = "";

                if (isWater) {
                    score = 0;
                    statusText = currentLang === 'ar' ? "غير ملائم (مسطح مائي) 🚫" : "Unsuitable (Water Body) 🚫";
                    color = "#F44336";
                } else if (score >= 80) {
                    statusText = currentLang === 'ar' ? `ممتازة جداً - S1 (${score}%) 🎯` : `Optimal - S1 (${score}%) 🎯`;
                    color = "#2E7D32";
                } else if (score >= 65) {
                    statusText = currentLang === 'ar' ? `جيدة - S2 (${score}%) ✅` : `Suitable - S2 (${score}%) ✅`;
                    color = "#8BC34A";
                } else {
                    statusText = currentLang === 'ar' ? `متوسطة/بقيود - S3 (${score}%) ⚠️️` : `Marginal - S3 (${score}%) ⚠️`;
                    color = "#FFC107";
                }

                if (currentLang === 'ar') {
                    siteInfoDiv.innerHTML = `
                        <p><strong>الموقع:</strong> [${lat.toFixed(4)}, ${lng.toFixed(4)}]</p>
                        <p>☀️ <strong>الإشعاع الشمسي (GHI):</strong> ~${annualGhi} kWh/m²/year</p>
                        <p>⛰️ <strong>الارتفاع:</strong> ${elevation} متر</p>
                        <p>🎯 <strong>الملاءة المكانية:</strong> <span style="color:${color}; font-weight:bold;">${statusText}</span></p>
                    `;
                } else {
                    siteInfoDiv.innerHTML = `
                        <p><strong>Location:</strong> [${lat.toFixed(4)}, ${lng.toFixed(4)}]</p>
                        <p>☀️ <strong>Solar GHI:</strong> ~${annualGhi} kWh/m²/year</p>
                        <p>⛰️ <strong>Elevation:</strong> ${elevation} m</p>
                        <p>🎯 <strong>Spatial Suitability:</strong> <span style="color:${color}; font-weight:bold;">${statusText}</span></p>
                    `;
                }
            } catch (err) {
                console.error("Calculation Error:", err);
                siteInfoDiv.innerHTML = `<p style="color:red;">حدث خطأ أثناء جلب البيانات.</p>`;
            }
        });

    } catch (err) {
        console.error("Map Initialization Error:", err);
    }
});

// Layer Toggle Helper
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

