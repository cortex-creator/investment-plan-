import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PLATFORM_SETTING_KEYS } from "@/lib/constants";
import { SettingForm } from "./SettingForm";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await prisma.platformSetting.findMany();
  const byKey = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Platform Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Site</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <SettingForm
            settingKey={PLATFORM_SETTING_KEYS.SITE_NAME}
            label="Site name"
            value={byKey[PLATFORM_SETTING_KEYS.SITE_NAME] ?? ""}
          />
          <SettingForm
            settingKey={PLATFORM_SETTING_KEYS.SUPPORT_EMAIL}
            label="Support email"
            value={byKey[PLATFORM_SETTING_KEYS.SUPPORT_EMAIL] ?? ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deposits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <SettingForm
            settingKey={PLATFORM_SETTING_KEYS.DEPOSIT_INSTRUCTIONS}
            label="Deposit instructions shown to users"
            description="Displayed on the user-facing deposit page (e.g. bank transfer details)."
            value={byKey[PLATFORM_SETTING_KEYS.DEPOSIT_INSTRUCTIONS] ?? ""}
            multiline
          />
          <SettingForm
            settingKey={PLATFORM_SETTING_KEYS.DEPOSIT_REFERENCE_PREFIX}
            label="Deposit reference prefix"
            description="Used when generating deposit reference codes."
            value={byKey[PLATFORM_SETTING_KEYS.DEPOSIT_REFERENCE_PREFIX] ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
