document.addEventListener("DOMContentLoaded", () => {
    const sceneEl = document.querySelector('a-scene');
    const targetEl = document.getElementById("card-target");
    const overlayEl = document.getElementById("magic-card-overlay");
    const shutterBtn = document.getElementById("shutter-btn");
    const shieldEl = document.getElementById("ios-camera-shield");
    const activateBtn = document.getElementById("activate-camera-btn");
  
    let isMagicActive = true;
    let lostTimestamp = 0;
    let isCameraActive = false;
  
    // 1. 正常相機啟用處理
    sceneEl.addEventListener('arReady', () => {
      console.log("相機成功啟動！");
      isCameraActive = true;
      document.body.classList.add('ar-active');
      shieldEl.classList.add('hidden'); // 隱藏防護盾
    });
  
    // 2. iOS 防黑安全保護：若網頁載入 3.5 秒後相機無反應，自動跳出手動按鈕以解除 iOS 對自動影音播放的阻擋
    setTimeout(() => {
      if (!isCameraActive) {
        console.log("偵測到 iOS 自動播放限制，顯示手動解鎖按鈕");
        shieldEl.classList.remove('hidden');
      }
    }, 3500);
  
    // 手動啟動按鈕
    activateBtn.addEventListener("click", () => {
      // 試圖透過使用者手勢強行啟動 A-Frame 與相機視訊播放
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        video.play().catch(err => console.log("播放嘗試:", err));
      });
      
      // 重新通知 MindAR 啟動
      if (sceneEl.systems["mindar-image-system"]) {
        sceneEl.systems["mindar-image-system"].start();
      }
      
      shieldEl.classList.add('hidden');
    });
  
    // 3. 揮手辨識算法邏輯
    targetEl.addEventListener("targetLost", () => {
      lostTimestamp = Date.now();
    });
  
    targetEl.addEventListener("targetFound", () => {
      if (lostTimestamp > 0) {
        const duration = Date.now() - lostTimestamp;
        
        // 揮手遮擋時間在 150ms ~ 900ms 之間視為快速揮舞遮擋
        if (duration >= 150 && duration <= 900) {
          isMagicActive = !isMagicActive;
          overlayEl.setAttribute("visible", isMagicActive ? "true" : "false");
          
          const statusEl = document.getElementById("magic-status");
          if (isMagicActive) {
            statusEl.textContent = "拍照";
            statusEl.style.color = "#FFD700"; // 魔法效果：拍照顯示為黃色
          } else {
            statusEl.textContent = "拍照";
            statusEl.style.color = "#ffffff"; // 普通效果
          }
          
          if (navigator.vibrate) navigator.vibrate(50);
        }
        lostTimestamp = 0;
      }
    });
  
    // 4. 拍照閃白效果
    shutterBtn.addEventListener("click", () => {
      const flashDiv = document.createElement("div");
      flashDiv.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;background:#fff;z-index:999;pointer-events:none;";
      document.body.appendChild(flashDiv);
  
      if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
  
      setTimeout(() => {
        flashDiv.style.transition = "opacity 0.3s ease";
        flashDiv.style.opacity = "0";
        setTimeout(() => flashDiv.remove(), 300);
      }, 50);
    });
  });