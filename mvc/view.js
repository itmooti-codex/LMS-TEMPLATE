import { uploadAndGetFileLink } from "../utils/upload.js";
export class AWCView {
  constructor({ mountId, modalRootId, postTextareaId, postButtonId, model }) {
    this.mount = [document.getElementById(mountId)];
    this.forumtSectionMount = document.getElementById(mountId);
    // this.announcementMountSection = document.getElementById(
    //   "announcements-section"
    // );
    this.modalRootId = modalRootId;
    this.postTextarea = document.getElementById(postTextareaId);
    this.postButton = document.getElementById(postButtonId);
    this.chatTemplateName = "PostTemplate";
    this.contentTemplateName = "ContentTemplate";
    this.announceTemplateName = "AnnouncementTemplate";
    this.model = model;
    this.__activePreviewURLs = new WeakMap();
    this.lessonActionHandler = null;
    this.bannerActionHandler = null;
    this.bannerButton = document.getElementById("course-resume-button");
    this.bannerClickHandler = null;
    this.progressState = {
      enrolmentId: Number(window.enrolmentId ?? 1),
      lastLessonId: null,
      inProgressLessonIds: [],
      completedLessonIds: [],
      lessonUrlMap: {},
    };
    this.lessonTemplateRegistered = false;
    this.init();
  }

  init() {
    this.createForumTemplate();
    // this.createContentTemplate();
    this.autoResizePostTextarea();
    this.mount.forEach((item) => {
      item.addEventListener("click", (e) => {
        const t = e.target.closest(".actionToggleButton");
        if (!t) return;
        const w = t.querySelector(".actionItemsWrapper");
        if (w) w.classList.toggle("hidden");
      });
    });
    this.getCommentValueObj();
    this.getReplyValueObj();
    this.initCommentReplyToggles();
    this.attachFileBtnHandler();
    this.deleteAttachFileHandler();
    this.implementToolbarEffect();
    this.setupBannerButton();
  }

  createContentTemplate() {
    if (!this.lessonTemplateRegistered) {
      $.views.helpers({
        normalizeProgress: function (progress) {
          const state =
            progress && typeof progress === "object" ? progress : {};
          if (!state._inProgressSet) {
            const arr = Array.isArray(state.inProgressLessonIds)
              ? state.inProgressLessonIds
              : [];
            state._inProgressSet = new Set(arr.map((id) => Number(id)));
          }
          if (!state._completedSet) {
            const arr = Array.isArray(state.completedLessonIds)
              ? state.completedLessonIds
              : [];
            state._completedSet = new Set(arr.map((id) => Number(id)));
          }
          state._lastLessonNumber =
            state.lastLessonId != null ? Number(state.lastLessonId) : null;
          return state;
        },
        lessonState: function (lessonId, progress) {
          const normalized = $.views.helpers.normalizeProgress(progress);
          const id = Number(lessonId);
          if (!id) return "not_started";
          if (normalized._lastLessonNumber === id) return "resume";
          if (normalized._completedSet.has(id)) return "completed";
          if (normalized._inProgressSet.has(id)) return "in_progress";
          return "not_started";
        },
        lessonButtonLabel: function (lessonId, progress) {
          const state = $.views.helpers.lessonState(lessonId, progress);
          if (state === "resume") return "Resume";
          if (state === "completed") return "Completed";
          return "Start";
        },
        lessonButtonClass: function (lessonId, progress) {
          const state = $.views.helpers.lessonState(lessonId, progress);
          const base =
            "lesson-launch inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
          if (state === "completed") {
            return `${base} bg-emerald-600 text-white hover:bg-emerald-500`; // same as "resume" state
          }

          if (state === "resume") {
            return `${base} bg-emerald-600 text-white hover:bg-emerald-500`;
          }
          return `${base} bg-sky-700 text-white hover:bg-sky-600`;
        },
        lessonHref: function (lessonId, progress) {
          const normalized = $.views.helpers.normalizeProgress(progress);
          const id = Number(lessonId);
          if (!id) return "#";
          const map = normalized?.lessonUrlMap ?? {};
          return map[id] || "#";
        },
        shouldOpenLesson: function (lessonId, progress) {
          const state = $.views.helpers.lessonState(lessonId, progress);
          if (state === "completed") return false;
          return $.views.helpers.lessonHref(lessonId, progress) !== "#";
        },
      });
      $.views.helpers.lessonTemplateRegistered = true;
    }

    const template = `<div>
        <p class="text-xs uppercase tracking-wider text-slate-500">Modules &amp; Lessons</p>
        <div class="mt-2 mb-6 flex items-end justify-between">
          <h1 class="text-2xl font-semibold tracking-tight text-slate-800">Course Content</h1>
        </div>
        <div class="border-t border-slate-200"></div>
        {{for modules ~progress=~root.progress}}
        <section class="flex flex-col gap-7 items-start py-6 border border-slate-200 rounded-xl px-4 my-4 bg-white card-hover">
          <div class="flex items-start gap-7 w-full flex-wrap md:flex-nowrap">
            <div class="flex items-start gap-3 w-full max-w-[460px] pl-4 sm:min-w-[280px]">
              <div class="flex items-center justify-center w-6 h-6 rounded-md border border-cyan-700 text-cyan-700 shrink-0 mt-1">
                <svg width="16" height="24" class="max-[800px]:!size-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.44444 9.27295H9.92593V9.87858H20.2963C20.6892 9.87858 21.066 10.0205 21.3439 10.2731C21.6217 10.5256 21.7778 10.8682 21.7778 11.2254V20.6533C21.7778 21.0105 21.6217 21.353 21.3439 21.6056C21.066 21.8582 20.6892 22.0001 20.2963 22.0001H5.48148C5.08857 22.0001 4.71175 21.8582 4.43392 21.6056C4.15608 21.353 4 21.0105 4 20.6533V11.2254C4 10.8682 4.15608 10.5256 4.43392 10.2731C4.71175 10.0205 5.08857 9.87858 5.48148 9.87858H8.44444V9.27295ZM13.6296 18.633V16.4974C14.1239 16.3386 14.5404 16.026 14.8057 15.6149C15.0709 15.2039 15.1678 14.7208 15.0791 14.2511C14.9905 13.7814 14.722 13.3553 14.3212 13.0481C13.9204 12.7409 13.4131 12.5725 12.8889 12.5725C12.3647 12.5725 11.8573 12.7409 11.4565 13.0481C11.0558 13.3553 10.7873 13.7814 10.6987 14.2511C10.61 14.7208 10.7069 15.2039 10.9721 15.6149C11.2374 16.026 11.6539 16.3386 12.1481 16.4974V18.633C12.1481 18.8116 12.2262 18.9829 12.3651 19.1092C12.504 19.2355 12.6924 19.3064 12.8889 19.3064C13.0853 19.3064 13.2738 19.2355 13.4127 19.1092C13.5516 18.9829 13.6296 18.8116 13.6296 18.633Z" fill="#007C8F"></path><path d="M9 10.182V6.54787C9.002 4.21375 7.4308 2.25781 5.3656 2.02326C3.3004 1.78871 1.4132 3.35191 1 5.63922" stroke="#007C8F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
              </div>
              <div class="flex flex-col gap-2 min-w-0">
                <h3 class="text-base leading-snug">{{:module_name}}</h3>
                <span class="text-sky-700 text-xs font-medium">Unlocked</span>
              </div>
            </div>
            <div class="flex flex-1 min-w-0 items-start justify-between gap-4 cursor-pointer" data-module-header>
              <p class="text-slate-600 max-w-[780px] text-[0.8rem] h-4 overflow-hidden whitespace-nowrap text-ellipsis">{{:description}}</p>
              <div class="flex items-center gap-7 shrink-0">
                <div class="flex items-center gap-6 text-slate-600">
                  {{if modules_length}}
                  <span class="inline-flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="#0ea5e9"><path d="M6.99998 1.1665C5.84625 1.1665 4.71844 1.50862 3.75915 2.1496C2.79986 2.79057 2.05219 3.70161 1.61068 4.76752C1.16917 5.83342 1.05365 7.00631 1.27873 8.13786C1.50381 9.26942 2.05938 10.3088 2.87519 11.1246C3.69099 11.9404 4.73039 12.496 5.86195 12.7211C6.99351 12.9462 8.16639 12.8306 9.2323 12.3891C10.2982 11.9476 11.2092 11.1999 11.8502 10.2407C12.4912 9.28137 12.8333 8.15356 12.8333 6.99984C12.8317 5.45324 12.2166 3.97046 11.123 2.87685C10.0294 1.78324 8.54657 1.16814 6.99998 1.1665ZM10.141 7.44855H6.99998C6.88097 7.44855 6.76684 7.40128 6.68268 7.31713C6.59853 7.23298 6.55126 7.11884 6.55126 6.99984V3.85881C6.55126 3.7398 6.59853 3.62567 6.68268 3.54152C6.76684 3.45737 6.88097 3.41009 6.99998 3.41009C7.11898 3.41009 7.23312 3.45737 7.31727 3.54152C7.40142 3.62567 7.44869 3.7398 7.44869 3.85881V6.55112H10.141C10.26 6.55112 10.3741 6.59839 10.4583 6.68254C10.5424 6.7667 10.5897 6.88083 10.5897 6.99984C10.5897 7.11884 10.5424 7.23298 10.4583 7.31713C10.3741 7.40128 10.26 7.44855 10.141 7.44855Z"/></svg>
                    <span class="text-xs font-medium text-slate-600">{{:modules_length}} min</span>
                  </span>
                  {{/if}}
                  {{if modules_unit}}
                  <span class="inline-flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="#0ea5e9"><path d="M4 6.75A1.75 1.75 0 0 1 5.75 5h12.5A1.75 1.75 0 0 1 20 6.75v10.5A1.75 1.75 0 0 1 18.25 19H5.75A1.75 1.75 0 0 1 4 17.25V6.75Zm2 .25v1.5h12V7H6Zm0 3v6.25h12V10H6Z"/></svg>
                    <span class="text-xs font-medium text-slate-600">{{:modules_unit}} Lessons</span>
                  </span>
                  {{/if}}
                </div>
                <button class="text-slate-500 hover:text-slate-700" data-module-toggle aria-expanded="false">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 transition-transform rotate-0" viewBox="0 0 24 24" fill="#0ea5e9"><path d="M6 9.75 12 15l6-5.25"/></svg>
                </button>
              </div>
            </div>
          </div>
          <div class="module-lessons hidden w-full mt-3 text-sm">
            {{for lessons}}
            <div class="flex items-stretch bg-sky-100 rounded-sm overflow-hidden mb-3 last:mb-0" data-lesson-row>
              <div class="w-16 bg-sky-700 text-white text-center py-4 font-semibold">{{:#index+1}}</div>
              <div class="flex-1 px-4 py-4 flex items-center justify-between flex-wrap gap-3">
                <div class="flex items-center gap-3">
                  {{if ~lessonState(id, ~progress) === 'completed'}}
                  <span class="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-semibold text-white">✓</span>
                  {{else ~lessonState(id, ~progress) === 'resume' || ~lessonState(id, ~progress) === 'in_progress'}}
                  <span class="h-4 w-4 rounded-full border-2 border-sky-500 bg-gradient-to-br from-sky-500/90 via-sky-400/70 to-white/80"></span>
                  {{else}}
                  <span class="h-4 w-4 rounded-full border-2 border-slate-300"></span>
                  {{/if}}
                  <span class="text-slate-800 font-medium text-sm">{{:lesson_name}}</span>
                </div>
                <div class="flex items-center gap-4">
                  {{if lesson_length}}
                  <span class="inline-flex items-center gap-1 text-sky-800 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="#0ea5e9"><path d="M6.99998 1.1665C5.84625 1.1665 4.71844 1.50862 3.75915 2.1496C2.79986 2.79057 2.05219 3.70161 1.61068 4.76752C1.16917 5.83342 1.05365 7.00631 1.27873 8.13786C1.50381 9.26942 2.05938 10.3088 2.87519 11.1246C3.69099 11.9404 4.73039 12.496 5.86195 12.7211C6.99351 12.9462 8.16639 12.8306 9.2323 12.3891C10.2982 11.9476 11.2092 11.1999 11.8502 10.2407C12.4912 9.28137 12.8333 8.15356 12.8333 6.99984C12.8317 5.45324 12.2166 3.97046 11.123 2.87685C10.0294 1.78324 8.54657 1.16814 6.99998 1.1665ZM10.141 7.44855H6.99998C6.88097 7.44855 6.76684 7.40128 6.68268 7.31713C6.59853 7.23298 6.55126 7.11884 6.55126 6.99984V3.85881C6.55126 3.7398 6.59853 3.62567 6.68268 3.54152C6.76684 3.45737 6.88097 3.41009 6.99998 3.41009C7.11898 3.41009 7.23312 3.45737 7.31727 3.54152C7.40142 3.62567 7.44869 3.7398 7.44869 3.85881V6.55112H10.141C10.26 6.55112 10.3741 6.59839 10.4583 6.68254C10.5424 6.7667 10.5897 6.88083 10.5897 6.99984C10.5897 7.11884 10.5424 7.23298 10.4583 7.31713C10.3741 7.40128 10.26 7.44855 10.141 7.44855Z"/></svg>
                    <span>{{:lesson_length}} min</span>
                  </span>
                  {{/if}}
                 <a
                    data-lesson-action="launch"
                    data-lesson-id="{{:id}}"
                    data-module-id="{{:#parent.data.id}}"
                    data-module-name="{{:#parent.data.module_name}}"
                    data-lesson-status="{{:~lessonState(id, ~progress)}}"
                    class="{{:~lessonButtonClass(id, ~progress)}}"
                    href="{{:~lessonHref(id, ~progress)}}"
                  >
                    <span>{{:~lessonButtonLabel(id, ~progress)}}</span>
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="#0ea5e9"><path d="M9.5 7l5 5-5 5"/></svg>
                  </a>

                </div>
              </div>
            </div>
            {{/for}}
          </div>
        </section>
        {{/for}}
      </div>`;

    if (!$.templates[this.contentTemplateName])
      $.templates(this.contentTemplateName, template);
  }

  updateCourseHeader(courseName = "") {
    const el = document.getElementById("course-title");
    if (!el) return;

    const fallback = el.getAttribute("data-default-title") ?? "";
    const nextTitle = courseName?.trim() ? courseName : fallback;
    el.textContent = nextTitle;

    if (courseName?.trim()) {
      document.title = courseName;
    }
  }

  renderCourseContent({ modules = [], progress = this.progressState } = {}) {
    this.createContentTemplate();
    const mount = document.getElementById("content-section");
    if (!Array.isArray(modules) || modules.length === 0) {
      if (mount) mount.innerHTML = "";
      return;
    }
    this.progressState = progress || this.progressState;
    const html = $.render[this.contentTemplateName]({
      modules,
      progress: this.progressState,
    });
    if (mount) {
      mount.innerHTML = html;
      this.attachModuleToggleHandlers(mount);
      this.bindLessonButtons(mount);
    }
  }

  attachModuleToggleHandlers(scope = document) {
    const togglePanel = (button) => {
      const section = button.closest("section");
      const panel = section?.querySelector(".module-lessons");
      if (!panel) return;
      const willShow = panel.classList.contains("hidden");
      panel.classList.toggle("hidden");
      // Expand/collapse the description to its needed height when toggling
      const desc = section?.querySelector("[data-module-header] > p");
      if (desc) {
        const clampClasses = [
          "h-4",
          "overflow-hidden",
          "whitespace-nowrap",
          "text-ellipsis",
        ];
        if (willShow) {
          clampClasses.forEach((c) => desc.classList.remove(c));
        } else {
          clampClasses.forEach((c) => desc.classList.add(c));
        }
      }
      const icon = button.querySelector("svg");
      if (icon) icon.classList.toggle("rotate-180", willShow);
      button.setAttribute("aria-expanded", String(willShow));
    };
    scope.querySelectorAll("[data-module-toggle]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePanel(btn);
      });
    });
    scope.querySelectorAll("[data-module-header]").forEach((header) => {
      header.addEventListener("click", () => {
        const btn = header
          .closest("section")
          ?.querySelector("[data-module-toggle]");
        if (btn) togglePanel(btn);
      });
    });
  }

  registerLessonActionHandler(handler) {
    this.lessonActionHandler = handler;
  }

  registerBannerActionHandler(handler) {
    this.bannerActionHandler = handler;
    this.setupBannerButton();
  }

  setupBannerButton() {
    if (!this.bannerButton) return;
    if (this.bannerClickHandler) {
      this.bannerButton.removeEventListener("click", this.bannerClickHandler);
    }
    this.bannerClickHandler = (event) => {
      if (typeof this.bannerActionHandler === "function") {
        this.bannerActionHandler({
          event,
          lessonId: this.bannerButton.dataset.lessonId,
          url: this.bannerButton.dataset.href,
        });
      }
    };
    this.bannerButton.addEventListener("click", this.bannerClickHandler);
  }

  bindLessonButtons(scope = document) {
    const buttons = scope.querySelectorAll("[data-lesson-action='launch']");
    buttons.forEach((button) => {
      button.addEventListener("click", (event) => {
        if (typeof this.lessonActionHandler !== "function") return;
        this.lessonActionHandler({
          event,
          lessonId: button.dataset.lessonId,
          moduleId: button.dataset.moduleId,
          moduleName: button.dataset.moduleName,
          lessonStatus: button.dataset.lessonStatus,
          url: button.getAttribute("href"),
        });
      });
    });
  }

  updateResumeBanner(progress = this.progressState) {
    this.progressState = progress || this.progressState;
    const button = this.bannerButton;
    const label = document.getElementById("course-resume-label");
    const details = document.getElementById("resume-details");
    const lessonNameEl = document.getElementById("resume-lesson-name");
    const moduleNameEl = document.getElementById("resume-module-name");

    if (!button || !label) return;

    const hasLastLesson = Boolean(progress?.lastLessonId);
    const buttonState = hasLastLesson ? "resume" : "start";
    const btnLabel = hasLastLesson ? "Resume" : "Start";
    label.textContent = btnLabel;
    button.dataset.state = buttonState;
    button.dataset.lessonId = hasLastLesson
      ? String(progress.lastLessonId)
      : "";
    button.dataset.href = progress?.resumeUrl ?? "";

    if (hasLastLesson && details && lessonNameEl && moduleNameEl) {
      details.classList.remove("hidden");
      lessonNameEl.textContent = progress?.resumeLessonName ?? "";
      const moduleName = progress?.resumeModuleName ?? "";
      moduleNameEl.textContent = moduleName ? `(${moduleName})` : "";
    } else if (details) {
      details.classList.add("hidden");
      if (lessonNameEl) lessonNameEl.textContent = "";
      if (moduleNameEl) moduleNameEl.textContent = "";
    }
  }

  createForumTemplate() {
    const normType = (t) =>
      String(t || "")
        .toLowerCase()
        .trim();
    $.views.helpers({
      isVideo: function (type) {
        return String(type) === "Video";
      },
      isImage: function (type) {
        return String(type) === "Image";
      },
      isAudio: function (type) {
        return String(type) === "Audio";
      },
      audioPlayerHtml: (src, fileName, id) =>
        this.audioPlayerHtml({ src, fileName, id }),
    });
    $.views.converters("raw", (v) => v);

    const template = `<div current-post-id="{{:postId}}" class="relative bg-white rounded p-3 mb-4 postCard border border-[#F2F2F2]">

    {{if canDelete || forum_type === 'Announcement'}}
    <div class="absolute top-4 right-4 flex items-center gap-3">
        
        {{if canDelete}}
        <div class="cursor-pointer actionToggleButton relative w-max ml-auto">
            <!-- kebab -->
            <svg width="20" height="20" viewBox="0 0 4 14" xmlns="http://www.w3.org/2000/svg"
                class="fill-[#414042]">
                <path
                    d="M3.45679 6.99992C3.45679 7.34176 3.35542 7.67593 3.1655 7.96016C2.97558 8.2444 2.70565 8.46593 2.38982 8.59675C2.074 8.72757 1.72648 8.76179 1.3912 8.6951C1.05593 8.62841 0.747957 8.4638 0.506236 8.22208C0.264516 7.98036 0.0999019 7.67239 0.0332114 7.33711C-0.0334791 7.00184 0.000748884 6.65431 0.131567 6.33849C0.262385 6.02267 0.483918 5.75273 0.768151 5.56281C1.05238 5.37289 1.38655 5.27152 1.7284 5.27152C2.18679 5.27152 2.62642 5.45362 2.95056 5.77776C3.27469 6.1019 3.45679 6.54152 3.45679 6.99992Z" />
                <path
                    d="M1.7284 3.79C2.07024 3.79 2.40441 3.68867 2.68864 3.49876C2.97287 3.30884 3.19441 3.0389 3.32522 2.72308C3.45604 2.40725 3.49027 2.05973 3.42358 1.72445C3.35689 1.38918 3.19228 1.08121 2.95056 0.839488C2.70884 0.597768 2.40086 0.433154 2.06559 0.366463C1.73031 0.299773 1.38279 0.334001 1.06697 0.464819C0.751145 0.595637 0.481206 0.81717 0.291288 1.1014C0.101369 1.38564 0 1.7198 0 2.06165C0 2.52 0.182099 2.95967 0.506236 3.28381C0.830373 3.60794 1.27 3.79 1.7284 3.79Z" />
                <path
                    d="M1.7284 10.21C1.38655 10.21 1.05238 10.3112 0.768151 10.5011C0.483918 10.691 0.262385 10.9609 0.131567 11.2768C0.000748884 11.5926 -0.0334791 11.9401 0.0332114 12.2754C0.0999019 12.6107 0.264516 12.9186 0.506236 13.16C0.747957 13.4021 1.05593 13.5667 1.3912 13.6334C1.72648 13.7001 2.074 13.6658 2.38982 13.535C2.70565 13.4042 2.97558 13.1827 3.1655 12.8984C3.35542 12.6142 3.45679 12.28 3.45679 11.9382C3.45679 11.48 3.27469 11.04 2.95056 10.716C2.62642 10.3919 2.18679 10.21 1.7284 10.21Z" />
            </svg>
            <div
                class="actionItemsWrapper shadow-lg absolute top-[1rem] right-0 flex flex-col gap-3 p-2 bg-white w-max hidden">
                <button type="button" class="deletePostButton text-red-500 hover:text-red-700 focus:outline-none"
                    data-action="delete-request" data-post-id="{{:postId}}">
                    Delete
                </button>
            </div>
        </div>
        {{/if}}
    </div>
    {{/if}}

    <!-- POST HEADER -->
    <div class="flex items-center gap-4">
        <img class="w-6 h-6 rounded-full border border-[#d3d3d3]"
            src="{{:authorImage || 'https://i.ontraport.com/265848.fef288b2e2a570a362d1141a783309d8.JPEG'}}">
        <div class="flex flex-wrap items-center gap-4">
            <div class="text-[#414042] button max-[600px]:tracking-[0.86px] line-clamp-1">{{:author}}</div>
            <div class="py-1.5 px-3 bg-[#c7e6e6] rounded-[36px] font-[400] text-[12px] text-[#414042] line-clamp-1">
                {{:designation}}</div>
            <div class="w-[2px] h-[15px] bg-[#bbbcbb] max-[600px]:hidden"></div>
            <div class="text-[#586a80] small-text line-clamp-1">{{:published_days_ago}}</div>
    {{if forum_type === 'Announcement'}}
        <span class="inline-flex items-center justify-center rounded-full bg-sky-100 p-2" title="Announcement">
            <svg class="w-4 h-4 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0v4L4 14v2h16v-2l-2-2V8"></path>
                <path d="M9 18h6"></path>
            </svg>
        </span>
        {{/if}}

        </div>
    </div>

    <!-- POST BODY -->
    <div class="my-2 content-container">
        {{:copy}}
    </div>

    {{if fileLink}}
    <div class="mt-2 mb-4 w-full">
        {{if ~isVideo(fileType)}}
        <video class="w-full rounded" src="{{:fileLink}}" controls preload="metadata" playsinline></video>

        {{else ~isImage(fileType)}}
        <!-- Add a <picture> with AVIF source to maximize compatibility -->
        <picture>
            <source srcset="{{:fileLink}}" type="image/avif">
            <img src="{{:fileLink}}" alt="{{:fileName}}" class="w-full rounded">
        </picture>

        {{else ~isAudio(fileType)}}
      {{raw: ~audioPlayerHtml(fileLink, fileName, postId)}}

        {{else}}
        <a href="{{:fileLink}}" target="_blank" rel="noopener" class="underline text-[#007C8F] mobile-ellipsis-link">
            {{:fileName}}
        </a>
        {{/if}}
    </div>
    {{/if}}




    <!-- POST ACTIONS -->
    <div class="flex items-center gap-4">
        <button class="roundedButton {{:voteId ? 'is-voted' : ''}}" data-action="upvote-post" data-post-id="{{:postId}}"
            data-vote-id="{{:voteId}}">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="{{:voteId ? 'white' : '#007C8F'}}"
                xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M14.3092 5.81653C14.1751 5.66459 14.0103 5.54291 13.8255 5.45958C13.6408 5.37625 13.4405 5.33318 13.2378 5.33322H9.90462V4.38087C9.90462 3.74942 9.65378 3.14384 9.20728 2.69734C8.76079 2.25084 8.1552 2 7.52376 2C7.43529 1.99994 7.34856 2.02452 7.27329 2.07099C7.19801 2.11746 7.13717 2.18397 7.09758 2.26309L4.84885 6.76174H2.28584C2.03327 6.76174 1.79103 6.86207 1.61243 7.04067C1.43383 7.21927 1.3335 7.46151 1.3335 7.71409V12.952C1.3335 13.2046 1.43383 13.4468 1.61243 13.6254C1.79103 13.804 2.03327 13.9043 2.28584 13.9043H12.5236C12.8716 13.9045 13.2077 13.7775 13.4688 13.5474C13.7298 13.3172 13.8979 12.9997 13.9414 12.6544L14.6557 6.9403C14.681 6.73913 14.6632 6.53488 14.6034 6.34112C14.5437 6.14736 14.4434 5.96854 14.3092 5.81653ZM2.28584 7.71409H4.66671V12.952H2.28584V7.71409Z" />
            </svg>
            <p class="text-label vote-count">{{:voteCount}}</p>
        </button>

        <div class="text-[#007b8e] text-label cursor-pointer" data-action="toggle-comment" data-post-id="{{:postId}}">
            Comment
        </div>
    </div>

    <!-- COMMENTS WRAPPER (per post) -->
    <div class="flex items-center gap-x-3 my-2" id="comments-{{:postId}}">
        {{if Comment && Comment.length}}
        <div class="h-[1px] w-full bg-[#bbbcbb]"></div>
        <div class="label flex items-center gap-x-2 cursor-pointer" ">
                <span class=" label whitespace-nowrap text-[#007c8f]">{{:Comment.length}} Comments</span>
            <span class="transition-transform duration-300 inline-block rotate-180">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M10.8668 4.27635L6.32157 8.82158C6.27936 8.86383 6.22923 8.89736 6.17405 8.92023C6.11888 8.94311 6.05973 8.95488 6 8.95488C5.94027 8.95488 5.88112 8.94311 5.82594 8.92023C5.77077 8.89736 5.72064 8.86383 5.67842 8.82158L1.1332 4.27635C1.04791 4.19106 1 4.07539 1 3.95478C1 3.83416 1.04791 3.71849 1.1332 3.6332C1.21849 3.54791 1.33416 3.5 1.45478 3.5C1.57539 3.5 1.69106 3.54791 1.77635 3.6332L6 7.85742L10.2236 3.6332C10.2659 3.59097 10.316 3.55747 10.3712 3.53462C10.4264 3.51176 10.4855 3.5 10.5452 3.5C10.6049 3.5 10.6641 3.51176 10.7193 3.53462C10.7744 3.55747 10.8246 3.59097 10.8668 3.6332C10.909 3.67543 10.9425 3.72556 10.9654 3.78074C10.9882 3.83592 11 3.89505 11 3.95478C11 4.0145 10.9882 4.07363 10.9654 4.12881C10.9425 4.18399 10.909 4.23412 10.8668 4.27635Z"
                        fill="#007C8F" />
                </svg>
            </span>
        </div>
        <div class="h-[1px] w-full bg-[#bbbcbb]"></div>
    </div>


    <!-- Each comment -->
    {{for Comment}}
    <div id="{{:id}}" current-post-id="{{:#data.id}}" class="ml-3 mt-2 p-2 border-l-[1px] border-[#007c8f] commentCard">

        <div class="cursor-pointer actionToggleButton relative w-max ml-auto">
            <svg width="4" height="14" viewBox="0 0 4 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M3.45679 6.99992C3.45679 7.34176 3.35542 7.67593 3.1655 7.96016C2.97558 8.2444 2.70565 8.46593 2.38982 8.59675C2.074 8.72757 1.72648 8.76179 1.3912 8.6951C1.05593 8.62841 0.747957 8.4638 0.506236 8.22208C0.264516 7.98036 0.0999019 7.67239 0.0332114 7.33711C-0.0334791 7.00184 0.000748884 6.65431 0.131567 6.33849C0.262385 6.02267 0.483918 5.75273 0.768151 5.56281C1.05238 5.37289 1.38655 5.27152 1.7284 5.27152C2.18679 5.27152 2.62642 5.45362 2.95056 5.77776C3.27469 6.1019 3.45679 6.54152 3.45679 6.99992Z"
                    fill="#414042" />
                <path
                    d="M1.7284 3.79C2.07024 3.79 2.40441 3.68867 2.68864 3.49876C2.97287 3.30884 3.19441 3.0389 3.32522 2.72308C3.45604 2.40725 3.49027 2.05973 3.42358 1.72445C3.35689 1.38918 3.19228 1.08121 2.95056 0.839488C2.70884 0.597768 2.40086 0.433154 2.06559 0.366463C1.73031 0.299773 1.38279 0.334001 1.06697 0.464819C0.751145 0.595637 0.481206 0.81717 0.291288 1.1014C0.101369 1.38564 0 1.7198 0 2.06165C0 2.52 0.182099 2.95967 0.506236 3.28381C0.830373 3.60794 1.27 3.79 1.7284 3.79Z"
                    fill="#414042" />
                <path
                    d="M1.7284 10.21C1.38655 10.21 1.05238 10.3112 0.768151 10.5011C0.483918 10.691 0.262385 10.9609 0.131567 11.2768C0.000748884 11.5926 -0.0334791 11.9401 0.0332114 12.2754C0.0999019 12.6107 0.264516 12.9186 0.506236 13.16C0.747957 13.4021 1.05593 13.5667 1.3912 13.6334C1.72648 13.7001 2.074 13.6658 2.38982 13.535C2.70565 13.4042 2.97558 13.1827 3.1655 12.8984C3.35542 12.6142 3.45679 12.28 3.45679 11.9382C3.45679 11.48 3.27469 11.04 2.95056 10.716C2.62642 10.3919 2.18679 10.21 1.7284 10.21Z"
                    fill="#414042" />
            </svg>
            <div class="actionItemsWrapper shadow-lg absolute top-[1rem] right-0 flex flex-col gap-3 p-2 bg-white w-max hidden"
                id="commentDelete-{{:id}}">
                <button class="text-red-500 hover:text-red-700 focus:outline-none deleteCommentButton"
                    data-action="delete-comment-request" data-comment-id="{{:id}}">Delete</button>
            </div>
        </div>

        <div class="flex items-center gap-4">
            <img class="w-6 h-6 rounded-full border border-[#d3d3d3]"
                src="{{:avatar || 'https://i.ontraport.com/265848.fef288b2e2a570a362d1141a783309d8.JPEG'}}">
            <div class="flex items-center gap-4">
                <div class="text-[#414042] button max-[600px]:tracking-[0.86px] line-clamp-1">{{:author}}</div>
                {{if designation}}
                <div class="py-1.5 px-3 bg-[#c7e6e6] rounded-[36px] font-400 text-[12px] text-dark line-clamp-1">
                    {{:designation}}</div>
                {{/if}}
                <div class="w-[2px] h-[15px] bg-[#bbbcbb] max-[600px]:hidden"></div>
                <div class="text-[#586a80] small-text line-clamp-1">{{:published}}</div>
            </div>
        </div>

        <div class="my-2 content-container">
            {{:comment}}
        </div>

        {{if fileLink}}
        <div class="mt-2 mb-4 w-full">
            {{if ~isVideo(fileType)}}
            <video class="w-full rounded" src="{{:fileLink}}" controls preload="metadata" playsinline></video>

            {{else ~isImage(fileType)}}
            <!-- Add a <picture> with AVIF source to maximize compatibility -->
            <picture>
                <source srcset="{{:fileLink}}" type="image/avif">
                <img src="{{:fileLink}}" alt="{{:fileName}}" class="w-full rounded">
            </picture>

            {{else ~isAudio(fileType)}}
           {{raw: ~audioPlayerHtml(fileLink, fileName, postId)}}

            {{else}}
            <a href="{{:fileLink}}" target="_blank" rel="noopener" class="underline text-[#007C8F] mobile-ellipsis-link">
                {{:fileName}}
            </a>
            {{/if}}
        </div>
        {{/if}}




        <div class="flex items-center gap-4">
            <button class="roundedButton {{:voteId ? 'is-voted' : ''}}" data-action="upvote-comment"
                data-comment-id="{{:id}}" data-vote-id="{{:#data.voteId}}">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="#007C8F" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M14.3092 5.81653C14.1751 5.66459 14.0103 5.54291 13.8255 5.45958C13.6408 5.37625 13.4405 5.33318 13.2378 5.33322H9.90462V4.38087C9.90462 3.74942 9.65378 3.14384 9.20728 2.69734C8.76079 2.25084 8.1552 2 7.52376 2C7.43529 1.99994 7.34856 2.02452 7.27329 2.07099C7.19801 2.11746 7.13717 2.18397 7.09758 2.26309L4.84885 6.76174H2.28584C2.03327 6.76174 1.79103 6.86207 1.61243 7.04067C1.43383 7.21927 1.3335 7.46151 1.3335 7.71409V12.952C1.3335 13.2046 1.43383 13.4468 1.61243 13.6254C1.79103 13.804 2.03327 13.9043 2.28584 13.9043H12.5236C12.8716 13.9045 13.2077 13.7775 13.4688 13.5474C13.7298 13.3172 13.8979 12.9997 13.9414 12.6544L14.6557 6.9403C14.681 6.73913 14.6632 6.53488 14.6034 6.34112C14.5437 6.14736 14.4434 5.96854 14.3092 5.81653ZM2.28584 7.71409H4.66671V12.952H2.28584V7.71409Z" />
                </svg>
                <div class="text-label vote-count">{{:voteCount}}</div>
            </button>

            <div class="text-[#007b8e] text-label cursor-pointer" data-action="toggle-reply" data-comment-id="{{:id}}">
                Reply
            </div>
        </div>

        <div class="flex items-center gap-x-3 my-2">
            <div class="h-[1px] w-full bg-[#bbbcbb]"></div>
            <div class="label flex items-center gap-x-2 cursor-pointer" ">
                <span class=" label whitespace-nowrap text-[#007c8f]">{{:replies && replies.length ? replies.length :
                0}} Replies</span>
                <span class="transition-transform duration-300 inline-block rotate-180">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M10.8668 4.27635L6.32157 8.82158C6.27936 8.86383 6.22923 8.89736 6.17405 8.92023C6.11888 8.94311 6.05973 8.95488 6 8.95488C5.94027 8.95488 5.88112 8.94311 5.82594 8.92023C5.77077 8.89736 5.72064 8.86383 5.67842 8.82158L1.1332 4.27635C1.04791 4.19106 1 4.07539 1 3.95478C1 3.83416 1.04791 3.71849 1.1332 3.6332C1.21849 3.54791 1.33416 3.5 1.45478 3.5C1.57539 3.5 1.69106 3.54791 1.77635 3.6332L6 7.85742L10.2236 3.6332C10.2659 3.59097 10.316 3.55747 10.3712 3.53462C10.4264 3.51176 10.4855 3.5 10.5452 3.5C10.6049 3.5 10.6641 3.51176 10.7193 3.53462C10.7744 3.55747 10.8246 3.59097 10.8668 3.6332C10.909 3.67543 10.9425 3.72556 10.9654 3.78074C10.9882 3.83592 11 3.89505 11 3.95478C11 4.0145 10.9882 4.07363 10.9654 4.12881C10.9425 4.18399 10.909 4.23412 10.8668 4.27635Z"
                            fill="#007C8F" />
                    </svg>
                </span>
            </div>
            <div class="h-[1px] w-full bg-[#bbbcbb]"></div>
        </div>

        <!-- REPLIES -->
        <div id="comments-{{:id}}" class="mt-4">
            {{for replies ~commentId=id ~postId=~postId}}
            <div id="{{:id}}" current-post-id="{{:id}}"
                class="ml-3 mt-2 p-2 border-l-[1px] border-[#007c8f] commentCard">
                <div class="cursor-pointer actionToggleButton relative w-max ml-auto">
                    <svg width="4" height="14" viewBox="0 0 4 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M3.45679 6.99992C3.45679 7.34176 3.35542 7.67593 3.1655 7.96016C2.97558 8.2444 2.70565 8.46593 2.38982 8.59675C2.074 8.72757 1.72648 8.76179 1.3912 8.6951C1.05593 8.62841 0.747957 8.4638 0.506236 8.22208C0.264516 7.98036 0.0999019 7.67239 0.0332114 7.33711C-0.0334791 7.00184 0.000748884 6.65431 0.131567 6.33849C0.262385 6.02267 0.483918 5.75273 0.768151 5.56281C1.05238 5.37289 1.38655 5.27152 1.7284 5.27152C2.18679 5.27152 2.62642 5.45362 2.95056 5.77776C3.27469 6.1019 3.45679 6.54152 3.45679 6.99992Z"
                            fill="#414042" />
                        <path
                            d="M1.7284 3.79C2.07024 3.79 2.40441 3.68867 2.68864 3.49876C2.97287 3.30884 3.19441 3.0389 3.32522 2.72308C3.45604 2.40725 3.49027 2.05973 3.42358 1.72445C3.35689 1.38918 3.19228 1.08121 2.95056 0.839488C2.70884 0.597768 2.40086 0.433154 2.06559 0.366463C1.73031 0.299773 1.38279 0.334001 1.06697 0.464819C0.751145 0.595637 0.481206 0.81717 0.291288 1.1014C0.101369 1.38564 0 1.7198 0 2.06165C0 2.52 0.182099 2.95967 0.506236 3.28381C0.830373 3.60794 1.27 3.79 1.7284 3.79Z"
                            fill="#414042" />
                        <path
                            d="M1.7284 10.21C1.38655 10.21 1.05238 10.3112 0.768151 10.5011C0.483918 10.691 0.262385 10.9609 0.131567 11.2768C0.000748884 11.5926 -0.0334791 11.9401 0.0332114 12.2754C0.0999019 12.6107 0.264516 12.9186 0.506236 13.16C0.747957 13.4021 1.05593 13.5667 1.3912 13.6334C1.72648 13.7001 2.074 13.6658 2.38982 13.535C2.70565 13.4042 2.97558 13.1827 3.1655 12.8984C3.35542 12.6142 3.45679 12.28 3.45679 11.9382C3.45679 11.48 3.27469 11.04 2.95056 10.716C2.62642 10.3919 2.18679 10.21 1.7284 10.21Z"
                            fill="#414042" />
                    </svg>
                    <div class="actionItemsWrapper shadow-lg absolute top-[1rem] right-0 flex flex-col gap-3 p-2 bg-white w-max hidden"
                        id="commentDelete-{{:id}}">
                        <button class="text-red-500 hover:text-red-700 focus:outline-none deleteCommentButton"
                            data-action="delete-comment-request" data-comment-id="{{:id}}">Delete</button>
                    </div>
                </div>

                <div class="flex items-center gap-4">
                    <img class="w-6 h-6 rounded-full border border-[#d3d3d3]"
                        src="{{:avatar || 'https://i.ontraport.com/265848.fef288b2e2a570a362d1141a783309d8.JPEG'}}">
                    <div class="flex items-center gap-4">
                        <div class="text-[#414042] button max-[600px]:tracking-[0.86px] line-clamp-1">{{:author}}</div>
                        {{if designation}}
                        <div
                            class="py-1.5 px-3 bg-[#c7e6e6] rounded-[36px] font-400 text-[12px] text-dark line-clamp-1">
                            {{:designation}}</div>
                        {{/if}}
                        <div class="w-[2px] h-[15px] bg-[#bbbcbb] max-[600px]:hidden"></div>
                        <div class="text-[#586a80] small-text line-clamp-1">{{:published}}</div>
                    </div>
                </div>

                <div class="my-2 content-container">{{:reply}}</div>
                {{if fileLink}}
                <div class="mt-2 mb-4 w-full">
                    {{if ~isVideo(fileType)}}
                    <video class="w-full rounded" src="{{:fileLink}}" controls preload="metadata" playsinline></video>

                    {{else ~isImage(fileType)}}
                    <!-- Add a <picture> with AVIF source to maximize compatibility -->
                    <picture>
                        <source srcset="{{:fileLink}}" type="image/avif">
                        <img src="{{:fileLink}}" alt="{{:fileName}}" class="w-full rounded">
                    </picture>

                    {{else ~isAudio(fileType)}}
                    {{raw: ~audioPlayerHtml(fileLink, fileName, postId)}}

                    {{else}}
                    <a href="{{:fileLink}}" target="_blank" rel="noopener" class="underline text-[#007C8F] mobile-ellipsis-link">
                        {{:fileName}}
                    </a>
                    {{/if}}
                </div>
                {{/if}}



                <div class="flex items-center gap-4">
                    <button class="roundedButton {{:voteId ? 'is-voted' : ''}}" data-action="upvote-reply"
                        data-reply-id="{{:id}}" data-vote-id="{{:#data.voteId}}">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="#007C8F"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M14.3092 5.81653C14.1751 5.66459 14.0103 5.54291 13.8255 5.45958C13.6408 5.37625 13.4405 5.33318 13.2378 5.33322H9.90462V4.38087C9.90462 3.74942 9.65378 3.14384 9.20728 2.69734C8.76079 2.25084 8.1552 2 7.52376 2C7.43529 1.99994 7.34856 2.02452 7.27329 2.07099C7.19801 2.11746 7.13717 2.18397 7.09758 2.26309L4.84885 6.76174H2.28584C2.03327 6.76174 1.79103 6.86207 1.61243 7.04067C1.43383 7.21927 1.3335 7.46151 1.3335 7.71409V12.952C1.3335 13.2046 1.43383 13.4468 1.61243 13.6254C1.79103 13.804 2.03327 13.9043 2.28584 13.9043H12.5236C12.8716 13.9045 13.2077 13.7775 13.4688 13.5474C13.7298 13.3172 13.8979 12.9997 13.9414 12.6544L14.6557 6.9403C14.681 6.73913 14.6632 6.53488 14.6034 6.34112C14.5437 6.14736 14.4434 5.96854 14.3092 5.81653ZM2.28584 7.71409H4.66671V12.952H2.28584V7.71409Z" />
                        </svg>
                        <div class="text-label vote-count">{{:voteCount}}</div>
                    </button>
                    <div
                      class="text-[#007b8e] text-label cursor-pointer reply-toggle"
                      data-action="toggle-reply"
                      data-comment-id="{{:~commentId}}"
                      role="button"
                      tabindex="0"
                    >
                      Reply
                    </div>
                </div>
            </div>
            {{/for}}
        </div>

        <!-- REPLY FORM -->
        <div class="ReplyForm mt-4 hidden" id="replyForm_{{:id}}" data-parent-id="{{:#data.id}}"
            data-parent-type="comment" data-forum-post-id="{{:postId}}">
            <div class="containerForToolbar">
                <div class="flex flex-wrap items-center gap-2 bg-white border border-gray-300 rounded p-2 shadow">
                    <button class="px-2 py-1 rounded hover:bg-gray-200" title="Bold">𝐁</button>
                    <button class="px-2 py-1 rounded hover:bg-gray-200" title="Italic">𝐼</button>
                    <button class="px-2 py-1 rounded hover:bg-gray-200" title="Underline">U̲</button>
                    <button class="px-2 py-1 rounded hover:bg-gray-200" title="Add Link">🔗</button>
                </div>
            </div>
            <form
                class="createReply rounded-[4px] bg-[#fff] border border-[#F2F2F2] hover:border-[#007c8f] focus-within:border-[#007c8f] duration-300 openSans flex-col gap-y-3 p-4">
                <div contenteditable="true"
                    class="reply-editor outline-none post-input editor w-full mentionable mainMention"
                    placeholder="Reply..." data-tribute="true"></div>
                <div class="commentFilePreviewContainer mt-2"></div>
                <div class="create-post-buttons">
                    <input id="postFile-{{:#data.id}}" name="postFile" type="file" class="sr-only" />
                    <label for="postFile-{{:#data.id}}" data-action="replace-button"
                        class="create-post-buttons attach-file inline-flex items-center gap-2 cursor-pointer border rounded px-3 py-2 !hidden">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M3.91667 4.64897H1.41667C1.30616 4.64897 1.20018 4.60508 1.12204 4.52694C1.0439 4.4488 1 4.34281 1 4.23231V1.73231C0.999935 1.64985 1.02434 1.56923 1.07012 1.50065C1.1159 1.43207 1.18099 1.37861 1.25717 1.34705C1.33335 1.31549 1.41718 1.30723 1.49804 1.32334C1.57891 1.33944 1.65319 1.37918 1.71146 1.43752L2.66667 2.39377C3.58969 1.50296 4.8214 1.00356 6.10417 1.00002H6.13177C7.43806 0.996651 8.69309 1.50806 9.625 2.42345C9.70109 2.5013 9.7437 2.60583 9.7437 2.71469C9.74371 2.82354 9.70111 2.92808 9.62503 3.00593C9.54895 3.08378 9.44542 3.12877 9.33659 3.13126C9.22776 3.13376 9.12228 3.09357 9.04271 3.01929C8.26593 2.25683 7.22022 1.8308 6.13177 1.83335H6.10833C5.04593 1.83636 4.02534 2.24772 3.25781 2.98231L4.21146 3.93752C4.2698 3.99579 4.30953 4.07006 4.32564 4.15093C4.34174 4.2318 4.33349 4.31563 4.30193 4.3918C4.27036 4.46798 4.21691 4.53308 4.14833 4.57886C4.07974 4.62464 3.99912 4.64904 3.91667 4.64897ZM10.5833 7.14897H8.08333C8.00088 7.14891 7.92025 7.17331 7.85167 7.21909C7.78309 7.26487 7.72964 7.32997 7.69807 7.40615C7.66651 7.48232 7.65826 7.56615 7.67436 7.64702C7.69047 7.72789 7.7302 7.80216 7.78854 7.86043L8.74219 8.81564C7.97503 9.55067 6.95463 9.9626 5.89219 9.96616H5.86875C4.7803 9.96871 3.73459 9.54268 2.95781 8.78022C2.919 8.74052 2.87265 8.70897 2.82148 8.68744C2.77031 8.6659 2.71535 8.65481 2.65983 8.65481C2.60431 8.65481 2.54935 8.66591 2.49818 8.68746C2.44701 8.709 2.40066 8.74055 2.36185 8.78026C2.32305 8.81996 2.29257 8.86702 2.27221 8.91868C2.25185 8.97033 2.24202 9.02553 2.24329 9.08103C2.24457 9.13654 2.25692 9.19123 2.27963 9.24189C2.30233 9.29256 2.33494 9.33817 2.37552 9.37606C3.30743 10.2915 4.56246 10.8029 5.86875 10.7995H5.89583C7.1786 10.796 8.41031 10.2966 9.33333 9.40574L10.2896 10.362C10.348 10.4201 10.4223 10.4595 10.5032 10.4754C10.584 10.4912 10.6677 10.4828 10.7437 10.451C10.8198 10.4193 10.8847 10.3658 10.9303 10.2972C10.9759 10.2286 11.0002 10.148 11 10.0656V7.56564C11 7.45513 10.9561 7.34915 10.878 7.27101C10.7998 7.19287 10.6938 7.14897 10.5833 7.14897Z"
                                fill="#007C8F"></path>
                        </svg>
                        <span>Replace</span>
                    </label>
                    <button type="button" data-action="delete-button"
                        class="create-post-buttons attach-file inline-flex items-center gap-2 cursor-pointer border rounded px-3 py-2 !hidden">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M10.3462 2.53846H8.42308V2.15385C8.42308 1.84783 8.30151 1.55434 8.08512 1.33795C7.86874 1.12157 7.57525 1 7.26923 1H4.96154C4.65552 1 4.36203 1.12157 4.14565 1.33795C3.92926 1.55434 3.80769 1.84783 3.80769 2.15385V2.53846H1.88462C1.78261 2.53846 1.68478 2.57898 1.61265 2.65111C1.54052 2.72324 1.5 2.82107 1.5 2.92308C1.5 3.02508 1.54052 3.12291 1.61265 3.19504C1.68478 3.26717 1.78261 3.30769 1.88462 3.30769H2.26923V10.2308C2.26923 10.4348 2.35027 10.6304 2.49453 10.7747C2.63879 10.919 2.83445 11 3.03846 11H9.19231C9.39632 11 9.59198 10.919 9.73624 10.7747C9.8805 10.6304 9.96154 10.4348 9.96154 10.2308V3.30769H10.3462C10.4482 3.30769 10.546 3.26717 10.6181 3.19504C10.6902 3.12291 10.7308 3.02508 10.7308 2.92308C10.7308 2.82107 10.6902 2.72324 10.6181 2.65111C10.546 2.57898 10.4482 2.53846 10.3462 2.53846ZM4.57692 2.15385C4.57692 2.05184 4.61744 1.95401 4.68957 1.88188C4.7617 1.80975 4.85953 1.76923 4.96154 1.76923H7.26923C7.37124 1.76923 7.46907 1.80975 7.5412 1.88188C7.61332 1.95401 7.65385 2.05184 7.65385 2.15385V2.53846H4.57692V2.15385ZM9.19231 10.2308H3.03846V3.30769H9.19231V10.2308ZM5.34615 5.23077V8.30769C5.34615 8.4097 5.30563 8.50753 5.2335 8.57966C5.16137 8.65179 5.06354 8.69231 4.96154 8.69231C4.85953 8.69231 4.7617 8.65179 4.68957 8.57966C4.61744 8.50753 4.57692 8.4097 4.57692 8.30769V5.23077C4.57692 5.12876 4.61744 5.03093 4.68957 4.95881C4.7617 4.88668 4.85953 4.84615 4.96154 4.84615C5.06354 4.84615 5.16137 4.88668 5.2335 4.95881C5.30563 5.03093 5.34615 5.12876 5.34615 5.23077ZM7.65385 5.23077V8.30769C7.65385 8.4097 7.61332 8.50753 7.5412 8.57966C7.46907 8.65179 7.37124 8.69231 7.26923 8.69231C7.16722 8.69231 7.0694 8.65179 6.99727 8.57966C6.92514 8.50753 6.88462 8.4097 6.88462 8.30769V5.23077C6.88462 5.12876 6.92514 5.03093 6.99727 4.95881C7.0694 4.88668 7.16722 4.84615 7.26923 4.84615C7.37124 4.84615 7.46907 4.88668 7.5412 4.95881C7.61332 5.03093 7.65385 5.12876 7.65385 5.23077Z"
                                fill="#007C8F"></path>
                        </svg>
                        <span>Delete</span>
                    </button>
                    <input id="postFile-{{:#data.id}}" name="postFile" type="file" class="sr-only" />
                    <label for="postFile-{{:#data.id}}" data-action="attach-file"
                        class="create-post-buttons attach-file inline-flex items-center gap-2 cursor-pointer border rounded px-3 py-2 ">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M10.0385 5.72657C10.0743 5.76228 10.1026 5.80468 10.122 5.85136C10.1413 5.89804 10.1513 5.94807 10.1513 5.9986C10.1513 6.04913 10.1413 6.09916 10.122 6.14584C10.1026 6.19252 10.0743 6.23492 10.0385 6.27063L6.09504 10.2117C5.5902 10.7165 4.90551 11 4.19161 11C3.47771 11 2.79306 10.7163 2.28828 10.2115C1.78351 9.70664 1.49995 9.02195 1.5 8.30805C1.50005 7.59415 1.78369 6.9095 2.28852 6.40472L7.05916 1.56392C7.41958 1.20312 7.90856 1.00027 8.41854 1C8.92851 0.99973 9.41771 1.20206 9.77851 1.56247C10.1393 1.92289 10.3422 2.41187 10.3424 2.92185C10.3427 3.43183 10.1404 3.92102 9.77995 4.28182L5.00835 9.12263C4.79166 9.33933 4.49775 9.46107 4.1913 9.46107C3.88484 9.46107 3.59094 9.33933 3.37425 9.12263C3.15755 8.90593 3.03581 8.61203 3.03581 8.30558C3.03581 7.99912 3.15755 7.70522 3.37425 7.48852L7.37781 3.42151C7.41288 3.3841 7.45508 3.35408 7.50193 3.33322C7.54878 3.31236 7.59932 3.30109 7.65059 3.30005C7.70186 3.29902 7.75282 3.30826 7.80047 3.32721C7.84811 3.34617 7.89149 3.37447 7.92804 3.41044C7.96458 3.44641 7.99357 3.48933 8.01328 3.53667C8.03299 3.58401 8.04304 3.63481 8.04282 3.68609C8.04261 3.73737 8.03213 3.78809 8.01202 3.83526C7.99191 3.88243 7.96257 3.92511 7.92572 3.96077L3.92167 8.0321C3.88582 8.06767 3.85733 8.10995 3.83782 8.15653C3.81831 8.2031 3.80816 8.25307 3.80796 8.30357C3.80776 8.35406 3.81751 8.40411 3.83665 8.45084C3.85579 8.49757 3.88394 8.54008 3.91951 8.57593C3.95507 8.61178 3.99735 8.64027 4.04393 8.65978C4.09051 8.67929 4.14047 8.68944 4.19097 8.68964C4.24147 8.68984 4.29151 8.68009 4.33825 8.66095C4.38498 8.64181 4.42748 8.61365 4.46333 8.57809L9.23445 3.73968C9.45114 3.52343 9.57306 3.22996 9.57338 2.92382C9.57369 2.61768 9.45238 2.32395 9.23613 2.10726C9.01988 1.89056 8.7264 1.76865 8.42026 1.76833C8.11413 1.76801 7.8204 1.88933 7.6037 2.10558L2.83403 6.94446C2.65535 7.12286 2.51355 7.3347 2.41674 7.5679C2.31993 7.80109 2.27 8.05107 2.2698 8.30357C2.2696 8.55606 2.31913 8.80612 2.41557 9.03947C2.51201 9.27282 2.65347 9.48489 2.83187 9.66357C3.01026 9.84225 3.22211 9.98404 3.4553 10.0809C3.6885 10.1777 3.93848 10.2276 4.19097 10.2278C4.44346 10.228 4.69352 10.1785 4.92687 10.082C5.16022 9.98559 5.37229 9.84413 5.55097 9.66573L9.49494 5.72465C9.5673 5.65285 9.6652 5.61272 9.76713 5.61308C9.86906 5.61344 9.96668 5.65426 10.0385 5.72657Z"
                                fill="#007C8F" />
                        </svg>
                        <span>Attach a File</span>
                    </label>

                    <button type="submit" class="post" id="reply-post-button" data-id="reply-post-button-{{:#data.id}}">
                        <span>Post</span>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M10.4282 5.99409C10.4285 6.12138 10.3948 6.24645 10.3306 6.35635C10.2664 6.46625 10.174 6.55701 10.0629 6.61922L2.56502 10.9062C2.45742 10.9672 2.33595 10.9995 2.21227 11C2.09832 10.9994 1.98616 10.9715 1.88517 10.9187C1.78417 10.8659 1.69727 10.7898 1.63172 10.6965C1.56617 10.6033 1.52386 10.4958 1.50834 10.3829C1.49282 10.27 1.50453 10.155 1.54249 10.0476L2.74809 6.47767C2.75987 6.44277 2.78216 6.41236 2.8119 6.39062C2.84163 6.36888 2.87736 6.35686 2.9142 6.35622H6.14162C6.19059 6.35633 6.23906 6.34636 6.28402 6.32695C6.32898 6.30754 6.36946 6.27909 6.40296 6.24337C6.43646 6.20765 6.46226 6.16543 6.47875 6.11932C6.49525 6.07321 6.50208 6.0242 6.49884 5.97534C6.49074 5.88348 6.44824 5.79808 6.37985 5.73623C6.31145 5.67438 6.22222 5.64065 6.13002 5.64179H2.91509C2.87772 5.64179 2.84129 5.63008 2.81094 5.60829C2.78058 5.5865 2.75782 5.55574 2.74586 5.52034L1.54026 1.95088C1.49228 1.81406 1.48705 1.66588 1.52529 1.52603C1.56352 1.38617 1.6434 1.26126 1.75432 1.16789C1.86524 1.07451 2.00194 1.01709 2.14626 1.00326C2.29059 0.989426 2.43571 1.01983 2.56234 1.09044L10.0638 5.37209C10.1743 5.43416 10.2662 5.52447 10.3302 5.63377C10.3942 5.74307 10.4281 5.86742 10.4282 5.99409Z"
                                fill="white" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    </div>
    {{/for}}
    {{/if}}
</div>

<!-- ADD COMMENT FORM (per post) -->
<div class="mt-4 commentForm hidden" id="commentForm_{{:postId}}" data-parent-id="{{:postId}}" data-parent-type="post"
    data-forum-post-id="{{:postId}}">
    <div class="containerForToolbar rounded hover:bg-gray-200">
        <div class="flex flex-wrap items-center gap-2 bg-white border border-gray-300 rounded p-2 shadow">
            <button class="px-2 py-1 rounded hover:bg-gray-200" title="Bold">𝐁</button>
            <button class="px-2 py-1 rounded hover:bg-gray-200" title="Italic">𝐼</button>
            <button class="px-2 py-1 rounded hover:bg-gray-200" title="Underline">U̲</button>
            <button class="px-2 py-1 rounded hover:bg-gray-200" title="Add Link">🔗</button>
        </div>
    </div>
    <form
        class="createComment createPost rounded-[4px] bg-[#fff] border border-[#F2F2F2] hover:border-[#007c8f] focus-within:border-[#007c8f] duration-300 openSans flex-col gap-y-3 p-4">
        <div contenteditable="true" class="comment-editor outline-none post-input editor w-full mentionable mainMention"
            placeholder="Reply..." data-tribute="true"></div>
        <div class="commentFilePreviewContainer mt-2"></div>
        <div class="create-post-buttons">
            <input id="postFile-{{:postId}}" name="postFile" type="file" class="sr-only" />
            <label for="postFile-{{:postId}}" data-action="replace-button"
                class="create-post-buttons attach-file inline-flex items-center gap-2 cursor-pointer border rounded px-3 py-2 !hidden">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M3.91667 4.64897H1.41667C1.30616 4.64897 1.20018 4.60508 1.12204 4.52694C1.0439 4.4488 1 4.34281 1 4.23231V1.73231C0.999935 1.64985 1.02434 1.56923 1.07012 1.50065C1.1159 1.43207 1.18099 1.37861 1.25717 1.34705C1.33335 1.31549 1.41718 1.30723 1.49804 1.32334C1.57891 1.33944 1.65319 1.37918 1.71146 1.43752L2.66667 2.39377C3.58969 1.50296 4.8214 1.00356 6.10417 1.00002H6.13177C7.43806 0.996651 8.69309 1.50806 9.625 2.42345C9.70109 2.5013 9.7437 2.60583 9.7437 2.71469C9.74371 2.82354 9.70111 2.92808 9.62503 3.00593C9.54895 3.08378 9.44542 3.12877 9.33659 3.13126C9.22776 3.13376 9.12228 3.09357 9.04271 3.01929C8.26593 2.25683 7.22022 1.8308 6.13177 1.83335H6.10833C5.04593 1.83636 4.02534 2.24772 3.25781 2.98231L4.21146 3.93752C4.2698 3.99579 4.30953 4.07006 4.32564 4.15093C4.34174 4.2318 4.33349 4.31563 4.30193 4.3918C4.27036 4.46798 4.21691 4.53308 4.14833 4.57886C4.07974 4.62464 3.99912 4.64904 3.91667 4.64897ZM10.5833 7.14897H8.08333C8.00088 7.14891 7.92025 7.17331 7.85167 7.21909C7.78309 7.26487 7.72964 7.32997 7.69807 7.40615C7.66651 7.48232 7.65826 7.56615 7.67436 7.64702C7.69047 7.72789 7.7302 7.80216 7.78854 7.86043L8.74219 8.81564C7.97503 9.55067 6.95463 9.9626 5.89219 9.96616H5.86875C4.7803 9.96871 3.73459 9.54268 2.95781 8.78022C2.919 8.74052 2.87265 8.70897 2.82148 8.68744C2.77031 8.6659 2.71535 8.65481 2.65983 8.65481C2.60431 8.65481 2.54935 8.66591 2.49818 8.68746C2.44701 8.709 2.40066 8.74055 2.36185 8.78026C2.32305 8.81996 2.29257 8.86702 2.27221 8.91868C2.25185 8.97033 2.24202 9.02553 2.24329 9.08103C2.24457 9.13654 2.25692 9.19123 2.27963 9.24189C2.30233 9.29256 2.33494 9.33817 2.37552 9.37606C3.30743 10.2915 4.56246 10.8029 5.86875 10.7995H5.89583C7.1786 10.796 8.41031 10.2966 9.33333 9.40574L10.2896 10.362C10.348 10.4201 10.4223 10.4595 10.5032 10.4754C10.584 10.4912 10.6677 10.4828 10.7437 10.451C10.8198 10.4193 10.8847 10.3658 10.9303 10.2972C10.9759 10.2286 11.0002 10.148 11 10.0656V7.56564C11 7.45513 10.9561 7.34915 10.878 7.27101C10.7998 7.19287 10.6938 7.14897 10.5833 7.14897Z"
                        fill="#007C8F"></path>
                </svg>
                <span>Replace</span>
            </label>
            <button type="button" data-action="delete-button"
                class="create-post-buttons attach-file inline-flex items-center gap-2 cursor-pointer border rounded px-3 py-2 !hidden ">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M10.3462 2.53846H8.42308V2.15385C8.42308 1.84783 8.30151 1.55434 8.08512 1.33795C7.86874 1.12157 7.57525 1 7.26923 1H4.96154C4.65552 1 4.36203 1.12157 4.14565 1.33795C3.92926 1.55434 3.80769 1.84783 3.80769 2.15385V2.53846H1.88462C1.78261 2.53846 1.68478 2.57898 1.61265 2.65111C1.54052 2.72324 1.5 2.82107 1.5 2.92308C1.5 3.02508 1.54052 3.12291 1.61265 3.19504C1.68478 3.26717 1.78261 3.30769 1.88462 3.30769H2.26923V10.2308C2.26923 10.4348 2.35027 10.6304 2.49453 10.7747C2.63879 10.919 2.83445 11 3.03846 11H9.19231C9.39632 11 9.59198 10.919 9.73624 10.7747C9.8805 10.6304 9.96154 10.4348 9.96154 10.2308V3.30769H10.3462C10.4482 3.30769 10.546 3.26717 10.6181 3.19504C10.6902 3.12291 10.7308 3.02508 10.7308 2.92308C10.7308 2.82107 10.6902 2.72324 10.6181 2.65111C10.546 2.57898 10.4482 2.53846 10.3462 2.53846ZM4.57692 2.15385C4.57692 2.05184 4.61744 1.95401 4.68957 1.88188C4.7617 1.80975 4.85953 1.76923 4.96154 1.76923H7.26923C7.37124 1.76923 7.46907 1.80975 7.5412 1.88188C7.61332 1.95401 7.65385 2.05184 7.65385 2.15385V2.53846H4.57692V2.15385ZM9.19231 10.2308H3.03846V3.30769H9.19231V10.2308ZM5.34615 5.23077V8.30769C5.34615 8.4097 5.30563 8.50753 5.2335 8.57966C5.16137 8.65179 5.06354 8.69231 4.96154 8.69231C4.85953 8.69231 4.7617 8.65179 4.68957 8.57966C4.61744 8.50753 4.57692 8.4097 4.57692 8.30769V5.23077C4.57692 5.12876 4.61744 5.03093 4.68957 4.95881C4.7617 4.88668 4.85953 4.84615 4.96154 4.84615C5.06354 4.84615 5.16137 4.88668 5.2335 4.95881C5.30563 5.03093 5.34615 5.12876 5.34615 5.23077ZM7.65385 5.23077V8.30769C7.65385 8.4097 7.61332 8.50753 7.5412 8.57966C7.46907 8.65179 7.37124 8.69231 7.26923 8.69231C7.16722 8.69231 7.0694 8.65179 6.99727 8.57966C6.92514 8.50753 6.88462 8.4097 6.88462 8.30769V5.23077C6.88462 5.12876 6.92514 5.03093 6.99727 4.95881C7.0694 4.88668 7.16722 4.84615 7.26923 4.84615C7.37124 4.84615 7.46907 4.88668 7.5412 4.95881C7.61332 5.03093 7.65385 5.12876 7.65385 5.23077Z"
                        fill="#007C8F"></path>
                </svg>
                <span>Delete</span>
            </button>
            <input id="postFile-{{:postId}}" name="postFile" type="file" class="sr-only" />
            <label for="postFile-{{:postId}}" data-action="attach-file"
                class="create-post-buttons attach-file inline-flex items-center gap-2 cursor-pointer border rounded px-3 py-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M10.0385 5.72657C10.0743 5.76228 10.1026 5.80468 10.122 5.85136C10.1413 5.89804 10.1513 5.94807 10.1513 5.9986C10.1513 6.04913 10.1413 6.09916 10.122 6.14584C10.1026 6.19252 10.0743 6.23492 10.0385 6.27063L6.09504 10.2117C5.5902 10.7165 4.90551 11 4.19161 11C3.47771 11 2.79306 10.7163 2.28828 10.2115C1.78351 9.70664 1.49995 9.02195 1.5 8.30805C1.50005 7.59415 1.78369 6.9095 2.28852 6.40472L7.05916 1.56392C7.41958 1.20312 7.90856 1.00027 8.41854 1C8.92851 0.99973 9.41771 1.20206 9.77851 1.56247C10.1393 1.92289 10.3422 2.41187 10.3424 2.92185C10.3427 3.43183 10.1404 3.92102 9.77995 4.28182L5.00835 9.12263C4.79166 9.33933 4.49775 9.46107 4.1913 9.46107C3.88484 9.46107 3.59094 9.33933 3.37425 9.12263C3.15755 8.90593 3.03581 8.61203 3.03581 8.30558C3.03581 7.99912 3.15755 7.70522 3.37425 7.48852L7.37781 3.42151C7.41288 3.3841 7.45508 3.35408 7.50193 3.33322C7.54878 3.31236 7.59932 3.30109 7.65059 3.30005C7.70186 3.29902 7.75282 3.30826 7.80047 3.32721C7.84811 3.34617 7.89149 3.37447 7.92804 3.41044C7.96458 3.44641 7.99357 3.48933 8.01328 3.53667C8.03299 3.58401 8.04304 3.63481 8.04282 3.68609C8.04261 3.73737 8.03213 3.78809 8.01202 3.83526C7.99191 3.88243 7.96257 3.92511 7.92572 3.96077L3.92167 8.0321C3.88582 8.06767 3.85733 8.10995 3.83782 8.15653C3.81831 8.2031 3.80816 8.25307 3.80796 8.30357C3.80776 8.35406 3.81751 8.40411 3.83665 8.45084C3.85579 8.49757 3.88394 8.54008 3.91951 8.57593C3.95507 8.61178 3.99735 8.64027 4.04393 8.65978C4.09051 8.67929 4.14047 8.68944 4.19097 8.68964C4.24147 8.68984 4.29151 8.68009 4.33825 8.66095C4.38498 8.64181 4.42748 8.61365 4.46333 8.57809L9.23445 3.73968C9.45114 3.52343 9.57306 3.22996 9.57338 2.92382C9.57369 2.61768 9.45238 2.32395 9.23613 2.10726C9.01988 1.89056 8.7264 1.76865 8.42026 1.76833C8.11413 1.76801 7.8204 1.88933 7.6037 2.10558L2.83403 6.94446C2.65535 7.12286 2.51355 7.3347 2.41674 7.5679C2.31993 7.80109 2.27 8.05107 2.2698 8.30357C2.2696 8.55606 2.31913 8.80612 2.41557 9.03947C2.51201 9.27282 2.65347 9.48489 2.83187 9.66357C3.01026 9.84225 3.22211 9.98404 3.4553 10.0809C3.6885 10.1777 3.93848 10.2276 4.19097 10.2278C4.44346 10.228 4.69352 10.1785 4.92687 10.082C5.16022 9.98559 5.37229 9.84413 5.55097 9.66573L9.49494 5.72465C9.5673 5.65285 9.6652 5.61272 9.76713 5.61308C9.86906 5.61344 9.96668 5.65426 10.0385 5.72657Z"
                        fill="#007C8F" />
                </svg>
                <span>Attach a File</span>
            </label>

            <button type="submit" class="post" id="comment-post-button" data-id="comment-post-button-{{:postId}}">
                <span>Post</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M10.4282 5.99409C10.4285 6.12138 10.3948 6.24645 10.3306 6.35635C10.2664 6.46625 10.174 6.55701 10.0629 6.61922L2.56502 10.9062C2.45742 10.9672 2.33595 10.9995 2.21227 11C2.09832 10.9994 1.98616 10.9715 1.88517 10.9187C1.78417 10.8659 1.69727 10.7898 1.63172 10.6965C1.56617 10.6033 1.52386 10.4958 1.50834 10.3829C1.49282 10.27 1.50453 10.155 1.54249 10.0476L2.74809 6.47767C2.75987 6.44277 2.78216 6.41236 2.8119 6.39062C2.84163 6.36888 2.87736 6.35686 2.9142 6.35622H6.14162C6.19059 6.35633 6.23906 6.34636 6.28402 6.32695C6.32898 6.30754 6.36946 6.27909 6.40296 6.24337C6.43646 6.20765 6.46226 6.16543 6.47875 6.11932C6.49525 6.07321 6.50208 6.0242 6.49884 5.97534C6.49074 5.88348 6.44824 5.79808 6.37985 5.73623C6.31145 5.67438 6.22222 5.64065 6.13002 5.64179H2.91509C2.87772 5.64179 2.84129 5.63008 2.81094 5.60829C2.78058 5.5865 2.75782 5.55574 2.74586 5.52034L1.54026 1.95088C1.49228 1.81406 1.48705 1.66588 1.52529 1.52603C1.56352 1.38617 1.6434 1.26126 1.75432 1.16789C1.86524 1.07451 2.00194 1.01709 2.14626 1.00326C2.29059 0.989426 2.43571 1.01983 2.56234 1.09044L10.0638 5.37209C10.1743 5.43416 10.2662 5.52447 10.3302 5.63377C10.3942 5.74307 10.4281 5.86742 10.4282 5.99409Z"
                        fill="white" />
                </svg>
            </button>
        </div>
    </form>
</div>
</div>`;
    if (!$.templates[this.chatTemplateName])
      $.templates(this.chatTemplateName, template);
  }

  renderPosts(records) {
    const mount = this.forumtSectionMount;
    if (!mount) return;
    if (!records || records.length === 0) {
      mount.innerHTML = `
        <div class="bg-white border rounded-xl p-6 shadow-sm text-center text-slate-600">
          No posts to display.
        </div>`;
      return;
    }
    const html = $.render[this.chatTemplateName](records);
    mount.innerHTML = html;
  }

  renderAnnouncement(records) {
    if (!records || records.length == 0) return;
    const html = $.render[this.chatTemplateName](records);
    // if (this.announcementMountSection)
    //   this.announcementMountSection.innerHTML = html;
  }

  onCreatePost(handler) {
    if (!this.postButton) return;
    this.postButton.addEventListener("click", async (e) => {
      let elementToDisable = this.postButton.closest(".posts-input");
      this.disableHTML(elementToDisable, "disable");
      e.preventDefault();
      const copy = (this.postTextarea?.innerHTML ?? "").trim();
      const fileInput = document.getElementById("postFile");
      const activeTab = this.findActiveTab();
      let forumType;
      if (activeTab == "announcements-tab") {
        forumType = "Announcement";
      } else {
        forumType = "Post";
      }
      let fileMeta = null;
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        try {
          const file_link = await uploadAndGetFileLink(file);
          const classified = this.classifyFile(file);
          fileMeta = {
            file_name: classified.file_name,
            file_link,
            file_type: classified.file_type,
            file_size: classified.file_size,
          };
        } catch (err) {
          console.log("File upload failed: " + err.message);
          return;
        }
      }
      if (!(fileInput && fileInput.files && fileInput.files[0]) && !copy) {
        this.showEmptyModal("Post cannot be empty !");
        this.disableHTML(elementToDisable, "enable");
        return;
      }
      handler?.({ copy, fileMeta }, elementToDisable, forumType);
    });
  }

  disableHTML(element, status) {
    if (!element) return;
    if (status == "disable") {
      element.style.setProperty("pointer-events", "none");
      element.style.setProperty("opacity", "50%");
    } else {
      element.style.setProperty("pointer-events", "auto");
      element.style.setProperty("opacity", "100%");
    }
  }

  onUpvote(handler) {
    if (!this.mount || this.mount.length === 0) return;

    this.mount.forEach((mountEl) => {
      mountEl.addEventListener("click", (e) => {
        const t =
          e.target && e.target.nodeType === Node.TEXT_NODE
            ? e.target.parentElement
            : e.target;

        const postUpvoteBtn = t.closest("[data-action='upvote-post']");
        const commentUpvoteBtn = t.closest("[data-action='upvote-comment']");
        const replyUpvoteBtn = t.closest("[data-action='upvote-reply']");

        const announcementSection = t.closest("#announcements-section");
        const chatSection = t.closest("#chat-section");

        if (!postUpvoteBtn && !commentUpvoteBtn && !replyUpvoteBtn) return;

        let payload;
        if (postUpvoteBtn) {
          payload = {
            type: "post",
            postId: postUpvoteBtn.dataset.postId,
            element: postUpvoteBtn,
          };
        } else if (commentUpvoteBtn) {
          const postCard = commentUpvoteBtn.closest(".postCard");
          payload = {
            type: "comment",
            commentId: commentUpvoteBtn.dataset.commentId,
            postId:
              postCard?.getAttribute("current-post-id") ||
              commentUpvoteBtn.dataset.postId ||
              null,
            element: commentUpvoteBtn,
          };
        } else if (replyUpvoteBtn) {
          const postCard = replyUpvoteBtn.closest(".postCard");
          payload = {
            type: "reply",
            commentId: replyUpvoteBtn.dataset.replyId,
            postId:
              postCard?.getAttribute("current-post-id") ||
              replyUpvoteBtn.dataset.postId ||
              null,
            element: replyUpvoteBtn,
          };
        }
        if (chatSection) {
          payload.section = "chat";
        } else if (announcementSection) {
          payload.section = "announcement";
        }
        handler?.(payload);
      });
    });
  }

  onCommentButtonClicked(handler) {
    if (!this.mount || this.mount.length === 0) return;
    this.mount.forEach((mountEl) => {
      mountEl.addEventListener("click", (e) => {
        const el = e.target.closest("[data-action='toggle-comment']");
        if (!el) return;
        handler(el.dataset.postId);
      });
    });
  }

  onReplyButtonClicked(handler) {
    if (!this.mount || this.mount.length === 0) return;
    this.mount.forEach((mountEl) => {
      mountEl.addEventListener("click", (e) => {
        const el = e.target.closest("[data-action='toggle-reply']");
        if (!el) return;
        handler(el.dataset.commentId);
      });
    });
  }

  onDeleteRequest(handler) {
    if (!this.mount || this.mount.length === 0) return;
    this.mount.forEach((mountEl) => {
      mountEl.addEventListener("click", (e) => {
        const t =
          e.target && e.target.nodeType === Node.TEXT_NODE
            ? e.target.parentElement
            : e.target;

        const postDeleteBtn = t.closest("[data-action='delete-request']");
        const commentDeleteBtn = t.closest(
          "[data-action='delete-comment-request']"
        );
        if (!postDeleteBtn && !commentDeleteBtn) return;

        let payload;
        if (commentDeleteBtn) {
          const postCard = commentDeleteBtn.closest(".postCard");
          payload = {
            type: "comment",
            postId:
              postCard?.getAttribute("current-post-id") ||
              commentDeleteBtn.dataset.postId ||
              null,
            commentId: commentDeleteBtn.dataset.commentId,
          };
        } else {
          payload = { type: "post", postId: postDeleteBtn.dataset.postId };
        }

        this.openDeleteModal({
          onConfirm: () => handler?.(payload),
        });
      });
    });
  }

  applyUpvoteStyles(postId, voteId) {
    if (!this.mount || this.mount.length === 0) return;

    this.mount.forEach((mountEl) => {
      const el = mountEl.querySelector(
        `[data-action="upvote"][data-post-id="${postId}"]`
      );
      if (!el) return;

      const svgPath = el.querySelector("svg path");
      const label = el.querySelector("p");
      const isVoted = voteId !== "";

      el.style.setProperty(
        "background",
        isVoted ? "#007c8f" : "transparent",
        "important"
      );
      svgPath?.style.setProperty(
        "fill",
        isVoted ? "white" : "#007C8F",
        "important"
      );
      label?.style.setProperty(
        "color",
        isVoted ? "white" : "black",
        "important"
      );
    });
  }

  removePostNode(postId) {
    if (!this.mount || this.mount.length === 0) return;

    this.mount.forEach((mountEl) => {
      const node = mountEl.querySelector(`[current-post-id='${postId}']`);
      node?.remove();
    });
  }

  openDeleteModal({ onConfirm }) {
    document.getElementById(this.modalRootId)?.remove();
    const root = document.createElement("div");
    root.id = this.modalRootId;
    root.innerHTML = `
      <div class="modal-backdrop" data-close="true"></div>
      <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="deleteTitle">
        <h5 id="deleteTitle" class="modal-title">Are you sure you want to delete?</h5>
        <div class="delete-inner-div">
          <button class="modal-button modal-yes" data-yes>Yes</button>
          <button class="modal-button modal-no" data-no>No</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    document.body.style.overflow = "hidden";
    const close = () => {
      root.remove();
      document.body.style.overflow = "";
    };
    root.addEventListener("click", (e) => {
      if (e.target?.dataset?.close !== undefined) close();
    });
    root.querySelector("[data-no]")?.addEventListener("click", close);
    root.querySelector("[data-yes]")?.addEventListener("click", async () => {
      try {
        root.style.setProperty("pointer-events", "none");
        await onConfirm?.();
      } finally {
        close();
      }
    });
    root.querySelector("[data-yes]")?.focus();
  }

  autoResizePostTextarea() {
    if (!this.postTextarea) return;
    const el = this.postTextarea;
    const MIN_HEIGHT = 50;
    const resize = function () {
      this.style.height = "auto";
      const h = Math.max(this.scrollHeight || 0, MIN_HEIGHT);
      this.style.height = h + "px";
    };
    const updatePlaceholderState = function () {
      const hasValue = (this.textContent || "").trim().length > 0;
      if (hasValue) this.setAttribute("data-has-value", "1");
      else this.removeAttribute("data-has-value");
    };
    el.addEventListener("input", () => {
      resize.call(el);
      updatePlaceholderState.call(el);
    });
    // Initial pass
    updatePlaceholderState.call(el);
    resize.call(el);
  }

  removeFieldData() {
    if (!this.postTextarea) return;
    this.postTextarea.innerHTML = "";
    this.postTextarea.style.height = "auto";
  }

  getAllMentionId() {
    const section = document.querySelector("section.createPost");

    const uniqueNumericIds = [
      ...new Set(
        [...section.querySelectorAll("#post-data span[input-post-contact-id]")]
          .map((el) => Number(el.getAttribute("input-post-contact-id")))
          .filter(Number.isFinite)
      ),
    ];

    return uniqueNumericIds;
  }

  toggleCreateForumSection(element) {
    element.classList.toggle("hidden");
  }

  getCommentValueObj(handler) {
    document.addEventListener("submit", async (e) => {
      let form = e.target.closest(".commentForm");
      this.disableHTML(form, "disable");
      if (!form) return;
      e.preventDefault();

      const announcementSection = e.target.closest("#announcements-section");
      const chatSection = e.target.closest("#chat-section");

      // const scope = form.dataset.parentType === 'post' ? 'comment' : 'reply';
      const parentId = form.dataset.parentId || null;
      const editor = form.querySelector(".comment-editor");
      const html = (editor?.innerHTML || "").trim();
      const fileInput = form.querySelector("[type='file']");
      let fileMeta = null;
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];

        try {
          const file_link = await uploadAndGetFileLink(file);
          const classified = this.classifyFile(file);

          fileMeta = {
            file_name: classified.file_name,
            file_link,
            file_type: classified.file_type,
            file_size: classified.file_size,
          };
        } catch (err) {
          console.log("File upload failed: " + err.message);
          return;
        }
      }

      if (!(fileInput && fileInput.files && fileInput.files[0]) && !html) {
        this.disableHTML(form, "enable");
        return;
      }
      let section;
      if (chatSection) {
        section = "chat";
      } else if (announcementSection) {
        section = "announcement";
      }
      handler?.(
        { html: html, forumId: Number(parentId) },
        fileMeta,
        form,
        section
      );
    });
  }

  classifyFile(file) {
    if (!file) return null;
    const type = (file.type || "").toLowerCase();
    const name = (file.name || "").toLowerCase();

    let category = "File";
    if (
      type.startsWith("video/") ||
      /\.(mp4|webm|ogg|ogv|mov|m4v|mkv)$/i.test(name)
    ) {
      category = "Video";
    } else if (
      type.startsWith("image/") ||
      /\.(jpe?g|png|gif|webp|bmp|svg|avif)$/i.test(name)
    ) {
      category = "Image";
    } else if (
      type.startsWith("audio/") ||
      /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(name)
    ) {
      category = "Audio";
    }

    return {
      file_name: file.name,
      file_type: category,
      file_size: file.size,
    };
  }

  getReplyValueObj(handler) {
    const container = document;
    document.addEventListener("submit", async (e) => {
      let form = e.target.closest(".ReplyForm");
      this.disableHTML(form, "disable");
      if (!form) return;
      e.preventDefault();

      const parentId = form.dataset.parentId || null;
      const editor = form.querySelector(".reply-editor");
      const fileInput = form.querySelector("[type='file']");
      let fileMeta = null;
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        try {
          const file_link = await uploadAndGetFileLink(file);
          const classified = this.classifyFile(file);

          fileMeta = {
            file_name: classified.file_name,
            file_link,
            file_type: classified.file_type,
            file_size: classified.file_size,
          };
        } catch (err) {
          console.log("File upload failed: " + err.message);
          return;
        }
      }

      const html = (editor?.innerHTML || "").trim();
      if (!(fileInput && fileInput.files && fileInput.files[0]) && !html) {
        this.disableHTML(form, "enable");
        return;
      }
      handler?.({ content: html, commentId: Number(parentId) }, fileMeta, form);
    });
  }

  initCommentReplyToggles() {
    function flipChevron(labelEl, isOpen) {
      const chev = labelEl.querySelector(".inline-block");
      if (!chev) return;
      chev.classList.toggle("rotate-180", isOpen);
      chev.classList.toggle("rotate-0", !isOpen);
    }

    document.addEventListener("click", function (e) {
      const labelEl = e.target.closest(".label.cursor-pointer");
      if (!labelEl) return;

      // If inside a commentCard -> it's the "X Replies" divider
      const commentCard = labelEl.closest(".commentCard");
      if (commentCard) {
        const repliesContainer = commentCard.querySelector(
          'div[id^="comments-"]'
        );
        if (!repliesContainer) return;

        const willHide = !repliesContainer.classList.contains("hidden");
        repliesContainer.classList.toggle("hidden", willHide);
        flipChevron(labelEl, !willHide);
        return;
      }

      // Otherwise it's the post-level "X Comments" divider
      const postCard = labelEl.closest(".postCard");
      if (!postCard) return;

      // Toggle ONLY the comment items; leave forms alone
      const commentItems = postCard.querySelectorAll(".commentCard");
      if (!commentItems.length) return;

      const anyVisible = Array.from(commentItems).some(
        (el) => !el.classList.contains("hidden")
      );
      commentItems.forEach((el) => el.classList.toggle("hidden", anyVisible));
      flipChevron(labelEl, !anyVisible);
    });
  }

  attachFileBtnHandler() {
    document.addEventListener("change", (e) => {
      const input = e.target.closest('input[type="file"]');
      if (!input) return;

      // find the section this input belongs to
      const section = input.closest(
        ".createReply, .createComment, .createPost"
      );
      if (!section) return;

      // only the first file — no multi-file handling
      const file = input.files && input.files[0];
      if (!file) return;
      this.previewFileHandler(section, file);
    });
  }

  deleteAttachFileHandler() {
    document.addEventListener("click", (e) => {
      const delBtn = e.target.closest('[data-action="delete-button"]');
      if (!delBtn) return;

      e.preventDefault();

      const container = delBtn.closest(
        ".createReply, .createComment, .createPost"
      );
      if (!container) return;

      const input = container.querySelector('input[type="file"]');
      if (input) input.value = "";

      this.clearAttachFile(container);
    });
  }

  getActionButtons(element) {
    return {
      attachBtn: element.querySelector('[data-action="attach-file"]'),
      replaceBtn: element.querySelector('[data-action="replace-button"]'),
      deleteBtn: element.querySelector('[data-action="delete-button"]'),
    };
  }

  show(el) {
    if (el) {
      el.classList.remove("!hidden");
      el.classList.add("!inline-flex");
    }
  }

  hide(el) {
    if (el) {
      el.classList.remove("!inline-flex");
      el.classList.add("!hidden");
    }
  }

  updateButtons(element, state) {
    const { attachBtn, replaceBtn, deleteBtn } = this.getActionButtons(element);
    if (state === "attached") {
      this.hide(attachBtn);
      this.show(replaceBtn);
      this.show(deleteBtn);
    } else if (state === "deleted") {
      this.hide(replaceBtn);
      this.show(attachBtn);
      this.hide(deleteBtn);
    } else {
      this.show(attachBtn);
      this.hide(replaceBtn);
      this.hide(deleteBtn);
    }
  }

  previewFileHandler(element, file) {
    const preview = element.querySelector(".commentFilePreviewContainer");
    if (!preview || !(file instanceof File)) return;

    // reset the preview area for THIS section
    preview.innerHTML = "";

    const type = (file.type || "").toLowerCase();

    if (type.startsWith("image/")) {
      const img = document.createElement("img");
      img.className = "file-preview";
      img.style.maxWidth = "300px";
      img.alt = file.name;

      const reader = new FileReader();
      reader.onload = (ev) => {
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);

      preview.appendChild(img);
    } else if (type.startsWith("video/")) {
      const video = document.createElement("video");
      video.className = "file-preview w-full rounded";
      video.controls = true;

      const reader = new FileReader();
      reader.onload = (ev) => {
        video.src = ev.target.result;
      };
      reader.readAsDataURL(file);

      preview.appendChild(video);
    } else if (type.startsWith("audio/")) {
      const html = this.audioPlayerHtml({
        src: URL.createObjectURL(file),
        fileName: file.name,
      });
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html.trim();
      const player = wrapper.firstElementChild;
      preview.innerHTML = "";
      preview.appendChild(player);
      this.initAudioPlayers(preview);
    } else {
      // generic fallback (pdf/doc/etc.) — no links to avoid blob/data URL issues
      const fallback = document.createElement("div");
      fallback.style.setProperty(
        "color",
        "rgb(59 130 246 / var(--tw-text-opacity, 1))"
      );
      fallback.className = "file-preview text-sm";
      fallback.textContent = `File: ${file.name}`;
      preview.appendChild(fallback);
    }
    this.updateButtons(element, "attached");
  }

  clearAttachFile(element) {
    const preview = element.querySelector(".commentFilePreviewContainer");
    if (preview) preview.innerHTML = "";

    const input = element.querySelector('input[type="file"]');
    if (input) input.value = "";

    this.updateButtons(element, "deleted");
  }

  audioPlayerHtml({ src, fileName = "audio", id = "" }) {
    const safeId = `audio-${id || Math.random().toString(36).slice(2)}`;
    const safeName = String(fileName).replace(/"/g, "&quot;");
    const safeSrc = String(src).replace(/"/g, "&quot;");

    return `
    <div id="${safeId}" class="audio-card flex flex-col gap-y-4 mt-2 mb-4 p-4 bg-[#ebf6f6]"
        data-audio-player
     data-src="${safeSrc}"
     data-filename="${safeName}">

  <div class="flex items-center justify-between">
    <button type="button" class="btn-mute flex items-center gap-x-2" data-action="mute">
      <!-- volume on -->
      <svg class="icon-volume-on" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M14.7689 16.9995C14.7681 17.678 14.5903 18.3445 14.253 18.9332C13.9158 19.5219 13.4308 20.0124 12.8459 20.3562C12.6707 20.4434 12.4689 20.4606 12.2816 20.4042C12.0942 20.3479 11.9354 20.2223 11.8373 20.053C11.7393 19.8836 11.7095 19.6833 11.754 19.4928C11.7984 19.3022 11.9138 19.1358 12.0767 19.0274C12.4293 18.8192 12.7216 18.5227 12.9246 18.1671C13.1277 17.8115 13.2345 17.409 13.2345 16.9995C13.2345 16.59 13.1277 16.1876 12.9246 15.832C12.7216 15.4764 12.4293 15.1799 12.0767 14.9717C11.9138 14.8633 11.7984 14.6968 11.754 14.5063C11.7095 14.3158 11.7393 14.1155 11.8373 13.9461C11.9354 13.7768 12.0942 13.6512 12.2816 13.5949C12.4689 13.5385 12.6707 13.5557 12.8459 13.6429C13.4308 13.9867 13.9158 14.4772 14.253 15.0659C14.5903 15.6546 14.7681 16.3211 14.7689 16.9995ZM9.67867 12.0583C9.53814 12 9.38347 11.9847 9.23422 12.0143C9.08498 12.0439 8.94787 12.1171 8.84024 12.2247L6.75857 14.3073H4.76921C4.5652 14.3073 4.36955 14.3884 4.2253 14.5326C4.08104 14.6769 4 14.8725 4 15.0765V18.9226C4 19.1266 4.08104 19.3222 4.2253 19.4665C4.36955 19.6107 4.5652 19.6918 4.76921 19.6918H6.75857L8.84024 21.7744C8.94782 21.8821 9.08493 21.9555 9.23422 21.9852C9.38351 22.0149 9.53827 21.9997 9.6789 21.9414C9.81953 21.8831 9.9397 21.7845 10.0242 21.6579C10.1087 21.5312 10.1538 21.3824 10.1537 21.2302V12.7689C10.1536 12.6168 10.1085 12.4681 10.0239 12.3416C9.93939 12.2151 9.81924 12.1165 9.67867 12.0583ZM20.9226 8.15366V20.461C20.9226 20.869 20.7605 21.2603 20.472 21.5488C20.1835 21.8373 19.7922 21.9994 19.3841 21.9994H16.3073C16.1033 21.9994 15.9077 21.9184 15.7634 21.7741C15.6192 21.6298 15.5381 21.4342 15.5381 21.2302C15.5381 21.0262 15.6192 20.8305 15.7634 20.6863C15.9077 20.542 16.1033 20.461 16.3073 20.461H19.3841V8.92287H14.7689C14.5649 8.92287 14.3692 8.84183 14.225 8.69757C14.0807 8.55332 13.9997 8.35767 13.9997 8.15366V3.53842H5.53841V11.2305C5.53841 11.4345 5.45737 11.6301 5.31312 11.7744C5.16886 11.9187 4.97321 11.9997 4.76921 11.9997C4.5652 11.9997 4.36955 11.9187 4.2253 11.7744C4.08104 11.6301 4 11.4345 4 11.2305V3.53842C4 3.1304 4.16208 2.7391 4.45059 2.45059C4.7391 2.16208 5.1304 2 5.53841 2H14.7689C14.8699 1.99992 14.97 2.01975 15.0634 2.05836C15.1568 2.09696 15.2416 2.15358 15.3131 2.22499L20.6976 7.60945C20.769 7.68093 20.8256 7.76579 20.8642 7.85917C20.9028 7.95255 20.9226 8.05262 20.9226 8.15366ZM15.5381 7.38445H18.2967L15.5381 4.62588V7.38445Z" fill="#007C8F"></path>
      </svg>
      <!-- volume muted -->
      <svg class="icon-volume-off hidden" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M14.7689 16.9995C14.7681 17.678 14.5903 18.3445 14.253 18.9332C13.9158 19.5219 13.4308 20.0124 12.8459 20.3562C12.6707 20.4434 12.4689 20.4606 12.2816 20.4042C12.0942 20.3479 11.9354 20.2223 11.8373 20.053C11.7393 19.8836 11.7095 19.6833 11.754 19.4928C11.7984 19.3022 11.9138 19.1358 12.0767 19.0274C12.4293 18.8192 12.7216 18.5227 12.9246 18.1671C13.1277 17.8115 13.2345 17.409 13.2345 16.9995C13.2345 16.59 13.1277 16.1876 12.9246 15.832C12.7216 15.4764 12.4293 15.1799 12.0767 14.9717C11.9138 14.8633 11.7984 14.6968 11.754 14.5063C11.7095 14.3158 11.7393 14.1155 11.8373 13.9461C11.9354 13.7768 12.0942 13.6512 12.2816 13.5949C12.4689 13.5385 12.6707 13.5557 12.8459 13.6429C13.4308 13.9867 13.9158 14.4772 14.253 15.0659C14.5903 15.6546 14.7681 16.3211 14.7689 16.9995ZM9.67867 12.0583C9.53814 12 9.38347 11.9847 9.23422 12.0143C9.08498 12.0439 8.94787 12.1171 8.84024 12.2247L6.75857 14.3073H4.76921C4.5652 14.3073 4.36955 14.3884 4.2253 14.5326C4.08104 14.6769 4 14.8725 4 15.0765V18.9226C4 19.1266 4.08104 19.3222 4.2253 19.4665C4.36955 19.6107 4.5652 19.6918 4.76921 19.6918H6.75857L8.84024 21.7744C8.94782 21.8821 9.08493 21.9555 9.23422 21.9852C9.38351 22.0149 9.53827 21.9997 9.6789 21.9414C9.81953 21.8831 9.9397 21.7845 10.0242 21.6579C10.1087 21.5312 10.1538 21.3824 10.1537 21.2302V12.7689C10.1536 12.6168 10.1085 12.4681 10.0239 12.3416C9.93939 12.2151 9.81924 12.1165 9.67867 12.0583ZM20.9226 8.15366V20.461C20.9226 20.869 20.7605 21.2603 20.472 21.5488C20.1835 21.8373 19.7922 21.9994 19.3841 21.9994H16.3073C16.1033 21.9994 15.9077 21.9184 15.7634 21.7741C15.6192 21.6298 15.5381 21.4342 15.5381 21.2302C15.5381 21.0262 15.6192 20.8305 15.7634 20.6863C15.9077 20.542 16.1033 20.461 16.3073 20.461H19.3841V8.92287H14.7689C14.5649 8.92287 14.3692 8.84183 14.225 8.69757C14.0807 8.55332 13.9997 8.35767 13.9997 8.15366V3.53842H5.53841V11.2305C5.53841 11.4345 5.45737 11.6301 5.31312 11.7744C5.16886 11.9187 4.97321 11.9997 4.76921 11.9997C4.5652 11.9997 4.36955 11.9187 4.2253 11.7744C4.08104 11.6301 4 11.4345 4 11.2305V3.53842C4 3.1304 4.16208 2.7391 4.45059 2.45059C4.7391 2.16208 5.1304 2 5.53841 2H14.7689C14.8699 1.99992 14.97 2.01975 15.0634 2.05836C15.1568 2.09696 15.2416 2.15358 15.3131 2.22499L20.6976 7.60945C20.769 7.68093 20.8256 7.76579 20.8642 7.85917C20.9028 7.95255 20.9226 8.05262 20.9226 8.15366ZM15.5381 7.38445H18.2967L15.5381 4.62588V7.38445Z" fill="#d3d3d3"></path>
      </svg>
      <div>Audio</div>
    </button>

    <button type="button" class="btn-download" data-action="download" title="Download">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M22 14.5V21.1667C22 21.3877 21.9122 21.5996 21.7559 21.7559C21.5996 21.9122 21.3877 22 21.1667 22H2.83333C2.61232 22 2.40036 21.9122 2.24408 21.7559C2.0878 21.5996 2 21.3877 2 21.1667V14.5C2 14.279 2.0878 14.067 2.24408 13.9107C2.40036 13.7545 2.61232 13.6667 2.83333 13.6667C3.05435 13.6667 3.26631 13.7545 3.42259 13.9107C3.57887 14.067 3.66667 14.279 3.66667 14.5V20.3333H20.3333V14.5C20.3333 14.279 20.4211 14.067 20.5774 13.9107C20.7337 13.7545 20.9457 13.6667 21.1667 13.6667C21.3877 13.6667 21.5996 13.7545 21.7559 13.9107C21.9122 14.067 22 14.279 22 14.5ZM11.4104 15.0896C11.4878 15.1671 11.5797 15.2285 11.6809 15.2705C11.782 15.3124 11.8905 15.334 12 15.334C12.1095 15.334 12.218 15.3124 12.3191 15.2705C12.4203 15.2285 12.5122 15.1671 12.5896 15.0896L16.7563 10.9229C16.8729 10.8064 16.9524 10.6578 16.9846 10.4961C17.0168 10.3344 17.0003 10.1667 16.9372 10.0143C16.8741 9.86199 16.7671 9.73179 16.63 9.64023C16.4928 9.54867 16.3316 9.49987 16.1667 9.5H12.8333V2.83333C12.8333 2.61232 12.7455 2.40036 12.5893 2.24408C12.433 2.0878 12.221 2 12 2C11.779 2 11.567 2.0878 11.4107 2.24408C11.2545 2.40036 11.1667 2.61232 11.1667 2.83333V9.5H7.83333C7.66842 9.49987 7.50718 9.54867 7.37002 9.64023C7.23285 9.73179 7.12594 9.86199 7.06281 10.0143C6.99969 10.1667 6.98318 10.3344 7.01539 10.4961C7.0476 10.6578 7.12707 10.8064 7.24375 10.9229L11.4104 15.0896Z" fill="#007C8F"></path>
      </svg>
    </button>
  </div>

  <div class="flex flex-wrap items-center justify-between gap-x-4">
    <button type="button" class="btn-play w-7 p-2 bg-[#007c8f] rounded-full overflow-hidden flex items-center justify-center">
      <!-- play -->
      <svg class="icon-play" width="9" height="10" viewBox="0 0 9 10" fill="none">
        <path d="M8.46113 5C8.46145 5.13058 8.42797 5.25903 8.36394 5.37284C8.29992 5.48665 8.20753 5.58196 8.09577 5.64949L1.16917 9.88678C1.05239 9.95829 0.918642 9.99733 0.781731 9.99987C0.644819 10.0024 0.509713 9.96834 0.390366 9.90121C0.272155 9.83511 0.173682 9.73873 0.105074 9.62196C0.0364653 9.50519 0.000197518 9.37225 0 9.23682V0.763184C0.000197518 0.627751 0.0364653 0.494814 0.105074 0.378045C0.173682 0.261275 0.272155 0.164887 0.390366 0.0987929C0.509713 0.031656 0.644819 -0.00240351 0.781731 0.000131891C0.918642 0.00266729 1.05239 0.0417057 1.16917 0.113215L8.09577 4.35051C8.20753 4.41804 8.29992 4.51335 8.36394 4.62716C8.42797 4.74097 8.46145 4.86942 8.46113 5Z" fill="white"></path>
      </svg>
      <!-- pause -->
      <svg class="icon-pause hidden" width="10" height="10" viewBox="0 0 24 24" fill="none">
        <path d="M21.3333 3.66667V20.3333C21.3333 20.7754 21.1577 21.1993 20.8452 21.5118C20.5326 21.8244 20.1087 22 19.6667 22H15.5C15.058 22 14.6341 21.8244 14.3215 21.5118C14.0089 21.1993 13.8333 20.7754 13.8333 20.3333V3.66667C13.8333 3.22464 14.0089 2.80072 14.3215 2.48816C14.6341 2.17559 15.058 2 15.5 2H19.6667C20.1087 2 20.5326 2.17559 20.8452 2.48816C21.1577 2.80072 21.3333 3.22464 21.3333 3.66667ZM8.83333 2H4.66667C4.22464 2 3.80072 2.17559 3.48816 2.48816C3.17559 2.80072 3 3.22464 3 3.66667V20.3333C3 20.7754 3.17559 21.1993 3.48816 21.5118C3.80072 21.8244 4.22464 22 4.66667 22H8.83333C9.27536 22 9.69928 21.8244 10.0118 21.5118C10.3244 21.1993 10.5 20.7754 10.5 20.3333V3.66667C10.5 3.22464 10.3244 2.80072 10.0118 2.48816C9.69928 2.17559 9.27536 2 8.83333 2Z" fill="white"></path>
      </svg>
    </button>

    <div class="time-current text-[#007c8f] label">00:00</div>

    <div class="range-container">
  <input
    class="seek"
    type="range"
    min="0"
    max="13.949375"
    value="0"
    step="0.01">
</div>

    <div class="time-remaining label text-[#007c8f]">-00:00</div>

    <button type="button" class="btn-mute flex items-center gap-x-2" data-action="mute">
      <!-- volume on -->
      <svg class="icon-volume-on" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M14.4123 3.70994V20.2114C14.4144 20.3348 14.3844 20.4568 14.3254 20.5652C14.2663 20.6737 14.1801 20.765 14.0752 20.8302C13.9561 20.9011 13.8183 20.9344 13.6799 20.9258C13.5415 20.9172 13.4089 20.8671 13.2995 20.782L7.64758 16.386C7.6066 16.3536 7.57352 16.3123 7.55082 16.2653C7.52813 16.2183 7.51641 16.1667 7.51656 16.1144V7.81202C7.51672 7.75958 7.52883 7.70787 7.55199 7.66082C7.57514 7.61377 7.60872 7.57262 7.65017 7.5405L13.3021 3.14449C13.4259 3.04851 13.5788 2.99758 13.7355 3.00009C13.8921 3.0026 14.0433 3.05839 14.164 3.15828C14.2433 3.22641 14.3067 3.31114 14.3496 3.40647C14.3925 3.50181 14.4139 3.60541 14.4123 3.70994ZM5.79264 7.82581H3.37914C3.01337 7.82581 2.66258 7.97111 2.40394 8.22975C2.1453 8.48839 2 8.83918 2 9.20495V14.7215C2 15.0873 2.1453 15.4381 2.40394 15.6967C2.66258 15.9554 3.01337 16.1007 3.37914 16.1007H5.79264C5.88408 16.1007 5.97178 16.0643 6.03644 15.9997C6.1011 15.935 6.13742 15.8473 6.13742 15.7559V8.1706C6.13742 8.07915 6.1011 7.99146 6.03644 7.9268C5.97178 7.86214 5.88408 7.82581 5.79264 7.82581ZM16.7197 9.62214C16.6516 9.68198 16.596 9.75466 16.556 9.83602C16.5161 9.91738 16.4925 10.0058 16.4868 10.0963C16.481 10.1868 16.4931 10.2775 16.5224 10.3632C16.5518 10.449 16.5977 10.5282 16.6577 10.5962C16.9903 10.9739 17.1738 11.4599 17.1738 11.9632C17.1738 12.4665 16.9903 12.9526 16.6577 13.3303C16.5961 13.398 16.5486 13.4772 16.518 13.5634C16.4873 13.6495 16.4741 13.741 16.4791 13.8323C16.4842 13.9236 16.5073 14.013 16.5472 14.0953C16.5871 14.1777 16.643 14.2512 16.7116 14.3117C16.7802 14.3722 16.8602 14.4184 16.9469 14.4477C17.0335 14.477 17.1251 14.4887 17.2164 14.4823C17.3076 14.4758 17.3967 14.4513 17.4783 14.4101C17.56 14.3689 17.6326 14.3118 17.692 14.2423C18.2467 13.6126 18.5527 12.8023 18.5527 11.9632C18.5527 11.1241 18.2467 10.3138 17.692 9.6842C17.6322 9.61598 17.5595 9.56025 17.478 9.52019C17.3966 9.48014 17.308 9.45655 17.2175 9.45078C17.1269 9.44502 17.0361 9.45719 16.9502 9.48659C16.8644 9.516 16.7852 9.56206 16.7172 9.62214H16.7197ZM20.2443 7.36639C20.185 7.29547 20.112 7.2372 20.0297 7.19507C19.9474 7.15293 19.8574 7.12777 19.7652 7.1211C19.673 7.11443 19.5803 7.12637 19.4928 7.15623C19.4053 7.18608 19.3247 7.23322 19.2558 7.29487C19.1868 7.35651 19.131 7.43138 19.0916 7.51503C19.0522 7.59869 19.03 7.68941 19.0264 7.78181C19.0228 7.8742 19.0378 7.96639 19.0705 8.05287C19.1032 8.13936 19.153 8.21838 19.2168 8.28524C20.1216 9.29669 20.6219 10.6062 20.6219 11.9632C20.6219 13.3203 20.1216 14.6298 19.2168 15.6412C19.153 15.7081 19.1032 15.7871 19.0705 15.8736C19.0378 15.9601 19.0228 16.0523 19.0264 16.1447C19.03 16.2371 19.0522 16.3278 19.0916 16.4114C19.131 16.4951 19.1868 16.57 19.2558 16.6316C19.3247 16.6932 19.4053 16.7404 19.4928 16.7702C19.5803 16.8001 19.673 16.812 19.7652 16.8054C19.8574 16.7987 19.9474 16.7735 20.0297 16.7314C20.112 16.6893 20.185 16.631 20.2443 16.5601C21.3749 15.2959 22 13.6593 22 11.9632C22 10.2672 21.3749 8.63061 20.2443 7.36639Z" fill="#007C8F"></path>
      </svg>
      <!-- volume muted -->
      <svg class="icon-volume-off hidden" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M21.7979 13.5452C21.9273 13.6746 22 13.8501 22 14.0331C22 14.2161 21.9273 14.3916 21.7979 14.521C21.6685 14.6504 21.493 14.7231 21.31 14.7231C21.127 14.7231 20.9515 14.6504 20.8221 14.521L19.241 12.9391L17.66 14.521C17.5306 14.6504 17.3551 14.7231 17.1721 14.7231C16.9891 14.7231 16.8136 14.6504 16.6842 14.521C16.5548 14.3916 16.4821 14.2161 16.4821 14.0331C16.4821 13.8501 16.5548 13.6746 16.6842 13.5452L18.2661 11.9642L16.6842 10.3832C16.5548 10.2538 16.4821 10.0782 16.4821 9.89524C16.4821 9.71223 16.5548 9.53672 16.6842 9.40732C16.8136 9.27791 16.9891 9.20521 17.1721 9.20521C17.3551 9.20521 17.5306 9.27791 17.66 9.40732L19.241 10.9892L20.8221 9.40732C20.9515 9.27791 21.127 9.20521 21.31 9.20521C21.493 9.20521 21.6685 9.27791 21.7979 9.40732C21.9273 9.53672 22 9.71223 22 9.89524C22 10.0782 21.9273 10.2538 21.7979 10.3832L20.216 11.9642L21.7979 13.5452ZM5.79303 7.82631H3.37928C3.01348 7.82631 2.66265 7.97163 2.40398 8.2303C2.14532 8.48896 2 8.83979 2 9.2056V14.7227C2 15.0885 2.14532 15.4394 2.40398 15.698C2.66265 15.9567 3.01348 16.102 3.37928 16.102H5.79303C5.88448 16.102 5.97219 16.0657 6.03686 16.001C6.10152 15.9364 6.13785 15.8486 6.13785 15.7572V8.17113C6.13785 8.07968 6.10152 7.99198 6.03686 7.92731C5.97219 7.86264 5.88448 7.82631 5.79303 7.82631ZM14.1679 3.1583C14.0471 3.0584 13.896 3.0026 13.7393 3.00009C13.5826 2.99758 13.4297 3.04852 13.3058 3.14451L7.65334 7.54098C7.61141 7.57283 7.57733 7.61387 7.55372 7.66094C7.53011 7.70801 7.5176 7.75986 7.51714 7.81252V16.1158C7.51729 16.1683 7.52941 16.22 7.55256 16.267C7.57572 16.3141 7.6093 16.3552 7.65075 16.3874L13.3032 20.7838C13.4127 20.8689 13.5453 20.9191 13.6837 20.9277C13.8221 20.9363 13.9599 20.903 14.0791 20.8321C14.184 20.7669 14.2701 20.6755 14.3292 20.5671C14.3883 20.4586 14.4182 20.3366 14.4161 20.2131V3.71001C14.4174 3.60527 14.3956 3.50153 14.3523 3.40617C14.3089 3.31082 14.2451 3.22618 14.1653 3.1583H14.1679Z" fill="#007C8F"></path>
      </svg>
    </button>
  </div>

  <!-- hidden native element -->
      <audio class="el hidden"></audio>
    </div>`;
  }

  initAudioPlayers(scope = document) {
    const cards = scope.querySelectorAll("[data-audio-player]");
    cards.forEach((card) => {
      if (card.__wired) return;
      card.__wired = true;

      const audio = card.querySelector("audio.el");
      const src = card.getAttribute("data-src");
      const fileName = card.getAttribute("data-filename") || "audio";
      const btnPlay = card.querySelector(".btn-play");
      const iconPlay = card.querySelector(".icon-play");
      const iconPause = card.querySelector(".icon-pause");
      const btnMutes = card.querySelectorAll('[data-action="mute"]');
      const volOn = card.querySelectorAll(".icon-volume-on");
      const volOff = card.querySelectorAll(".icon-volume-off");
      const btnDownload = card.querySelector('[data-action="download"]');
      const seek = card.querySelector(".seek");
      const timeCurrent = card.querySelector(".time-current");
      const timeRemaining = card.querySelector(".time-remaining");

      audio.src = src;

      const fmt = (t) => {
        if (!isFinite(t)) t = 0;
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m.toString().padStart(2, "0")}:${s
          .toString()
          .padStart(2, "0")}`;
      };

      const refreshTimes = () => {
        timeCurrent.textContent = fmt(audio.currentTime || 0);
        const remain = Math.max(
          0,
          (audio.duration || 0) - (audio.currentTime || 0)
        );
        timeRemaining.textContent = `-${fmt(remain)}`;
      };

      audio.addEventListener("loadedmetadata", () => {
        seek.max = isFinite(audio.duration) ? audio.duration : 0;
        refreshTimes();
      });

      audio.addEventListener("timeupdate", () => {
        if (!seek.matches(":active")) seek.value = audio.currentTime || 0;
        refreshTimes();
      });

      audio.addEventListener("play", () => {
        iconPlay.classList.add("hidden");
        iconPause.classList.remove("hidden");
      });
      audio.addEventListener("pause", () => {
        iconPause.classList.add("hidden");
        iconPlay.classList.remove("hidden");
      });
      audio.addEventListener("ended", () => {
        iconPause.classList.add("hidden");
        iconPlay.classList.remove("hidden");
      });

      btnPlay.addEventListener("click", () => {
        if (audio.paused) audio.play();
        else audio.pause();
      });

      btnMutes.forEach((btn) => {
        btn.addEventListener("click", () => {
          audio.muted = !audio.muted;
          volOn.forEach((el) => el.classList.toggle("hidden", audio.muted));
          volOff.forEach((el) => el.classList.toggle("hidden", !audio.muted));
        });
      });

      seek.addEventListener("input", () => {
        audio.currentTime = Number(seek.value || 0);
        refreshTimes();
      });

      btnDownload?.addEventListener("click", () => {
        const a = document.createElement("a");
        a.href = audio.src;
        a.download = fileName || "audio";
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
    });
  }

  showEmptyModal(message, duration = 3000) {
    let modal = document.querySelector(".empty-modal");
    let modalContent;
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "empty-modal";
      modalContent = document.createElement("div");
      modalContent.className = "empty-modal-content";
      modalContent.id = "dynamicModalMessage";
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
    } else {
      modalContent = document.getElementById("dynamicModalMessage");
    }

    modalContent.textContent = message;
    modal.classList.add("show");
    setTimeout(() => {
      modal.classList.remove("show");
    }, duration);
  }

  implementToolbarEffect() {
    document
      .querySelectorAll(".containerForToolbar button")
      .forEach((button) => {
        // Check if listener is already applied
        if (button.dataset.listenerAdded) return;

        button.addEventListener("click", (e) => {
          const action = button.title.toLowerCase(); // bold, italic, underline, add link

          // Find nearest contenteditable below toolbar
          const editor = button
            .closest(".containerForToolbar")
            .nextElementSibling.querySelector("[contenteditable='true']");
          if (!editor) return;

          editor.focus(); // focus editor before execCommand

          switch (action) {
            case "bold":
              document.execCommand("bold");
              break;
            case "italic":
              document.execCommand("italic");
              break;
            case "underline":
              document.execCommand("underline");
              break;
            case "add link":
              const url = prompt("Enter URL:", "https://");
              if (!url) return;
              document.execCommand("createLink", false, url);
              break;
          }
        });

        // Mark this button as having a listener
        button.dataset.listenerAdded = "true";
      });
  }

  findActiveTab() {
    let activeTab = document.querySelector(
      "#allAnnouncementsContainer .activeTab"
    );
    if (!activeTab) return;
    const active_id = activeTab.id;
    return active_id;
  }
}
