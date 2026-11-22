(function () {
  try {
    var zCfg = (globalThis.__zod_globalConfig = globalThis.__zod_globalConfig || {});
    zCfg.jitless = true;
  } catch (e) {}
  try {
    var root = document.documentElement;
    var rawBoot = null;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        rawBoot = window.localStorage.getItem("ttp:boot:v1");
      }
    } catch (e) {
      rawBoot = null;
    }

    var boot = null;
    if (rawBoot) {
      try {
        boot = JSON.parse(rawBoot);
      } catch (e) {
        boot = null;
      }
    }

    var theme = boot && boot.theme;
    if (theme !== "dark" && theme !== "light" && theme !== "high-contrast") {
      if (window.matchMedia && window.matchMedia("(prefers-contrast: more)").matches) {
        theme = "high-contrast";
      } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
        theme = "light";
      } else {
        theme = "dark";
      }
    }

    root.classList.toggle("light", theme === "light");
    root.classList.toggle("high-contrast", theme === "high-contrast");
    root.dataset.theme = theme;

    var themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute(
        "content",
        theme === "light" ? "#fafafa" : theme === "high-contrast" ? "#000000" : "#1b1b1b",
      );
    }

    if (boot && boot.dyslexiaFont === true) {
      root.dataset.font = "opendyslexic";
    } else {
      delete root.dataset.font;
    }

    var origin = window.location.origin;
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", origin + window.location.pathname);
    var ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", origin + window.location.pathname);
    var ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg) ogImg.setAttribute("content", origin + "/og-image.png");
    var twImg = document.querySelector('meta[name="twitter:image"]');
    if (twImg) twImg.setAttribute("content", origin + "/og-image.png");
  } catch (e) {}
})();
