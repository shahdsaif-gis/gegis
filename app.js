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
            appTitle: "GEGIS Analytics ☀️",
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
            const escapeChars = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;'
            };
            return escapeChars[match];
        });
    }

    function initMap() {
        try {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;

            // 1. تهيئة الخريطة على مركز الخرطوم
            map = L.map('map', {
                center: [15.5007, 32.5599],
                zoom: 13,
                zoomControl: true
            });

            // 2. خريطة الأقمار الاصطناعية (Esri Satellite)
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                attribution: 'Tiles &copy; Esri'
            }).addTo(map);

            // 3. طبقة التضاريس وتأثير الظلال (Hillshade / Terrain Shading)
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                opacity: 0.35,
                attribution: 'Esri Hillshade'
            }).addTo(map);

            // 4. طبقة الأسماء والحدود الشفافة فوق القمر الاصطناعي
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19
            }).addTo(map);

            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19
            }).addTo(map);

            // 5. طبقة الرسم
            drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);

            // إعداد أداة الرسم المباشرة
            polygonDrawer = new L.Draw.Polygon(map);

            const drawControl = new L.Control.Draw({
                draw: {
                    polygon: true,
                    polyline: false,
                    rectangle: true,
                    circle: false,
                    marker: false,
                    circlemarker: false
                },
                edit: {
                    featureGroup: drawnItems
                }
            });
            map.addControl(drawControl);

            map.on(L.Draw.Event.CREATED, function (event) {
                const layer = event.layer;
                drawnItems.clearLayers();
                drawnItems.addLayer(layer);
               
                calculateAreaAndPanels(layer);
            });

            // ربط زر الرسم
            setupEventListeners();

        } catch (error) {
            console.error("خطأ أثناء تهيئة الخريطة:", error);
        }
    }

    /**
     * تفعيل وضع الرسم المباشر
     */
    window.startPolygonDraw = function () {
        if (polygonDrawer) {
            polygonDrawer.enable();
        } else if (map) {
            new L.Draw.Polygon(map).enable();
        }
    };

    function setupEventListeners() {
        // البحث عن زر الرسم بواسطة الـ ID أو الكلاس أو أي زر يحتوي نص "رسم"
        const drawBtn = document.getElementById('btn-draw-polygon') ||
                        document.querySelector('.btn-draw') ||
                        Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('رسم') || b.innerText.includes('Draw'));

        if (drawBtn) {
            drawBtn.addEventListener('click', function (e) {
                e.preventDefault();
                window.startPolygonDraw();
            });
        }
    }

    function calculateAreaAndPanels(layer) {
        try {
            const latLngs = layer.getLatLngs()[0];
            let areaInMeters = L.GeometryUtil ? L.GeometryUtil.geodesicArea(latLngs) : 0;
           
            if (areaInMeters <= 0) return;

            const areaPerPanel = 2.2;
            const panelCount = Math.floor(areaInMeters / areaPerPanel);
            const totalCapacityKWp = ((panelCount * 400) / 1000).toFixed(2);

            const shadowPercentage = calculateShadowFactor(latLngs, areaInMeters);

            const valArea = document.getElementById('val-area');
            const valPanels = document.getElementById('val-panels');
            const valPower = document.getElementById('val-power');

            if (valArea) valArea.innerText = sanitizeHTML(areaInMeters.toFixed(2) + ' m²');
            if (valPanels) valPanels.innerText = sanitizeHTML(panelCount + ' ' + (currentLanguage === 'ar' ? 'لوح' : 'Panels'));
            if (valPower) valPower.innerText = sanitizeHTML(totalCapacityKWp + ' kWp');

            const suitabilityElem = document.getElementById('stat-suitability-val');
            if (suitabilityElem) {
                const suitabilityScore = Math.max(70, Math.min(98, 100 - shadowPercentage));
                suitabilityElem.innerHTML = sanitizeHTML(`S1 (${suitabilityScore.toFixed(0)}%) <br><small style="font-size:9px; color:#cbd5e1;">الظل: ${shadowPercentage}%</small>`);
            }

        } catch (err) {
            console.error("خطأ في حساب المساحة والظل:", err);
        }
    }

    function calculateShadowFactor(coordinates, area) {
        if (!coordinates || coordinates.length < 3) return 5;
        let shadowEffect = (area < 100) ? 12 : (area < 500) ? 8 : 4;
        return Math.min( shadowEffect + Math.floor(Math.random() * 3), 20 );
    }

    window.toggleLanguage = function () {
        currentLanguage = (currentLanguage === 'ar') ? 'en' : 'ar';
        const t = translations[currentLanguage];

        document.documentElement.dir = (currentLanguage === 'ar') ? 'rtl' : 'ltr';
        document.documentElement.lang = currentLanguage;
       
        const langBtn = document.getElementById('lang-btn');
        if (langBtn) langBtn.innerText = (currentLanguage === 'ar') ? 'EN' : 'AR';
       
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
