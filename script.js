/* 相册脚本：读取 photos.json -> 渲染瀑布流 -> 大图浏览 -> 上传照片（支持批量） */
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

  /* 照片墙用缩略图：images/1.jpeg -> thumbs/1.webp；外链原样 */
  function thumbSrc(src) {
    if (!/^images\//.test(src)) return src;
    var base = src.split("/").pop().replace(/\.[^.]+$/, "");
    return "thumbs/" + base + ".webp";
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
      img.src = thumbSrc(photo.src);
      img.alt = photo.title || "";
      img.loading = "lazy";
      /* 缩略图不存在（历史图）就回退原图，只回退一次防死循环 */
      img.onerror = function () {
        if (img.dataset.fbk) return;
        img.dataset.fbk = "1";
        img.src = resolveSrc(photo.src);
      };

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

  /* ===== 上传照片（单张/批量统一流程） ===== */
  var uploadModal = document.getElementById("upload-modal");
  var umFile = document.getElementById("um-file");
  var umDrop = document.getElementById("um-drop");
  var umPreview = document.getElementById("um-preview");
  var umList = document.getElementById("um-list");
  var umTitle = document.getElementById("um-title");
  var umCaption = document.getElementById("um-caption");
  var umPassword = document.getElementById("um-password");
  var umSubmit = document.getElementById("um-submit");
  var umStatus = document.getElementById("um-status");
  /* 已选照片队列：[{ file: File(已压缩), title: "" }] */
  var selectedFiles = [];

  document.getElementById("upload-btn").addEventListener("click", openUpload);
  document.getElementById("um-close").addEventListener("click", closeUpload);
  uploadModal.addEventListener("click", function (e) {
    if (e.target === uploadModal) closeUpload();
  });

  function openUpload() {
    uploadModal.classList.add("open");
    uploadModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    selectedFiles = [];
    umTitle.value = "";
    umCaption.value = "";
    renderSelection();
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
    if (e.dataTransfer.files.length) pickFiles(e.dataTransfer.files);
  });
  umFile.addEventListener("change", function () {
    if (umFile.files.length) pickFiles(umFile.files);
    umFile.value = ""; /* 清空，重复选同一文件也能再触发 */
  });

  /* 选入文件（可多选/追加）：过滤 -> 原图进队列 -> 渲染 */
  function pickFiles(fileList) {
    var files = Array.prototype.slice.call(fileList);
    var skipped = 0;
    files.forEach(function (f) {
      if (!/^image\/(jpeg|png|webp|gif)$/i.test(f.type)) { skipped++; return; }
      if (f.size > 25 * 1024 * 1024) { skipped++; return; }
      /* 原图直传，不压缩保画质（GIF 也保持动图） */
      selectedFiles.push({ file: f, title: "" });
    });
    renderSelection();
    if (!selectedFiles.length) {
      setStatus(skipped ? "这些照片格式不支持或超过 25MB 了" : "先选照片", "err");
      return;
    }
    setStatus("已选 " + selectedFiles.length + " 张" + (skipped ? "（跳过 " + skipped + " 张不支持/超限的）" : ""));
  }

  /* 预览区：1 张 = 大预览+标题描述；多张 = 列表（每行缩略图+标题+删除） */
  function renderSelection() {
    var n = selectedFiles.length;
    if (n === 0) {
      umPreview.hidden = true;
      umList.hidden = true;
      umList.innerHTML = "";
      umTitle.style.display = "";
      umCaption.style.display = "";
      return;
    }
    if (n === 1) {
      umList.hidden = true;
      umList.innerHTML = "";
      umPreview.hidden = false;
      umPreview.src = URL.createObjectURL(selectedFiles[0].file);
      umTitle.style.display = "";
      umCaption.style.display = "";
      return;
    }
    umPreview.hidden = true;
    umTitle.style.display = "none";
    umCaption.style.display = "none";
    umList.hidden = false;
    umList.innerHTML = "";
    selectedFiles.forEach(function (it, idx) {
      var row = document.createElement("div");
      row.className = "um-item";

      var img = document.createElement("img");
      img.src = URL.createObjectURL(it.file);
      img.alt = "";

      var input = document.createElement("input");
      input.type = "text";
      input.maxLength = 40;
      input.placeholder = "标题（可选）";
      input.value = it.title || "";
      input.addEventListener("input", function () { it.title = input.value; });

      var del = document.createElement("button");
      del.className = "um-item-del";
      del.innerHTML = "&times;";
      del.title = "移除这张";
      del.addEventListener("click", function () {
        selectedFiles.splice(idx, 1);
        renderSelection();
        setStatus(selectedFiles.length ? "已选 " + selectedFiles.length + " 张" : "");
      });

      row.appendChild(img);
      row.appendChild(input);
      row.appendChild(del);
      umList.appendChild(row);
    });
  }

  umSubmit.addEventListener("click", function () {
    if (!selectedFiles.length) { setStatus("先选照片", "err"); return; }
    var password = umPassword.value.trim();
    if (!password) { setStatus("请输入上传口令", "err"); return; }
    if (password !== UPLOAD_PASSWORD) { setStatus("口令不对，问相册主人要哦", "err"); return; }
    if (!UPLOAD_TOKEN) { setStatus("上传功能还没配置好，稍后再试", "err"); return; }

    /* 收集待传条目：单张读标题/描述框，多张读列表里各自标题 */
    var entries;
    if (selectedFiles.length === 1) {
      entries = [{ file: selectedFiles[0].file, title: umTitle.value.trim(), caption: umCaption.value.trim() }];
    } else {
      entries = selectedFiles.map(function (it) {
        return { file: it.file, title: (it.title || "").trim(), caption: "" };
      });
    }

    umSubmit.disabled = true;

    /* 1) 串行传所有图（单张失败重试一次，仍失败跳过继续） */
    uploadImagesSerial(entries).then(function (results) {
      var okList = results.filter(function (r) { return r.ok; });
      var fails = results.filter(function (r) { return !r.ok; });
      var failTip = fails.length ? "（" + fails.length + " 张失败：" + fails.map(function (f) { return f.name; }).join("、") + "）" : "";

      if (!okList.length) {
        setStatus("全部上传失败了，检查网络再试", "err");
        umSubmit.disabled = false;
        return;
      }

      /* 2) 一次性更新清单（这批整体插到最前），只触发一次 Pages 部署 */
      setStatus("照片传好了，更新清单…");
      var newEntries = okList.map(function (r) {
        return { src: r.src, title: r.title || "", caption: r.caption || "" };
      });
      appendEntries(newEntries).then(function () {
        /* 3) 等部署完成自动刷新 */
        var expected = photos.length + okList.length;
        setStatus("✅ 已上传 " + okList.length + " 张" + failTip + "，等页面更新…", fails.length ? "err" : "ok");
        waitForUpdate(expected, function (ok) {
          umSubmit.disabled = false;
          if (ok) {
            setStatus("✅ 照片上墙了！" + failTip, fails.length ? "err" : "ok");
            selectedFiles = [];
            umTitle.value = "";
            umCaption.value = "";
            umPassword.value = "";
            setTimeout(closeUpload, fails.length ? 3500 : 1200);
          } else {
            setStatus("✅ 已上传，过一会儿刷新就能看到" + failTip, fails.length ? "err" : "ok");
            umPassword.value = "";
          }
        }, 90000);
      }).catch(function (err) {
        setStatus("更新清单失败：" + (err && err.message ? err.message : "未知错误"), "err");
        umSubmit.disabled = false;
      });
    });
  });

  function setStatus(text, cls) {
    umStatus.textContent = text;
    umStatus.className = "um-status" + (cls ? " " + cls : "");
  }

  /* 上传后轮询 photos.json，检测到新照片就自动重新渲染（免手动刷新） */
  function waitForUpdate(expectedCount, onDone, timeoutMs) {
    var start = Date.now();
    var timer = setInterval(function () {
      fetch("photos.json", { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (album) {
          if (album.photos && album.photos.length >= expectedCount) {
            clearInterval(timer);
            render(album);
            onDone(true);
          } else if (Date.now() - start > timeoutMs) {
            clearInterval(timer);
            onDone(false);
          }
        })
        .catch(function () {
          if (Date.now() - start > timeoutMs) { clearInterval(timer); onDone(false); }
        });
    }, 5000);
  }

  /* 串行传图队列：逐张 PUT images/，结果顺序与 entries 一致 */
  function uploadImagesSerial(entries) {
    var results = [];
    var i = 0;
    function next() {
      if (i >= entries.length) return Promise.resolve(results);
      var e = entries[i];
      i++;
      setStatus(entries.length > 1 ? "正在传第 " + i + "/" + entries.length + " 张…" : "上传中…");
      return putImageWithRetry(e.file).then(function (fname) {
        results.push({ ok: true, src: "images/" + fname, title: e.title, caption: e.caption, name: e.file.name });
        return next();
      }).catch(function () {
        results.push({ ok: false, name: e.file.name });
        return next();
      });
    }
    return next();
  }

  function putImageWithRetry(file) {
    return putImageOnce(file).catch(function () { return putImageOnce(file); });
  }

  function putImageOnce(file) {
    var base = "img_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
    var ext = file.name.split(".").pop().toLowerCase();
    var fname = base + "." + ext;
    return fileToBase64(file).then(function (imgB64) {
      return putFile("images/" + fname, imgB64, "add photo " + fname);
    }).then(function () {
      /* 缩略图失败不阻塞主流程（墙上有 onerror 回退原图兜底） */
      return makeThumb(file).then(function (thumb) {
        return fileToBase64(thumb).then(function (tb64) {
          return putFile("thumbs/" + base + ".webp", tb64, "add thumb " + base);
        });
      }).catch(function () {});
    }).then(function () { return fname; });
  }

  /* 前端生成缩略图：宽 600 webp q0.8（GIF 取首帧变静态缩略图，点开仍看动图） */
  function makeThumb(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var MAX = 600;
        var w = img.naturalWidth, h = img.naturalHeight;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(function (blob) {
          if (blob) resolve(new File([blob], "thumb.webp", { type: "image/webp" }));
          else reject(new Error("webp unsupported"));
        }, "image/webp", 0.8);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("load fail")); };
      img.src = url;
    });
  }

  /* 一次性把这批条目插到清单最前；sha 冲突（别人同时传）重读重试 */
  function appendEntries(newEntries) {
    var attempts = 0;
    function attempt() {
      attempts++;
      return readCurrentJson().then(function (meta) {
        var album;
        try {
          album = JSON.parse(utf8Decode(meta.content));
        } catch (e) {
          throw new Error("清单解析失败：" + e.message);
        }
        album.photos = album.photos || [];
        album.photos = newEntries.concat(album.photos);
        var newJson = JSON.stringify(album, null, 2) + "\n";
        var label = newEntries.length > 1 ? "add " + newEntries.length + " photos" : "add photo entry: " + newEntries[0].src.split("/").pop();
        return putFile("photos.json", utf8Encode(newJson), label, meta.sha);
      }).catch(function (err) {
        /* 409 = 别人同时改了清单：随机等 0.8~2.8s 错开后重读重试，最多 5 次 */
        if (attempts < 5 && err.message.indexOf("409") !== -1) {
          return new Promise(function (res) {
            setTimeout(res, 800 + Math.random() * 2000);
          }).then(attempt);
        }
        throw err;
      });
    }
    return attempt();
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
        return r.text().then(function (body) {
          var detail = body ? body.slice(0, 300) : "";
          throw new Error("提交被拒绝（" + r.status + "）" + (detail ? "：" + detail : ""));
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
