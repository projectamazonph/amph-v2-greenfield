import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentShell } from "@/components/student/StudentShell";
import { buildContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";
import styles from "../profile/page.module.css";

export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=%2Fcertificates");
  const container = buildContainer();
  const certificatesResult = await container.certificateRepo.findByUserId(user.id);
  if (!certificatesResult.ok) throw new Error("Failed to load certificates");
  const certificates = certificatesResult.value;
  const courseResults = await Promise.all(
    certificates.map((certificate) => container.courseRepo.findById(certificate.courseId)),
  );

  return (
    <StudentShell user={user}>
      <main className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Certificates</h1>
          <p className={styles.email}>View, verify, and download your course certificates.</p>
        </header>

        {certificates.length === 0 ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>No certificates yet</h2>
            <p className={styles.empty}>
              Complete an enrolled course to earn a certificate of completion.
            </p>
            <Link href="/courses" className={styles.btnSecondary}>
              Continue learning
            </Link>
          </section>
        ) : (
          <div className={styles.grid}>
            {certificates.map((certificate, index) => {
              const courseResult = courseResults[index];
              if (!courseResult?.ok && courseResult?.error.kind === "db_error") {
                throw new Error("Failed to load certificate course");
              }
              const courseTitle = courseResult?.ok ? courseResult.value.title : "Completed course";
              return (
                <article key={certificate.id} className={styles.section}>
                  <h2 className={styles.sectionTitle}>{courseTitle}</h2>
                  <dl className={styles.fields}>
                    <Field label="Status" value={certificate.status} />
                    <Field label="Issued" value={certificate.issuedAt.toISOString().slice(0, 10)} />
                  </dl>
                  {certificate.status === "revoked" ? (
                    <p className="alert alert-error">
                      This certificate was revoked
                      {certificate.revokedReason ? `: ${certificate.revokedReason}` : "."}
                    </p>
                  ) : null}
                  <Link
                    href={`/certificates/${certificate.verificationHash}`}
                    className={styles.btnSecondary}
                  >
                    {certificate.status === "active" ? "View certificate" : "View record"}
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </StudentShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.field}>
      <dt className={styles.fieldLabel}>{label}</dt>
      <dd className={styles.fieldValue}>{value}</dd>
    </div>
  );
}
