document.addEventListener("DOMContentLoaded", () => {
    const sceneEl = document.querySelector('a-scene');
    const targetEl = document.getElementById("card-target");
    const overlayEl = document.getElementById("magic-card-overlay");
    const shutterBtn = document.getElementById("shutter-btn");
    const unlockerEl = document.getElementById("ios-camera-unlocker");
  
    let isMagicActive = true;
    let lostTimestamp = 0;
  
    // 1. 偵測相機啟動成功
    sceneEl.addEventListener('arReady', () => {
      console.log("MindAR 啟動成功，隱藏點擊啟動解鎖提示");
      unlockerEl.classList.add('hidden');
    });
  
    // 2. ⭐️ iOS 相機「點擊強行啟動與解鎖」機制 ⭐️
    // 任何對螢幕的點擊行為，都會強行解鎖播放 iOS 的 WebRTC 鏡頭視訊
    const forceUnlockCamera = () => {
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        video.play().then(() => {
          unlockerEl.classList.add('hidden');
        }).catch(err => console.log("等待手勢解鎖中:", err));
      });
  
      // 試圖強行啟用 AR
      if (sceneEl.systems["mindar-image-system"]) {
        sceneEl.systems["mindar-image-system"].start();
      }
    };
  
    // 當使用者點選解鎖層時，啟動強制播放
    unlockerEl.addEventListener("click", forceUnlockCamera);
    document.body.addEventListener("click", forceUnlockCamera, { once: true });
  
    // 3. 揮手遮擋魔術檢測邏輯
    targetEl.addEventListener("targetLost", () => {
      lostTimestamp = Date.now();
    });
  
    targetEl.addEventListener("targetFound", () => {
      if (lostTimestamp > 0) {
        const duration = Date.now() - lostTimestamp;
        if (duration >= 150 && duration <= 900) {
          isMagicActive = !isMagicActive;
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
  
    // 4. 拍照閃光特效
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