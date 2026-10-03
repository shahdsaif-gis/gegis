/**
* GEGIS - Solar Power Site Suitability & System Sizing
* Designed & Developed by Shahd Saif
*/

// 1. تفعيل الوضع الصارم لحظر الممارسات غير الآمنة
'use strict';

// 2. تغليف التطبيق للحماية من التلاعب الخارجي عبر الكونسول
(function () {
   
    // متغيرات التطبيق الداخلية (محمية داخل النطاق)
    let map = null;
    let drawnItems = null;
    let currentLanguage = 'ar'; // 'ar' أو 'en'

    // قاموس الترجمة المزدوج
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

    /**
     * دالة أمان: تطهير النصوص لمنع هجمات Cross-Site Scripting (XSS)
     */
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

    /**
     * تهيئة الخريطة بأمان مع معالجة الأخطاء
     */
    function initMap() {
        try {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;

            // إحداثيات الخرطوم المبدئية [15.5007, 32.5599]
            map = L.map('map', {
                center: [15.5007, 32.5599],
                zoom: 12,
                zoomControl: true
            });

            // إضافة خريطة OpenStreetMap آمنة
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap contributors | GEGIS'
            }).addTo(map);

            // طبقة الرسم
            drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);

            // إعداد أداة الرسم
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

            // الاستماع لحادثة إكمال الرسم
            map.on(L.Draw.Event.CREATED, function (event) {
                const layer = event.layer;
                drawnItems.clearLayers(); // إزالة الرسم القديم
                drawnItems.addLayer(layer);
               
                calculateAreaAndPanels(layer);
            });

        } catch (error) {
            console.error("خطأ أثناء تهيئة الخريطة:", error);
        }
    }

    /**
     * حساب المساحة والألواح الشمسية بحدود أمان رياضية
     */
    function calculateAreaAndPanels(layer) {
        try {
            const latLngs = layer.getLatLngs()[0];
           
            // حساب المساحة بالمتار المربعة باستخدام مكتبة Leaflet
            let areaInMeters = L.GeometryUtil ? L.GeometryUtil.geodesicArea(latLngs) : 0;
           
            if (areaInMeters <= 0) return;

            // الفرضيات الهندسية: اللوح (400W) يحتاج حيز تشغيلي مع المسافات قدره 2.2 متر مربع
            const areaPerPanel = 2.2;
            const panelCount = Math.floor(areaInMeters / areaPerPanel);
            const totalCapacityKWp = ((panelCount * 400) / 1000).toFixed(2);

            // تحديث الواجهة ببيانات مأمونة ومطهرة
            document.getElementById('val-area').innerText = sanitizeHTML(areaInMeters.toFixed(2) + ' m²');
            document.getElementById('val-panels').innerText = sanitizeHTML(panelCount + ' ' + (currentLanguage === 'ar' ? 'لوح' : 'Panels'));
            document.getElementById('val-power').innerText = sanitizeHTML(totalCapacityKWp + ' kWp');

        } catch (err) {
            console.error("خطأ في حساب المساحة:", err);
        }
    }

    /**
     * دالة تبديل اللغة بأمان
     */
    window.toggleLanguage = function () {
        currentLanguage = (currentLanguage === 'ar') ? 'en' : 'ar';
        const t = translations[currentLanguage];

        // تحديث الاتجاه والنصوص
        document.documentElement.dir = (currentLanguage === 'ar') ? 'rtl' : 'ltr';
        document.documentElement.lang = currentLanguage;
       
        document.getElementById('lang-btn').innerText = (currentLanguage === 'ar') ? 'EN' : 'AR';
        document.getElementById('txt-app-title').innerText = t.appTitle;
        document.getElementById('txt-app-subtitle').innerText = t.appSubtitle;
        document.getElementById('txt-layers-title').innerText = t.layersTitle;
        document.getElementById('txt-layer-ghi').innerText = t.layerGhi;
        document.getElementById('txt-layer-dem').innerText = t.layerDem;
        document.getElementById('txt-layer-wind').innerText = t.layerWind;
        document.getElementById('txt-stat-ghi-title').innerText = t.statGhi;
        document.getElementById('txt-stat-elev-title').innerText = t.statElev;
        document.getElementById('txt-stat-suitability-title').innerText = t.statSuitability;
        document.getElementById('txt-area-title').innerText = t.areaTitle;
        document.getElementById('txt-btn-draw').innerText = t.btnDraw;
        document.getElementById('txt-total-area').innerText = t.totalArea;
        document.getElementById('txt-panel-count').innerText = t.panelCount;
        document.getElementById('txt-est-power').innerText = t.estPower;
        document.getElementById('txt-btn-export').innerText = t.btnExport;
        document.getElementById('txt-btn-calc').innerText = t.btnCalc;
        document.getElementById('txt-developer-name').innerText = t.developerName;
    };

    // تشغيل الخريطة عند تحميل الصفحة
    document.addEventListener('DOMContentLoaded', initMap);

})();
