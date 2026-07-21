import { Suspense } from "react";
import SignupForm from "./signup-form";

export const metadata = { title: "Sign up · StockXchange" };

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
