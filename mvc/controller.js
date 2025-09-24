import { forumMapper } from "../utils/helper.js";
import { contactMapper } from "../utils/helper.js";
import { hideLoader } from "../utils/helper.js";
import { tributObj } from "../utils/helper.js";
import { courseMapper } from "../utils/helper.js";
import { announcementMapper } from "../utils/helper.js";

export class AWCController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.currentAuthorId = "62";
    this.myForumPosts = [];
    this.allForumPosts = [];
    this.enrolmentId = Number(window.enrolmentId ?? 1);
    this.modules = [];
    this.progressState = {
      enrolmentId: this.enrolmentId,
      lastLessonId: null,
      inProgressLessonIds: [],
      completedLessonIds: [],
      lessonUrlMap: {},
    };
    this.boundCrossWindowHandler = (event) =>
      this.handleCrossWindowMessage(event);
    window.addEventListener("message", this.boundCrossWindowHandler);
    this.initialListners();
  }

  initialListners() {
    const setupNav = () => {
      // Cache DOM references and build maps once
      const sections = Array.from(
        document.querySelectorAll("#main-content > div")
      );
      const links = Array.from(document.querySelectorAll("a[data-target]"));
      const nav = document.querySelector("nav");
      const navLinks = Array.from(
        nav?.querySelectorAll("a[data-target]") || []
      );

      const sectionsById = new Map(sections.map((s) => [s.id, s]));
      const linkById = new Map(links.map((l) => [l.dataset.target, l]));
      const navLinkById = new Map(navLinks.map((l) => [l.dataset.target, l]));
      const routeById = new Map(
        Array.from(sectionsById.keys()).map((id) => [
          id,
          id.replace(/-section$/i, ""),
        ])
      );
      const idByRoute = new Map(
        Array.from(routeById.entries()).map(([id, route]) => [
          route.toLowerCase(),
          id,
        ])
      );

      let currentId =
        sections.find((sec) => !sec.classList.contains("hidden"))?.id || null;

      const setActiveSection = (targetId) => {
        if (!targetId || currentId === targetId) return;
        const prevId = currentId;
        currentId = targetId;

        const prevSection = prevId ? sectionsById.get(prevId) : null;
        const nextSection = sectionsById.get(targetId);
        if (prevSection) prevSection.classList.add("hidden");
        if (nextSection) nextSection.classList.remove("hidden");

        const prevLink = prevId ? navLinkById.get(prevId) : null;
        if (prevLink)
          prevLink.classList.remove("text-sky-600", "font-semibold");
        const nextLink = navLinkById.get(targetId);
        if (nextLink) nextLink.classList.add("text-sky-600", "font-semibold");
      };

      const idToRoute = (id) => routeById.get(id) || "";
      const routeToId = (route) =>
        idByRoute.get((route || "").toLowerCase()) || null;

      const updateUrlParam = (route, replace = false) => {
        const url = new URL(window.location.href);
        if (route) url.searchParams.set("section", route);
        else url.searchParams.delete("section");
        const newUrl = `${url.pathname}${url.search}${url.hash}`;
        if (replace) history.replaceState({}, "", newUrl);
        else history.pushState({}, "", newUrl);
      };

      const navigateTo = (
        targetId,
        { update = true, replace = false } = {}
      ) => {
        if (!targetId || currentId === targetId) return;
        setActiveSection(targetId);
        if (update) {
          const route = idToRoute(targetId);
          if (route) updateUrlParam(route, replace);
        }
      };

      // Stable default (overview/first tab)
      const defaultId = navLinks[0]?.dataset.target || sections[0]?.id;

      // Wire link clicks and set hrefs for deep links (?section=...)
      links.forEach((link) => {
        const targetId = link.dataset.target;
        const route = idToRoute(targetId);
        if (route) link.setAttribute("href", `?section=${route}`);
        link.addEventListener("click", (e) => {
          e.preventDefault();
          if (targetId && targetId !== currentId) {
            navigateTo(targetId, { update: true, replace: false });
          }
        });
      });

      // Handle initial route via query param and subsequent history navigation
      const resolveInitial = () => {
        const url = new URL(window.location.href);
        const raw = (url.searchParams.get("section") || "").toLowerCase();
        const fromQuery = routeToId(raw);
        if (fromQuery) return { id: fromQuery, valid: true };
        return { id: defaultId, valid: false };
      };

      const { id: initialId, valid } = resolveInitial();
      if (initialId !== currentId) {
        navigateTo(initialId, { update: !valid, replace: true });
      } else if (!valid) {
        const route = idToRoute(initialId);
        if (route) updateUrlParam(route, true);
      }

      window.addEventListener("popstate", () => {
        const url = new URL(window.location.href);
        const raw = (url.searchParams.get("section") || "").toLowerCase();
        const targetId = routeToId(raw) || defaultId;
        if (targetId !== currentId) setActiveSection(targetId);
      });
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", setupNav, { once: true });
    } else {
      setupNav();
    }
  }

  async init() {
    try {
      this.model.onPostData((records) => {
        try {
          this.allForumPosts = forumMapper(records);
          this.myForumPosts = this.allForumPosts?.filter(
            (item) => item.authorId == this.currentAuthorId
          );
          this.view.renderPosts(this.allForumPosts);
          this.view.initAudioPlayers();
        } catch (err) {
          console.error("Error mapping/rendering posts:", err);
        } finally {
          let element = document.getElementById("create-post-section");
          this.view.disableHTML(element, "enable");
        }
      });

      this.model.onAnnouncementData((records) => {
        let x = announcementMapper(records);
        this.view.renderAnnouncement(x);
      });

      this.model.onCourseData(async (records) => {
        try {
          const { courseName, modules } = courseMapper(records);
          this.modules = Array.isArray(modules) ? modules : [];
          this.view.updateCourseHeader(courseName);
          await this.refreshProgressState({ modules: this.modules });
        } catch (err) {
          console.error("Error preparing course data:", err);
        }
      });

      this.view.registerLessonActionHandler((payload) =>
        this.handleLessonLaunch(payload)
      );
      this.view.registerBannerActionHandler((payload) =>
        this.handleBannerLaunch(payload)
      );

      await this.model.init();
      this.wirePostEvents();
      await this.tributeHandler();
      this.postsHandler();
    } catch (err) {
      console.error("Error initializing ForumController:", err);
    } finally {
      hideLoader();
    }
  }

  async refreshProgressState({ modules = this.modules } = {}) {
    if (Array.isArray(modules)) this.modules = modules;
    try {
      const progress = await this.model.fetchEnrolmentProgress(
        this.enrolmentId
      );
      this.progressState = this.augmentProgressData(progress);
      this.view.renderCourseContent({
        modules: this.modules,
        progress: this.progressState,
      });
      this.view.updateResumeBanner(this.progressState);
    } catch (err) {
      console.error("Error refreshing enrolment progress:", err);
    }
  }

  augmentProgressData(progress = {}) {
    const cleaned = {
      enrolmentId: progress?.enrolmentId ?? this.enrolmentId ?? null,
      lastLessonId:
        progress?.lastLessonId != null ? Number(progress.lastLessonId) : null,
      inProgressLessonIds: Array.isArray(progress?.inProgressLessonIds)
        ? progress.inProgressLessonIds.map((id) => Number(id))
        : [],
      completedLessonIds: Array.isArray(progress?.completedLessonIds)
        ? progress.completedLessonIds.map((id) => Number(id))
        : [],
      lessonUrlMap: {},
      resumeLessonName: "",
      resumeModuleName: "",
      resumeUrl: "",
    };

    const inProgressSet = new Set(cleaned.inProgressLessonIds);
    const completedSet = new Set(cleaned.completedLessonIds);

    for (const module of this.modules || []) {
      const lessons = Array.isArray(module?.lessons) ? module.lessons : [];
      for (const lesson of lessons) {
        const lessonId = Number(lesson?.id);
        if (!lessonId) continue;
        const preparedUrl = this.buildLessonUrl(
          lesson?.lesson_template_url,
          lessonId
        );
        cleaned.lessonUrlMap[lessonId] = preparedUrl;

        if (cleaned.lastLessonId && lessonId === cleaned.lastLessonId) {
          cleaned.resumeLessonName = lesson?.lesson_name ?? "";
          cleaned.resumeModuleName = module?.module_name ?? "";
          cleaned.resumeUrl = preparedUrl;
          inProgressSet.add(lessonId);
        }
      }
    }

    cleaned.inProgressLessonIds = Array.from(inProgressSet);
    cleaned.completedLessonIds = Array.from(completedSet);

    if (!cleaned.resumeUrl) {
      const fallback = this.getFirstLesson();
      if (fallback.lesson && fallback.module) {
        const lessonId = Number(fallback.lesson.id);
        if (lessonId) {
          cleaned.resumeUrl = this.buildLessonUrl(
            fallback.lesson.lesson_template_url,
            lessonId
          );
          cleaned.resumeLessonName = fallback.lesson.lesson_name ?? "";
          cleaned.resumeModuleName = fallback.module.module_name ?? "";
        }
      }
    }

    return cleaned;
  }

  buildLessonUrl(baseUrl, lessonId) {
    let sourceUrl = baseUrl;
    if (!sourceUrl) {
      const { lesson } = this.getLessonById(lessonId);
      sourceUrl = lesson?.lesson_template_url ?? "";
      if (!sourceUrl) return "";
    }
    try {
      const url = new URL(sourceUrl, window.location.href);
      if (lessonId != null) url.searchParams.set("lessonId", String(lessonId));
      if (this.enrolmentId) {
        url.searchParams.set("enrolmentId", String(this.enrolmentId));
      }
      return url.href;
    } catch (err) {
      const params = new URLSearchParams();
      if (lessonId != null) params.set("lessonId", String(lessonId));
      if (this.enrolmentId) params.set("enrolmentId", String(this.enrolmentId));
      const separator = sourceUrl.includes("?") ? "&" : "?";
      return `${sourceUrl}${separator}${params.toString()}`;
    }
  }

  getFirstLesson() {
    for (const module of this.modules || []) {
      const lessons = Array.isArray(module?.lessons) ? module.lessons : [];
      if (lessons.length) {
        return { lesson: lessons[0], module };
      }
    }
    return { lesson: null, module: null };
  }

  getLessonById(lessonId) {
    const targetId = Number(lessonId);
    if (!targetId) return { lesson: null, module: null };
    for (const module of this.modules || []) {
      const lessons = Array.isArray(module?.lessons) ? module.lessons : [];
      const lesson = lessons.find((item) => Number(item?.id) === targetId);
      if (lesson) return { lesson, module };
    }
    return { lesson: null, module: null };
  }

  handleCrossWindowMessage(event) {
    const payload = event?.data;
    if (!payload || typeof payload !== "object") return;
    const targetEnrolment =
      payload.enrolmentId != null ? Number(payload.enrolmentId) : null;
    if (targetEnrolment && targetEnrolment !== this.enrolmentId) return;

    const type = payload.type;
    if (
      type === "lesson-completed" ||
      type === "lesson-progress-updated" ||
      type === "lesson-state-refresh"
    ) {
      this.refreshProgressState();
    }
  }

  async handleLessonLaunch({ event, lessonId, url, lessonStatus } = {}) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const id = Number(lessonId);
    if (!id) return;

    const launchUrl =
      url ||
      this.progressState.lessonUrlMap?.[id] ||
      this.buildLessonUrl(null, id);
    const sanitizedUrl = launchUrl && launchUrl !== "#" ? launchUrl : null;
    const popup = sanitizedUrl
      ? window.open(sanitizedUrl, "_blank", "noopener")
      : null;

    try {
      const tasks = [
        this.model.updateEnrolmentLastLesson({
          enrolmentId: this.enrolmentId,
          lessonId: id,
        }),
      ];
      const alreadyInProgress = this.progressState.inProgressLessonIds.some(
        (current) => Number(current) === id
      );
      if (!alreadyInProgress) {
        tasks.push(
          this.model.markLessonInProgress({
            enrolmentId: this.enrolmentId,
            lessonId: id,
          })
        );
      }
      await Promise.all(tasks);
    } catch (err) {
      console.error("Error updating enrolment progress:", err);
    } finally {
      await this.refreshProgressState();
      if (popup && !popup.closed && sanitizedUrl) {
        try {
          popup.location.replace(sanitizedUrl);
        } catch (err) {
          // ignore cross-origin navigation errors
        }
      } else if (!popup && sanitizedUrl) {
        window.open(sanitizedUrl, "_blank", "noopener");
      }
    }
  }

  async handleBannerLaunch({ event, lessonId, url } = {}) {
    if (!Array.isArray(this.modules) || this.modules.length === 0) return;
    const explicitLessonId = Number(lessonId);
    const bannerLessonId = explicitLessonId || this.progressState.lastLessonId;
    const id =
      bannerLessonId || Number(this.getFirstLesson().lesson?.id ?? null);
    if (!id) return;
    const launchUrl =
      url ||
      this.progressState.lessonUrlMap?.[id] ||
      this.buildLessonUrl(null, id);
    await this.handleLessonLaunch({ event, lessonId: id, url: launchUrl });
  }

  async tributeHandler() {
    try {
      let records = await this.model.fetchContacts();
      let mapped = contactMapper(Object.values(records));
      let tribute = new Tribute(tributObj);
      tribute.collection[0].values = mapped;
      tribute.attach(document.getElementById("post-data"));

      document.addEventListener("focusin", (e) => {
        try {
          const t = e.target;
          if (!t || t.getAttribute("contenteditable") !== "true") return;
          if (t.matches(".post-input")) {
            tribute.attach(t);
          }
        } catch (err) {
          console.error("Error attaching tribute:", err);
        }
      });
    } catch (err) {
      console.error("Error initializing tribute:", err);
    }
  }

  wirePostEvents() {
    this.view.onCreatePost(async ({ copy, fileMeta }, element) => {
      if (!copy) copy = "";
      try {
        const result = await this.model.createPost({
          authorId: this.currentAuthorId,
          copy,
          fileMeta,
        });
        if (result?.isCancelling) {
          console.log("Error while creating the records");
          return;
        }
        console.log("New post created");
        this.view.removeFieldData();
        document
          .querySelectorAll(".commentFilePreviewContainer")
          .forEach((el) => {
            el.innerHTML = "";
          });
      } catch (err) {
        console.error("Error creating post:", err);
      } finally {
        // this.view.disableHTML(element, 'enable');
        this.view.updateButtons(element, "initialize");
      }
    });

    this.view.onUpvote(async (payload) => {
      let { type, postId, commentId, element, section } = payload;
      try {
        this.view.disableHTML(element, "disable");

        if (type == "post") {
          let btn = document.querySelector(
            `[data-action="upvote-post"][data-post-id="${postId}"]`
          );
          if (!btn) throw new Error("Post upvote element not found");
          let voteId = btn.getAttribute("data-vote-id");

          if (!voteId) {
            let result = await this.model.createVote({
              Forum_Reactor_ID: this.currentAuthorId,
              Reacted_to_Forum_ID: postId,
              section: section,
            });
            if (result?.isCancelling) {
              console.log("Error while voting the record");
              return;
            }
            console.log("Post has been voted");
            this.view.applyUpvoteStyles(postId, voteId);
          } else {
            let result = await this.model.deleteVote(voteId, section);
            if (result.isCancelling) {
              console.log("Error while deleting the vote of the record");
              return;
            }
            this.view.applyUpvoteStyles(postId, "");
          }
        } else if (type == "comment") {
          let btn = document.querySelector(
            `[data-action="upvote-comment"][data-comment-id="${commentId}"]`
          );
          if (!btn) throw new Error("Comment upvote element not found");
          let voteId = btn.getAttribute("data-vote-id");

          if (!voteId) {
            let result = await this.model.createCommentUpvote(
              commentId,
              this.currentAuthorId,
              section
            );
            if (result?.isCancelling) {
              console.log("Error while voting the record");
              return;
            }
            console.log("Post has been voted");
            this.view.applyUpvoteStyles(postId, voteId);
          } else {
            let result = await this.model.deleteCommentUpvote(
              Number(voteId),
              section
            );
            if (result?.isCancelling) {
              console.log("Error while voting the comment");
              return;
            }
            console.log("upvote has been removed");
          }
        } else if (type == "reply") {
          let btn = document.querySelector(
            `[data-action="upvote-reply"][data-reply-id="${commentId}"]`
          );
          if (!btn) throw new Error("Reply upvote element not found");
          let voteId = btn.getAttribute("data-vote-id");

          if (!voteId) {
            let result = await this.model.createCommentUpvote(
              commentId,
              this.currentAuthorId,
              section
            );
            if (result?.isCancelling) {
              console.log("Error while voting the record");
              return;
            }
            console.log("Post has been voted");
            this.view.applyUpvoteStyles(postId, voteId);
          } else {
            let result = await this.model.deleteCommentUpvote(
              Number(voteId),
              section
            );
            if (result?.isCancelling) {
              console.log("Error while voting the reply");
              return;
            }
            console.log("upvote has been removed");
          }
        }
      } catch (err) {
        console.error("Error handling upvote:", err);
      } finally {
        this.view.disableHTML(element, "enable");
      }
    });

    this.view.onCommentButtonClicked(async (postId) => {
      try {
        let cmtEl = document.querySelector(
          `[data-action="toggle-comment"][data-post-id="${postId}"]`
        );
        if (!cmtEl) {
          console.log("Couldn't find comment toggle element");
        } else {
          let el = document.querySelector(`.commentForm#commentForm_${postId}`);
          this.view.toggleCreateForumSection(el);
          this.view.implementToolbarEffect();
        }
      } catch (err) {
        console.error("Error toggling comment form:", err);
      }
    });

    this.view.onDeleteRequest(async (payload) => {
      let { commentId, postId, type } = payload;
      try {
        if (type == "comment") {
          const res = await this.model.deleteComment(commentId);
          if (!res.isCancelling) {
            console.log("comment has been deleted");
            this.view.removePostNode(commentId);
          } else {
            console.log("Delete failed");
          }
        }
        if (type == "post") {
          const res = await this.model.deletePostById(postId);
          if (!res.isCancelling) {
            this.view.removePostNode(postId);
          } else {
            console.log("Delete failed");
          }
        }
      } catch (err) {
        console.error("Error deleting:", err);
      }
    });

    this.view.onReplyButtonClicked(async (commentId) => {
      try {
        let replyEl = document.querySelector(
          `[data-action="toggle-reply"][data-comment-id="${commentId}"]`
        );
        if (!replyEl) {
          console.log("Couldn't find reply toggle element");
        } else {
          let el = document.querySelector(`.ReplyForm#replyForm_${commentId}`);
          this.view.toggleCreateForumSection(el);
          if (!el.classList.contains("hidden")) {
            this.view.implementToolbarEffect();
          }
        }
      } catch (err) {
        console.error("Error toggling reply form:", err);
      }
    });

    this.view.getCommentValueObj(
      async (payload, fileMeta, element, section) => {
        try {
          payload.authorId = this.currentAuthorId;
          let result = await this.model.createComment(
            payload,
            fileMeta,
            section
          );
          if (!result.isCancelling) {
            console.log("New comment has been created");
          } else {
            console.log("Comment creation failed");
          }
        } catch (err) {
          console.error("Error creating comment:", err);
        } finally {
          this.view.disableHTML(element, "enable");
        }
      }
    );

    this.view.getReplyValueObj(async (payload, metaData, element) => {
      try {
        payload.authorId = this.currentAuthorId;
        let result = await this.model.createReplyToComment(payload, metaData);
        if (!result.isCancelling) {
          console.log("New Reply has been created");
          document
            .getElementById(`replyForm_${payload.commentId}`)
            .style.setProperty("display", "none");
        } else {
          console.log("Reply failed");
        }
      } catch (err) {
        console.error("Error creating reply:", err);
      } finally {
        this.view.disableHTML(element, "enable");
      }
    });
  }

  wireAnnouncementEvents() {}

  postsHandler() {
    let myPostBtn = document.getElementById("my-posts-tab");
    let allPostBtn = document.getElementById("all-posts-tab");
    allPostBtn.classList.add("activeTab");
    myPostBtn.addEventListener("click", () => {
      this.view.renderPosts(this.myForumPosts);
      myPostBtn.classList.add("activeTab");
      allPostBtn.classList.remove("activeTab");
    });
    allPostBtn.addEventListener("click", () => {
      this.view.renderPosts(this.allForumPosts);
      allPostBtn.classList.add("activeTab");
      myPostBtn.classList.remove("activeTab");
    });
  }
}
