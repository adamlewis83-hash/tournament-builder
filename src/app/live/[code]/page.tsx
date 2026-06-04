"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Card, Button } from "@/components/ui";
import { HydrationGate } from "@/components/HydrationGate";

export default function JoinLivePage() {
  const params = useParams<{ code: string }>();
  return (
    <HydrationGate>
      <Joiner code={params.code} />
    </HydrationGate>
  );
}

function Joiner({ code }: { code: string }) {
  const router = useRouter();
  const joinLive = useStore((s) => s.joinLive);
  const [error, setError] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    joinLive(code).then((id) => {
      if (id) router.replace(`/t/${id}`);
      else setError(true);
    });
  }, [code, joinLive, router]);

  return (
    <div className="py-20 text-center">
      {error ? (
        <Card className="p-8 max-w-sm mx-auto">
          <div className="text-3xl mb-2">🤔</div>
          <p className="font-semibold">Tournament not found</p>
          <p className="text-sm text-[var(--muted)] mb-4">
            Code <span className="font-mono font-bold">{code.toUpperCase()}</span> isn&apos;t live.
            Double-check it with the host.
          </p>
          <Button onClick={() => router.replace("/")}>Back home</Button>
        </Card>
      ) : (
        <p className="text-[var(--muted)]">
          Joining <span className="font-mono font-bold">{code.toUpperCase()}</span>…
        </p>
      )}
    </div>
  );
}
