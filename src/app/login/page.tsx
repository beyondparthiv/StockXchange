import { Suspense } from "react";
import LoginForm from "./login-form";

export const metadata = { title: "Log in · StockXchange" };

export default function LoginPage() {
  // LoginForm uses useSearchParams(), which must sit inside a Suspense boundary.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
