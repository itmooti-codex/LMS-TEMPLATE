// Snapshot of the advanced AWCModel implementation prior to the reset.
// This file consolidates the version that included announcement support,
// guarded subscriptions, and section-aware voting/comment APIs.

import { parentClassId, courseId } from "../sdk/config.js";
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
    this.enrolmentId = Number(window.enrolmentId ?? 1);
    this.enrolmentModel = plugin.switchTo("EduflowproEnrolment");
    this.lessonModel = plugin.switchTo("EduflowproLesson");
    this.inProgressModel = plugin.switchTo(
      "EduflowproOInProgressLessonContactinProgress"
    );
    this.lessonCompletionModel = plugin.switchTo(
      "EduflowproOEnrolmentLessonCompLessonCompletion"
    );
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

  // onAnnouncementData(cb) {
  //   this.announcementCallback = cb;
  // }

  async init() {
    this.buildFetchPostQuery();
    await this.fetchPosts();
    this.buildFetchCourseContentQuery();
    await this.fetchCourseContent();
    // this.buildFetchAnnouncementQuery();
    // await this.fetchAnnouncement();
    this.subscribeToPosts();
    this.subscribeToAnnouncement();
    this.setupPostModelSubscription();
    // this.setupAnnouncementModelSubscription();
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
      .andWhere("id", Number(courseId))
      .andWhere("Classes", (q) => q.where("id", Number(parentClassId)))
      .include("Modules", (child) => {
        child
          .deSelectAll()
          .select([
            "id",
            "module_name",
            "module_length_in_minute",
            "number_of_lessons_in_module",
          ])
          .include("Lessons_As_Module", (child) => {
            child
              .deSelectAll()
              .select([
                "id",
                "lesson_name",
                "lesson_length_in_hour",
                "edu_lesson_template_url",
              ]);
          });
      })
      .noDestroy();

    return this.courseQuery;
  }

  // buildFetchAnnouncementQuery() {
  //   this.announcementQuery = eduflowproAnnouncementModel
  //     .query()
  //     .deSelectAll()
  //     .select([
  //       "id",
  //       "status",
  //       "content",
  //       "attachement",
  //       "created_at",
  //       "disable_comments",
  //       "profile_image",
  //       "instructor_id",
  //     ])
  //     .where("class_id", `${parentClassId}`)
  //     .andWhere("class_id", Number(parentClassId))
  //     .include("Instructor", (q) => {
  //       q.deSelectAll().select([
  //         "display_name",
  //         "first_name",
  //         "last_name",
  //         "Instructor_Instructor_Image",
  //       ]);
  //     })
  //     .include("Announcement_Reactors_Data", (q) => {
  //       q.deSelectAll().select([
  //         "id",
  //         "announcement_reactor_id",
  //         "contact_announcement_reactor_id",
  //       ]);
  //     })
  //     .include("ForumComments", (q) => {
  //       q.deSelectAll()
  //         .select(["id", "comment"])
  //         .include("Member_Comment_Upvotes_Data", (child) =>
  //           child.deSelectAll().select(["id"])
  //         )
  //         .include("Author", (child) =>
  //           child.deSelectAll().select(["display_name"])
  //         )
  //         .include("ForumComments", (child) => {
  //           child
  //             .deSelectAll()
  //             .select(["id", "comment"])
  //             .include("Member_Comment_Upvotes_Data", (grand) =>
  //               grand.deSelectAll().select(["id"])
  //             )
  //             .include("Author", (grand) =>
  //               grand.deSelectAll().select(["display_name"])
  //             );
  //         });
  //     })
  //     .noDestroy();
  // }

  // async fetchAnnouncement() {
  //   if (this._isFetchingAnnouncements) return;
  //   this._isFetchingAnnouncements = true;
  //   try {
  //     await this.announcementQuery
  //       .fetch()
  //       .pipe(window.toMainInstance?.(true) ?? ((x) => x))
  //       .toPromise();
  //     this.renderAnnouncementState();
  //   } catch (e) {
  //     console.log("Error fetching announcements", e.error);
  //     return [];
  //   } finally {
  //     this._isFetchingAnnouncements = false;
  //   }
  // }

  async fetchCourseContent() {
    try {
      let courses = await this.courseQuery
        .fetch()
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();
      this.renderFromCourseContentState(courses);
    } catch (e) {
      console.log("Error", e);
    }
  }

  buildFetchPostQuery() {
    this.PostQuery = eduflowproForumPostmodel
      .query()
      .deSelectAll()
      .select(["id", "forum_type"])
      .where("forum_status", "Published - Not flagged")
      .andWhere("parent_class_id", `${parentClassId}`)
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

  renderFromCourseContentState(data) {
    if (this.courseDataCallback) this.courseDataCallback(data);
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
    if (this.postSubscription) this.postSubscription.unsubscribe?.();
    try {
      const liveObs = this.PostQuery.subscribe
        ? this.PostQuery.subscribe()
        : this.PostQuery.localSubscribe();

      this.postSubscription = liveObs
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .subscribe({
          next: (payload) => {
            const data = Array.isArray(payload?.records)
              ? payload.records
              : Array.isArray(payload)
              ? payload
              : [];
            if (this.forumDataCallback) {
              requestAnimationFrame(() => this.forumDataCallback(data));
            }
          },
        });

      this.subscriptions.add(this.postSubscription);
    } catch {}
  }

  subscribeToAnnouncement() {
    if (this.announcementSubscription)
      this.announcementSubscription.unsubscribe?.();
    try {
      const liveObs = this.announcementQuery.subscribe
        ? this.announcementQuery.subscribe()
        : this.announcementQuery.localSubscribe();

      this.announcementSubscription = liveObs
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
        });

      this.subscriptions.add(this.announcementSubscription);
    } catch {}
  }

  setupPostModelSubscription() {
    const modelUnsub = eduflowproForumPostmodel.subscribe?.({
      next: (data) => {
        // this.renderFromState()
      },
      error: () => {},
    });
    if (modelUnsub) this.subscriptions.add(modelUnsub);
  }

  // setupAnnouncementModelSubscription() {
  //   const modelUnsub = eduflowproForumPostmodel.subscribe?.({
  //     next: (data) => {
  //       // this.renderFromState()
  //     },
  //     error: () => {},
  //   });
  //   if (modelUnsub) this.subscriptions.add(modelUnsub);
  // }

  async fetchEnrolmentProgress(enrolmentId = this.enrolmentId) {
    const id = Number(enrolmentId);
    if (!id) {
      return {
        enrolmentId: null,
        lastLessonId: null,
        inProgressLessonIds: [],
        completedLessonIds: [],
      };
    }

    const [lastLessonId, inProgressLessonIds, completedLessonIds] =
      await Promise.all([
        this.fetchLastLessonId(id),
        this.fetchInProgressLessons(id),
        this.fetchCompletedLessons(id),
      ]);

    return {
      enrolmentId: id,
      lastLessonId,
      inProgressLessonIds,
      completedLessonIds,
    };
  }

  async fetchLastLessonId(enrolmentId = this.enrolmentId) {
    const id = Number(enrolmentId);
    if (!id) return null;
    const query = this.enrolmentModel
      .query()
      .deSelectAll()
      .where("id", id)
      .select(["last_lesson_id"]);

    const payload = await query
      .noDestroy()
      .fetch()
      .pipe(window.toMainInstance?.(true) ?? ((x) => x))
      .toPromise();

    const records = Array.isArray(payload?.records)
      ? payload.records
      : query.getAllRecordsArray?.() ?? [];

    const value = records?.[0]?.last_lesson_id ?? null;
    return value != null ? Number(value) : null;
  }

  async fetchInProgressLessons(enrolmentId = this.enrolmentId) {
    const id = Number(enrolmentId);
    if (!id) return [];

    const query = this.inProgressModel
      .query()
      .deSelectAll()
      .where("contact_in_progress_id", id)
      .select([("id", "in_progress_lesson_id")]);

    const payload = await query
      .noDestroy()
      .fetch()
      .pipe(window.toMainInstance?.(true) ?? ((x) => x))
      .toPromise();

    const records = Array.isArray(payload?.records)
      ? payload.records
      : query.getAllRecordsArray?.() ?? [];

    return records
      .map((item) => {
        const value = item?.lessonId ?? item?.in_progress_lesson_id;
        return value != null ? Number(value) : null;
      })
      .filter((value) => value != null);
  }

  async fetchCompletedLessons(enrolmentId = this.enrolmentId) {
    const id = Number(enrolmentId);
    if (!id) return [];

    const query = this.lessonCompletionModel
      .query()
      .deSelectAll()
      .where("enrolment_lesson_completion_id", id)
      .select(["id", "lesson_completion_id"]);

    const payload = await query
      .noDestroy()
      .fetch()
      .pipe(window.toMainInstance?.(true) ?? ((x) => x))
      .toPromise();

    const records = Array.isArray(payload?.records)
      ? payload.records
      : query.getAllRecordsArray?.() ?? [];

    return records
      .map((item) => {
        const value = item?.lessonId ?? item?.lesson_completion_id;
        return value != null ? Number(value) : null;
      })
      .filter((value) => value != null);
  }

  async updateEnrolmentLastLesson({
    enrolmentId = this.enrolmentId,
    lessonId = null,
  } = {}) {
    const id = Number(enrolmentId);
    if (!id) return null;
    const payload = {};
    if (lessonId != null) payload.last_lesson_id = Number(lessonId);
    else payload.last_lesson_id = null;

    const mutation = this.enrolmentModel.mutation();
    mutation.update((query) => query.where("id", id).set(payload));

    return await mutation.execute(true).toPromise();
  }

  async markLessonInProgress({
    enrolmentId = this.enrolmentId,
    lessonId,
  } = {}) {
    const id = Number(enrolmentId);
    const lesson = lessonId != null ? Number(lessonId) : null;
    if (!id || !lesson) return null;

    const mutation = this.inProgressModel.mutation();
    mutation.createOne({
      contact_in_progress_id: id,
      in_progress_lesson_id: lesson,
    });

    return await mutation.execute(true).toPromise();
  }

  async markLessonCompleted({ enrolmentId = this.enrolmentId, lessonId } = {}) {
    const id = Number(enrolmentId);
    const lesson = lessonId != null ? Number(lessonId) : null;
    if (!id || !lesson) return null;

    const mutation = this.lessonCompletionModel.mutation();
    mutation.createOne({
      enrolment_lesson_completion_id: id,
      lesson_completion_id: lesson,
    });

    return await mutation.execute(true).toPromise();
  }

  async createPost({ authorId, copy, fileMeta, forumType }) {
    const postquery = eduflowproForumPostmodel.mutation();
    const payload = {
      published_date: Math.floor(Date.now() / 1000).toString(),
      author_id: authorId,
      copy,
      parent_class_id: parentClassId,
      forum_status: "Published - Not flagged",
      forum_type: forumType,
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
