import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import CreateClassButton from "@/components/CreateClassButton";
import ViewComponentsButtons from "@/components/ViewComponentsButtons";
import UploadNewSyllabi from "@/components/UploadNewSyllabi";
import CalendarView from "@/components/CalendarView";
import GoogleCalendarIntegration from "@/components/GoogleCalendarIntegration";
import Navbar from "@/components/Navbar";

export default async function ProjectsPage() {
  const supabase = await createClient();

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
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-black">My Classes</h1>
              <p className="text-black/60 mt-2">
                Manage your academic courses and syllabi
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <GoogleCalendarIntegration />
              <CreateClassButton />
            </div>
          </div>

          {classes && classes.length > 0 ? (
            <div className="bg-white border border-black rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-black">
                <h3 className="text-xl font-semibold text-black">
                  Your Classes
                </h3>
                <p className="mt-1 text-sm text-black/60">
                  Click on a class to view details and upload syllabi
                </p>
              </div>
              <ul className="divide-y divide-black">
                {classes.map((classItem) => (
                  <li key={classItem.id}>
                    <div className="px-6 py-4 hover:bg-black/5 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-black flex items-center justify-center">
                              <span className="text-white font-semibold text-lg">
                                {classItem.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <h4 className="text-lg font-semibold text-black">
                                {classItem.name}
                              </h4>
                              {classItem.code && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-black text-white">
                                  {classItem.code}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center text-sm text-black/60">
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
                            <p className="text-sm text-black/40 mt-1">
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
            <div className="text-center py-16">
              <div className="mx-auto h-24 w-24 text-black/40">
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
              <h3 className="mt-4 text-xl font-semibold text-black">
                No classes yet
              </h3>
              <p className="mt-2 text-black/60">
                Get started by creating your first class and uploading a
                syllabus.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <CalendarView />
        </div>
      </div>
    </div>
  );
}
