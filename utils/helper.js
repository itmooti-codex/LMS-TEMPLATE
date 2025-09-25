import { UserConfig } from "../sdk/userConfig.js";
const user = new UserConfig();

export function forumMapper(records) {
  if (!records || records.length == 0) return;
  return records.map((item) => ({
    fileType: item.file_type ?? null,
    fileLink: item.file_link ?? null,
    fileName: item.file_name ?? null,
    copy: item.copy,
    forum_type: item.forum_type,
    published_date: item.published_date ?? null,
    published_days_ago: item.published_date
      ? timeAgo(item.published_date)
      : null,
    author: item.Author?.display_name ?? "Anonymous",
    authorId: item.author_id,
    canDelete: checkUserValidation(item.author_id),
    postId: item.id,
    designation: checkDesignation(item.Author?.is_instructor),
    voteCount: findVoteCount(item.Forum_Reactors_Data) || 0,
    voteId: getPostVoteId(item, user.userId),
    Comment: getAllComments({
      item: item,
      author: item.Author?.display_name ?? "Anonymous",
      canDelete: checkUserValidation(item.author_id),
    }),
  }));
}

function findVoteCount(item) {
  if (item) {
    let length = Object.values(item).length;
    return length;
  }
}

function getPostVoteId(item, uid = user.userId) {
  const map = item?.Forum_Reactors_Data ?? {};
  for (const [key, data] of Object.entries(map)) {
    const reactorId = data?.forum_reactor_id ?? data?.Forum_Reactor?.id;
    if (String(reactorId) === String(uid)) {
      return data?.id ?? key;
    }
  }
  return "";
}

export function timeAgo(date) {
  const now = Date.now();
  const ts = String(date).length > 10 ? Number(date) : Number(date) * 1000;
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  const d = Math.floor(diff / 86400);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

export function checkDesignation(boolean) {
  return boolean ? "Teacher" : "Student";
}

export function checkUserValidation(authorId) {
  return String(authorId) === String(user.userId);
}

export function contactMapper(records) {
  return records
    .filter((item) => item.display_name != null)
    .map((item) => ({
      contact_id: item.id,
      display_name: item.display_name,
      image: item.profile_image,
    }));
}

function getAllComments({ item, author, canDelete }) {
  if (item?.ForumComments) {
    let x = Object.values(item?.ForumComments).map((item) => {
      return {
        fileType: item.file_type ?? null,
        fileLink: item.file_link ?? null,
        fileName: item.file_name ?? null,
        comment: item.comment,
        author: author,
        id: item.id,
        canDelete: canDelete,
        voteCount: item?.Member_Comment_Upvotes_Data?.length || 0,
        voteId: item?.Member_Comment_Upvotes_Data?.[0]?.id,
        replies: item.ForumComments
          ? Object.values(item.ForumComments).map((item) => ({
              id: item.id,
              reply: item.comment,
              author: author,
              voteCount: item?.Member_Comment_Upvotes_Data?.length || 0,
              voteId: item?.Member_Comment_Upvotes_Data?.[0]?.id,
              fileType: item.file_type ?? null,
              fileLink: item.file_link ?? null,
              fileName: item.file_name ?? null,
            }))
          : [],
      };
    });

    return x;
  }
  return null;
}

export let tributObj = {
  trigger: "@",
  iframe: null,
  selectClass: "highlight",
  selectTemplate: function (item) {
    const name = item.original.display_name || item.string || "";
    return `<span input-post-contact-id="${item.original.contact_id}" class="mention"> ${name} </span>`;
  },
  menuItemTemplate: function (item) {
    const name = item.original.display_name || item.string || "";
    return `
    <span class="mention-wrapper">
      <img src="${item.original.image}" class="mention-avatar" />
      <span class="mention" data-post-contact-id="${item.original.contact_id}">
        ${name}
      </span>
    </span>
  `;
  },
  noMatchTemplate: null,
  menuContainer: document.body,
  lookup: "display_name",
  fillAttr: "display_name",
  values: [],
  requireLeadingSpace: true,
  allowSpaces: false,
};

export function createLoaderModal() {
  let wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div id="loaderModal" class="loader-modal" style="display:none;">
      <div class="modal-content">
        <div class="loader"></div>
        <p>Loading, please wait...</p>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper.firstElementChild);
}

export function showLoader() {
  document.getElementById("loaderModal").style.display = "flex";
}

export function hideLoader() {
  document.getElementById("loaderModal").style.display = "none";
}

//-------------------------------------------------------------------------Course ---------------------------------------------//

export function courseMapper(data) {
  if (!data) return { courseName: "", modules: [] };

  const entries = Object.values(data ?? {});
  const courseName = entries[0]?.course_name ?? "";

  const modules = entries.reduce((acc, item) => {
    const list = getAllModules(item?.Modules);
    if (Array.isArray(list) && list.length) acc.push(...list);
    return acc;
  }, []);

  return { courseName, modules };
}

function getAllModules(modules = {}) {
  return Object.values(modules || {}).map((item) => ({
    id: item?.id ?? null,
    module_name: item?.module_name ?? "",
    description: item?.description ?? "",
    modules_unit: item?.number_of_lessons_in_module ?? null,
    modules_length: item?.module_length_in_minute ?? null,
    lessons: getAllLessons(item?.Lessons_As_Module),
  }));
}

function getAllLessons(lessons = {}) {
  return Object.values(lessons || {}).map((lesson) => ({
    id: lesson?.id ?? null,
    lesson_name: lesson?.lesson_name ?? "",
    lesson_length: lesson?.lesson_length_in_minute ?? null,
    lesson_template_url: lesson?.edu_lesson_template_url ?? null,
  }));
}

//-------------------------------------------------------------------------Announcement ---------------------------------------------//

export function announcementMapper(records) {
  if (!records || records.length == 0) return;
  return records.map((item) => ({
    fileType: item.file_type ?? null,
    fileLink: item.file_link ?? null,
    fileName: item.file_name ?? null,
    copy: item.content,
    published_date: item.created_at ?? null,
    published_days_ago: item.created_at ? timeAgo(item.created_at) : null,
    author: item.Instructor?.display_name ?? "Anonymous",
    authorId: item?.Instructor?.id,
    authorImage: item?.Instructor?.profile_image,
    canDelete: checkUserValidation(item.author_id),
    postId: item.id,
    designation: checkDesignation(item.Author?.is_instructor),
    voteCount: findVoteCount(item.Announcement_Reactors_Data) || 0,
    voteId: getAnnouncementVoteId(item),
    Comment: getAllAnnouncementComments({
      item: item,
      author: item.Author?.display_name ?? "Anonymous",
      canDelete: checkUserValidation(item.author_id),
    }),
  }));
}

function getAnnouncementVoteId(data, uid = user.userId) {
  const map = data?.Announcement_Reactors_Data ?? {};
  for (const [key, data] of Object.entries(map)) {
    const reactorId =
      data?.announcement_reactor_id ?? data?.announcement_reactor_id;
    if (String(reactorId) === String(uid)) {
      return data?.id ?? key;
    }
  }
  return "";
}

function getAllAnnouncementComments({ item, author, canDelete }) {
  if (item?.ForumComments) {
    let x = Object.values(item?.ForumComments).map((item) => {
      return {
        fileType: item.file_type ?? null,
        fileLink: item.file_link ?? null,
        fileName: item.file_name ?? null,
        comment: item.comment,
        author: item?.Author?.display_name,
        authorImage: item?.Author?.profile_image,
        id: item.id,
        canDelete: canDelete,
        voteCount: Array.isArray(item?.Member_Comment_Upvotes_Data)
          ? item.Member_Comment_Upvotes_Data.length
          : Object.values(item?.Member_Comment_Upvotes_Data ?? {}).length,

        voteId: Array.isArray(item?.Member_Comment_Upvotes_Data)
          ? item.Member_Comment_Upvotes_Data[0]?.id
          : Object.values(item?.Member_Comment_Upvotes_Data ?? {})[0]?.id,

        replies: item.ForumComments
          ? Object.values(item.ForumComments).map((item) => ({
              id: item.id,
              reply: item.comment,
              author: item?.Author?.display_name,
              voteCount: Array.isArray(item?.Member_Comment_Upvotes_Data)
                ? item.Member_Comment_Upvotes_Data.length
                : Object.values(item?.Member_Comment_Upvotes_Data ?? {}).length,

              voteId: Array.isArray(item?.Member_Comment_Upvotes_Data)
                ? item.Member_Comment_Upvotes_Data[0]?.id
                : Object.values(item?.Member_Comment_Upvotes_Data ?? {})[0]?.id,
              fileType: item.file_type ?? null,
              fileLink: item.file_link ?? null,
              fileName: item.file_name ?? null,
            }))
          : [],
      };
    });

    return x;
  }
  return null;
}
