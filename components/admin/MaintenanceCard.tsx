"use client";

import { useState, useTransition } from "react";

import { purgeOrphans } from "@/lib/admin/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MaintenanceCard() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance</CardTitle>
        <CardDescription>
          Remove leftovers that deleted accounts and resources can leave behind:
          logins with no profile, uploaded files no resource points to, and
          registration alerts for accounts that no longer exist.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {result && (
          <Alert variant={result.ok ? "success" : "destructive"}>
            <AlertDescription>{result.text}</AlertDescription>
          </Alert>
        )}
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                const r = await purgeOrphans();
                setResult({
                  ok: true,
                  text: `Removed ${r.logins} orphaned login${r.logins === 1 ? "" : "s"}, ${r.files} orphaned file${r.files === 1 ? "" : "s"} and ${r.alerts} stale alert${r.alerts === 1 ? "" : "s"}.`,
                });
              } catch (e) {
                setResult({ ok: false, text: e instanceof Error ? e.message : "Purge failed" });
              }
            })
          }
        >
          {isPending ? "Cleaning up…" : "Purge orphaned logins & files"}
        </Button>
      </CardContent>
    </Card>
  );
}
