export class AWCModel {
  constructor(plugin) {
    window.plugin = plugin;
    window.eduflowproForumPostmodel = plugin.switchTo("EduflowproForumPost");
    window.eduflowproCourseModel = plugin.switchTo("EduflowproCourse");
    window.forumReactorReactedToForumModal = plugin.switchTo(
      "EduflowproOForumReactorReactedtoForum"
    );
    window.contactModal = plugin.switchTo("EduflowproContact");
    this.limit = 500;
    this.offset = 0;
    this.PostQuery = null;
    this.courseQuery = null;
    this.subscriptions = new Set();
    this.forumDataCallback = null;
    this.courseDataCallback = null;
  }

  onPostData(cb) {
    this.forumDataCallback = cb;
  }

  onCourseData(cb) {
    this.courseDataCallback = cb;
  }

  async init() {
    this.buildFetchPostQuery();
    await this.fetchPosts();
    this.buildFetchCourseContentQuery();
    await this.fetchCourseContent();
    this.subscribeToPosts();
    this.setupModelSubscription();
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
          .include("Member_Comment_Upvotes_Data", (q) =>
            q.deSelectAll().select(["id"])
          )
          .include("ForumComments", (q) => {
            q.deSelectAll()
              .select(["id", "comment"])
              .include("Member_Comment_Upvotes_Data", (q) =>
                q.deSelectAll().select(["id"])
              );
          });
      })
      .noDestroy();
    return this.PostQuery;
  }

  async fetchPosts() {
    try {
      await this.PostQuery.fetch()
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();
      this.renderFromState();
    } catch (e) {
      console.log("Error fetching posts", e.error);
    }
  }

  renderFromState() {
    const postRecs = this.PostQuery.getAllRecordsArray();
    if (this.forumDataCallback) this.forumDataCallback(postRecs);
  }

  renderFromCourseContentState() {
    const courseRecs = this.courseQuery.getAllRecordsArray();
    if (this.courseDataCallback) this.courseDataCallback(courseRecs);
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
    } catch {}
  }

  async createPost({ authorId, copy, fileMeta }) {
    let postquery = eduflowproForumPostmodel.mutation();
    const payload = {
      published_date: Math.floor(Date.now() / 1000).toString(),
      author_id: authorId,
      copy: copy,
      // Ensure the optimistic record matches the live query filter
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

  setupModelSubscription() {
    const modelUnsub = eduflowproForumPostmodel.subscribe?.({
      next: (data) => {
        // this.renderFromState()
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

  async createVote({ Forum_Reactor_ID, Reacted_to_Forum_ID }) {
    let query = forumReactorReactedToForumModal.mutation();
    query.createOne({
      forum_reactor_id: Number(Forum_Reactor_ID),
      reacted_to_forum_id: Number(Reacted_to_Forum_ID),
    });
    const result = await query.execute(true).toPromise();
    return result;
  }

  async deleteVote(id) {
    let query = forumReactorReactedToForumModal.mutation();
    query.delete((q) => q.where("id", id));
    const result = await query.execute(true).toPromise();
    return result;
  }

  async fetchContacts() {
    let records = await contactModal
      .query()
      .fetch()
      .pipe(window.toMainInstance?.(true) ?? ((x) => x))
      .toPromise();

    return records;
  }

  async createComment({ html, forumId, authorId }, fileMeta) {
    let postquery = plugin.switchTo("EduflowproForumComment").mutation();
    postquery.createOne({
      comment: html,
      forum_post_id: forumId,
      authorId: authorId,
      file_name: fileMeta?.file_name,
      file_link: fileMeta?.file_link,
      file_type: fileMeta?.file_type,
      file_size: fileMeta?.file_size,
    });

    let result = await postquery.execute(true).toPromise();
    return result;
  }

  async deleteComment(id) {
    let query = plugin.switchTo("EduflowproForumComment").mutation();
    query.delete((q) => q.where("id", id));

    let result = await query.execute(true).toPromise();
    return result;
  }

  async createCommentUpvote(commentId, authorId) {
    let query = plugin
      .switchTo("EduflowproMemberCommentUpvotesForumCommentUpvotes")
      .mutation();
    query.createOne({
      forum_comment_upvote_id: Number(commentId),
      member_comment_upvote_id: Number(authorId),
    });

    let result = await query.execute(true).toPromise();
    return result;
  }

  async deleteCommentUpvote(upvoteId) {
    let query = plugin
      .switchTo("EduflowproMemberCommentUpvotesForumCommentUpvotes")
      .mutation();
    query.delete((q) => q.where("id", upvoteId));

    let result = await query.execute(true).toPromise();
    return result;
  }

  async createReplyToComment({ commentId, content, authorId }, fileMeta) {
    let postquery = plugin.switchTo("EduflowproForumComment").mutation();
    postquery.createOne({
      reply_to_comment_id: commentId,
      comment: content,
      author_id: authorId,
      file_name: fileMeta?.file_name,
      file_link: fileMeta?.file_link,
      file_type: fileMeta?.file_type,
      file_size: fileMeta?.file_size,
    });

    let result = await postquery.execute(true).toPromise();
    return result;
  }
}
