// Snapshot of the advanced AWCModel implementation prior to the reset.
// This file consolidates the version that included announcement support,
// guarded subscriptions, and section-aware voting/comment APIs.

export class AWCModel {
  constructor(plugin) {
    window.plugin = plugin;
    window.eduflowproForumPostmodel = plugin.switchTo("EduflowproForumPost");
    window.eduflowproCourseModel = plugin.switchTo("EduflowproCourse");
    window.eduflowproAnnouncementModel = plugin.switchTo(
      "EduflowproAnnouncement"
    );
    window.forumReactorReactedToForumModal = plugin.switchTo(
      "EduflowproOForumReactorReactedtoForum"
    );
    window.AnnouncementReactorReactedToAnnouncementModel = plugin.switchTo(
      "EduflowproAnnouncementReactor"
    );
    window.MemberCommentUpvoteLinkModel = plugin.switchTo(
      "EduflowproMemberCommentUpvotesForumCommentUpvotes"
    );
    window.contactModal = plugin.switchTo("EduflowproContact");
    this.limit = 500;
    this.offset = 0;
    this.PostQuery = null;
    this.courseQuery = null;
    this.announcementQuery = null;
    this.subscriptions = new Set();
    this.forumDataCallback = null;
    this.courseDataCallback = null;
    this.announcementCallback = null;
    this.postSubscription = null;
    this.announcementSubscription = null;
    this._isFetchingPosts = false;
    this._isFetchingAnnouncements = false;
  }

  onPostData(cb) {
    this.forumDataCallback = cb;
  }

  onCourseData(cb) {
    this.courseDataCallback = cb;
  }

  onAnnouncementData(cb) {
    this.announcementCallback = cb;
  }

  async init() {
    this.buildFetchPostQuery();
    await this.fetchPosts();
    this.buildFetchCourseContentQuery();
    await this.fetchCourseContent();
    this.buildFetchAnnouncementQuery();
    await this.fetchAnnouncement();
    this.subscribeToPosts();
    this.subscribeToAnnouncement();
    this.setupPostModelSubscription();
    this.setupPostAnnouncementSubscription();
  }

  destroy() {
    this.unsubscribeAll();
    if (this.PostQuery?.destroy) this.PostQuery.destroy();
    this.PostQuery = null;
  }

  buildFetchCourseContentQuery() {
    this.courseQuery = eduflowproCourseModel
      .query()
      .deSelectAll()
      .select(["id", "course_name", "description"])
      .whereNotNull("course_name")
      .noDestroy();

    return this.courseQuery;
  }

  buildFetchAnnouncementQuery() {
    this.announcementQuery = eduflowproAnnouncementModel
      .query()
      .deSelectAll()
      .select([
        "id",
        "status",
        "content",
        "attachement",
        "created_at",
        "disable_comments",
        "profile_image",
        "instructor_id",
      ])
      .include("Instructor", (q) => {
        q.deSelectAll().select([
          "display_name",
          "first_name",
          "last_name",
          "profile_image",
        ]);
      })
      .include("Announcement_Reactors_Data", (q) => {
        q.deSelectAll().select([
          "id",
          "announcement_reactor_id",
          "contact_announcement_reactor_id",
        ]);
      })
      .include("ForumComments", (q) => {
        q.deSelectAll()
          .select(["id", "comment"])
          .include("Member_Comment_Upvotes_Data", (child) =>
            child.deSelectAll().select(["id"])
          )
          .include("ForumComments", (child) => {
            child
              .deSelectAll()
              .select(["id", "comment"])
              .include("Member_Comment_Upvotes_Data", (grand) =>
                grand.deSelectAll().select(["id"])
              );
          });
      })
      .noDestroy();
  }

  async fetchAnnouncement() {
    if (this._isFetchingAnnouncements) return;
    this._isFetchingAnnouncements = true;
    try {
      await this.announcementQuery
        .fetch()
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();
      this.renderAnnouncementState();
    } catch (e) {
      console.log("Error fetching announcements", e.error);
      return [];
    } finally {
      this._isFetchingAnnouncements = false;
    }
  }

  async fetchCourseContent() {
    try {
      await this.courseQuery
        .fetch()
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();
      this.renderFromCourseContentState();
    } catch (e) {
      console.log("Error", e.error);
    }
  }

  buildFetchPostQuery() {
    this.PostQuery = eduflowproForumPostmodel
      .query()
      .deSelectAll()
      .select(["id"])
      .where("forum_status", "Published - Not flagged")
      .orderBy("created_at", "desc")
      .include("Author", (q) =>
        q.deSelectAll().select(["id", "Display_Name", "is_instructor"])
      )
      .include("Forum_Reactors_Data", (q) =>
        q
          .deSelectAll()
          .select(["id", "forum_reactor_id", "reacted_to_forum_id"])
      )
      .include("ForumComments", (q) => {
        q.deSelectAll()
          .select(["id", "comment"])
          .include("Member_Comment_Upvotes_Data", (child) =>
            child.deSelectAll().select(["id"])
          )
          .include("Author", (q) => {
            q.select(["display_name"]);
          })
          .include("ForumComments", (child) => {
            child
              .deSelectAll()
              .select(["id", "comment"])
              .include("Member_Comment_Upvotes_Data", (grand) =>
                grand.deSelectAll().select(["id"])
              );
          });
      })
      .noDestroy();
    return this.PostQuery;
  }

  async fetchPosts() {
    if (this._isFetchingPosts) return;
    this._isFetchingPosts = true;
    try {
      await this.PostQuery.fetch()
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();
      this.renderForumPostState();
    } catch (e) {
      console.log("Error fetching posts", e.error);
    } finally {
      this._isFetchingPosts = false;
    }
  }

  renderForumPostState() {
    const postRecs = this.PostQuery.getAllRecordsArray();
    if (this.forumDataCallback) this.forumDataCallback(postRecs);
  }

  renderFromCourseContentState() {
    const courseRecs = this.courseQuery.getAllRecordsArray();
    if (this.courseDataCallback) this.courseDataCallback(courseRecs);
  }

  renderAnnouncementState() {
    const announcementRecs =
      typeof this.announcementQuery?.getAllRecordsArray === "function"
        ? this.announcementQuery.getAllRecordsArray()
        : [];
    if (this.announcementCallback)
      this.announcementCallback(announcementRecs ?? []);
  }

  subscribeToPosts() {
    this.unsubscribeAll();
    try {
      let liveObs;
      if (this.PostQuery.subscribe) {
        liveObs = this.PostQuery.subscribe();
      } else {
        liveObs = this.PostQuery.localSubscribe();
      }
      const liveSub = liveObs
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .subscribe({
          next: (payload) => {
            const data = Array.isArray(payload?.records)
              ? payload.records
              : Array.isArray(payload)
              ? payload
              : [];
            if (this.forumDataCallback)
              requestAnimationFrame(() => this.forumDataCallback(data));
          },
          error: () => {},
        });
      this.subscriptions.add(liveSub);
      this.announcementSubscription = liveSub;
    } catch {}
  }

  subscribeToAnnouncement() {
    this.unsubscribeAll(); // or a dedicated unsubscribe just for announcements
    try {
      if (!this.announcementQuery) return;

      const liveObs = this.announcementQuery.subscribe
        ? this.announcementQuery.subscribe()
        : this.announcementQuery.localSubscribe();

      const liveSub = liveObs
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .subscribe({
          next: (payload) => {
            const data = Array.isArray(payload?.records)
              ? payload.records
              : Array.isArray(payload)
              ? payload
              : payload?.record
              ? [payload.record]
              : [];

            if (this.announcementCallback) {
              requestAnimationFrame(() => this.announcementCallback(data));
            }
          },
          error: () => {},
        });

      this.subscriptions.add(liveSub);
      this.announcementSubscription = liveSub; // keep a ref if needed
    } catch {}
  }

  async createPost({ authorId, copy, fileMeta }) {
    const postquery = eduflowproForumPostmodel.mutation();
    const payload = {
      published_date: Math.floor(Date.now() / 1000).toString(),
      author_id: authorId,
      copy,
      forum_status: "Published - Not flagged",
    };
    if (fileMeta && fileMeta.file_link) {
      payload.file_name = fileMeta.file_name;
      payload.file_link = fileMeta.file_link;
      payload.file_type = fileMeta.file_type;
      payload.file_size = fileMeta.file_size;
    }
    postquery.createOne(payload);
    const result = await postquery.execute(true).toPromise();
    return result;
  }

  async deletePostById(postId) {
    try {
      const result = await eduflowproForumPostmodel
        .mutation()
        .delete((q) => q.where("id", postId))
        .execute(true)
        .toPromise();
      return result;
    } catch (error) {
      throw error;
    }
  }

  setupPostModelSubscription() {
    const modelUnsub = eduflowproForumPostmodel.subscribe?.({
      next: ({ type }) => {
        // Refetch on create/delete; incremental render is fine for simple updates.
        if (type === "create" || type === "delete") {
          this.fetchPosts().catch(() => {});
        } else {
          this.renderForumPostState();
        }
      },
      error: () => {},
    });
    if (modelUnsub) this.subscriptions.add(modelUnsub);
  }

  setupPostAnnouncementSubscription() {
    const modelUnsub = eduflowproAnnouncementModel.subscribe?.({
      next: ({ type }) => {
        if (type === "create" || type === "delete") {
          this.fetchAnnouncement().catch(() => {});
        } else {
          this.renderAnnouncementState();
        }
      },
      error: () => {},
    });
    if (modelUnsub) this.subscriptions.add(modelUnsub);
  }

  unsubscribeAll() {
    this.subscriptions.forEach((sub) => {
      if (typeof sub === "function") sub();
      else sub?.unsubscribe?.();
    });
    this.subscriptions.clear();
  }

  async createVote({ Forum_Reactor_ID, Reacted_to_Forum_ID, section }) {
    let query = null;
    if (section === "chat") {
      query = forumReactorReactedToForumModal.mutation();
      query.createOne({
        forum_reactor_id: Number(Forum_Reactor_ID),
        reacted_to_forum_id: Number(Reacted_to_Forum_ID),
      });
    } else if (section === "announcement") {
      query = AnnouncementReactorReactedToAnnouncementModel.mutation();
      query.createOne({
        contact_announcement_reactor_id: Number(Reacted_to_Forum_ID),
        announcement_reactor_id: Number(Forum_Reactor_ID),
      });
    }
    const result = await query.execute(true).toPromise();
    return result;
  }

  async deleteVote(id, section) {
    let query;
    if (section === "chat") {
      query = forumReactorReactedToForumModal.mutation();
    } else if (section === "announcement") {
      query = AnnouncementReactorReactedToAnnouncementModel.mutation();
    }
    query.delete((q) => q.where("id", id));
    const result = await query.execute(true).toPromise();
    return result;
  }

  async fetchContacts() {
    const records = await contactModal
      .query()
      .fetch()
      .pipe(window.toMainInstance?.(true) ?? ((x) => x))
      .toPromise();

    return records;
  }

  async createComment({ html, forumId, authorId }, fileMeta, section) {
    const postquery = plugin.switchTo("EduflowproForumComment").mutation();
    if (section === "announcement") {
      postquery.createOne({
        comment: html,
        announcement_as_a_parent_id: forumId,
        author_id: authorId,
        file_name: fileMeta?.file_name,
        file_link: fileMeta?.file_link,
        file_type: fileMeta?.file_type,
        file_size: fileMeta?.file_size,
      });
    } else if (section === "chat") {
      postquery.createOne({
        comment: html,
        forum_post_id: forumId,
        author_id: authorId,
        file_name: fileMeta?.file_name,
        file_link: fileMeta?.file_link,
        file_type: fileMeta?.file_type,
        file_size: fileMeta?.file_size,
      });
    }

    const result = await postquery.execute(true).toPromise();
    return result;
  }

  async deleteComment(id) {
    const query = plugin.switchTo("EduflowproForumComment").mutation();
    query.delete((q) => q.where("id", id));
    const result = await query.execute(true).toPromise();
    return result;
  }

  async createCommentUpvote(commentId, authorId) {
    const query = MemberCommentUpvoteLinkModel.mutation();
    query.createOne({
      forum_comment_upvote_id: Number(commentId),
      member_comment_upvote_id: Number(authorId),
    });

    const result = await query.execute(true).toPromise();
    return result;
  }

  async deleteCommentUpvote(upvoteId) {
    const query = MemberCommentUpvoteLinkModel.mutation();
    query.delete((q) => q.where("id", upvoteId));

    const result = await query.execute(true).toPromise();
    return result;
  }

  async createReplyToComment({ commentId, content, authorId }, fileMeta) {
    const postquery = plugin.switchTo("EduflowproForumComment").mutation();
    postquery.createOne({
      reply_to_comment_id: commentId,
      comment: content,
      author_id: authorId,
      file_name: fileMeta?.file_name,
      file_link: fileMeta?.file_link,
      file_type: fileMeta?.file_type,
      file_size: fileMeta?.file_size,
    });

    const result = await postquery.execute(true).toPromise();
    return result;
  }
}
