"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileCard } from "./profile-card";
import { SettingCard } from "./settings-card";
import { UpdatePasswordForm } from "./update-password-form";
import { useProfile } from "../hooks";

const Account = () => {
  const { data } = useProfile();
  const canUpdatePassword = data?.isOAuthOnly === false;

  useEffect(() => {
    const url = new URL(window.location.href);
    const emailUpdate = url.searchParams.get("emailUpdate");
    const message = url.searchParams.get("message");

    if (!emailUpdate) return;

    if (emailUpdate === "success") {
      toast.success(message ?? "Email updated successfully");
    } else {
      toast.error(message ?? "Email update failed");
    }

    url.searchParams.delete("emailUpdate");
    url.searchParams.delete("message");
    window.history.replaceState({}, "", url);
  }, []);

  return (
    <Tabs defaultValue="profile" className="w-full max-w-sm">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        {canUpdatePassword &&  (
          <TabsTrigger value="password">Update Password</TabsTrigger>
        )}
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <ProfileCard />
      </TabsContent>
      {canUpdatePassword && (
      <TabsContent value="password">
        <UpdatePasswordForm />
      </TabsContent>
      )}
      <TabsContent value="settings">
        <SettingCard />
      </TabsContent>
    </Tabs>
  );
};

export { Account };
