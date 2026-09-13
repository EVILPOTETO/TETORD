/**
 * MI WORD — Fase 3: Documentos.
 * Vanilla JS, módulos IIFE. Documento enriquecido en memoria + persistencia local.
 */
(function () {
  "use strict";

  const STORAGE_KEY = "miword.documents.v1";
  const RECENTS_KEY = "miword.recents.v1";
  const VIEW_KEY = "miword.view.v1";
  const SYSTEM_KEY = "miword.system.v1";
  const RECOVERY_KEY = "miword.recovery.v1";
  const StorageUtil = {
    get(key, fallback = null) {
      try { const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); } catch (_) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; }
    },
    remove(key) { try { localStorage.removeItem(key); return true; } catch (_) { return false; } }
  };

  const DocumentModel = {
    name: "Documento sin título",
    content: "<p><br></p>",
    isSaved: true,
    lastModified: new Date(),
    currentId: null,
    sourceType: "local",
    savedContent: "<p><br></p>",
    headerText: "",
    footerText: "",
    showPageNumber: false,
    differentFirstPage: false,
    setContent(html, markDirty = true) {
      this.content = html || "<p><br></p>";
      if (markDirty) this.markDirty();
      else document.dispatchEvent(new CustomEvent("docmodel:change"));
    },
    setName(name, markDirty = true) {
      const clean = String(name || "").replace(/[\r\n]+/g, " ").trim();
      const next = clean || "Documento sin título";
      if (next === this.name) return;
      this.name = next;
      if (markDirty) this.markDirty();
    },
    markDirty() {
      this.isSaved = false;
      this.lastModified = new Date();
      document.dispatchEvent(new CustomEvent("docmodel:change"));
    },
    markSaved() {
      this.isSaved = true;
      this.savedContent = this.content;
      this.lastModified = new Date();
      document.dispatchEvent(new CustomEvent("docmodel:change"));
    },
    replaceDocument({ id = null, name, content, saved = true, sourceType = "local", headerText = "", footerText = "", showPageNumber = false, differentFirstPage = false }) {
      this.currentId = id;
      this.name = String(name || "Documento sin título").trim() || "Documento sin título";
      this.content = content || "<p><br></p>";
      this.headerText = String(headerText || "");
      this.footerText = String(footerText || "");
      this.showPageNumber = !!showPageNumber;
      this.differentFirstPage = !!differentFirstPage;
      this.savedContent = this.content;
      this.isSaved = saved;
      this.sourceType = sourceType;
      this.lastModified = new Date();
      document.dispatchEvent(new CustomEvent("docmodel:change"));
    }
  };

  const Editor = {
    el: null,
    savedRange: null,
    init(editorEl) {
      this.el = editorEl;
      if (!this.el.innerHTML.trim()) this.el.innerHTML = "<p><br></p>";
      this.el.addEventListener("input", () => this.handleInput());
      ["keyup", "mouseup", "focus"].forEach((event) => this.el.addEventListener(event, () => {
        this.saveSelection();
        Toolbar.updateState();
      }));
      this.el.addEventListener("keydown", (e) => this.handleKeydown(e));
      document.addEventListener("selectionchange", () => {
        if (this.selectionInsideEditor()) {
          this.saveSelection();
          Toolbar.updateState();
        }
      });
    },
    load(html, selection = null) {
      this.el.innerHTML = html || "<p><br></p>";
      this.ensureParagraph();
      this.savedRange = null;
      WordCounter.update(this.getPlainText());
      if (selection) requestAnimationFrame(() => this.restoreSerializedSelection(selection));
    },
    handleInput() {
      this.ensureParagraph();
      DocumentModel.setContent(this.el.innerHTML);
      WordCounter.update(this.getPlainText());
      this.saveSelection();
      Toolbar.updateState();
      History.scheduleInput();
    },
    handleKeydown(e) {
      const modifier = e.ctrlKey || e.metaKey;
      if (!modifier) return;
      const key = e.key.toLowerCase();
      if (["b", "i", "u"].includes(key)) {
        e.preventDefault();
        Toolbar.execute({ b: "bold", i: "italic", u: "underline" }[key]);
      }
    },
    selectionInsideEditor() {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return false;
      const node = sel.anchorNode;
      return !!node && (node === this.el || this.el.contains(node));
    },
    saveSelection() {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || !this.selectionInsideEditor()) return;
      this.savedRange = sel.getRangeAt(0).cloneRange();
    },
    restoreSelection() {
      if (!this.savedRange) return false;
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(this.savedRange);
      return true;
    },
    getNodePath(node) {
      const path = [];
      let current = node;
      while (current && current !== this.el) {
        const parent = current.parentNode;
        if (!parent) break;
        path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
        current = parent;
      }
      return path;
    },
    getNodeByPath(path) {
      let current = this.el;
      for (const index of (path || [])) {
        if (!current?.childNodes?.[index]) return null;
        current = current.childNodes[index];
      }
      return current;
    },
    serializeSelection() {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || !this.selectionInsideEditor()) return null;
      const range = sel.getRangeAt(0);
      return {
        startPath: this.getNodePath(range.startContainer), startOffset: range.startOffset,
        endPath: this.getNodePath(range.endContainer), endOffset: range.endOffset,
        collapsed: range.collapsed
      };
    },
    restoreSerializedSelection(data) {
      try {
        const start = this.getNodeByPath(data.startPath);
        const end = this.getNodeByPath(data.endPath);
        if (!start || !end) return false;
        const range = document.createRange();
        range.setStart(start, Math.min(data.startOffset, start.nodeType === Node.TEXT_NODE ? start.nodeValue.length : start.childNodes.length));
        range.setEnd(end, Math.min(data.endOffset, end.nodeType === Node.TEXT_NODE ? end.nodeValue.length : end.childNodes.length));
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); this.savedRange = range.cloneRange(); return true;
      } catch (_) { return false; }
    },
    runCommand(command, value = null) {
      this.restoreSelection();
      this.el.focus({ preventScroll: true });
      this.restoreSelection();
      let ok = false;
      try { ok = document.execCommand(command, false, value); } catch (_) {}
      this.saveSelection();
      if (ok) { this.handleInput(); History.commitNow(); }
      return ok;
    },
    applyFontSize(px) {
      this.restoreSelection();
      this.el.focus({ preventScroll: true });
      this.restoreSelection();
      try {
        document.execCommand("fontSize", false, "7");
        this.el.querySelectorAll('font[size="7"]').forEach((font) => {
          const span = document.createElement("span");
          span.style.fontSize = `${Number(px)}px`;
          span.innerHTML = font.innerHTML;
          font.replaceWith(span);
        });
      } catch (_) {}
      this.saveSelection();
      this.handleInput();
      History.commitNow();
    },
    applyFontFamily(font) { this.runCommand("fontName", font); },
    applyColor(color) { this.runCommand("foreColor", color); },
    applyHighlight(color) {
      this.restoreSelection();
      this.el.focus({ preventScroll: true });
      this.restoreSelection();
      let ok = false;
      try {
        ok = document.execCommand("hiliteColor", false, color);
        if (!ok) ok = document.execCommand("backColor", false, color);
      } catch (_) {}
      this.saveSelection();
      if (ok) { this.handleInput(); History.commitNow(); }
    },
    ensureParagraph() {
      if (!this.el.innerHTML.trim()) this.el.innerHTML = "<p><br></p>";
    },
    getPlainText() { return this.el.innerText || ""; },
    sync() { this.handleInput(); },
    focus() { this.el.focus(); }
  };

  const History = {
    undoStack: [],
    redoStack: [],
    maxStates: 80,
    initialized: false,
    restoring: false,
    pendingTimer: null,
    lastHtml: null,
    init() {
      this.reset(Editor.el ? Editor.el.innerHTML : "<p><br></p>");
      document.addEventListener("docmodel:change", () => this.updateButtons());
    },
    snapshot(html = Editor.el?.innerHTML) {
      return { html: html || "<p><br></p>", selection: Editor.serializeSelection() };
    },
    reset(html) {
      clearTimeout(this.pendingTimer);
      this.undoStack = [this.snapshot(html)];
      this.redoStack = [];
      this.lastHtml = html || "<p><br></p>";
      this.initialized = true;
      this.updateButtons();
    },
    scheduleInput() {
      if (!this.initialized || this.restoring) return;
      clearTimeout(this.pendingTimer);
      this.pendingTimer = setTimeout(() => this.commit("input"), 450);
    },
    commit(reason = "command") {
      if (!this.initialized || this.restoring || !Editor.el) return;
      clearTimeout(this.pendingTimer);
      const html = Editor.el.innerHTML || "<p><br></p>";
      if (html === this.lastHtml) return;
      this.undoStack.push(this.snapshot(html));
      if (this.undoStack.length > this.maxStates) this.undoStack.shift();
      this.redoStack = [];
      this.lastHtml = html;
      this.updateSavedState();
      this.updateButtons();
    },
    commitNow() { this.commit("command"); },
    capture(reason = "command") { this.commit(reason); },
    updateSavedState() {
      const html = Editor.el?.innerHTML || "<p><br></p>";
      if (html === DocumentModel.savedContent) {
        DocumentModel.isSaved = true;
        document.dispatchEvent(new CustomEvent("docmodel:change"));
      } else if (DocumentModel.isSaved) {
        DocumentModel.markDirty();
      }
    },
    async undo() {
      clearTimeout(this.pendingTimer);
      if (this.undoStack.length <= 1 || this.restoring) return false;
      const current = this.undoStack.pop();
      this.redoStack.push(current);
      const target = this.undoStack[this.undoStack.length - 1];
      this.restore(target);
      return true;
    },
    async redo() {
      clearTimeout(this.pendingTimer);
      if (!this.redoStack.length || this.restoring) return false;
      const target = this.redoStack.pop();
      this.undoStack.push(target);
      this.restore(target);
      return true;
    },
    restore(state) {
      this.restoring = true;
      Editor.load(state.html, state.selection);
      this.lastHtml = state.html;
      this.updateSavedState();
      this.restoring = false;
      this.updateButtons();
      Toolbar.updateState();
    },
    updateButtons() {
      const undo = document.querySelector('[data-action="undo"]');
      const redo = document.querySelector('[data-action="redo"]');
      if (undo) undo.disabled = this.undoStack.length <= 1;
      if (redo) redo.disabled = this.redoStack.length === 0;
    }
  };

  const WordCounter = {
    wordEl: null, charEl: null,
    init(wordEl, charEl) { this.wordEl = wordEl; this.charEl = charEl; this.update(Editor.getPlainText()); },
    update(text) {
      const normalized = String(text || "").replace(/\u00a0/g, " ");
      const trimmed = normalized.trim();
      const words = trimmed ? trimmed.split(/\s+/).length : 0;
      const chars = normalized.replace(/\n/g, "").length;
      this.wordEl.textContent = `Palabras: ${words}`;
      this.charEl.textContent = `Caracteres: ${chars}`;
    }
  };

  const Toolbar = {
    toolbarEl: null,
    colorPalette: [
      "#111827", "#374151", "#6b7280", "#ffffff",
      "#991b1b", "#dc2626", "#ea580c", "#d97706",
      "#ca8a04", "#2f5d50", "#16a34a", "#0f766e",
      "#0284c7", "#2563eb", "#4f46e5", "#7c3aed",
      "#c026d3", "#db2777", "#92400e"
    ],
    highlightPalette: [
      "#fff2a8", "#ffe082", "#ffd6a5", "#ffcdd2",
      "#f8bbd0", "#e9d5ff", "#c4b5fd", "#bfdbfe",
      "#bae6fd", "#a7f3d0", "#bbf7d0", "#d9f99d",
      "#e5e7eb", "#f3f4f6", "#ffffff"
    ],
    commands: {
      undo: () => History.undo(), redo: () => History.redo(),
      bold: () => Editor.runCommand("bold"), italic: () => Editor.runCommand("italic"), underline: () => Editor.runCommand("underline"), strike: () => Editor.runCommand("strikeThrough"),
      alignLeft: () => Editor.runCommand("justifyLeft"), alignCenter: () => Editor.runCommand("justifyCenter"), alignRight: () => Editor.runCommand("justifyRight"), alignJustify: () => Editor.runCommand("justifyFull"),
      listBullet: () => Editor.runCommand("insertUnorderedList"), listNumber: () => Editor.runCommand("insertOrderedList"),
      fontFamily: () => {}, fontSize: () => {}, textColor: () => {}, highlight: () => {},
      cut: () => Editor.runCommand("cut"), copy: () => Editor.runCommand("copy"), paste: () => Editor.runCommand("paste"), selectAll: () => Editor.runCommand("selectAll")
    },
    init(toolbarEl) {
      this.toolbarEl = toolbarEl;
      toolbarEl.querySelectorAll("[data-action]").forEach((control) => {
        control.addEventListener("mousedown", (e) => { if (control.tagName === "BUTTON") e.preventDefault(); Editor.saveSelection(); });
        control.addEventListener("click", (e) => this.handleClick(e, control));
        if (control.tagName === "SELECT") control.addEventListener("change", () => this.handleSelect(control));
      });
      this.injectPalette("textColor", this.colorPalette, "Color de texto");
      this.injectPalette("highlight", this.highlightPalette, "Resaltado");
      this.enableImplementedControls();
      this.updateState();
    },
    enableImplementedControls() {
      this.toolbarEl.querySelectorAll("[data-action]").forEach((control) => {
        if (this.commands[control.dataset.action]) control.disabled = false;
      });
    },
    handleClick(e, control) {
      const action = control.dataset.action;
      if (control.dataset.palette === "true" || control.tagName === "SELECT") return;
      this.execute(action);
    },
    handleSelect(control) {
      Editor.saveSelection();
      if (control.dataset.action === "fontFamily") Editor.applyFontFamily(control.value);
      if (control.dataset.action === "fontSize") Editor.applyFontSize(control.value);
      this.updateState();
    },
    execute(action) {
      const fn = this.commands[action];
      if (typeof fn !== "function") return;
      const result = fn();
      Toolbar.updateState();
      DocumentManager.updateUndoButtons();
      return result;
    },
    injectPalette(action, colors, label) {
      const button = this.toolbarEl.querySelector(`[data-action="${action}"]`);
      if (!button) return;
      const wrapper = document.createElement("div"); wrapper.className = "color-control"; button.parentNode.insertBefore(wrapper, button); wrapper.appendChild(button);
      // La barra tiene desplazamiento horizontal y recorta cualquier menú que sobresalga
      // verticalmente. La paleta vive en <body> y se posiciona respecto al botón para
      // que siempre quede visible, incluso cuando la barra está cerca del borde inferior.
      const palette = document.createElement("div"); palette.className = "color-palette"; palette.setAttribute("aria-label", label);
      document.body.appendChild(palette);
      colors.forEach((color) => {
        const swatch = document.createElement("button"); swatch.type = "button"; swatch.className = "palette-swatch"; swatch.style.backgroundColor = color; swatch.title = color; swatch.setAttribute("aria-label", `${label} ${color}`);
        swatch.addEventListener("mousedown", (e) => { e.preventDefault(); Editor.saveSelection(); });
        swatch.addEventListener("click", () => { action === "textColor" ? Editor.applyColor(color) : Editor.applyHighlight(color); palette.classList.remove("is-open"); });
        palette.appendChild(swatch);
      });
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        const opening = !palette.classList.contains("is-open");
        document.querySelectorAll(".color-palette.is-open").forEach((other) => other.classList.remove("is-open"));
        if (!opening) { palette.classList.remove("is-open"); return; }
        palette.classList.add("is-open");
        const rect = button.getBoundingClientRect();
        const paletteWidth = palette.offsetWidth;
        const left = Math.max(6, Math.min(rect.left, window.innerWidth - paletteWidth - 6));
        let top = rect.bottom + 5;
        const paletteHeight = palette.offsetHeight;
        if (top + paletteHeight > window.innerHeight - 6) top = Math.max(6, rect.top - paletteHeight - 5);
        palette.style.left = `${left}px`;
        palette.style.top = `${top}px`;
      });
      document.addEventListener("click", () => palette.classList.remove("is-open"));
      window.addEventListener("resize", () => palette.classList.remove("is-open"));
      window.addEventListener("scroll", () => palette.classList.remove("is-open"), true);
    },
    updateState() {
      if (!this.toolbarEl || !Editor.el) return;
      const states = { bold: "bold", italic: "italic", underline: "underline", strike: "strikeThrough", alignLeft: "justifyLeft", alignCenter: "justifyCenter", alignRight: "justifyRight", alignJustify: "justifyFull", listBullet: "insertUnorderedList", listNumber: "insertOrderedList" };
      Object.entries(states).forEach(([action, command]) => {
        const button = this.toolbarEl.querySelector(`[data-action="${action}"]`); if (!button) return;
        let active = false; try { active = document.queryCommandState(command); } catch (_) {}
        button.classList.toggle("is-active", !!active); button.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }
  };

  const RecentDocuments = {
    load() { return StorageUtil.get(RECENTS_KEY, []) || []; },
    save(list) { return StorageUtil.set(RECENTS_KEY, list.slice(0, 10)); },
    add(doc) {
      const list = this.load().filter((item) => item.id !== doc.id);
      list.unshift({ id: doc.id, name: doc.name, updatedAt: new Date().toISOString() });
      return this.save(list);
    }
  };

  const LocalDocuments = {
    load() { return StorageUtil.get(STORAGE_KEY, []) || []; },
    save(list) { return StorageUtil.set(STORAGE_KEY, list); },
    upsert(doc) {
      const list = this.load();
      const index = list.findIndex((item) => item.id === doc.id);
      const record = { id: doc.id, name: doc.name, content: doc.content, headerText: doc.headerText || "", footerText: doc.footerText || "", showPageNumber: !!doc.showPageNumber, differentFirstPage: !!doc.differentFirstPage, updatedAt: new Date().toISOString() };
      if (index >= 0) list[index] = record; else list.push(record);
      const ok = this.save(list);
      if (ok) RecentDocuments.add(record);
      return record;
    },
    get(id) { return this.load().find((item) => item.id === id) || null; },
    remove(id) { return this.save(this.load().filter((item) => item.id !== id)); }
  };

  const DocumentManager = {
    fileInput: null,
    fileHandle: null,
    init() {
      this.fileInput = document.getElementById("fileOpenInput");
      this.fileInput.addEventListener("change", (e) => this.handleFiles(e.target.files));
      document.getElementById("newDocumentBtn")?.addEventListener("click", () => this.newDocument());
      document.getElementById("openDocumentBtn")?.addEventListener("click", () => this.openFilePicker());
      document.getElementById("saveDocumentBtn")?.addEventListener("click", () => this.save());
      document.getElementById("saveAsDocumentBtn")?.addEventListener("click", () => this.saveAs());
      document.getElementById("recentDocumentsBtn")?.addEventListener("click", () => this.showRecents());
      document.addEventListener("docmodel:change", () => { this.updateUndoButtons(); });
      window.addEventListener("beforeunload", (e) => {
        if (!DocumentModel.isSaved) { e.preventDefault(); e.returnValue = ""; }
      });
      this.bindGlobalShortcuts();
      this.updateUndoButtons();
    },
    bindGlobalShortcuts() {
      document.addEventListener("keydown", (e) => {
        const modifier = e.ctrlKey || e.metaKey;
        if (!modifier) return;
        const key = e.key.toLowerCase();
        if (key === "n" || key === "o" || key === "s") {
          e.preventDefault();
          if (key === "n") this.newDocument();
          else if (key === "o") this.openFilePicker();
          else if (e.shiftKey) this.saveAs();
          else this.save();
          return;
        }
        // Ctrl/Cmd+Z, Ctrl/Cmd+Y y Ctrl/Cmd+Shift+Z deben usar el historial
        // propio de Mi Word (History), no el undo nativo del navegador para
        // contenteditable: si el nativo actuara, quedaría desincronizado del
        // undoStack/redoStack propio y produciría resultados inconsistentes
        // al combinarlo con los botones de Deshacer/Rehacer de la toolbar.
        if (key === "z" && !e.shiftKey) { e.preventDefault(); History.undo(); return; }
        if (key === "z" && e.shiftKey) { e.preventDefault(); History.redo(); return; }
        if (key === "y") { e.preventDefault(); History.redo(); }
      });
    },
    makeId() { return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; },
    newDocument() {
      if (!this.confirmDiscard()) return;
      this.fileHandle = null;
      DocumentModel.replaceDocument({ id: this.makeId(), name: "Documento sin título", content: "<p><br></p>", saved: true, sourceType: "local", headerText: "", footerText: "", showPageNumber: false, differentFirstPage: false });
      PageView.syncDocumentDecorations();
      Editor.load(DocumentModel.content); History.reset(Editor.el.innerHTML); TitleField.sync(); Editor.focus();
    },
    confirmDiscard() { return DocumentModel.isSaved || window.confirm("Hay cambios sin guardar. ¿Quieres descartarlos y continuar?"); },
    async save() {
      const id = DocumentModel.currentId || this.makeId();
      DocumentModel.currentId = id;
      const html = this.buildHtmlFile();
      try {
        if (this.fileHandle && this.fileHandle.createWritable) {
          const writable = await this.fileHandle.createWritable();
          await writable.write(html);
          await writable.close();
        } else if (window.showSaveFilePicker) {
          this.fileHandle = await window.showSaveFilePicker({
            suggestedName: `${this.safeFileName(DocumentModel.name)}.html`,
            types: [{ description: "Documento HTML", accept: { "text/html": [".html"] } }]
          });
          const writable = await this.fileHandle.createWritable();
          await writable.write(html);
          await writable.close();
        } else {
          this.downloadFile(html, `${this.safeFileName(DocumentModel.name)}.html`, "text/html;charset=utf-8");
        }
        const record = LocalDocuments.upsert({ id, name: DocumentModel.name, content: Editor.el.innerHTML, headerText: DocumentModel.headerText, footerText: DocumentModel.footerText, showPageNumber: DocumentModel.showPageNumber, differentFirstPage: DocumentModel.differentFirstPage });
        DocumentModel.markSaved(); DocumentModel.sourceType = "local";
        this.showToast(`Guardado: ${record.name}`);
        return true;
      } catch (error) {
        if (error && error.name === "AbortError") return false;
        this.showToast("No se pudo guardar el archivo");
        return false;
      }
    },
    async saveAs() {
      const suggested = DocumentModel.name === "Documento sin título" ? "Mi documento" : DocumentModel.name;
      if (window.showSaveFilePicker) {
        try {
          this.fileHandle = await window.showSaveFilePicker({
            suggestedName: `${this.safeFileName(suggested)}.html`,
            types: [{ description: "Documento HTML", accept: { "text/html": [".html"] } }]
          });
          const chosen = this.fileHandle.name.replace(/\.[^.]+$/, "");
          DocumentModel.currentId = this.makeId(); DocumentModel.setName(chosen || suggested, false);
          await this.save(); TitleField.sync(); return true;
        } catch (error) {
          if (error && error.name === "AbortError") return false;
          this.showToast("No se pudo guardar el archivo"); return false;
        }
      }
      const name = window.prompt("Nombre del documento:", suggested);
      if (name === null) return false;
      const clean = name.trim() || "Documento sin título";
      DocumentModel.currentId = this.makeId(); DocumentModel.setName(clean, false);
      await this.save(); TitleField.sync(); return true;
    },
    buildHtmlFile() {
      const d = PageView.dimensions();
      const s = PageView.settings;
      const sizeName = String(s.size || "A4").toUpperCase() === "LETTER" ? "letter" : "A4";
      const orientation = s.orientation === "landscape" ? "landscape" : "portrait";
      const widthMm = d.width / 3.77952755906;
      const heightMm = d.height / 3.77952755906;
      const mt = Number(s.marginTop) || 2.54;
      const mr = Number(s.marginRight) || 2.54;
      const mb = Number(s.marginBottom) || 2.54;
      const ml = Number(s.marginLeft) || 2.54;
      const header = this.escapeHtml(DocumentModel.headerText || "");
      const footer = this.escapeHtml(DocumentModel.footerText || "");
      const pageNumber = DocumentModel.showPageNumber ? " <span class=\"page-number\">Página <span class=\"page-number-value\">1</span></span>" : "";
      const headerHtml = header ? `<header class=\"document-header\">${header}</header>` : "";
      const footerHtml = (footer || pageNumber) ? `<footer class=\"document-footer\">${footer}${pageNumber}</footer>` : "";
      return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="miword-header" content="${header}"><meta name="miword-footer" content="${footer}"><meta name="miword-page-number" content="${DocumentModel.showPageNumber ? "true" : "false"}"><meta name="miword-different-first-page" content="${DocumentModel.differentFirstPage ? "true" : "false"}"><title>${this.escapeHtml(DocumentModel.name)}</title><style>@page{size:${sizeName} ${orientation};margin:${mt}cm ${mr}cm ${mb}cm ${ml}cm}html,body{margin:0;padding:0;background:#fff}body{font-family:Calibri,Carlito,"Segoe UI",Arial,sans-serif;line-height:1.5;color:#21252b;width:${Math.max(1,widthMm-mr-ml)}mm;min-height:${Math.max(1,heightMm-mt-mb)}mm}p{margin:0 0 12px}.page-break{break-after:page;page-break-after:always;height:0;border:0;margin:0}.document-header{position:fixed;top:0;left:0;right:0;text-align:center;font-size:10pt;color:#5d636b;border-bottom:1px solid #d8dce0;padding-bottom:5px}.document-footer{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:9pt;color:#5d636b;border-top:1px solid #d8dce0;padding-top:5px}.page-number-value::after{content:counter(page)}</style></head><body>${headerHtml}${footerHtml}${Editor.el.innerHTML}</body></html>`;
    },
    safeFileName(name) { return String(name || "Documento sin título").replace(/[\\/:*?"<>|]+/g, "-").trim() || "Documento sin título"; },
    downloadFileName(name) {
      // Algunos navegadores descartan el nombre sugerido del atributo "download"
      // cuando contiene tildes/ñ y usan "download" genérico. Se transcribe a
      // ASCII solo para el nombre real del archivo. (Fix de la auditoría de
      // Fase 3, reincorporado en Fase 4.)
      const base = String(name || "Documento sin titulo");
      const withoutDiacritics = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return withoutDiacritics.replace(/[ñÑ]/g, (m) => (m === "ñ" ? "n" : "N")).trim() || "Documento sin titulo";
    },
    downloadFile(content, name, type) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = this.downloadFileName(name); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    openFilePicker() { if (!this.confirmDiscard()) return; this.fileInput.value = ""; this.fileInput.click(); },
    async handleFiles(files) {
      const file = files && files[0]; if (!file) return;
      if (file.size > 15 * 1024 * 1024) { this.showToast("El archivo es demasiado grande (máx. 15 MB)"); return; }
      try {
        if (/\.docx$/i.test(file.name) || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          const imported = await this.importDocx(file);
          this.loadImportedDocument(file, imported.html, imported.meta || {});
          this.showToast(`DOCX abierto: ${file.name}`);
          return;
        }
        const text = await file.text();
        let html = "<p><br></p>";
        if (/\.html?$/i.test(file.name) || file.type === "text/html") {
          const parser = new DOMParser(); const doc = parser.parseFromString(text, "text/html");
          const metaValue = (name) => doc.querySelector(`meta[name="${name}"]`)?.getAttribute("content") || "";
          DocumentModel.headerText = metaValue("miword-header");
          DocumentModel.footerText = metaValue("miword-footer");
          DocumentModel.showPageNumber = metaValue("miword-page-number") === "true";
          DocumentModel.differentFirstPage = metaValue("miword-different-first-page") === "true";
          html = this.sanitizeHtmlDocument(doc) || html;
        } else {
          html = text.split(/\r?\n/).map((line) => `<p>${this.escapeHtml(line) || "<br>"}</p>`).join("");
        }
        this.loadImportedDocument(file, html, {
          headerText: DocumentModel.headerText, footerText: DocumentModel.footerText,
          showPageNumber: DocumentModel.showPageNumber, differentFirstPage: DocumentModel.differentFirstPage
        });
      } catch (error) {
        console.error(error);
        this.showToast(error?.message || "No se pudo abrir el documento");
      }
    },
    loadImportedDocument(file, html, meta = {}) {
      const baseName = file.name.replace(/\.[^.]+$/, "") || "Documento sin título";
      this.fileHandle = null;
      DocumentModel.replaceDocument({ id: this.makeId(), name: baseName, content: html || "<p><br></p>", saved: true, sourceType: "file", headerText: meta.headerText || "", footerText: meta.footerText || "", showPageNumber: !!meta.showPageNumber, differentFirstPage: !!meta.differentFirstPage });
      Editor.load(html || "<p><br></p>"); History.reset(Editor.el.innerHTML);
      if (meta.page) PageView.settings = { ...PageView.settings, ...meta.page };
      PageView.syncDocumentDecorations(); TitleField.sync(); WordCounter.update(Editor.getPlainText()); Editor.focus();
    },
    async unzipDocx(file) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const view = new DataView(bytes.buffer);
      const u16 = (o) => view.getUint16(o, true), u32 = (o) => view.getUint32(o, true);
      let eocd = -1;
      for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) { if (u32(i) === 0x06054b50) { eocd = i; break; } }
      if (eocd < 0) throw new Error("El DOCX no tiene una estructura ZIP válida");
      const count = u16(eocd + 10), centralSize = u32(eocd + 12), centralOffset = u32(eocd + 16);
      const decoder = new TextDecoder("utf-8"); const entries = new Map(); let off = centralOffset;
      for (let i=0;i<count;i++) {
        if (u32(off) !== 0x02014b50) throw new Error("No se pudo leer el directorio del DOCX");
        const method=u16(off+10), compSize=u32(off+20), uncompSize=u32(off+24), nameLen=u16(off+28), extraLen=u16(off+30), commentLen=u16(off+32), localOffset=u32(off+42);
        const name=decoder.decode(bytes.slice(off+46,off+46+nameLen));
        const lv=new DataView(bytes.buffer); if (lv.getUint32(localOffset,true)!==0x04034b50) throw new Error("Entrada ZIP inválida");
        const localNameLen=lv.getUint16(localOffset+26,true), localExtraLen=lv.getUint16(localOffset+28,true);
        const dataStart=localOffset+30+localNameLen+localExtraLen; const compressed=bytes.slice(dataStart,dataStart+compSize);
        entries.set(name,{method,compSize,uncompSize,compressed});
        off += 46+nameLen+extraLen+commentLen;
      }
      const getText = async (name) => {
        const entry=entries.get(name); if(!entry) return "";
        let data=entry.compressed;
        if(entry.method===8) {
          if(typeof DecompressionStream === "undefined") throw new Error("Este navegador no permite descomprimir DOCX. Usa una versión reciente de Chrome, Edge o Firefox.");
          const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
          data=new Uint8Array(await new Response(stream).arrayBuffer());
        } else if(entry.method!==0) throw new Error("Este DOCX usa una compresión no compatible");
        return decoder.decode(data);
      };
      return { entries, getText };
    },
    async importDocx(file) {
      const zip=await this.unzipDocx(file);
      const xml=await zip.getText("word/document.xml");
      if(!xml) throw new Error("El DOCX no contiene word/document.xml");
      const parser=new DOMParser(), doc=parser.parseFromString(xml,"application/xml");
      if(doc.querySelector("parsererror")) throw new Error("El contenido XML del DOCX está dañado");
      const esc=(v)=>this.escapeHtml(v);
      const local=(n)=>n?.localName || n?.nodeName?.split(":").pop() || "";
      const runHtml=(r)=>{
        let text=""; r.querySelectorAll("w\:t, t").forEach(t=>{text+=t.textContent||"";});
        if(!text) return r.querySelector("w\:tab, tab") ? "&emsp;" : "";
        let out=esc(text).replace(/\r?\n/g,"<br>"); const pr=r.querySelector("w\:rPr, rPr");
        if(pr){ if(pr.querySelector("w\:b, b")) out=`<strong>${out}</strong>`; if(pr.querySelector("w\:i, i")) out=`<em>${out}</em>`; if(pr.querySelector("w\:u, u")) out=`<u>${out}</u>`; if(pr.querySelector("w\:strike, strike")) out=`<s>${out}</s>`; if(pr.querySelector("w\:vertAlign, vertAlign")){const va=pr.querySelector("w\:vertAlign, vertAlign")?.getAttribute("w:val")||pr.querySelector("vertAlign")?.getAttribute("val"); if(va==="superscript") out=`<sup>${out}</sup>`; if(va==="subscript") out=`<sub>${out}</sub>`;} }
        return out;
      };
      const paragraphHtml=(p)=>{
        const pPr=p.querySelector("w\:pPr, pPr"), style=pPr?.querySelector("w\:pStyle, pStyle")?.getAttribute("w:val")||"";
        let tag=/heading1|title/i.test(style)?"h1":/heading2/i.test(style)?"h2":/heading3/i.test(style)?"h3":"p";
        let out=""; p.childNodes.forEach(n=>{if(local(n)==="r") out+=runHtml(n); else if(local(n)==="hyperlink") n.childNodes.forEach(c=>{if(local(c)==="r") out+=runHtml(c);}); else if(local(n)==="br") out+="<br>";});
        if(p.querySelector("w\:lastRenderedPageBreak, lastRenderedPageBreak")) out+='<span class="page-break" contenteditable="false" aria-label="Salto de página"></span>';
        return `<${tag}>${out||"<br>"}</${tag}>`;
      };
      let html=""; const body=doc.querySelector("w\:body, body");
      body?.childNodes.forEach(node=>{
        if(local(node)==="p") html+=paragraphHtml(node);
        else if(local(node)==="tbl") {
          const rows=[...node.querySelectorAll(":scope > w\:tr, :scope > tr")]; html+='<table class="document-table"><tbody>'; rows.forEach((tr,ri)=>{html+="<tr>"; [...tr.children].filter(c=>local(c)==="tc").forEach(tc=>{let cell=""; tc.childNodes.forEach(n=>{if(local(n)==="p") cell+=paragraphHtml(n).replace(/^<p>|<\/p>$/g,"");}); html+=`<${ri===0?"th":"td"}>${cell||"<br>"}</${ri===0?"th":"td"}>`;}); html+="</tr>";}); html+='</tbody></table>'; }
      });
      if(!html) html="<p><br></p>";
      const sect=body?.querySelector("w\:sectPr, sectPr"), page={};
      const pgSz=sect?.querySelector("w\:pgSz, pgSz"), pgMar=sect?.querySelector("w\:pgMar, pgMar");
      const twipsToMm=v=>Number(v||0)/1440*25.4;
      if(pgSz){let w=twipsToMm(pgSz.getAttribute("w:w")),h=twipsToMm(pgSz.getAttribute("w:h")); const orient=pgSz.getAttribute("w:orient"); if(w&&h){if(orient==="landscape" && w<h)[w,h]=[h,w]; page.size=(Math.abs(w-21.59)<.2&&Math.abs(h-27.94)<.2)?"LETTER":"A4"; page.orientation=orient==="landscape"?"landscape":"portrait";}}
      if(pgMar){page.marginTop=twipsToMm(pgMar.getAttribute("w:top"))||2.54; page.marginRight=twipsToMm(pgMar.getAttribute("w:right"))||2.33; page.marginBottom=twipsToMm(pgMar.getAttribute("w:bottom"))||2.54; page.marginLeft=twipsToMm(pgMar.getAttribute("w:left"))||2.33;}
      const header=await zip.getText("word/header1.xml"), footer=await zip.getText("word/footer1.xml");
      const plain=(x)=>{const d=new DOMParser().parseFromString(x||"<x/>","application/xml"); return [...d.querySelectorAll("w\:t, t")].map(n=>n.textContent||"").join("").trim();};
      return {html, meta:{headerText:plain(header),footerText:plain(footer),showPageNumber:/PAGE/i.test(footer||""),differentFirstPage:!!sect?.querySelector("w\:titlePg, titlePg"),page}};
    },
    escapeHtml(value) { const div = document.createElement("div"); div.textContent = value; return div.innerHTML; },
    sanitizeHtmlDocument(doc) {
      // El HTML abierto se inserta como DOM real y vivo dentro de #editor
      // (contenteditable), por lo que no basta con quitar <script>: atributos
      // on* (onerror, onload, onclick...) y URLs "javascript:" también se
      // ejecutarían. (Fix de la auditoría de Fase 3, reincorporado en Fase 4.)
      if (!doc || !doc.body) return null;
      doc.querySelectorAll("script, iframe, object, embed, link, meta, base, form, style").forEach((node) => node.remove());
      const isJsUrl = (value) => /^\s*javascript\s*:/i.test(String(value || ""));
      doc.body.querySelectorAll("*").forEach((el) => {
        Array.from(el.attributes).forEach((attr) => {
          const name = attr.name.toLowerCase();
          if (name.startsWith("on")) { el.removeAttribute(attr.name); return; }
          if (name === "srcdoc") { el.removeAttribute(attr.name); return; }
          if ((name === "href" || name === "src" || name === "action" || name === "formaction") && isJsUrl(attr.value)) {
            el.removeAttribute(attr.name);
          }
        });
      });
      return doc.body.innerHTML;
    },
    showRecents() {
      const list = RecentDocuments.load();
      const modal = document.getElementById("recentModal"); const container = document.getElementById("recentList");
      container.innerHTML = "";
      if (!list.length) { container.innerHTML = '<p class="recent-empty">No hay documentos recientes.</p>'; }
      list.forEach((item) => {
        const doc = LocalDocuments.get(item.id); if (!doc) return;
        const row = document.createElement("button"); row.type = "button"; row.className = "recent-row";
        row.innerHTML = `<strong>${this.escapeHtml(doc.name)}</strong><span>${new Date(doc.updatedAt).toLocaleString()}</span>`;
        row.addEventListener("click", () => { if (!this.confirmDiscard()) return; DocumentModel.replaceDocument({ id: doc.id, name: doc.name, content: doc.content, saved: true, headerText: doc.headerText, footerText: doc.footerText, showPageNumber: doc.showPageNumber, differentFirstPage: doc.differentFirstPage }); Editor.load(doc.content); History.reset(Editor.el.innerHTML); PageView.syncDocumentDecorations(); TitleField.sync(); modal.hidden = true; Editor.focus(); });
        container.appendChild(row);
      });
      modal.hidden = false;
    },
    updateUndoButtons() {
      History.updateButtons();
    },
    showToast(message) {
      const toast = document.getElementById("toast"); if (!toast) return;
      toast.textContent = message; toast.classList.add("is-visible"); clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
    }
  };

  const InsertManager = {
    savedRange: null,
    saveSelection() {
      Editor.saveSelection();
      this.savedRange = Editor.savedRange ? Editor.savedRange.cloneRange() : null;
    },
    restoreSelection() {
      Editor.focus();
      if (this.savedRange) {
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(this.savedRange.cloneRange());
        Editor.savedRange = this.savedRange.cloneRange();
      } else Editor.restoreSelection();
    },
    closeMenus() { MenuBar.closeMenus(); },
    openImagePicker() {
      this.saveSelection(); this.closeMenus();
      const input = document.getElementById("imageInsertInput"); if (input) { input.value = ""; input.click(); }
    },
    handleImage(files) {
      const file = files && files[0]; if (!file || !file.type.startsWith("image/")) return;
      if (file.size > 4 * 1024 * 1024) { DocumentManager.showToast("La imagen es demasiado grande (máx. 4 MB)"); return; }
      const reader = new FileReader();
      reader.onerror = () => DocumentManager.showToast("No se pudo leer la imagen");
      reader.onabort = () => DocumentManager.showToast("Lectura de imagen cancelada");
      reader.onload = () => {
        this.restoreSelection();
        const img = document.createElement("img");
        img.src = String(reader.result || ""); img.alt = file.name.replace(/\.[^.]+$/, "") || "Imagen";
        img.className = "document-image"; img.style.maxWidth = "100%"; img.style.height = "auto"; img.tabIndex = 0; img.setAttribute("aria-label", img.alt);
        const range = window.getSelection()?.rangeCount ? window.getSelection().getRangeAt(0) : null;
        if (range && Editor.selectionInsideEditor()) { range.deleteContents(); range.insertNode(img); range.setStartAfter(img); range.collapse(true); }
        else Editor.el.appendChild(img);
        Editor.saveSelection(); Editor.handleInput(); History.commitNow(); this.closeMenus();
      };
      reader.readAsDataURL(file);
    },
    openTableDialog() {
      this.saveSelection(); this.closeMenus();
      const modal = document.getElementById("tableModal"); if (modal) modal.hidden = false;
      document.getElementById("tableRowsInput")?.focus();
    },
    closeTableDialog() { const modal = document.getElementById("tableModal"); if (modal) modal.hidden = true; },
    insertTable() {
      const rows = Math.max(1, Math.min(20, Number(document.getElementById("tableRowsInput")?.value) || 3));
      const cols = Math.max(1, Math.min(10, Number(document.getElementById("tableColsInput")?.value) || 3));
      this.restoreSelection();
      const table = document.createElement("table"); table.className = "document-table";
      const tbody = document.createElement("tbody");
      for (let r=0;r<rows;r++) {
        const tr=document.createElement("tr");
        for (let c=0;c<cols;c++) { const cell=document.createElement(r===0?"th":"td"); cell.textContent=r===0?`Encabezado ${c+1}`:""; tr.appendChild(cell); }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      const range=window.getSelection()?.rangeCount?window.getSelection().getRangeAt(0):null;
      if (range && Editor.selectionInsideEditor()) { range.deleteContents(); range.insertNode(table); range.setStartAfter(table); range.collapse(true); }
      else Editor.el.appendChild(table);
      Editor.saveSelection(); Editor.handleInput(); History.commitNow(); this.closeTableDialog(); Editor.focus();
    },
    insertLink() {
      this.saveSelection();
      const url = window.prompt("Dirección del vínculo (https://…):", "https://");
      if (url === null) return;
      const clean = url.trim();
      if (!/^https?:\/\//i.test(clean)) { DocumentManager.showToast("Usa una dirección http:// o https://"); return; }
      const selected = window.getSelection()?.toString().trim();
      let text = selected || window.prompt("Texto del vínculo:", clean);
      if (text === null) return;
      text = String(text || clean).trim() || clean;
      this.restoreSelection();
      const range=window.getSelection()?.rangeCount?window.getSelection().getRangeAt(0):null;
      const a=document.createElement("a"); a.href=clean; a.textContent=text; a.target="_blank"; a.rel="noopener noreferrer";
      if (range && Editor.selectionInsideEditor()) { range.deleteContents(); range.insertNode(a); range.setStartAfter(a); range.collapse(true); }
      else Editor.el.appendChild(a);
      Editor.saveSelection(); Editor.handleInput(); History.commitNow();
    },
    insertPageBreak() {
      this.saveSelection(); this.restoreSelection();
      const range=window.getSelection()?.rangeCount?window.getSelection().getRangeAt(0):null;
      const br=document.createElement("div"); br.className="page-break"; br.setAttribute("contenteditable","false"); br.setAttribute("aria-label","Salto de página");
      if (range && Editor.selectionInsideEditor()) { range.collapse(false); range.insertNode(br); range.setStartAfter(br); range.collapse(true); }
      else Editor.el.appendChild(br);
      Editor.saveSelection(); Editor.handleInput(); History.commitNow(); this.closeMenus(); Editor.focus();
    }
  };

  const ImageTools = {
    panel: null,
    selected: null,
    widthInput: null,
    altInput: null,
    alignSelect: null,
    init() {
      this.panel = document.getElementById("imageToolsPanel");
      this.widthInput = document.getElementById("imageWidthInput");
      this.altInput = document.getElementById("imageAltInput");
      this.alignSelect = document.getElementById("imageAlignSelect");
      Editor.el?.addEventListener("click", (e) => {
        const img = e.target.closest?.("img.document-image");
        if (img && Editor.el.contains(img)) { e.preventDefault(); e.stopPropagation(); this.select(img); }
        else if (!e.target.closest?.(".image-tools-panel")) this.close();
      });
      Editor.el?.addEventListener("keydown", (e) => {
        if (!this.selected || !Editor.el.contains(this.selected)) return;
        if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); this.open(); }
      });
      document.getElementById("imagePropertiesBtn")?.addEventListener("click", () => { MenuBar.closeMenus(); this.open(); });
      document.getElementById("closeImageTools")?.addEventListener("click", () => this.close());
      document.getElementById("applyImageBtn")?.addEventListener("click", () => this.apply());
      document.getElementById("deleteImageBtn")?.addEventListener("click", () => this.remove());
      this.widthInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") this.apply(); });
      this.altInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") this.apply(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !this.panel?.hidden) this.close(); });
    },
    select(img) {
      if (!img) return;
      if (this.selected && this.selected !== img) this.selected.classList.remove("is-selected");
      this.selected = img;
      this.selected.classList.add("is-selected");
      this.selected.tabIndex = 0;
      this.open();
    },
    inferWidth(img) {
      const explicit = Number.parseFloat(img.style.width || "");
      if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
      const natural = Number(img.naturalWidth || 0);
      if (natural > 0) return Math.round(Math.min(natural, 2000));
      return Math.max(24, Math.round(img.getBoundingClientRect().width || 320));
    },
    alignment(img) {
      const ml = img.style.marginLeft;
      const mr = img.style.marginRight;
      if (ml === "auto" && mr === "auto") return "center";
      if (ml === "auto") return "right";
      return "left";
    },
    open() {
      if (!this.selected || !Editor.el.contains(this.selected)) { DocumentManager.showToast("Selecciona una imagen primero"); return; }
      const img = this.selected;
      this.widthInput.value = String(this.inferWidth(img));
      this.altInput.value = img.alt || "";
      this.alignSelect.value = this.alignment(img);
      this.panel.hidden = false;
      this.position();
      this.widthInput.focus();
      this.widthInput.select();
    },
    position() {
      if (!this.panel || this.panel.hidden || !this.selected) return;
      const rect = this.selected.getBoundingClientRect();
      const panelWidth = this.panel.offsetWidth || 300;
      const panelHeight = this.panel.offsetHeight || 220;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - panelWidth - 8));
      let top = rect.bottom + 8;
      if (top + panelHeight > window.innerHeight - 8) top = Math.max(8, rect.top - panelHeight - 8);
      this.panel.style.left = `${left}px`;
      this.panel.style.top = `${top}px`;
    },
    apply() {
      const img = this.selected;
      if (!img || !Editor.el.contains(img)) { this.close(); return; }
      const width = Math.max(24, Math.min(2000, Number(this.widthInput.value) || this.inferWidth(img)));
      img.style.width = `${width}px`;
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      const align = this.alignSelect.value;
      if (align === "center") { img.style.marginLeft = "auto"; img.style.marginRight = "auto"; }
      else if (align === "right") { img.style.marginLeft = "auto"; img.style.marginRight = "0"; }
      else { img.style.marginLeft = "0"; img.style.marginRight = "auto"; }
      img.alt = this.altInput.value.trim() || "Imagen";
      img.setAttribute("aria-label", img.alt);
      Editor.saveSelection();
      Editor.handleInput();
      History.commitNow();
      this.position();
      DocumentManager.showToast("Propiedades de imagen aplicadas");
    },
    remove() {
      const img = this.selected;
      if (!img || !Editor.el.contains(img)) { this.close(); return; }
      img.remove();
      this.selected = null;
      Editor.handleInput();
      History.commitNow();
      this.close();
      Editor.focus();
      DocumentManager.showToast("Imagen eliminada");
    },
    close() {
      if (this.selected) this.selected.classList.remove("is-selected");
      this.selected = null;
      if (this.panel) this.panel.hidden = true;
    }
  };

  const TableTools = {
    panel: null, selected: null, widthInput: null, alignSelect: null, headerToggle: null,
    init() {
      this.panel = document.getElementById("tableToolsPanel");
      this.widthInput = document.getElementById("tableWidthInput");
      this.alignSelect = document.getElementById("tableAlignSelect");
      this.headerToggle = document.getElementById("tableHeaderToggle");
      Editor.el?.addEventListener("click", (e) => {
        const table = e.target.closest?.("table.document-table");
        if (table && Editor.el.contains(table)) { this.select(table); return; }
        if (!e.target.closest?.(".table-tools-panel")) this.close();
      });
      document.getElementById("tablePropertiesBtn")?.addEventListener("click", () => { MenuBar.closeMenus(); this.open(); });
      document.getElementById("closeTableTools")?.addEventListener("click", () => this.close());
      document.getElementById("applyTableBtn")?.addEventListener("click", () => this.apply());
      document.getElementById("deleteTableBtn")?.addEventListener("click", () => this.remove());
      document.getElementById("tableAddRowBtn")?.addEventListener("click", () => this.addRow());
      document.getElementById("tableAddColBtn")?.addEventListener("click", () => this.addColumn());
      document.getElementById("tableDeleteRowBtn")?.addEventListener("click", () => this.deleteRow());
      document.getElementById("tableDeleteColBtn")?.addEventListener("click", () => this.deleteColumn());
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !this.panel?.hidden) this.close();
      });
      window.addEventListener("resize", () => this.position());
      window.addEventListener("scroll", () => this.position(), true);
    },
    select(table) {
      if (this.selected && this.selected !== table) this.selected.classList.remove("is-selected");
      this.selected = table; table.classList.add("is-selected"); this.open();
    },
    getRows() { return this.selected ? Array.from(this.selected.rows) : []; },
    getCell() {
      const sel = window.getSelection();
      const node = sel?.anchorNode?.nodeType === 3 ? sel.anchorNode.parentElement : sel?.anchorNode;
      const cell = node?.closest?.("th,td");
      return cell && this.selected?.contains(cell) ? cell : this.selected?.rows?.[0]?.cells?.[0] || null;
    },
    inferWidth() {
      if (!this.selected) return 100;
      const raw = Number.parseFloat(this.selected.style.width || "");
      return Number.isFinite(raw) ? Math.max(20, Math.min(100, Math.round(raw))) : 100;
    },
    alignment() {
      if (!this.selected) return "left";
      const ml=this.selected.style.marginLeft, mr=this.selected.style.marginRight;
      if (ml === "auto" && mr === "auto") return "center";
      if (ml === "auto") return "right";
      return "left";
    },
    open() {
      if (!this.selected || !Editor.el.contains(this.selected)) { DocumentManager.showToast("Selecciona una tabla primero"); return; }
      this.widthInput.value=String(this.inferWidth()); this.alignSelect.value=this.alignment();
      this.headerToggle.checked=!!this.selected.querySelector("tr:first-child th");
      this.panel.hidden=false; this.position();
    },
    position() {
      if (!this.panel || this.panel.hidden || !this.selected) return;
      const r=this.selected.getBoundingClientRect(), w=this.panel.offsetWidth||310, h=this.panel.offsetHeight||330;
      const left=Math.max(8,Math.min(r.left,window.innerWidth-w-8));
      let top=r.bottom+8; if(top+h>window.innerHeight-8) top=Math.max(8,r.top-h-8);
      this.panel.style.left=`${left}px`; this.panel.style.top=`${top}px`;
    },
    commit(msg) { Editor.handleInput(); History.commitNow(); this.position(); if(msg) DocumentManager.showToast(msg); },
    addRow() {
      if(!this.selected)return; const cols=this.selected.rows[0]?.cells.length||1, tr=this.selected.insertRow(-1);
      for(let i=0;i<cols;i++){const c=document.createElement(this.headerToggle.checked && this.selected.rows.length===1?"th":"td"); c.innerHTML="<br>"; tr.appendChild(c);}
      this.commit("Fila agregada");
    },
    addColumn() {
      if(!this.selected)return; this.getRows().forEach((tr,i)=>{const c=document.createElement(i===0&&this.headerToggle.checked?"th":"td"); c.innerHTML="<br>"; tr.appendChild(c);}); this.commit("Columna agregada");
    },
    deleteRow() {
      if(!this.selected)return; const cell=this.getCell(), tr=cell?.parentElement; if(!tr)return;
      if(this.selected.rows.length<=1){DocumentManager.showToast("Una tabla debe conservar al menos una fila");return;}
      tr.remove(); this.commit("Fila eliminada");
    },
    deleteColumn() {
      if(!this.selected)return; const cell=this.getCell(), index=cell?cell.cellIndex:0, rows=this.getRows();
      if((rows[0]?.cells.length||1)<=1){DocumentManager.showToast("Una tabla debe conservar al menos una columna");return;}
      rows.forEach(tr=>tr.cells[index]?.remove()); this.commit("Columna eliminada");
    },
    apply() {
      if(!this.selected || !Editor.el.contains(this.selected)){this.close();return;}
      const width=Math.max(20,Math.min(100,Number(this.widthInput.value)||100)); this.selected.style.width=`${width}%`;
      this.selected.style.marginLeft=this.alignSelect.value==="center"?"auto":this.alignSelect.value==="right"?"auto":"0";
      this.selected.style.marginRight=this.alignSelect.value==="center"?"auto":this.alignSelect.value==="right"?"0":"auto";
      const first=this.selected.rows[0]; if(first){Array.from(first.cells).forEach(c=>{const replacement=document.createElement(this.headerToggle.checked?"th":"td"); replacement.innerHTML=c.innerHTML; for(const a of Array.from(c.attributes)) replacement.setAttribute(a.name,a.value); c.replaceWith(replacement);});}
      this.commit("Propiedades de tabla aplicadas");
    },
    remove() { if(!this.selected)return; this.selected.remove(); this.selected=null; this.close(); Editor.handleInput(); History.commitNow(); Editor.focus(); DocumentManager.showToast("Tabla eliminada"); },
    close() { if(this.selected)this.selected.classList.remove("is-selected"); this.selected=null; if(this.panel)this.panel.hidden=true; }
  };

  const AdvancedTools = {
    findIndex: -1,
    lastQuery: "",
    openFind(replace = false) {
      const modal = document.getElementById("findModal"); if (!modal) return;
      modal.hidden = false;
      const replaceInput = document.getElementById("replaceInput");
      replaceInput.closest(".find-field").style.display = replace ? "grid" : "none";
      document.getElementById("findInput")?.focus();
      this.updateFindStatus();
    },
    closeFind() { const modal=document.getElementById("findModal"); if(modal) modal.hidden=true; this.clearFindSelection(); },
    clearFindSelection() {
      const sel=window.getSelection(); if(!sel || !sel.rangeCount) return;
      if (Editor.selectionInsideEditor()) sel.removeAllRanges();
    },
    getQuery() { return String(document.getElementById("findInput")?.value || ""); },
    isCaseSensitive() { return !!document.getElementById("findCaseSensitive")?.checked; },
    textNodes() {
      const walker=document.createTreeWalker(Editor.el, NodeFilter.SHOW_TEXT, { acceptNode(node) {
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        const parent=node.parentElement; if (parent && ["SCRIPT","STYLE","IMG"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }});
      const nodes=[]; let n; while((n=walker.nextNode())) nodes.push(n); return nodes;
    },
    matches(query) {
      if (!query) return [];
      const needle=this.isCaseSensitive()?query:query.toLocaleLowerCase(); const out=[];
      this.textNodes().forEach(node=>{ const hay=this.isCaseSensitive()?node.nodeValue:node.nodeValue.toLocaleLowerCase(); let pos=0; while((pos=hay.indexOf(needle,pos))!==-1){ out.push({node,start:pos,end:pos+query.length}); pos+=Math.max(1,query.length); }});
      return out;
    },
    selectMatch(match) {
      if(!match) return false; const range=document.createRange(); range.setStart(match.node,match.start); range.setEnd(match.node,match.end); const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(range); Editor.savedRange=range.cloneRange(); Editor.el.focus({preventScroll:true}); return true;
    },
    findNext(direction=1) {
      const query=this.getQuery(); if(!query){this.updateFindStatus();return false;}
      const list=this.matches(query); if(!list.length){this.findIndex=-1;this.updateFindStatus();return false;}
      if(query!==this.lastQuery){this.findIndex=-1;this.lastQuery=query;}
      this.findIndex=(this.findIndex+direction+list.length)%list.length;
      this.selectMatch(list[this.findIndex]); this.updateFindStatus(list.length); return true;
    },
    updateFindStatus(total=null) {
      const status=document.getElementById("findStatus"); if(!status)return;
      const query=this.getQuery(); if(!query){status.textContent="Escribe un término para comenzar.";return;}
      const count=total===null?this.matches(query).length:total;
      status.textContent = count ? (count + " coincidencia" + (count === 1 ? "" : "s") + (this.findIndex >= 0 ? " · " + (this.findIndex + 1) + " de " + count : "")) : "No se encontraron coincidencias.";
    },
    replaceOne() {
      const query=this.getQuery(); if(!query)return;
      const sel=window.getSelection(); const selected=sel?.toString()||""; const expected=this.isCaseSensitive()?query:selected;
      const same=this.isCaseSensitive()?selected===query:selected.toLocaleLowerCase()===query.toLocaleLowerCase();
      if(!same){this.findNext(1);return;}
      const replacement=String(document.getElementById("replaceInput")?.value||"");
      document.execCommand("insertText",false,replacement); Editor.handleInput(); History.commitNow(); this.findIndex=-1; this.findNext(1);
    },
    replaceAll() {
      const query=this.getQuery(); if(!query)return;
      const replacement=String(document.getElementById("replaceInput")?.value||""); const list=this.matches(query); if(!list.length){this.updateFindStatus(0);return;}
      const needle=this.isCaseSensitive()?query:query.toLocaleLowerCase();
      this.restoring=true;
      for(let i=list.length-1;i>=0;i--){const m=list[i]; const value=m.node.nodeValue; m.node.nodeValue=value.slice(0,m.start)+replacement+value.slice(m.end);}
      this.restoring=false; Editor.handleInput(); History.commitNow(); this.findIndex=-1; this.updateFindStatus(0); DocumentManager.showToast(list.length + " coincidencia" + (list.length === 1 ? "" : "s") + " reemplazada" + (list.length === 1 ? "" : "s") + ".");
    },
    applyStyle(style) {
      Editor.runCommand("formatBlock", style);
      document.getElementById("stylesPanel").hidden=true;
    },
    openStyles(anchor) {
      const panel=document.getElementById("stylesPanel"); if(!panel)return;
      if(!panel.hidden){panel.hidden=true;return;} const r=anchor.getBoundingClientRect(); panel.hidden=false; panel.style.left = r.left + "px"; panel.style.top = (r.bottom + 4) + "px";
    },
    showStatistics() {
      const text=Editor.getPlainText().replace(/\u00a0/g," "); const words=(text.trim().match(/\S+/g)||[]).length; const chars=text.replace(/\n/g,"").length; const charsSpaces=text.length; const paragraphs=Array.from(Editor.el.querySelectorAll("p,h1,h2,h3,blockquote,pre,li")).filter(n=>n.innerText.trim()).length || (text.trim()?1:0); const pages=Math.max(1,Number((document.getElementById("page")?.dataset.pageCount)||1)); const selection=window.getSelection()?.toString()||""; const selectedWords=(selection.trim().match(/\S+/g)||[]).length;
      const data=[ [words,"Palabras"],[chars,"Caracteres (sin saltos)"],[charsSpaces,"Caracteres con espacios"],[paragraphs,"Párrafos / bloques"],[pages,"Páginas estimadas"],[selectedWords,"Palabras seleccionadas"] ];
      const grid=document.getElementById("statisticsGrid"); if(grid) grid.innerHTML=data.map(([v,l])=>"<div class=\"stat-card\"><strong>"+v+"</strong><span>"+l+"</span></div>").join(""); const modal=document.getElementById("statisticsModal"); if(modal)modal.hidden=false;
    },
    init() {
      document.getElementById("findBtn")?.addEventListener("click",()=>{MenuBar.closeMenus();this.openFind(false);});
      document.getElementById("replaceBtn")?.addEventListener("click",()=>{MenuBar.closeMenus();this.openFind(true);});
      document.getElementById("findInput")?.addEventListener("input",()=>{this.findIndex=-1;this.lastQuery=this.getQuery();this.updateFindStatus();});
      document.getElementById("findCaseSensitive")?.addEventListener("change",()=>{this.findIndex=-1;this.updateFindStatus();});
      document.getElementById("findNextBtn")?.addEventListener("click",()=>this.findNext(1));
      document.getElementById("findPrevBtn")?.addEventListener("click",()=>this.findNext(-1));
      document.getElementById("replaceOneBtn")?.addEventListener("click",()=>this.replaceOne());
      document.getElementById("replaceAllBtn")?.addEventListener("click",()=>this.replaceAll());
      document.getElementById("closeFindModal")?.addEventListener("click",()=>this.closeFind());
      document.getElementById("findModal")?.addEventListener("click",e=>{if(e.target.id==="findModal")this.closeFind();});
      document.getElementById("stylesBtn")?.addEventListener("click",e=>this.openStyles(e.currentTarget));
      document.querySelectorAll("#stylesPanel [data-style]").forEach(btn=>btn.addEventListener("click",()=>this.applyStyle(btn.dataset.style)));
      document.getElementById("statisticsBtn")?.addEventListener("click",()=>{MenuBar.closeMenus();this.showStatistics();});
      document.getElementById("closeStatisticsModal")?.addEventListener("click",()=>document.getElementById("statisticsModal").hidden=true);
      document.getElementById("statisticsModal")?.addEventListener("click",e=>{if(e.target.id==="statisticsModal")e.currentTarget.hidden=true;});
      document.addEventListener("click",e=>{if(!e.target.closest("#stylesPanel")&&!e.target.closest("#stylesBtn")){const p=document.getElementById("stylesPanel");if(p)p.hidden=true;}});
      document.addEventListener("keydown",e=>{if(e.key==="Escape"){const find=document.getElementById("findModal"), stats=document.getElementById("statisticsModal"); if(find&&!find.hidden)this.closeFind(); if(stats&&!stats.hidden)stats.hidden=true; return;} if(!(e.ctrlKey||e.metaKey)||e.altKey)return;const k=e.key.toLowerCase();if(k==="f"){e.preventDefault();this.openFind(false);}else if(k==="h"){e.preventDefault();this.openFind(true);}});
    }
  };

  const MenuBar = {
    init(menubarEl) {
      const items = Array.from(menubarEl.querySelectorAll(".menu-item"));
      items.forEach((item) => item.addEventListener("click", () => {
        items.forEach((i) => i.classList.remove("is-active")); item.classList.add("is-active");
        if (item.dataset.menu === "archivo") this.toggleMenu("fileMenu", item);
        else if (item.dataset.menu === "edicion") this.toggleMenu("editMenu", item);
        else if (item.dataset.menu === "insertar") this.toggleMenu("insertMenu", item);
        else if (item.dataset.menu === "diseno") this.toggleMenu("designMenu", item);
        else if (item.dataset.menu === "vista") this.toggleMenu("viewMenu", item);
        else if (item.dataset.menu === "herramientas") this.toggleMenu("toolsMenu", item);
        else if (item.dataset.menu === "sistema") this.toggleMenu("systemMenu", item);
        else if (item.dataset.menu === "tetord") this.toggleMenu("tetordMenu", item);
        else this.closeMenus();
      }));
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".file-menu") && !e.target.closest(".menu-item")) this.closeMenus();
      });
      document.getElementById("closeRecentModal")?.addEventListener("click", () => { document.getElementById("recentModal").hidden = true; });
      document.getElementById("recentModal")?.addEventListener("click", (e) => { if (e.target.id === "recentModal") e.currentTarget.hidden = true; });
      document.getElementById("editUndoBtn")?.addEventListener("click", () => History.undo());
      document.getElementById("editRedoBtn")?.addEventListener("click", () => History.redo());
      document.getElementById("editCutBtn")?.addEventListener("click", () => Toolbar.execute("cut"));
      document.getElementById("editCopyBtn")?.addEventListener("click", () => Toolbar.execute("copy"));
      document.getElementById("editPasteBtn")?.addEventListener("click", () => Toolbar.execute("paste"));
      document.getElementById("editSelectAllBtn")?.addEventListener("click", () => Toolbar.execute("selectAll"));
      document.getElementById("insertImageBtn")?.addEventListener("click", () => InsertManager.openImagePicker());
      document.getElementById("insertTableBtn")?.addEventListener("click", () => InsertManager.openTableDialog());
      document.getElementById("insertLinkBtn")?.addEventListener("click", () => InsertManager.insertLink());
      document.getElementById("insertPageBreakBtn")?.addEventListener("click", () => InsertManager.insertPageBreak());
      document.getElementById("closeTableModal")?.addEventListener("click", () => InsertManager.closeTableDialog());
      document.getElementById("cancelTableBtn")?.addEventListener("click", () => InsertManager.closeTableDialog());
      document.getElementById("confirmTableBtn")?.addEventListener("click", () => InsertManager.insertTable());
      document.getElementById("tableModal")?.addEventListener("click", (e) => { if (e.target.id === "tableModal") InsertManager.closeTableDialog(); });
      document.getElementById("imageInsertInput")?.addEventListener("change", (e) => InsertManager.handleImage(e.target.files));
      document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
          e.preventDefault(); InsertManager.insertLink();
        }
      });
    },
    toggleMenu(id, anchor) {
      const menu = document.getElementById(id); if (!menu) return;
      const wasHidden = menu.hidden; this.closeMenus();
      if (wasHidden) { const r = anchor.getBoundingClientRect(); menu.hidden = false; menu.style.left = `${r.left}px`; }
    },
    closeMenus() {
      ["fileMenu", "editMenu", "insertMenu", "designMenu", "viewMenu", "toolsMenu", "systemMenu", "tetordMenu"].forEach((id) => { const menu = document.getElementById(id); if (menu) menu.hidden = true; });
    },
    toggleFileMenu(anchor) { this.toggleMenu("fileMenu", anchor); },
    closeFileMenu() { this.closeMenus(); }
  };

  const TitleField = {
    titleEl: null, saveStateEl: null,
    init(titleEl, saveStateEl) {
      this.titleEl = titleEl; this.saveStateEl = saveStateEl;
      titleEl.addEventListener("blur", () => { DocumentModel.setName(titleEl.textContent); this.sync(); });
      titleEl.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); titleEl.blur(); } });
      document.addEventListener("docmodel:change", () => this.render()); this.render();
    },
    sync() { this.titleEl.textContent = DocumentModel.name; this.render(); },
    render() { if (!this.saveStateEl) return; this.saveStateEl.textContent = DocumentModel.isSaved ? "Guardado" : "Sin guardar"; this.saveStateEl.dataset.state = DocumentModel.isSaved ? "saved" : "unsaved"; this.titleEl.textContent = DocumentModel.name; document.title = `Mi Word — ${DocumentModel.name}`; }
  };

  const PageView = {
    pageEl: null,
    pageContentEl: null,
    workspaceEl: null,
    stageEl: null,
    hRuler: null,
    vRuler: null,
    pageCountEl: null,
    headerEl: null,
    footerEl: null,
    settings: {
      size: "A4",
      orientation: "portrait",
      marginTop: 2.54,
      marginBottom: 2.54,
      marginLeft: 2.33,
      marginRight: 2.33,
      zoom: 100,
      showRuler: true
    },
    presets: {
      A4: { width: 21, height: 29.7 },
      LETTER: { width: 21.59, height: 27.94 }
    },
    init() {
      this.pageEl = document.getElementById("page");
      this.pageContentEl = document.getElementById("editor");
      this.workspaceEl = document.getElementById("workspace");
      this.stageEl = document.getElementById("editorStage");
      this.hRuler = document.getElementById("horizontalRuler");
      this.vRuler = document.getElementById("verticalRuler");
      this.pageCountEl = document.getElementById("pageCount");
      this.headerEl = document.getElementById("pageHeader");
      this.footerEl = document.getElementById("pageFooter");
      this.loadSettings();
      this.bindControls();
      this.apply();
      document.addEventListener("docmodel:change", () => this.updatePageCount());
      window.addEventListener("resize", () => this.renderRulers());
      if (window.ResizeObserver) new ResizeObserver(() => this.updatePageCount()).observe(this.pageContentEl);
      this.updatePageCount();
    },
    loadSettings() {
      try {
        const saved = JSON.parse(localStorage.getItem(VIEW_KEY) || "null");
        if (saved && typeof saved === "object") this.settings = { ...this.settings, ...saved };
      } catch (_) {}
      this.settings.zoom = Math.max(50, Math.min(200, Number(this.settings.zoom) || 100));
      ["marginTop", "marginBottom", "marginLeft", "marginRight"].forEach((key) => {
        this.settings[key] = Math.max(0.5, Math.min(8, Number(this.settings[key]) || 2.54));
      });
    },
    saveSettings() { try { localStorage.setItem(VIEW_KEY, JSON.stringify(this.settings)); } catch (_) {} },
    bindControls() {
      const ids = ["pageSizeSelect", "orientationSelect", "marginTopInput", "marginBottomInput", "marginLeftInput", "marginRightInput"];
      ids.forEach((id) => document.getElementById(id)?.addEventListener("change", (e) => {
        const idMap = { pageSizeSelect: "size", orientationSelect: "orientation", marginTopInput: "marginTop", marginBottomInput: "marginBottom", marginLeftInput: "marginLeft", marginRightInput: "marginRight" };
        const key = idMap[id];
        this.settings[key] = key === "marginTop" || key === "marginBottom" || key === "marginLeft" || key === "marginRight" ? Math.max(0.5, Math.min(8, Number(e.target.value) || 0.5)) : e.target.value;
        this.saveSettings(); this.apply();
      }));
      document.getElementById("resetPageSettingsBtn")?.addEventListener("click", () => {
        Object.assign(this.settings, { size: "A4", orientation: "portrait", marginTop: 2.54, marginBottom: 2.54, marginLeft: 2.33, marginRight: 2.33 });
        this.saveSettings(); this.apply();
      });
      document.getElementById("headerTextInput")?.addEventListener("input", (e) => this.updateDecoration("headerText", e.target.value));
      document.getElementById("footerTextInput")?.addEventListener("input", (e) => this.updateDecoration("footerText", e.target.value));
      document.getElementById("pageNumberToggle")?.addEventListener("change", (e) => this.updateDecoration("showPageNumber", e.target.checked));
      document.getElementById("differentFirstPageToggle")?.addEventListener("change", (e) => this.updateDecoration("differentFirstPage", e.target.checked));
      document.getElementById("rulerToggle")?.addEventListener("change", (e) => { this.settings.showRuler = e.target.checked; this.saveSettings(); this.apply(); });
      document.getElementById("zoomRange")?.addEventListener("input", (e) => this.setZoom(Number(e.target.value)));
      document.getElementById("zoomOutBtn")?.addEventListener("click", () => this.setZoom(this.settings.zoom - 10));
      document.getElementById("zoomInBtn")?.addEventListener("click", () => this.setZoom(this.settings.zoom + 10));
      document.getElementById("zoomValueBtn")?.addEventListener("click", () => this.setZoom(100));
      document.getElementById("zoomOutMenu")?.addEventListener("click", () => this.setZoom(this.settings.zoom - 10));
      document.getElementById("zoomInMenu")?.addEventListener("click", () => this.setZoom(this.settings.zoom + 10));
      document.getElementById("zoomResetMenu")?.addEventListener("click", () => this.setZoom(100));
      ["leftMarginMarker", "rightMarginMarker", "topMarginMarker"].forEach((id) => this.bindMarker(document.getElementById(id), id));
    },
    setZoom(value) {
      this.settings.zoom = Math.max(50, Math.min(200, Math.round(Number(value) / 10) * 10));
      this.saveSettings(); this.apply();
    },
    dimensions() {
      const base = this.presets[this.settings.size] || this.presets.A4;
      const landscape = this.settings.orientation === "landscape";
      return { width: landscape ? base.height : base.width, height: landscape ? base.width : base.height };
    },
    apply() {
      const d = this.dimensions();
      const px = 37.7952755906;
      this.pageEl.style.width = `${d.width * px}px`;
      this.pageEl.style.minHeight = `${d.height * px}px`;
      this.pageContentEl.style.padding = `${this.settings.marginTop * px}px ${this.settings.marginRight * px}px ${this.settings.marginBottom * px}px ${this.settings.marginLeft * px}px`;
      this.pageEl.style.transform = `scale(${this.settings.zoom / 100})`;
      this.pageEl.style.transformOrigin = "top left";
      this.stageEl.style.setProperty("--page-scale", String(this.settings.zoom / 100));
      this.stageEl.style.setProperty("--page-width", `${d.width * px}px`);
      this.stageEl.style.setProperty("--page-height", `${d.height * px}px`);
      this.stageEl.style.setProperty("--page-left-margin", `${this.settings.marginLeft * px}px`);
      this.stageEl.style.setProperty("--page-right-margin", `${this.settings.marginRight * px}px`);
      this.stageEl.style.setProperty("--page-top-margin", `${this.settings.marginTop * px}px`);
      this.stageEl.classList.toggle("ruler-hidden", !this.settings.showRuler);
      this.syncControls();
      this.syncDocumentDecorations();
      this.renderRulers();
      this.updatePageCount();
    },
    syncControls() {
      const values = { pageSizeSelect: this.settings.size, orientationSelect: this.settings.orientation, marginTopInput: this.settings.marginTop, marginBottomInput: this.settings.marginBottom, marginLeftInput: this.settings.marginLeft, marginRightInput: this.settings.marginRight };
      Object.entries(values).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.value = value; });
      const toggle = document.getElementById("rulerToggle"); if (toggle) toggle.checked = !!this.settings.showRuler;
      const header = document.getElementById("headerTextInput"); if (header) header.value = DocumentModel.headerText || "";
      const footer = document.getElementById("footerTextInput"); if (footer) footer.value = DocumentModel.footerText || "";
      const pageNum = document.getElementById("pageNumberToggle"); if (pageNum) pageNum.checked = !!DocumentModel.showPageNumber;
      const first = document.getElementById("differentFirstPageToggle"); if (first) first.checked = !!DocumentModel.differentFirstPage;
      const range = document.getElementById("zoomRange"); if (range) range.value = this.settings.zoom;
      const label = `${this.settings.zoom}%`; ["zoomValueBtn", "zoomMenuValue"].forEach((id) => { const el = document.getElementById(id); if (el) el.textContent = label; });
    },
    updateDecoration(key, value) {
      if (key === "headerText" || key === "footerText") DocumentModel[key] = String(value || "").slice(0, 180);
      else DocumentModel[key] = !!value;
      DocumentModel.markDirty();
      this.syncDocumentDecorations();
    },
    syncDocumentDecorations() {
      const header = String(DocumentModel.headerText || "").trim();
      const footer = String(DocumentModel.footerText || "").trim();
      if (this.headerEl) { this.headerEl.textContent = header; this.headerEl.hidden = !header; }
      if (this.footerEl) {
        const parts = [];
        if (footer) parts.push(footer);
        if (DocumentModel.showPageNumber) parts.push("Página 1");
        this.footerEl.textContent = parts.join("  •  ");
        this.footerEl.hidden = !parts.length;
      }
      if (this.pageEl) this.pageEl.classList.toggle("has-document-header", !!header);
      if (this.pageEl) this.pageEl.classList.toggle("has-document-footer", !!footer || !!DocumentModel.showPageNumber);
      this.syncControls();
    },
    renderRulers() {
      if (!this.hRuler || !this.vRuler) return;
      const px = 37.7952755906 * (this.settings.zoom / 100);
      const d = this.dimensions();
      const w = d.width * px, h = d.height * px;
      this.hRuler.style.width = `${w}px`; this.vRuler.style.height = `${h}px`;
      const hs = document.getElementById("horizontalScale"), vs = document.getElementById("verticalScale");
      if (hs) hs.style.backgroundSize = `${px}px 100%`;
      if (vs) vs.style.backgroundSize = `100% ${px}px`;
      const lm = document.getElementById("leftMarginMarker"), rm = document.getElementById("rightMarginMarker"), tm = document.getElementById("topMarginMarker");
      if (lm) lm.style.left = `${this.settings.marginLeft * px}px`;
      if (rm) rm.style.right = `${this.settings.marginRight * px}px`;
      if (tm) tm.style.top = `${this.settings.marginTop * px}px`;
    },
    bindMarker(marker, id) {
      if (!marker) return;
      marker.addEventListener("pointerdown", (e) => {
        e.preventDefault(); marker.setPointerCapture?.(e.pointerId);
        const startX = e.clientX, startY = e.clientY;
        const start = { left: this.settings.marginLeft, right: this.settings.marginRight, top: this.settings.marginTop };
        const cmPerPx = 1 / (37.7952755906 * this.settings.zoom / 100);
        const move = (ev) => {
          if (id === "leftMarginMarker") this.settings.marginLeft = Math.max(0.5, Math.min(8, start.left + (ev.clientX - startX) * cmPerPx));
          else if (id === "rightMarginMarker") this.settings.marginRight = Math.max(0.5, Math.min(8, start.right - (ev.clientX - startX) * cmPerPx));
          else this.settings.marginTop = Math.max(0.5, Math.min(8, start.top + (ev.clientY - startY) * cmPerPx));
          this.apply();
        };
        const end = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); this.saveSettings(); };
        window.addEventListener("pointermove", move); window.addEventListener("pointerup", end, { once: true });
      });
    },
    updatePageCount() {
      if (!this.pageCountEl || !this.pageContentEl) return;
      const px = 37.7952755906;
      const d = this.dimensions();
      const printable = Math.max(100, (d.height - this.settings.marginTop - this.settings.marginBottom) * px);
      const contentHeight = Math.max(1, this.pageContentEl.scrollHeight - (this.settings.marginTop + this.settings.marginBottom) * px);
      const count = Math.max(1, Math.ceil(contentHeight / printable));
      this.pageCountEl.textContent = `Página ${Math.min(count, 999)} de ${Math.min(count, 999)}`;
      this.pageEl.dataset.pageCount = String(count);
    }
  };

  const StatusBar = { init(pageCountEl) { pageCountEl.textContent = "Página 1 de 1"; } };


  const OutputManager = {
    openFileMenu() { document.querySelector('[data-menu="archivo"]')?.click(); },
    safeName(ext) {
      const base = DocumentManager.safeFileName(DocumentModel.name || "Documento sin título")
        .replace(/\.[^.]+$/, "").trim() || "Documento";
      return `${DocumentManager.downloadFileName(base)}${ext}`;
    },
    exportHtml() {
      const html = DocumentManager.buildHtmlFile();
      DocumentManager.downloadFile(html, this.safeName(".html"), "text/html;charset=utf-8");
      DocumentManager.showToast("HTML exportado");
    },
    exportTxt() {
      const text = Editor.getPlainText();
      DocumentManager.downloadFile(text, this.safeName(".txt"), "text/plain;charset=utf-8");
      DocumentManager.showToast("TXT exportado");
    },
    print() {
      const area = document.getElementById("printArea");
      if (!area) return;
      const d = PageView.dimensions();
      const unit = "mm";
      const pxPerMm = 3.77952755906;
      const header = DocumentModel.headerText ? `<div class="print-header">${DocumentManager.escapeHtml(DocumentModel.headerText)}</div>` : "";
      const footerText = DocumentModel.footerText ? DocumentManager.escapeHtml(DocumentModel.footerText) : "";
      const footer = (footerText || DocumentModel.showPageNumber) ? `<div class="print-footer">${footerText}${footerText && DocumentModel.showPageNumber ? "  •  " : ""}${DocumentModel.showPageNumber ? "Página " : ""}<span class="print-page-number"></span></div>` : "";
      area.innerHTML = `<div class="print-page" style="width:${d.width}px;min-height:${d.height}px;padding:${PageView.settings.marginTop*10}${unit} ${PageView.settings.marginRight*10}${unit} ${PageView.settings.marginBottom*10}${unit} ${PageView.settings.marginLeft*10}${unit}">${header}${footer}${Editor.el.innerHTML}</div>`;
      area.style.display = "block";
      area.style.fontFamily = "Calibri, Arial, sans-serif";
      area.style.lineHeight = "1.5";
      area.querySelectorAll(".page-break").forEach(el => {
        el.style.breakBefore = "page";
        el.style.pageBreakBefore = "always";
      });
      const cleanup = () => {
        area.style.display = "none";
        area.innerHTML = "";
        window.removeEventListener("afterprint", cleanup);
      };
      window.addEventListener("afterprint", cleanup);
      window.print();
      // Some headless/embedded browsers do not emit afterprint.
      setTimeout(cleanup, 15000);
    },
    xmlEscape(value) {
      return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
    },
    htmlToDocxParagraphs() {
      const root = Editor.el;
      const blocks = [];
      const inlineRuns = (node) => {
        const runs = [];
        const visit = (n, marks = {}) => {
          if (n.nodeType === Node.TEXT_NODE) {
            const text = n.nodeValue || "";
            if (!text) return;
            const rPr = `${marks.bold ? "<w:b/>" : ""}${marks.italic ? "<w:i/>" : ""}${marks.underline ? "<w:u w:val=\"single\"/>" : ""}`;
            runs.push(`<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}<w:t xml:space="preserve">${this.xmlEscape(text)}</w:t></w:r>`);
            return;
          }
          if (n.nodeType !== Node.ELEMENT_NODE) return;
          const tag = n.tagName.toLowerCase();
          if (tag === "br") { runs.push("<w:r><w:br/></w:r>"); return; }
          if (tag === "img") {
            runs.push(`<w:r><w:t xml:space="preserve">[Imagen: ${this.xmlEscape(n.getAttribute("alt") || "imagen")}]</w:t></w:r>`);
            return;
          }
          const next = {
            bold: marks.bold || tag === "strong" || tag === "b",
            italic: marks.italic || tag === "em" || tag === "i",
            underline: marks.underline || tag === "u"
          };
          Array.from(n.childNodes).forEach(child => visit(child, next));
        };
        visit(node);
        return runs.join("");
      };
      const paragraphXml = (node) => {
        const tag = node && node.nodeType === Node.ELEMENT_NODE ? node.tagName.toLowerCase() : "";
        const pPr = /^h[1-6]$/.test(tag) ? `<w:pPr><w:pStyle w:val="Heading${tag.slice(1)}"/></w:pPr>` : "";
        const content = node ? inlineRuns(node) : "";
        return `<w:p>${pPr}${content || "<w:r><w:t></w:t></w:r>"}</w:p>`;
      };
      const tableXml = (table) => {
        const rows = Array.from(table.rows || []);
        if (!rows.length) return "";
        const gridCount = Math.max(1, ...rows.map(r => r.cells.length));
        const grid = `<w:tblGrid>${Array.from({length:gridCount},()=>'<w:gridCol w:w="2000"/>').join("")}</w:tblGrid>`;
        const rowXml = rows.map(row => {
          const cells = Array.from(row.cells).map(cell => {
            const content = Array.from(cell.childNodes).filter(n => !(n.nodeType === Node.TEXT_NODE && !n.nodeValue.trim()));
            let paragraphs = [];
            if (content.length) {
              const runs = inlineRuns(cell);
              paragraphs.push(`<w:p>${runs || '<w:r><w:t></w:t></w:r>'}</w:p>`);
            } else paragraphs.push('<w:p><w:r><w:t></w:t></w:r></w:p>');
            const isHeader = cell.tagName.toLowerCase() === "th";
            if (isHeader) paragraphs = paragraphs.map(x => x.replace('<w:p>', '<w:p><w:pPr><w:rPr><w:b/></w:rPr></w:pPr>'));
            return `<w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr>${paragraphs.join("")}</w:tc>`;
          }).join("");
          return `<w:tr>${cells}</w:tr>`;
        }).join("");
        return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>${grid}${rowXml}</w:tbl>`;
      };
      Array.from(root.childNodes).forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains("page-break")) {
          blocks.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
          return;
        }
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === "table") {
          blocks.push(tableXml(node));
          return;
        }
        const tag = node.nodeType === Node.ELEMENT_NODE ? node.tagName.toLowerCase() : "";
        const isBlock = node.nodeType === Node.ELEMENT_NODE && ["p","div","h1","h2","h3","h4","h5","h6","blockquote","pre","li"].includes(tag);
        if (isBlock || node.nodeType === Node.TEXT_NODE) blocks.push(paragraphXml(node));
        else blocks.push(paragraphXml(node));
      });
      if (!blocks.length) blocks.push("<w:p><w:r><w:t></w:t></w:r></w:p>");
      return blocks.join("");
    },
    crc32(data) {
      let crc = 0xFFFFFFFF;
      for (let i=0;i<data.length;i++) {
        crc ^= data[i];
        for (let j=0;j<8;j++) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
      }
      return (crc ^ 0xFFFFFFFF) >>> 0;
    },
    u16(v) { return new Uint8Array([v&255,(v>>>8)&255]); },
    u32(v) { return new Uint8Array([v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]); },
    concat(parts) {
      const total=parts.reduce((n,p)=>n+p.length,0), out=new Uint8Array(total); let at=0;
      parts.forEach(p=>{out.set(p,at);at+=p.length;}); return out;
    },
    zipStore(files) {
      const enc=new TextEncoder(), local=[], central=[]; let offset=0;
      const now=new Date(), dosTime=(now.getHours()<<11)|(now.getMinutes()<<5)|(Math.floor(now.getSeconds()/2));
      const dosDate=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
      files.forEach(([name,text])=>{
        const nb=enc.encode(name), data=enc.encode(text), crc=this.crc32(data);
        const lh=this.concat([this.u32(0x04034b50),this.u16(20),this.u16(0x0800),this.u16(0),this.u16(dosTime),this.u16(dosDate),this.u32(crc),this.u32(data.length),this.u32(data.length),this.u16(nb.length),this.u16(0),nb,data]);
        local.push(lh);
        const ch=this.concat([this.u32(0x02014b50),this.u16(20),this.u16(20),this.u16(0x0800),this.u16(0),this.u16(dosTime),this.u16(dosDate),this.u32(crc),this.u32(data.length),this.u32(data.length),this.u16(nb.length),this.u16(0),this.u16(0),this.u16(0),this.u16(0),this.u32(0),this.u32(offset),nb]);
        central.push(ch); offset += lh.length;
      });
      const centralBytes=this.concat(central), localBytes=this.concat(local), end=this.concat([
        this.u32(0x06054b50),this.u16(0),this.u16(0),this.u16(files.length),this.u16(files.length),
        this.u32(centralBytes.length),this.u32(localBytes.length),this.u16(0)
      ]);
      return this.concat([localBytes,centralBytes,end]);
    },
    exportDocx() {
      const title=this.xmlEscape(DocumentModel.name || "Mi Word");
      const body=this.htmlToDocxParagraphs();
      const docxMmToTwips = mm => Math.max(1, Math.round(Number(mm) / 25.4 * 1440));
      const page = PageView.dimensions();
      const pageW = docxMmToTwips(page.width), pageH = docxMmToTwips(page.height);
      const marginTop = docxMmToTwips(PageView.settings.marginTop);
      const marginRight = docxMmToTwips(PageView.settings.marginRight);
      const marginBottom = docxMmToTwips(PageView.settings.marginBottom);
      const marginLeft = docxMmToTwips(PageView.settings.marginLeft);
      const titlePg = DocumentModel.differentFirstPage ? '<w:titlePg/>' : '';
      const files=[
        ["[Content_Types].xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`],
        ["_rels/.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`],
        ["word/_rels/document.xml.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`],
        ["word/header1.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${this.xmlEscape(DocumentModel.headerText || "")}</w:t></w:r></w:p></w:hdr>`],
        ["word/footer1.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${this.xmlEscape(DocumentModel.footerText || "")}${DocumentModel.footerText && DocumentModel.showPageNumber ? " • " : ""}</w:t></w:r>${DocumentModel.showPageNumber ? '<w:r><w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple></w:r>' : ""}</w:p></w:ftr>`],
        ["word/document.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:pgSz w:w="${pageW}" w:h="${pageH}"/><w:pgMar w:top="${marginTop}" w:right="${marginRight}" w:bottom="${marginBottom}" w:left="${marginLeft}" w:header="720" w:footer="720" w:gutter="0"/>${titlePg}<w:headerReference w:type="default" r:id="rIdHeader"/><w:footerReference w:type="default" r:id="rIdFooter"/></w:sectPr></w:body></w:document>`],
        ["word/styles.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style></w:styles>`],
        ["docProps/core.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${title}</dc:title><dc:creator>Mi Word</dc:creator></cp:coreProperties>`],
        ["docProps/app.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Mi Word</Application></Properties>`]
      ];
      const bytes=this.zipStore(files);
      const blob=new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
      const url=URL.createObjectURL(blob), a=document.createElement("a");
      a.href=url; a.download=this.safeName(".docx"); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      DocumentManager.showToast("DOCX exportado");
    },
    init() {
      document.getElementById("printDocumentBtn")?.addEventListener("click",()=>{MenuBar.closeMenus();this.print();});
      document.getElementById("exportHtmlBtn")?.addEventListener("click",()=>{MenuBar.closeMenus();this.exportHtml();});
      document.getElementById("exportTxtBtn")?.addEventListener("click",()=>{MenuBar.closeMenus();this.exportTxt();});
      document.getElementById("exportDocxBtn")?.addEventListener("click",()=>{MenuBar.closeMenus();this.exportDocx();});
      document.addEventListener("keydown",e=>{
        if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==="p"){e.preventDefault();this.print();}
      });
    }
  };

  const SystemManager = {
    settings: { autosave: true, recovery: true, darkMode: false, reducedMotion: false, uiScale: "normal" },
    autosaveTimer: null,
    initialized: false,
    pendingRecovery: null,
    loadSettings() {
      try {
        const saved = JSON.parse(localStorage.getItem(SYSTEM_KEY) || "null");
        if (saved && typeof saved === "object") this.settings = { ...this.settings, ...saved };
      } catch (_) {}
      this.settings.uiScale = this.settings.uiScale === "large" ? "large" : "normal";
      this.settings.autosave = this.settings.autosave !== false;
      this.settings.recovery = this.settings.recovery !== false;
    },
    saveSettings() { try { localStorage.setItem(SYSTEM_KEY, JSON.stringify(this.settings)); } catch (_) {} },
    applySettings() {
      document.documentElement.classList.toggle("dark-mode", !!this.settings.darkMode);
      document.documentElement.classList.toggle("reduced-motion", !!this.settings.reducedMotion);
      document.documentElement.classList.toggle("ui-scale-large", this.settings.uiScale === "large");
      const ids = {
        autosaveToggle: this.settings.autosave, recoveryToggle: this.settings.recovery,
        darkModeToggle: this.settings.darkMode, reducedMotionToggle: this.settings.reducedMotion
      };
      Object.entries(ids).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.checked = !!value; });
      const scale = document.getElementById("uiScaleSelect"); if (scale) scale.value = this.settings.uiScale;
    },
    init() {
      this.loadSettings(); this.applySettings(); this.initialized = true;
      ["autosaveToggle", "recoveryToggle", "darkModeToggle", "reducedMotionToggle"].forEach(id => {
        document.getElementById(id)?.addEventListener("change", e => {
          const map = { autosaveToggle:"autosave", recoveryToggle:"recovery", darkModeToggle:"darkMode", reducedMotionToggle:"reducedMotion" };
          this.settings[map[id]] = e.target.checked; this.saveSettings(); this.applySettings();
          if (map[id] === "autosave" && e.target.checked) this.scheduleAutosave();
        });
      });
      document.getElementById("uiScaleSelect")?.addEventListener("change", e => { this.settings.uiScale = e.target.value === "large" ? "large" : "normal"; this.saveSettings(); this.applySettings(); });
      document.getElementById("clearRecoveryBtn")?.addEventListener("click", () => { this.clearRecovery(); DocumentManager.showToast("Recuperación eliminada"); });
      document.getElementById("closeRecoveryModal")?.addEventListener("click", () => this.closeRecovery(false));
      document.getElementById("discardRecoveryBtn")?.addEventListener("click", () => this.closeRecovery(true));
      document.getElementById("restoreRecoveryBtn")?.addEventListener("click", () => this.restoreRecovery());
      document.addEventListener("docmodel:change", () => { if (this.initialized && !DocumentModel.isSaved) this.scheduleAutosave(); });
      window.addEventListener("beforeunload", () => { if (!DocumentModel.isSaved) this.saveRecovery(); });
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && !DocumentModel.isSaved) this.saveRecovery(); });
      this.offerRecovery();
    },
    scheduleAutosave() {
      clearTimeout(this.autosaveTimer);
      if (!this.settings.autosave || DocumentModel.isSaved) return;
      this.autosaveTimer = setTimeout(() => this.saveRecovery(), 1200);
    },
    saveRecovery() {
      clearTimeout(this.autosaveTimer);
      if (!this.settings.recovery || DocumentModel.isSaved || !Editor.el) return;
      const payload = { version: 2, name: DocumentModel.name, content: Editor.el.innerHTML, savedContent: DocumentModel.savedContent, headerText: DocumentModel.headerText, footerText: DocumentModel.footerText, showPageNumber: DocumentModel.showPageNumber, differentFirstPage: DocumentModel.differentFirstPage, updatedAt: new Date().toISOString() };
      if (!StorageUtil.set(RECOVERY_KEY, payload)) DocumentManager.showToast("No se pudo actualizar la recuperación local");
    },
    readRecovery() { const data = StorageUtil.get(RECOVERY_KEY, null); return data && typeof data === "object" ? data : null; },
    clearRecovery() { StorageUtil.remove(RECOVERY_KEY); },
    offerRecovery() {
      if (!this.settings.recovery) return;
      const data = this.readRecovery();
      if (!data || !data.content || data.content === "<p><br></p>") return;
      if (data.content === DocumentModel.content) return;
      this.pendingRecovery = data;
      const info = document.getElementById("recoveryInfo");
      if (info) { const when = data.updatedAt ? new Date(data.updatedAt).toLocaleString() : "fecha desconocida"; info.textContent = `“${data.name || "Documento sin título"}” contiene cambios recuperables de ${when}.`; }
      const modal = document.getElementById("recoveryModal"); if (modal) modal.hidden = false;
    },
    closeRecovery(discard) { if (discard) this.clearRecovery(); this.pendingRecovery = null; const modal=document.getElementById("recoveryModal"); if(modal)modal.hidden=true; },
    restoreRecovery() {
      const data = this.pendingRecovery; if (!data) return;
      DocumentModel.replaceDocument({ id: DocumentManager.makeId(), name: data.name, content: data.content, saved: false, sourceType: "recovery", headerText: data.headerText, footerText: data.footerText, showPageNumber: data.showPageNumber, differentFirstPage: data.differentFirstPage });
      DocumentModel.savedContent = data.savedContent || "<p><br></p>";
      Editor.load(data.content); History.reset(Editor.el.innerHTML); PageView.syncDocumentDecorations(); TitleField.sync(); WordCounter.update(Editor.getPlainText());
      this.clearRecovery(); this.closeRecovery(false); Editor.focus(); DocumentModel.isSaved = false; document.dispatchEvent(new CustomEvent("docmodel:change"));
      DocumentManager.showToast("Sesión recuperada");
    }
  };

  const ReviewManager = {
    settings: { spellcheck: true, focusMode: false },
    load() {
      try { const saved = JSON.parse(localStorage.getItem("miword.review.v1") || "null"); if (saved && typeof saved === "object") this.settings = { ...this.settings, ...saved }; } catch (_) {}
    },
    save() { try { localStorage.setItem("miword.review.v1", JSON.stringify(this.settings)); } catch (_) {} },
    apply() {
      if (Editor.el) Editor.el.spellcheck = !!this.settings.spellcheck;
      document.documentElement.classList.toggle("focus-mode", !!this.settings.focusMode);
      const toggle = document.getElementById("spellcheckToggle"); if (toggle) toggle.checked = !!this.settings.spellcheck;
      const btn = document.getElementById("focusModeBtn"); if (btn) { btn.textContent = this.settings.focusMode ? "Salir del modo concentración" : "Modo concentración"; btn.setAttribute("aria-pressed", this.settings.focusMode ? "true" : "false"); }
    },
    clearFormatting() {
      if (!Editor.el) return;
      Editor.focus();
      try { document.execCommand("removeFormat", false, null); document.execCommand("formatBlock", false, "p"); } catch (_) {}
      Editor.handleInput();
      History.commitNow();
      DocumentManager.showToast("Formato borrado");
    },
    toggleFocus() { this.settings.focusMode = !this.settings.focusMode; this.save(); this.apply(); MenuBar.closeMenus(); if (this.settings.focusMode) Editor.focus(); },
    init() {
      this.load(); this.apply();
      document.getElementById("spellcheckToggle")?.addEventListener("change", e => { this.settings.spellcheck = e.target.checked; this.save(); this.apply(); });
      document.getElementById("clearFormattingBtn")?.addEventListener("click", () => { MenuBar.closeMenus(); this.clearFormatting(); });
      document.getElementById("focusModeBtn")?.addEventListener("click", () => this.toggleFocus());
      document.addEventListener("keydown", e => {
        if ((e.ctrlKey || e.metaKey) && !e.altKey && e.code === "Space" && Editor.el && document.activeElement === Editor.el) { e.preventDefault(); this.clearFormatting(); }
        if (e.key === "Escape" && this.settings.focusMode) { this.settings.focusMode = false; this.save(); this.apply(); Editor.focus(); }
      });
    }
  };

  const HomeManager = {
    templates: {
      blank: { name: "Documento sin título", content: "<p><br></p>" },
      school: { name: "Trabajo escolar", content: `<h1 style="text-align:center">Trabajo escolar</h1><p style="text-align:center">Nombre del alumno</p><p style="text-align:center">Materia · Grupo</p><p><br></p><h2>Introducción</h2><p>Escribe aquí la introducción de tu trabajo.</p><h2>Desarrollo</h2><p>Escribe aquí el contenido principal.</p><h2>Conclusión</h2><p>Escribe aquí la conclusión.</p>` },
      report: { name: "Informe", content: `<h1>Informe</h1><p><strong>Resumen</strong></p><p>Escribe aquí un breve resumen del documento.</p><h2>1. Introducción</h2><p>Presenta el tema y el propósito del informe.</p><h2>2. Desarrollo</h2><p>Escribe aquí los hallazgos, datos o argumentos principales.</p><h2>3. Conclusiones</h2><p>Resume las conclusiones más importantes.</p>` },
      letter: { name: "Carta", content: `<p style="text-align:right">Lugar y fecha</p><p>Asunto: ____________________</p><p>Estimado/a:</p><p>Escribe aquí el contenido de tu carta.</p><p>Atentamente,</p><p>Nombre</p>` },
      notes: { name: "Apuntes", content: `<h1>Apuntes</h1><ul><li>Idea principal</li><li>Concepto importante</li><li>Dato o ejemplo</li></ul><h2>Notas</h2><p>Escribe aquí tus notas y recordatorios.</p>` },
      resume: { name: "Currículum", content: `<h1>Nombre Apellido</h1><p>Perfil profesional · Ciudad · Contacto</p><h2>Perfil</h2><p>Escribe una breve descripción sobre ti.</p><h2>Experiencia</h2><p><strong>Puesto / Empresa</strong> — Fechas</p><p>Describe responsabilidades y logros.</p><h2>Educación</h2><p><strong>Institución</strong> — Estudios</p><h2>Habilidades</h2><ul><li>Habilidad 1</li><li>Habilidad 2</li></ul>` }
    },
    init() {
      this.screen = document.getElementById("startScreen");
      if (!this.screen) return;
      document.getElementById("startOpenBtn")?.addEventListener("click", () => this.openDocument());
      document.getElementById("startShowAllRecent")?.addEventListener("click", () => { this.hide(); DocumentManager.showRecents(); });
      this.screen.querySelectorAll("[data-template]").forEach((button) => {
        button.addEventListener("click", () => this.createFromTemplate(button.dataset.template));
      });
      this.renderRecent();
      // Si existe una recuperación pendiente, dejamos que el usuario la atienda primero.
      if (!SystemManager.pendingRecovery) this.show();
    },
    show() {
      if (!this.screen) return;
      this.renderRecent();
      this.screen.hidden = false;
      document.documentElement.dataset.startScreen = "open";
      document.body.classList.add("start-screen-open");
    },
    hide() {
      if (!this.screen) return;
      this.screen.hidden = true;
      document.documentElement.dataset.startScreen = "closed";
      document.body.classList.remove("start-screen-open");
    },
    openDocument() { this.hide(); DocumentManager.openFilePicker(); },
    createFromTemplate(key) {
      const template = this.templates[key] || this.templates.blank;
      if (!DocumentManager.confirmDiscard()) return;
      DocumentModel.replaceDocument({ id: DocumentManager.makeId(), name: template.name, content: template.content, saved: false, sourceType: "template", headerText: "", footerText: "", showPageNumber: false, differentFirstPage: false });
      PageView.syncDocumentDecorations();
      Editor.load(template.content); History.reset(Editor.el.innerHTML); TitleField.sync(); WordCounter.update(Editor.getPlainText());
      this.hide(); Editor.focus(); document.dispatchEvent(new CustomEvent("docmodel:change"));
    },
    renderRecent() {
      const container = document.getElementById("startRecentList");
      if (!container) return;
      const list = RecentDocuments.load().map((item) => LocalDocuments.get(item.id)).filter(Boolean).slice(0, 6);
      container.innerHTML = "";
      if (!list.length) {
        container.innerHTML = '<div class="start-recent-empty">Todavía no tienes documentos recientes. Crea uno nuevo o abre un archivo para empezar.</div>';
        return;
      }
      list.forEach((doc) => {
        const row = document.createElement("button"); row.type = "button"; row.className = "start-recent-row";
        const icon = document.createElement("span"); icon.className = "start-recent-icon"; icon.textContent = "M";
        const info = document.createElement("span"); info.className = "start-recent-info";
        const name = document.createElement("strong"); name.textContent = doc.name || "Documento sin título";
        const date = document.createElement("span"); date.textContent = doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : "Documento local";
        info.append(name, date); row.append(icon, info);
        row.addEventListener("click", () => { if (!DocumentManager.confirmDiscard()) return; DocumentModel.replaceDocument({ id: doc.id, name: doc.name, content: doc.content, saved: true, sourceType: "local", headerText: doc.headerText, footerText: doc.footerText, showPageNumber: doc.showPageNumber, differentFirstPage: doc.differentFirstPage }); Editor.load(doc.content); History.reset(Editor.el.innerHTML); PageView.syncDocumentDecorations(); TitleField.sync(); WordCounter.update(Editor.getPlainText()); this.hide(); Editor.focus(); });
        container.appendChild(row);
      });
    }
  };


  const TetordManager = {
    propsKey: "tetord.docprops.v1",
    init() {
      document.querySelectorAll("[data-tetord]").forEach(btn => btn.addEventListener("mousedown", e => e.preventDefault()));
      document.querySelectorAll("[data-tetord]").forEach(btn => btn.addEventListener("click", () => this.quick(btn.dataset.tetord)));
      const bind=(id,fn)=>document.getElementById(id)?.addEventListener("click",fn);
      bind("tetordParagraphBtn",()=>{MenuBar.closeMenus();this.openParagraph();});
      bind("tetordTocBtn",()=>{MenuBar.closeMenus();this.insertToc();});
      bind("tetordFootnoteBtn",()=>{MenuBar.closeMenus();this.insertFootnote();});
      bind("tetordEquationBtn",()=>{MenuBar.closeMenus();this.insertEquation();});
      bind("tetordSymbolBtn",()=>{MenuBar.closeMenus();this.insertSymbol();});
      bind("tetordBookmarkBtn",()=>{MenuBar.closeMenus();this.addBookmark();});
      bind("tetordDocPropsBtn",()=>{MenuBar.closeMenus();this.openProps();});
      bind("tetordMergeCellBtn",()=>{MenuBar.closeMenus();this.mergeCellRight();});
      bind("tetordSplitCellBtn",()=>{MenuBar.closeMenus();this.splitCell();});
      bind("closeTetordProps",()=>this.closeProps()); bind("tetordCancelProps",()=>this.closeProps()); bind("tetordSaveProps",()=>this.saveProps());
      bind("closeTetordParagraph",()=>this.closeParagraph()); bind("tetordApplyParagraph",()=>this.applyParagraph());
      Editor.el?.addEventListener("dblclick",e=>{const img=e.target.closest?.("img.document-image");if(img){ImageTools.select(img);}});
      this.loadProps();
    },
    quick(action) {
      Editor.saveSelection();
      if(action === "superscript" || action === "subscript") Editor.runCommand(action);
      if(action === "indent") Editor.runCommand("indent");
      if(action === "outdent") Editor.runCommand("outdent");
      if(action === "case") this.changeCase();
    },
    currentBlock() {
      const sel=window.getSelection(); if(!sel?.rangeCount) return null;
      let n=sel.anchorNode?.nodeType===3?sel.anchorNode.parentElement:sel.anchorNode;
      while(n && n!==Editor.el && !/^(P|DIV|H1|H2|H3|H4|H5|H6|BLOCKQUOTE|PRE|LI)$/.test(n.tagName)) n=n.parentElement;
      return n && n!==Editor.el ? n : null;
    },
    openParagraph() {
      const b=this.currentBlock(); if(!b){DocumentManager.showToast("Coloca el cursor en un párrafo primero");return;}
      const cs=getComputedStyle(b); document.getElementById("tetordBefore").value=Math.round(parseFloat(cs.marginTop)||0); document.getElementById("tetordAfter").value=Math.round(parseFloat(cs.marginBottom)||8);
      document.getElementById("tetordLineHeight").value=cs.lineHeight==="normal"?"1.5":(parseFloat(cs.lineHeight)/parseFloat(cs.fontSize)).toFixed(2);
      document.getElementById("tetordLeftIndent").value=Math.round(parseFloat(cs.marginLeft)||0); document.getElementById("tetordFirstIndent").value=Math.round(parseFloat(cs.textIndent)||0);
      const p=document.getElementById("tetordParagraphPanel");p.hidden=false;this.position(p,b);
    },
    applyParagraph() {
      const b=this.currentBlock();if(!b)return;
      const v=id=>Number(document.getElementById(id).value)||0; b.style.marginTop=`${Math.max(0,Math.min(200,v("tetordBefore")))}px`;b.style.marginBottom=`${Math.max(0,Math.min(200,v("tetordAfter")))}px`;b.style.lineHeight=document.getElementById("tetordLineHeight").value;b.style.marginLeft=`${Math.max(0,Math.min(300,v("tetordLeftIndent")))}px`;b.style.textIndent=`${Math.max(-100,Math.min(300,v("tetordFirstIndent")))}px`;Editor.handleInput();History.commitNow();this.closeParagraph();DocumentManager.showToast("Formato de párrafo aplicado");
    },
    closeParagraph(){const p=document.getElementById("tetordParagraphPanel");if(p)p.hidden=true;},
    position(panel,target){const r=target.getBoundingClientRect();panel.hidden=false;const w=panel.offsetWidth||320,h=panel.offsetHeight||300;panel.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+"px";panel.style.top=Math.max(8,Math.min(r.bottom+8,innerHeight-h-8))+"px";},
    changeCase(){const sel=window.getSelection();const text=sel?.toString();if(!text){DocumentManager.showToast("Selecciona texto primero");return;}const mode=window.prompt("Escribe: MAYÚSCULAS, minúsculas o Título", "MAYÚSCULAS");if(mode===null)return;let out=text;if(mode.toLowerCase().startsWith("min"))out=text.toLocaleLowerCase();else if(mode.toLowerCase().startsWith("tít")||mode.toLowerCase().startsWith("tit"))out=text.toLocaleLowerCase().replace(/(^|\s)(\S)/gu,(m,a,b)=>a+b.toLocaleUpperCase());else out=text.toLocaleUpperCase();document.execCommand("insertText",false,out);Editor.handleInput();History.commitNow();},
    insertText(text,html=text){Editor.restoreSelection();const sel=window.getSelection();if(!sel?.rangeCount){Editor.el.insertAdjacentHTML("beforeend",html);return;}const r=sel.getRangeAt(0);r.deleteContents();const box=document.createElement("span");box.innerHTML=html;r.insertNode(box);r.setStartAfter(box);r.collapse(true);Editor.saveSelection();Editor.handleInput();History.commitNow();Editor.focus();},
    insertSymbol(){const choices="© ® ™ € £ ¥ § ¶ • ° ± × ÷ ≤ ≥ ≠ ≈ ∞ √ ∑ π → ← ↑ ↓ … ✓ ★ ♫ ♥";const s=window.prompt("Símbolo a insertar:\n"+choices, "©");if(!s)return;this.insertText(s.slice(0,4));},
    insertEquation(){const eq=window.prompt("Escribe la ecuación (texto Unicode/LaTeX básico):", "x² + 2x + 1 = 0");if(eq===null)return;this.insertText(eq,`<span class="tetord-equation" role="math">${DocumentManager.escapeHtml(eq)}</span>`);},
    insertFootnote(){const note=window.prompt("Texto de la nota al pie:", "Nota al pie");if(note===null)return;const notes=Editor.el.querySelector(".tetord-footnotes")||(()=>{const d=document.createElement("section");d.className="tetord-footnotes";d.contentEditable="true";d.innerHTML="<hr><h3>Notas al pie</h3><ol></ol>";Editor.el.appendChild(d);return d;})();const ol=notes.querySelector("ol");const n=ol.children.length+1;const sup=document.createElement("sup");sup.className="tetord-footnote-ref";sup.textContent=String(n);sup.title=note;this.insertNode(sup);const li=document.createElement("li");li.textContent=note;ol.appendChild(li);Editor.handleInput();History.commitNow();},
    insertNode(node){Editor.restoreSelection();const sel=window.getSelection();if(sel?.rangeCount&&Editor.selectionInsideEditor()){const r=sel.getRangeAt(0);r.deleteContents();r.insertNode(node);r.setStartAfter(node);r.collapse(true);}else Editor.el.appendChild(node);Editor.saveSelection();},
    insertToc(){const heads=Array.from(Editor.el.querySelectorAll("h1,h2,h3")).filter(h=>h.textContent.trim()&&!h.closest(".tetord-toc"));if(!heads.length){DocumentManager.showToast("Primero agrega títulos con los estilos de encabezado");return;}Editor.el.querySelectorAll(".tetord-toc").forEach(x=>x.remove());heads.forEach((h,i)=>{if(!h.id)h.id=`tetord-heading-${Date.now()}-${i}`;});const toc=document.createElement("nav");toc.className="tetord-toc";toc.contentEditable="false";const title=document.createElement("strong");title.textContent="Tabla de contenido";toc.appendChild(title);const ul=document.createElement("ul");heads.forEach(h=>{const li=document.createElement("li");li.className=`toc-level-${h.tagName.slice(1)}`;const a=document.createElement("a");a.href="#";a.textContent=h.textContent.trim();a.addEventListener("click",e=>{e.preventDefault();h.scrollIntoView({behavior:"smooth",block:"center"});});li.appendChild(a);ul.appendChild(li);});toc.appendChild(ul);Editor.el.insertBefore(toc,Editor.el.firstChild);Editor.handleInput();History.commitNow();DocumentManager.showToast("Tabla de contenido actualizada");},
    addBookmark(){const b=this.currentBlock();if(!b){DocumentManager.showToast("Coloca el cursor en un párrafo");return;}const name=(window.prompt("Nombre del marcador:","seccion")||"").trim().replace(/[^a-zA-Z0-9_-]/g,"");if(!name)return;b.id=`tetord-bookmark-${name}`;b.dataset.bookmark=name;Editor.handleInput();History.commitNow();DocumentManager.showToast("Marcador creado");},
    cell(){const sel=window.getSelection();const node=sel?.anchorNode?.nodeType===3?sel.anchorNode.parentElement:sel?.anchorNode;return node?.closest?.("td,th")||null;},
    mergeCellRight(){const c=this.cell();if(!c){DocumentManager.showToast("Coloca el cursor dentro de una celda");return;}const next=c.nextElementSibling;if(!next){DocumentManager.showToast("No hay una celda a la derecha");return;}c.colSpan=(c.colSpan||1)+(next.colSpan||1);c.insertAdjacentHTML("beforeend",c.textContent.trim()?" ":"");while(next.firstChild)c.appendChild(next.firstChild);next.remove();Editor.handleInput();History.commitNow();DocumentManager.showToast("Celdas combinadas");},
    splitCell(){const c=this.cell();if(!c){DocumentManager.showToast("Coloca el cursor dentro de una celda");return;}const span=c.colSpan||1;if(span<2){DocumentManager.showToast("Esta celda no está combinada");return;}const tr=c.parentElement;const cells=[];const text=c.textContent; c.colSpan=1;c.textContent=text;for(let i=1;i<span;i++){const n=document.createElement(c.tagName.toLowerCase());n.innerHTML="<br>";tr.insertBefore(n,c.nextSibling);cells.push(n);}Editor.handleInput();History.commitNow();DocumentManager.showToast("Celda dividida");},
    openProps(){const d=StorageUtil.get(this.propsKey,{author:"",subject:"",keywords:""});document.getElementById("tetordAuthor").value=d.author||"";document.getElementById("tetordSubject").value=d.subject||"";document.getElementById("tetordKeywords").value=d.keywords||"";const p=document.getElementById("tetordPropsPanel");p.hidden=false;this.position(p,document.querySelector(".titlebar"));},
    saveProps(){StorageUtil.set(this.propsKey,{author:document.getElementById("tetordAuthor").value.trim(),subject:document.getElementById("tetordSubject").value.trim(),keywords:document.getElementById("tetordKeywords").value.trim()});this.closeProps();DocumentModel.markDirty();DocumentManager.showToast("Propiedades guardadas");},
    closeProps(){const p=document.getElementById("tetordPropsPanel");if(p)p.hidden=true;},
    loadProps(){return StorageUtil.get(this.propsKey,{author:"",subject:"",keywords:""});}
  };

  const App = {
    init() {
      Editor.init(document.getElementById("editor"));
      WordCounter.init(document.getElementById("wordCount"), document.getElementById("charCount"));
      Toolbar.init(document.querySelector(".toolbar"));
      DocumentManager.init();
      MenuBar.init(document.querySelector(".menubar"));
      TitleField.init(document.getElementById("docTitle"), document.getElementById("saveState"));
      StatusBar.init(document.getElementById("pageCount"));
      PageView.init();
      History.init();
      AdvancedTools.init();
      ImageTools.init();
      TableTools.init();
      ReviewManager.init();
      OutputManager.init();
      SystemManager.init();
      HomeManager.init();
      TetordManager.init();
      if (!SystemManager.pendingRecovery) Editor.focus();
    }
  };

  window.addEventListener("error", () => { DocumentManager.showToast("Mi Word encontró un error; tu recuperación local se mantiene si estaba activa."); });
  window.addEventListener("unhandledrejection", () => { DocumentManager.showToast("Una operación no pudo completarse."); });
  document.addEventListener("DOMContentLoaded", () => App.init());
  window.MiWord = { TetordManager, DocumentModel, Editor, History, WordCounter, Toolbar, RecentDocuments, LocalDocuments, DocumentManager, InsertManager, ImageTools, TableTools, AdvancedTools, ReviewManager, OutputManager, SystemManager, HomeManager, MenuBar, TitleField, PageView, StatusBar, App };
})();
