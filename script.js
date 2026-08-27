/* 相册脚本：读取 photos.json -> 渲染瀑布流 -> 大图浏览 */
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
})();
