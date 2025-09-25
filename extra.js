import { config } from "./sdk/config.js";
import { VitalStatsSDK } from "./sdk/init.js";
import { showLoader, hideLoader } from "./utils/helper.js";

const button = document.getElementById("complete-lesson-button");
const feedback = document.getElementById("lesson-complete-feedback");
const label = button?.querySelector(".button-label");

// --- SDK init caching ---
showLoader();
const { slug, apiKey } = config;
let completionModelPromise;

const getCompletionModel = async () => {
  if (!completionModelPromise) {
    const sdk = new VitalStatsSDK({ slug, apiKey });
    completionModelPromise = sdk
      .initialize()
      .then((plugin) =>
        plugin.switchTo("EduflowproOEnrolmentLessonCompLessonCompletion")
      )
      .catch((err) => {
        completionModelPromise = null;
        throw err;
      });
  }
  return completionModelPromise;
};

// --- Helpers ---
const setButtonState = (state, text, addClasses = [], removeClasses = []) => {
  if (!button || !label) return;
  button.dataset.state = state;
  label.textContent = text;
  button.classList.remove(...removeClasses);
  button.classList.add(...addClasses);
  button.disabled = state === "loading" || state === "completed";
};

const showFeedback = (message, isError = false) => {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.classList.remove("hidden", "text-rose-600");
  if (isError) feedback.classList.add("text-rose-600");
};

// --- Context extraction ---
const params = new URLSearchParams(window.location.search);
const lessonId = Number(params.get("lessonId"));
const enrolmentId =
  Number(params.get("enrolmentId")) ||
  Number(window.opener?.enrolmentId ?? window.enrolmentId ?? 0) ||
  0;

if (enrolmentId) window.enrolmentId = enrolmentId;
if (lessonId) window.lessonId = lessonId;

// --- Main interaction ---
if (button && label) {
  if (!lessonId || !enrolmentId) {
    setButtonState(
      "disabled",
      "Lesson context unavailable",
      ["bg-slate-200", "text-slate-500", "cursor-not-allowed"],
      ["bg-emerald-600", "hover:bg-emerald-500"]
    );
  } else {
    button.addEventListener("click", async () => {
      if (["loading", "completed"].includes(button.dataset.state)) return;

      setButtonState("loading", "Marking...", ["opacity-80", "cursor-wait"]);
      if (feedback) feedback.classList.add("hidden");

      try {
        const completionModel = await getCompletionModel();
        const mutation = completionModel.mutation();
        mutation.createOne({
          lesson_completion_id: lessonId,
          enrolment_lesson_completion_id: enrolmentId,
        });
        let result = await mutation.execute(true).toPromise();

        setButtonState(
          "completed",
          "Lesson completed",
          ["bg-emerald-100", "text-emerald-700", "cursor-default"],
          [
            "bg-emerald-600",
            "hover:bg-emerald-500",
            "opacity-80",
            "cursor-wait",
          ]
        );
        showFeedback("Lesson marked as complete. You can close this tab.");

        try {
          window.opener?.postMessage(
            { type: "lesson-completed", lessonId, enrolmentId },
            "*"
          );
        } catch (postMessageError) {
          console.warn("Unable to notify opener window", postMessageError);
        }
      } catch (err) {
        console.error("Failed to mark lesson complete", err);
        setButtonState(
          "idle",
          "Complete this lesson",
          ["bg-emerald-600", "hover:bg-emerald-500"],
          ["opacity-80", "cursor-wait"]
        );
        showFeedback("Something went wrong. Please try again.", true);
      }
    });
  }
}

// --- Check if already completed ---
(async function fetchCompletedLesson() {
  try {
    const completionModel = await getCompletionModel();
    const query = completionModel
      .query()
      .deSelectAll()
      .select(["Enrolment_Lesson_Completion_ID", "Lesson_Completion_ID"])
      .where("enrolment_lesson_completion_id", Number(window.enrolmentId))
      .andWhere("lesson_completion_id", Number(window.lessonId));

    const payload = await query
      .noDestroy()
      .fetch()
      .pipe(window.toMainInstance?.(true) ?? ((x) => x))
      .toPromise();

    if (payload) {
      setButtonState(
        "completed",
        "Lesson completed",
        ["bg-emerald-100", "text-emerald-700", "cursor-default"],
        ["bg-emerald-600", "hover:bg-emerald-500", "opacity-80", "cursor-wait"]
      );
    }
  } catch (err) {
    console.error("Failed to fetch completed lesson", err);
  } finally {
    hideLoader();
  }
})();
