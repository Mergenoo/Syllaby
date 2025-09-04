import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import CreateClassButton from "@/components/CreateClassButton";
import ViewComponentsButtons from "@/components/ViewComponentsButtons";
import UploadNewSyllabi from "@/components/UploadNewSyllabi";
import GoogleCalendarOAuth from "@/components/GoogleCalendarOAuth";
import CalendarView from "@/components/CalendarView";

export default async function ProjectsPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  const { data: classes, error } = await supabase
    .from("classes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching classes:", error);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Classes</h1>
              <p className="text-gray-600 mt-1">
                Manage your academic courses and syllabi
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <GoogleCalendarOAuth classId="global" />
              <CreateClassButton />
            </div>
          </div>

          {classes && classes.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Your Classes
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Click on a class to view details and upload syllabi
                </p>
              </div>
              <ul className="divide-y divide-gray-200">
                {classes.map((classItem) => (
                  <li key={classItem.id}>
                    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-indigo-600 font-semibold text-lg">
                                {classItem.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <h4 className="text-lg font-medium text-gray-900">
                                {classItem.name}
                              </h4>
                              {classItem.code && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {classItem.code}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center text-sm text-gray-500">
                              {classItem.instructor && (
                                <span className="mr-4">
                                  <span className="font-medium">
                                    Instructor:
                                  </span>{" "}
                                  {classItem.instructor}
                                </span>
                              )}
                              {classItem.semester && (
                                <span>
                                  <span className="font-medium">Semester:</span>{" "}
                                  {classItem.semester}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400 mt-1">
                              Created{" "}
                              {new Date(
                                classItem.created_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <ViewComponentsButtons id={classItem.id} />
                          <UploadNewSyllabi classId={classItem.id} />
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 text-gray-400">
                <svg
                  className="h-full w-full"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No classes yet
              </h3>
              <p className="mt-2 text-gray-500">
                Get started by creating your first class and uploading a
                syllabus.
              </p>
            </div>
          )}
        </div>

        {/* Calendar Section */}
        <div className="mt-8">
          <CalendarView />
        </div>
      </div>
    </div>
  );
}
