from pathlib import Path
import re, json
root=Path('/mnt/data/tetord30')
html=root/'MiWord/index.html'
js=root/'MiWord/js/app.js'
css=root/'MiWord/css/style.css'

h=html.read_text()
# Titlebar: add Office launcher after brand
needle='''  <header class="titlebar">\n    <div class="titlebar-brand">\n      <span class="brand-mark" aria-hidden="true">M</span>\n      <span class="brand-name">TETORD</span>\n    </div>'''
repl='''  <header class="titlebar">\n    <div class="titlebar-brand">\n      <span class="brand-mark" aria-hidden="true">M</span>\n      <span class="brand-name">TETORD</span>\n      <button id="officeLauncherBtn" class="office-launcher" type="button" title="Abrir TETORD Office">Office</button>\n    </div>'''
if needle not in h: raise SystemExit('titlebar needle missing')
h=h.replace(needle,repl,1)
# Insert Office shell after workspace closing, before image tools
needle='''  </main>\n\n  <div id="imageToolsPanel"'''
repl='''  </main>\n\n  <!-- ============ TETORD OFFICE 3.0 ============ -->\n  <section id="officeShell" class="office-shell" hidden aria-label="TETORD Office">\n    <header class="office-appbar">\n      <div class="office-suite-title"><span class="office-suite-mark">M</span><div><strong>TETORD Office</strong><small>Productividad local</small></div></div>\n      <nav class="office-app-tabs" aria-label="Aplicaciones">\n        <button type="button" data-office-app="home" class="is-active">Inicio</button>\n        <button type="button" data-office-app="writer">Writer</button>\n        <button type="button" data-office-app="calc">Calc</button>\n        <button type="button" data-office-app="slides">Slides</button>\n        <button type="button" data-office-app="messenger">Messenger</button>\n      </nav>\n      <button id="officeBackToWriterBtn" class="office-back-btn" type="button">Volver a Writer</button>\n    </header>\n\n    <div id="officeHome" class="office-view office-home-view">\n      <div class="office-welcome">\n        <div><p class="office-eyebrow">TETORD OFFICE 3.0</p><h1>Tu espacio de productividad</h1><p>Writer, hojas de cálculo, presentaciones y mensajería local en una misma suite.</p></div>\n        <span class="office-local-badge">LOCAL · SIN SERVIDOR</span>\n      </div>\n      <div class="office-app-grid">\n        <button class="office-app-card" data-office-app="writer" type="button"><span class="office-app-icon">W</span><strong>Writer</strong><small>Documentos, referencias, revisión y correspondencia.</small></button>\n        <button class="office-app-card" data-office-app="calc" type="button"><span class="office-app-icon">C</span><strong>Calc</strong><small>Hojas de cálculo con fórmulas, edición y CSV.</small></button>\n        <button class="office-app-card" data-office-app="slides" type="button"><span class="office-app-icon">S</span><strong>Slides</strong><small>Presentaciones con diapositivas y vista previa.</small></button>\n        <button class="office-app-card" data-office-app="messenger" type="button"><span class="office-app-icon">M</span><strong>Messenger</strong><small>Mensajería local preparada para una futura conexión online.</small></button>\n      </div>\n      <div class="office-notice"><strong>Arquitectura 3.0:</strong> las aplicaciones comparten la misma identidad y almacenamiento local. Messenger funciona en modo local; el backend online queda preparado para una fase posterior.</div>\n    </div>\n\n    <div id="officeCalc" class="office-view office-calc-view" hidden>\n      <div class="office-subbar"><div><strong>Calc</strong><span id="calcStatus">Hoja 1 · 12 × 20</span></div><div class="office-subactions"><button id="calcNewBtn" type="button">Nueva</button><button id="calcAddRowBtn" type="button">+ Fila</button><button id="calcAddColBtn" type="button">+ Columna</button><button id="calcImportBtn" type="button">Importar CSV</button><button id="calcExportBtn" type="button">Exportar CSV</button><input id="calcImportInput" type="file" accept=".csv,.tsv,.txt" hidden></div></div>\n      <div class="calc-formula-bar"><span class="calc-name-box" id="calcNameBox">A1</span><span class="calc-fx">fx</span><input id="calcFormulaInput" type="text" placeholder="Escribe un valor o fórmula, por ejemplo =SUM(A1:A3)" autocomplete="off"></div>\n      <div class="calc-grid-wrap"><table id="calcGrid" class="calc-grid" aria-label="Hoja de cálculo"></table></div>\n    </div>\n\n    <div id="officeSlides" class="office-view office-slides-view" hidden>\n      <div class="office-subbar"><div><strong>Slides</strong><span id="slidesStatus">Presentación · 1 diapositiva</span></div><div class="office-subactions"><button id="slideNewBtn" type="button">Nueva</button><button id="slideAddBtn" type="button">+ Diapositiva</button><button id="slideDeleteBtn" type="button">Eliminar</button><button id="slidePresentBtn" type="button" class="primary-action">Presentar</button></div></div>\n      <div class="slides-workspace"><aside id="slideThumbs" class="slide-thumbs"></aside><section class="slide-editor-area"><div id="slideCanvas" class="slide-canvas" contenteditable="false"><input id="slideTitleInput" class="slide-title-input" value="Título de la presentación"><textarea id="slideBodyInput" class="slide-body-input" placeholder="Escribe el contenido de esta diapositiva..."></textarea></div><p class="slide-hint">Los cambios se guardan automáticamente en este dispositivo.</p></section></div>\n      <div id="slidePresentOverlay" class="slide-present-overlay" hidden><div id="slidePresentCard" class="slide-present-card"></div><button id="slidePresentCloseBtn" type="button">Salir de presentación</button></div>\n    </div>\n\n    <div id="officeMessenger" class="office-view office-messenger-view" hidden>\n      <div class="office-subbar"><div><strong>Messenger</strong><span>Modo local · preparado para backend</span></div><div class="office-subactions"><button id="messengerNewChatBtn" type="button">Nueva conversación</button></div></div>\n      <div class="messenger-layout"><aside id="messengerChats" class="messenger-chats"></aside><section class="messenger-conversation"><div id="messengerConversationHead" class="messenger-conversation-head"></div><div id="messengerMessages" class="messenger-messages"></div><form id="messengerComposer" class="messenger-composer"><input id="messengerInput" type="text" placeholder="Escribe un mensaje…" autocomplete="off"><button type="submit" class="primary-action">Enviar</button></form></section></div>\n    </div>\n  </section>\n\n  <div id="imageToolsPanel"'''
if needle not in h: raise SystemExit('workspace needle missing')
h=h.replace(needle,repl,1)
# Update start footer version
h=h.replace('TETORD 2.8.0','TETORD 3.0.0',1)
html.write_text(h)

# JS: inject OfficeManager before App
s=js.read_text()
marker='''  const App = {\n'''
if marker not in s: raise SystemExit('App marker missing')
module=r'''  const OfficeManager = {
    active: "home",
    calc: { rows: 20, cols: 12, data: {}, selected: "A1" },
    slides: { items: [], selected: 0 },
    messenger: { chats: [], selected: 0 },
    init() {
      this.shell = document.getElementById("officeShell");
      if (!this.shell) return;
      this.bindNavigation();
      this.initCalc();
      this.initSlides();
      this.initMessenger();
      document.getElementById("officeLauncherBtn")?.addEventListener("click", () => this.open("home"));
      document.getElementById("officeBackToWriterBtn")?.addEventListener("click", () => this.close());
    },
    bindNavigation() {
      this.shell.querySelectorAll("[data-office-app]").forEach(btn => btn.addEventListener("click", () => this.open(btn.dataset.officeApp)));
    },
    open(app = "home") {
      if (!this.shell) return;
      this.active = app;
      document.body.classList.add("office-mode");
      this.shell.hidden = false;
      this.shell.querySelectorAll("[data-office-app]").forEach(b => b.classList.toggle("is-active", b.dataset.officeApp === app));
      ["officeHome","officeCalc","officeSlides","officeMessenger"].forEach(id => { const el=document.getElementById(id); if(el) el.hidden = id !== ({home:"officeHome",calc:"officeCalc",slides:"officeSlides",messenger:"officeMessenger",writer:"officeHome"}[app] || "officeHome"); });
      if (app === "writer") { this.close(); return; }
      if (app === "calc") this.renderCalc();
      if (app === "slides") this.renderSlides();
      if (app === "messenger") this.renderMessenger();
    },
    close() {
      document.body.classList.remove("office-mode");
      if (this.shell) this.shell.hidden = true;
      this.active = "writer";
      this.shell?.querySelectorAll("[data-office-app]").forEach(b => b.classList.toggle("is-active", b.dataset.officeApp === "writer"));
      Editor.focus();
    },
    storage(key, fallback) { try { const v=localStorage.getItem("tetord.office."+key); return v ? JSON.parse(v) : fallback; } catch (_) { return fallback; } },
    save(key, value) { try { localStorage.setItem("tetord.office."+key, JSON.stringify(value)); } catch (_) {} },
    // ---------- CALC ----------
    initCalc() {
      const saved=this.storage("calc",null); if(saved && Number(saved.rows)>=1 && Number(saved.cols)>=1){this.calc={...this.calc,...saved};}
      document.getElementById("calcNewBtn")?.addEventListener("click",()=>{this.calc={rows:20,cols:12,data:{},selected:"A1"};this.save("calc",this.calc);this.renderCalc();});
      document.getElementById("calcAddRowBtn")?.addEventListener("click",()=>{this.calc.rows++;this.save("calc",this.calc);this.renderCalc();});
      document.getElementById("calcAddColBtn")?.addEventListener("click",()=>{this.calc.cols++;this.save("calc",this.calc);this.renderCalc();});
      document.getElementById("calcExportBtn")?.addEventListener("click",()=>this.exportCalc());
      document.getElementById("calcImportBtn")?.addEventListener("click",()=>document.getElementById("calcImportInput")?.click());
      document.getElementById("calcImportInput")?.addEventListener("change
