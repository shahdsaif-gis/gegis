/**
* GEGIS - Solar Power Site Suitability & System Sizing
* Designed & Developed by Shahd Saif
*/

'use strict';

(function () {
   
    let map = null;
    let drawnItems = null;
    let polygonDrawer = null;
    let currentLanguage = 'ar';

    const translations = {
        ar: {
            appTitle: "GEGIS Analytics ☀️",
            appSubtitle: "تقييم الملاءة المكانية والمنظومة",
            layersTitle: "الطبقات المكانية المتاحة",
            layerGhi: "إشعاع (GHI)",
            layerDem: "تضاريس (DEM)",
            layerWind: "الرياح",
            statGhi: "الإشعاع الشمسي",
            statElev: "الارتفاع / الرياح",
            statSuitability: "درجة الملاءة",
            areaTitle: "المساحة والألواح الشمسية",
            btnDraw: "رسم المضلع",
            totalArea: "المساحة الكلية:",
            panelCount: "عدد الألواح (400W):",
            estPower: "القدرة الإنتاجية المتوقعة:",
            btnExport: "تصدير التقرير",
            btnCalc: "حاسبة الأحمال",
            developerName: "Designed & Developed by Shahd Saif"
        },
        en: {
            appTitle: "GEGIS Analytics ☀️️",
            appSubtitle: "Spatial Suitability & Sizing",
            layersTitle: "Available Spatial Layers",
            layerGhi: "Radiation (GHI)",
            layerDem: "Terrain (DEM)",
            layerWind: "Wind Speed",
            statGhi: "Solar Radiation",
            statElev: "Elevation / Wind",
            statSuitability: "Suitability Score",
            areaTitle: "Area & Solar Panels",
            btnDraw: "Draw Polygon",
            totalArea: "Total Area:",
            panelCount: "Panel Count (400W):",
            estPower: "Expected Capacity:",
            btnExport: "Export Report",
            btnCalc: "Load Calculator",
            developerName: "Designed & Developed by Shahd Saif"
        }
    };

    function sanitizeHTML(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>"']/g, function (match) {
            const escapeChars = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
            return escapeChars[match];
        });
    }

    function initMap() {
        try {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;

            map = L.map('map', {
                center: [15.5007, 32.5599],
                zoom: 13,
                zoomControl: true
            });

            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                attribution: 'Tiles &copy; Esri'
            }).addTo(map);

            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                opacity: 0.35
            }).addTo(map);

            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19
            }).addTo(map);

            drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);

            polygonDrawer = new L.Draw.Polygon(map);

            map.on(L.Draw.Event.CREATED, function (event) {
                const layer = event.layer;
                drawnItems.clearLayers();
                drawnItems.addLayer(layer);
                calculateAreaAndPanels(layer);
            });

        } catch (error) {
            console.error("خطأ أثناء تهيئة الخريطة:", error);
        }
    }

    window.startPolygonDraw = function () {
        if (polygonDrawer) polygonDrawer.enable();
        else if (map) new L.Draw.Polygon(map).enable();
    };

    function calculateAreaAndPanels(layer) {
        try {
            const latLngs = layer.getLatLngs()[0];
            let areaInMeters = L.GeometryUtil ? L.GeometryUtil.geodesicArea(latLngs) : 0;
           
            if (areaInMeters <= 0) return;

            const areaPerPanel = 2.2;
            const panelCount = Math.floor(areaInMeters / areaPerPanel);
            const totalCapacityKWp = ((panelCount * 400) / 1000).toFixed(2);

            document.getElementById('val-area').innerText = sanitizeHTML(areaInMeters.toFixed(2) + ' m²');
            document.getElementById('val-panels').innerText = sanitizeHTML(panelCount + ' ' + (currentLanguage === 'ar' ? 'لوح' : 'Panels'));
            document.getElementById('val-power').innerText = sanitizeHTML(totalCapacityKWp + ' kWp');

            // تحديث التقرير تلقائياً
            const repArea = document.getElementById('rep-area');
            const repPanels = document.getElementById('rep-panels');
            const repKwp = document.getElementById('rep-kwp');

            if (repArea) repArea.innerText = areaInMeters.toFixed(2) + ' m²';
            if (repPanels) repPanels.innerText = panelCount + ' لوح';
            if (repKwp) repKwp.innerText = totalCapacityKWp + ' kWp';

        } catch (err) {
            console.error("خطأ في حساب المساحة والظل:", err);
        }
    }

    // --- دوال التحكم بالنوافذ المنبثقة ---
    window.openSizingModal = function () {
        document.getElementById('sizing-modal').style.display = 'flex';
    };

    window.closeSizingModal = function () {
        document.getElementById('sizing-modal').style.display = 'none';
    };

    window.openReportModal = function () {
        document.getElementById('report-modal').style.display = 'flex';
    };

    window.closeReportModal = function () {
        document.getElementById('report-modal').style.display = 'none';
    };

    window.calculateSystemSizing = function () {
        const watts = parseFloat(document.getElementById('load-watts').value) || 5000;
        const nightHours = parseFloat(document.getElementById('night-hours').value) || 8;

        const kw = (watts / 1000).toFixed(2);
        const inverterKw = (kw * 1.25).toFixed(2);
        const batteryKwh = (kw * nightHours).toFixed(1);
        const batteryAh = Math.round((batteryKwh * 1000) / 48);

        document.getElementById('rep-load').innerText = kw + ' kW';
        document.getElementById('rep-inverter').innerText = inverterKw + ' kW';
        document.getElementById('rep-battery').innerText = batteryKwh + ' kWh (48V / ' + batteryAh + 'Ah)';

        alert('تم حساب المكونات وتحديث التقرير بنجاح! ✅');
        window.closeSizingModal();
    };

    window.toggleLanguage = function () {
        currentLanguage = (currentLanguage === 'ar') ? 'en' : 'ar';
        const t = translations[currentLanguage];

        document.documentElement.dir = (currentLanguage === 'ar') ? 'rtl' : 'ltr';
        document.documentElement.lang = currentLanguage;
       
        document.getElementById('lang-btn').innerText = (currentLanguage === 'ar') ? 'EN' : 'AR';
       
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.innerText = text;
        };

        setText('txt-app-title', t.appTitle);
        setText('txt-app-subtitle', t.appSubtitle);
        setText('txt-layers-title', t.layersTitle);
        setText('txt-layer-ghi', t.layerGhi);
        setText('txt-layer-dem', t.layerDem);
        setText('txt-layer-wind', t.layerWind);
        setText('txt-stat-ghi-title', t.statGhi);
        setText('txt-stat-elev-title', t.statElev);
        setText('txt-stat-suitability-title', t.statSuitability);
        setText('txt-area-title', t.areaTitle);
        setText('txt-btn-draw', t.btnDraw);
        setText('txt-total-area', t.totalArea);
        setText('txt-panel-count', t.panelCount);
        setText('txt-est-power', t.estPower);
        setText('txt-btn-export', t.btnExport);
        setText('txt-btn-calc', t.btnCalc);
        setText('txt-developer-name', t.developerName);
    };

    document.addEventListener('DOMContentLoaded', initMap);

})();

