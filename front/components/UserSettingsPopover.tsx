import type { NotificationPreferencesRefProps } from "@app/components/me/NotificationPreferences";
import { NotificationPreferences } from "@app/components/me/NotificationPreferences";
import { UserToolsTable } from "@app/components/me/UserToolsTable";
import { FormProvider } from "@app/components/sparkle/FormProvider";
import { useTheme } from "@app/components/sparkle/ThemeContext";
import { useFileUploaderService } from "@app/hooks/useFileUploaderService";
import { useIsMac } from "@app/hooks/useKeyboardShortcutLabel";
import { isSubmitMessageKey } from "@app/lib/keymaps";
import { usePatchUser, useUser } from "@app/lib/swr/user";
import type { WorkspaceType } from "@app/types/user";
import { ANONYMOUS_USER_IMAGE_URL } from "@app/types/user";
import {
  Avatar,
  BarChartIcon,
  BellIcon,
  BoltIcon,
  Button,
  Cog6ToothIcon,
  Dialog,
  DialogClose,
  DialogContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  ExternalLinkIcon,
  Icon,
  Input,
  Label,
  LightModeIcon,
  MoonIcon,
  NavigationList,
  NavigationListItem,
  Page,
  PencilSquareIcon,
  Separator,
  SparklesIcon,
  Spinner,
  SunIcon,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ToolsIcon,
  UserIcon,
  XMarkIcon,
} from "@dust-tt/sparkle";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useController, useForm } from "react-hook-form";
import { z } from "zod";

type SettingsSection =
  | "personal"
  | "usage"
  | "customization"
  | "notifications"
  | "tools";

interface UserSettingsPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owner: WorkspaceType;
}

// ─── Shared section wrapper ───────────────────────────────────────────────────

interface SectionContentProps {
  icon: React.ComponentType;
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SectionContent({
  icon,
  title,
  description,
  children,
}: SectionContentProps) {
  return (
    <div className="relative flex flex-1 flex-col gap-6 overflow-y-auto px-8 pt-10 pb-8">
      <DialogClose asChild>
        <Button
          variant="ghost"
          size="xmini"
          icon={XMarkIcon}
          className="absolute right-3 top-3"
        />
      </DialogClose>
      <header className="flex flex-col gap-1">
        <Icon
          visual={icon}
          size="md"
          className="text-muted-foreground dark:text-muted-foreground-night"
        />
        <h2 className="text-2xl font-semibold leading-8 text-foreground dark:text-foreground-night">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground dark:text-muted-foreground-night">
            {description}
          </p>
        )}
      </header>
      {children}
    </div>
  );
}

// ─── Usage ────────────────────────────────────────────────────────────────────

function CreditRow({
  icon,
  label,
  description,
}: {
  icon: React.ComponentType;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1">
          <Icon visual={icon} size="xs" />
          <span className="text-sm font-medium text-foreground dark:text-foreground-night">
            {label}
          </span>
        </span>
        <span className="text-xs text-muted-foreground dark:text-muted-foreground-night">
          {description}
        </span>
      </div>
      <span className="flex items-center gap-1 text-xs text-muted-foreground dark:text-muted-foreground-night opacity-90">
        <Icon
          visual={BarChartIcon}
          size="xs"
          className="text-muted-foreground dark:text-muted-foreground-night"
        />
        10000/<span className="font-medium">10000</span>
      </span>
    </div>
  );
}

function UsageSection() {
  return (
    <SectionContent
      icon={BarChartIcon}
      title="Usage"
      description="Manage the usage of your Dust workspace"
    >
      <section className="flex flex-col gap-2 rounded-lg bg-muted-background dark:bg-muted-background-night p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-highlight-100 dark:bg-highlight-100-night outline outline-1 outline-highlight-500/20">
              <Icon
                visual={SparklesIcon}
                size="xs"
                className="text-highlight-500"
              />
            </span>
            <span className="text-base font-semibold text-foreground dark:text-foreground-night">
              Pro plan
            </span>
          </span>
          <Button variant="primary" size="xs" label="Request for upgrade" />
        </div>
        <Separator />
        <div className="flex flex-col gap-4">
          <CreditRow
            icon={UserIcon}
            label="Personal Credit"
            description="Every 14th of the months"
          />
          <CreditRow
            icon={SparklesIcon}
            label="Workspace Credit"
            description="Your access to your Workspace credit pools"
          />
        </div>
        <Separator />
        <p className="cursor-pointer text-center text-xs text-muted-foreground dark:text-muted-foreground-night underline">
          Request more credit
        </p>
      </section>

      <section className="flex items-center justify-between border-b border-border dark:border-border-night pb-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground dark:text-foreground-night">
            Invoices
          </span>
          <span className="text-sm text-muted-foreground dark:text-muted-foreground-night">
            Access and download your invoices
          </span>
        </div>
        <Button
          variant="outline"
          size="xs"
          label="Billing"
          icon={ExternalLinkIcon}
        />
      </section>
    </SectionContent>
  );
}

// ─── Personal Information ─────────────────────────────────────────────────────

const PersonalInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  profilePictureUrl: z.string().nullable(),
});

type PersonalInfoType = z.infer<typeof PersonalInfoSchema>;

function PersonalInfoSection({ owner }: { owner: WorkspaceType }) {
  const { user, isUserLoading } = useUser();
  const { patchUser } = usePatchUser();
  const isProvisioned = user?.origin === "provisioned";
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileUploaderService = useFileUploaderService({
    hasSandboxTools: false,
    owner,
    useCase: "avatar",
  });

  const form = useForm<PersonalInfoType>({
    resolver: zodResolver(PersonalInfoSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      profilePictureUrl: user?.image ?? null,
    },
  });

  const { field: profilePictureField } = useController({
    name: "profilePictureUrl",
    control: form.control,
  });
  const currentImageUrl = profilePictureField.value ?? ANONYMOUS_USER_IMAGE_URL;

  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName,
        lastName: user.lastName ?? "",
        profilePictureUrl: user.image ?? null,
      });
    }
  }, [user, form]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setIsUploadingImage(true);
    const files = await fileUploaderService.handleFilesUpload([file]);
    setIsUploadingImage(false);
    if (files && files.length > 0 && files[0].publicUrl) {
      profilePictureField.onChange(files[0].publicUrl);
    }
  };

  const handleSave = async (data: PersonalInfoType) => {
    await patchUser(
      data.firstName,
      data.lastName,
      true,
      undefined,
      data.profilePictureUrl
    );
  };

  if (isUserLoading) {
    return (
      <SectionContent icon={UserIcon} title="Personal Informations">
        <div className="flex justify-center p-6">
          <Spinner />
        </div>
      </SectionContent>
    );
  }

  return (
    <SectionContent icon={UserIcon} title="Personal Informations">
      <FormProvider form={form} onSubmit={handleSave}>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleImageUpload}
        />

        <div className="group relative w-fit">
          <Avatar size="lg" visual={currentImageUrl} isRounded />
          <Button
            variant="outline"
            size="sm"
            icon={PencilSquareIcon}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
            disabled={isUploadingImage || isProvisioned}
            isLoading={isUploadingImage}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                label="First Name"
                {...form.register("firstName")}
                placeholder="First Name"
                disabled={isProvisioned}
                isError={!!form.formState.errors.firstName}
                message={form.formState.errors.firstName?.message}
                messageStatus={
                  form.formState.errors.firstName ? "error" : undefined
                }
              />
            </div>
            <div className="flex-1">
              <Input
                label="Last Name"
                {...form.register("lastName")}
                placeholder="Last Name"
                disabled={isProvisioned}
                isError={!!form.formState.errors.lastName}
                message={form.formState.errors.lastName?.message}
                messageStatus={
                  form.formState.errors.lastName ? "error" : undefined
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label>Email</Label>
            <span className="text-sm text-muted-foreground dark:text-muted-foreground-night">
              {user?.email}
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              variant="ghost"
              type="button"
              onClick={() => form.reset()}
              disabled={!form.formState.isDirty || form.formState.isSubmitting}
            />
            <Button
              label="Save"
              variant="primary"
              type="submit"
              disabled={!form.formState.isDirty || form.formState.isSubmitting}
              isLoading={form.formState.isSubmitting}
            />
          </div>
        </div>
      </FormProvider>
    </SectionContent>
  );
}

// ─── Customization ────────────────────────────────────────────────────────────

function CustomizationSection() {
  const { theme: currentTheme, setTheme } = useTheme();
  const isMac = useIsMac();

  const modEnterLabel = useMemo(
    () => (isMac ? "Cmd + Enter (⌘ + ↵)" : "Ctrl + Enter"),
    [isMac]
  );
  const modEnterMenuLabel = useMemo(
    () => (isMac ? "Cmd + Enter" : "Ctrl + Enter"),
    [isMac]
  );
  const modEnterShortcut = useMemo(
    () => (isMac ? "⌘ + ↵" : "Ctrl + ↵"),
    [isMac]
  );

  const [localTheme, setLocalTheme] = useState(currentTheme ?? "system");
  const [submitKey, setSubmitKey] = useState<"enter" | "cmd+enter">(() => {
    if (typeof window === "undefined") {
      return "enter";
    }
    const stored = localStorage.getItem("submitMessageKey");
    return stored && isSubmitMessageKey(stored) ? stored : "enter";
  });
  const isDirty =
    localTheme !== currentTheme ||
    submitKey !==
      (typeof window !== "undefined"
        ? (localStorage.getItem("submitMessageKey") ?? "enter")
        : "enter");

  const handleSave = () => {
    setTheme(localTheme as "light" | "dark" | "system");
    if (typeof window !== "undefined") {
      localStorage.setItem("submitMessageKey", submitKey);
    }
  };

  const handleCancel = () => {
    setLocalTheme(currentTheme ?? "system");
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem("submitMessageKey")
        : null;
    setSubmitKey(stored && isSubmitMessageKey(stored) ? stored : "enter");
  };

  return (
    <SectionContent icon={Cog6ToothIcon} title="Customization">
      <div className="flex w-full gap-4">
        <div className="flex-1">
          <div className="mb-2">
            <Label>Theme</Label>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                icon={
                  localTheme === "light"
                    ? SunIcon
                    : localTheme === "dark"
                      ? MoonIcon
                      : LightModeIcon
                }
                label={
                  localTheme === "light"
                    ? "Light"
                    : localTheme === "dark"
                      ? "Dark"
                      : "System"
                }
                isSelect
                className="w-fit"
              />
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent>
                <DropdownMenuItem
                  icon={SunIcon}
                  label="Light"
                  onClick={() => setLocalTheme("light")}
                />
                <DropdownMenuItem
                  icon={MoonIcon}
                  label="Dark"
                  onClick={() => setLocalTheme("dark")}
                />
                <DropdownMenuItem
                  icon={LightModeIcon}
                  label="System"
                  onClick={() => setLocalTheme("system")}
                />
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
        </div>

        <div className="flex-1">
          <div className="mb-2">
            <Label>Keyboard Shortcuts</Label>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="copy-sm flex items-center gap-2 text-foreground dark:text-foreground-night">
                Send message:
                <Button
                  variant="outline"
                  label={submitKey === "enter" ? "Enter (↵)" : modEnterLabel}
                  isSelect
                  className="w-fit"
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSubmitKey("enter")}>
                  Enter
                  <DropdownMenuShortcut>↵</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSubmitKey("cmd+enter")}>
                  {modEnterMenuLabel}
                  <DropdownMenuShortcut>
                    {modEnterShortcut}
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          label="Cancel"
          variant="ghost"
          type="button"
          onClick={handleCancel}
          disabled={!isDirty}
        />
        <Button
          label="Save"
          variant="primary"
          type="button"
          onClick={handleSave}
          disabled={!isDirty}
        />
      </div>
    </SectionContent>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

function NotificationsSection({ owner }: { owner: WorkspaceType }) {
  const { user } = useUser();
  const notificationPreferencesRef =
    useRef<NotificationPreferencesRefProps>(null);
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = async () => {
    if (notificationPreferencesRef.current) {
      await notificationPreferencesRef.current.savePreferences();
      setIsDirty(false);
    }
  };

  const handleCancel = () => {
    if (notificationPreferencesRef.current) {
      notificationPreferencesRef.current.reset();
      setIsDirty(false);
    }
  };

  return (
    <SectionContent icon={BellIcon} title="Notifications">
      {user?.subscriberHash ? (
        <>
          <Page.SectionHeader
            title="Default Notification Settings"
            description="Tell us what you'd generally like to be notified about."
          />
          <NotificationPreferences
            ref={notificationPreferencesRef}
            onChanged={() => setIsDirty(true)}
            owner={owner}
          />
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              variant="ghost"
              type="button"
              onClick={handleCancel}
              disabled={!isDirty}
            />
            <Button
              label="Save"
              variant="primary"
              type="button"
              onClick={handleSave}
              disabled={!isDirty}
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground dark:text-muted-foreground-night">
          Notification preferences are not available for your account.
        </p>
      )}
    </SectionContent>
  );
}

// ─── Tools & Triggers ─────────────────────────────────────────────────────────

function ToolsSection({ owner }: { owner: WorkspaceType }) {
  return (
    <SectionContent icon={ToolsIcon} title="Tools and Triggers">
      <Tabs defaultValue="tools">
        <TabsList border>
          <TabsTrigger value="tools" label="Tools" icon={BoltIcon} />
          <TabsTrigger value="triggers" label="Triggers" icon={BellIcon} />
        </TabsList>
        <TabsContent value="tools">
          <UserToolsTable owner={owner} />
        </TabsContent>
        <TabsContent value="triggers">
          <p className="py-8 text-center text-sm text-muted-foreground dark:text-muted-foreground-night">
            Coming soon
          </p>
        </TabsContent>
      </Tabs>
    </SectionContent>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function UserSettingsPopover({
  open,
  onOpenChange,
  owner,
}: UserSettingsPopoverProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("usage");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" height="md">
        <div className="flex h-full overflow-hidden">
          <aside className="w-64 flex-shrink-0 border-r border-border dark:border-border-night bg-muted-background dark:bg-muted-background-night px-3 py-8">
            <NavigationList>
              <NavigationListItem
                icon={UserIcon}
                label="Personal Informations"
                selected={activeSection === "personal"}
                onClick={() => setActiveSection("personal")}
              />
              <NavigationListItem
                icon={BarChartIcon}
                label="Usage"
                selected={activeSection === "usage"}
                onClick={() => setActiveSection("usage")}
              />
              <NavigationListItem
                icon={Cog6ToothIcon}
                label="Customization"
                selected={activeSection === "customization"}
                onClick={() => setActiveSection("customization")}
              />
              <NavigationListItem
                icon={BellIcon}
                label="Notifications"
                selected={activeSection === "notifications"}
                onClick={() => setActiveSection("notifications")}
              />
              <NavigationListItem
                icon={ToolsIcon}
                label="Tools and Triggers"
                selected={activeSection === "tools"}
                onClick={() => setActiveSection("tools")}
              />
            </NavigationList>
          </aside>

          <div className="relative flex flex-1 flex-col overflow-hidden">
            {activeSection === "personal" && (
              <PersonalInfoSection owner={owner} />
            )}
            {activeSection === "usage" && <UsageSection />}
            {activeSection === "customization" && <CustomizationSection />}
            {activeSection === "notifications" && (
              <NotificationsSection owner={owner} />
            )}
            {activeSection === "tools" && <ToolsSection owner={owner} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
