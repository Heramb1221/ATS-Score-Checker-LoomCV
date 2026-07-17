import { Suspense } from "react";
import { AtsApp } from "@/components/AtsApp";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function Page() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <AtsApp />
      </Suspense>
    </ErrorBoundary>
  );
}
