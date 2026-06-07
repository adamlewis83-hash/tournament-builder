"use client";

import Link from "next/link";
import { Flag } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Card } from "@/components/ui";
import { HydrationGate } from "@/components/HydrationGate";

export default function CoursesPage() {
  return (
    <HydrationGate>
      <Courses />
    </HydrationGate>
  );
}

function Courses() {
  const courses = useStore((s) => s.courses);
  const removeCourse = useStore((s) => s.removeCourse);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
          ← All tournaments
        </Link>
        <h1 className="text-2xl font-bold mt-2 flex items-center gap-2">
          <Flag className="h-6 w-6 text-[var(--brand)]" /> Course Library
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Saved courses load their pars &amp; stroke index so net scoring adjusts per hole and player.
        </p>
      </div>

      {courses.length === 0 ? (
        <Card className="p-10 text-center">
          <Flag className="h-10 w-10 mx-auto mb-2 text-[var(--brand)]" />
          <p className="font-medium">No saved courses yet</p>
          <p className="text-sm text-[var(--muted)]">
            Start a <span className="text-[var(--brand)] font-medium">Golf</span> tournament, set the
            course&apos;s pars &amp; stroke index, and tap <b>Save course</b>. It&apos;ll show up here
            and in the course picker.
          </p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {courses.map((c) => {
            const par = c.pars.reduce((a, b) => a + b, 0);
            return (
              <Card key={c.id} className="p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold">{c.name}</h3>
                    <p className="text-sm text-[var(--muted)]">
                      {c.holes} holes · Par {par}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    className="px-2 py-1"
                    onClick={() => {
                      if (confirm(`Delete course "${c.name}"?`)) removeCourse(c.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="text-xs border-separate border-spacing-0">
                    <tbody>
                      <tr className="text-[var(--muted)]">
                        <td className="pr-2">Hole</td>
                        {c.pars.map((_, i) => (
                          <td key={i} className="px-1 text-center w-6">
                            {i + 1}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="pr-2 text-[var(--muted)]">Par</td>
                        {c.pars.map((p, i) => (
                          <td key={i} className="px-1 text-center">
                            {p}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="pr-2 text-[var(--muted)]">SI</td>
                        {c.strokeIndex.map((s, i) => (
                          <td key={i} className="px-1 text-center text-[var(--muted)]">
                            {s}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-[var(--muted)]">
        To add or edit a course, open a Golf tournament&apos;s setup, adjust the course, and tap
        <b> Save course</b> (saving with the same name updates it).
      </p>
    </div>
  );
}
