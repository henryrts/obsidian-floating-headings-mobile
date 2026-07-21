const {
  MarkdownView,
  Platform,
  Plugin,
  PluginSettingTab,
  Setting,
} = require("obsidian");

const DEFAULT_SETTINGS = {
  side: "right",
  verticalPosition: 50,
  maxHeadingLevel: 6,
  panelWidth: 280,
  panelMaxHeight: 520,
  closeAfterNavigation: true,
  showFilter: true,
};

class FloatingHeadingUI {
  constructor(plugin) {
    this.plugin = plugin;
    this.container = null;
    this.rail = null;
    this.panel = null;
    this.list = null;
    this.filter = null;
    this.view = null;
    this.headings = [];
    this.expanded = false;
    this.hoverTimer = null;
    this.outsideHandler = null;
    this.scrollHandler = null;
    this.isTouch =
      Platform.isMobile ||
      Boolean(
        window.matchMedia &&
          window.matchMedia("(hover: none), (pointer: coarse)").matches,
      );
  }

  mount(view, headings) {
    this.cleanup();
    this.view = view;
    this.headings = headings;

    const parent = this.findMountTarget(view);
    if (!parent) return;

    if (getComputedStyle(parent).position === "static") {
      parent.classList.add("floating-heading-mobile-relative");
    }

    this.container = document.createElement("div");
    this.container.className = "floating-heading-mobile";
    this.container.classList.toggle("is-touch", this.isTouch);
    this.container.classList.toggle("position-left", this.plugin.settings.side === "left");
    this.container.style.setProperty(
      "--fhm-vertical-position",
      `${this.plugin.settings.verticalPosition}%`,
    );
    this.container.style.setProperty(
      "--fhm-panel-width",
      `${this.plugin.settings.panelWidth}px`,
    );
    this.container.style.setProperty(
      "--fhm-panel-max-height",
      `${this.plugin.settings.panelMaxHeight}px`,
    );

    this.rail = document.createElement("button");
    this.rail.className = "floating-heading-mobile-rail";
    this.rail.type = "button";
    this.rail.setAttribute("aria-label", "Toggle floating headings");
    this.rail.setAttribute("aria-expanded", "false");

    this.panel = document.createElement("div");
    this.panel.className = "floating-heading-mobile-panel";
    this.panel.setAttribute("role", "navigation");
    this.panel.setAttribute("aria-label", "Document headings");

    if (this.plugin.settings.showFilter) {
      this.filter = document.createElement("input");
      this.filter.className = "floating-heading-mobile-filter";
      this.filter.type = "search";
      this.filter.placeholder = "Filter headings";
      this.filter.setAttribute("aria-label", "Filter headings");
      this.filter.addEventListener("input", () => this.renderList());
      this.panel.appendChild(this.filter);
    }

    this.list = document.createElement("div");
    this.list.className = "floating-heading-mobile-list";
    this.panel.appendChild(this.list);

    this.container.append(this.rail, this.panel);
    parent.appendChild(this.container);

    this.bindInteraction();
    this.renderRail();
    this.renderList();
    this.updateActiveHeading();
  }

  findMountTarget(view) {
    const selectors = view.getMode && view.getMode() === "preview"
      ? [".markdown-reading-view", ".view-content"]
      : [".cm-editor", ".view-content"];

    for (const selector of selectors) {
      const element = view.containerEl.querySelector(selector);
      if (element) return element;
    }
    return view.containerEl;
  }

  bindInteraction() {
    if (!this.container || !this.rail || !this.panel) return;

    this.rail.addEventListener("click", (event) => {
      if (!this.isTouch) return;
      event.preventDefault();
      event.stopPropagation();
      this.setExpanded(!this.expanded);
    });

    if (!this.isTouch) {
      const open = () => {
        if (this.hoverTimer) window.clearTimeout(this.hoverTimer);
        this.setExpanded(true);
      };
      const close = () => {
        this.hoverTimer = window.setTimeout(() => this.setExpanded(false), 80);
      };
      this.rail.addEventListener("mouseenter", open);
      this.panel.addEventListener("mouseenter", open);
      this.rail.addEventListener("mouseleave", close);
      this.panel.addEventListener("mouseleave", close);
    }

    this.outsideHandler = (event) => {
      if (
        this.isTouch &&
        this.expanded &&
        this.container &&
        !this.container.contains(event.target)
      ) {
        this.setExpanded(false);
      }
    };
    document.addEventListener("pointerdown", this.outsideHandler, true);

    let ticking = false;
    this.scrollHandler = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        this.updateActiveHeading();
        ticking = false;
      });
    };
    this.view.containerEl.addEventListener("scroll", this.scrollHandler, true);
  }

  setExpanded(expanded) {
    if (!this.panel || !this.rail) return;
    this.expanded = expanded;
    this.panel.classList.toggle("visible", expanded);
    this.rail.classList.toggle("active", expanded);
    this.rail.setAttribute("aria-expanded", String(expanded));
    if (expanded) this.updateActiveHeading();
    if (!expanded && this.filter) {
      this.filter.value = "";
      this.renderList();
    }
  }

  renderRail() {
    if (!this.rail) return;
    this.rail.replaceChildren();

    const maxLines = Math.min(this.headings.length, 28);
    for (let index = 0; index < maxLines; index += 1) {
      const heading = this.headings[index];
      const line = document.createElement("span");
      line.className = "floating-heading-mobile-line";
      line.dataset.level = String(heading.level);
      this.rail.appendChild(line);
    }
  }

  renderList() {
    if (!this.list) return;
    this.list.replaceChildren();

    const query = this.filter ? this.filter.value.trim().toLowerCase() : "";
    const fragment = document.createDocumentFragment();

    this.headings.forEach((heading, index) => {
      if (query && !heading.text.toLowerCase().includes(query)) return;

      const item = document.createElement("button");
      item.type = "button";
      item.className = "floating-heading-mobile-item";
      item.dataset.index = String(index);
      item.dataset.level = String(heading.level);
      item.style.setProperty("--fhm-level", String(heading.level));
      item.title = heading.text;

      const text = document.createElement("span");
      text.textContent = heading.text;
      item.appendChild(text);

      item.addEventListener("click", () => {
        this.navigateToHeading(heading, index);
      });

      fragment.appendChild(item);
    });

    this.list.appendChild(fragment);
  }

  navigateToHeading(heading, index) {
    if (!this.view) return;

    const mode = this.view.currentMode;
    if (mode && typeof mode.applyScroll === "function") {
      mode.applyScroll(heading.line);
    } else if (this.view.editor) {
      const cursor = { line: heading.line, ch: 0 };
      this.view.editor.setCursor(cursor);
      this.view.editor.scrollIntoView({ from: cursor, to: cursor }, true);
      this.view.editor.focus();
    } else {
      const renderedHeadings = this.getRenderedHeadings();
      const target = renderedHeadings[index];
      if (target) target.scrollIntoView({ block: "start", behavior: "smooth" });
    }

    this.setActiveIndex(index);
    if (this.isTouch || this.plugin.settings.closeAfterNavigation) {
      this.setExpanded(false);
    }
  }

  updateActiveHeading() {
    if (!this.view || this.headings.length === 0) return;

    if (this.view.editor && this.view.getMode && this.view.getMode() !== "preview") {
      const line = this.view.editor.getCursor().line;
      let active = 0;
      for (let index = 0; index < this.headings.length; index += 1) {
        if (this.headings[index].line <= line) active = index;
        else break;
      }
      this.setActiveIndex(active);
      return;
    }

    const rendered = this.getRenderedHeadings();
    if (rendered.length === 0) return;

    const topOffset = 120;
    let active = 0;
    for (let index = 0; index < rendered.length; index += 1) {
      if (rendered[index].getBoundingClientRect().top <= topOffset) active = index;
      else break;
    }
    this.setActiveIndex(Math.min(active, this.headings.length - 1));
  }

  getRenderedHeadings() {
    if (!this.view) return [];
    return Array.from(
      this.view.containerEl.querySelectorAll(
        ".markdown-reading-view h1, .markdown-reading-view h2, .markdown-reading-view h3, .markdown-reading-view h4, .markdown-reading-view h5, .markdown-reading-view h6",
      ),
    ).filter((element) => Number(element.tagName.slice(1)) <= this.plugin.settings.maxHeadingLevel);
  }

  setActiveIndex(index) {
    if (!this.list || !this.rail) return;
    this.list.querySelectorAll(".active").forEach((item) => item.classList.remove("active"));
    this.rail.querySelectorAll(".active").forEach((item) => item.classList.remove("active"));

    const item = this.list.querySelector(`[data-index="${index}"]`);
    if (item) {
      item.classList.add("active");
      if (this.expanded) item.scrollIntoView({ block: "nearest" });
    }

    const railLine = this.rail.children[index];
    if (railLine) railLine.classList.add("active");
  }

  cleanup() {
    if (this.hoverTimer) window.clearTimeout(this.hoverTimer);
    if (this.outsideHandler) {
      document.removeEventListener("pointerdown", this.outsideHandler, true);
    }
    if (this.view && this.scrollHandler) {
      this.view.containerEl.removeEventListener("scroll", this.scrollHandler, true);
    }
    if (this.container) this.container.remove();

    this.container = null;
    this.rail = null;
    this.panel = null;
    this.list = null;
    this.filter = null;
    this.view = null;
    this.headings = [];
    this.expanded = false;
    this.hoverTimer = null;
    this.outsideHandler = null;
    this.scrollHandler = null;
  }
}

class FloatingHeadingSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Panel side")
      .setDesc("Place the floating heading control on the left or right.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("left", "Left")
          .addOption("right", "Right")
          .setValue(this.plugin.settings.side)
          .onChange((value) => this.plugin.updateSetting("side", value)),
      );

    new Setting(containerEl)
      .setName("Vertical position")
      .setDesc("Position of the control from the top of the note.")
      .addSlider((slider) =>
        slider
          .setLimits(10, 90, 5)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.verticalPosition)
          .onChange((value) => this.plugin.updateSetting("verticalPosition", value)),
      );

    new Setting(containerEl)
      .setName("Maximum heading level")
      .setDesc("Show headings from H1 through this level.")
      .addSlider((slider) =>
        slider
          .setLimits(1, 6, 1)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.maxHeadingLevel)
          .onChange((value) => this.plugin.updateSetting("maxHeadingLevel", value)),
      );

    new Setting(containerEl)
      .setName("Panel width")
      .setDesc("Width of the expanded heading panel.")
      .addSlider((slider) =>
        slider
          .setLimits(200, 420, 20)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.panelWidth)
          .onChange((value) => this.plugin.updateSetting("panelWidth", value)),
      );

    new Setting(containerEl)
      .setName("Show filter")
      .setDesc("Show a heading search field in the expanded panel.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showFilter)
          .onChange((value) => this.plugin.updateSetting("showFilter", value)),
      );

    new Setting(containerEl)
      .setName("Close after navigation")
      .setDesc("Close the panel after selecting a heading. Always enabled on touch devices.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.closeAfterNavigation)
          .onChange((value) => this.plugin.updateSetting("closeAfterNavigation", value)),
      );
  }
}

module.exports = class FloatingHeadingMobilePlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.ui = new FloatingHeadingUI(this);

    this.addSettingTab(new FloatingHeadingSettingTab(this.app, this));
    this.addCommand({
      id: "toggle-floating-headings",
      name: "Toggle floating headings",
      callback: () => this.ui.setExpanded(!this.ui.expanded),
    });

    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.refresh()));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.refresh()));
    this.registerEvent(this.app.metadataCache.on("changed", () => this.refresh()));
    this.registerEvent(this.app.workspace.on("editor-change", () => this.ui.updateActiveHeading()));

    this.app.workspace.onLayoutReady(() => this.refresh());
  }

  onunload() {
    this.ui.cleanup();
  }

  getHeadings(view) {
    if (!view.file) return [];
    const cache = this.app.metadataCache.getFileCache(view.file);
    const headings = cache && cache.headings ? cache.headings : [];

    return headings
      .filter((heading) => heading.level <= this.settings.maxHeadingLevel)
      .map((heading) => ({
        text: heading.heading,
        level: heading.level,
        line: heading.position.start.line,
      }));
  }

  refresh() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      this.ui.cleanup();
      return;
    }

    const headings = this.getHeadings(view);
    if (headings.length === 0) {
      this.ui.cleanup();
      return;
    }

    this.ui.mount(view, headings);
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    await this.saveData(this.settings);
    this.refresh();
  }
};
