import { Suspense } from "react";
import { ResetFormSwitch } from "./reset-form";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetFormSwitch />
    </Suspense>
  );
}
