export class UserConfig {
  constructor() {
    this.userId = window.loggedinuserid ??= loggedInUserID;

    // Preferences
    this.preferences = {
      posts: "No",
      submissions: "No",
      announcements: "No",

      postComments: "No",
      commentsOnMyPosts: "Yes",
      submissionComments: "No",
      commentsOnMySubmissions: "Yes",
      announcementComments: "No",
      commentsOnMyAnnouncements: "Yes",

      postMentions: "Yes",
      postCommentMentions: "Yes",
      submissionMentions: "Yes",
      submissionCommentMentions: "Yes",
      announcementMentions: "Yes",
      announcementCommentMentions: "Yes",
    };
  }
}
