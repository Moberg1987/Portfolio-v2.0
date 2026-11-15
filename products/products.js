const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');

const compactHeader = matchMedia('(max-width: 980px)');
const header = document.querySelector('.header');
const menu = document.querySelector('.menu');
const navLinks = [...header.querySelectorAll('nav a')];
const sections = navLinks.map(link => document.querySelector(link.hash));

function setMenu(isOpen, returnFocus = false) {
  menu.setAttribute('aria-expanded', String(isOpen));
  menu.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
  document.body.classList.toggle('menu-open', isOpen);
  document.querySelector('main').inert = isOpen;
  if (returnFocus) menu.focus();
}
menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') === 'false'));
compactHeader.addEventListener('change', () => setMenu(false));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') setMenu(false, true);
});
navLinks.forEach((link, index) => link.addEventListener('click', () => {
  if (menu.getAttribute('aria-expanded') !== 'true') return;
  setMenu(false);
  sections[index].tabIndex = -1;
  sections[index].focus({ preventScroll: true });
}));

const sorter = document.querySelector('[data-sorter]');
const pin = sorter.querySelector('.sorter-pin');
const sorterImages = [...sorter.querySelectorAll('.sorter-media > img')];
const sorterSteps = [...sorter.querySelectorAll('.sorter-step')];
const sorterButtons = sorterSteps.map(step => step.querySelector('button'));
const sorterPanels = sorterSteps.map(step => step.querySelector('.sorter-panel'));
const sorterThumbnail = sorter.querySelector('.sorter-thumbnail');
const timerWrap = document.querySelector('.timers-wrap');

let sorterIndex = -1;
let compactSorterIndex = 0;
let sorterTarget = null;
let scrollDistance = 0;
let queued = false;

function selectSorterStep(index) {
  if (index === sorterIndex) return;
  sorterIndex = index;
  sorterSteps.forEach((step, position) => {
    const active = position === index;
    step.toggleAttribute('data-active', active);
    sorterButtons[position].setAttribute('aria-expanded', String(active));
    sorterPanels[position].inert = !active;
    sorterImages[position].hidden = !active;
  });
  sorterThumbnail.hidden = index !== 1;
}

function updateSorter() {
  if (compactHeader.matches) {
    sorter.removeAttribute('data-pinned');
    selectSorterStep(compactSorterIndex);
    return;
  }
  const top = parseFloat(getComputedStyle(pin).top);
  const scrolled = Math.max(0, top - sorter.getBoundingClientRect().top);
  const progress = Math.min(1, scrolled / scrollDistance);
  const stage = progress * sorterSteps.length;
  const scrollIndex = Math.min(sorterSteps.length - 1, Math.floor(stage));
  const index = sorterTarget ?? scrollIndex;
  sorter.toggleAttribute('data-pinned', scrolled > 0 && progress < 1);
  selectSorterStep(index);
  sorterSteps[index].style.setProperty('--progress', Math.max(0, Math.min(1, stage - index)) * 100 + '%');
}

function updateScroll() {
  queued = false;
  const headerHeight = header.offsetHeight;

  let current = 0;
  sections.forEach((section, index) => {
    if (section.getBoundingClientRect().top <= headerHeight + 44) current = index;
  });
  navLinks.forEach((link, index) => {
    if (current === index) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });

  updateSorter();

  const timerOffset = Math.min(170, Math.max(-170, (timerWrap.getBoundingClientRect().top - innerHeight / 2) * .2));
  timerWrap.style.setProperty('--parallax', (motionPreference.matches ? 0 : timerOffset) + 'px');
}

function queueScroll() {
  if (!queued) {
    queued = true;
    requestAnimationFrame(updateScroll);
  }
}

function measureSorter() {
  scrollDistance = Math.max(460, innerHeight * 1.3) * 1.25;
  sorter.style.setProperty('--scroll-distance', scrollDistance + 'px');
  sorter.style.setProperty('--pin-height', pin.offsetHeight + 'px');
  queueScroll();
}

new ResizeObserver(measureSorter).observe(pin);
window.addEventListener('resize', measureSorter);
window.addEventListener('scroll', queueScroll, { passive: true });
measureSorter();

sorterButtons.forEach((button, index) => button.addEventListener('click', () => {
  if (compactHeader.matches) {
    compactSorterIndex = index;
    selectSorterStep(index);
    return;
  }
  if (index === sorterIndex) return;
  const pinTop = parseFloat(getComputedStyle(pin).top);
  const trackStart = window.scrollY + sorter.getBoundingClientRect().top - pinTop;
  const stepOffset = (index + .01) * scrollDistance / sorterSteps.length;
  sorterTarget = index;
  window.scrollTo({ top: trackStart + stepOffset, behavior: motionPreference.matches ? 'instant' : 'smooth' });
  if (motionPreference.matches) sorterTarget = null;
  queueScroll();
}));
compactHeader.addEventListener('change', () => {
  sorterTarget = null;
  measureSorter();
});
document.addEventListener('scrollend', () => {
  sorterTarget = null;
  queueScroll();
});

const timers = [...document.querySelectorAll('[data-seconds]')].map(timer => ({
  initial: Number(timer.dataset.seconds),
  initialProgress: Number(timer.dataset.progress),
  clock: timer.querySelector('.timer-disc > span:last-child'),
  disc: timer.querySelector('.timer-disc')
}));
const timerStart = performance.now();
function updateTimers() {
  if (motionPreference.matches) return;
  const elapsed = Math.floor((performance.now() - timerStart) / 1000);
  timers.forEach(({ initial, initialProgress, clock, disc }) => {
    const remaining = initial - elapsed % (initial + 1);
    const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
    const seconds = String(remaining % 60).padStart(2, '0');
    clock.textContent = minutes + ':' + seconds;
    disc.style.setProperty('--timer-fill', initialProgress + (1 - initialProgress) * (1 - remaining / initial));
  });
}
setInterval(updateTimers, 1000);

function cycle(root, render, pauseOnInteraction = true) {
  let visible = false;
  let hovered = false;
  let focused = false;
  let previous = 0;
  let elapsed = 0;
  let frame = 0;

  function tick(now) {
    if (previous) elapsed += now - previous;
    previous = now;
    if (elapsed >= 4000) {
      elapsed %= 4000;
      render(true, elapsed / 40);
    } else {
      render(false, elapsed / 40);
    }
    frame = requestAnimationFrame(tick);
  }

  function refresh() {
    const paused = !visible || document.hidden || hovered || focused || motionPreference.matches;
    if (paused) {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    } else if (!frame) {
      frame = requestAnimationFrame(tick);
    }
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    refresh();
  }, { threshold: .12 });
  observer.observe(root);
  if (pauseOnInteraction) {
    root.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      hovered = true;
      refresh();
    });
    root.addEventListener('pointerleave', () => {
      hovered = false;
      refresh();
    });
    root.addEventListener('focusin', () => {
      focused = true;
      refresh();
    });
    root.addEventListener('focusout', event => {
      focused = root.contains(event.relatedTarget);
      refresh();
    });
  }
  document.addEventListener('visibilitychange', refresh);
  motionPreference.addEventListener('change', refresh);

  return () => {
    elapsed = 0;
    previous = 0;
    render(false, 0);
  };
}

const tabsRoot = document.querySelector('[data-tabs]');
const tabList = tabsRoot.querySelector('.tabs');
const tabs = [...tabList.querySelectorAll('[role="tab"]')];
const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
let tabIndex = 0;

function selectTab(index, scrollIntoView = false) {
  if (index !== tabIndex) panels[index].classList.add('tab-enter');
  tabIndex = index;
  tabs.forEach((tab, position) => {
    const selected = position === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    tab.style.setProperty('--progress', '0%');
    panels[position].hidden = !selected;
  });
  if (scrollIntoView && tabList.scrollWidth > tabList.clientWidth) {
    const tab = tabs[index];
    const offset = tab.getBoundingClientRect().left - tabList.getBoundingClientRect().left;
    const delta = offset < 0 ? offset : Math.max(0, offset + tab.offsetWidth - tabList.clientWidth);
    if (delta) tabList.scrollBy({ left: delta });
  }
}
const resetTabs = cycle(tabsRoot, (advance, progress) => {
  if (advance) {
    const previousTab = tabs[tabIndex];
    selectTab((tabIndex + 1) % tabs.length, true);
    if (document.activeElement === previousTab) tabs[tabIndex].focus({ preventScroll: true });
  }
  tabs[tabIndex].style.setProperty('--progress', progress + '%');
}, false);
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => { selectTab(index); resetTabs(); });
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectTab(next, true);
    resetTabs();
    tabs[next].focus({ preventScroll: true });
  });
});

const gallery = document.querySelector('[data-gallery]');
const slides = [...gallery.querySelectorAll('[data-slide]')];
const points = [...gallery.querySelectorAll('[data-point]')];
const captions = [...gallery.querySelectorAll('.gallery-captions > p')];
let slideIndex = 1;
let galleryTimer;
const slideCount = slides.length;

function selectSlide(index) {
  slideIndex = (index + slideCount) % slideCount;
  slides.forEach((slide, position) => {
    const half = Math.floor(slideCount / 2);
    const offset = (position - slideIndex + slideCount + half) % slideCount - half;
    const previousOffset = Number(slide.dataset.position);
    // Recycle slides between the two clipped ends without crossing the viewport.
    slide.toggleAttribute('data-recycled', Math.abs(previousOffset - offset) > 1);
    slide.style.setProperty('--offset', offset);
    slide.dataset.position = offset;
    slide.inert = Math.abs(offset) > 1;
    slide.hidden = false;
    const active = position === slideIndex;
    points[position].setAttribute('aria-pressed', String(active));
    captions[position].toggleAttribute('data-current', active);
    captions[position].inert = !active;
    captions[position].setAttribute('aria-hidden', String(!active));
  });
}
selectSlide(slideIndex);
const resetGallery = cycle(gallery, advance => {
  if (advance) selectSlide(slideIndex + 1);
});

function moveGalleryTo(index) {
  const forward = (index - slideIndex + slideCount) % slideCount;
  if (motionPreference.matches || forward === 0) {
    selectSlide(index);
    return;
  }
  selectSlide(slideIndex + (forward <= slideCount / 2 ? 1 : -1));
  if (slideIndex !== index) galleryTimer = setTimeout(() => moveGalleryTo(index), 420);
}

[...slides, ...points].forEach(button => {
  button.addEventListener('click', () => {
    clearTimeout(galleryTimer);
    resetGallery();
    moveGalleryTo(Number(button.dataset.slide ?? button.dataset.point));
  });
});

let galleryGesture;
let suppressGalleryClick = false;
gallery.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0) return;
  suppressGalleryClick = false;
  galleryGesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
  resetGallery();
});
gallery.addEventListener('pointerup', event => {
  if (galleryGesture?.id !== event.pointerId) return;
  const dx = event.clientX - galleryGesture.x;
  const dy = event.clientY - galleryGesture.y;
  galleryGesture = undefined;
  if (Math.abs(dx) < 36 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
  suppressGalleryClick = true;
  clearTimeout(galleryTimer);
  resetGallery();
  selectSlide(slideIndex + (dx < 0 ? 1 : -1));
});
gallery.addEventListener('pointercancel', event => {
  if (galleryGesture?.id === event.pointerId) galleryGesture = undefined;
});
gallery.addEventListener('dragstart', event => event.preventDefault());
gallery.addEventListener('click', event => {
  if (!suppressGalleryClick || event.detail === 0) return;
  event.preventDefault();
  event.stopPropagation();
  suppressGalleryClick = false;
}, true);

const video = document.querySelector('.screencast video');
function showVideoFallback() {
  video.hidden = true;
  video.nextElementSibling.hidden = false;
}
video.addEventListener('error', showVideoFallback);
if (video.error) showVideoFallback();

let screencastInView = false;
function resumeScreencast() {
  if (!screencastInView || document.hidden || video.hidden || !video.paused) return;
  video.play().catch(() => {});
}
new IntersectionObserver(([entry]) => {
  screencastInView = entry.isIntersecting;
  resumeScreencast();
}, { threshold: .2 }).observe(video);
window.addEventListener('pageshow', resumeScreencast);
document.addEventListener('visibilitychange', resumeScreencast);

document.querySelectorAll('#pypr .benefits li').forEach(card => {
  card.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const { left, top } = card.getBoundingClientRect();
    card.style.setProperty('--glow-x', (event.clientX - left) + 'px');
    card.style.setProperty('--glow-y', (event.clientY - top) + 'px');
    card.setAttribute('data-glow', '');
  });
  card.addEventListener('pointerleave', () => card.removeAttribute('data-glow'));
});

function splitTiltLetters(heading) {
  heading.setAttribute('aria-label', heading.innerText.replace(/\s+/g, ' ').trim());
  let letterDelay = 0;
  const letterCount = heading.textContent.replace(/\s/g, '').length;
  const letterStagger = Math.min(24, 420 / Math.max(1, letterCount - 1));
  const textNodes = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (textNodes.nextNode()) nodes.push(textNodes.currentNode);
  for (const node of nodes) {
    const parts = node.textContent.split(/(\s+)/).map(part => {
      if (!part.trim()) return part;
      const word = document.createElement('span');
      word.className = 'tilt-word';
      word.setAttribute('aria-hidden', 'true');
      for (const character of part) {
        const letter = document.createElement('span');
        letter.className = 'tilt-letter';
        letter.textContent = character;
        letter.style.setProperty('--letter-delay', letterDelay + 'ms');
        letterDelay += letterStagger;
        word.append(letter);
      }
      return word;
    });
    node.replaceWith(...parts);
  }
}

if (!motionPreference.matches) {
  const sectionTitles = document.querySelectorAll('main h2, main h3:not(.sorter-step h3)');
  sectionTitles.forEach(title => {
    splitTiltLetters(title);
    title.classList.add('tilt-heading');
  });
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px 24px' });
  function observeReveals() {
    document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
  }

  const hero = document.querySelector('.intro');
  const title = hero.querySelector('h1');
  splitTiltLetters(title);
  function revealPage() {
    if (document.documentElement.classList.contains('after-hero')) return;
    document.documentElement.classList.add('after-hero');
    observeReveals();
  }
  if ((location.hash && location.hash !== '#start') || window.scrollY > hero.offsetTop + hero.offsetHeight) {
    revealPage();
  } else {
    title.querySelector(':scope > span:last-child .tilt-letter:last-child')
      .addEventListener('animationend', revealPage, { once: true });
    window.addEventListener('scroll', function revealOnScroll() {
      if (hero.getBoundingClientRect().bottom > header.offsetHeight) return;
      window.removeEventListener('scroll', revealOnScroll);
      revealPage();
    }, { passive: true });
  }
  hero.classList.add('hero-visible');
  const heroStage = hero.querySelector('.phone-hero');
  const introVideo = heroStage.querySelector('[data-intro]');
  const loopVideo = heroStage.querySelector('[data-loop]');

  function playOnFirstFrame(video, show, unavailable) {
    let frameId;
    function onError() {
      if (frameId !== undefined) video.cancelVideoFrameCallback(frameId);
      unavailable?.();
    }
    video.addEventListener('error', onError, { once: true });
    video.muted = true;
    video.play().then(() => {
      if (typeof video.requestVideoFrameCallback === 'function') {
        frameId = video.requestVideoFrameCallback(show);
      } else {
        show();
      }
    }).catch(onError);
  }

  let loopRequested = false;
  function startLoop() {
    if (loopRequested) return;
    loopRequested = true;
    if (!loopVideo.hasAttribute('src')) loopVideo.src = loopVideo.dataset.src;
    playOnFirstFrame(loopVideo, () => {
      loopVideo.dataset.visible = '';
      delete introVideo.dataset.visible;
    });
  }

  introVideo.addEventListener('ended', startLoop, { once: true });
  introVideo.src = introVideo.dataset.src;
  playOnFirstFrame(introVideo, () => {
    introVideo.dataset.visible = '';
    loopVideo.preload = 'auto';
    loopVideo.src = loopVideo.dataset.src;
  }, startLoop);


  const caseVideo = document.querySelector('.phone-case video');
  function showCaseStill() {
    delete caseVideo.dataset.visible;
  }
  caseVideo.addEventListener('error', showCaseStill);
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) {
      caseVideo.pause();
      return;
    }
    if (!caseVideo.hasAttribute('src')) caseVideo.src = caseVideo.dataset.src;
    caseVideo.play().then(() => {
      caseVideo.dataset.visible = '';
    }).catch(showCaseStill);
  }, { threshold: .15 }).observe(caseVideo);

}
