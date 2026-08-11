const clockEls = [...document.querySelectorAll("#clock, #clock-menu, #clock-menu-bottom")];
const navLinks = [...document.querySelectorAll(".js-nav-link")];
const sideNavEl = document.querySelector(".side-nav");
const scrollTopTriggers = [...document.querySelectorAll(".js-scroll-top")];
const mobileMenuEl = document.querySelector("#mobile-menu");
const mobileStickyTopbarEl = document.querySelector(".mobile-sticky-topbar");
const menuToggleButtons = [...document.querySelectorAll(".js-menu-toggle")];
const mobileMenuLinks = [...document.querySelectorAll(".mobile-menu__link")];
const waveStacks = [...document.querySelectorAll(".wave-stack")];
const resultCards = [...document.querySelectorAll(".case-result-card")];
const tabsBlocks = [...document.querySelectorAll(".js-tabs")];
const caseAccordions = [...document.querySelectorAll(".case-accordion")];
let scrollAnimationFrame = null;
let isNavProgrammaticScroll = false;
let programmaticNavId = null;
const MENU_SCROLL_SPEED_PX_PER_MS = 1.2;
const MENU_SCROLL_MIN_DURATION_MS = 380;
const MENU_SCROLL_MAX_DURATION_MS = 1_400;
const SCROLL_SPY_EPSILON_PX = 8;
const WAVE_SOCIALS_CLOSE_DELAY_MS = 120;
const MOBILE_STICKY_TOPBAR_TRIGGER_PX = 200;
const MOBILE_STICKY_TOPBAR_TRANSITION_MS = 380;
const TABS_COLLAPSE_MQ = window.matchMedia("(max-width: 1024px)");
const TABS_COLLAPSED_HEIGHT_PX = 280;
const MOBILE_MENU_TRANSITION_FALLBACK_MS = 280;
const ACCORDION_ANIMATION_SPEED_PX_PER_MS = 1.65;
const ACCORDION_ANIMATION_MIN_DURATION_MS = 300;
const ACCORDION_ANIMATION_MAX_DURATION_MS = 760;
const ACCORDION_ANIMATION_EASING = "cubic-bezier(0.25, 1, 0.35, 1)";
const ACCORDION_CONTENT_ANIMATION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
let mobileMenuHideTimerId = null;
let mobileMenuTransitionEndHandler = null;
let mobileMenuOpenAnimationFrameId = null;
let mobileStickyTopbarVisible = false;
let mobileStickyTopbarOpenRafId = null;
let mobileStickyTopbarHideTimerId = null;
let mobileStickyTopbarTransitionEndHandler = null;
const sections = navLinks
  .map((link) => {
    const id = link.getAttribute("href")?.slice(1);
    return id ? document.getElementById(id) : null;
  })
  .filter(Boolean);

function formatMoscowTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = parts.find((p) => p.type === "hour")?.value ?? "--";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "--";
  const second = Number(parts.find((p) => p.type === "second")?.value ?? "0");
  const separator = second % 2 === 0 ? ":" : " ";
  return `GMT +3, ${hour}${separator}${minute}`;
}

function tickClock() {
  if (clockEls.length === 0) return;
  const text = formatMoscowTime();
  for (const clockEl of clockEls) {
    clockEl.textContent = text;
  }
}

function setActiveNav(id) {
  for (const link of navLinks) {
    const active = link.getAttribute("href") === `#${id}`;
    link.classList.toggle("is-active", active);
  }
}

function getScrollSpyOffset() {
  if (!sideNavEl) return 180;
  return sideNavEl.getBoundingClientRect().top + 1;
}

function getMenuScrollDuration(startY, targetY) {
  const distance = Math.abs(targetY - startY);
  const rawDuration = distance / MENU_SCROLL_SPEED_PX_PER_MS;
  return Math.min(
    MENU_SCROLL_MAX_DURATION_MS,
    Math.max(MENU_SCROLL_MIN_DURATION_MS, rawDuration),
  );
}

function getAccordionAnimationDuration(startHeight, endHeight) {
  const distance = Math.abs(endHeight - startHeight);
  const rawDuration = distance / ACCORDION_ANIMATION_SPEED_PX_PER_MS;
  return Math.min(
    ACCORDION_ANIMATION_MAX_DURATION_MS,
    Math.max(ACCORDION_ANIMATION_MIN_DURATION_MS, rawDuration),
  );
}

function setupCaseAccordion(accordion) {
  if (!(accordion instanceof HTMLDetailsElement)) return;

  const summary = accordion.querySelector(":scope > .case-accordion__summary");
  if (!(summary instanceof HTMLElement)) return;
  const contentInner = accordion.querySelector(":scope > .case-accordion__content > .case-accordion__content-inner");

  accordion.classList.add("is-js-accordion");
  summary.setAttribute("aria-expanded", String(accordion.open));

  let animation = null;
  let contentAnimation = null;
  let isExpanding = false;
  let isCollapsing = false;

  const onAnimationFinish = (open) => {
    animation = null;
    if (contentAnimation) {
      contentAnimation.cancel();
      contentAnimation = null;
    }
    isExpanding = false;
    isCollapsing = false;
    accordion.open = open;
    accordion.style.height = "";
    accordion.style.overflow = "";
    summary.setAttribute("aria-expanded", String(open));
  };

  const onAnimationCancel = () => {
    animation = null;
    if (contentAnimation) {
      contentAnimation.cancel();
      contentAnimation = null;
    }
    isExpanding = false;
    isCollapsing = false;
  };

  const playContentAnimation = (open, duration) => {
    if (!(contentInner instanceof HTMLElement)) return;
    if (contentAnimation) {
      contentAnimation.cancel();
      contentAnimation = null;
    }

    const contentDuration = Math.max(220, Math.round(duration * 0.88));
    const keyframes = open
      ? [
          { opacity: 0, transform: "translateY(-8px)" },
          { opacity: 1, transform: "translateY(0)" },
        ]
      : [
          { opacity: 1, transform: "translateY(0)" },
          { opacity: 0, transform: "translateY(-8px)" },
        ];

    contentAnimation = contentInner.animate(keyframes, {
      duration: contentDuration,
      easing: ACCORDION_CONTENT_ANIMATION_EASING,
      fill: "both",
    });
    contentAnimation.onfinish = () => {
      contentAnimation = null;
    };
    contentAnimation.oncancel = () => {
      contentAnimation = null;
    };
  };

  const animateAccordionHeight = (startHeight, endHeight, open) => {
    const duration = getAccordionAnimationDuration(startHeight, endHeight);
    accordion.style.height = `${startHeight}px`;
    accordion.style.overflow = "hidden";
    playContentAnimation(open, duration);

    animation = accordion.animate(
      {
        height: [`${startHeight}px`, `${endHeight}px`],
      },
      {
        duration,
        easing: ACCORDION_ANIMATION_EASING,
      },
    );

    animation.onfinish = () => {
      onAnimationFinish(open);
      if (open) {
        for (const toggle of accordion.querySelectorAll(".js-ba-toggle")) {
          toggle.dispatchEvent(new Event("ba-toggle:resync"));
        }
      }
    };
    animation.oncancel = onAnimationCancel;
  };

  const openAccordion = () => {
    isExpanding = true;
    const startHeight = accordion.offsetHeight;
    accordion.open = true;
    const endHeight = accordion.offsetHeight;
    animateAccordionHeight(startHeight, endHeight, true);
  };

  const collapseAccordion = () => {
    isCollapsing = true;
    const startHeight = accordion.offsetHeight;
    const endHeight = summary.offsetHeight;
    animateAccordionHeight(startHeight, endHeight, false);
  };

  summary.addEventListener("click", (event) => {
    event.preventDefault();

    if (animation) {
      accordion.style.height = `${accordion.offsetHeight}px`;
      animation.cancel();
    }

    if (isCollapsing || !accordion.open) {
      openAccordion();
      return;
    }

    if (isExpanding || accordion.open) {
      collapseAccordion();
    }
  });
}

function scrollToYInstant(y) {
  // behavior: "auto" — иначе CSS/браузерный smooth снова анимирует каждый кадр
  window.scrollTo({ top: y, left: 0, behavior: "auto" });
}

function getDocumentMaxScrollY() {
  const el = document.scrollingElement ?? document.documentElement;
  return Math.max(0, el.scrollHeight - window.innerHeight);
}

let endScrollPinObserver = null;
let endScrollPinTimerId = null;
let endScrollPinUserAbort = null;

function clearEndScrollPin() {
  if (endScrollPinObserver) {
    endScrollPinObserver.disconnect();
    endScrollPinObserver = null;
  }
  if (endScrollPinTimerId !== null) {
    window.clearTimeout(endScrollPinTimerId);
    endScrollPinTimerId = null;
  }
  if (endScrollPinUserAbort) {
    window.removeEventListener("wheel", endScrollPinUserAbort);
    window.removeEventListener("touchmove", endScrollPinUserAbort);
    window.removeEventListener("keydown", endScrollPinUserAbort);
    endScrollPinUserAbort = null;
  }
}

function pinScrollToDocumentEnd(durationMs = 1200) {
  clearEndScrollPin();

  const pin = () => {
    scrollToYInstant(getDocumentMaxScrollY());
  };

  endScrollPinUserAbort = () => {
    clearEndScrollPin();
  };

  pin();

  window.addEventListener("wheel", endScrollPinUserAbort, { passive: true });
  window.addEventListener("touchmove", endScrollPinUserAbort, { passive: true });
  window.addEventListener("keydown", endScrollPinUserAbort);

  if (typeof ResizeObserver === "undefined") {
    endScrollPinTimerId = window.setTimeout(() => {
      pin();
      clearEndScrollPin();
    }, durationMs);
    return;
  }

  endScrollPinObserver = new ResizeObserver(pin);
  endScrollPinObserver.observe(document.documentElement);
  const scrollRoot = document.scrollingElement;
  if (scrollRoot && scrollRoot !== document.documentElement) {
    endScrollPinObserver.observe(scrollRoot);
  }

  endScrollPinTimerId = window.setTimeout(() => {
    pin();
    clearEndScrollPin();
  }, durationMs);
}

function smoothScrollToY(targetY, duration = 450, onComplete = null, { stickToEnd = false } = {}) {
  const startY = window.scrollY;
  const resolveTargetY = () => {
    const maxY = getDocumentMaxScrollY();
    if (stickToEnd) return maxY;
    return Math.min(Math.max(0, targetY), maxY);
  };

  let clampedTargetY = resolveTargetY();
  const distance = clampedTargetY - startY;

  if (Math.abs(distance) < 1) {
    scrollToYInstant(clampedTargetY);
    if (stickToEnd) pinScrollToDocumentEnd();
    if (typeof onComplete === "function") {
      onComplete();
    }
    return;
  }

  if (scrollAnimationFrame) {
    cancelAnimationFrame(scrollAnimationFrame);
    scrollAnimationFrame = null;
  }
  clearEndScrollPin();

  const startTime = performance.now();

  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    // lazy-img / шрифты могут нарастить scrollHeight mid-flight — догоняем живой низ
    clampedTargetY = resolveTargetY();
    scrollToYInstant(startY + (clampedTargetY - startY) * eased);

    if (progress < 1) {
      scrollAnimationFrame = requestAnimationFrame(step);
      return;
    }

    scrollAnimationFrame = null;
    scrollToYInstant(resolveTargetY());
    if (stickToEnd) pinScrollToDocumentEnd();
    if (typeof onComplete === "function") {
      onComplete();
    }
  };

  scrollAnimationFrame = requestAnimationFrame(step);
}

function onScrollSpy() {
  if (sections.length === 0) return;
  if (isNavProgrammaticScroll && programmaticNavId) {
    setActiveNav(programmaticNavId);
    return;
  }

  const offset = getScrollSpyOffset();
  let current = sections[0].id;

  for (const section of sections) {
    if (section.getBoundingClientRect().top <= offset + SCROLL_SPY_EPSILON_PX) {
      current = section.id;
    }
  }

  // у низа страницы последний пункт (Контакты) может не дойти до offset — форсим его
  const maxY = getDocumentMaxScrollY();
  if (window.scrollY >= maxY - SCROLL_SPY_EPSILON_PX) {
    current = sections[sections.length - 1].id;
  }

  setActiveNav(current);
}

function clearMobileStickyTopbarOpenRaf() {
  if (mobileStickyTopbarOpenRafId === null) return;
  window.cancelAnimationFrame(mobileStickyTopbarOpenRafId);
  mobileStickyTopbarOpenRafId = null;
}

function clearMobileStickyTopbarHideTimer() {
  if (mobileStickyTopbarHideTimerId === null) return;
  window.clearTimeout(mobileStickyTopbarHideTimerId);
  mobileStickyTopbarHideTimerId = null;
}

function clearMobileStickyTopbarTransitionEndHandler() {
  if (!mobileStickyTopbarEl || !mobileStickyTopbarTransitionEndHandler) return;
  mobileStickyTopbarEl.removeEventListener("transitionend", mobileStickyTopbarTransitionEndHandler);
  mobileStickyTopbarTransitionEndHandler = null;
}

function showMobileStickyTopbar() {
  if (!(mobileStickyTopbarEl instanceof HTMLElement)) return;
  if (mobileStickyTopbarVisible) return;

  clearMobileStickyTopbarHideTimer();
  clearMobileStickyTopbarTransitionEndHandler();
  clearMobileStickyTopbarOpenRaf();

  mobileStickyTopbarVisible = true;
  mobileStickyTopbarEl.hidden = false;

  // Double RAF: paint off-screen state, then slide in.
  mobileStickyTopbarOpenRafId = window.requestAnimationFrame(() => {
    mobileStickyTopbarOpenRafId = window.requestAnimationFrame(() => {
      mobileStickyTopbarEl.classList.add("is-visible");
      mobileStickyTopbarOpenRafId = null;
    });
  });
}

function hideMobileStickyTopbar() {
  if (!(mobileStickyTopbarEl instanceof HTMLElement)) return;
  if (!mobileStickyTopbarVisible && mobileStickyTopbarEl.hidden) return;

  clearMobileStickyTopbarOpenRaf();
  clearMobileStickyTopbarHideTimer();
  clearMobileStickyTopbarTransitionEndHandler();

  mobileStickyTopbarVisible = false;
  mobileStickyTopbarEl.classList.remove("is-visible");

  if (mobileStickyTopbarEl.hidden) return;

  const finalizeHide = () => {
    mobileStickyTopbarEl.hidden = true;
    clearMobileStickyTopbarTransitionEndHandler();
    clearMobileStickyTopbarHideTimer();
  };

  mobileStickyTopbarTransitionEndHandler = (event) => {
    if (event.target !== mobileStickyTopbarEl || event.propertyName !== "transform") return;
    finalizeHide();
  };

  mobileStickyTopbarEl.addEventListener("transitionend", mobileStickyTopbarTransitionEndHandler);
  mobileStickyTopbarHideTimerId = window.setTimeout(finalizeHide, MOBILE_STICKY_TOPBAR_TRANSITION_MS);
}

function syncMobileStickyTopbar() {
  if (!(mobileStickyTopbarEl instanceof HTMLElement)) return;

  const menuIsOpen =
    mobileMenuEl?.classList.contains("is-open") ||
    mobileMenuEl?.classList.contains("is-closing") ||
    false;
  const shouldShow = isMobileViewport() && !menuIsOpen && window.scrollY >= MOBILE_STICKY_TOPBAR_TRIGGER_PX;

  if (shouldShow) {
    showMobileStickyTopbar();
  } else {
    hideMobileStickyTopbar();
  }
}

function clearMobileMenuHideTimer() {
  if (mobileMenuHideTimerId === null) return;
  window.clearTimeout(mobileMenuHideTimerId);
  mobileMenuHideTimerId = null;
}

function clearMobileMenuTransitionEndHandler() {
  if (!mobileMenuEl || !mobileMenuTransitionEndHandler) return;
  mobileMenuEl.removeEventListener("transitionend", mobileMenuTransitionEndHandler);
  mobileMenuTransitionEndHandler = null;
}

function clearMobileMenuOpenAnimationFrame() {
  if (mobileMenuOpenAnimationFrameId === null) return;
  window.cancelAnimationFrame(mobileMenuOpenAnimationFrameId);
  mobileMenuOpenAnimationFrameId = null;
}

function setMenuOpen(isOpen) {
  if (!mobileMenuEl) return;

  clearMobileMenuHideTimer();
  clearMobileMenuTransitionEndHandler();
  clearMobileMenuOpenAnimationFrame();
  mobileMenuEl.classList.remove("is-closing");

  if (isOpen) {
    mobileMenuEl.hidden = false;
    document.body.classList.add("is-menu-open");

    // Double RAF makes sure browser paints "closed" state first.
    mobileMenuOpenAnimationFrameId = window.requestAnimationFrame(() => {
      mobileMenuOpenAnimationFrameId = window.requestAnimationFrame(() => {
        mobileMenuEl.classList.add("is-open");
        mobileMenuOpenAnimationFrameId = null;
      });
    });
  } else {
    if (mobileMenuEl.hidden && !mobileMenuEl.classList.contains("is-open")) {
      document.body.classList.remove("is-menu-open");
      syncMobileStickyTopbar();
      for (const button of menuToggleButtons) {
        button.classList.remove("is-open");
        button.classList.remove("is-pressed");
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-label", "Открыть меню");
      }
      return;
    }

    // Снимаем lock сразу — иначе scrollTo якорей мёртв ~280ms пока меню закрывается
    document.body.classList.remove("is-menu-open");
    mobileMenuEl.classList.remove("is-open");
    mobileMenuEl.classList.add("is-closing");

    const finalizeClose = () => {
      mobileMenuEl.hidden = true;
      mobileMenuEl.classList.remove("is-closing");
      clearMobileMenuTransitionEndHandler();
      clearMobileMenuHideTimer();
      syncMobileStickyTopbar();
    };

    mobileMenuTransitionEndHandler = (event) => {
      if (event.target !== mobileMenuEl || event.propertyName !== "opacity") return;
      finalizeClose();
    };

    mobileMenuEl.addEventListener("transitionend", mobileMenuTransitionEndHandler);
    mobileMenuHideTimerId = window.setTimeout(() => {
      finalizeClose();
    }, MOBILE_MENU_TRANSITION_FALLBACK_MS);
  }

  for (const button of menuToggleButtons) {
    button.classList.toggle("is-open", isOpen);
    button.classList.remove("is-pressed");
    button.setAttribute("aria-expanded", String(isOpen));
    button.setAttribute("aria-label", isOpen ? "Закрыть меню" : "Открыть меню");
  }
  syncMobileStickyTopbar();
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 1024px)").matches;
}

tickClock();
setInterval(tickClock, 1_000);

for (const accordion of caseAccordions) {
  setupCaseAccordion(accordion);
}

window.addEventListener(
  "scroll",
  () => {
    onScrollSpy();
    syncMobileStickyTopbar();
  },
  { passive: true },
);
onScrollSpy();
setMenuOpen(false);
syncMobileStickyTopbar();

if (mobileStickyTopbarEl instanceof HTMLElement) {
  mobileStickyTopbarEl.hidden = true;
  mobileStickyTopbarEl.classList.remove("is-visible");
  mobileStickyTopbarVisible = false;
}

for (const link of navLinks) {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const id = link.getAttribute("href")?.slice(1);
    if (!id) return;

    const targetSection = document.getElementById(id);
    if (!targetSection) return;

    setActiveNav(id);

    const runNavScroll = () => {
      isNavProgrammaticScroll = true;
      programmaticNavId = id;
      const stickToEnd = id === "contact";
      const targetY = stickToEnd
        ? getDocumentMaxScrollY()
        : targetSection.getBoundingClientRect().top +
          window.scrollY -
          getScrollSpyOffset();
      const duration = getMenuScrollDuration(window.scrollY, targetY);
      smoothScrollToY(
        targetY,
        duration,
        () => {
          isNavProgrammaticScroll = false;
          programmaticNavId = null;
          setActiveNav(id);
        },
        { stickToEnd },
      );
    };

    if (isMobileViewport()) {
      setMenuOpen(false);
      // кадр после снятия overflow:hidden — иначе targetY/scrollTo считаются на залоченном body
      window.requestAnimationFrame(runNavScroll);
      return;
    }

    runNavScroll();
  });
}

for (const scrollTopTrigger of scrollTopTriggers) {
  scrollTopTrigger.addEventListener("click", (event) => {
    const href = scrollTopTrigger.getAttribute("href") ?? "";
    if (!href.startsWith("#")) return;

    event.preventDefault();
    setActiveNav("hero-title");
    const duration = getMenuScrollDuration(window.scrollY, 0);
    smoothScrollToY(0, duration);
  });
}

for (const button of menuToggleButtons) {
  button.addEventListener("pointerdown", () => {
    if (!button.classList.contains("is-open")) {
      button.classList.add("is-pressed");
    }
  });

  button.addEventListener("pointerup", () => {
    button.classList.remove("is-pressed");
  });

  button.addEventListener("pointerleave", () => {
    button.classList.remove("is-pressed");
  });

  button.addEventListener("click", () => {
    if (!mobileMenuEl || !isMobileViewport()) return;
    const isOpen = mobileMenuEl.classList.contains("is-open");
    setMenuOpen(!isOpen);
  });
}

for (const link of mobileMenuLinks) {
  link.addEventListener("click", () => {
    if (!mobileMenuEl) return;
    setMenuOpen(false);
  });
}

for (const waveStack of waveStacks) {
  const waveButton = waveStack.querySelector(".wave");
  const waveSocials = waveStack.querySelector(".wave-stack__socials");
  if (!(waveButton instanceof HTMLElement) || !(waveSocials instanceof HTMLElement)) continue;

  let closeTimerId = null;

  const clearCloseTimer = () => {
    if (closeTimerId === null) return;
    window.clearTimeout(closeTimerId);
    closeTimerId = null;
  };

  const openWaveSocials = () => {
    clearCloseTimer();
    waveStack.classList.add("is-wave-open");
  };

  const scheduleCloseWaveSocials = () => {
    clearCloseTimer();
    closeTimerId = window.setTimeout(() => {
      waveStack.classList.remove("is-wave-open");
      closeTimerId = null;
    }, WAVE_SOCIALS_CLOSE_DELAY_MS);
  };

  waveButton.addEventListener("pointerenter", openWaveSocials);
  waveButton.addEventListener("pointerleave", scheduleCloseWaveSocials);
  waveSocials.addEventListener("pointerenter", openWaveSocials);
  waveSocials.addEventListener("pointerleave", scheduleCloseWaveSocials);
}

const canUseConfettiHover = window.matchMedia("(hover: hover) and (pointer: fine)");

for (const resultCard of resultCards) {
  if (!(resultCard instanceof HTMLElement)) continue;
  if (!canUseConfettiHover.matches) continue;

  const activateConfetti = () => {
    resultCard.classList.add("is-confetti-active");
  };

  const deactivateConfetti = () => {
    resultCard.classList.remove("is-confetti-active");
  };

  resultCard.addEventListener("pointerenter", activateConfetti);
  resultCard.addEventListener("pointerleave", deactivateConfetti);
  resultCard.addEventListener("focusin", activateConfetti);
  resultCard.addEventListener("focusout", deactivateConfetti);
}

for (const tabsBlock of tabsBlocks) {
  const tabsHead = tabsBlock.querySelector(".case-results-tabs__head");
  const tabsBody = tabsBlock.querySelector(".case-results-tabs__body");
  const tabsMoreButton = tabsBlock.querySelector(".case-results-tabs__more");
  const tabButtons = [...tabsBlock.querySelectorAll('[role="tab"]')];
  const tabPanels = [...tabsBlock.querySelectorAll('[role="tabpanel"]')];
  if (tabButtons.length === 0 || tabPanels.length === 0) continue;

  const isTabsCollapseEnabled = () => TABS_COLLAPSE_MQ.matches;

  const clearPreviewState = () => {
    if (tabsHead instanceof HTMLElement) {
      tabsHead.classList.remove("is-previewing");
    }
    for (const tabButton of tabButtons) {
      tabButton.classList.remove("is-preview-target");
    }
  };

  const getActiveButton = () => {
    return tabButtons.find((tabButton) => tabButton.classList.contains("is-active")) ?? tabButtons[0];
  };

  const getActivePanel = () => {
    return tabPanels.find((tabPanel) => tabPanel.classList.contains("is-active")) ?? tabPanels[0];
  };

  const isPanelExpanded = (tabPanel) => {
    return tabPanel.dataset.expanded === "true";
  };

  const setPanelExpanded = (tabPanel, isExpanded) => {
    tabPanel.dataset.expanded = isExpanded ? "true" : "false";
  };

  const isTabsHeadVertical = () => {
    return (
      tabsHead instanceof HTMLElement &&
      getComputedStyle(tabsHead).flexDirection === "column"
    );
  };

  const syncTabsHeadIndicator = (targetButton) => {
    if (!(tabsHead instanceof HTMLElement) || !(targetButton instanceof HTMLElement)) return;

    const headRect = tabsHead.getBoundingClientRect();
    const targetRect = targetButton.getBoundingClientRect();

    if (isTabsHeadVertical()) {
      const activeY = targetRect.top - headRect.top + tabsHead.scrollTop;
      tabsHead.style.setProperty("--tabs-active-y", `${activeY}px`);
      tabsHead.style.setProperty("--tabs-active-h", `${targetRect.height}px`);
      return;
    }

    const activeX = targetRect.left - headRect.left + tabsHead.scrollLeft;
    tabsHead.style.setProperty("--tabs-active-x", `${activeX}px`);
    tabsHead.style.setProperty("--tabs-active-w", `${targetRect.width}px`);
  };

  const scrollTabIntoView = (targetButton) => {
    if (!(tabsHead instanceof HTMLElement) || !(targetButton instanceof HTMLElement)) return;
    if (isTabsHeadVertical()) return;

    const headRect = tabsHead.getBoundingClientRect();
    const targetRect = targetButton.getBoundingClientRect();
    const pad = 8;

    if (targetRect.left < headRect.left + pad) {
      tabsHead.scrollBy({ left: targetRect.left - headRect.left - pad, behavior: "smooth" });
      return;
    }

    if (targetRect.right > headRect.right - pad) {
      tabsHead.scrollBy({ left: targetRect.right - headRect.right + pad, behavior: "smooth" });
    }
  };

  const syncTabsMoreButton = () => {
    if (!(tabsMoreButton instanceof HTMLButtonElement)) return;

    const collapseEnabled = isTabsCollapseEnabled();
    const activePanel = getActivePanel();
    const isOverflowing =
      collapseEnabled && activePanel.scrollHeight > TABS_COLLAPSED_HEIGHT_PX;
    const isExpanded = isPanelExpanded(activePanel);

    tabsMoreButton.hidden = !isOverflowing;
    if (!isOverflowing) return;

    tabsMoreButton.textContent = isExpanded ? "Скрыть" : "Показать еще";
  };

  const syncActivePanelVisibility = () => {
    if (tabsBody instanceof HTMLElement) {
      tabsBlock.style.setProperty("--tabs-body-min-height", "0px");
    }

    const collapseEnabled = isTabsCollapseEnabled();
    const activePanel = getActivePanel();
    const isOverflowing =
      collapseEnabled && activePanel.scrollHeight > TABS_COLLAPSED_HEIGHT_PX;
    const isExpanded = isOverflowing && isPanelExpanded(activePanel);

    for (const tabPanel of tabPanels) {
      const panelIsActive = tabPanel === activePanel;
      tabPanel.classList.toggle("is-overflowing", panelIsActive && isOverflowing);
      tabPanel.classList.toggle("is-expanded", panelIsActive && isExpanded);
      tabPanel.classList.toggle("is-collapsed", panelIsActive && isOverflowing && !isExpanded);
    }

    syncTabsMoreButton();
  };

  const setActiveTab = (targetButton) => {
    const targetPanelId = targetButton.getAttribute("aria-controls");
    if (!targetPanelId) return;

    clearPreviewState();

    for (const tabButton of tabButtons) {
      const isActive = tabButton === targetButton;
      tabButton.classList.toggle("is-active", isActive);
      tabButton.setAttribute("aria-selected", String(isActive));
    }

    for (const tabPanel of tabPanels) {
      const isActive = tabPanel.id === targetPanelId;
      tabPanel.classList.toggle("is-active", isActive);
      tabPanel.hidden = !isActive;
    }

    syncActivePanelVisibility();
    syncTabsHeadIndicator(targetButton);
    scrollTabIntoView(targetButton);
  };

  for (const tabButton of tabButtons) {
    const resetPressedState = () => {
      tabButton.classList.remove("is-pressed");
      if (tabButton.classList.contains("is-active")) return;
      clearPreviewState();
      syncTabsHeadIndicator(getActiveButton());
    };

    tabButton.addEventListener("pointerdown", () => {
      tabButton.classList.add("is-pressed");
      if (tabButton.classList.contains("is-active")) return;

      if (tabsHead instanceof HTMLElement) {
        tabsHead.classList.add("is-previewing");
      }
      for (const button of tabButtons) {
        button.classList.toggle("is-preview-target", button === tabButton);
      }
      syncTabsHeadIndicator(tabButton);
    });

    tabButton.addEventListener("pointerup", resetPressedState);
    tabButton.addEventListener("pointerleave", resetPressedState);
    tabButton.addEventListener("pointercancel", resetPressedState);

    tabButton.addEventListener("click", () => {
      setActiveTab(tabButton);
    });
  }

  for (const tabPanel of tabPanels) {
    setPanelExpanded(tabPanel, false);
  }

  if (tabsMoreButton instanceof HTMLButtonElement) {
    tabsMoreButton.addEventListener("click", () => {
      if (!isTabsCollapseEnabled()) return;

      const activePanel = getActivePanel();
      const isOverflowing = activePanel.scrollHeight > TABS_COLLAPSED_HEIGHT_PX;
      if (!isOverflowing) return;

      setPanelExpanded(activePanel, !isPanelExpanded(activePanel));
      syncActivePanelVisibility();
    });
  }

  syncTabsHeadIndicator(getActiveButton());
  syncActivePanelVisibility();
  window.addEventListener("resize", () => {
    syncTabsHeadIndicator(getActiveButton());
    syncActivePanelVisibility();
  });
  TABS_COLLAPSE_MQ.addEventListener("change", syncActivePanelVisibility);
}

function initCarousel(carouselEl) {
  const track = carouselEl.querySelector(".case-carousel__track");
  const slides = [...carouselEl.querySelectorAll(".case-carousel__slide")];
  const dots = [...carouselEl.querySelectorAll(".js-carousel-dot")];
  const prevBtn = carouselEl.querySelector(".js-carousel-prev");
  const nextBtn = carouselEl.querySelector(".js-carousel-next");
  if (!(track instanceof HTMLElement) || slides.length === 0) return;

  let currentIndex = Math.max(
    0,
    slides.findIndex((slide) => slide.classList.contains("is-active"))
  );
  let touchStartX = 0;
  let touchDeltaX = 0;

  function goTo(index) {
    const total = slides.length;
    currentIndex = ((index % total) + total) % total;

    for (const [i, slide] of slides.entries()) {
      const active = i === currentIndex;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
    }

    for (const [i, dot] of dots.entries()) {
      const active = i === currentIndex;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-selected", String(active));
    }
  }

  prevBtn?.addEventListener("click", () => goTo(currentIndex - 1));
  nextBtn?.addEventListener("click", () => goTo(currentIndex + 1));

  for (const dot of dots) {
    dot.addEventListener("click", () => {
      const slideIndex = Number(dot.dataset.slide);
      if (Number.isFinite(slideIndex)) goTo(slideIndex);
    });
  }

  carouselEl.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(currentIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(currentIndex + 1);
    }
  });

  track.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.changedTouches[0]?.clientX ?? 0;
      touchDeltaX = 0;
    },
    { passive: true }
  );

  track.addEventListener(
    "touchmove",
    (event) => {
      touchDeltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStartX;
    },
    { passive: true }
  );

  track.addEventListener(
    "touchend",
    () => {
      if (Math.abs(touchDeltaX) < 40) return;
      goTo(touchDeltaX > 0 ? currentIndex - 1 : currentIndex + 1);
      touchDeltaX = 0;
    },
    { passive: true }
  );

  goTo(currentIndex);
}

for (const carouselEl of document.querySelectorAll(".js-carousel")) {
  if (carouselEl instanceof HTMLElement) initCarousel(carouselEl);
}

function initBaSlider(root) {
  const frame = root.querySelector(".ba-slider__frame");
  const range = root.querySelector("[data-ba-range]");
  if (!(frame instanceof HTMLElement) || !(range instanceof HTMLInputElement)) {
    return;
  }

  let dragging = false;

  function setPosition(percent) {
    const clamped = Math.min(100, Math.max(0, percent));
    root.style.setProperty("--ba-pos", `${clamped}%`);
    if (Number(range.value) !== clamped) range.value = String(clamped);
  }

  function positionFromPointer(clientX) {
    const rect = frame.getBoundingClientRect();
    if (rect.width <= 0) return 50;
    return ((clientX - rect.left) / rect.width) * 100;
  }

  setPosition(Number(range.value) || 50);

  range.addEventListener("input", () => {
    setPosition(Number(range.value));
  });

  frame.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    dragging = true;
    frame.setPointerCapture(event.pointerId);
    setPosition(positionFromPointer(event.clientX));
  });

  frame.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    setPosition(positionFromPointer(event.clientX));
  });

  const stopDragging = (event) => {
    if (!dragging) return;
    dragging = false;
    if (frame.hasPointerCapture(event.pointerId)) {
      frame.releasePointerCapture(event.pointerId);
    }
  };

  frame.addEventListener("pointerup", stopDragging);
  frame.addEventListener("pointercancel", stopDragging);
}

for (const baSliderEl of document.querySelectorAll(".js-ba-slider")) {
  if (baSliderEl instanceof HTMLElement) initBaSlider(baSliderEl);
}

function initBaToggle(root) {
  const switchEl = root.querySelector(".ba-toggle__switch");
  const tabs = [...root.querySelectorAll(".ba-toggle__tab")];
  const panels = [...root.querySelectorAll("[data-ba-panel]")];
  if (!(switchEl instanceof HTMLElement) || tabs.length === 0 || panels.length === 0) {
    return;
  }

  const clearPreviewState = () => {
    switchEl.classList.remove("is-previewing");
    for (const tab of tabs) tab.classList.remove("is-preview-target");
  };

  const getActiveTab = () => {
    return tabs.find((tab) => tab.classList.contains("is-active")) ?? tabs[0];
  };

  const syncIndicator = (target) => {
    if (!(target instanceof HTMLElement)) return;
    switchEl.style.setProperty("--ba-toggle-active-x", `${target.offsetLeft}px`);
    switchEl.style.setProperty("--ba-toggle-active-w", `${target.offsetWidth}px`);
  };

  const activate = (targetTab) => {
    if (!(targetTab instanceof HTMLElement)) return;
    const view = targetTab.dataset.baView || "before";

    clearPreviewState();

    for (const tab of tabs) {
      const isActive = tab === targetTab;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    }

    for (const panel of panels) {
      const isActive = panel.dataset.baPanel === view;
      panel.classList.toggle("is-active", isActive);
      panel.setAttribute("aria-hidden", isActive ? "false" : "true");
    }

    syncIndicator(targetTab);
  };

  for (const tab of tabs) {
    const resetPressedState = () => {
      tab.classList.remove("is-pressed");
      if (tab.classList.contains("is-active")) return;
      clearPreviewState();
      syncIndicator(getActiveTab());
    };

    tab.addEventListener("pointerdown", () => {
      tab.classList.add("is-pressed");
      if (tab.classList.contains("is-active")) return;

      switchEl.classList.add("is-previewing");
      for (const other of tabs) {
        other.classList.toggle("is-preview-target", other === tab);
      }
      syncIndicator(tab);
    });

    tab.addEventListener("pointerup", resetPressedState);
    tab.addEventListener("pointerleave", resetPressedState);
    tab.addEventListener("pointercancel", resetPressedState);

    tab.addEventListener("click", () => {
      activate(tab);
    });
  }

  switchEl.addEventListener("keydown", (event) => {
    const currentIndex = tabs.findIndex((tab) => tab.classList.contains("is-active"));
    if (currentIndex < 0) return;

    let nextIndex = currentIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    tabs[nextIndex]?.focus();
    activate(tabs[nextIndex]);
  });

  const syncActiveIndicator = () => syncIndicator(getActiveTab());

  activate(getActiveTab());
  syncActiveIndicator();
  switchEl.classList.add("is-ready");

  root.addEventListener("ba-toggle:resync", () => {
    switchEl.classList.remove("is-ready");
    syncActiveIndicator();
    requestAnimationFrame(() => {
      syncActiveIndicator();
      switchEl.classList.add("is-ready");
    });
  });

  if (document.fonts?.ready) {
    document.fonts.ready.then(syncActiveIndicator);
  }

  window.addEventListener("resize", syncActiveIndicator);
}

for (const baToggleEl of document.querySelectorAll(".js-ba-toggle")) {
  if (baToggleEl instanceof HTMLElement) initBaToggle(baToggleEl);
}

const COPY_RESET_MS = 1000;

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // insecure context / denied permission → fallback below
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("copy failed");
}

function initCopyButton(button) {
  const defaultLabel = button.getAttribute("aria-label") || "Скопировать";
  let resetTimerId = null;

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const text = button.getAttribute("data-copy")?.trim();
    if (!text) return;

    try {
      await copyTextToClipboard(text);
    } catch {
      return;
    }

    button.classList.add("is-copied");
    button.setAttribute("aria-label", "Скопировано");

    window.clearTimeout(resetTimerId);
    resetTimerId = window.setTimeout(() => {
      button.classList.remove("is-copied");
      button.setAttribute("aria-label", defaultLabel);
    }, COPY_RESET_MS);
  });
}

for (const copyButton of document.querySelectorAll(".js-copy")) {
  if (copyButton instanceof HTMLButtonElement) initCopyButton(copyButton);
}

// Sticky-панели + scroll restoration = центр «уезжает в потолок» и ползёт выше с каждым refresh
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mobileMenuEl?.classList.contains("is-open")) {
    setMenuOpen(false);
  }
});

window.addEventListener("resize", () => {
  if (!mobileMenuEl) return;
  if (!isMobileViewport()) {
    setMenuOpen(false);
  }
  syncMobileStickyTopbar();
});

window.addEventListener("pageshow", () => {
  setMenuOpen(false);
  syncMobileStickyTopbar();
});
