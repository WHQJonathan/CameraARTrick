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
  
    let isMagicActive = true; // 預設顯示梅花5
    let isCameraActive = false;
  
    // 1. 偵測相機啟動
    sceneEl.addEventListener('arReady', () => {
      isCameraActive = true;
      unlockerEl.classList.add('hidden');
      // 請求 iOS 手機的動作感應器授權 (iOS 13+ 安全要求)
      requestDeviceMotionPermission();
    });
  
    // iOS 動作感應器授權請求
    function requestDeviceMotionPermission() {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === 'granted') {
              console.log("動作感應器授權成功");
            }
          })
          .catch(console.error);
      }
    }
  
    // 2. ⭐️ 物理晃動偵測與變牌邏輯 ⭐️
    let lastX, lastY, lastZ;
    const SHAKE_THRESHOLD = 18; // 晃動敏感度 (數值越小越敏感，建議設在 15~22 之間)
  
    window.addEventListener('devicemotion', (event) => {
      if (!isCameraActive || !isMagicActive) return; // 如果已經是原本的紅心8，就不重複觸發
  
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
  
      const x = acc.x;
      const y = acc.y;
      const z = acc.z;
  
      if (lastX !== undefined) {
        const deltaX = Math.abs(x - lastX);
        const deltaY = Math.abs(y - lastY);
        const deltaZ = Math.abs(z - lastZ);
  
        // 如果手部震動的總能量大於閾值
        if ((deltaX + deltaY + deltaZ) > SHAKE_THRESHOLD) {
          triggerShakeChange();
        }
      }
  
      lastX = x;
      lastY = y;
      lastZ = z;
    });
  
    // 執行「晃一下變牌」
    function triggerShakeChange() {
      isMagicActive = false; // 變回紅心8
  
      // A. 立即加入動態模糊類別，模糊畫面來掩蓋 3D 元件的消失瞬間
      sceneEl.classList.add('blur-active');
  
      // B. 在動態模糊中，瞬間將梅花 5 的遮罩隱藏（顯露出原本底層的實體紅心 8）
      setTimeout(() => {
        overlayEl.setAttribute("visible", "false");
        statusEl.textContent = "拍照";
        statusEl.style.color = "#ffffff";
        if (navigator.vibrate) navigator.vibrate([60, 30, 60]); // 震動回饋
      }, 80); // 80毫秒：人類視覺殘影的黃金轉換時間
  
      // C. 0.3 秒後（晃動停止時），移除動態模糊，讓畫面重回銳利
      setTimeout(() => {
        sceneEl.classList.remove('blur-active');
      }, 300);
    }
  
    // 3. iOS 相機手勢解鎖
    const forceUnlockCamera = () => {
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        video.play().then(() => {
          unlockerEl.classList.add('hidden');
          requestDeviceMotionPermission(); // 解鎖時順便請求感應器權限
        }).catch(err => console.log(err));
      });
  
      if (sceneEl.systems["mindar-image-system"]) {
        sceneEl.systems["mindar-image-system"].start();
      }
    };
  
    unlockerEl.addEventListener("click", forceUnlockCamera);
    document.body.addEventListener("click", forceUnlockCamera, { once: true });
  
    // 4. 前後鏡頭切換
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
  
    // 5. 拍照快門
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