import { redirect } from "next/navigation";

import { getCurrentUser } from "../../../lib/auth/session";
import { AiConfigForm } from "../../../../components/admin/ai-config-form";

export default async function AdminAiPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  if (user.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl px-6 py-12 text-center">
        <h1 className="text-xl font-semibold text-ink">
          403 · Admin kirish talab qilinadi
        </h1>
        <p className="mt-2 text-sm text-ink-3">
          Bu sahifa faqat admin akkauntlar uchun.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-8 md:px-8">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center rounded-md border border-rule bg-surface-2 px-2 py-1 text-[11px] font-medium text-ink-3">
            Admin · AI config
          </span>
        </div>

        <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-ink md:text-[32px]">
          AI Configuration
        </h1>

        <p className="mt-2 text-[13px] text-ink-3">
          Provayderlar, fallback zanjiri, limitlar va kundalik rejalashtiruvchi sozlamalari.
        </p>
      </div>

      <AiConfigForm />
    </div>
  );
}
