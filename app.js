// 1. Define global variables at the VERY TOP
let currentLang = 'en';
let map;
let layers = {};

// Wait for DOM to load completely
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Map centered on Sudan
    map = L.map('map').setView([15.5007, 32.5599], 6);

    // Add Base OpenStreetMap Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Layer Event Listeners (Safely checked)
    const layerGhi = document.getElementById('layer-ghi');
    const layerTerrain = document.getElementById('layer-terrain');
    const layerGrid = document.getElementById('layer-grid');
    const layerSites = document.getElementById('layer-sites');

    if (layerGhi) layerGhi.addEventListener('change', (e) => toggleMapLayer('ghi', e.target.checked));
    if (layerTerrain) layerTerrain.addEventListener('change', (e) => toggleMapLayer('terrain', e.target.checked));
    if (layerGrid) layerGrid.addEventListener('change', (e) => toggleMapLayer('grid', e.target.checked));
    if (layerSites) layerSites.addEventListener('change', (e) => toggleMapLayer('sites', e.target.checked));

    // Map Click Handler for Real-time Data Fetching
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

        const loadingText = currentLang === 'ar' ? 'جاري جلب البيانات...' : 'Fetching solar radiation data...';
        siteInfoDiv.innerHTML = `<p>${loadingText}</p>`;

        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=surface_solar_radiation,direct_normal_irradiance&elevation=nan`);
            const data = await response.json();

            const elevation = data.elevation ? Math.round(data.elevation) : 'N/A';
            const radiation = data.current && data.current.surface_solar_radiation !== undefined ? data.current.surface_solar_radiation : 'N/A';

            if (currentLang === 'ar') {
                siteInfoDiv.innerHTML = `
                    <p><strong>خط العرض:</strong> ${lat.toFixed(4)}°</p>
                    <p><strong>خط الطول:</strong> ${lng.toFixed(4)}°</p>
                    <p><strong>الارتفاع عن سطح البحر:</strong> ${elevation} متر</p>
                    <p><strong>الإشعاع الشمسي الحالي:</strong> ${radiation} W/m²</p>
                    <p><strong>تقييم الصلاحية:</strong> <span style="color:#4CAF50; font-weight:bold;">ممتازة</span></p>
                `;
            } else {
                siteInfoDiv.innerHTML = `
                    <p><strong>Latitude:</strong> ${lat.toFixed(4)}°</p>
                    <p><strong>Longitude:</strong> ${lng.toFixed(4)}°</p>
                    <p><strong>Elevation:</strong> ${elevation} m</p>
                    <p><strong>Solar Radiation:</strong> ${radiation} W/m²</p>
                    <p><strong>Suitability Rating:</strong> <span style="color:#4CAF50; font-weight:bold;">Optimal</span></p>
                `;
            }
        } catch (error) {
            console.error("API Error:", error);
            siteInfoDiv.innerHTML = currentLang === 'ar'
                ? '<p style="color:red;">عذراً، تعذر جلب البيانات لهذا الموقع.</p>'
                : '<p style="color:red;">Failed to fetch radiation data for this site.</p>';
        }
    });
});

// Layer toggle helper
function toggleMapLayer(layerName, show) {
    if (layers[layerName]) {
        if (show) map.addLayer(layers[layerName]);
        else map.removeLayer(layers[layerName]);
    }
}

// Mobile sidebar toggle function
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

// Global Language Toggle Function
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
            appTitle: "GEGIS ☀️",
            appSubtitle: "تحليل الملاءة المكانية والإشعاع الشمسي لمشاريع الطاقة",
            layersTitle: "الطبقات المكانية",
            labelGhi: "الإشعاع الشمسي الأفقي (GHI)",
            labelTerrain: "قيود التضاريس والانحدار",
            labelGrid: "شبكة الكهرباء والبنية التحتية",
            labelSites: "المواقع المثالية لمحطات الشمس",
            infoTitle: "تفاصيل الموقع",
            clickPrompt: "انقر في أي مكان على الخريطة لتحليل الإشعاع والملاءة الشمسية.",
            designedBy: "تصميم وتطوير:",
            langBtn: "English"
        }
    };

    const t = translations[currentLang];

    // Safely update DOM text
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

    // Change Layout Direction (RTL / LTR)
    document.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
}
