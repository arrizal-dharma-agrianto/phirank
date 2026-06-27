"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteAccountButton } from "./delete-account-button";

const SettingCard = () => {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      {/* <CardContent className="space-y-4">
        <div className="flex flex-col gap-6">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Danger Zone</label>
          </div>
        </div>
      </CardContent> */}

      <CardFooter className="space-y-4">
        <div className="flex flex-col gap-6">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Danger Zone</label>
            <DeleteAccountButton />
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export { SettingCard };
