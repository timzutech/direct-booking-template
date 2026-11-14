import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "../../../../site.config";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Host sign in", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <main id="main" className="flex flex-1 items-center justify-center px-5 py-16">
      <div className="card w-full max-w-sm p-7">
        <p className="eyebrow">{siteConfig.shortName}</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">Host sign in</h1>
        <LoginForm />
        <p className="mt-5 text-center text-sm text-ink-soft">
          <Link href="/" className="underline underline-offset-4">Back to the website</Link>
        </p>
      </div>
    </main>
  );
}
