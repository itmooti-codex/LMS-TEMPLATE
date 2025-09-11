import { UserConfig } from "../sdk/userConfig.js";
const user = new UserConfig();

export function forumMapper(records) {
  if (!records || records.length == 0) return;
  return records.map((item) => ({
    fileType: item.file_type ?? null,
    fileLink: item.file_link ?? null,
    fileName: item.file_name ?? null,
    copy: item.copy,
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
    voteId: getVoteId(item, user.userId),
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

function getVoteId(item, uid = user.userId) {
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
