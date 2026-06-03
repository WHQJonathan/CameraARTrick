document.addEventListener("DOMContentLoaded", () => {
    const sceneEl = document.querySelector('a-scene');
    const targetEl = document.getElementById("card-target");
    const overlayEl = document.getElementById("magic-card-overlay");
    const shutterBtn = document.getElementById("shutter-btn");
    const unlockerEl = document.getElementById("ios-camera-unlocker");
    const flipBtn = document.getElementById("flip-camera-btn"); // 新增：翻轉按鈕
  
    let isMagicActive = true;
    let lostTimestamp = 0;
    let isCameraActive = false;
  
    // 1. 偵測相機啟動成功
    sceneEl.addEventListener('arReady', () => {
      console.log("MindAR 啟動成功，隱藏手動解鎖提示");
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
  
    // 3. ⭐️ 原生 WebRTC 置換法：前置 / 後置鏡頭切換 ⭐️
    let isFrontCamera = false; // 預設為後置鏡頭 (false)

    flipBtn.addEventListener("click", async () => {
    // 尋找 MindAR 產生的相機視訊元件
    const video = document.querySelector('video');
    if (!video) {
        alert("相機視訊尚未準備就緒，請稍候");
        return;
    }

    console.log("正在切換鏡頭...");
    
    // 1. 取得並停止目前的相機串流
    const currentStream = video.srcObject;
    if (currentStream) {
        currentStream.getTracks().forEach(track => {
        track.stop(); // 徹底釋放舊鏡頭，否則部分手機會報錯
        });
    }

    // 2. 切換鏡頭狀態
    isFrontCamera = !isFrontCamera;

    // 3. 設定新鏡頭的請求參數
    const constraints = {
        video: {
        facingMode: isFrontCamera ? "user" : "environment", // 關鍵：user 代表前鏡頭，environment 代表後鏡頭
        width: { ideal: 1280 },
        height: { ideal: 720 }
        }
    };

    try {
        // 4. 向手機瀏覽器請求新鏡頭的串流
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // 5. 將新串流直接塞給原本的 video 標籤
        video.srcObject = newStream;
        
        // 確保視訊具備 iOS 播放必備屬性
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        
        // 強制播放新串流
        await video.play();
        console.log("鏡頭切換成功！目前為：" + (isFrontCamera ? "前鏡頭" : "後鏡頭"));

        // 6. 觸發瀏覽器縮放事件，強制 MindAR 重新計算鏡頭畫面的比例
        window.dispatchEvent(new Event('resize'));
        
        // 隱藏解鎖提示
        unlockerEl.classList.add('hidden');

    } catch (err) {
        console.error("切換鏡頭發生錯誤：", err);
        alert("切換鏡頭失敗：" + err.message);
        
        // 失敗時，還原鏡頭狀態變數
        isFrontCamera = !isFrontCamera;
    }
    });
  
    // 4. 揮手遮擋魔術檢測邏輯
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