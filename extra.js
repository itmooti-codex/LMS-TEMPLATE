import { config } from "./sdk/config.js";
import { VitalStatsSDK } from "./sdk/init.js";

const button = document.getElementById("complete-lesson-button");
const feedback = document.getElementById("lesson-complete-feedback");
const label = button?.querySelector(".button-label");

if (button && label) {
  const params = new URLSearchParams(window.location.search);
  const lessonId = Number(params.get("lessonId"));
  const enrolmentIdFromQuery = Number(params.get("enrolmentId"));
  const fallbackEnrolment = Number(
    window.opener?.enrolmentId ?? window.enrolmentId ?? 0
  );
  const enrolmentId = enrolmentIdFromQuery || fallbackEnrolment || 0;

  if (enrolmentId) {
    window.enrolmentId = enrolmentId;
  }

  if (lessonId) {
    window.lessonId = lessonId;
  }

  if (!lessonId || !enrolmentId) {
    label.textContent = "Lesson context unavailable";
    button.dataset.state = "disabled";
    button.disabled = true;
    button.classList.remove("bg-emerald-600", "hover:bg-emerald-500");
    button.classList.add(
      "bg-slate-200",
      "text-slate-500",
      "cursor-not-allowed"
    );
  } else {
    const { slug, apiKey } = config;
    let completionModelPromise = null;

    const getCompletionModel = async () => {
      if (!completionModelPromise) {
        const sdk = new VitalStatsSDK({ slug, apiKey });
        completionModelPromise = sdk
          .initialize()
          .then((plugin) =>
            plugin.switchTo("EduflowproOEnrolmentLessonCompLessonCompletion")
          )
          .catch((error) => {
            completionModelPromise = null;
            throw error;
          });
      }
      return completionModelPromise;
    };

    button.addEventListener("click", async () => {
      const currentState = button.dataset.state;
      if (currentState === "loading" || currentState === "completed") return;

      button.dataset.state = "loading";
      label.textContent = "Marking...";
      button.disabled = true;
      button.classList.add("opacity-80", "cursor-wait");

      if (feedback) {
        feedback.classList.add("hidden");
        feedback.classList.remove("text-rose-600");
      }

      try {
        const completionModel = await getCompletionModel();
        const mutation = completionModel.mutation();
        mutation.createOne({
          Lesson_Completion_ID: lessonId,
          Enrolment_Lesson_Completion_ID: enrolmentId,
        });
        let x = await mutation.execute(true).toPromise();

        label.textContent = "Lesson completed";
        button.dataset.state = "completed";
        button.classList.remove(
          "bg-emerald-600",
          "hover:bg-emerald-500",
          "opacity-80",
          "cursor-wait"
        );
        button.classList.add(
          "bg-emerald-100",
          "text-emerald-700",
          "cursor-default"
        );
        if (feedback) {
          feedback.textContent =
            "Lesson marked as complete. You can close this tab.";
          feedback.classList.remove("hidden");
        }

        try {
          window.opener?.postMessage(
            { type: "lesson-completed", lessonId, enrolmentId },
            "*"
          );
        } catch (postMessageError) {
          console.warn("Unable to notify opener window", postMessageError);
        }
      } catch (error) {
        console.error("Failed to mark lesson complete", error);
        button.dataset.state = "idle";
        button.disabled = false;
        button.classList.remove("opacity-80", "cursor-wait");
        button.classList.add("bg-emerald-600", "hover:bg-emerald-500");
        label.textContent = "Complete this lesson";
        if (feedback) {
          feedback.textContent = "Something went wrong. Please try again.";
          feedback.classList.remove("hidden");
          feedback.classList.add("text-rose-600");
        }
      }
    });
  }
}

(async function fetchCompletedLesson() {
  const completionModel = await getCompletionModel();
  const query = completionModel
    .query()
    .deSelectAll()
    .select(["Enrolment_Lesson_Completion_ID", "Lesson_Completion_ID"]);

  const payload = await query
    .noDestroy()
    .fetch()
    .pipe(window.toMainInstance?.(true) ?? ((x) => x))
    .toPromise();

  console.log(payload);
})();
