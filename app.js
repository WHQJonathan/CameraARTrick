// ==========================================
// ⭐️ 1. 全域攔截（Monkey-Patching）瀏覽器相機請求 ⭐️
// ==========================================
let globalFacingMode = "environment"; // 預設為後鏡頭

// 儲存原始的相機請求函數
const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

// 重寫全域相機請求，強行將 MindAR 寫死的參數替換成我們當前的全域鏡頭狀態
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

  // 1. 偵測相機啟動成功
  sceneEl.addEventListener('arReady', () => {
    console.log("MindAR 啟動成功，隱藏點擊啟動解鎖提示");
    isCameraActive = true;
    unlockerEl.classList.add('hidden');
  });

  // 2. iOS 相機「手勢啟動解鎖」機制
  const forceUnlockCamera = () => {
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.play().then(() => {
        unlockerEl.classList.add('hidden');
      }).catch(err => console.log("等待點擊手勢解鎖中:", err));
    });

    if (sceneEl.systems["mindar-image-system"]) {
      sceneEl.systems["mindar-image-system"].start();
    }
  };

  unlockerEl.addEventListener("click", forceUnlockCamera);
  document.body.addEventListener("click", forceUnlockCamera, { once: true });

  // 3. ⭐️ 全域相機重啟切換（保留追蹤效果） ⭐️
  flipBtn.addEventListener("click", async () => {
    const arSystem = sceneEl.systems["mindar-image-system"];
    if (!arSystem) {
      alert("AR 系統尚未載入完畢，請稍候再試。");
      return;
    }

    console.log("正在進行安全相機切換並重新繫結追蹤引擎...");

    // 1. 切換當前要請求的鏡頭狀態 (前鏡頭 user / 後鏡頭 environment)
    globalFacingMode = (globalFacingMode === "environment") ? "user" : "environment";

    try {
      // 2. 徹底停止 MindAR 的 AR 引擎、相機與 WebGL 追蹤綁定
      arSystem.stop();
      
      // 3. 重新啟動 AR 引擎
      // 啟動時 MindAR 會呼叫被我們全域攔截的 getUserMedia，從而帶入新設定的鏡頭參數，重新進行完整的追蹤初始化
      arSystem.start();
      
      console.log("鏡頭與 AR 追蹤引擎已成功重新綁定！目前為：" + (globalFacingMode === "user" ? "前鏡頭" : "後鏡頭"));
      
      // 隱藏解鎖提示
      unlockerEl.classList.add('hidden');
    } catch (err) {
      console.error("切換鏡頭重啟失敗：", err);
      alert("鏡頭切換失敗：" + err.message);
      // 還原狀態變數
      globalFacingMode = (globalFacingMode === "environment") ? "user" : "environment";
    }
  });

  // 4. 揮手遮擋魔術檢測邏輯 (紅心8 與 梅花5 的轉換)
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

  // 5. 拍照閃光特效
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