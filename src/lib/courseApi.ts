export interface CourseSearchResult {
  id: number;
  name: string;
  location: string;
}

import type { TeeSet } from "./types";

export interface ImportedCourse {
  id: number;
  name: string;
  holes: number;
  pars: number[];
  strokeIndex: number[];
  tees?: TeeSet[]; // rating/slope per tee set (drives course-handicap math)
}

export async function searchCourses(
  q: string,
): Promise<{ courses: CourseSearchResult[]; notConfigured?: boolean }> {
  try {
    const res = await fetch(`/api/courses/search?q=${encodeURIComponent(q)}`);
    if (res.status === 503) return { courses: [], notConfigured: true };
    if (!res.ok) return { courses: [] };
    const data = await res.json();
    return { courses: data.courses ?? [] };
  } catch {
    return { courses: [] };
  }
}

export async function importCourse(id: number): Promise<ImportedCourse | null> {
  try {
    const res = await fetch(`/api/courses/${id}`);
    if (!res.ok) return null;
    return (await res.json()) as ImportedCourse;
  } catch {
    return null;
  }
}
