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
  
    let isMagicActive = true;
    let lostTimestamp = 0;
    let isCameraActive = false;
  
    sceneEl.addEventListener('arReady', () => {
      isCameraActive = true;
      unlockerEl.classList.add('hidden');
    });
  
    const forceUnlockCamera = () => {
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        video.play().then(() => {
          unlockerEl.classList.add('hidden');
        }).catch(err => console.log(err));
      });
  
      if (sceneEl.systems["mindar-image-system"]) {
        sceneEl.systems["mindar-image-system"].start();
      }
    };
  
    unlockerEl.addEventListener("click", forceUnlockCamera);
    document.body.addEventListener("click", forceUnlockCamera, { once: true });
  
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
  
    // 揮手檢測 (紅心8 / 梅花5 轉換)
    targetEl.addEventListener("targetLost", () => {
      lostTimestamp = Date.now();
    });
  
    targetEl.addEventListener("targetFound", () => {
      if (lostTimestamp > 0) {
        const duration = Date.now() - lostTimestamp;
        if (duration >= 150 && duration <= 900) {
          isMagicActive = !isMagicActive;
          // 使用 A-Frame attribute 控制 PBR 物件顯示
          overlayEl.setAttribute("visible", isMagicActive ? "true" : "false");
          
          const statusEl = document.getElementById("magic-status");
          if (isMagicActive) {
            statusEl.textContent = "拍照";
            statusEl.style.color = "#FFD700";
          } else {
            statusEl.textContent = "拍照";
            statusEl.style.color = "#ffffff";
          }
          if (navigator.vibrate) navigator.vibrate(50);
        }
        lostTimestamp = 0;
      }
    });
  
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