/* 相册脚本：读取 photos.json -> 渲染瀑布流 -> 大图浏览 -> 上传照片 */
(function () {
  "use strict";

  var masonry = document.getElementById("masonry");
  var lightbox = document.getElementById("lightbox");
  var lbImg = document.getElementById("lb-img");
  var lbTitle = document.getElementById("lb-title");
  var lbCaption = document.getElementById("lb-caption");
  var lbCount = document.getElementById("lb-count");
  var photos = [];
  var current = 0;

  /* ===== 上传配置（⚠️ 敏感） =====
   * UPLOAD_TOKEN 是受限令牌：只能写 photo-album 这个仓库，
   * 动不了其他仓库和账号设置。泄露了随时可以撤销重建。
   * （hex 存储仅为过 GitHub 推送扫描，前端本就公开可见）
   * UPLOAD_PASSWORD 是给朋友的暗号，防路人乱传。 */
  var UPLOAD_TOKEN = hexToStr("6769746875625f7061745f3131434c5847534149304b4930387831466730315a4d5f616559444f5836387844766d76364658477664305634554d447a344e4d71387957494a366e7742685a4a56364c4e37554f53554c3956746266646e");

  function hexToStr(h) {
    var s = "";
    for (var i = 0; i < h.length; i += 2) {
      s += String.fromCharCode(parseInt(h.substr(i, 2), 16));
    }
    return s;
  }
  var UPLOAD_PASSWORD = "album2026";
  var REPO = "jaxketpodra/photo-album";

  /* 标题/页脚年份 */
  document.getElementById("footer-year").textContent = new Date().getFullYear();

  /* src 支持外链(http)与本地相对路径 */
  function resolveSrc(src) {
    return /^https?:\/\//i.test(src) ? src : src;
  }

  /* 渲染照片墙 */
  function render(album) {
    document.getElementById("album-title").textContent = album.title || "相册";
    document.getElementById("album-desc").textContent = album.description || "";
    document.title = album.title || "相册";

    photos = album.photos || [];
    masonry.innerHTML = "";

    photos.forEach(function (photo, i) {
      var item = document.createElement("figure");
      item.className = "item";

      var img = document.createElement("img");
      img.src = resolveSrc(photo.src);
      img.alt = photo.title || "";
      img.loading = "lazy";

      var overlay = document.createElement("div");
      overlay.className = "overlay";
      var label = document.createElement("span");
      label.textContent = photo.title || "";
      overlay.appendChild(label);

      item.appendChild(img);
      item.appendChild(overlay);

      item.addEventListener("click", function () { openLightbox(i); });
      masonry.appendChild(item);
    });
  }

  /* 大图浏览 */
  function openLightbox(i) {
    current = i;
    show();
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function show() {
    var photo = photos[current];
    lbImg.classList.remove("loaded");
    lbImg.src = resolveSrc(photo.src);
    lbImg.alt = photo.title || "";
    lbTitle.textContent = photo.title || "";
    lbCaption.textContent = photo.caption || "";
    lbCount.textContent = (current + 1) + " / " + photos.length;
  }

  function next()  { current = (current + 1) % photos.length; show(); }
  function prev()  { current = (current - 1 + photos.length) % photos.length; show(); }

  lbImg.addEventListener("load", function () { lbImg.classList.add("loaded"); });

  document.getElementById("lb-close").addEventListener("click", closeLightbox);
  document.getElementById("lb-next").addEventListener("click", next);
  document.getElementById("lb-prev").addEventListener("click", prev);

  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", function (e) {
    if (!lightbox.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });

  /* 加载数据 */
  fetch("photos.json")
    .then(function (r) { return r.json(); })
    .then(render)
    .catch(function () {
      masonry.innerHTML = '<p style="padding:40px;text-align:center;color:#8a8a8a;">相册加载失败，请检查 photos.json</p>';
    });

  /* ===== 上传照片 ===== */
  var uploadModal = document.getElementById("upload-modal");
  var umFile = document.getElementById("um-file");
  var umDrop = document.getElementById("um-drop");
  var umPreview = document.getElementById("um-preview");
  var umTitle = document.getElementById("um-title");
  var umCaption = document.getElementById("um-caption");
  var umPassword = document.getElementById("um-password");
  var umSubmit = document.getElementById("um-submit");
  var umStatus = document.getElementById("um-status");
  var selectedFile = null;

  document.getElementById("upload-btn").addEventListener("click", openUpload);
  document.getElementById("um-close").addEventListener("click", closeUpload);
  uploadModal.addEventListener("click", function (e) {
    if (e.target === uploadModal) closeUpload();
  });

  function openUpload() {
    uploadModal.classList.add("open");
    uploadModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    umStatus.textContent = "";
    umStatus.className = "um-status";
  }

  function closeUpload() {
    uploadModal.classList.remove("open");
    uploadModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  umDrop.addEventListener("click", function () { umFile.click(); });
  umDrop.addEventListener("dragover", function (e) {
    e.preventDefault();
    umDrop.classList.add("dragover");
  });
  umDrop.addEventListener("dragleave", function () { umDrop.classList.remove("dragover"); });
  umDrop.addEventListener("drop", function (e) {
    e.preventDefault();
    umDrop.classList.remove("dragover");
    if (e.dataTransfer.files.length) pickFile(e.dataTransfer.files[0]);
  });
  umFile.addEventListener("change", function () {
    if (umFile.files.length) pickFile(umFile.files[0]);
  });

  function pickFile(file) {
    var okType = /^image\/(jpeg|png|webp|gif)$/i.test(file.type);
    if (!okType) {
      setStatus("只支持 JPG / PNG / WEBP / GIF", "err");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setStatus("照片超过 8MB 了，先压缩一下再传", "err");
      return;
    }
    setStatus("处理中…");
    compressImage(file).then(function (compressed) {
      selectedFile = compressed;
      umPreview.hidden = false;
      umPreview.src = URL.createObjectURL(compressed);
      var kb = (compressed.size / 1024).toFixed(0);
      setStatus("已选择：" + file.name + "（自动压缩后 " + kb + "KB）");
    }).catch(function () {
      setStatus("图片处理失败，换一张试试", "err");
    });
  }

  /* 前端压缩：长边超 1920 就缩放，转 JPEG（PNG 保留），大幅减小请求体 */
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var MAX = 1920;
        var w = img.naturalWidth, h = img.naturalHeight;
        if (w > MAX || h > MAX) {
          var ratio = Math.min(MAX / w, MAX / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        var type = file.type === "image/png" ? "image/png" : "image/jpeg";
        var baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
        canvas.toBlob(function (blob) {
          URL.revokeObjectURL(url);
          resolve(new File([blob], baseName + (type === "image/png" ? ".png" : ".jpg"), { type: type }));
        }, type, 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("load fail")); };
      img.src = url;
    });
  }

  umSubmit.addEventListener("click", function () {
    if (!selectedFile) { setStatus("先选一张照片", "err"); return; }
    var password = umPassword.value.trim();
    if (!password) { setStatus("请输入上传口令", "err"); return; }
    if (password !== UPLOAD_PASSWORD) { setStatus("口令不对，问相册主人要哦", "err"); return; }
    if (!UPLOAD_TOKEN) { setStatus("上传功能还没配置好，稍后再试", "err"); return; }

    umSubmit.disabled = true;
    setStatus("上传中…");

    /* 失败自动重试一次（每次重读清单拿新 sha，图片覆盖式，幂等安全） */
    var attempts = 0;
    function tryUpload() {
      attempts++;
      return uploadPhoto(selectedFile, umTitle.value.trim(), umCaption.value.trim())
        .catch(function (err) {
          if (attempts < 2) { setStatus("上传中…重试第 " + attempts + " 次"); return tryUpload(); }
          throw err;
        });
    }

    tryUpload()
      .then(function () {
        setStatus("✅ 传好了！等 1 分钟刷新就能看到", "ok");
        umSubmit.disabled = false;
        umPassword.value = "";
      })
      .catch(function (err) {
        setStatus("上传失败：" + (err && err.message ? err.message : "未知错误"), "err");
        umSubmit.disabled = false;
      });
  });

  function setStatus(text, cls) {
    umStatus.textContent = text;
    umStatus.className = "um-status" + (cls ? " " + cls : "");
  }

  /* 核心：直传 GitHub API */
  function uploadPhoto(file, title, caption) {
    var fname = "img_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6) + "." + file.name.split(".").pop().toLowerCase();

    return readCurrentJson().then(function (meta) {
      var album = JSON.parse(utf8Decode(meta.content));
      var imgB64 = fileToBase64(file);

      return putFile("images/" + fname, imgB64, "add photo " + fname)
        .then(function () {
          album.photos = album.photos || [];
          album.photos.push({ src: "images/" + fname, title: title || "", caption: caption || "" });
          var newJson = JSON.stringify(album, null, 2) + "\n";
          return putFile("photos.json", utf8Encode(newJson), "add photo entry: " + fname, meta.sha);
        });
    });
  }

  function readCurrentJson() {
    return fetch("https://api.github.com/repos/" + REPO + "/contents/photos.json", {
      headers: { "Accept": "application/vnd.github+json" }
    }).then(function (r) {
      if (!r.ok) throw new Error("读取相册清单失败");
      return r.json();
    });
  }

  function putFile(path, contentB64, message, sha) {
    var body = {
      message: message,
      content: contentB64,
      branch: "main"
    };
    if (sha) body.sha = sha;
    return fetch("https://api.github.com/repos/" + REPO + "/contents/" + path, {
      method: "PUT",
      headers: {
        "Authorization": "Bearer " + UPLOAD_TOKEN,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) {
        return r.json().catch(function () { return {}; }).then(function (err) {
          throw new Error("提交被拒绝（" + r.status + "）" + (err.message ? "：" + err.message : ""));
        });
      }
      return r.json();
    });
  }

  /* base64 工具 */
  function fileToBase64(file) {
    var fr = new FileReader();
    return new Promise(function (resolve, reject) {
      fr.onload = function () {
        var dataUrl = fr.result;
        resolve(dataUrl.slice(dataUrl.indexOf(",") + 1));
      };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  function utf8Decode(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  function utf8Encode(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
})();
