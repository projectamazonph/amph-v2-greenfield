/**
 * /admin/simulators/[id]/versions — version history for a scenario family.
 *
 * STORY-085. Server component. `id` names any scenario in the family; the
 * page resolves its scenarioKey and lists every version sharing it.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { AdminSubPageHeader } from "@/components/admin/AdminSubPageHeader";
import { Card, Badge } from "@astryxdesign/core";
import { publishSimulatorScenarioAction } from "@/app/actions/publishSimulatorScenario.action";
import { createScenarioVersionDraftAction } from "@/app/actions/createScenarioVersionDraft.action";
import type { ScenarioStatus } from "@/domain/entities/SimulatorScenario";
import formStyles from "../../new/page.module.css";

function statusVariant(s: ScenarioStatus) {
  switch (s) {
    case "published":
      return "success" as const;
    case "draft":
      return "neutral" as const;
    case "archived":
      return "error" as const;
    default:
      return "neutral" as const;
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function ScenarioVersionsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  await requireAdmin();

  const container = buildContainer();
  const scenarioResult = await container.getSimulatorScenario.execute(id);
  if (!scenarioResult.ok) {
    notFound();
  }
  const { scenarioKey, simulatorId, name } = scenarioResult.value.scenario;

  const versionsResult = await container.listScenarioVersions.execute({ scenarioKey });
  const versions = versionsResult.ok ? versionsResult.value.versions : [];

  const errorMsg = sp.error
    ? {
        scenario_not_found: "Scenario not found.",
        not_draft: "Only a draft can be published.",
        db_error: "Something went wrong. Please try again.",
      }[sp.error]
    : null;

  return (
    <div>
      <AdminSubPageHeader
        title={`Version history: ${name}`}
        backHref="/admin/simulators"
        backLabel="Back to scenarios"
        subtitle={`${simulatorId} · ${scenarioKey}`}
      />

      {errorMsg && (
        <Card padding={6}>
          <p style={{ color: "var(--danger)", margin: 0 }}>{errorMsg}</p>
        </Card>
      )}

      <Card padding={6}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
          {versions.map((v) => (
            <div
              key={v.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--spacing-3) 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>
                  v{v.version}
                </span>
                <Badge variant={statusVariant(v.status)} label={v.status} />
                <code
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--ink-500)",
                  }}
                >
                  {v.id}
                </code>
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--ink-500)" }}>
                  Updated {v.updatedAt.toLocaleDateString()}
                </span>
              </div>
              <div style={{ display: "flex", gap: "var(--spacing-3)", alignItems: "center" }}>
                {v.status === "draft" && (
                  <>
                    <Link
                      href={`/admin/simulators/${v.id}/edit`}
                      style={{
                        color: "var(--accent)",
                        textDecoration: "none",
                        fontWeight: 500,
                        fontSize: "var(--font-size-sm)",
                      }}
                    >
                      Edit
                    </Link>
                    <form action={handlePublish(v.id)}>
                      <button type="submit" className={formStyles.submitButton}>
                        Publish
                      </button>
                    </form>
                  </>
                )}
                {v.status !== "draft" && (
                  <form action={handleCreateDraft(v.id)}>
                    <button type="submit" className={formStyles.cancelButton}>
                      Create new draft from this version
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}

          {versions.length === 0 && (
            <p style={{ color: "var(--ink-500)", fontSize: "var(--font-size-sm)" }}>
              No versions found.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function handlePublish(id: string) {
  return async function () {
    "use server";
    const r = await publishSimulatorScenarioAction({ id });
    if (!r.ok) {
      redirect(`/admin/simulators/${id}/versions?error=${r.error.kind}`);
      return;
    }
    redirect(`/admin/simulators/${id}/versions`);
  };
}

function handleCreateDraft(sourceId: string) {
  return async function () {
    "use server";
    const r = await createScenarioVersionDraftAction({ sourceId });
    if (!r.ok) {
      redirect(`/admin/simulators/${sourceId}/versions?error=${r.error.kind}`);
      return;
    }
    redirect(`/admin/simulators/${r.value.scenarioId}/edit`);
  };
}
