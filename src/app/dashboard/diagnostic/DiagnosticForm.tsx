"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { DiagnosticManifest, SubmitDiagnosticResult } from "@/app/actions/diagnostic.action";

const initialState: SubmitDiagnosticResult | null = null;

interface DiagnosticFormProps {
  readonly manifest: DiagnosticManifest;
  readonly action: (
    state: SubmitDiagnosticResult | null,
    formData: FormData,
  ) => Promise<SubmitDiagnosticResult>;
}

function SubmitButtonLabel(): string {
  const { pending } = useFormStatus();
  return pending ? "Saving..." : "See my starting emphasis";
}

export function DiagnosticForm({ manifest, action }: DiagnosticFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction}>
      {manifest.questions.map((question) => (
        <Card key={question.id} padding="comfortable" className="diagnostic-question">
          <fieldset>
            <legend>
              <strong>{question.prompt}</strong>
            </legend>
            {question.options.map((option) => (
              <label key={option.value} className="diagnostic-option">
                <input
                  type="radio"
                  name={question.id}
                  value={option.value}
                  required
                  aria-required="true"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
        </Card>
      ))}

      {state?.kind === "error" ? (
        <p role="alert" className="diagnostic-error">
          {state.error}
        </p>
      ) : null}

      <div className="diagnostic-submit">
        <Button type="submit" variant="primary">
          <SubmitButtonLabel />
        </Button>
      </div>
    </form>
  );
}
