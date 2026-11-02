/* JC ADS Herramientas gratis: selector de archivos, pantalla de espera con publicidad y descarga.
   Todo se procesa en el navegador del usuario: no se sube ningún archivo. */
(function () {
  "use strict";
  var MIN_WAIT = 5000; // la pantalla de espera dura como mínimo 5 s (el proceso real corre en paralelo)
  var ADSTERRA_KEY = "c3e46f760b9df55255bd62d141d34c2c";

  function $(id) { return document.getElementById(id); }
  function fmtSize(n) {
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(0) + " KB";
    return (n / 1048576).toFixed(n < 10485760 ? 2 : 1).replace(".", ",") + " MB";
  }
  function baseName(name) { return (name || "archivo").replace(/\.[^.]+$/, "") || "archivo"; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function readBuf(file) {
    return file.arrayBuffer ? file.arrayBuffer() : new Promise(function (res, rej) {
      var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = rej; fr.readAsArrayBuffer(file);
    });
  }
  function loadImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { res(img); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("No pudimos abrir la imagen " + file.name + ".")); };
      img.src = url;
    });
  }
  function canvasBlob(canvas, type, q) {
    return new Promise(function (res, rej) {
      canvas.toBlob(function (b) { b ? res(b) : rej(new Error("No pudimos generar la imagen.")); }, type, q);
    });
  }

  /* Banner Adsterra 300x250 dentro de un iframe (srcdoc): se crea de nuevo en cada conversión. */
  function adsterraFrame(box) {
    if (!box) return;
    box.innerHTML = "";
    var f = document.createElement("iframe");
    f.title = "Publicidad"; f.width = "300"; f.height = "250"; f.setAttribute("scrolling", "no");
    f.setAttribute("frameborder", "0"); f.loading = "eager";
    f.srcdoc = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>' +
      "<script>atOptions = {'key' : '" + ADSTERRA_KEY + "','format' : 'iframe','height' : 250,'width' : 300,'params' : {}};<\/script>" +
      '<script src="https://bicea.org/22/' + ADSTERRA_KEY + '"><\/script></body></html>';
    box.appendChild(f);
  }

  /* Selector / arrastrar y soltar */
  function dropzone(opts) {
    var drop = $(opts.drop || "drop"), input = $(opts.input || "file"), list = $(opts.list || "files"), go = $(opts.go || "go");
    var state = { files: [] };
    function render() {
      if (list) {
        list.innerHTML = "";
        state.files.forEach(function (f, i) {
          var li = document.createElement("li");
          li.innerHTML = "<span>" + esc(f.name) + "</span><em>" + fmtSize(f.size) + "</em>" +
            (opts.multiple && opts.reorder ? '<button type="button" data-a="up" aria-label="Subir">↑</button><button type="button" data-a="down" aria-label="Bajar">↓</button>' : "") +
            '<button type="button" data-a="del" aria-label="Quitar">✕</button>';
          li.querySelectorAll("button").forEach(function (b) {
            b.onclick = function (e) {
              e.stopPropagation();
              var a = b.dataset.a;
              if (a === "del") state.files.splice(i, 1);
              if (a === "up" && i > 0) state.files.splice(i - 1, 0, state.files.splice(i, 1)[0]);
              if (a === "down" && i < state.files.length - 1) state.files.splice(i + 1, 0, state.files.splice(i, 1)[0]);
              render();
            };
          });
          list.appendChild(li);
        });
      }
      if (go) go.disabled = state.files.length < (opts.min || 1);
      if (opts.onChange) opts.onChange(state.files);
    }
    function add(fileList) {
      var err = $("err"); if (err) err.textContent = "";
      var arr = Array.prototype.slice.call(fileList || []);
      var bad = arr.filter(function (f) { return opts.accept && !opts.accept.test(f.name); });
      arr = arr.filter(function (f) { return !opts.accept || opts.accept.test(f.name); });
      var big = arr.filter(function (f) { return opts.maxBytes && f.size > opts.maxBytes; });
      arr = arr.filter(function (f) { return !opts.maxBytes || f.size <= opts.maxBytes; });
      if (err && bad.length) err.textContent = opts.badMsg || "Ese tipo de archivo no es compatible con esta herramienta.";
      if (err && big.length) err.textContent = "El archivo es demasiado grande (máximo " + fmtSize(opts.maxBytes) + ").";
      if (!arr.length) return;
      state.files = opts.multiple ? state.files.concat(arr) : [arr[0]];
      render();
    }
    drop.addEventListener("click", function (e) { if (e.target.tagName !== "BUTTON" || e.target.classList.contains("pick")) input.click(); });
    drop.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    input.addEventListener("click", function (e) { e.stopPropagation(); });
    input.addEventListener("change", function () { add(input.files); input.value = ""; });
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
    drop.addEventListener("drop", function (e) { add(e.dataTransfer && e.dataTransfer.files); });
    state.add = add; state.render = render;
    render();
    return state;
  }

  /* Pantalla de espera: corre work(progress) en paralelo y muestra el botón al terminar (mínimo 5 s). */
  var busy = false;
  function convert(cfg) {
    if (busy) return;
    busy = true;
    var panel = $("panel"), wait = $("wait"), bar = $("bar"), stat = $("wstat"), ready = $("ready"), dl = $("dl");
    var err = $("err"); if (err) err.textContent = "";
    $("wname").textContent = cfg.label || "";
    $("wtitle").textContent = cfg.title || "Convirtiendo tu archivo...";
    bar.style.width = "0%"; stat.textContent = "0% · listo en 5 segundos";
    ready.hidden = true; dl.removeAttribute("href");
    panel.hidden = true; wait.hidden = false;
    adsterraFrame($("adWait"));
    wait.scrollIntoView({ behavior: "smooth", block: "start" });

    var t0 = Date.now(), real = 0, done = false, result = null, failure = null;
    function progress(p) { real = Math.max(real, Math.min(1, p || 0)); }
    var job = Promise.resolve().then(function () { return cfg.work(progress); })
      .then(function (r) { result = r; done = true; }, function (e) { failure = e || new Error("Error"); done = true; });

    var timer = setInterval(function () {
      var el = Date.now() - t0, tf = Math.min(1, el / MIN_WAIT);
      var pct = done ? Math.round(tf * 100) : Math.round(Math.min(tf, 0.15 + real * 0.8) * 100);
      if (!done) pct = Math.min(pct, 95);
      bar.style.width = pct + "%";
      var left = Math.max(1, Math.ceil((MIN_WAIT - el) / 1000));
      stat.textContent = (el < MIN_WAIT) ? pct + "% · listo en " + left + (left === 1 ? " segundo" : " segundos")
        : (done ? "100% · ¡listo!" : pct + "% · casi listo, estamos terminando tu archivo...");
      if (done && el >= MIN_WAIT) { clearInterval(timer); finish(); }
      if (failure) { clearInterval(timer); finish(); }
    }, 150);

    function finish() {
      busy = false;
      if (failure) {
        wait.hidden = true; panel.hidden = false;
        if (err) err.textContent = (failure && failure.message) ? failure.message : "No pudimos convertir el archivo.";
        console.error(failure);
        return;
      }
      bar.style.width = "100%"; stat.textContent = "100% · ¡listo!";
      var url = URL.createObjectURL(result.blob);
      dl.href = url; dl.download = result.filename;
      $("dlt").textContent = result.button || cfg.button || "Descargar";
      $("rmeta").innerHTML = result.meta || (esc(result.filename) + " · " + fmtSize(result.blob.size));
      var pv = $("rprev");
      if (pv) { pv.innerHTML = ""; pv.hidden = !result.preview; if (result.preview) pv.appendChild(result.preview); }
      ready.hidden = false;
      window.__jctLast = { filename: result.filename, size: result.blob.size, type: result.blob.type, url: url };
      document.dispatchEvent(new CustomEvent("jct:ready", { detail: window.__jctLast }));
    }
    return job;
  }

  function resetTool() {
    $("wait").hidden = true; $("panel").hidden = false;
    $("panel").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var again = $("again"); if (again) again.onclick = resetTool;
    document.querySelectorAll("[data-adsterra-frame]").forEach(adsterraFrame);
  });

  window.JCT = { dropzone: dropzone, convert: convert, fmtSize: fmtSize, baseName: baseName, esc: esc, sleep: sleep,
    readBuf: readBuf, loadImage: loadImage, canvasBlob: canvasBlob, adsterraFrame: adsterraFrame, reset: resetTool };
})();
