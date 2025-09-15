import { forumMapper } from "../utils/helper.js";
import { contactMapper } from "../utils/helper.js";
import { hideLoader } from "../utils/helper.js";
import { tributObj } from "../utils/helper.js";

export class AWCController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.currentAuthorId = "92";
    this.myForumPosts = [];
    this.allForumPosts = [];
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
      const navLinks = Array.from(nav?.querySelectorAll("a[data-target]") || []);

      const sectionsById = new Map(sections.map((s) => [s.id, s]));
      const linkById = new Map(links.map((l) => [l.dataset.target, l]));
      const navLinkById = new Map(navLinks.map((l) => [l.dataset.target, l]));
      const routeById = new Map(
        Array.from(sectionsById.keys()).map((id) => [id, id.replace(/-section$/i, "")])
      );
      const idByRoute = new Map(
        Array.from(routeById.entries()).map(([id, route]) => [route.toLowerCase(), id])
      );

      let currentId = sections.find((sec) => !sec.classList.contains("hidden"))?.id || null;

      const setActiveSection = (targetId) => {
        if (!targetId || currentId === targetId) return;
        const prevId = currentId;
        currentId = targetId;

        const prevSection = prevId ? sectionsById.get(prevId) : null;
        const nextSection = sectionsById.get(targetId);
        if (prevSection) prevSection.classList.add("hidden");
        if (nextSection) nextSection.classList.remove("hidden");

        const prevLink = prevId ? navLinkById.get(prevId) : null;
        if (prevLink) prevLink.classList.remove("text-sky-600", "font-semibold");
        const nextLink = navLinkById.get(targetId);
        if (nextLink) nextLink.classList.add("text-sky-600", "font-semibold");
      };

      const idToRoute = (id) => routeById.get(id) || "";
      const routeToId = (route) => idByRoute.get((route || "").toLowerCase()) || null;

      const updateUrlParam = (route, replace = false) => {
        const url = new URL(window.location.href);
        if (route) url.searchParams.set("section", route);
        else url.searchParams.delete("section");
        const newUrl = `${url.pathname}${url.search}${url.hash}`;
        if (replace) history.replaceState({}, "", newUrl);
        else history.pushState({}, "", newUrl);
      };

      const navigateTo = (targetId, { update = true, replace = false } = {}) => {
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
      this.model.onData((records) => {
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
      await this.model.init();
      // Render course content via template (static data for now)
      const modules = this.buildSampleModules();
      this.view.renderCourseContent(modules);
      this.wireEvents();
      await this.tributeHandler();
      this.postsHandler();
    } catch (err) {
      console.error("Error initializing ForumController:", err);
    } finally {
      hideLoader();
    }
  }

  buildSampleModules() {
    return [
      {
        title: "TEST2 Start here",
        description: "",
        time: "3 min",
        units: 2,
        lessons: [
          { title: "Welcome to your course", time: "3 min" },
          { title: "MUST WATCH: How to navigate your online classroom" },
        ],
      },
      {
        title: "TEST2 Module 1: Key elements and characters",
        description:
          "In this module, you’ll discover more about the children’s novel and how it fits into publishing for children. We’ll look at what makes writing for this…",
        time: "79 min",
        units: 7,
        lessons: [
          { title: "Creating core characters" },
          { title: "World-building basics" },
        ],
      },
      {
        title: "TEST2 Module 2: A child's point of view",
        description:
          "Voice is the beginning of point of view, but there’s a lot more to it. This module looks at how point of view works – including how to avoid…",
        time: "83 min",
        units: 9,
        lessons: [
          { title: "Opening hooks that shine" },
          { title: "Pacing your first chapter" },
        ],
      },
      {
        title: "TEST2 Module 3: Write magnetic beginnings",
        description:
          "You need to grab the attention of young readers from the first page so it’s vital that you write a compelling beginning. Young readers aren’t…",
        time: "61 min",
        units: 7,
        lessons: [
          { title: "Three-act structure walkthrough" },
          { title: "Balancing plot and character" },
        ],
      },
    ];
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

  wireEvents() {
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
      let { type, postId, commentId, element } = payload;
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
            });
            if (result?.isCancelling) {
              console.log("Error while voting the record");
              return;
            }
            console.log("Post has been voted");
            this.view.applyUpvoteStyles(postId, voteId);
          } else {
            let result = await this.model.deleteVote(voteId);
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
              this.currentAuthorId
            );
            if (result?.isCancelling) {
              console.log("Error while voting the record");
              return;
            }
            console.log("Post has been voted");
            this.view.applyUpvoteStyles(postId, voteId);
          } else {
            let result = await this.model.deleteCommentUpvote(Number(voteId));
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
              this.currentAuthorId
            );
            if (result?.isCancelling) {
              console.log("Error while voting the record");
              return;
            }
            console.log("Post has been voted");
            this.view.applyUpvoteStyles(postId, voteId);
          } else {
            let result = await this.model.deleteCommentUpvote(Number(voteId));
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

    this.view.getCommentValueObj(async (payload, fileMeta, element) => {
      try {
        payload.authorId = this.currentAuthorId;
        let result = await this.model.createComment(payload, fileMeta);
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
    });

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
