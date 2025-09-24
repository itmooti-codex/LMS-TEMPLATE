<!--
A variable exists on page level
let enrolmentId = 1;

now we use to variable to check last lesson id of this enrolment
query calcEnrolments($id: EduflowproEnrolmentID) {
  calcEnrolments(query: [{ where: { id: $id } }]) {
    Last_Lesson_ID: field(arg: ["last_lesson_id"])
  }
}

We need to check if Last_Lesson_ID has any value to it or not. if it is empty or null, on course content's page banner, we set the button to say Start.

If this value exists, we change the Start button on the banner to say Resume and clicking on it will take user to new tab opening this url
We use last lesson id fetched to get the edu_lesson_template_url
query calcLessons($id: EduflowproLessonID) {
  calcLessons(query: [{ where: { id: $id } }]) {
    EDU_Lesson_Template_URL: field(
      arg: ["edu_lesson_template_url"]
    )
  }
}
We send the lesson id to fetch the url and put that url on that button/link




Then in the accordion, we check the in progress and completed lessons using following queries
Now we check completed lessons and in progress lesson using following queries
query calcOInProgressLessonContactinProgresses(
  $enrolmentd_id: EduflowproEnrolmentID
) {
  calcOInProgressLessonContactinProgresses(
    query: [
      { where: { contact_in_progress_id: $enrolmentd_id } }
    ]
  ) {
    ID: field(arg: ["id"])
    In_Progress_Lesson_ID: field(
      arg: ["in_progress_lesson_id"]
    )
  }
}

query calcOEnrolmentLessonCompLessonCompletions(
  $enrolment_id: EduflowproEnrolmentID
) {
  calcOEnrolmentLessonCompLessonCompletions(
    query: [
      {
        where: {
          enrolment_lesson_completion_id: $enrolment_id
        }
      }
    ]
  ) {
    ID: field(arg: ["id"])
    Lesson_Completion_ID: field(
      arg: ["lesson_completion_id"]
    )
  }
}

And for in progress lessons, we call the button Start and for Completed, we call the buttons compelted and also change the circle icon to half filled for in progress and full filled for completed



Now if i click on button of any lesson, following query should run

mutation updateEnrolment(
  $id: EduflowproEnrolmentID
  $payload: EnrolmentUpdateInput = null
) {
  updateEnrolment(
    query: [{ where: { id: $id } }]
    payload: $payload
  ) {
    last_lesson_id
  }
}

This will update the lastLessonID variable. And the Start/Resume button on the banner will update accordingly to take user to that lesson


Clicking on start button should also update progress lessons by running this query
mutation createOInProgressLessonContactinProgress(
  $payload: OInProgressLessonContactinProgressCreateInput = null
) {
  createOInProgressLessonContactinProgress(
    payload: $payload
  ) {
    in_progress_lesson_id //this is the lesson of id clicked
    contact_in_progress_id //this is the enrolement id
  }
}


Now similarly on lesson tempalte page, right below the downaloable file, we will add new button that we call Complete this lesson
and run this query on lcick
mutation createOEnrolmentLessonCompLessonCompletion(
  $payload: OEnrolmentLessonCompLessonCompletionCreateInput = null
) {
  createOEnrolmentLessonCompLessonCompletion(
    payload: $payload
  ) {
    lesson_completion_id //lesson id
    enrolment_lesson_completion_id //enrolement id
  }
}

-->
