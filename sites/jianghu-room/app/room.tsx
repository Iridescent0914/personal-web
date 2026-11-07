"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AmbientMusic } from "./ambient-music";
import { TeaSteam } from "./tea-steam";

type Section = "projects" | "blog" | "skills" | "about" | "tea";
type CatPose = "sleep" | "stretch";
const catFrames: CatPose[] = ["sleep", "stretch"];
type Hotspot = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  section?: Section;
  easter?: string;
  music?: boolean;
};

// 坐标直接取自 1672 × 941 的「整体画面.png」，单位为画面百分比。
const hotspots: Hotspot[] = [
  { id: "screen", label: "走进项目作品集", x: 35.4, y: 35.0, w: 20.1, h: 25.2, section: "projects" },
  { id: "book", label: "翻开博客文章", x: 29.2, y: 72.0, w: 31.4, h: 21.8, section: "blog" },
  { id: "sword", label: "拔剑查看武学谱", x: 94.0, y: 1.5, w: 5.8, h: 55.4, section: "skills" },
  { id: "windchime", label: "播放背景音乐", x: 61.8, y: 3.8, w: 6.2, h: 16.8, music: true },
  { id: "avatar", label: "与古风小人聊聊", x: 54.8, y: 43.2, w: 8.3, h: 19.3, section: "about" },
  { id: "teapot", label: "以茶会友：留言与联系", x: 2.0, y: 65.4, w: 20.4, h: 27.5, section: "tea" },
  { id: "cat", label: "摸摸睡猫", x: 68.0, y: 45.3, w: 12.0, h: 11.4, easter: "猫咪翻了个身，继续做它的江湖大梦。" },
  { id: "pastry", label: "尝一口糕点", x: 13.0, y: 87.0, w: 17.5, h: 12.2, easter: "桂花糕，先替你尝一口。" },
];

const navigation: { key: Section; title: string; hint: string; mark: string }[] = [
  { key: "projects", title: "项目", hint: "电脑屏幕", mark: "01" },
  { key: "blog", title: "博客", hint: "摊开的书", mark: "02" },
  { key: "skills", title: "武学谱", hint: "墙上佩剑", mark: "03" },
  { key: "about", title: "关于我", hint: "古风小人", mark: "04" },
  { key: "tea", title: "以茶会友", hint: "桌上茶壶", mark: "05" },
];

const questions = [
  { question: "你是谁？", answer: "这里会放你的自我介绍。资料补齐后，这段话可以写得像一次真正的初见。" },
  { question: "你在做什么？", answer: "这里会介绍你目前关注的方向，以及正在做的事。" },
  { question: "为什么有这间书房？", answer: "这里会讲这间书房、你的作品和江湖意象之间的故事。" },
];

function sectionFromHash(): Section | null {
  if (typeof window === "undefined") return null;
  const key = window.location.hash.replace(/^#/, "");
  return navigation.find((item) => item.key === key)?.key ?? null;
}

function MessageForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const requestId = useRef<string | null>(null);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!requestId.current) requestId.current = crypto.randomUUID();
    setState("sending");
    setFeedback("正在送出留言……");
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestId.current,
          name: data.get("name"),
          contact: data.get("contact"),
          body: data.get("body"),
          website: data.get("website"),
        }),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "留言未送达，请稍后再试。");
      setState("sent");
      setFeedback("茶已奉上，留言已经送达。谢谢你来坐坐。 ");
      form.reset();
      requestId.current = null;
    } catch (error) {
      setState("error");
      setFeedback(error instanceof Error ? error.message : "留言未送达，请稍后再试。");
    }
  }

  return (
    <form className="message-form" onSubmit={send}>
      <div className="form-row">
        <label>怎么称呼你？<input name="name" maxLength={40} placeholder="可不填" /></label>
        <label>回信方式<input name="contact" maxLength={120} placeholder="邮箱或其他联系方式，可不填" /></label>
      </div>
      <label>留一封小笺<textarea name="body" minLength={3} maxLength={1000} required rows={5} placeholder="想说的话，写在这里……" /></label>
      <label className="honeypot" aria-hidden="true">网站地址<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <div className="form-footer">
        <span>留言会私下保存，不会直接公开显示。</span>
        <button type="submit" disabled={state === "sending"}>{state === "sending" ? "送出中…" : "送出留言"}</button>
      </div>
      <p className={`form-feedback ${state}`} role="status" aria-live="polite">{feedback}</p>
    </form>
  );
}

function SectionContent({ section }: { section: Section }) {
  const [question, setQuestion] = useState<number | null>(null);

  if (section === "projects") return (
    <div className="content-body">
      <p className="eyebrow">电脑屏幕 · 项目作品集</p>
      <h2 id="section-title">所做之事</h2>
      <p className="intro">从这一方屏幕，走进你的作品。下面的卡片是内容位置，等你提供真实项目后替换。</p>
      <div className="card-grid">
        {["项目一", "项目二", "项目三"].map((title, index) => <article className="paper-card" key={title}>
          <span className="card-number">0{index + 1} / 待填写</span>
          <h3>{title} · 待填写</h3>
          <p>项目名称、你负责的部分、实现方式与成果将在这里呈现。</p>
          <span className="card-tail">作品资料待补充</span>
        </article>)}
      </div>
    </div>
  );

  if (section === "blog") return (
    <div className="content-body reading-body">
      <p className="eyebrow">摊开的书 · 博客文章</p>
      <h2 id="section-title">案上手记</h2>
      <p className="intro">留一页给技术，留一页给日常。文章标题和正文将在这里替换为你的真实内容。</p>
      <div className="article-list">
        <article><span>卷一 · 待写</span><h3>第一篇文章的标题</h3><p>这里可以放文章摘要、写作日期和主题标签。</p></article>
        <article><span>卷二 · 待写</span><h3>第二篇文章的标题</h3><p>长文阅读会使用清晰的正文排版，而不是把文字画进图片。</p></article>
      </div>
    </div>
  );

  if (section === "skills") return (
    <div className="content-body">
      <p className="eyebrow">墙上佩剑 · 技术栈与技能树</p>
      <h2 id="section-title">武学谱</h2>
      <p className="intro">以招式为章节，把你真正掌握的技术写清楚。具体技能与熟练程度等你确认后填写。</p>
      <div className="skill-list">
        <article><b>第一式</b><div><h3>技术方向 · 待填写</h3><p>代表技术、实践项目与掌握程度。</p></div></article>
        <article><b>第二式</b><div><h3>技术方向 · 待填写</h3><p>代表技术、实践项目与掌握程度。</p></div></article>
        <article><b>第三式</b><div><h3>技术方向 · 待填写</h3><p>代表技术、实践项目与掌握程度。</p></div></article>
      </div>
    </div>
  );

  if (section === "about") return (
    <div className="content-body">
      <p className="eyebrow">古风小人 · 固定问答</p>
      <h2 id="section-title">来，聊几句</h2>
      <p className="intro">选一个问题，小主人会答。当前答案标明了待补内容，不会替你编造个人经历。</p>
      <div className="dialogue">
        <div className="dialogue-speaker">屋主 <span>✦</span></div>
        <p>{question === null ? "山雨未歇，先坐下聊聊吧。" : questions[question].answer}</p>
      </div>
      <div className="question-list">{questions.map((item, index) => <button key={item.question} onClick={() => setQuestion(index)} className={question === index ? "selected" : ""}>{item.question}<span>↗</span></button>)}</div>
    </div>
  );

  return (
    <div className="content-body tea-body">
      <p className="eyebrow">桌上茶壶 · 留言与联系</p>
      <h2 id="section-title">以茶会友</h2>
      <p className="intro">旅人来访，留一句话。留言会保存到这间书房的信箱，具体联系方式等你提供后展示。</p>
      <div className="contact-note"><span>✦</span><div><strong>联系渠道</strong><p>邮箱、社交主页等资料待补充。现在可以先通过下方表单留言。</p></div></div>
      <MessageForm />
    </div>
  );
}

export default function Room() {
  const [section, setSection] = useState<Section | null>(null);
  const [intro, setIntro] = useState<Section | null>(null);
  const [toast, setToast] = useState("");
  const [musicOn, setMusicOn] = useState(false);
  const [catPose, setCatPose] = useState<CatPose>("sleep");
  const [exteriorReady, setExteriorReady] = useState(false);
  const [interiorReady, setInteriorReady] = useState(false);
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
  const [pastryBitten, setPastryBitten] = useState(false);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const musicRef = useRef<AmbientMusic | null>(null);
  const musicWantedRef = useRef(false);
  const windchimeRef = useRef<HTMLDivElement | null>(null);
  const introTimer = useRef<number | null>(null);
  const introTarget = useRef<Section | null>(null);
  const catPreloadRef = useRef<Promise<void> | null>(null);
  const catPendingRef = useRef(false);
  const sceneArtRef = useRef<HTMLDivElement | null>(null);
  const sceneViewportRef = useRef<HTMLDivElement | null>(null);

  const preloadCatFrames = useCallback(() => {
    if (!catPreloadRef.current) {
      catPreloadRef.current = Promise.all(catFrames.slice(1).map((pose) => {
        const image = new Image();
        image.src = `/art/cat-${pose}.png`;
        return image.decode();
      })).then(() => undefined).catch((error) => {
        catPreloadRef.current = null;
        throw error;
      });
    }
    return catPreloadRef.current;
  }, []);

  useEffect(() => {
    if (exteriorReady && interiorReady) void preloadCatFrames().catch(() => {});
  }, [exteriorReady, interiorReady, preloadCatFrames]);

  useEffect(() => {
    const viewport = sceneViewportRef.current;
    if (!viewport || !window.matchMedia("(max-width: 700px)").matches) return;
    const frame = window.requestAnimationFrame(() => {
      viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const onVisibility = () => { void musicRef.current?.setHidden(document.hidden); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (introTimer.current) window.clearTimeout(introTimer.current);
      musicRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!intro) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelIntro();
      else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        completeIntro();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [intro]);

  useEffect(() => {
    const sync = () => setSection(sectionFromHash());
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, []);

  useEffect(() => {
    if (!section) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { closeSection(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const elements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]')).filter((element) => element.offsetParent !== null);
      if (!elements.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [section]);

  function openSection(next: Section) {
    lastFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setHoveredHotspot(null);
    resetRoomMotion();
    if (introTimer.current) window.clearTimeout(introTimer.current);
    introTarget.current = next;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      completeIntro();
      return;
    }
    setIntro(next);
    introTimer.current = window.setTimeout(completeIntro, 850);
  }

  function resetRoomMotion() {
    sceneArtRef.current?.style.setProperty("--room-x", "0px");
    sceneArtRef.current?.style.setProperty("--room-y", "0px");
  }

  function moveRoomWithPointer(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    if (intro || section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    sceneArtRef.current?.style.setProperty("--room-x", `${(-x * 3).toFixed(2)}px`);
    sceneArtRef.current?.style.setProperty("--room-y", `${(-y * 2.4).toFixed(2)}px`);
  }

  function completeIntro() {
    const next = introTarget.current;
    if (!next) return;
    if (introTimer.current) window.clearTimeout(introTimer.current);
    introTimer.current = null;
    introTarget.current = null;
    setIntro(null);
    window.history.pushState({ roomOverlay: true }, "", `#${next}`);
    setSection(next);
  }

  function cancelIntro() {
    if (introTimer.current) window.clearTimeout(introTimer.current);
    introTimer.current = null;
    introTarget.current = null;
    setIntro(null);
    lastFocus.current?.focus();
  }

  function closeSection() {
    if (window.history.state?.roomOverlay) window.history.back();
    else {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setSection(null);
    }
    window.setTimeout(() => lastFocus.current?.focus(), 30);
  }

  function activateHotspot(item: Hotspot) {
    if (item.music) { void toggleMusic(); return; }
    if (item.section) { openSection(item.section); return; }
    if (item.id === "cat") {
      if (catPose === "stretch") {
        setCatPose("sleep");
        setToast("猫咪又趴下来歇息了。");
        window.setTimeout(() => setToast(""), 2200);
        return;
      }
      if (catPendingRef.current) return;
      catPendingRef.current = true;
      void preloadCatFrames().then(() => {
        catPendingRef.current = false;
        setCatPose("stretch");
        setToast("猫咪伸了个懒腰。再摸一次，它会趴下来。");
        window.setTimeout(() => setToast(""), 2600);
      }).catch(() => {
        catPendingRef.current = false;
        setToast("猫咪暂时睡得太沉，请稍后再试。");
      });
      return;
    }
    if (item.id === "pastry") {
      setPastryBitten((current) => !current);
      setToast(pastryBitten ? "又添了一块完整的桂花糕。" : "桂花糕，先替你尝一口。");
      window.setTimeout(() => setToast(""), 2200);
      return;
    }
    setToast(item.easter || "");
    window.setTimeout(() => setToast(""), 2800);
  }

  async function toggleMusic() {
    const next = !musicWantedRef.current;
    musicWantedRef.current = next;
    setMusicOn(next);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      windchimeRef.current?.animate([
        { transform: "rotate(0deg)" }, { transform: "rotate(-7deg)" },
        { transform: "rotate(6deg)" }, { transform: "rotate(-4deg)" },
        { transform: "rotate(2deg)" }, { transform: "rotate(0deg)" },
      ], { duration: 640, easing: "ease-in-out" });
    }
    if (!musicRef.current) musicRef.current = new AmbientMusic();
    try {
      if (next) await musicRef.current.start();
      else musicRef.current.stop();
    } catch {
      musicWantedRef.current = false;
      setMusicOn(false);
      setToast("当前浏览器无法播放音乐。");
      window.setTimeout(() => setToast(""), 2800);
    }
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-seal">山</span><div><strong>山窗夜话</strong><small>一室江湖 · 互动原型</small></div></div>
        <nav className="top-nav" aria-label="主要内容">{navigation.map((item) => <button key={item.key} onClick={() => openSection(item.key)}>{item.title}</button>)}</nav>
        <span className="top-hint">点击房间里的物件，随意走走 <span>✦</span></span>
        <button className="mobile-music" type="button" onClick={() => void toggleMusic()} aria-label={musicOn ? "关闭背景音乐" : "播放背景音乐"} aria-pressed={musicOn}>♫</button>
      </header>

      <section className="scene-area" aria-label="可探索的江湖书房">
        <div ref={sceneViewportRef} className={`scene-viewport ${intro || section ? "camera-active" : ""}`}>
          <div ref={sceneArtRef} onPointerMove={moveRoomWithPointer} onPointerLeave={resetRoomMotion} className={`scene-art ${intro ? `intro-${intro}` : section ? `zoom-${section}` : ""}`} data-hovered={hoveredHotspot ?? undefined} data-cat-pose={catPose}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="scene-image" src="/art/room-exterior.webp" alt="雨夜里的温暖书房：书架、电脑、摊开的书、茶壶、人物、睡猫和墙上佩剑" draggable={false} onLoad={() => setExteriorReady(true)} />
            <div className="room-depth room-depth-image" aria-hidden="true"><img src="/art/room-interior.webp" alt="" draggable={false} onLoad={() => setInteriorReady(true)} /></div>
            <div className="window-rain" aria-hidden="true" />
            <img className="scene-sprite scene-bamboo" src="/art/bamboo.png" alt="" aria-hidden="true" draggable={false} />
            <div className="room-depth room-depth-objects">
            <div className="lantern-glow" aria-hidden="true" />
            <TeaSteam />
            <div className="tea-aura" aria-hidden="true" />
            <img className="scene-sprite scene-sword" src="/art/sword.png" alt="" aria-hidden="true" draggable={false} />
            <img className="scene-sprite scene-book" src="/art/book.png" alt="" aria-hidden="true" draggable={false} />
            {catFrames.filter((pose) => pose === "sleep" || (exteriorReady && interiorReady) || pose === catPose).map((pose) => <img
              key={pose}
              className={`scene-sprite scene-cat-frame ${pose === "sleep" ? "scene-cat-sleep" : ""} ${catPose === pose ? "is-visible" : ""}`}
              src={`/art/cat${pose === "sleep" ? "" : `-${pose}`}.png`}
              alt="" aria-hidden="true" draggable={false} decoding="sync"
            />)}
            <img className={`scene-sprite scene-pastry-bite ${pastryBitten ? "is-visible" : ""}`} src="/art/pastry-bite.png" alt="" aria-hidden="true" draggable={false} />
            <img className="scene-sprite scene-blink" src="/art/avatar-blink.png" alt="" aria-hidden="true" draggable={false} />
            <div className="windchime-sprite" ref={windchimeRef} aria-hidden="true"><img src="/art/chime.png" alt="" draggable={false} /></div>
            {hotspots.map((item) => <button
              key={item.id}
              type="button"
              className={`hotspot hotspot-${item.id} ${item.easter ? "hotspot-secret" : ""}`}
              style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, height: `${item.h}%` }}
              aria-label={item.music && musicOn ? "关闭背景音乐" : item.label}
              aria-pressed={item.music ? musicOn : item.id === "pastry" ? pastryBitten : item.id === "cat" ? catPose === "stretch" : undefined}
              onPointerEnter={(event) => { if (event.pointerType === "mouse" || event.pointerType === "pen") setHoveredHotspot(item.id); }}
              onPointerLeave={() => setHoveredHotspot(null)}
              onFocus={() => setHoveredHotspot(item.id)}
              onBlur={() => setHoveredHotspot(null)}
              onClick={() => activateHotspot(item)}
            ><span className="hotspot-label">{item.music && musicOn ? "关闭背景音乐" : item.label}</span></button>)}
            </div>
          </div>
        </div>
        {intro && <button className="transition-skip" type="button" onClick={completeIntro}>跳过动画，进入{navigation.find((item) => item.key === intro)?.title}</button>}
        <div className="scene-caption"><span>壹 · 山窗夜话</span><span className="desktop-caption">{musicOn ? "风铃乐声 · 播放中" : "轻触风铃，可听夜曲"}　·　触碰物件进入章节</span><span className="mobile-swipe-hint">← 左右滑动探索小屋 →</span></div>
      </section>

      <nav className="mobile-nav" aria-label="手机端主要内容">{navigation.map((item) => <button key={item.key} onClick={() => openSection(item.key)}><span>{item.mark}</span>{item.title}</button>)}</nav>
      <p className="scene-toast" role="status" aria-live="polite">{toast}</p>

      {section && <div className="overlay-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSection(); }}>
        <section className="content-panel" role="dialog" aria-modal="true" aria-labelledby="section-title" ref={dialogRef}>
          <div className="panel-topline"><span>山窗夜话 / {navigation.find((item) => item.key === section)?.title}</span><button ref={closeRef} onClick={closeSection} aria-label="关闭并返回房间">× <span>返回房间</span></button></div>
          <SectionContent key={section} section={section} />
          <div className="panel-foot">山雨未停，随时回来坐坐。</div>
        </section>
      </div>}
    </main>
  );
}
