import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, code, instructor, semester, academic_year } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Class name is required" },
        { status: 400 }
      );
    }

    if (semester) {
      const { data: existingClass } = await supabase
        .from("classes")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", name.trim())
        .eq("semester", semester)
        .single();

      if (existingClass) {
        return NextResponse.json(
          {
            success: false,
            error:
              "A class with this name already exists for the selected semester",
          },
          { status: 409 }
        );
      }
    }

    const { data: newClass, error: insertError } = await supabase
      .from("classes")
      .insert({
        user_id: user.id,
        name: name.trim(),
        code: code?.trim() || null,
        instructor: instructor?.trim() || null,
        semester: semester || null,
        academic_year: academic_year?.trim() || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting class:", insertError);
      return NextResponse.json(
        { success: false, error: "Failed to create class" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      class: newClass,
      message: "Class created successfully",
    });
  } catch (error) {
    console.error("Error creating class:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

   
    const { data: classes, error: fetchError } = await supabase
      .from("classes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching classes:", fetchError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch classes" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      classes: classes || [],
    });
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
