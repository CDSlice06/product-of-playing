(function () {
  var DEFAULT_HASH = "#/auth";
  var LOAD_TIMEOUT_MS = 12000;

  var frame = document.getElementById("gameFrame");
  var overlay = document.getElementById("shellOverlay");
  var statusTitle = document.getElementById("shellStatusTitle");
  var statusText = document.getElementById("shellStatusText");
  var retryButton = document.getElementById("retryButton");
  var fallbackLink = document.getElementById("fallbackLink");
  var openDirect = document.getElementById("openDirect");
  var orientationTip = document.getElementById("orientationTip");

  if (!frame || !overlay || !statusTitle || !statusText || !retryButton || !fallbackLink || !openDirect || !orientationTip) {
    return;
  }

  var timeoutId = 0;
  var reloadSeed = 0;

  function updateViewportHeight() {
    document.documentElement.style.setProperty("--shell-dvh", window.innerHeight + "px");
    orientationTip.textContent = window.innerWidth > window.innerHeight
      ? "当前为横屏，适合直接开始对局。"
      : "建议手机横屏游玩，棋盘和手牌区域会更完整。";
  }

  function normalizeRoute(input) {
    if (!input) {
      return DEFAULT_HASH;
    }

    var route = decodeURIComponent(input).trim();

    if (!route) {
      return DEFAULT_HASH;
    }

    if (route.indexOf("#/") === 0) {
      return route;
    }

    if (route[0] === "#") {
      return "#/" + route.slice(1).replace(/^\/+/, "");
    }

    if (route[0] === "/") {
      return "#" + route;
    }

    return "#/" + route.replace(/^\/+/, "");
  }

  function resolveRoute() {
    var params = new URLSearchParams(window.location.search);
    return normalizeRoute(params.get("route"));
  }

  function buildGameUrl(seed) {
    return "./game/index.html?shell=" + seed + resolveRoute();
  }

  function showLoading() {
    overlay.classList.add("is-visible");
    statusTitle.textContent = "正在进入命运之战";
    statusText.textContent = "外层壳页已就绪，正在加载游戏本体，请稍候。";
    retryButton.hidden = true;
    fallbackLink.hidden = true;
  }

  function showReady() {
    window.clearTimeout(timeoutId);
    overlay.classList.remove("is-visible");
  }

  function showTimeout() {
    statusTitle.textContent = "网络较慢，游戏仍可继续进入";
    statusText.textContent = "你可以重新加载外层壳页，或直接打开游戏本体页面。";
    retryButton.hidden = false;
    fallbackLink.hidden = false;
  }

  function loadFrame() {
    window.clearTimeout(timeoutId);
    showLoading();

    var gameUrl = buildGameUrl(Date.now() + reloadSeed);
    frame.src = gameUrl;
    fallbackLink.href = gameUrl;
    openDirect.href = gameUrl;

    timeoutId = window.setTimeout(showTimeout, LOAD_TIMEOUT_MS);
  }

  retryButton.addEventListener("click", function () {
    reloadSeed += 1;
    loadFrame();
  });

  frame.addEventListener("load", function () {
    window.setTimeout(showReady, 240);
  });

  window.addEventListener("resize", updateViewportHeight);
  window.addEventListener("orientationchange", updateViewportHeight);

  updateViewportHeight();
  loadFrame();
})();
