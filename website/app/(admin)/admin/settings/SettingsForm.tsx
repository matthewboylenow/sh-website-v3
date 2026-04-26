"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminField } from "@/components/admin/AdminField";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import {
  type SiteAddress,
  type SiteSettings,
  type SocialLinks,
} from "@/db/schema";
import { updateSiteSettingsGeneralAction } from "./_actions";

export function SettingsForm({
  initial,
  logoPreviewUrl,
  faviconPreviewUrl,
  appleTouchIconPreviewUrl,
}: {
  initial: SiteSettings;
  logoPreviewUrl?: string | null;
  faviconPreviewUrl?: string | null;
  appleTouchIconPreviewUrl?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  const onSubmit = (formData: FormData) => {
    setErrors({});
    setTopError(null);
    setSaved(false);
    start(async () => {
      const result = await updateSiteSettingsGeneralAction(formData);
      if (result.ok) {
        setSaved(true);
        router.refresh();
        return;
      }
      if ("fieldErrors" in result) setErrors(result.fieldErrors);
      else setTopError(result.error);
    });
  };

  const addr: SiteAddress = initial.address ?? {
    street: "",
    city: "",
    state: "",
    zip: "",
  };
  const social: SocialLinks = initial.socialLinks ?? {};

  return (
    <form action={onSubmit} className="space-y-8">
      {topError && (
        <div className="rounded-md border-l-4 border-rust bg-rust-pale px-4 py-3 text-sm text-rust-dark">
          {topError}
        </div>
      )}
      {saved && (
        <div className="rounded-md border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Saved.
        </div>
      )}

      <Section title="Branding">
        <MediaField
          label="Logo"
          hint="PNG or SVG with a transparent background works best — the masthead pill is dark navy. Max-height in the header is 36 px (auto-scaled)."
          errors={errors.logoBlobKey}
        >
          <PhotoUploader
            name="logoBlobKey"
            initialKey={initial.logoBlobKey ?? null}
            initialPreviewUrl={logoPreviewUrl}
            initialAlt={initial.logoAlt ?? ""}
            pathPrefix="site/branding"
          />
        </MediaField>
        <AdminField
          name="logoAlt"
          label="Logo alt text"
          hint="What screen readers announce in place of the logo."
          errors={errors.logoAlt}
        >
          <input
            id="logoAlt-input"
            name="logoAlt"
            type="text"
            defaultValue={initial.logoAlt ?? "Saint Helen"}
            maxLength={120}
            className="form-input"
          />
        </AdminField>
        <MediaField
          label="Favicon"
          hint="32×32 or 64×64 PNG. Used as the browser-tab icon. Square is best."
          errors={errors.faviconBlobKey}
        >
          <PhotoUploader
            name="faviconBlobKey"
            initialKey={initial.faviconBlobKey ?? null}
            initialPreviewUrl={faviconPreviewUrl}
            pathPrefix="site/branding"
            accept="image/png,image/x-icon,image/svg+xml"
          />
        </MediaField>
        <MediaField
          label="Apple touch icon"
          hint="180×180 PNG. Used when someone adds the site to their iOS home screen. Optional — falls back to the favicon."
          errors={errors.appleTouchIconBlobKey}
        >
          <PhotoUploader
            name="appleTouchIconBlobKey"
            initialKey={initial.appleTouchIconBlobKey ?? null}
            initialPreviewUrl={appleTouchIconPreviewUrl}
            pathPrefix="site/branding"
            accept="image/png"
          />
        </MediaField>
      </Section>

      <Section title="Contact">
        <div className="grid gap-5 sm:grid-cols-2">
          <AdminField name="contactEmail" label="Email" required errors={errors.contactEmail}>
            <input
              id="contactEmail-input"
              name="contactEmail"
              type="email"
              defaultValue={initial.contactEmail ?? ""}
              required
              className="form-input"
            />
          </AdminField>
          <AdminField name="contactPhone" label="Phone" errors={errors.contactPhone}>
            <input
              id="contactPhone-input"
              name="contactPhone"
              type="tel"
              defaultValue={initial.contactPhone ?? ""}
              placeholder="(908) 232-1214"
              className="form-input"
            />
          </AdminField>
        </div>
      </Section>

      <Section title="Address">
        <div className="grid gap-5 sm:grid-cols-2">
          <AdminField name="address.street" label="Street">
            <input
              id="address.street-input"
              name="address.street"
              type="text"
              defaultValue={addr.street ?? ""}
              className="form-input"
            />
          </AdminField>
          <AdminField name="address.city" label="City">
            <input
              id="address.city-input"
              name="address.city"
              type="text"
              defaultValue={addr.city ?? ""}
              className="form-input"
            />
          </AdminField>
          <AdminField name="address.state" label="State">
            <input
              id="address.state-input"
              name="address.state"
              type="text"
              defaultValue={addr.state ?? ""}
              className="form-input"
              maxLength={2}
            />
          </AdminField>
          <AdminField name="address.zip" label="Zip">
            <input
              id="address.zip-input"
              name="address.zip"
              type="text"
              defaultValue={addr.zip ?? ""}
              className="form-input"
            />
          </AdminField>
        </div>
      </Section>

      <Section title="Social links">
        <div className="grid gap-5 sm:grid-cols-3">
          <AdminField name="socialLinks.facebook" label="Facebook URL">
            <input
              id="socialLinks.facebook-input"
              name="socialLinks.facebook"
              type="url"
              defaultValue={social.facebook ?? ""}
              placeholder="https://facebook.com/…"
              className="form-input"
            />
          </AdminField>
          <AdminField name="socialLinks.youtube" label="YouTube URL">
            <input
              id="socialLinks.youtube-input"
              name="socialLinks.youtube"
              type="url"
              defaultValue={social.youtube ?? ""}
              placeholder="https://youtube.com/@…"
              className="form-input"
            />
          </AdminField>
          <AdminField name="socialLinks.instagram" label="Instagram URL">
            <input
              id="socialLinks.instagram-input"
              name="socialLinks.instagram"
              type="url"
              defaultValue={social.instagram ?? ""}
              placeholder="https://instagram.com/…"
              className="form-input"
            />
          </AdminField>
        </div>
      </Section>

      <Section title="Forms & footer">
        <AdminField
          name="welcomeFormRecipients"
          label="Welcome form recipients"
          hint="Comma-separated emails. Where the I'm New form (Step 6 wiring) will relay submissions."
          errors={errors.welcomeFormRecipients}
        >
          <input
            id="welcomeFormRecipients-input"
            name="welcomeFormRecipients"
            type="text"
            defaultValue={(initial.welcomeFormRecipients ?? []).join(", ")}
            className="form-input"
          />
        </AdminField>
        <AdminField
          name="footerCopy"
          label="Footer copy"
          hint="Short paragraph shown in the main footer next to contact info."
          errors={errors.footerCopy}
        >
          <textarea
            id="footerCopy-input"
            name="footerCopy"
            defaultValue={initial.footerCopy ?? ""}
            maxLength={1000}
            rows={3}
            className="form-input"
          />
        </AdminField>
        <AdminField
          name="bottomBarHtml"
          label="Bottom bar"
          hint='Tiny strip below the main footer. HTML allowed — e.g. © 2026 Saint Helen · <a href="/privacy">Privacy</a>'
          errors={errors.bottomBarHtml}
        >
          <textarea
            id="bottomBarHtml-input"
            name="bottomBarHtml"
            defaultValue={initial.bottomBarHtml ?? ""}
            maxLength={1000}
            rows={2}
            className="form-input font-mono text-sm"
          />
        </AdminField>
        <AdminField
          name="densityScale"
          label="Density scale"
          hint="1.00 = default · 0.85 = compact · 1.15 = airy. Multiplies section padding."
          errors={errors.densityScale}
        >
          <input
            id="densityScale-input"
            name="densityScale"
            type="text"
            defaultValue={String(initial.densityScale ?? "1.00")}
            className="form-input font-mono"
          />
        </AdminField>
      </Section>

      <button
        type="submit"
        disabled={pending}
        className="rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark disabled:opacity-70"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-rule bg-white p-6">
      <h2 className="font-serif text-lg font-bold text-navy">{title}</h2>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

/**
 * Like AdminField but uses <div> instead of <label> as the wrapper.
 * PhotoUploader contains a hidden file input — wrapping it in a label
 * with mismatched htmlFor makes browsers swallow the click that's
 * supposed to open the OS file picker. Use this for any media input.
 */
function MediaField({
  label,
  hint,
  errors,
  children,
}: {
  label: string;
  hint?: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint && !errors?.length && (
        <p className="mt-1 text-xs text-ink-3">{hint}</p>
      )}
      {errors?.length ? (
        <p className="mt-1 text-xs text-rust-dark">{errors.join(" · ")}</p>
      ) : null}
    </div>
  );
}
