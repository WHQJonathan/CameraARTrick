// ==========================================
// ⭐️ 1. 新增：即時環境光影估算組件（Light Estimator）⭐️
// ==========================================
AFRAME.registerComponent('light-estimator', {
    init: function () {
      this.video = null;
      this.ambientLight = document.querySelector('#ambient-light');
      this.dirLight = document.querySelector('#dir-light');
      
      // 建立一個微型 16x16 畫布用來採樣相機色彩與亮度，運作開銷極低 (<0.1ms)
      this.canvas = document.createElement('canvas');
      this.canvas.width = 16;
      this.canvas.height = 16;
      this.ctx = this.canvas.getContext('2d');
    },
    
    tick: function () {
      if (!this.video) {
        this.video = document.querySelector('video');
        return;
      }
      // 確保視訊串流已就緒
      if (this.video.readyState < 2) return;
  
      try {
        // 將視訊畫面縮小繪製到微型畫布中
        this.ctx.drawImage(this.video, 0, 0, 16, 16);
        const imgData = this.ctx.getImageData(0, 0, 16, 16).data;
  
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < imgData.length; i += 4) {
          r += imgData[i];
          g += imgData[i+1];
          b += imgData[i+2];
        }
        const pixelCount = imgData.length / 4;
        r = Math.round(r / pixelCount);
        g = Math.round(g / pixelCount);
        b = Math.round(b / pixelCount);
  
        // 計算相對亮度 (Luminance)
        const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
        // 即時調整環境光源色溫與強度，克隆現實世界的光影
        if (this.ambientLight) {
          this.ambientLight.setAttribute('light', {
            color: `rgb(${r}, ${g}, ${b})`,
            intensity: Math.max(0.2, brightness * 1.3) // 確保最低亮度
          });
        }
        
        if (this.dirLight) {
          this.dirLight.setAttribute('light', {
            intensity: Math.max(0.4, brightness * 1.8)
          });
        }
      } catch (e) {
        // 忽略載入初期的畫布繪製異常
      }
    }
  });
  
  // ==========================================
  // ⭐️ 2. 全域相機攔截重啟機制 ⭐️
  // ==========================================
  let globalFacingMode = "environment";
  const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  
  navigator.mediaDevices.getUserMedia = async function(constraints) {
    if (constraints && constraints.video) {
      if (typeof constraints.video === 'object') {
        constraints.video.facingMode = globalFacingMode;
      } else {
        constraints.video = { facingMode: globalFacingMode };
      }
    }
    return originalGetUserMedia(constraints);
  };
  
  document.addEventListener("DOMContentLoaded", () => {
    const sceneEl = document.querySelector('a-scene');
    const targetEl = document.getElementById("card-target");
    const overlayEl = document.getElementById("magic-card-overlay");
    const shutterBtn = document.getElementById("shutter-btn");
    const unlockerEl = document.getElementById("ios-camera-unlocker");
    const flipBtn = document.getElementById("flip-camera-btn");
    const statusEl = document.getElementById("magic-status");
  
    // ⭐️ 新增：校準控制項 DOM 節點
    const openCalBtn = document.getElementById("open-cal-btn");
    const calPanel = document.getElementById("calibration-panel");
    const saveCalBtn = document.getElementById("save-cal-btn");
    const resetCalBtn = document.getElementById("reset-cal-btn");
  
    const sliderX = document.getElementById("cal-x");
    const sliderY = document.getElementById("cal-y");
    const sliderSX = document.getElementById("cal-sx");
    const sliderSY = document.getElementById("cal-sy");
    const sliderRZ = document.getElementById("cal-rz");
  
    const valX = document.getElementById("val-x");
    const valY = document.getElementById("val-y");
    const valSX = document.getElementById("val-sx");
    const valSY = document.getElementById("val-sy");
    const valRZ = document.getElementById("val-rz");
  
    let isMagicActive = true;
    let isCameraActive = false;
  
    // 預設對齊參數
    const DEFAULT_CAL = { x: 0, y: -0.35, sx: 1.0, sy: 1.0, rz: 0 };
  
    // 1. 初始化時載入儲存的校準值
    loadCalibration();
  
    function loadCalibration() {
      const x = localStorage.getItem("cal_x") !== null ? parseFloat(localStorage.getItem("cal_x")) : DEFAULT_CAL.x;
      const y = localStorage.getItem("cal_y") !== null ? parseFloat(localStorage.getItem("cal_y")) : DEFAULT_CAL.y;
      const sx = localStorage.getItem("cal_sx") !== null ? parseFloat(localStorage.getItem("cal_sx")) : DEFAULT_CAL.sx;
      const sy = localStorage.getItem("cal_sy") !== null ? parseFloat(localStorage.getItem("cal_sy")) : DEFAULT_CAL.sy;
      const rz = localStorage.getItem("cal_rz") !== null ? parseFloat(localStorage.getItem("cal_rz")) : DEFAULT_CAL.rz;
  
      // 更新滑桿數值與文字
      sliderX.value = x; valX.textContent = x;
      sliderY.value = y; valY.textContent = y;
      sliderSX.value = sx; valSX.textContent = sx;
      sliderSY.value = sy; valSY.textContent = sy;
      sliderRZ.value = rz; valRZ.textContent = rz;
  
      // 直接應用到 A-Frame 3D 卡片上
      applyCalibration(x, y, sx, sy, rz);
    }
  
    // 將拉桿參數即時綁定並應用到 3D 疊加卡片上
    function applyCalibration(x, y, sx, sy, rz) {
      overlayEl.setAttribute("position", `${x} ${y} 0`);
      overlayEl.setAttribute("scale", `${sx} ${sy} 1`);
      overlayEl.setAttribute("rotation", `0 0 ${rz}`);
    }
  
    // 監聽拉桿拖動，實現「即時無感對齊預覽」
    const handleSliderChange = () => {
      const x = parseFloat(sliderX.value);
      const y = parseFloat(sliderY.value);
      const sx = parseFloat(sliderSX.value);
      const sy = parseFloat(sliderSY.value);
      const rz = parseFloat(sliderRZ.value);
  
      valX.textContent = x;
      valY.textContent = y;
      valSX.textContent = sx;
      valSY.textContent = sy;
      valRZ.textContent = rz;
  
      applyCalibration(x, y, sx, sy, rz);
    };
  
    [sliderX, sliderY, sliderSX, sliderSY, sliderRZ].forEach(slider => {
      slider.addEventListener("input", handleSliderChange);
    });
  
    // 秘密校準開關切換
    openCalBtn.addEventListener("click", () => {
      calPanel.classList.toggle("hidden");
    });
  
    // 點擊「儲存」：永久記在手機記憶體
    saveCalBtn.addEventListener("click", () => {
      localStorage.setItem("cal_x", sliderX.value);
      localStorage.setItem("cal_y", sliderY.value);
      localStorage.setItem("cal_sx", sliderSX.value);
      localStorage.setItem("cal_sy", sliderSY.value);
      localStorage.setItem("cal_rz", sliderRZ.value);
      calPanel.classList.add("hidden");
      alert("對齊設定已儲存！");
    });
  
    // 點擊「重設」：恢復為初始數值
    resetCalBtn.addEventListener("click", () => {
      if (confirm("確定要將校準重置為預設值嗎？")) {
        sliderX.value = DEFAULT_CAL.x; valX.textContent = DEFAULT_CAL.x;
        sliderY.value = DEFAULT_CAL.y; valY.textContent = DEFAULT_CAL.y;
        sliderSX.value = DEFAULT_CAL.sx; valSX.textContent = DEFAULT_CAL.sx;
        sliderSY.value = DEFAULT_CAL.sy; valSY.textContent = DEFAULT_CAL.sy;
        sliderRZ.value = DEFAULT_CAL.rz; valRZ.textContent = DEFAULT_CAL.rz;
        
        applyCalibration(DEFAULT_CAL.x, DEFAULT_CAL.y, DEFAULT_CAL.sx, DEFAULT_CAL.sy, DEFAULT_CAL.rz);
      }
    });
  
  
    // 2. 偵測相機啟動成功 (其餘魔術邏輯皆完整保留)
    sceneEl.addEventListener('arReady', () => {
      isCameraActive = true;
      unlockerEl.classList.add('hidden');
      requestDeviceMotionPermission();
    });
  
    function requestDeviceMotionPermission() {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === 'granted') console.log("動作感應器授權成功");
          })
          .catch(console.error);
      }
    }
  
    // 3. 物理晃動偵測與變牌邏輯 (晃一下變牌)
    let lastX, lastY, lastZ;
    const SHAKE_THRESHOLD = 18;
  
    window.addEventListener('devicemotion', (event) => {
      if (!isCameraActive || !isMagicActive) return;
  
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
  
      const x = acc.x;
      const y = acc.y;
      const z = acc.z;
  
      if (lastX !== undefined) {
        const deltaX = Math.abs(x - lastX);
        const deltaY = Math.abs(y - lastY);
        const deltaZ = Math.abs(z - lastZ);
  
        if ((deltaX + deltaY + deltaZ) > SHAKE_THRESHOLD) {
          triggerShakeChange();
        }
      }
  
      lastX = x;
      lastY = y;
      lastZ = z;
    });
  
    function triggerShakeChange() {
      isMagicActive = false;
      sceneEl.classList.add('blur-active');
  
      setTimeout(() => {
        overlayEl.setAttribute("visible", "false");
        statusEl.textContent = "拍照";
        statusEl.style.color = "#ffffff";
        if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
      }, 80);
  
      setTimeout(() => {
        sceneEl.classList.remove('blur-active');
      }, 300);
    }
  
    // 4. iOS 相機手勢解鎖
    const forceUnlockCamera = () => {
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        video.play().then(() => {
          unlockerEl.classList.add('hidden');
          requestDeviceMotionPermission();
        }).catch(err => console.log(err));
      });
  
      if (sceneEl.systems["mindar-image-system"]) {
        sceneEl.systems["mindar-image-system"].start();
      }
    };
  
    unlockerEl.addEventListener("click", forceUnlockCamera);
    document.body.addEventListener("click", forceUnlockCamera, { once: true });
  
    // 5. 前後鏡頭切換
    flipBtn.addEventListener("click", async () => {
      const arSystem = sceneEl.systems["mindar-image-system"];
      if (!arSystem) return;
  
      globalFacingMode = (globalFacingMode === "environment") ? "user" : "environment";
  
      try {
        arSystem.stop();
        arSystem.start();
        unlockerEl.classList.add('hidden');
      } catch (err) {
        alert("鏡頭切換失敗：" + err.message);
        globalFacingMode = (globalFacingMode === "environment") ? "user" : "environment";
      }
    });
  
    // 6. 拍照快門
    shutterBtn.addEventListener("click", () => {
      const flashDiv = document.createElement("div");
      flashDiv.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;background:#fff;z-index:9999;pointer-events:none;";
      document.body.appendChild(flashDiv);
  
      if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
  
      setTimeout(() => {
        flashDiv.style.transition = "opacity 0.3s ease";
        flashDiv.style.opacity = "0";
        setTimeout(() => flashDiv.remove(), 300);
      }, 50);
    });
  });