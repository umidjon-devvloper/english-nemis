import { redirect } from "next/navigation";

import { getCurrentUser } from "../../lib/auth/session";
import { ProfileForm } from "../../../components/settings/profile-form";
import TelegramConnect from "./TelegramConnect";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-8 md:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center rounded-md border border-rule bg-surface-2 px-2 py-1 text-[11px] font-medium text-ink-3">
            Preferences
          </span>
        </div>

        <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-ink md:text-[32px]">
          Settings
        </h1>

        <p className="mt-2 text-[13px] text-ink-3">
          Profil, o‘rganish maqsadlari va integratsiyalar.
        </p>
      </div>

      {/* Profile + goals + targets */}
      <ProfileForm user={user} />

      {/* Integrations */}
      <section className="mt-10">
        <h2 className="mb-4 text-[14px] font-semibold tracking-tight text-ink">
          Integrations
        </h2>

        <TelegramConnect />
      </section>

      {/* Account meta */}
      <section className="mt-10 rounded-lg border border-rule bg-white p-5">
        <h2 className="text-[14px] font-semibold text-ink">
          Akkaunt
        </h2>

        <dl className="mt-3 divide-y divide-rule-soft text-[13px]">
          <div className="flex items-center justify-between py-3">
            <dt className="text-ink-3">User ID</dt>
            <dd className="font-mono text-[12px] text-ink">
              {user.id}
            </dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-ink-3">Role</dt>
            <dd className="font-medium text-ink">
              {user.role || "user"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
