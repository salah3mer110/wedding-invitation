/* ==========================================================================
   EDIT YOUR DETAILS HERE — everything else in this file can stay as it is.
   Texts are { ar: "...", en: "..." }. A language that is missing from a text
   is simply not shown, so most texts below are English only. The couple's
   names and the date/time are generated in Arabic and English.
   ========================================================================== */
const CONFIG = { 
  // "ar" (Arabic, RTL) | "en" (English) | "bilingual" (Arabic + English where both exist)
  language: "bilingual",

  couple: {
    bride: { ar: "أيمن", en: "Ayman" },
    groom: { ar: "روان", en: "Rawan" },
    joiner: { ar: "و", en: "&" },
  },

  event: {
    date: "2026-11-18", // YYYY-MM-DD  (the day of the wedding)
    time: "19:00", // 24h HH:MM   (local time at the venue)
    timezone: "Africa/Cairo",
  },

  venue: {
    name: { en: "Al Baron" },
    address: {}, // optional: e.g. { en: "Street, City" }; leave empty to hide the line
    mapsUrl: "https://maps.apple/p/iqgUH.cDJpW4gd",
  },

  // Monogram at the top of the page. Leave `image` empty to hide it.
  logo: {
    image: "assets/logo-small.png",
    alt: "A & R monogram",
  },

  // Photo shown blurred behind the whole page.
  background: {
    image: "assets/bg2.jpeg",
    blur: 16, // px; 0 = sharp, higher = no visible details
    brightness: 1, // 1 = as is; above 1 lifts a dark photo, below 1 dims a bright one
    veil: 0.62, // 0 to 1; how much cream is laid over the photo (higher = lighter, easier to read)
  },

  // Closed card shown first. Guests tap it to open the invitation.
  intro: {
    enabled: true,
    image: "assets/envelope.jpg", // envelope photo; if the file is missing, a built-in card is shown
    video: "", // (was assets/envelope-open.mp4) plays when the envelope is tapped; leave empty for no video
    fadeBeforeEnd: 0.8, // seconds before the video ends when the page starts to fade in
    letters: ["A", "R"], // monogram on the built-in card, shown as  A & R
  },

  music: {
    src: "assets/music.mp3",
    volume: 0.6, // 0 to 1
    startOnOpen: true, // start the music when the card is tapped open
  },

  calendar: {
    weekStartsOn: 6, // 0 = Sunday, 1 = Monday, 6 = Saturday
  },

  // English only. To show a text in Arabic as well, add an `ar: "..."` entry to it.
  text: {
    invitation: { en: "Wedding Invitation" },
    introHint: { en: "Tap to open" },
    // Arabic verse (Al-Nabigha al-Dhubyani). "\n" puts the second half on its own line.
    tagline: {
      ar: "فَإِنَّكَ شَمسٌ وَالمُلوكُ كَواكِبٌ\nإِذا طَلَعَت لَم يَبدُ مِنهُنَّ كَوكَبُ",
    },
    calendarTitle: { en: "Date" },
    countdownTitle: { en: "Counting Down" },
    countdownLabels: {
      days: { en: "Days" },
      hours: { en: "Hours" },
      minutes: { en: "Minutes" },
      seconds: { en: "Seconds" },
    },
    countdownDone: { en: "Today is the big day!" },
    venueTitle: { en: "The Venue" },
    openMaps: { en: "Open in Maps" },
    closingTitle: { en: "Thank You" },
    closingText: { en: "Your presence will make our day complete" },
    scrollDown: { en: "Scroll down" },
    musicPlay: { en: "Play music" },
    musicPause: { en: "Pause music" },
  },
};

/* ==========================================================================
   Below this line: the code that builds the page.
   ========================================================================== */
(function () {
  "use strict";

  const cfg = CONFIG;
  const LANGS =
    cfg.language === "ar"
      ? ["ar"]
      : cfg.language === "en"
        ? ["en"]
        : ["ar", "en"];
  const LOCALES = { ar: "ar-EG-u-nu-latn-ca-gregory", en: "en-GB" };
  const $ = (sel, root = document) => root.querySelector(sel);

  /* ---------- helpers ---------- */

  // Fill an element with one <span> per active language.
  function fill(el, obj) {
    el.replaceChildren(
      ...LANGS.filter((l) => obj[l]).map((l) => {
        const s = document.createElement("span");
        s.lang = l;
        s.dir = l === "ar" ? "rtl" : "ltr";
        s.textContent = obj[l];
        return s;
      }),
    );
  }

  // Plain string for places that can't hold markup (aria-labels, page title).
  const plain = (obj, sep = " / ") =>
    LANGS.filter((l) => obj[l])
      .map((l) => obj[l])
      .join(sep);

  // Build { ar, en } by running a function once per language.
  const perLang = (fn) => ({ ar: fn("ar"), en: fn("en") });

  // English only (used for dates and times; names still use perLang)
  const enOnly = (fn) => ({ en: fn("en") });

  // Wall-clock time in `tz` → UTC timestamp (handles Cairo's DST rules).
  function zonedToUtc(dateStr, timeStr, tz) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    const wall = Date.UTC(y, m - 1, d, hh, mm);
    let utc = wall - tzOffset(wall, tz);
    const again = tzOffset(utc, tz);
    if (again !== tzOffset(wall, tz)) utc = wall - again;
    return utc;
  }

  function tzOffset(ts, tz) {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .formatToParts(new Date(ts))
        .map((x) => [x.type, x.value]),
    );
    const asIfUtc = Date.UTC(
      +p.year,
      +p.month - 1,
      +p.day,
      +p.hour,
      +p.minute,
      +p.second,
    );
    return asIfUtc - Math.floor(ts / 1000) * 1000;
  }

  /* ---------- setup ---------- */

  const { date, time, timezone } = cfg.event;
  const weddingUtc = zonedToUtc(date, time, timezone);
  const [Y, M, D] = date.split("-").map(Number);

  // Page language and direction follow the main text (English); Arabic spans set their own direction.
  const MAIN = cfg.language === "ar" ? "ar" : "en";
  document.documentElement.lang = MAIN;
  document.documentElement.dir = MAIN === "ar" ? "rtl" : "ltr";

  const fmt = (l, opts) =>
    new Intl.DateTimeFormat(LOCALES[l], { timeZone: timezone, ...opts }).format(
      weddingUtc,
    );
  const fullDate = enOnly((l) =>
    fmt(l, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  );

  const names = perLang(
    (l) =>
      `${cfg.couple.bride[l]} ${cfg.couple.joiner[l]} ${cfg.couple.groom[l]}`,
  );
  document.title = `${plain(cfg.text.invitation, " · ")} — ${names[MAIN]}`;

  // Blurred photo background (drawn by style.css from these variables)
  if (cfg.background && cfg.background.image) {
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--bg-image", `url("${cfg.background.image}")`);
    rootStyle.setProperty("--bg-blur", `${cfg.background.blur}px`);
    rootStyle.setProperty("--bg-veil", cfg.background.veil);
    rootStyle.setProperty("--bg-bright", cfg.background.brightness || 1);
    document.documentElement.classList.add("has-bg");
  }

  // Logo
  const logo = $("#logo");
  if (cfg.logo && cfg.logo.image) {
    logo.src = cfg.logo.image;
    logo.alt = cfg.logo.alt || "";
  } else {
    logo.remove();
  }

  // Static text
  document
    .querySelectorAll("[data-i18n]")
    .forEach((el) => fill(el, cfg.text[el.dataset.i18n]));
  fill($("#names"), names);
  fill($("#closingNames"), names);
  fill($("#heroDate"), fullDate);
  fill($("#venueName"), cfg.venue.name);
  fill($("#venueAddress"), cfg.venue.address);
  $("#venueAddress").hidden = !$("#venueAddress").childElementCount;
  fill($("#venueDate"), fullDate);

  // Links
  $("#mapsBtn").href = cfg.venue.mapsUrl;

  // Scroll arrows
  document.querySelectorAll(".scroll-down").forEach((btn) => {
    btn.setAttribute("aria-label", plain(cfg.text.scrollDown));
    btn.addEventListener("click", () => {
      document
        .getElementById(btn.dataset.next)
        .scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ---------- calendar ---------- */

  (function buildCalendar() {
    fill(
      $("#monthTitle"),
      enOnly((l) =>
        new Intl.DateTimeFormat(LOCALES[l], {
          timeZone: "UTC",
          month: "long",
          year: "numeric",
        }).format(Date.UTC(Y, M - 1, 1)),
      ),
    );

    const grid = $("#calendarGrid");
    const labelLang = MAIN;
    const start = cfg.calendar.weekStartsOn;

    for (let i = 0; i < 7; i++) {
      const dow = (start + i) % 7; // 2023-01-01 was a Sunday
      const cell = document.createElement("span");
      cell.className = "cal-head";
      cell.textContent = new Intl.DateTimeFormat(LOCALES[labelLang], {
        timeZone: "UTC",
        weekday: "short",
      }).format(Date.UTC(2023, 0, 1 + dow));
      grid.append(cell);
    }

    const firstDow = new Date(Date.UTC(Y, M - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(Y, M, 0)).getUTCDate();
    const blanks = (firstDow - start + 7) % 7;

    for (let i = 0; i < blanks; i++)
      grid.append(document.createElement("span"));
    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement("span");
      cell.className = "cal-day" + (day === D ? " is-wedding" : "");
      cell.textContent = day;
      if (day === D) cell.setAttribute("aria-label", plain(fullDate));
      grid.append(cell);
    }
  })();

  /* ---------- countdown ---------- */

  (function countdown() {
    const units = ["days", "hours", "minutes", "seconds"];
    const box = $("#countdownBoxes");
    const nums = {};

    units.forEach((u) => {
      const wrap = document.createElement("div");
      wrap.className = "cd-box";
      const num = document.createElement("span");
      num.className = "cd-num";
      const label = document.createElement("span");
      label.className = "cd-label";
      fill(label, cfg.text.countdownLabels[u]);
      wrap.append(num, label);
      box.append(wrap);
      nums[u] = num;
    });

    const pad = (n) => String(n).padStart(2, "0");

    function tick() {
      let diff = Math.max(0, Math.floor((weddingUtc - Date.now()) / 1000));
      const v = {
        days: Math.floor(diff / 86400),
        hours: Math.floor((diff % 86400) / 3600),
        minutes: Math.floor((diff % 3600) / 60),
        seconds: diff % 60,
      };
      units.forEach((u) => {
        nums[u].textContent = pad(v[u]);
      });

      if (diff === 0) {
        const done = $("#countdownDone");
        fill(done, cfg.text.countdownDone);
        done.hidden = false;
        clearInterval(timer);
      }
    }

    tick();
    const timer = setInterval(tick, 1000);
  })();

  /* ---------- music ---------- */

  const music = (function () {
    const btn = $("#musicBtn");
    const audio = new Audio(cfg.music.src);
    audio.loop = true;
    audio.volume = cfg.music.volume;
    audio.preload = "none";

    function setState(playing) {
      btn.classList.toggle("is-playing", playing);
      btn.setAttribute("aria-pressed", String(playing));
      const label = plain(playing ? cfg.text.musicPause : cfg.text.musicPlay);
      btn.setAttribute("aria-label", label);
      btn.title = label;
    }

    setState(false);

    async function play() {
      try {
        await audio.play();
        btn.classList.add("has-played");
        setState(true);
      } catch (err) {
        console.warn("Could not play", cfg.music.src, err);
        setState(false);
      }
    }

    btn.addEventListener("click", () => {
      if (audio.paused) {
        play();
      } else {
        audio.pause();
        setState(false);
      }
    });

    return { play };
  })();

  /* ---------- scroll reveal ---------- */

  const reveal = (function () {
    const items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in"));
      return { restart() {} };
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          // Hold everything back while the closed card covers the page.
          if (
            e.isIntersecting &&
            !document.documentElement.classList.contains("intro-active")
          ) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2 },
    );
    const watch = () =>
      items.forEach((el) => {
        io.unobserve(el);
        io.observe(el);
      });
    watch();
    return { restart: watch };
  })();

  /* ---------- intro card ---------- */

  (function intro() {
    const root = document.documentElement;
    const el = $("#intro");

    if (!cfg.intro.enabled) {
      el.remove();
      root.classList.remove("intro-active");
      return;
    }

    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    document.querySelectorAll(".mono-a").forEach((n) => {
      n.textContent = cfg.intro.letters[0];
    });
    document.querySelectorAll(".mono-b").forEach((n) => {
      n.textContent = cfg.intro.letters[1];
    });
    el.setAttribute("aria-label", plain(cfg.text.introHint));

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let opened = false;
    let ready = false;
    const show = () => {
      ready = true;
      el.classList.add("ready");
    };

    // 1. The envelope photo, if it loads (otherwise the built-in card is shown).
    const probe = new Image();
    probe.onload = () => {
      if (opened) return; // too late: the card is already open
      $("#introImg").src = cfg.intro.image;
      el.classList.add("with-image");
      show();
    };
    probe.onerror = show;
    probe.src = cfg.intro.image;

    // 2. The opening video, if it loads: the tap then plays it.
    const vid = $("#introVideo");
    if (cfg.intro.video && !reduceMotion) {
      vid.poster = cfg.intro.image;
      vid.addEventListener(
        "loadeddata",
        () => {
          if (opened) return;
          el.classList.add("with-video");
          show();
        },
        { once: true },
      );
      vid.src = cfg.intro.video;
      vid.load();
    }

    setTimeout(() => {
      if (!ready) show();
    }, 2500);

    // Fade the intro away and reveal the page.
    function finish(showAt, removeAt) {
      setTimeout(reveal.restart, reduceMotion ? 0 : showAt);
      setTimeout(() => el.remove(), reduceMotion ? 0 : removeAt);
    }

    function playVideo() {
      el.classList.add("opening"); // hides the "tap to open" hint
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        root.classList.remove("intro-active");
        el.classList.add("finishing"); // fades the whole intro out
        finish(350, 1400);
      };
      // start fading just before the clip ends, when it is holding on the open envelope
      vid.addEventListener("timeupdate", () => {
        if (
          vid.duration &&
          vid.currentTime >= vid.duration - cfg.intro.fadeBeforeEnd
        )
          end();
      });
      vid.addEventListener("ended", end);
      vid.addEventListener("error", end);
      setTimeout(end, ((vid.duration || 5) + 2.5) * 1000); // safety net
      vid.play().catch(end);
    }

    function open() {
      if (opened) return;
      opened = true;
      if (cfg.music.startOnOpen) music.play(); // the tap counts as the user gesture
      if (el.classList.contains("with-video")) {
        playVideo();
        return;
      }
      el.classList.add("opening");
      root.classList.remove("intro-active");
      // the built-in envelope takes longer (seal, flap, letter) than the photo zoom
      const withImage = el.classList.contains("with-image");
      finish(withImage ? 700 : 1800, withImage ? 1900 : 3000);
    }

    el.addEventListener("click", open);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
    el.focus({ preventScroll: true });
  })();
})();
