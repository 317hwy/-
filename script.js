const chapters = [
  { title: "第一部分 传感器", summary: "梳理影像传感器、POS、LiDAR、SAR 及线阵/面阵成像机制。", tags: ["数字航摄仪", "POS", "LiDAR", "SAR"] },
  { title: "第二部分 空中摄影", summary: "聚焦焦距、航高、比例尺、重叠度、航带弯曲与像片旋偏角。", tags: ["比例尺", "GSD", "重叠度", "航高"] },
  { title: "第三部分 中心投影", summary: "建立点、线、面、像主点、像底点、等角点和主垂面的几何关系。", tags: ["点线面", "像主点", "主垂面", "透视变换"] },
  { title: "第四部分 共线方程", summary: "连接内外方位元素、旋转矩阵与像点-地面点之间的严密数学模型。", tags: ["内方位", "外方位", "旋转矩阵", "共线方程"] },
  { title: "第五部分 像点位移", summary: "通过投影差与倾斜位移解释中心投影影像的几何变形来源。", tags: ["投影差", "倾斜位移", "正射纠正"] },
  { title: "第六部分 后方交会", summary: "利用控制点和像点反求外方位元素，展示线性化与迭代收敛思想。", tags: ["控制点", "最小二乘", "迭代求解"] }
];

const sensors = {
  frame: {
    name: "面阵相机",
    badges: ["被动式", "中心投影", "大幅面拼接"],
    summary: "典型代表有 DMC、UCD、A3、SWDC。强调一次曝光获取框幅影像，后处理可合成大幅面中心投影像片。",
    bullets: ["DMC 使用多镜头同步曝光和 TDI 机制做像移补偿。", "UCD 依赖同地点延时曝光与连接点拼接。", "适合高分辨率测图与传统摄影测量流程。"],
    type: "frame"
  },
  line: {
    name: "线阵相机",
    badges: ["被动式", "推扫成像", "多中心投影"],
    summary: "典型代表是 ADS40/ADS80。沿飞行方向逐线扫描，前视、下视、后视形成三度重叠立体带。",
    bullets: ["垂直于飞行方向近似中心投影。", "沿飞行方向体现平行投影或多中心投影特征。", "一次飞行即可获得带状立体影像。"],
    type: "line"
  },
  pos: {
    name: "POS 定位定向系统",
    badges: ["GNSS", "IMU", "外方位元素"],
    summary: "GNSS 提供空间位置，IMU 提供姿态角，让摄影测量具备少控制甚至无控制作业能力。",
    bullets: ["输出平移参数 X、Y、Z 和姿态参数。", "显著提高航摄效率与经济性。", "也是 LiDAR、倾斜摄影等系统的重要基础。"],
    type: "pos"
  },
  lidar: {
    name: "LiDAR 激光扫描",
    badges: ["主动式", "测距", "DSM"],
    summary: "通过激光脉冲获取距离和位置，可穿透部分植被冠层，适合快速构建 DSM/DEM。",
    bullets: ["常与 POS 集成实现高精度直接定位。", "主动发射激光，不依赖自然光照。", "对植被、地形表达优势明显。"],
    type: "lidar"
  },
  sar: {
    name: "SAR 合成孔径雷达",
    badges: ["主动式", "微波", "全天时全天候"],
    summary: "通过侧视相干成像记录斜距信息，适合多云雾地区，但存在叠掩、阴影和斑点噪声等问题。",
    bullets: ["属于斜距投影系统，不可直接套用光学中心投影。", "具备穿云雾和雨雪能力。", "需要专门的雷达摄影测量几何模型。"],
    type: "sar"
  }
};

const chapterGrid = document.getElementById("chapterGrid");
chapters.forEach((chapter, index) => {
  const card = document.createElement("article");
  card.className = "chapter-card";
  card.style.animationDelay = `${index * 80}ms`;
  card.innerHTML = `<p class="eyebrow">Module ${index + 1}</p><h3>${chapter.title}</h3><p>${chapter.summary}</p><div class="metric-row">${chapter.tags.map((tag) => `<span class="metric-pill">${tag}</span>`).join("")}</div>`;
  chapterGrid.appendChild(card);
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const degToRad = (value) => value * Math.PI / 180;
const formatMatrixRow = (row) => row.map((value) => value.toFixed(3).padStart(7, " ")).join(" ");
const metricCard = (label, value, tip) => `<div class="metric-card"><span>${label}</span><strong>${value}</strong><small>${tip}</small></div>`;

const sensorImageStoreKey = "photogrammetry-demo-sensor-images";
const defaultSensorImage = "./assets/placeholders/sensor-placeholder.svg";
const defaultSensorImages = {
  frame: "./assets/frozen/sensor-frame.png",
  line: "./assets/frozen/sensor-line.png",
  pos: "./assets/frozen/sensor-pos.png",
  lidar: "./assets/frozen/sensor-lidar.png",
  sar: defaultSensorImage
};
const conceptImageStoreKey = "photogrammetry-demo-flight-concept-images";
const defaultConceptImages = {
  "tilt-angle": "./assets/frozen/concept-tilt-angle.png",
  "height-requirement": "./assets/frozen/concept-height-requirement.png",
  "forward-overlap": "./assets/frozen/concept-forward-overlap.png",
  "side-overlap": "./assets/frozen/concept-side-overlap.png",
  "triple-overlap": "./assets/frozen/concept-triple-overlap.png"
};
const panelImageStoreKey = "photogrammetry-demo-panel-images";
const defaultPanelImages = {
  flight: "./assets/frozen/panel-flight.png"
};
const imageDbName = "photogrammetry-demo-assets";
const imageStoreName = "images";
let imageDbPromise;

function openImageDb() {
  if (imageDbPromise) return imageDbPromise;
  imageDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(imageDbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(imageStoreName)) {
        db.createObjectStore(imageStoreName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return imageDbPromise;
}

async function imageDbGet(key) {
  const db = await openImageDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(imageStoreName, "readonly");
    const store = tx.objectStore(imageStoreName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function imageDbSet(key, value) {
  const db = await openImageDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(imageStoreName, "readwrite");
    const store = tx.objectStore(imageStoreName);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function migrateLegacyImage(key, legacyMap, legacyField) {
  if (!legacyMap || !legacyMap[legacyField]) return null;
  const value = legacyMap[legacyField];
  try {
    await imageDbSet(key, value);
    return value;
  } catch {
    return value;
  }
}

function initImageLightbox() {
  const lightbox = document.getElementById("imageLightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const closeButton = document.getElementById("lightboxClose");

  function openLightbox(sourceImage) {
    lightboxImage.src = sourceImage.currentSrc || sourceImage.src;
    lightboxImage.alt = sourceImage.alt || "图片放大预览";
    lightbox.classList.remove("hidden");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.add("hidden");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImage.src = "";
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".slot-preview, .concept-preview").forEach((image) => {
    image.addEventListener("click", () => openLightbox(image));
  });

  closeButton.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.classList.contains("hidden")) closeLightbox();
  });
}

function bindImageSlots() {
  const storedPanelImages = JSON.parse(localStorage.getItem(panelImageStoreKey) || "{}");

  document.querySelectorAll(".image-slot").forEach((slot) => {
    if (slot.dataset.slot === "sensor") return;
    const slotKey = slot.dataset.slot;
    const input = slot.querySelector("input[type='file']");
    const preview = slot.querySelector(".slot-preview");
    const dbKey = `panel:${slotKey}`;

    imageDbGet(dbKey).then((storedValue) => {
      if (storedValue) {
        preview.src = storedValue;
        return;
      }
      migrateLegacyImage(dbKey, storedPanelImages, slotKey).then((legacyValue) => {
        if (legacyValue) {
          preview.src = legacyValue;
        } else if (defaultPanelImages[slotKey]) {
          preview.src = defaultPanelImages[slotKey];
        }
      });
    }).catch(() => {
      if (storedPanelImages[slotKey]) preview.src = storedPanelImages[slotKey];
      else if (defaultPanelImages[slotKey]) preview.src = defaultPanelImages[slotKey];
    });

    const applyFile = (file) => {
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        preview.src = reader.result;
        imageDbSet(dbKey, reader.result).catch(() => {
          storedPanelImages[slotKey] = reader.result;
          localStorage.setItem(panelImageStoreKey, JSON.stringify(storedPanelImages));
        });
      };
      reader.readAsDataURL(file);
    };

    input.addEventListener("change", (event) => applyFile(event.target.files[0]));
    slot.addEventListener("dragover", (event) => {
      event.preventDefault();
      slot.style.borderColor = "rgba(217, 119, 6, 0.8)";
    });
    slot.addEventListener("dragleave", () => {
      slot.style.borderColor = "rgba(15, 118, 110, 0.3)";
    });
    slot.addEventListener("drop", (event) => {
      event.preventDefault();
      slot.style.borderColor = "rgba(15, 118, 110, 0.3)";
      applyFile(event.dataTransfer.files[0]);
    });
  });
}

function initConceptImageUploads() {
  const storedConceptImages = JSON.parse(localStorage.getItem(conceptImageStoreKey) || "{}");

  document.querySelectorAll(".concept-image-tools").forEach((tool) => {
    const key = tool.dataset.conceptKey;
    const input = tool.querySelector("input[type='file']");
    const preview = tool.querySelector(".concept-preview");
    const dbKey = `concept:${key}`;

    imageDbGet(dbKey).then((storedValue) => {
      if (storedValue) {
        preview.src = storedValue;
        preview.classList.remove("hidden");
        return;
      }
      migrateLegacyImage(dbKey, storedConceptImages, key).then((legacyValue) => {
        if (legacyValue) {
          preview.src = legacyValue;
          preview.classList.remove("hidden");
        } else if (defaultConceptImages[key]) {
          preview.src = defaultConceptImages[key];
          preview.classList.remove("hidden");
        }
      });
    }).catch(() => {
      if (storedConceptImages[key]) {
        preview.src = storedConceptImages[key];
        preview.classList.remove("hidden");
      } else if (defaultConceptImages[key]) {
        preview.src = defaultConceptImages[key];
        preview.classList.remove("hidden");
      }
    });

    input.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        preview.src = reader.result;
        preview.classList.remove("hidden");
        imageDbSet(dbKey, reader.result).catch(() => {
          storedConceptImages[key] = reader.result;
          localStorage.setItem(conceptImageStoreKey, JSON.stringify(storedConceptImages));
        });
      };
      reader.readAsDataURL(file);
    });
  });
}

function initSensors() {
  const sensorCanvas = document.getElementById("sensorCanvas");
  const ctx = sensorCanvas.getContext("2d");
  const buttons = document.getElementById("sensorButtons");
  const details = document.getElementById("sensorDetails");
  const metrics = document.getElementById("sensorMetrics");
  const sensorSlot = document.querySelector(".sensor-image-slot");
  const sensorInput = sensorSlot.querySelector("input[type='file']");
  const sensorPreview = document.getElementById("sensorPreview");
  const sensorLabel = document.getElementById("activeSensorImageLabel");
  const sensorState = document.getElementById("activeSensorImageState");
  const sensorThumbGrid = document.getElementById("sensorThumbGrid");
  let active = "frame";
  let scan = 0;
  const storedSensorImages = JSON.parse(localStorage.getItem(sensorImageStoreKey) || "{}");
  const sensorImages = Object.fromEntries(
    Object.keys(sensors).map((key) => [key, storedSensorImages[key] || defaultSensorImages[key] || defaultSensorImage])
  );

  function isDefaultSensorImage(key) {
    return sensorImages[key] === (defaultSensorImages[key] || defaultSensorImage);
  }

  function refreshSensorImagePanel() {
    const sensor = sensors[active];
    sensorPreview.src = sensorImages[active];
    sensorPreview.alt = `${sensor.name} 图片`;
    sensorLabel.textContent = `当前图片：${sensor.name}`;
    sensorState.textContent = isDefaultSensorImage(active)
      ? (defaultSensorImages[active] && defaultSensorImages[active] !== defaultSensorImage ? "状态：已固化内置图片" : "状态：默认占位图")
      : "状态：已上传专属图片";
    if (sensorThumbGrid) {
      sensorThumbGrid.innerHTML = Object.keys(sensors).map((key) => {
        const item = sensors[key];
        const status = isDefaultSensorImage(key) ? "未上传" : "已绑定图片";
        return `<div class="sensor-thumb${key === active ? " active" : ""}"><strong>${item.name}</strong><span>${status}</span></div>`;
      }).join("");
    }
  }

  function applySensorFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      sensorImages[active] = reader.result;
      refreshSensorImagePanel();
      imageDbSet(`sensor:${active}`, reader.result).catch(() => {
        localStorage.setItem(sensorImageStoreKey, JSON.stringify(sensorImages));
      });
    };
    reader.readAsDataURL(file);
  }

  Object.keys(sensors).forEach((key) => {
    imageDbGet(`sensor:${key}`).then((storedValue) => {
      if (storedValue) {
        sensorImages[key] = storedValue;
      } else if (storedSensorImages[key]) {
        sensorImages[key] = storedSensorImages[key];
        migrateLegacyImage(`sensor:${key}`, storedSensorImages, key);
      } else if (defaultSensorImages[key]) {
        sensorImages[key] = defaultSensorImages[key];
      }
      if (key === active) refreshSensorImagePanel();
    }).catch(() => {
      if (storedSensorImages[key]) {
        sensorImages[key] = storedSensorImages[key];
      } else if (defaultSensorImages[key]) {
        sensorImages[key] = defaultSensorImages[key];
        if (key === active) refreshSensorImagePanel();
      }
    });
  });

  Object.keys(sensors).forEach((key) => {
    const button = document.createElement("button");
    button.textContent = sensors[key].name;
    if (key === active) button.classList.add("active");
    button.addEventListener("click", () => {
      active = key;
      [...buttons.children].forEach((child) => child.classList.toggle("active", child === button));
      renderDetails();
      refreshSensorImagePanel();
      draw();
    });
    buttons.appendChild(button);
  });

  sensorInput.addEventListener("change", (event) => applySensorFile(event.target.files[0]));
  sensorSlot.addEventListener("dragover", (event) => {
    event.preventDefault();
    sensorSlot.style.borderColor = "rgba(217, 119, 6, 0.8)";
  });
  sensorSlot.addEventListener("dragleave", () => {
    sensorSlot.style.borderColor = "rgba(15, 118, 110, 0.3)";
  });
  sensorSlot.addEventListener("drop", (event) => {
    event.preventDefault();
    sensorSlot.style.borderColor = "rgba(15, 118, 110, 0.3)";
    applySensorFile(event.dataTransfer.files[0]);
  });

  function renderDetails() {
    const sensor = sensors[active];
    details.innerHTML = `<h3>${sensor.name}</h3><p>${sensor.summary}</p><div class="metric-row">${sensor.badges.map((badge) => `<span class="sensor-badge">${badge}</span>`).join("")}</div><ul class="mini-list">${sensor.bullets.map((item) => `<li>${item}</li>`).join("")}</ul>`;
    metrics.innerHTML = sensor.badges.map((badge) => `<span class="metric-pill">${badge}</span>`).join("");
  }

  function drawGround() {
    ctx.strokeStyle = "#68767d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 280);
    ctx.lineTo(520, 280);
    ctx.stroke();
    ctx.fillStyle = "#54636a";
    ctx.fillText("地面", 424, 302);
  }

  function drawPlaneBody() {
    ctx.save();
    ctx.translate(180 + Math.sin(scan * 0.02) * 60, 90);
    ctx.fillStyle = "#173641";
    ctx.beginPath();
    ctx.moveTo(-28, 0); ctx.lineTo(18, -10); ctx.lineTo(35, 0); ctx.lineTo(18, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-6, -30, 12, 60);
    ctx.restore();
  }

  function drawSensorCaption(lines) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 250, 241, 0.96)";
    ctx.strokeStyle = "rgba(15, 118, 110, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(32, 294, 244, 58, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#173641";
    ctx.font = "13px Segoe UI Variable Display";
    lines.forEach((line, index) => {
      ctx.fillText(line, 46, 314 + index * 16);
    });
    ctx.restore();
  }

  function draw() {
    const sensor = sensors[active];
    ctx.clearRect(0, 0, sensorCanvas.width, sensorCanvas.height);
    ctx.fillStyle = "#20323b";
    ctx.font = "15px Segoe UI Variable Display";
    drawGround();
    drawPlaneBody();

    if (sensor.type === "frame") {
      ctx.strokeStyle = "rgba(15, 118, 110, 0.8)";
      ctx.fillStyle = "rgba(15, 118, 110, 0.16)";
      ctx.beginPath();
      ctx.moveTo(180, 90); ctx.lineTo(105, 280); ctx.lineTo(255, 280); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#173641";
      ctx.fillText("单次曝光形成框幅像片", 300, 110);
    } else if (sensor.type === "line") {
      for (let i = 0; i < 6; i += 1) {
        const y = 90 + i * 10;
        ctx.strokeStyle = `rgba(217, 119, 6, ${0.35 + i * 0.08})`;
        ctx.beginPath();
        ctx.moveTo(180, y); ctx.lineTo(120 + i * 12 + (scan % 40), 280); ctx.stroke();
      }
      ctx.fillStyle = "#173641";
      ctx.fillText("推扫式逐线成像", 320, 110);
    } else if (sensor.type === "pos") {
      ctx.strokeStyle = "rgba(15, 118, 110, 0.8)";
      ctx.beginPath();
      ctx.arc(180, 90, 48, 0, Math.PI * 2);
      ctx.stroke();
      ["X", "Y", "Z"].forEach((axis, index) => {
        ctx.strokeStyle = ["#0f766e", "#d97706", "#1d4ed8"][index];
        ctx.beginPath();
        ctx.moveTo(180, 90);
        ctx.lineTo(180 + [70, -30, 0][index], 90 + [10, 45, -65][index]);
        ctx.stroke();
        ctx.fillText(axis, 186 + [70, -30, 0][index], 90 + [10, 45, -65][index]);
      });
      ctx.fillStyle = "#173641";
      ctx.font = "14px Segoe UI Variable Display";
      ctx.fillText("低轨卫星GNSS定轨：", 286, 60);
      ctx.fillText("卫星轨道状态参数、动力学模型参数、", 286, 82);
      ctx.fillText("观测模型参数等", 286, 104);
      ctx.fillText("恒星敏感器定姿：", 286, 146);
      ctx.fillText("星敏测量坐标系相对于J2000惯性系的", 286, 168);
      ctx.fillText("姿态矩阵", 286, 190);
      ctx.font = "15px Segoe UI Variable Display";
    } else if (sensor.type === "lidar") {
      for (let i = -3; i <= 3; i += 1) {
        ctx.strokeStyle = "rgba(15, 118, 110, 0.68)";
        ctx.beginPath();
        ctx.moveTo(180, 90); ctx.lineTo(180 + i * 40, 280 - Math.abs(i) * 12); ctx.stroke();
      }
      ctx.fillStyle = "#173641";
      ctx.fillText("•机载激光扫描仪", 320, 90);
      ctx.fillText("•星载激光扫描仪", 320, 116);
      ctx.fillText("•激光三维扫描仪（地面）", 320, 142);
    } else if (sensor.type === "sar") {
      ctx.strokeStyle = "rgba(217, 119, 6, 0.78)";
      ctx.beginPath();
      ctx.moveTo(180, 90); ctx.lineTo(320, 170); ctx.lineTo(320, 280); ctx.stroke();
      ctx.fillStyle = "rgba(217, 119, 6, 0.14)";
      ctx.fillRect(320, 170, 140, 110);
      ctx.fillStyle = "#173641";
      ctx.fillText("侧视斜距投影", 320, 112);
      ctx.fillText("全天时全天候成像", 320, 136);
    }
    ctx.fillStyle = "rgba(255, 250, 241, 0.98)";
    ctx.fillRect(272, 42, 250, 166);
    ctx.fillStyle = "#54636a";
    ctx.fillText("鍦伴潰", 424, 302);

    if (sensor.type === "frame") {
      drawSensorCaption(["鍗曟鏇濆厜褰㈡垚妗嗗箙鍍忕墖"]);
    } else if (sensor.type === "line") {
      drawSensorCaption(["鎺ㄦ壂寮忛€愮嚎鎴愬儚"]);
    } else if (sensor.type === "pos") {
      drawSensorCaption([
        "GNSS / IMU 杩炲悎瀹氫綅瀹氬悜",
        "杈撳嚭 X銆乊銆乑 鍙婂Э鎬佸弬鏁",
        "涓虹洿鎺ュ鏂逛綅鎻愪緵鍩虹"
      ]);
    } else if (sensor.type === "lidar") {
      drawSensorCaption([
        "鏈鸿浇 / 鏄熻浇婵€鍏夋壂鎻",
        "涓诲姩寮忔祴璺濅笌涓夌淮閲囬泦",
        "閫傚悎 DSM / DEM 蹇€熸瀯寤"
      ]);
    } else if (sensor.type === "sar") {
      drawSensorCaption([
        "渚ц鏂滆窛鎶曞奖",
        "鍏ㄥぉ鏃跺叏澶╁€欐垚鍍",
        "閫傚悎澶氫簯闆惧拰瀹忚鐩戞祴"
      ]);
    }
  }

  function loop() {
    scan += 1;
    draw();
    requestAnimationFrame(loop);
  }

  renderDetails();
  refreshSensorImagePanel();
  loop();
}

function initFlightPlanner() {
  const focalSlider = document.getElementById("focalSlider");
  const heightSlider = document.getElementById("heightSlider");
  const pixelSlider = document.getElementById("pixelSlider");
  const forwardOverlapSlider = document.getElementById("forwardOverlapSlider");
  const sideOverlapSlider = document.getElementById("sideOverlapSlider");
  const metrics = document.getElementById("flightMetrics");
  const notes = document.getElementById("flightNotes");
  const canvas = document.getElementById("flightCanvas");
  const ctx = canvas.getContext("2d");

  function drawFlight(height, forward, side) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#20323b";
    ctx.font = "15px Segoe UI Variable Display";
    ctx.strokeStyle = "#68767d";
    ctx.beginPath();
    ctx.moveTo(44, 260); ctx.lineTo(520, 260); ctx.stroke();
    ctx.fillText("测区地面", 44, 286);
    const photoWidth = 120;
    const forwardGap = photoWidth * (1 - forward / 100);
    const photoA = 90;
    const photoB = photoA + forwardGap;
    const sideShift = 80 * (1 - side / 100);
    const planeY = 70 - clamp((height - 1200) / 40, -20, 20);
    [[photoA, "#0f766e"], [photoB, "#d97706"]].forEach(([x, color]) => {
      ctx.fillStyle = `${color}22`;
      ctx.strokeStyle = color;
      ctx.fillRect(x, 160, photoWidth, 70);
      ctx.strokeRect(x, 160, photoWidth, 70);
      ctx.beginPath();
      ctx.moveTo(x + photoWidth / 2, planeY);
      ctx.lineTo(x + 10, 230);
      ctx.lineTo(x + photoWidth - 10, 230);
      ctx.closePath();
      ctx.stroke();
    });
    ctx.fillStyle = "#173641";
    ctx.fillText(`航向重叠 ${forward}%`, 72, 52);
    ctx.fillText(`旁向重叠 ${side}%`, 250, 52);
    ctx.fillText(`相对航高 ${height} m`, 400, 52);
    ctx.strokeStyle = "rgba(217, 119, 6, 0.7)";
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(100, 95, 280, 120 + sideShift);
    ctx.setLineDash([]);
    ctx.fillText("相邻航带覆盖示意", 356, 228);
  }

  function render() {
    const focal = Number(focalSlider.value);
    const height = Number(heightSlider.value);
    const pixel = Number(pixelSlider.value);
    const forward = Number(forwardOverlapSlider.value);
    const side = Number(sideOverlapSlider.value);
    const scale = Math.round((height * 1000) / focal);
    const gsd = (height * pixel) / (1000 * focal);
    const flightState = forward >= 60 && side >= 30 ? "满足立体测图常用要求" : "重叠度偏低，立体覆盖风险增加";
    metrics.innerHTML = [
      metricCard("摄影比例尺", `1:${scale}`, "比例尺分母越小，像片越大"),
      metricCard("GSD", `${gsd.toFixed(3)} m`, "地面分辨率"),
      metricCard("航向重叠", `${forward}%`, "建议 60%~65%"),
      metricCard("旁向重叠", `${side}%`, "建议 30%~35%")
    ].join("");
    notes.innerHTML = `<h3>航摄设计提示</h3><p>当前组合下，焦距 <strong>${focal} mm</strong>、航高 <strong>${height} m</strong>，估算比例尺约为 <strong>1:${scale}</strong>。</p><p>${flightState}。若希望更细的地面分辨率，可适当降低航高或提高焦距。</p>`;
    drawFlight(height, forward, side);
  }

  [focalSlider, heightSlider, pixelSlider, forwardOverlapSlider, sideOverlapSlider].forEach((slider) => slider.addEventListener("input", render));
  render();
}

function rotationMatrix(phi, omega, kappa) {
  const p = degToRad(phi), o = degToRad(omega), k = degToRad(kappa);
  const cp = Math.cos(p), sp = Math.sin(p), co = Math.cos(o), so = Math.sin(o), ck = Math.cos(k), sk = Math.sin(k);
  const rx = [[1, 0, 0], [0, cp, -sp], [0, sp, cp]];
  const ry = [[co, 0, so], [0, 1, 0], [-so, 0, co]];
  const rz = [[ck, -sk, 0], [sk, ck, 0], [0, 0, 1]];
  const multiply = (a, b) => a.map((row, i) => b[0].map((_, j) => row.reduce((sum, _, k2) => sum + a[i][k2] * b[k2][j], 0)));
  return multiply(rz, multiply(ry, rx));
}

const transformVector = (matrix, vector) => matrix.map((row) => row[0] * vector[0] + row[1] * vector[1] + row[2] * vector[2]);

function initGeometryLab() {
  const canvas = document.getElementById("geometryCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const matrixOutput = document.getElementById("matrixOutput");
  const modeButtons = [...document.querySelectorAll("#geometryMode button")];
  const controls = {
    pointX: document.getElementById("pointX"),
    pointY: document.getElementById("pointY"),
    pointZ: document.getElementById("pointZ"),
    phi: document.getElementById("phiSlider"),
    omega: document.getElementById("omegaSlider"),
    kappa: document.getElementById("kappaSlider")
  };
  let mode = "all";
  let orbit = 0;

  const project = (point) => {
    const [x, y, z] = point;
    const cameraZ = 260;
    const scale = cameraZ / (cameraZ - z);
    return [280 + x * scale, 250 - y * scale];
  };

  function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#20323b";
    ctx.font = "15px Segoe UI Variable Display";
    [["X", [100, 0, 0], "#0f766e"], ["Y", [0, 100, 0], "#d97706"], ["Z", [0, 0, 120], "#1d4ed8"]].forEach(([label, axis, color]) => {
      const [x1, y1] = project([0, 0, 0]);
      const [x2, y2] = project(axis);
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillText(label, x2 + 6, y2);
    });

    const phi = Number(controls.phi.value);
    const omega = Number(controls.omega.value);
    const kappa = Number(controls.kappa.value) + orbit * 0.2;
    const point = [Number(controls.pointX.value), Number(controls.pointY.value), Number(controls.pointZ.value)];
    const matrix = rotationMatrix(phi, omega, kappa);
    const rotatedPoint = transformVector(matrix, point);
    const plane = [[-90, -30, 0], [90, -30, 0], [90, 60, 0], [-90, 60, 0]].map((v) => transformVector(matrix, v));
    const lineStart = transformVector(matrix, [-70, -40, 10]);
    const lineEnd = transformVector(matrix, [90, 70, 85]);

    if (mode === "all" || mode === "plane") {
      ctx.fillStyle = "rgba(15, 118, 110, 0.14)";
      ctx.strokeStyle = "rgba(15, 118, 110, 0.7)";
      ctx.beginPath();
      plane.forEach((v, index) => {
        const [x, y] = project(v);
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#0f766e";
      ctx.fillText("面：像片面 / 地面 / 主垂面的抽象表达", 24, 34);
    }

    if (mode === "all" || mode === "line") {
      const [x1, y1] = project(lineStart);
      const [x2, y2] = project(lineEnd);
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = "#d97706";
      ctx.fillText("线：方向与交比不变性的载体", 24, 58);
    }

    if (mode === "all" || mode === "point") {
      const [x, y] = project(rotatedPoint);
      ctx.fillStyle = "#1d4ed8";
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText("点 P", x + 10, y - 8);
      ctx.fillText("点：最基本的空间定位单元", 24, 82);
    }

    matrixOutput.textContent = `R =\n${formatMatrixRow(matrix[0])}\n${formatMatrixRow(matrix[1])}\n${formatMatrixRow(matrix[2])}\n\nP = [${point.map((v) => v.toFixed(1)).join(", ")}]\nR·P = [${rotatedPoint.map((v) => v.toFixed(2)).join(", ")}]`;
  }

  const animate = () => { orbit += 1; drawScene(); requestAnimationFrame(animate); };
  Object.values(controls).forEach((control) => control.addEventListener("input", drawScene));
  modeButtons.forEach((button) => button.addEventListener("click", () => {
    mode = button.dataset.mode;
    modeButtons.forEach((item) => item.classList.toggle("active", item === button));
    drawScene();
  }));
  animate();
}

function initProjectionLab() {
  const canvas = document.getElementById("projectionCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const alphaSlider = document.getElementById("alphaSlider");
  const groundXSlider = document.getElementById("groundXSlider");
  const groundHSlider = document.getElementById("groundHSlider");
  const output = document.getElementById("collinearityOutput");
  if (!alphaSlider || !groundXSlider || !groundHSlider || !output) return;
  const focal = 120;
  const H = 900;

  function render() {
    const alpha = Number(alphaSlider.value);
    const groundX = Number(groundXSlider.value);
    const groundH = Number(groundHSlider.value);
    const alphaRad = degToRad(alpha);
    const camera = { x: 220, y: 70 };
    const axis = { x: Math.sin(alphaRad), y: Math.cos(alphaRad) };
    const planeNormal = { x: axis.x, y: axis.y };
    const planeDir = { x: planeNormal.y, y: -planeNormal.x };
    const principalPoint = { x: camera.x + planeNormal.x * focal * 0.45, y: camera.y + planeNormal.y * focal * 0.45 };
    const imageA = { x: principalPoint.x + planeDir.x * 160, y: principalPoint.y + planeDir.y * 160 };
    const imageB = { x: principalPoint.x - planeDir.x * 160, y: principalPoint.y - planeDir.y * 160 };
    const imageBottom = { x: camera.x, y: principalPoint.y + (principalPoint.x - camera.x) * (planeDir.y / (planeDir.x || 1e-6)) };
    const equalAngle = { x: camera.x + Math.sin(alphaRad / 2) * focal * 0.5, y: camera.y + Math.cos(alphaRad / 2) * focal * 0.5 };
    const groundPoint = { x: 220 + groundX * 1.8, y: 320 - groundH * 1.6 };
    const denominator = (groundPoint.x - camera.x) * planeNormal.x + (groundPoint.y - camera.y) * planeNormal.y || 1e-6;
    const numerator = (principalPoint.x - camera.x) * planeNormal.x + (principalPoint.y - camera.y) * planeNormal.y;
    const t = numerator / denominator;
    const projectedPoint = { x: camera.x + (groundPoint.x - camera.x) * t, y: camera.y + (groundPoint.y - camera.y) * t };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#20323b";
    ctx.font = "15px Segoe UI Variable Display";
    ctx.strokeStyle = "#68767d";
    ctx.beginPath();
    ctx.moveTo(30, 320); ctx.lineTo(530, 320); ctx.stroke();
    ctx.fillText("地面 E", 34, 344);
    ctx.strokeStyle = "#0f766e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(imageA.x, imageA.y); ctx.lineTo(imageB.x, imageB.y); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillText("像片面 P", imageA.x + 10, imageA.y - 12);
    ctx.fillStyle = "#173641";
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText("S 摄影中心", camera.x + 10, camera.y - 10);
    ctx.strokeStyle = "#173641";
    ctx.beginPath();
    ctx.moveTo(camera.x, camera.y); ctx.lineTo(projectedPoint.x, projectedPoint.y); ctx.lineTo(groundPoint.x, groundPoint.y); ctx.stroke();
    [["o", principalPoint], ["n", imageBottom], ["c", equalAngle], ["P", projectedPoint]].forEach(([label, point]) => {
      ctx.fillStyle = label === "c" ? "#d97706" : "#1d4ed8";
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(label, point.x + 8, point.y - 6);
    });
    ctx.fillStyle = "#d97706";
    ctx.fillRect(groundPoint.x - 6, groundPoint.y, 12, 320 - groundPoint.y);
    ctx.fillText("地物点", groundPoint.x + 10, groundPoint.y - 8);
    const xImage = -focal * (groundX / (H - groundH));
    const yImage = -focal * (groundH / H);
    output.textContent = `α = ${alpha.toFixed(1)}°\n地面点 = (${groundX.toFixed(1)}, ${groundH.toFixed(1)})\n示意像点 x ≈ ${xImage.toFixed(2)} mm\n示意像点 y ≈ ${yImage.toFixed(2)} mm\n\n说明：此处采用简化演示模型，重点突出“摄影中心-像点-地面点共线”的几何关系。`;
  }

  [alphaSlider, groundXSlider, groundHSlider].forEach((slider) => slider.addEventListener("input", render));
  render();
}

function initDisplacementLab() {
  const canvas = document.getElementById("displacementCanvas");
  const ctx = canvas.getContext("2d");
  const radiusSlider = document.getElementById("radiusSlider");
  const reliefSlider = document.getElementById("reliefSlider");
  const flightHSlider = document.getElementById("flightHSlider");
  const tiltSlider = document.getElementById("tiltSlider");
  const thetaSlider = document.getElementById("thetaSlider");
  const metrics = document.getElementById("displacementMetrics");
  const focal = 120;

  function render() {
    const r = Number(radiusSlider.value);
    const h = Number(reliefSlider.value);
    const H = Number(flightHSlider.value);
    const alpha = Number(tiltSlider.value);
    const theta = Number(thetaSlider.value);
    const relief = (h / H) * r;
    const tilt = ((r * r) / focal) * Math.sin(degToRad(alpha)) * Math.cos(degToRad(theta));
    const combined = relief + tilt;
    metrics.innerHTML = [
      metricCard("投影差 δr_h", `${relief.toFixed(2)} mm`, "以像底点为中心"),
      metricCard("倾斜位移 δr_α", `${tilt.toFixed(2)} mm`, "以等角点为中心"),
      metricCard("综合位移", `${combined.toFixed(2)} mm`, "两类位移叠加"),
      metricCard("当前结论", combined >= 0 ? "向外偏移" : "向内偏移", "取决于高差与倾角组合")
    ].join("");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#20323b";
    ctx.font = "15px Segoe UI Variable Display";
    const centerN = { x: 170, y: 180 };
    const centerC = { x: 380, y: 180 };
    const pointBase = { x: centerN.x + r * 1.8, y: centerN.y };
    const pointRelief = { x: pointBase.x + relief * 4, y: pointBase.y };
    const pointTilt = { x: centerC.x + r * Math.cos(degToRad(theta)) * 1.2, y: centerC.y - r * Math.sin(degToRad(theta)) * 1.2 };
    const pointTiltMoved = { x: pointTilt.x + tilt * Math.cos(degToRad(theta)) * 4, y: pointTilt.y - tilt * Math.sin(degToRad(theta)) * 4 };
    [centerN, centerC].forEach((center, index) => {
      ctx.fillStyle = index === 0 ? "#0f766e" : "#d97706";
      ctx.beginPath();
      ctx.arc(center.x, center.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(index === 0 ? "n 像底点" : "c 等角点", center.x + 10, center.y - 10);
    });
    ctx.strokeStyle = "#0f766e";
    ctx.beginPath();
    ctx.moveTo(centerN.x, centerN.y); ctx.lineTo(pointBase.x, pointBase.y); ctx.stroke();
    ctx.strokeStyle = "#1d4ed8";
    ctx.beginPath();
    ctx.moveTo(pointBase.x, pointBase.y); ctx.lineTo(pointRelief.x, pointRelief.y); ctx.stroke();
    ctx.fillStyle = "#1d4ed8";
    ctx.fillText("投影差", pointRelief.x + 10, pointRelief.y - 8);
    ctx.strokeStyle = "#d97706";
    ctx.beginPath();
    ctx.moveTo(centerC.x, centerC.y); ctx.lineTo(pointTilt.x, pointTilt.y); ctx.stroke();
    ctx.strokeStyle = "#8b5cf6";
    ctx.beginPath();
    ctx.moveTo(pointTilt.x, pointTilt.y); ctx.lineTo(pointTiltMoved.x, pointTiltMoved.y); ctx.stroke();
    ctx.fillStyle = "#8b5cf6";
    ctx.fillText("倾斜位移", pointTiltMoved.x + 10, pointTiltMoved.y - 8);
  }

  [radiusSlider, reliefSlider, flightHSlider, tiltSlider, thetaSlider].forEach((slider) => slider.addEventListener("input", render));
  render();
}

function initDisplacementLabV2() {
  const canvas = document.getElementById("displacementCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const radiusSlider = document.getElementById("radiusSlider");
  const reliefSlider = document.getElementById("reliefSlider");
  const flightHSlider = document.getElementById("flightHSlider");
  const tiltSlider = document.getElementById("tiltSlider");
  const thetaSlider = document.getElementById("thetaSlider");
  const metrics = document.getElementById("displacementMetrics");
  if (!radiusSlider || !reliefSlider || !flightHSlider || !tiltSlider || !thetaSlider || !metrics) return;
  const focal = 120;

  function render() {
    const r = Number(radiusSlider.value);
    const h = Number(reliefSlider.value);
    const H = Number(flightHSlider.value);
    const alpha = Number(tiltSlider.value);
    const phi = Number(thetaSlider.value);
    const relief = (r * h) / H;
    const tilt = -((r * r) / focal) * Math.sin(degToRad(phi)) * Math.sin(degToRad(alpha));
    const combined = relief + tilt;
    const tiltDirection = Math.abs(tilt) < 0.01
      ? "等比线方向，倾斜位移为零"
      : (phi > 0 && phi < 180 ? "向等角点 c 位移" : "背离等角点 c 位移");
    const reliefDirection = relief >= 0 ? "背离像底点 n" : "向像底点 n 回缩";

    metrics.innerHTML = [
      metricCard("倾斜位移 δα", `${tilt.toFixed(2)} mm`, tiltDirection),
      metricCard("地形位移 δh", `${relief.toFixed(2)} mm`, reliefDirection),
      metricCard("综合位移", `${combined.toFixed(2)} mm`, "两类位移叠加后的效果"),
      metricCard("当前特征", Math.abs(tilt) < 0.01 ? "倾斜位移为零" : (combined >= 0 ? "整体偏外" : "整体偏内"), `φ = ${phi.toFixed(0)}°, α = ${alpha.toFixed(0)}°`)
    ].join("");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#20323b";
    ctx.font = "15px Segoe UI Variable Display";
    ctx.fillText("左：像片倾斜引起的像点位移 δα", 28, 28);
    ctx.fillText("右：地形起伏引起的像点位移 δh", 302, 28);

    const centerC = { x: 150, y: 198 };
    const centerN = { x: 418, y: 198 };
    const angle = degToRad(phi);
    const radiusScale = 1.05;
    const shiftScale = 5.2;

    const baseTiltPoint = {
      x: centerC.x + r * radiusScale * Math.cos(angle),
      y: centerC.y - r * radiusScale * Math.sin(angle)
    };
    const tiltVectorLength = Math.hypot(centerC.x - baseTiltPoint.x, centerC.y - baseTiltPoint.y) || 1;
    const tiltUnit = {
      x: (centerC.x - baseTiltPoint.x) / tiltVectorLength,
      y: (centerC.y - baseTiltPoint.y) / tiltVectorLength
    };
    const tiltPointMoved = {
      x: baseTiltPoint.x + tiltUnit.x * tilt * shiftScale,
      y: baseTiltPoint.y + tiltUnit.y * tilt * shiftScale
    };

    const baseReliefPoint = {
      x: centerN.x + r * radiusScale * Math.cos(angle),
      y: centerN.y - r * radiusScale * Math.sin(angle)
    };
    const reliefVectorLength = Math.hypot(baseReliefPoint.x - centerN.x, baseReliefPoint.y - centerN.y) || 1;
    const reliefUnit = {
      x: (baseReliefPoint.x - centerN.x) / reliefVectorLength,
      y: (baseReliefPoint.y - centerN.y) / reliefVectorLength
    };
    const reliefPointMoved = {
      x: baseReliefPoint.x + reliefUnit.x * relief * shiftScale,
      y: baseReliefPoint.y + reliefUnit.y * relief * shiftScale
    };

    ctx.strokeStyle = "rgba(15, 118, 110, 0.35)";
    ctx.beginPath();
    ctx.moveTo(40, centerC.y);
    ctx.lineTo(260, centerC.y);
    ctx.stroke();
    ctx.fillStyle = "#0f766e";
    ctx.fillText("hchc", 44, centerC.y - 8);

    ctx.strokeStyle = "rgba(217, 119, 6, 0.35)";
    ctx.beginPath();
    ctx.moveTo(centerC.x, 78);
    ctx.lineTo(centerC.x, 316);
    ctx.stroke();
    ctx.fillStyle = "#d97706";
    ctx.fillText("主纵线", centerC.x + 8, 92);

    [centerC, centerN].forEach((center, index) => {
      ctx.fillStyle = index === 0 ? "#d97706" : "#0f766e";
      ctx.beginPath();
      ctx.arc(center.x, center.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(index === 0 ? "c 等角点" : "n 像底点", center.x + 10, center.y - 10);
    });

    ctx.strokeStyle = "rgba(24, 33, 38, 0.28)";
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(centerC.x, centerC.y);
    ctx.lineTo(baseTiltPoint.x, baseTiltPoint.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerN.x, centerN.y);
    ctx.lineTo(baseReliefPoint.x, baseReliefPoint.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#1d4ed8";
    ctx.beginPath();
    ctx.arc(baseTiltPoint.x, baseTiltPoint.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText("a0", baseTiltPoint.x + 8, baseTiltPoint.y - 8);
    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(baseTiltPoint.x, baseTiltPoint.y);
    ctx.lineTo(tiltPointMoved.x, tiltPointMoved.y);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = "#8b5cf6";
    ctx.beginPath();
    ctx.arc(tiltPointMoved.x, tiltPointMoved.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText("a", tiltPointMoved.x + 8, tiltPointMoved.y - 8);
    ctx.fillText(`δα = ${tilt.toFixed(2)} mm`, 36, 334);

    ctx.fillStyle = "#1d4ed8";
    ctx.beginPath();
    ctx.arc(baseReliefPoint.x, baseReliefPoint.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText("b0", baseReliefPoint.x + 8, baseReliefPoint.y - 8);
    ctx.strokeStyle = "#0f766e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(baseReliefPoint.x, baseReliefPoint.y);
    ctx.lineTo(reliefPointMoved.x, reliefPointMoved.y);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = "#0f766e";
    ctx.beginPath();
    ctx.arc(reliefPointMoved.x, reliefPointMoved.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText("b", reliefPointMoved.x + 8, reliefPointMoved.y - 8);
    ctx.fillText(`δh = ${relief.toFixed(2)} mm`, 312, 334);

    ctx.fillStyle = "#20323b";
    ctx.fillText(`φ = ${phi.toFixed(0)}°`, 114, 56);
    ctx.fillText(`α = ${alpha.toFixed(0)}°`, 190, 56);
    ctx.fillText(`h = ${h.toFixed(0)} m`, 382, 56);
    ctx.fillText(`H = ${H.toFixed(0)} m`, 460, 56);
  }

  [radiusSlider, reliefSlider, flightHSlider, tiltSlider, thetaSlider].forEach((slider) => slider.addEventListener("input", render));
  render();
}

function initDisplacementLabV3() {
  const canvas = document.getElementById("displacementCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const radiusSlider = document.getElementById("radiusSlider");
  const reliefSlider = document.getElementById("reliefSlider");
  const flightHSlider = document.getElementById("flightHSlider");
  const tiltSlider = document.getElementById("tiltSlider");
  const thetaSlider = document.getElementById("thetaSlider");
  const metrics = document.getElementById("displacementMetrics");
  if (!radiusSlider || !reliefSlider || !flightHSlider || !tiltSlider || !thetaSlider || !metrics) return;
  const focal = 120;

  const clampLocal = (value, min, max) => Math.max(min, Math.min(max, value));

  function intersectHorizontal(p1, p2, y) {
    const t = (y - p1.y) / ((p2.y - p1.y) || 1e-6);
    return { x: p1.x + (p2.x - p1.x) * t, y };
  }

  function render() {
    const r = Number(radiusSlider.value);
    const h = Number(reliefSlider.value);
    const H = Number(flightHSlider.value);
    const alpha = Number(tiltSlider.value);
    const phi = Number(thetaSlider.value);
    const relief = (r * h) / H;
    const tilt = -((r * r) / focal) * Math.sin(degToRad(phi)) * Math.sin(degToRad(alpha));
    const combined = relief + tilt;
    const tiltDirection = Math.abs(tilt) < 0.01
      ? "等比线方向，倾斜位移为零"
      : (phi > 0 && phi < 180 ? "向等角点 c 位移" : "背离等角点 c 位移");
    const reliefDirection = relief >= 0 ? "背离像底点 n" : "向像底点 n 回缩";

    metrics.innerHTML = [
      metricCard("倾斜位移 δα", `${tilt.toFixed(2)} mm`, tiltDirection),
      metricCard("地形位移 δh", `${relief.toFixed(2)} mm`, reliefDirection),
      metricCard("综合位移", `${combined.toFixed(2)} mm`, "两类位移叠加后的效果"),
      metricCard("当前参数", `φ=${phi.toFixed(0)}°, α=${alpha.toFixed(0)}°`, `h=${h.toFixed(0)} m, H=${H.toFixed(0)} m`)
    ].join("");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#20323b";
    ctx.font = "14px Segoe UI Variable Display";
    ctx.fillText(`δα=${tilt.toFixed(2)} mm`, 36, 24);
    ctx.fillText(`δh=${relief.toFixed(2)} mm`, 316, 24);

    const left = { x: 34, y: 44, w: 230, h: 248 };
    const right = { x: 302, y: 44, w: 224, h: 248 };

    const s1 = { x: left.x + left.w / 2, y: left.y + 6 };
    const A = { x: left.x + 24, y: left.y + left.h - 18 };
    const B = { x: s1.x, y: A.y };
    const C = { x: left.x + left.w - 24, y: A.y };
    const baseBlueLeft = { x: left.x - 8, y: left.y + 172 };
    const baseBlueRight = { x: left.x + left.w - 2, y: left.y + 168 };
    const pRaise = alpha * 2.2;
    const pLeft = { x: left.x - 34, y: left.y + 136 - pRaise * 0.35 };
    const pRight = { x: left.x + left.w - 40, y: left.y + 116 - pRaise };
    const lineYAtX = (x) => pLeft.y + (pRight.y - pLeft.y) * ((x - pLeft.x) / (pRight.x - pLeft.x));
    const aLinePt = { x: left.x + 56, y: lineYAtX(left.x + 56) };
    const bLinePt = { x: B.x, y: lineYAtX(B.x) };
    const cLinePt = { x: left.x + left.w - 54, y: lineYAtX(left.x + left.w - 54) };

    ctx.strokeStyle = "#27b60d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(s1.x, s1.y);
    ctx.lineTo(C.x, C.y);
    ctx.moveTo(B.x, B.y);
    ctx.lineTo(s1.x, s1.y);
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(C.x, C.y);
    ctx.stroke();

    ctx.strokeStyle = "#ff4525";
    ctx.beginPath();
    ctx.moveTo(pLeft.x, pLeft.y);
    ctx.lineTo(pRight.x, pRight.y);
    ctx.stroke();

    ctx.strokeStyle = "#2030f2";
    ctx.beginPath();
    ctx.moveTo(baseBlueLeft.x, baseBlueLeft.y);
    ctx.lineTo(baseBlueRight.x, baseBlueRight.y);
    ctx.stroke();

    ctx.fillStyle = "#ff4525";
    ctx.font = "20px Georgia, STZhongsong, serif";
    ctx.fillText("S", s1.x - 8, s1.y - 16);
    ctx.fillText("A", A.x - 18, A.y + 26);
    ctx.fillText("B", B.x - 10, B.y + 26);
    ctx.fillText("C", C.x + 16, C.y + 8);
    ctx.fillText("p", pLeft.x - 18, pLeft.y + 16);
    ctx.fillText("a", aLinePt.x - 22, aLinePt.y - 14);
    ctx.fillText("b", bLinePt.x + 10, bLinePt.y - 2);
    ctx.fillText("c", cLinePt.x + 10, cLinePt.y - 10);

    const s2 = { x: right.x + right.w / 2, y: right.y + 2 };
    const topY = right.y + 78 - alpha * 1.1;
    const baseY = right.y + 198;
    const span = 86 + r * 0.45;
    const A0 = { x: s2.x - span, y: baseY };
    const B0 = { x: s2.x + span, y: baseY };
    const ATop = { x: A0.x, y: baseY - clampLocal(h * 0.8, -24, 60) };
    const BDown = { x: B0.x, y: baseY + clampLocal(h * 0.95, -50, 60) };
    const a0 = intersectHorizontal(s2, A0, topY);
    const a1 = intersectHorizontal(s2, ATop, topY);
    const b0 = intersectHorizontal(s2, B0, topY);
    const b1 = intersectHorizontal(s2, BDown, topY);

    ctx.strokeStyle = "#27b60d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(right.x + 2, topY);
    ctx.lineTo(right.x + right.w - 2, topY);
    ctx.moveTo(right.x - 10, baseY);
    ctx.lineTo(right.x + right.w + 20, baseY);
    ctx.stroke();

    ctx.strokeStyle = "#ffc400";
    ctx.beginPath();
    ctx.moveTo(s2.x, s2.y);
    ctx.lineTo(a1.x, a1.y);
    ctx.lineTo(ATop.x, ATop.y);
    ctx.moveTo(s2.x, s2.y);
    ctx.lineTo(a0.x, a0.y);
    ctx.lineTo(A0.x, A0.y);
    ctx.moveTo(s2.x, s2.y);
    ctx.lineTo(b0.x, b0.y);
    ctx.lineTo(B0.x, B0.y);
    ctx.moveTo(s2.x, s2.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.lineTo(BDown.x, BDown.y);
    ctx.moveTo(s2.x, s2.y);
    ctx.lineTo(s2.x, baseY + 146);
    ctx.stroke();

    ctx.strokeStyle = "#ff4525";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(A0.x, A0.y);
    ctx.lineTo(ATop.x, ATop.y);
    ctx.moveTo(B0.x, B0.y);
    ctx.lineTo(BDown.x, BDown.y);
    ctx.stroke();
    ctx.lineWidth = 1;

    ctx.fillStyle = "#ff4525";
    ctx.fillText("S", s2.x - 8, s2.y - 16);
    ctx.fillText("p", right.x + right.w + 8, topY + 8);
    ctx.fillText("E", right.x - 24, baseY + 10);
    ctx.fillText("A", ATop.x - 26, ATop.y - 8);
    ctx.fillText("A0", A0.x - 10, A0.y + 28);
    ctx.fillText("B0", B0.x + 12, B0.y - 4);
    ctx.fillText("B", BDown.x + 12, BDown.y + 10);
    ctx.fillText("a", a1.x - 34, a1.y - 10);
    ctx.fillText("a0", a0.x - 12, a0.y + 28);
    ctx.fillText("b", b1.x + 10, b1.y + 4);
    ctx.fillText("b0", b0.x + 12, b0.y - 10);

    ctx.fillStyle = "#1f3fff";
    ctx.font = "bold 23px 'Segoe UI Variable Display', 'Microsoft YaHei UI', sans-serif";
    ctx.fillText("像片倾斜引起的像点位移", 24, canvas.height - 8);
    ctx.fillText("地形起伏引起的像点位移", 292, canvas.height - 8);
  }

  [radiusSlider, reliefSlider, flightHSlider, tiltSlider, thetaSlider].forEach((slider) => slider.addEventListener("input", render));
  render();
}

function initResection() {
  const controlSlider = document.getElementById("controlSlider");
  const noiseSlider = document.getElementById("noiseSlider");
  const metrics = document.getElementById("resectionMetrics");
  const board = document.getElementById("iterationBoard");

  function render() {
    const controls = Number(controlSlider.value);
    const noise = Number(noiseSlider.value);
    const stability = clamp((controls * 16) - noise * 9, 8, 96);
    const iterations = clamp(Math.round(6 - controls / 2 + noise / 3), 2, 7);
    metrics.innerHTML = [
      metricCard("理论可解性", controls >= 3 ? "可解" : "不可解", "至少 3 个不共线控制点"),
      metricCard("工程建议", controls >= 4 ? "推荐" : "偏弱", "4 个及以上更稳健"),
      metricCard("稳定性", `${stability}%`, "控制点越多、噪声越小越稳定"),
      metricCard("预计迭代次数", `${iterations} 次`, "仅作演示估计")
    ].join("");

    board.innerHTML = "<h3>迭代收敛示意</h3>";
    let current = 100 - stability * 0.6;
    for (let i = 0; i < iterations; i += 1) {
      current *= 0.45 + noise * 0.02;
      const normalized = clamp(current, 2, 100);
      const row = document.createElement("div");
      row.className = "iteration-row";
      row.innerHTML = `<span>第 ${i + 1} 次</span><div class="bar"><span style="width:${normalized}%"></span></div><span>${normalized.toFixed(1)}</span>`;
      board.appendChild(row);
    }
  }

  [controlSlider, noiseSlider].forEach((slider) => slider.addEventListener("input", render));
  render();
}

function initResectionV2() {
  const controlSlider = document.getElementById("controlSlider");
  const initSlider = document.getElementById("initSlider");
  const noiseSlider = document.getElementById("noiseSlider");
  const metrics = document.getElementById("resectionMetrics");
  const board = document.getElementById("iterationBoard");
  if (!controlSlider || !initSlider || !noiseSlider || !metrics || !board) return;

  function render() {
    const controls = Number(controlSlider.value);
    const initQuality = Number(initSlider.value);
    const noise = Number(noiseSlider.value);
    const solvable = controls >= 3;
    const redundancy = Math.max(0, 2 * controls - 6);
    const stability = clamp((controls * 14) + (initQuality * 6) - noise * 8, 8, 98);
    const iterations = clamp(Math.round(10 - initQuality * 0.7 - controls * 0.4 + noise * 0.55), 2, 12);
    const m0 = Math.sqrt(((noise + 1) * 0.18) / Math.max(redundancy || 1, 1));

    metrics.innerHTML = [
      metricCard("理论可解性", solvable ? "可解" : "不可解", "至少需要 3 个控制点"),
      metricCard("多余观测", `${redundancy}`, "由 2n - 6 给出平差冗余度"),
      metricCard("稳定性", `${stability}%`, "控制点更多、初值更好、噪声更小时更稳定"),
      metricCard("单位权中误差", `±${m0.toFixed(3)}`, "示意值，对应 m0 = ±sqrt([vv]/(2n-6))")
    ].join("");

    board.innerHTML = "<h3>迭代收敛示意</h3>";
    let current = 100 - stability * 0.65 + noise * 2.5;
    for (let i = 0; i < iterations; i += 1) {
      current *= 0.42 + noise * 0.025 + (10 - initQuality) * 0.012;
      const normalized = clamp(current, 2, 100);
      const row = document.createElement("div");
      row.className = "iteration-row";
      row.innerHTML = `<span>第 ${i + 1} 次</span><div class="bar"><span style="width:${normalized}%"></span></div><span>${normalized.toFixed(1)}</span>`;
      board.appendChild(row);
    }
  }

  [controlSlider, initSlider, noiseSlider].forEach((slider) => slider.addEventListener("input", render));
  render();
}

bindImageSlots();
initConceptImageUploads();
initImageLightbox();
initSensors();
initFlightPlanner();
initGeometryLab();
initProjectionLab();
initDisplacementLabV3();
initResectionV2();
