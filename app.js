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

    let layerHistory = []; // سجل التراجع الأشكال المرسومة
    let lengthTooltips = []; // علامات أطوال الأضلاع فوق الخريطة

    // الطبقات المكانية
    let ghiLayer = null;
    let demLayer = null;
    let windLayer = null;

    const translations = {
        ar: {
            appTitle: "GEGIS Analytics ☀️",
            appSubtitle: "تقييم الملاءة المكانية والمنظومة",
            layersTitle: "الطبقات المكانية المتاحة",
            layerGhi: "إشعاع (GHI)",
            layerDem: "تضاريس (DEM)",
            layerWind: "سرعة الرياح",
            statGhi: "الإشعاع الشمسي",
            statElev: "الارتفاع / الرياح",
            statSuitability: "درجة الملاءة",
            areaTitle: "المساحة والألواح الشمسية",
            btnDraw: "رسم المضلع",
            totalArea: "المساحة الكلية / المطلوبة:",
            panelCount: "عدد الألواح:",
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
            totalArea: "Total / Required Area:",
            panelCount: "Panel Count:",
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

            // 1. تهيئة الخريطة بحد تقريب MaxZoom 22
            map = L.map('map', {
                center: [15.5007, 32.5599],
                zoom: 18,
                maxZoom: 22,
                zoomControl: false
            });

            L.control.zoom({ position: 'bottomleft' }).addTo(map);

            // 2. خريطة Google Satellite عالية الدقة
            const googleSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
                maxZoom: 22,
                maxNativeZoom: 20,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
                attribution: '&copy; Google Maps'
            });

            googleSat.addTo(map);

            // الطبقات المكانية
            ghiLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NAEarth/GHI_Solar_Radiation/MapServer/tile/{z}/{y}/{x}', {
                maxNativeZoom: 15,
                maxZoom: 22,
                opacity: 0.4
            });

            demLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                maxNativeZoom: 16,
                maxZoom: 22,
                opacity: 0.35
            });

            windLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Specialty/Soil_Survey_Map/MapServer/tile/{z}/{y}/{x}', {
                maxNativeZoom: 15,
                maxZoom: 22,
                opacity: 0.35
            });

            // 3. أداة الرسم
            drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);

            polygonDrawer = new L.Draw.Polygon(map);

            const drawControl = new L.Control.Draw({
                position: 'bottomleft',
                draw: {
                    polygon: true,
                    polyline: false,
                    rectangle: true,
                    circle: false,
                    marker: false,
                    circlemarker: false
                },
                edit: {
                    featureGroup: drawnItems,
                    remove: true
                }
            });
            map.addControl(drawControl);

            map.on(L.Draw.Event.CREATED, function (event) {
                const layer = event.layer;
                drawnItems.addLayer(layer);
                layerHistory.push(layer); // حفظ في سجل التراجع
                calculateAreaAndPanels(layer);
            });

            setupLayerToggleListeners();
            calculatePanelsByTargetPower();

        } catch (error) {
            console.error("خطأ أثناء تهيئة الخريطة:", error);
        }
    }

    /**
     * خاصية التراجع عن رسم المضلع الأخير
     */
    window.undoLastDraw = function () {
        if (layerHistory.length > 0) {
            const lastLayer = layerHistory.pop();
            drawnItems.removeLayer(lastLayer);

            // مسح علامات أطوال الأضلاع وقائمة الأضلاع
            clearLengthTooltips();
            document.getElementById('sides-lengths-box').style.display = 'none';

            // إذا أصبحت القائمة تحتوي على شكل سابق، نحسب له المساحة
            if (layerHistory.length > 0) {
                const prevLayer = layerHistory[layerHistory.length - 1];
                calculateAreaAndPanels(prevLayer);
            } else {
                calculatePanelsByTargetPower();
            }
        } else {
            alert("لا توجد أشكال إضافية للتراجع عنها.");
        }
    };

    function clearLengthTooltips() {
        lengthTooltips.forEach(tooltip => map.removeLayer(tooltip));
        lengthTooltips = [];
    }

    /**
     * حساب وإظهار أطوال الأضلاع فوق الخريطة وفي القائمة الجانبية
     */
    function displayPolygonSegmentLengths(layer) {
        clearLengthTooltips();

        const latLngs = layer.getLatLngs()[0];
        if (!latLngs || latLngs.length < 2) return;

        const sidesListEl = document.getElementById('sides-list');
        const sidesBox = document.getElementById('sides-lengths-box');
        sidesListEl.innerHTML = '';
        sidesBox.style.display = 'block';

        for (let i = 0; i < latLngs.length; i++) {
            const p1 = latLngs[i];
            const p2 = latLngs[(i + 1) % latLngs.length];

            // حساب الطول بالامتار
            const distMeters = p1.distanceTo(p2);
            const distText = distMeters.toFixed(2) + ' m';

            // 1. إضافة إلى القائمة الجانبية
            const li = document.createElement('li');
            li.innerHTML = `<span style="color:#94a3b8;">الضلع ${i + 1}:</span> <strong>${distText}</strong>`;
            sidesListEl.appendChild(li);

            // 2. إضافة النص فوق الضلع على الخريطة
            const midLat = (p1.lat + p2.lat) / 2;
            const midLng = (p1.lng + p2.lng) / 2;

            const lengthMarker = L.marker([midLat, midLng], {
                icon: L.divIcon({
                    className: 'segment-length-label',
                    html: `<div style="background: rgba(15, 23, 42, 0.85); color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; border: 1px solid #0284c7; white-space: nowrap; font-family: monospace;">${distText}</div>`,
                    iconSize: [45, 20],
                    iconAnchor: [22, 10]
                })
            }).addTo(map);

            lengthTooltips.push(lengthMarker);
        }
    }

    /**
     * حساب القدرة والألواح بالمعادلة
     */
    window.calculatePanelsByTargetPower = function () {
        const totalKwp = parseFloat(document.getElementById('input-total-kwp').value) || 0;
        const panelWatt = parseFloat(document.getElementById('input-panel-watt').value) || 590;

        if (totalKwp <= 0 || panelWatt <= 0) return;

        const panelCount = Math.ceil((totalKwp * 1000) / panelWatt);
        const areaPerPanel = (panelWatt >= 500) ? 2.6 : 2.0;
        const requiredArea = (panelCount * areaPerPanel).toFixed(2);

        document.getElementById('val-panels').innerText = sanitizeHTML(`${panelCount} لوح`);
        document.getElementById('val-area').innerText = sanitizeHTML(`${requiredArea} m² (مطلوبة)`);

        document.getElementById('rep-kwp').innerText = `${totalKwp} kWp`;
        document.getElementById('rep-panel-watt').innerText = `${panelWatt} W`;
        document.getElementById('rep-panels').innerText = `${panelCount} لوح`;
        document.getElementById('rep-area').innerText = `${requiredArea} m²`;
    };

    /**
     * حسابات المساحة والتوجيه عند رسم المضلع
     */
    function calculateAreaAndPanels(layer) {
        try {
            const latLngs = layer.getLatLngs()[0];
            let areaInMeters = L.GeometryUtil ? L.GeometryUtil.geodesicArea(latLngs) : 0;
           
            if (areaInMeters <= 0) return;

            // أطوال الأضلاع
            displayPolygonSegmentLengths(layer);

            const panelWattInput = parseFloat(document.getElementById('input-panel-watt').value) || 590;
            const areaPerPanel = (panelWattInput >= 500) ? 2.6 : 2.0;
           
            const panelCount = Math.floor(areaInMeters / areaPerPanel);
            const totalCapacityKWp = ((panelCount * panelWattInput) / 1000).toFixed(2);

            document.getElementById('input-total-kwp').value = totalCapacityKWp;

            const centerLat = latLngs[0].lat;
            const centerLng = latLngs[0].lng;
            const optimalTiltAngle = Math.abs(centerLat * 0.9 + 2.5).toFixed(1);
            const orientationText = (centerLat >= 0) ? `Tilt: ${optimalTiltAngle}° South` : `Tilt: ${optimalTiltAngle}° North`;

            document.getElementById('val-area').innerText = sanitizeHTML(areaInMeters.toFixed(2) + ' m²');
            document.getElementById('val-panels').innerText = sanitizeHTML(panelCount + ' لوح');
            document.getElementById('val-tilt-angle').innerText = sanitizeHTML(`${optimalTiltAngle}°`);

            const locationBadge = document.getElementById('val-location-text');


            if (locationBadge) {
                locationBadge.innerHTML = sanitizeHTML(`<i class="fa-solid fa-location-dot"></i> [${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}] | زاوية التعامد: ${optimalTiltAngle}°`);
            }
            document.getElementById('rep-area').innerText = areaInMeters.toFixed(2) + ' m²';
            document.getElementById('rep-panel-watt').innerText = panelWattInput + ' W';
            document.getElementById('rep-panels').innerText = panelCount + ' لوح';
            document.getElementById('rep-kwp').innerText = totalCapacityKWp + ' kWp';
            document.getElementById('rep-tilt').innerText = orientationText;
            document.getElementById('rep-coords').innerText = `[${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}]`;

            const popupContent = `
                <div style="text-align:center; font-family:sans-serif; padding:6px; color:#0f172a; min-width:170px;">
                    <h4 style="margin:0 0 6px 0; color:#0284c7; font-size:13px; font-weight:bold;">📐 نتائج الموقع والتوجيه</h4>
                    <p style="margin:2px 0; font-size:12px;"><strong>المساحة:</strong> ${areaInMeters.toFixed(2)} m²</p>
                    <p style="margin:2px 0; font-size:12px;"><strong>القدرة:</strong> ${totalCapacityKWp} kWp (${panelCount} لوح)</p>
                    <p style="margin:2px 0; font-size:11px; color:#eab308; font-weight:bold;">☀ زاوية التعامد: ${optimalTiltAngle}°</p>
                    <button id="btn-ok-confirm" style="margin-top:8px; background:#059669; color:white; border:none; padding:6px 14px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px; width:100%;">
                        موافق / OK 👍
                    </button>
                </div>
            `;

            layer.bindPopup(popupContent, { closeButton: false }).openPopup();

            setTimeout(() => {
                const okBtn = document.getElementById('btn-ok-confirm');
                if (okBtn) {
                    okBtn.onclick = function () {
                        layer.closePopup();
                        layer.bindTooltip(`<b>${areaInMeters.toFixed(2)} m²</b> | ${totalCapacityKWp} kWp <br><small>☀️ Tilt: ${optimalTiltAngle}°</small>`, {
                            permanent: true,
                            direction: 'center',
                            className: 'polygon-area-label'
                        }).openTooltip();
                    };
                }
            }, 150);

        } catch (err) {
            console.error("خطأ في حساب الرسم والتوجيه:", err);
        }
    }

    function setupLayerToggleListeners() {
        const chkGhi = document.getElementById('chk-ghi');
        const chkDem = document.getElementById('chk-dem');
        const chkWind = document.getElementById('chk-wind');

        if (chkGhi) {
            chkGhi.addEventListener('change', function () {
                if (this.checked) map.addLayer(ghiLayer);
                else map.removeLayer(ghiLayer);
            });
        }

        if (chkDem) {
            chkDem.addEventListener('change', function () {
                if (this.checked) map.addLayer(demLayer);
                else map.removeLayer(demLayer);
            });
        }

        if (chkWind) {
            chkWind.addEventListener('change', function () {
                if (this.checked) map.addLayer(windLayer);
                else map.removeLayer(windLayer);
            });
        }
    }

    window.startPolygonDraw = function () {
        if (polygonDrawer) polygonDrawer.enable();
        else if (map) new L.Draw.Polygon(map).enable();
    };

    window.openSizingModal = function () {


        const modal = document.getElementById('sizing-modal');
        if (modal) modal.style.display = 'flex';
    };
    window.closeSizingModal = function () {
        const modal = document.getElementById('sizing-modal');
        if (modal) modal.style.display = 'none';
    };

    window.openReportModal = function () {
        const modal = document.getElementById('report-modal');
        if (modal) modal.style.display = 'flex';
    };

    window.closeReportModal = function () {
        const modal = document.getElementById('report-modal');
        if (modal) modal.style.display = 'none';
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

        alert('تم حساب الأحمال وتحديث التقرير الهندسي بنجاح! ✅');
        window.closeSizingModal();
    };

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
