"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

type Tab = "email" | "sms";
type SmsStep = "phone" | "code";

export function SignInTabs({
  callbackUrl,
  initialError,
}: {
  callbackUrl: string;
  initialError?: string;
}) {
  const [tab, setTab] = useState<Tab>("email");

  return (
    <div>
      <div role="tablist" aria-label="Sign-in method" className="mb-6 flex gap-1 rounded-pill bg-cream p-1 text-sm">
        <TabBtn active={tab === "email"} onClick={() => setTab("email")}>
          Email me a link
        </TabBtn>
        <TabBtn active={tab === "sms"} onClick={() => setTab("sms")}>
          Text me a code
        </TabBtn>
      </div>

      {initialError && (
        <Alert kind="error">
          {initialError === "Verification"
            ? "That sign-in link is invalid or has expired. Try again."
            : "Something went wrong signing you in. Try again or contact the parish."}
        </Alert>
      )}

      {tab === "email" ? (
        <EmailForm callbackUrl={callbackUrl} />
      ) : (
        <SmsForm callbackUrl={callbackUrl} />
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      type="button"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-white text-navy shadow-sm" : "text-ink-3 hover:text-navy"
      }`}
    >
      {children}
    </button>
  );
}

/* ----------------------------- Email ----------------------------- */

function EmailForm({ callbackUrl }: { callbackUrl: string }) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <Alert kind="success">
        We sent a sign-in link to <strong>{sent}</strong>. Click it from the
        same browser. The link is good for 24 hours.
      </Alert>
    );
  }

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const email = String(fd.get("email") ?? "").trim();
        if (!email) {
          setError("Enter your email.");
          return;
        }
        setError(null);
        setPending(true);
        try {
          const res = await signIn("email", {
            email,
            callbackUrl,
            redirect: false,
          });
          if (res?.error) {
            setError("We couldn't send your link. Try again.");
          } else {
            setSent(email);
          }
        } catch {
          setError("Something went wrong. Try again.");
        } finally {
          setPending(false);
        }
      }}
      className="space-y-4"
    >
      <Field label="Email" htmlFor="signin-email" error={error}>
        <input
          id="signin-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-md border border-rule bg-white px-4 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-rust/60"
        />
      </Field>
      <SubmitBtn pending={pending}>
        Send the link <span aria-hidden="true">→</span>
      </SubmitBtn>
    </form>
  );
}

/* ------------------------------ SMS ------------------------------ */

function SmsForm({ callbackUrl }: { callbackUrl: string }) {
  const [step, setStep] = useState<SmsStep>("phone");
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (step === "phone") {
    return (
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const p = String(fd.get("phone") ?? "").trim();
          if (!p) {
            setError("Enter your phone number.");
            return;
          }
          setError(null);
          setPending(true);
          try {
            const res = await fetch("/api/auth/sms/start", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: p }),
            });
            if (!res.ok) {
              const body = (await res.json().catch(() => ({}))) as { error?: string };
              setError(body.error ?? "Couldn't send the code.");
              return;
            }
            // Use the server-normalized phone (E.164) so the next-step
            // signIn() matches the stored value in the DB.
            const body = (await res.json().catch(() => ({}))) as { phone?: string };
            setPhone(body.phone ?? p);
            setStep("code");
          } catch {
            setError("Network error — try again.");
          } finally {
            setPending(false);
          }
        }}
        className="space-y-4"
      >
        <Field label="Phone number" htmlFor="signin-phone" error={error}>
          <input
            id="signin-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            required
            placeholder="(908) 555-1234"
            className="w-full rounded-md border border-rule bg-white px-4 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-rust/60"
          />
        </Field>
        <p className="text-xs text-ink-3">
          US numbers can be plain digits — we&rsquo;ll add the country
          code. Standard SMS rates apply.
        </p>
        <SubmitBtn pending={pending}>
          Send code <span aria-hidden="true">→</span>
        </SubmitBtn>
      </form>
    );
  }

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const code = String(fd.get("code") ?? "").trim();
        if (!code) {
          setError("Enter the 6-digit code.");
          return;
        }
        setError(null);
        setPending(true);
        try {
          const res = await signIn("sms", {
            phone,
            code,
            callbackUrl,
            redirect: false,
          });
          if (res?.error) {
            setError("That code didn't work. Try again or request a new one.");
          } else if (res?.ok) {
            window.location.href = callbackUrl;
          }
        } catch {
          setError("Something went wrong. Try again.");
        } finally {
          setPending(false);
        }
      }}
      className="space-y-4"
    >
      <p className="text-sm text-ink-2">
        We sent a code to <strong>{phone}</strong>.{" "}
        <button
          type="button"
          onClick={() => {
            setStep("phone");
            setError(null);
          }}
          className="font-semibold text-rust-dark hover:text-rust"
        >
          Change number
        </button>
      </p>
      <Field label="6-digit code" htmlFor="signin-code" error={error}>
        <input
          id="signin-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          pattern="[0-9]{6}"
          placeholder="123456"
          className="w-full rounded-md border border-rule bg-white px-4 py-2 text-center font-mono text-lg tracking-[0.4em] text-ink focus:outline-none focus:ring-2 focus:ring-rust/60"
        />
      </Field>
      <SubmitBtn pending={pending}>
        Sign in <span aria-hidden="true">→</span>
      </SubmitBtn>
    </form>
  );
}

/* ----------------------------- Atoms ----------------------------- */

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-rust-dark">{error}</p>}
    </label>
  );
}

function SubmitBtn({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark disabled:opacity-70"
    >
      {pending ? "…" : children}
    </button>
  );
}

function Alert({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: React.ReactNode;
}) {
  const cls =
    kind === "error"
      ? "border-l-rust bg-rust-pale text-rust-dark"
      : "border-l-navy bg-navy-pale text-navy";
  return (
    <div className={`mb-4 rounded-md border-l-4 px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}
